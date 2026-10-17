/*
Framework Laptop 13: builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm, with Z up, X to the right, Y to the back and the base's centre
at the origin; 296.6 x 229 x 15.9, open at 110 degrees. What makes it a Framework is how it comes apart: the four
expansion cards slide out of their bays, the input cover (keyboard and touchpad) lifts off its magnets, the
bezel pops off the lid, and inside every part (memory, SSD, Wi-Fi card, battery, fan, mainboard) is a module
you can replace. The fan is based at its hub so the page can spin it. The page's chrome and the shared engine
come from the Spectre page; lib/screen-runtime.js runs a terminal session on the 3:2 screen.

    node framework/build.js

Writes framework/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, fanRegion, stripRegion, extrude, sheet, rrBody, cyl, sweep, holeWalls,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
// ---------- dimensions (mm) ----------
const HW = 148.3, HH = 114.5, R = 6;             // half the base's 296.6 x 229 footprint, plan corner radius
const BASE = 9.4, DECK = 11.6, KEY_TOP = 12.1;   // the bottom cover's top, the input cover's top, the keys' tops
const HINGE_Y = 110, HINGE_Z = 13.4, HINGE_R = 2.8;
const LID_TILT = 20, LID_H = 220;
const ts = Math.sin(LID_TILT * Math.PI / 180), tc = Math.cos(LID_TILT * Math.PI / 180);
const lidF = ([x, u, w]) => [x, HINGE_Y + u * ts + w * tc, HINGE_Z + u * tc - w * ts];   // (x, up the lid, through it to the back)
const SCREEN = { hw: 142.6, u0: 19, u1: 209 };   // the 13.5-inch 3:2 panel's picture (285 x 190)
const FAN = [70, 62, 0];

// ---------- the expansion cards: two each side, sliding out sideways ----------
const CARDS = [
  { side: -1, y: 52, kind: "USB-C" }, { side: -1, y: 14, kind: "USB-A" },
  { side: 1, y: 52, kind: "USB-C" }, { side: 1, y: 14, kind: "HDMI" },
];
const CARD = { d: 32, w: 30, h: 6.8, z: 4.8 };   // into the bay, along the side, tall; centre height

const explode = {
  bottom: [0, 0, -150], battery: [0, 0, -120], board: [0, 0, -92], cooling: [0, 0, -66], fan: { offset: [0, 0, -50], base: FAN },
  modules: [0, 0, -30], speakers: [0, 0, -110], inputCover: [0, 0, 40], keyboard: [0, 0, 62], touchpad: [0, 0, 52], hinge: [0, 0, 0],
  lid: [0, 30, 10], panel: [0, -10, 40], bezel: [0, -40, 52], camera: [0, -54, 62],
};
CARDS.forEach((c, i) => { explode["card" + i] = [c.side * 70, 0, 0]; });

// ---------- the bottom cover and the bays ----------
const bottom = part("Bottom Cover", "bottom", "major");
rrBody(bottom, 0, 0, HW, HH, R, [[1.6, 0, true], [0.6, 0.6], [0, 1.8], [0, BASE, true]], { seg: 6, top: false });
const feet = part("Feet", "bottom", "minor");
[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => extrude(feet, rrRegion(sx * (HW - 30), sy * (HH - 16), 22, 3, 2.9, 4), -0.8, 0));
withFrame(q => [q[0], q[1], q[2]], () => {
  for (let x = -100; x <= 100; x += 5) loop(bottom, rrPts(x, 92, 1, 7, 0.9, 2).map(q => [...q, -0.05]));   // the intake slots under the fan
});
const bays = part("Expansion Bays", "bottom", "minor");
CARDS.forEach(c => {
  const x0 = c.side * (HW - CARD.d - 2), x1 = c.side * (HW - 1);
  extrude(bays, rect(Math.min(x0, x1), Math.max(x0, x1), c.y - CARD.w / 2 - 1.5, c.y + CARD.w / 2 + 1.5), 1.8, 2.4);   // each bay's floor
  extrude(bays, rect(Math.min(x0, x0 - c.side * 2), Math.max(x0, x0 - c.side * 2), c.y - 5, c.y + 5), 2.4, 7.6);        // the USB-C socket each card plugs into
});

// ---------- inside: mainboard, memory, SSD, Wi-Fi, cooling, battery, speakers ----------
const board = part("Mainboard", "board", "major");
extrude(board, rrRegion(-8, 56, 106, 48, 3, 4, [[FAN[0] - 26, FAN[0] + 26, FAN[1] - 26, FAN[1] + 26]]), 2.2, 3.0);
const cpu = part("Processor", "board", "major");
extrude(cpu, rrRegion(10, 56, 15, 12.5, 1, 3), 3.0, 3.8);
extrude(cpu, rrRegion(10, 56, 9, 7, 0.4, 2), 3.8, 4.4);
const comps = part("Board Components", "board", "minor");
for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) extrude(comps, rrRegion(-29 + i * 5.6, 44 + j * 6.2, 2.2, 2.2, 0.4, 2), 3.0, 5.0);   // power stages
[[-60, 90], [40, 92], [-20, 92]].forEach(([x, y]) => extrude(comps, rrRegion(x, y, 5, 4, 0.5, 2), 3.0, 4.2));
extrude(comps, rect(-8, 8, 10, 15), 3.0, 4.6);   // battery connector
const ram = part("Memory", "modules", "major");
[-58, -40].forEach(x => { extrude(ram, rect(x - 6.5, x + 6.5, 22, 92), 3.0, 4.4); for (let k = 0; k < 4; k++) extrude(ram, rrRegion(x, 30 + k * 17, 4.5, 6, 0.4, 2), 4.4, 5.2); });   // two SO-DIMMs, flat
const ssd = part("SSD", "modules", "major");
extrude(ssd, rect(-100, -78, 14, 94), 3.0, 4.0);
[30, 58, 82].forEach(y => extrude(ssd, rrRegion(-89, y, 8, 8, 0.5, 2), 4.0, 5.0));
const wifi = part("Wi-Fi Card", "modules", "minor");
extrude(wifi, rect(-30, -8, 76, 98), 3.0, 4.2);
line(wifi, [-26, 98, 4.25], [-26, 106, 7.5]); line(wifi, [-12, 98, 4.25], [-12, 106, 7.5]);   // its antenna leads
const spreader = part("Heat Spreader", "cooling", "major");
extrude(spreader, rrRegion(10, 56, 18, 15, 1.5, 3), 4.4, 5.4);
const pipe = part("Heat Pipes", "cooling", "major");
[0, 6].forEach(d => sweep(pipe, [[0 + d, 52 + d, 6.0], [30, 52 + d, 6.0], [44, 76 + d * 0.5, 6.2], [52, 100, 6.8], [120, 100, 6.8]], rrPts(0, 0, 3, 0.8, 0.79, 4)));
const fins = part("Fin Stack", "cooling", "minor");
for (let i = 0; i < 40; i++) { const x = 44 + i * 1.7; extrude(fins, rect(x - 0.15, x + 0.15, 96, 108), 2.6, 8.4); }
const housing = part("Fan Housing", "cooling", "minor");
{
  const pts = [];
  for (let s = 0; s <= 24; s++) { const a = Math.PI + Math.PI * s / 24; pts.push([FAN[0] + 25 * Math.cos(a), FAN[1] + 25 * Math.sin(a)]); }
  pts.push([FAN[0] + 25, 96], [FAN[0] - 25, 96]);
  extrude(housing, fanRegion(pts), 2.6, 8.6, { top: false, wallIf: (a, b) => !(Math.abs(a[1] - 96) < 1e-6 && Math.abs(b[1] - 96) < 1e-6) });
}
const impeller = part("Fan", "fan", "minor", { spool: "fan" });
cyl(impeller, 0, 0, 9, 3.2, 8.0, 28);
for (let k = 0; k < 29; k++) {
  const left = [], right = [];
  for (let s = 0; s <= 4; s++) {
    const r = 9.5 + 13 * s / 4, a = 2 * Math.PI * k / 29 + 0.45 * s / 4, n = [Math.cos(a + Math.PI / 2) * 0.25, Math.sin(a + Math.PI / 2) * 0.25];
    const c = [r * Math.cos(a), r * Math.sin(a)];
    left.push([c[0] + n[0], c[1] + n[1]]); right.push([c[0] - n[0], c[1] - n[1]]);
  }
  extrude(impeller, stripRegion(left, right), 3.4, 7.8);
}
const battery = part("Battery", "battery", "major");
rrBody(battery, 0, -52, 118, 44, 3, [[0, 1.8, true], [0, 6.8], [0.4, 7.2, true]], { seg: 4 });
for (let k = 0; k < 4; k++) line(battery, [-118 + 59 * k + 59, -95, 7.25], [-118 + 59 * k + 59, -9, 7.25]);
const speakers = part("Speakers", "speakers", "minor");
[-1, 1].forEach(s => rrBody(speakers, s * 132, -60, 12, 30, 3, [[0, 1.8, true], [0, 7.6, true]], { seg: 3 }));

// ---------- the input cover: deck, keyboard and touchpad ----------
const KB_WELL = [-137, 137, -14, 100], TP_HOLE = [-57.5, 57.5, -110, -32];
const cover = part("Input Cover", "inputCover", "major");
rrBody(cover, 0, 0, HW, HH, R, [[0, BASE, true], [0, DECK - 0.4], [0.5, DECK, true]], { seg: 6, bottom: false, holes: [KB_WELL, TP_HOLE] });
holeWalls(cover, KB_WELL, BASE + 0.6, DECK, true);
holeWalls(cover, TP_HOLE, BASE + 0.6, DECK, false);
const touchpad = part("Touchpad", "touchpad", "major");
extrude(touchpad, rrRegion(0, -71, 57, 38.5, 2, 4), DECK - 0.8, DECK - 0.1);
const U = 18.6, GAP = 2.6, KB_X0 = -7.25 * U, KB_Y1 = 99;
const ROWS = [
  [[1.5, "esc"], ...Array.from({ length: 12 }, (_, i) => [1, "f" + (i + 1)]), [1, "power"]],
  [..."`1234567890-=".split("").map(c => [1, c]), [1.5, "backspace"]],
  [[1.5, "tab"], ..."qwertyuiop[]\\".split("").map(c => [1, c])],
  [[1.8, "caps"], ..."asdfghjkl;'".split("").map(c => [1, c]), [1.7, "return"]],
  [[2.35, "shift"], ..."zxcvbnm,./".split("").map(c => [1, c]), [2.15, "rshift"]],
  [[1, "ctrl"], [1, "fn"], [1, "super"], [1.25, "alt"], [5, "space"], [1.25, "ralt"], [1, "rctrl"], [1, "left"], [1, "updown"], [1, "right"]],
];
const keys = [];
ROWS.forEach((row, r) => {
  const cy = KB_Y1 - U * (r + 0.5);
  let x = KB_X0;
  row.forEach(([w, label]) => {
    const cx = x + w * U / 2, kw = w * U - GAP, kh = (r === 0 ? U * 0.72 : U) - GAP, half = (kh - GAP / 2) / 2, dy = kh / 2 - half / 2;
    const ky = r === 0 ? cy + U * 0.14 : cy;
    if (label === "updown") keys.push([cx, ky + dy, kw, half, "up"], [cx, ky - dy, kw, half, "down"]);
    else if (label === "left" || label === "right") keys.push([cx, ky - dy, kw, half, label]);
    else keys.push([cx, ky, kw, kh, label]);
    x += w * U;
  });
});
const keyboard = part("Keyboard", "keyboard", "minor");
keys.forEach(([cx, cy, w, h]) => rrBody(keyboard, cx, cy, w / 2, h / 2, Math.min(1.2, h / 2 - 0.1), [[0, DECK - 0.8, true], [0, KEY_TOP - 0.3], [0.3, KEY_TOP, true]], { seg: 3, bottom: false }));
const pw = keys.find(k => k[4] === "power");
loop(keyboard, circlePts(pw[0], pw[1], 4.6, 32).map(q => [...q, KEY_TOP + 0.05]));   // the fingerprint reader in the power button

// ---------- the expansion cards ----------
CARDS.forEach((c, i) => {
  const p = part("Expansion Card " + (i + 1), "card" + i, "major");
  const x0 = c.side * (HW - CARD.d), x1 = c.side * (HW + 0.2);
  rrBody(p, (x0 + x1) / 2, c.y, CARD.d / 2 + 0.1, CARD.w / 2, 1.5, [[0, CARD.z - CARD.h / 2, true], [0, CARD.z + CARD.h / 2, true]], { seg: 3 });
  // the port on its outer face
  withFrame(q => [c.side * (HW + 0.25 + q[2]), q[0], q[1]], () => {
    const W = c.kind === "USB-A" ? [6.4, 2.4, 0.5] : c.kind === "HDMI" ? [7.4, 2.6, 0.8] : [4.4, 1.6, 1.5];
    extrude(p, rrRegion(c.y, CARD.z, W[0], W[1], W[2], 3), 0, 0.3);
  });
  loop(p, rrPts((x0 + x1) / 2 - c.side * 6, c.y, 6, 9, 1, 2).map(q => [...q, CARD.z + CARD.h / 2 + 0.05]));   // the latch window on top
});

// ---------- hinge and lid ----------
const hinge = part("Hinge", "hinge", "major");
withFrame(q => [q[2], q[0], q[1]], () => cyl(hinge, HINGE_Y, HINGE_Z, HINGE_R, -120, 120, 28));
withFrame(lidF, () => {
  const lid = part("Display Lid", "lid", "major");
  rrBody(lid, 0, LID_H / 2, HW, LID_H / 2, R, [[0, -1.6, true], [0, 1.8], [0.4, 2.3, true]], { seg: 6 });
  loop(lid, circlePts(0, LID_H / 2 + 10, 14, 6).map(q => [...q, 2.35]));   // the gear logo on the back
  loop(lid, circlePts(0, LID_H / 2 + 10, 7, 24).map(q => [...q, 2.35]));
  const panel = part("Display", "panel", "major");
  extrude(panel, rrRegion(0, (SCREEN.u0 + SCREEN.u1) / 2, SCREEN.hw + 2.5, (SCREEN.u1 - SCREEN.u0) / 2 + 2.5, 1, 2), -2.6, -1.6);
  const bezel = part("Bezel", "bezel", "major");
  extrude(bezel, rrRegion(0, LID_H / 2, HW - 0.5, LID_H / 2 - 0.5, R - 0.5, 6, [[-SCREEN.hw, SCREEN.hw, SCREEN.u0, SCREEN.u1]]), -3.4, -2.6);
  const cam = part("Camera", "camera", "minor");
  const CU = (SCREEN.u1 + LID_H) / 2;
  cyl(cam, 0, CU, 2.2, -3.5, -3.4, 20);
  loop(cam, circlePts(0, CU, 1.4, 16).map(q => [...q, -3.55]));
  [-14, 14].forEach(x => { extrude(cam, rrRegion(x, CU, 3.2, 1.2, 1.1, 2), -3.8, -3.4); });   // the camera and microphone privacy switches
});

// ---------- callouts and the tour ----------
const L = (x, u, w) => r3(lidF([x, u, w]));
const local = (name, p) => r3(name === "Fan" ? p.map((c, i) => c - FAN[i]) : p);
const hotspots = [
  ["Expansion cards", "Choose your ports, swap them any time", [-HW - 0.3, 52, CARD.z], ["Expansion Card 1", "Expansion Bays"]],
  ["HDMI card", "Or USB-A, DisplayPort, storage...", [HW + 0.3, 14, CARD.z], ["Expansion Card 4"]],
  ["Input cover", "Keyboard and touchpad, held by magnets", [-120, -100, DECK], ["Input Cover"]],
  ["Keyboard", "1.5 mm travel, backlit", [-60, 50, KEY_TOP], ["Keyboard"]],
  ["Power and fingerprint", "In the top-right key", [pw[0], pw[1], KEY_TOP], ["Keyboard"]],
  ["Touchpad", "Glass-like, full width", [30, -80, DECK - 0.1], ["Touchpad"]],
  ["13.5-inch 3:2 display", "2880 x 1920, 120 Hz", L(-80, 150, -2.6), ["Display"]],
  ["Magnetic bezel", "Pops off; comes in colours", L(130, 8, -3.4), ["Bezel"]],
  ["Privacy switches", "Cut the camera and the mic", L(14, (SCREEN.u1 + LID_H) / 2, -3.8), ["Camera"]],
  ["Processor", "On a mainboard you can upgrade", [10, 56, 4.4], ["Processor", "Mainboard"]],
  ["Memory", "Two SO-DIMM slots, up to 96 GB", [-49, 60, 5.2], ["Memory"]],
  ["SSD", "M.2 2280, swap or upgrade", [-89, 58, 5], ["SSD"]],
  ["Fan", "Over a pair of heat pipes", [FAN[0], FAN[1], 8.6], ["Fan", "Fan Housing", "Heat Pipes"]],
  ["61 Wh battery", "Replaceable, with a pull tab", [-60, -52, 7.2], ["Battery"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    card: pt("Expansion Card 1", [-HW - 20, 52, CARD.z]), bay: pt("Expansion Bays", [-HW + 34, 52, 5]), board: pt("Mainboard", [-30, 60, 3]),
    cpu: pt("Processor", [10, 56, 4.4]), ram: pt("Memory", [-49, 60, 5.2]), ssd: pt("SSD", [-89, 58, 5]), wifi: pt("Wi-Fi Card", [-19, 87, 4.2]),
    pipe: pt("Heat Pipes", [30, 52, 6]), fins: pt("Fin Stack", [78, 102, 8.4]), fan: pt("Fan", FAN), batt: pt("Battery", [0, -52, 7.2]),
    keys: pt("Keyboard", [-60, 50, KEY_TOP]), screen: pt("Display", L(0, 114, -2.6)), bezel: pt("Bezel", L(0, 8, -3.4)),
  },
  steps: [
    { t: "Pick your ports", focus: "card", dist: 0.45, ex: 1, p: ["card", "bay", "board"], n: ["Expansion Card 1", "Expansion Card 2", "Expansion Card 3", "Expansion Card 4", "Expansion Bays"], ms: 4400,
      d: "Each expansion card is an adapter on a USB-C plug: USB-A, HDMI, DisplayPort, Ethernet or storage. Slide one out, slide another in, on either side." },
    { t: "Everything inside is replaceable", focus: "ram", dist: 0.42, ex: 1, p: ["ram", "ssd", "wifi"], n: ["Memory", "SSD", "Wi-Fi Card"], ms: 4400,
      d: "Standard parts in standard sockets: two SO-DIMMs, an M.2 SSD and an M.2 Wi-Fi card. Every screw has a QR code to its repair guide, and one screwdriver comes in the box." },
    { t: "An upgradeable mainboard", focus: "cpu", dist: 0.4, ex: 1, p: ["board", "cpu", "pipe", "fins"], n: ["Processor", "Mainboard", "Heat Pipes"], ms: 4400,
      d: "When a faster processor comes out, the whole mainboard swaps out of the same chassis. The old one can become a small desktop or a home server." },
    { t: "Cooling", focus: "fan", dist: 0.42, ex: 1, p: ["cpu", "pipe", "fan", "fins"], n: ["Fan", "Fan Housing", "Fin Stack", "Heat Pipes"], ms: 4200,
      d: "Two heat pipes carry the processor's heat to a fin stack; the fan pulls air in underneath and blows it out at the back." },
    { t: "Magnets, not glue", focus: "keys", dist: 0.5, ex: 1, p: ["keys", "batt", "bezel"], n: ["Input Cover", "Keyboard", "Touchpad", "Bezel", "Battery"], ms: 4400,
      d: "The input cover and the display bezel are held on by magnets, and the battery by screws. Nothing is glued, so any part can be replaced in minutes." },
  ],
};
const SU = SCREEN.u0, ST = SCREEN.u1;
const screen = { module: "panel", origin: L(-SCREEN.hw, SU, -2.65), right: L(SCREEN.hw, SU, -2.65), top: L(-SCREEN.hw, ST, -2.65), cornerRadius: 0 };

// ---------- page and gallery ----------
const geometry = geometryScript("FW13_GEOMETRY", "framework/build.js", { explode, hotspots, tour, screen,
  keys: keys.map(k => [...r3(k.slice(0, 4)), k[4]]), keyTop: KEY_TOP, constants: { HW, HH } });
const model = read(path.join(HERE, "..", "lib", "screen-runtime.js")) + read(path.join(HERE, "model.js"));
const html = buildPage({ template: "spectre", geometry: geometry.js, model, swaps: [
  [/<title>[^<]*<\/title>/, "<title>Framework Laptop 13</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the Framework Laptop 13 open at 110 degrees: on hover the expansion cards slide out, the input cover lifts off, the bezel pops forward and the mainboard, memory, SSD, fan, battery and bottom cover move apart\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Framework Laptop 13</b><span>Repairable</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG FW13-001 &middot; Rev A<br>Units mm &middot; View az 40&deg; / el 28&deg;<br>Concept page, not affiliated with Framework</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "framework", label: "Framework Laptop 13", kind: "laptop", tags: "framework laptop 13 repairable modular expansion cards notebook linux",
  key: "fw13-theme", category: "Computers", html }, "macbookpro");
console.log(`framework/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
