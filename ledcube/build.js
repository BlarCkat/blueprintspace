/*
Volumetric LED cube (a concept design from a render): builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm: X across, Y back from the front (the front faces -Y, towards the
default view), Z up. A 100 mm white aluminium base carries a smoked glass cube 96 mm on a side; inside, ten clear
layers each hold a 10 x 10 grid of light bars, a thousand voxels in all. The voxels themselves aren't in the
geometry: model.js lights them, as instanced bars, with patterns that move through the whole volume. The layers
are drawn as lines, so the glass and the voxels inside stay visible in every style. The page's chrome and the
shared engine come from the X9 page.

    node ledcube/build.js

Writes ledcube/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, extrude, rrBody, cyl, squareRing,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y (negative y is towards the viewer)
const BW = 51, BH = 32, CW = 48, CT = 128;   // the base's half width and height, the cube's half width and top
const N = 10, PITCH = 9, Z0 = 38.6, ZP = 9.3;  // voxels per side, their spacing across and up, the lowest row

const explode = { glass: [0, 0, 120], layers: [0, 0, 55], diffuser: [0, 0, 22], board: [0, 0, -18], base: [0, 0, -40] };

// ---------- the base ----------
const base = part("Base", "base", "major");
rrBody(base, 0, 0, BW, BW, 5, [[1.2, 0, true], [0, 1.2], [0, BH - 1.2], [0.6, BH, true]], { seg: 6 });
const controls = part("Controls", "base", "minor");
withFrame(FY, () => {
  const Fc = -BW;
  extrude(controls, rrRegion(-28, 16, 12, 3.4, 3.3, 6), Fc - 0.6, Fc + 0.1);          // the mode slider
  extrude(controls, rrRegion(-28 + 6, 16, 4, 2.4, 2.3, 4), Fc - 1.2, Fc - 0.6);
  extrude(controls, rrRegion(-7, 16, 3.6, 3.6, 1, 2), Fc - 0.8, Fc + 0.1);            // the X button
  line(controls, [-8.6, 14.4, Fc - 0.85], [-5.4, 17.6, Fc - 0.85]); line(controls, [-8.6, 17.6, Fc - 0.85], [-5.4, 14.4, Fc - 0.85]);
  extrude(controls, rrRegion(22, 16, 4.4, 1.6, 1.5, 3), Fc - 0.2, Fc + 0.1);          // USB-C
  loop(controls, rrPts(6, 18, 3, 1.4, 0.4, 2).map(q => [...q, Fc - 0.05]));           // regulatory marks
  loop(controls, rrPts(13, 18, 2.4, 1.4, 0.4, 2).map(q => [...q, Fc - 0.05]));
  [10, 12.6].forEach(z => line(controls, [3, z, Fc - 0.05], [16, z, Fc - 0.05]));
});
const feet = part("Feet", "base", "minor");
[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => cyl(feet, sx * 38, sy * 38, 6, -0.8, 0, 20));
const board = part("Driver Board", "board", "major");
extrude(board, rrRegion(0, 0, 46, 46, 3, 3), 8, 9.6);
const chips = part("LED Drivers", "board", "minor");
for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) extrude(chips, rrRegion(-32 + i * 16, -14 + j * 28, 5, 5, 0.4, 2), 9.6, 10.6);   // ten driver chips, one per layer
extrude(chips, rrRegion(0, 0, 7, 7, 0.6, 2), 9.6, 11);                  // the controller
extrude(chips, rrRegion(32, -36, 6, 4, 0.5, 2), 9.6, 10.8);             // wireless
const battery = part("Battery", "board", "minor");
extrude(battery, rrRegion(0, 0, 36, 16, 3, 3), 1.4, 7.4);
const diffuser = part("Diffuser Plate", "diffuser", "major");
extrude(diffuser, rrRegion(0, 0, CW + 1, CW + 1, 3, 3), BH, BH + 2);
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  const x = -PITCH * (N - 1) / 2 + i * PITCH, y = -PITCH * (N - 1) / 2 + j * PITCH;
  loop(diffuser, rrPts(x, y, 1.6, 1.6, 0.4, 1).map(q => [...q, BH + 2.05]));   // the sockets the light bars stand in
}

// ---------- the layers: ten clear sheets of light bars, drawn as lines ----------
const layers = part("Light Layers", "layers", "minor");
for (let k = 0; k < N; k++) {
  const z = Z0 - ZP / 2 + 0.6 + k * ZP, h = PITCH * N / 2;
  loop(layers, [[-h, -h, z], [h, -h, z], [h, h, z], [-h, h, z]]);
  if (k % 3 === 0) for (let i = 1; i < N; i++) { const c = -h + i * PITCH; line(layers, [c, -h, z], [c, h, z]); line(layers, [-h, c, z], [h, c, z]); }
}
const posts = part("Layer Posts", "layers", "minor");
[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => cyl(posts, sx * 45.5, sy * 45.5, 1.2, BH + 2, CT - 2, 12));   // the posts that hold them

// ---------- the glass cube: its edges ----------
const glass = part("Glass Cube", "glass", "major");
{
  const h = CW, z0 = BH + 2, z1 = CT;
  [z0, z1].forEach(z => loop(glass, rrPts(0, 0, h, h, 2, 2).map(q => [...q, z])));
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => line(glass, [sx * h, sy * (h - 2), z0], [sx * h, sy * (h - 2), z1]));
  loop(glass, rrPts(0, 0, h - 1.5, h - 1.5, 1, 2).map(q => [...q, z1 - 0.05]));
}
const rims = part("Glass Rims", "glass", "minor");
[[BH + 2, BH + 3.2], [CT - 1.2, CT]].forEach(([a, b]) => extrude(rims, rrRegion(0, 0, CW, CW, 2, 2, [[-CW + 2, CW - 2, -CW + 2, CW - 2]]), a, b));   // thin metal frames top and bottom

// ---------- callouts and the tour ----------
const hotspots = [
  ["1,000 light bars", "A 10 x 10 x 10 volume of light", [20, -20, 90], ["Light Layers"]],
  ["Smoked glass cube", "96 mm on a side", [CW, -CW, CT - 10], ["Glass Cube"]],
  ["Mode slider", "Picks the animation", [-28, -BW - 0.6, 16], ["Controls"]],
  ["USB-C", "Power and data", [22, -BW - 0.2, 16], ["Controls"]],
  ["LED drivers", "One chip per layer", [-32, -14, 10.6], ["LED Drivers", "Driver Board"]],
  ["Diffuser plate", "Each bar stands in a socket", [40, 40, BH + 2], ["Diffuser Plate"]],
  ["Battery", "Runs it unplugged", [0, -16, 7.4], ["Battery"]],
].map(([t, s, p, o]) => ({ t, s, p: r3(p), o }));
const pt = (name, p) => [...r3(p), name];
const tour = {
  points: {
    usb: pt("Controls", [22, -BW, 16]), ctrl: pt("LED Drivers", [0, 0, 11]), drv: pt("LED Drivers", [-32, -14, 10.6]), sock: pt("Diffuser Plate", [0, 0, BH + 2]),
    mid: pt("Light Layers", [0, 0, 80]), top: pt("Light Layers", [0, 0, CT - 6]), slider: pt("Controls", [-28, -BW, 16]),
  },
  steps: [
    { t: "Power and control", focus: "ctrl", dist: 0.45, ex: 1, p: ["usb", "ctrl"], n: ["Driver Board", "Controls"], ms: 3800,
      d: "Power comes in over USB-C or from the battery; a controller on the board decides, many times a second, which of the thousand voxels should be lit." },
    { t: "One driver per layer", focus: "drv", dist: 0.42, ex: 1, p: ["ctrl", "drv", "sock"], n: ["LED Drivers"], ms: 4000,
      d: "Ten driver chips each look after one layer of a hundred bars, switching their LEDs fast enough that your eye sees a steady glow." },
    { t: "A volume of light", focus: "mid", dist: 0.5, ex: 0, p: ["sock", "mid", "top"], n: ["Light Layers", "Glass Cube"], ms: 4400,
      d: "Ten clear layers stack inside the glass, each holding a 10 x 10 grid of light bars. Light any of them and you can draw shapes in three dimensions: rain, waves, spheres." },
    { t: "Pick a pattern", focus: "slider", dist: 0.42, ex: 0, p: ["slider", "ctrl"], n: ["Controls"], ms: 3600,
      d: "The slider on the front steps through the animations; the X button turns it off." },
  ],
};
const voxels = { n: N, pitch: PITCH, z0: Z0, zp: ZP, size: [5.4, 5.4, 6.8] };

// ---------- page and gallery ----------
const geometry = geometryScript("LED_GEOMETRY", "ledcube/build.js", { explode, hotspots, tour, voxels, constants: { CW, BH, CT } });
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>LED Cube</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of a volumetric LED cube on a white base, patterns of light moving through its thousand voxels: on hover the glass lifts off, the layers rise and the diffuser, driver board and base move apart\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Cube parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>LED Cube</b><span>Volumetric display</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG LED-001 &middot; Rev A<br>Units mm &middot; View az 30&deg; / el 20&deg;<br>Concept design, modelled from a render</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "ledcube", label: "LED Cube", kind: "gadget", tags: "led cube volumetric display voxel light lamp gadget animated red",
  key: "led-theme", category: "Gadgets", html }, "rubiks");
console.log(`ledcube/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
