/*
MacBook Pro 14 (M5): builds the model page and adds it to the gallery.

There is no Blender source for this model: its geometry is generated here (with lib/procedural.js), in Blender
mm with Z up, X to the right, Y to the back and the base's centre at the origin. The page's chrome and the
shared engine come from the Spectre page already in the gallery, so the new page matches the others exactly;
only the geometry and the model script (model.js) are new. Re-run after any change:

    node macbookpro/build.js

Writes macbookpro/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, loop, rrPts, circlePts, rrRegion, rect, fanRegion, stripRegion, extrude, sheet, rrBody, cyl,
  sweep, holeWalls, r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;

// ---------- dimensions (mm) ----------
const HW = 156.3, HH = 110.6;     // half the base's 312.6 x 221.2 footprint
const R = 9.5;                    // plan corner radius of the base and lid
const DECK = 10.6;                // top of the keyboard deck
const KEY_TOP = 11.0;
const HINGE_Y = 108, HINGE_Z = 13.2, HINGE_R = 2.7;
const LID_TILT = 20;              // degrees past upright: the lid is open at 110 degrees
const LID_H = 212;                // lid height from the hinge axis
const ts = Math.sin(LID_TILT * Math.PI / 180), tc = Math.cos(LID_TILT * Math.PI / 180);
// lid parts are drawn in (x, u, w): u up the lid from the hinge axis, w through it towards the back
const lidF = ([x, u, w]) => [x, HINGE_Y + u * ts + w * tc, HINGE_Z + u * tc - w * ts];

// ---------- the base ----------
const KB_WELL = [-134.7, 134.7, -13.0, 99.2];
const TP_HOLE = [-73.0, 73.0, -100.9, -19.9];

const topCase = part("Top Case", "topcase", "major");
rrBody(topCase, 0, 0, HW, HH, R, [[0, 1.4, true], [0, 9.9], [0.3, 10.35], [0.6, DECK, true]], { bottom: false, holes: [KB_WELL, TP_HOLE] });
// the keyboard well (walls and floor) and the trackpad opening (walls)
holeWalls(topCase, KB_WELL, 9.4, DECK, true);
holeWalls(topCase, TP_HOLE, 9.4, DECK, false);

const ports = part("Ports", "topcase", "minor");
// [y, z, width, height, radius]; drawn just proud of the side walls
const LEFT_PORTS = [[82, 6.0, 16.5, 4.6, 2.2], [56, 6.0, 8.8, 3.2, 1.5], [40, 6.0, 8.8, 3.2, 1.5], [-76, 6.0, 4.2, 4.2, 2.1]];
const RIGHT_PORTS = [[80, 6.0, 15.0, 5.2, 0.8], [56, 6.0, 8.8, 3.2, 1.5], [-36, 6.0, 25.0, 2.6, 0.6]];
[[-1, LEFT_PORTS], [1, RIGHT_PORTS]].forEach(([side, list]) => withFrame(q => [side * (HW + 0.05 - q[2]), q[0], q[1]], () => {
  list.forEach(([y, z, w, h, r]) => extrude(ports, rrRegion(y, z, w / 2, h / 2, r, 6), 0, 0.35));
}));

// the perforated grilles either side of the keyboard: lines only
const grilles = part("Speaker Grilles", "topcase", "minor");
[-1, 1].forEach(side => {
  for (let x = 139.4; x <= 149.7; x += 1.7) for (let y = -6; y <= 96.1; y += 1.7) {
    const cx = side * x, d = 0.35, z = DECK + 0.05;
    loop(grilles, [[cx - d, y - d, z], [cx + d, y - d, z], [cx + d, y + d, z], [cx - d, y + d, z]]);
  }
});

const bottomCase = part("Bottom Case", "bottom", "major");
rrBody(bottomCase, 0, 0, HW, HH, R, [[2.0, 0, true], [1.4, 0.45], [0.5, 0.95], [0, 1.4, true]]);
const feet = part("Feet", "bottom", "minor");
[-1, 1].forEach(sx => [-1, 1].forEach(sy => cyl(feet, sx * (HW - 24), sy * (HH - 22), 6.0, -0.9, 0, 28)));

// six cells: a pair under each palm rest and a pair under the trackpad
const battery = part("Battery Cells", "battery", "major");
[[-148, -62, -104, -58], [-148, -62, -54, -10], [-56, -2, -104, -14], [2, 56, -104, -14], [62, 148, -104, -58], [62, 148, -54, -10]]
  .forEach(([x0, x1, y0, y1]) => rrBody(battery, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, 2.0,
    [[0, 1.7, true], [0, 5.2], [0.4, 5.6, true]], { seg: 4 }));
const bms = part("Battery Management", "battery", "minor");
extrude(bms, rrRegion(0, -6.75, 60, 2.75, 0.8, 3), 1.7, 2.6);
[-40, -12, 18, 44].forEach(x => extrude(bms, rect(x - 3, x + 3, -8.5, -5), 2.6, 3.2));

// ---------- logic board ----------
const board = part("Logic Board", "board", "major");
extrude(board, rrRegion(-27, 55, 83, 47, 3, 4), 3.0, 3.8);
const soc = part("M5", "board", "major");
extrude(soc, rrRegion(0, 58, 16, 14, 1.2, 3), 3.8, 4.5);          // package substrate
extrude(soc, rrRegion(-6, 58, 7.5, 9.5, 0.4, 2), 4.5, 5.2);       // the die
const memory = part("Unified Memory", "board", "minor");
[52.5, 63.5].forEach(y => extrude(memory, rrRegion(9.5, y, 4.6, 4.8, 0.5, 2), 4.5, 5.4));
const ssd = part("SSD", "board", "minor");
[40, 72].forEach(y => extrude(ssd, rrRegion(-62, y, 7, 9, 0.6, 2), 3.8, 5.0));
const comps = part("Board Components", "board", "minor");
for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {          // power stage inductors beside the chip
  const x = -34 + i * 6.2, y = 45 + j * 6.4;
  extrude(comps, rrRegion(x, y, 2.4, 2.4, 0.4, 2), 3.8, 6.0);
}
for (let i = 0; i < 10; i++) extrude(comps, rect(20 + (i % 5) * 3, 21.6 + (i % 5) * 3, 46 + Math.floor(i / 5) * 22, 48 + Math.floor(i / 5) * 22), 3.8, 4.6);
[[-100, 40], [-100, 58], [48, 30]].forEach(([x, y]) => extrude(comps, rrRegion(x, y, 4, 4, 0.5, 2), 3.8, 4.8));   // Thunderbolt retimers
extrude(comps, rect(-10, 10, 10.5, 15.5), 3.8, 5.2);              // battery connector
extrude(comps, rect(-48, -32, 94, 99), 3.8, 5.0);                 // display connector
extrude(comps, rect(30, 44, 94, 99), 3.8, 5.0);                   // keyboard and trackpad connector
extrude(comps, rrRegion(-94, 88, 7, 7, 0.6, 2), 3.8, 5.0);        // wireless module

// ---------- cooling ----------
const FAN = [92, 68], FAN_R = 29, OUTLET_Y = 101.5;
const fanHousing = part("Fan Housing", "cooling", "major");
{
  const pts = [];
  for (let s = 0; s <= 24; s++) { const a = Math.PI + Math.PI * s / 24; pts.push([FAN[0] + FAN_R * Math.cos(a), FAN[1] + FAN_R * Math.sin(a)]); }
  pts.push([FAN[0] + FAN_R, OUTLET_Y], [FAN[0] - FAN_R, OUTLET_Y]);
  // open on top, and at the outlet where the air leaves through the fins
  extrude(fanHousing, fanRegion(pts), 3.2, 8.8, { top: false, wallIf: (a, b) => !(Math.abs(a[1] - OUTLET_Y) < 1e-6 && Math.abs(b[1] - OUTLET_Y) < 1e-6) });
}
const impeller = part("Fan Impeller", "cooling", "minor");
cyl(impeller, FAN[0], FAN[1], 10.5, 3.6, 8.4, 32);
for (let k = 0; k < 31; k++) {
  const left = [], right = [];
  for (let s = 0; s <= 4; s++) {
    const r = 11 + 15.5 * s / 4, a = 2 * Math.PI * k / 31 + 0.45 * s / 4;
    const c = [FAN[0] + r * Math.cos(a), FAN[1] + r * Math.sin(a)], n = [Math.cos(a + Math.PI / 2) * 0.25, Math.sin(a + Math.PI / 2) * 0.25];
    left.push([c[0] + n[0], c[1] + n[1]]); right.push([c[0] - n[0], c[1] - n[1]]);
  }
  extrude(impeller, stripRegion(left, right), 3.8, 8.2);
}
const fins = part("Fin Stack", "cooling", "minor");
for (let i = 0; i < 34; i++) { const x = 64.5 + i * 1.65; extrude(fins, rect(x - 0.15, x + 0.15, OUTLET_Y, 108.5), 3.4, 8.0); }
const spreader = part("Heat Spreader", "cooling", "major");
extrude(spreader, rrRegion(-1, 58, 18, 15, 1.5, 3), 5.45, 6.4);
const pipe = part("Heat Pipe", "cooling", "major");
sweep(pipe, [[-12, 58, 7.3], [14, 58, 7.3], [40, 76, 7.3], [58, 98, 7.6], [66, 105, 8.9], [124, 105, 8.9]],
  rrPts(0, 0, 4, 0.9, 0.89, 4));

// ---------- speakers and trackpad ----------
const speakers = part("Speakers", "audio", "major");
[-1, 1].forEach(side => {
  rrBody(speakers, side * 140, 48, 12, 50, 3, [[0, 1.6, true], [0, 8.0], [0.5, 8.5, true]], { seg: 4 });
  [22, 74].forEach(y => cyl(speakers, side * 140, y, 7.5, 8.5, 9.0, 28, { bottom: false }));
});
const trackpad = part("Trackpad Glass", "trackpad", "major");
extrude(trackpad, rrRegion(0, -60.4, 72.5, 40.0, 4, 6), 9.8, 10.55);
const taptic = part("Taptic Engine", "trackpad", "minor");
extrude(taptic, rrRegion(0, -61, 38, 6, 1, 3), 6.2, 9.0);
[[-66, -94], [66, -94], [-66, -27], [66, -27]].forEach(([x, y]) => extrude(taptic, rect(x - 3, x + 3, y - 3, y + 3), 9.0, 9.8));

// ---------- keyboard ----------
// rows of [width in key units, label]; the arrows are half-height, as an inverted T
const U = 18.5, GAP = 2.4, KB_X0 = -7.25 * U, KB_Y1 = 98.6;
const ROWS = [
  [[1.5, "esc"], ...Array.from({ length: 12 }, (_, i) => [1, "f" + (i + 1)]), [1, "touchid"]],
  [..."`1234567890-=".split("").map(c => [1, c]), [1.5, "delete"]],
  [[1.5, "tab"], ..."qwertyuiop[]\\".split("").map(c => [1, c])],
  [[1.8, "caps"], ..."asdfghjkl;'".split("").map(c => [1, c]), [1.7, "return"]],
  [[2.35, "shift"], ..."zxcvbnm,./".split("").map(c => [1, c]), [2.15, "rshift"]],
  [[1, "fn"], [1, "ctrl"], [1, "opt"], [1.25, "cmd"], [5, "space"], [1.25, "rcmd"], [1, "ropt"], [1, "left"], [1, "updown"], [1, "right"]],
];
const keys = [];
ROWS.forEach((row, r) => {
  const cy = KB_Y1 - U * (r + 0.5);
  let x = KB_X0;
  row.forEach(([w, label]) => {
    const cx = x + w * U / 2, kw = w * U - GAP, kh = U - GAP, half = (kh - GAP / 2) / 2, dy = kh / 2 - half / 2;
    if (label === "updown") { keys.push([cx, cy + dy, kw, half, "up"], [cx, cy - dy, kw, half, "down"]); }
    else if (label === "left" || label === "right") keys.push([cx, cy - dy, kw, half, label]);
    else keys.push([cx, cy, kw, kh, label]);
    x += w * U;
  });
});
const keyboard = part("Keyboard", "keyboard", "minor");
keys.forEach(([cx, cy, w, h]) => rrBody(keyboard, cx, cy, w / 2, h / 2, Math.min(1.3, h / 2 - 0.1),
  [[0, 9.8, true], [0, 10.7], [0.3, KEY_TOP, true]], { seg: 3, bottom: false }));
const tid = keys.find(k => k[4] === "touchid");
loop(keyboard, circlePts(tid[0], tid[1], 6.0, 40).map(q => [...q, KEY_TOP + 0.05]));

// ---------- hinge and lid ----------
const hinge = part("Hinge", "hinges", "major");
withFrame(q => [q[2], q[0], q[1]], () => cyl(hinge, HINGE_Y, HINGE_Z, HINGE_R, -118, 118, 28));

const SCREEN = { x: 151.2, u0: 12.0, u1: 208.4, notch: [31.5, 6.0] };   // the active area, notch included
let camLens;
withFrame(lidF, () => {
  const lid = part("Display Housing", "lidback", "major");
  rrBody(lid, 0, LID_H / 2, HW, LID_H / 2, R, [[0, -2.0, true], [0, 1.6], [0.3, 2.25], [0.7, 2.6, true]]);
  const glass = part("Display Glass", "display", "major");
  extrude(glass, rrRegion(0, LID_H / 2, HW - 0.3, LID_H / 2 - 0.3, R - 0.3, 6), -2.6, -2.0);
  // the panel's active area, drawn just in front of the glass so its edge and the notch read through it
  const panel = part("Liquid Retina XDR", "display", "minor");
  const [nw, nh] = SCREEN.notch;
  sheet(panel, rrRegion(0, (SCREEN.u0 + SCREEN.u1) / 2, SCREEN.x, (SCREEN.u1 - SCREEN.u0) / 2, [0, 0, 6, 6], 6,
    [[-nw / 2, nw / 2, SCREEN.u1 - nh, SCREEN.u1 + 10]]), -2.8);
  const cam = part("Camera", "camera", "minor");
  camLens = SCREEN.u1 - nh / 2;
  extrude(cam, rrRegion(0, camLens, 13, 2.6, 1, 3), -1.9, -0.6);
  cyl(cam, 0, camLens, 2.0, -1.95, -1.9, 24);
  loop(cam, circlePts(0, camLens, 1.4, 24).map(q => [...q, -2.85]));
});

// ---------- explode offsets, callouts and anchors ----------
const front = [0, -tc, ts], up = [0, ts, tc];
const along = (a, b) => r3(front.map((f, i) => f * a + up[i] * b));
const explode = {
  bottom: [0, 0, -240], battery: [0, 0, -204], board: [0, 0, -176], cooling: [0, 0, -146], audio: [0, 0, -112],
  trackpad: [0, 0, -56], topcase: [0, 0, 0], keyboard: [0, 0, 30], hinges: [0, 0, 0],
  display: along(32, 20), camera: along(12, 40), lidback: along(-40, 8),
};
const L = (x, u, w) => r3(lidF([x, u, w]));
const hotspots = [
  ["Aluminium enclosure", "Machined from one piece, like the base", L(-120, LID_H, 0.6), ["Display Housing"]],
  ["Liquid Retina XDR", "14.2 inches, 3024 x 1964, ProMotion to 120 Hz", L(-70, 130, -2.8), ["Liquid Retina XDR"]],
  ["Display glass", "Optional nano-texture finish", L(118, 60, -2.6), ["Display Glass"]],
  ["12 MP camera", "Center Stage, in the notch", L(0, camLens, -2.85), ["Camera"]],
  ["Hinge", "Holds the display at any angle", [100, HINGE_Y, HINGE_Z + HINGE_R], ["Hinge"]],
  ["Magic Keyboard", "Backlit, full-height function row", [-75, 52.35, KEY_TOP], ["Keyboard"]],
  ["Touch ID", "In the top-right key", [tid[0], tid[1], KEY_TOP], ["Keyboard"]],
  ["Force Touch trackpad", "Glass, 145 x 80, clicks anywhere", [45, -70, 10.55], ["Trackpad Glass", "Taptic Engine"]],
  ["Unibody top case", "Recycled aluminium, one piece", [-120, -105, DECK], ["Top Case"]],
  ["Thunderbolt 4, HDMI, SDXC", "Down the right side", [HW, 56, 6.0], ["Ports"]],
  ["MagSafe 3", "Two Thunderbolt 4, headphone jack", [-HW, 82, 6.0], ["Ports"]],
  ["Single fan", "Blower with a copper fin stack", [FAN[0], FAN[1], 8.8], ["Fan Housing", "Fan Impeller", "Fin Stack"]],
  ["Heat pipe", "From the chip to the fins", [30, 69, 8.2], ["Heat Pipe", "Heat Spreader"]],
  ["Apple M5", "10-core CPU, 10-core GPU", [-6, 58, 5.2], ["M5", "Logic Board"]],
  ["Unified memory", "16 GB, up to 32 GB", [9.5, 52.5, 5.4], ["Unified Memory"]],
  ["SSD", "512 GB, up to 4 TB", [-62, 40, 5.0], ["SSD"]],
  ["72.4 Wh battery", "Up to 24 hours of video", [-30, -60, 5.6], ["Battery Cells", "Battery Management"]],
  ["Six speakers", "Force-cancelling woofers", [-140, 48, 9.0], ["Speakers"]],
  ["Bottom case", "Four feet, nothing else to see", [-60, 80, 1.4], ["Bottom Case", "Feet"]],
].map(([t, s, p, o]) => ({ t, s, p: r3(p), o }));
const flow = {
  kbFlex: [37, 98, 9.6, "keyboard"], io: [37, 96.5, 5.0, "board"], padFlex: [0, -18, 9.4, "trackpad"],
  boardFront: [0, 13, 5.2, "board"], soc: [-8, 56, 5.2, "board"], gpu: [-3, 62, 5.2, "board"],
  ram1: [9.5, 52.5, 5.4, "board"], ram2: [9.5, 63.5, 5.4, "board"], boardRear: [-40, 96.5, 5.0, "board"],
  hinge: [-40, HINGE_Y, HINGE_Z, "hinges"], lidHinge: [...L(-40, 4, 0), "hinges"],
  panelDriver: [...L(-40, 9, -2.2), "display"], screen: [...L(0, 107, -2.9), "display"],
};
const screen = { module: "display", origin: L(-SCREEN.x, SCREEN.u0, -2.9), right: L(SCREEN.x, SCREEN.u0, -2.9),
  top: L(-SCREEN.x, SCREEN.u1 - SCREEN.notch[1], -2.9) };   // the 16:10 area below the notch and menu bar

// ---------- page and gallery ----------
const geometry = geometryScript("MBP_GEOMETRY", "macbookpro/build.js", { explode, hotspots, keys: keys.map(k => [...r3(k.slice(0, 4)), k[4]]),
  keyTop: KEY_TOP, touchpad: [0, -60.4, 145, 80], flow, screen,
  constants: { BASE_HW: HW, BASE_HH: HH, DECK, LID_TILT, HINGE_Y, HINGE_Z } });
// the Spectre page's chrome and engine, with this model's geometry and script
const html = buildPage({ template: "spectre", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>MacBook Pro 14 (M5)</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the 14-inch MacBook Pro with M5, open at 110 degrees; on hover the display, keyboard, trackpad, speakers, cooling, logic board, battery and bottom case slide apart\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>MacBook Pro</b><span>14-inch, M5</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG MBP14-M5-001 &middot; Rev A<br>Units mm &middot; View az 45&deg; / el 28&deg;<br>Concept page, not affiliated with Apple</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
// in the Computers group, after the Spectre
const count = addToGallery({ id: "macbookpro", label: "MacBook Pro 14 (M5)", kind: "laptop", tags: "laptop apple macbook pro m5 notebook 2025",
  key: "mbp14-theme", category: "Computers", html }, "spectre");
console.log(`macbookpro/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
