/*
Xbox Series X: builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm, standing upright: X across the front, Y back from the front
face (towards -Y, facing the default view), Z up; 151 x 151 x 301. The shell's dished top vent has a grid of
holes and the 130 mm fan under it is a module of its own, based at its hub, so the page can spin it. Inside:
the split motherboard either side of the vapour-chamber heatsink, the power supply at the bottom with the
disc drive above it. The page's chrome and the shared engine come from the X9 page already in the gallery.
Re-run after any change:

    node xbox/build.js

Writes xbox/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, tri, loop, rrPts, circlePts, rrRegion, rect, squareRing, stripRegion, extrude, rrBody, cyl, revolve,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y
const FX = q => [q[2], q[0], q[1]];   // draws in (y, z) and pushes along x
const HW = 75.5, H = 301, R = 4, TOP = 291;   // half the footprint, height, edge radius, where the top vent starts
const FAN = [0, 0, 280];

const modules = {
  shell: { offset: [-230, 0, 0] }, top: { offset: [0, 0, 170] }, fan: { offset: [0, 0, 110], base: FAN },
  socBoard: { offset: [0, -120, 0] }, ioBoard: { offset: [0, 120, 0] }, cooling: { offset: [0, 0, 40] },
  chassis: { offset: [0, 0, 0] }, drive: { offset: [0, -150, -60] }, psu: { offset: [0, 0, -130] },
};

// ---------- the shell: a sleeve with the front's details, the stand under it ----------
const shell = part("Shell", "shell", "major");
rrBody(shell, 0, 0, HW, HW, R, [[1.2, 0, true], [0, 1.6], [0, TOP, true]], { seg: 3, top: false });
const front = part("Front Panel", "shell", "minor");
withFrame(FY, () => {
  const F = -HW - 0.3;
  cyl(front, -HW + 22, 267, 8, F - 0.6, F + 0.3, 32);                                  // the power button with its logo ring
  loop(front, circlePts(-HW + 22, 267, 5.5, 32).map(q => [...q, F - 0.9]));
  extrude(front, rrRegion(-8, 70, 62, 1.6, 1.5, 3), F - 0.4, F + 0.3);                  // the disc slot
  extrude(front, rrRegion(64, 70, 3.5, 3.5, 3.4, 4), F - 0.6, F + 0.3);                 // eject
  extrude(front, rrRegion(58, 22, 6.5, 3, 0.8, 2), F - 0.4, F + 0.3);                   // USB-A
  extrude(front, rrRegion(44, 22, 3, 3, 2.9, 4), F - 0.6, F + 0.3);                     // controller pairing
});
const back = part("Rear Panel", "shell", "minor");
// the back face, seen from behind: x mirrored, pushed out along +y
withFrame(q => [-q[0], -q[2], q[1]], () => {
  const B = -HW - 0.3;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) loop(back, circlePts(-48 + c * 12 + (r % 2) * 6, 150 + r * 12, 3, 12).map(q => [...q, B]));   // vent holes
  [[-50, 30, 7, 2.6], [-32, 30, 7, 2.6], [-12, 30, 8, 3.2], [8, 30, 8, 6.5], [32, 26, 10, 7], [56, 34, 15, 5]].forEach(([x, z, w, h]) =>
    extrude(back, rrRegion(x, z, w, h, 0.8, 2), B, B + 0.6));                              // USB, USB, HDMI, Ethernet, power, expansion slot
});
const stand = part("Stand", "shell", "minor");
revolve(stand, 0, 0, [[0, -8], [52, -8, true], [56, -6], [56, -2], [54, 0, true], [0, 0]], 48);

// ---------- the top vent: a dish full of holes ----------
const top = part("Top Vent", "top", "major");
{
  const DISH = 70, DEPTH = 7, zAt = r => H - DEPTH * Math.max(0, 1 - (r / DISH) ** 2);
  // the flat rim round the dish and its sides down to the shell; the dish itself is the grille
  extrude(top, squareRing(0, 0, HW, DISH, 48), TOP, H);
}
const grille = part("Vent Grille", "top", "major");
{
  const DISH = 70, DEPTH = 7, zAt = r => H - DEPTH * Math.max(0, 1 - (r / DISH) ** 2);
  revolve(grille, 0, 0, Array.from({ length: 9 }, (_, i) => { const r = DISH * (1 - i / 8); return [r, zAt(r), i === 0]; }), 48);
  for (let y = -66; y <= 66; y += 7.6) for (let x = -66 + (Math.round((y + 66) / 7.6) % 2) * 3.8; x <= 66; x += 7.6) {
    const r = Math.hypot(x, y);
    if (r > DISH - 4) continue;
    loop(grille, circlePts(x, y, 2.4, 10).map(q => [...q, zAt(r) + 0.3]));
  }
}
const fan = part("Fan", "fan", "minor", { spool: "fan" });
revolve(fan, 0, 0, [[0, -6], [24, -6], [26, -2], [26, 4], [22, 7], [0, 7]], 36);   // hub and motor
for (let k = 0; k < 11; k++) {
  const lead = [], trail = [];
  for (let i = 0; i <= 6; i++) {
    const r = 26 + 37 * i / 6, a = 2 * Math.PI * k / 11 + 0.55 * i / 6, w = 0.3 + 0.12 * i / 6;
    lead.push([r * Math.cos(a), r * Math.sin(a)]); trail.push([r * Math.cos(a - w), r * Math.sin(a - w)]);
  }
  extrude(fan, stripRegion(lead, trail), -4, 4);
}
const shroud = part("Fan Shroud", "top", "minor");
{
  const outer = circlePts(0, 0, 68, 64), inner = circlePts(0, 0, 65, 64);
  extrude(shroud, stripRegion([...outer, outer[0]], [...inner, inner[0]]), 268, 290);
  extrude(shroud, squareRing(0, 0, 72, 68, 64), 288, 290);
}

// ---------- inside: chassis, boards, cooling ----------
const chassis = part("Chassis", "chassis", "major");
extrude(chassis, rrRegion(0, 0, 72, 72, 3, 3, [[-66, 66, -66, 66]]), 66, 70);          // a frame between the boards and the drive
[-1, 1].forEach(s => withFrame(FX, () => extrude(chassis, rect(-66, 66, 70, 266), s * 70 - 2, s * 70 + 2)));   // side walls
const soc = part("SoC Board", "socBoard", "major");
withFrame(FY, () => {
  extrude(soc, rrRegion(0, 166, 64, 94, 4, 3), -48, -46.4);
  extrude(soc, rrRegion(0, 190, 21, 19, 1.2, 3), -46.4, -44.6);                        // the processor package
  extrude(soc, rrRegion(0, 190, 13, 12, 0.6, 2), -44.6, -43.6);                        // its die: CPU and GPU together
  [[-36, 214], [-36, 190], [-36, 166], [36, 214], [36, 190], [36, 166], [-14, 228], [14, 228], [-14, 152], [14, 152]].forEach(([x, z]) =>
    extrude(soc, rrRegion(x, z, 6, 7, 0.5, 2), -46.4, -45.2));                          // ten GDDR6 chips
  for (let i = 0; i < 6; i++) extrude(soc, rrRegion(-50 + i * 20, 104, 4, 4, 0.6, 2), -46.4, -42);   // power stages
});
const io = part("I/O Board", "ioBoard", "major");
withFrame(FY, () => {
  extrude(io, rrRegion(0, 150, 64, 78, 4, 3), 46.4, 48);
  [[-30, 200], [-10, 200], [10, 200], [30, 200]].forEach(([x, z]) => extrude(io, rrRegion(x, z, 7, 9, 0.6, 2), 44.6, 46.4));   // SSD flash
  extrude(io, rrRegion(0, 170, 9, 9, 0.8, 2), 44.6, 46.4);                              // its controller
  extrude(io, rrRegion(42, 110, 10, 7, 1, 2), 40, 46.4);                                // expansion card connector
});
const heatsink = part("Heatsink", "cooling", "major");
withFrame(FY, () => extrude(heatsink, rrRegion(0, 190, 26, 24, 2, 3), -43.6, -38));   // vapour chamber on the processor
for (let x = -60; x <= 60.1; x += 3) withFrame(FX, () => extrude(heatsink, rect(-38, 40, 100, 262), x - 0.3, x + 0.3));   // the fin stack
loop(heatsink, [[-60, -38, 262.3], [60, -38, 262.3], [60, 40, 262.3], [-60, 40, 262.3]]);

// ---------- bottom: power supply and disc drive ----------
const psu = part("Power Supply", "psu", "major");
rrBody(psu, 0, 0, 70, 70, 3, [[0, 4, true], [0, 36, true]], { seg: 3 });
for (let x = -60; x <= 60; x += 10) line(psu, [x, -60, 36.3], [x, 60, 36.3]);
const drive = part("Disc Drive", "drive", "major");
rrBody(drive, -6, -26, 64, 44, 3, [[0, 40, true], [0, 62, true]], { seg: 3 });
revolve(drive, -6, -26, [[0, 62.3], [60, 62.3, true]], 48);                            // where the disc spins
loop(drive, circlePts(-6, -26, 8, 24).map(q => [...q, 62.6]));

// ---------- callouts and the "how it works" tour ----------
const local = (name, p) => r3(name === "Fan" ? p.map((c, i) => c - FAN[i]) : p);
const hotspots = [
  ["Top vent", "A dished grille, lit green inside", [0, 0, H - 7], ["Vent Grille", "Top Vent"]],
  ["130 mm fan", "Pulls air up through the console", [40, 0, 284], ["Fan", "Fan Shroud"]],
  ["Vapour chamber", "Spreads the processor's heat", [0, -38, 214], ["Heatsink"]],
  ["Processor", "8 CPU cores, 52 GPU units", [0, -43.6, 190], ["SoC Board"]],
  ["GDDR6 memory", "16 GB round the processor", [36, -45.2, 214], ["SoC Board"]],
  ["1 TB SSD", "Fast enough to stream the world in", [-30, 44.6, 200], ["I/O Board"]],
  ["Expansion slot", "More storage on a card", [56, HW + 0.9, 34], ["Rear Panel", "I/O Board"]],
  ["Disc drive", "4K Ultra HD Blu-ray", [-8, -HW - 0.7, 70], ["Front Panel", "Disc Drive"]],
  ["Power supply", "Inside, at the bottom", [0, -70, 36], ["Power Supply"]],
  ["Power button", "The Xbox button, top left", [-HW + 22, -HW - 0.9, 267], ["Front Panel"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    intake: pt("Rear Panel", [0, HW + 30, 180]), back: pt("Rear Panel", [0, HW, 180]), fins: pt("Heatsink", [0, 0, 200]), fan: pt("Fan", [0, 0, 280]),
    out: pt("Vent Grille", [0, 0, H + 60]), soc: pt("SoC Board", [0, -44, 190]), mem: pt("SoC Board", [36, -45, 214]), mem2: pt("SoC Board", [-36, -45, 166]),
    ssd: pt("I/O Board", [-30, 45, 200]), psu: pt("Power Supply", [0, 0, 36]), board: pt("SoC Board", [0, -46, 104]),
  },
  steps: [
    { t: "Air in at the back", focus: "back", dist: 0.5, ex: 0, p: ["intake", "back", "fins"], n: ["Rear Panel", "Shell", "Heatsink"], ms: 4200,
      d: "Cool air is drawn in through the holes in the back and sides and up through the console, past the boards and the power supply." },
    { t: "Through the heatsink", focus: "fins", dist: 0.45, ex: 1, p: ["soc", "fins"], n: ["Heatsink", "SoC Board"], ms: 4200,
      d: "A vapour chamber on the processor spreads its heat into a tall stack of fins between the two halves of the motherboard." },
    { t: "One big fan, out the top", focus: "fan", dist: 0.42, ex: 0, p: ["fins", "fan", "out"], n: ["Fan", "Fan Shroud", "Top Vent", "Vent Grille"], ms: 4400,
      d: "A single 130 mm fan pulls the warm air up and pushes it out through the dished top vent. One large, slow fan is much quieter than several small fast ones." },
    { t: "The processor and its memory", focus: "soc", dist: 0.35, ex: 1, p: ["soc", "mem", "soc", "mem2", "soc"], n: ["SoC Board"], ms: 4400,
      d: "CPU and GPU share one chip, surrounded by ten GDDR6 memory chips: 16 GB in all, shared between the game's logic and its graphics." },
    { t: "Streaming from the SSD", focus: "ssd", dist: 0.38, ex: 1, p: ["ssd", "soc"], n: ["I/O Board", "SoC Board"], ms: 4200,
      d: "The 1 TB solid-state drive on the other board feeds the game's world straight in as you move through it, with hardware to unpack the data on the way." },
    { t: "Power from the bottom", focus: "psu", dist: 0.45, ex: 1, p: ["psu", "board", "soc"], n: ["Power Supply", "SoC Board"], ms: 4200,
      d: "The power supply sits at the bottom, under the disc drive, and feeds the power stages next to the processor." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("XSX_GEOMETRY", "xbox/build.js", { explode: modules, hotspots, tour, constants: { HW, H } });
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>Xbox Series X</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the Xbox Series X standing upright with its fan turning: on hover the shell slides off, the top vent and fan lift, the boards move apart and the disc drive and power supply drop out\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Console parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Xbox Series X</b><span>Console</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG XSX-001 &middot; Rev A<br>Units mm &middot; View az 45&deg; / el 22&deg;<br>Concept page, not affiliated with Microsoft</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "xbox", label: "Xbox Series X", kind: "console", tags: "xbox series x microsoft console games 2020 fan",
  key: "xsx-theme", category: "Consoles", html }, "ps5");
console.log(`xbox/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
