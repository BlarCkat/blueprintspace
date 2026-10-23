/*
Game Boy concept: a modern redesign in smoked translucent plastic, built from a concept render. Builds the model
page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm, standing upright: X across, Y back from the front (the front faces
-Y, towards the default view), Z up; 80 x 128 x 17. A square screen unit sits over the top two thirds of a
translucent base; below it, the controls: four round direction buttons, X Y A B in a diamond, a small square
display between them and select/start under it. The board shows through the shell. A grey back plate stands
proud on the left. The page's chrome and the shared engine come from the Spectre page; lib/screen-runtime.js
keeps the logo on the screen and plays a game over it when the screen is turned on.

    node gbconcept/build.js

Writes gbconcept/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, extrude, rrBody, cyl,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y (negative y is towards the viewer)
const FX = q => [q[2], q[0], q[1]];
const HW = 40, H = 124, F = -1, B = 9;          // the base: half width, height, front and back faces
const SL = { x0: -37, x1: 39, z0: 42, z1: 128, f: -7.5 };   // the screen unit over the top of the base
const SCR = { x: 1, z: 85, hw: 33, hh: 38 };
const DPAD = [-23, 21], ABXY = [23, 21];

const explode = {
  slider: [0, -40, 30], screenGlass: [0, -52, 30], keys: [0, -24, 0], base: [0, 0, 0], board: [0, 14, 0], batt: [0, 26, 0], plate: [0, 44, 0],
};

// ---------- the base ----------
const base = part("Base Shell", "base", "major");
withFrame(FY, () => rrBody(base, 0, H / 2, HW, H / 2, [5, 7, 5, 5], [[1, F, true], [0, F + 1], [0, B - 1], [1, B, true]], { seg: 6 }));
const slot = part("Cartridge Slot", "base", "minor");
loop(slot, rrPts(14, 4, 18, 1.4, 1.3, 3).map(q => [...q, -0.05]));                         // underneath
withFrame(FY, () => { for (let i = 0; i < 7; i++) line(slot, [18 + i * 2.6, 2, F - 0.05], [18 + i * 2.6, 6, F - 0.05]); });   // the grip ridges at the bottom right
const plate = part("Back Plate", "plate", "major");
withFrame(FY, () => {
  rrBody(plate, -4, H / 2 + 2, HW + 3, H / 2 - 4, 6, [[0, B - 0.5, true], [0, B + 3.4], [0.8, B + 4.2, true]], { seg: 6 });
  [[82, 2.5], [88, 2.5], [52, 4], [30, 4]].forEach(([z, h]) => extrude(plate, rrRegion(-HW - 6.4, z, 0.6, h, 0.5, 2), B + 0.6, B + 3.6));   // notches down the left edge
});

// ---------- the screen unit ----------
const slider = part("Screen Unit", "slider", "major");
withFrame(FY, () => {
  const cx = (SL.x0 + SL.x1) / 2, cz = (SL.z0 + SL.z1) / 2;
  rrBody(slider, cx, cz, (SL.x1 - SL.x0) / 2, (SL.z1 - SL.z0) / 2, 7, [[1.2, SL.f, true], [0, SL.f + 1.2], [0, F, true]], { seg: 6 });
});
const glass = part("Screen", "screenGlass", "major");
withFrame(FY, () => {
  extrude(glass, rrRegion(SCR.x, SCR.z, SCR.hw + 1.5, SCR.hh + 1.5, 4, 4), SL.f - 0.4, SL.f);
  loop(glass, rrPts(SCR.x, SCR.z, SCR.hw, SCR.hh, 3, 4).map(q => [...q, SL.f - 0.45]));
});
const rails = part("Slide Rails", "slider", "minor");
withFrame(FY, () => [-30, 32].forEach(x => extrude(rails, rect(x - 1.5, x + 1.5, 46, 124), F - 0.6, F)));

// ---------- the controls ----------
const keys = part("Buttons", "keys", "minor");
withFrame(FY, () => {
  // direction buttons: four separate round keys with arrows
  [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([dx, dz]) => {
    const c = [DPAD[0] + dx * 8, DPAD[1] + dz * 8], a = Math.atan2(dz, dx);
    cyl(keys, c[0], c[1], 4.3, F - 1.8, F, 28);
    loop(keys, [0, 2.3, -2.3].map(k => [c[0] + 1.8 * Math.cos(a + k), c[1] + 1.8 * Math.sin(a + k), F - 1.85]));
  });
  // Y on top, X left, B right, A below
  [[0, 1, "Y"], [-1, 0, "X"], [1, 0, "B"], [0, -1, "A"]].forEach(([dx, dz, l]) => {
    const c = [ABXY[0] + dx * 8, ABXY[1] + dz * 8];
    cyl(keys, c[0], c[1], 4.5, F - 1.8, F, 28);
    const z = F - 1.85, s = 1.6;
    if (l === "X") { line(keys, [c[0] - s, c[1] - s, z], [c[0] + s, c[1] + s, z]); line(keys, [c[0] - s, c[1] + s, z], [c[0] + s, c[1] - s, z]); }
    if (l === "Y") { line(keys, [c[0] - s, c[1] + s, z], [c[0], c[1], z]); line(keys, [c[0] + s, c[1] + s, z], [c[0], c[1], z]); line(keys, [c[0], c[1], z], [c[0], c[1] - s, z]); }
    if (l === "A") loop(keys, [[c[0] - s, c[1] - s], [c[0], c[1] + s], [c[0] + s, c[1] - s]].map(q => [...q, z]));
    if (l === "B") loop(keys, [[c[0] - s * 0.8, c[1] - s], [c[0] - s * 0.8, c[1] + s], [c[0] + s * 0.6, c[1] + s * 0.5], [c[0], c[1]], [c[0] + s * 0.6, c[1] - s * 0.5]].map(q => [...q, z]));
  });
  [[-5, 8], [5, 8]].forEach(([x, z]) => extrude(keys, rrRegion(x, z, 3.2, 1.2, 1.1, 3), F - 0.8, F));   // select, start
});
const mini = part("Status Display", "keys", "minor");
withFrame(FY, () => { extrude(mini, rrRegion(0, 23, 5.4, 6.4, 1, 3), F - 0.6, F); loop(mini, rrPts(0, 23, 4.4, 5.4, 0.6, 2).map(q => [...q, F - 0.65])); });

// ---------- inside: the board you can see through the shell ----------
const board = part("Main Board", "board", "major");
withFrame(FY, () => {
  extrude(board, rrRegion(0, 62, 36, 58, 4, 4), 1.4, 2.6);
  // traces running between the buttons, the centre display and the edge connector
  [[-23, 21, -6, 23], [23, 21, 6, 23], [0, 17, 0, 8], [-10, 30, -10, 46], [10, 30, 10, 46], [-31, 12, -31, 40], [31, 12, 31, 40]].forEach(([x0, z0, x1, z1]) => line(board, [x0, z0, 1.35], [x1, z1, 1.35]));
  for (let i = 0; i < 9; i++) line(board, [-12 + i * 3, 34, 1.35], [-12 + i * 3, 40, 1.35]);
  [[-23, 21], [23, 21]].forEach(([x, z]) => loop(board, circlePts(x, z, 13, 32).map(q => [...q, 1.35])));
});
const chips = part("Chips", "board", "major");
withFrame(FY, () => {
  extrude(chips, rrRegion(0, 76, 9, 9, 0.6, 2), 2.6, 3.6);     // the processor
  extrude(chips, rrRegion(-18, 80, 5, 6, 0.4, 2), 2.6, 3.4);   // memory
  extrude(chips, rrRegion(18, 80, 5, 4, 0.4, 2), 2.6, 3.4);    // wireless
});
const battery = part("Battery", "batt", "major");
withFrame(FY, () => extrude(battery, rrRegion(0, 82, 30, 30, 3, 3), 3.8, 7.6));

// ---------- callouts and the tour ----------
const hotspots = [
  ["Square screen", "Under the lift-up screen unit", [SCR.x - 20, SL.f - 0.45, SCR.z + 20], ["Screen", "Screen Unit"]],
  ["Direction buttons", "Four separate keys, not a cross", [DPAD[0], F - 1.8, DPAD[1] + 8], ["Buttons"]],
  ["X Y A B", "In a diamond, like a modern pad", [ABXY[0] + 8, F - 1.8, ABXY[1]], ["Buttons"]],
  ["Status display", "A tiny screen between the pads", [0, F - 0.6, 23], ["Status Display"]],
  ["Smoked shell", "See the board right through it", [-30, F, 34], ["Base Shell", "Main Board"]],
  ["Back plate", "A grey grip behind the shell", [-HW - 6, B + 3.4, 100], ["Back Plate"]],
  ["Processor", "With memory and wireless beside it", [0, 3.6, 76], ["Chips"]],
].map(([t, s, p, o]) => ({ t, s, p: r3(p), o }));
const pt = (name, p) => [...r3(p), name];
const tour = {
  points: {
    keys: pt("Buttons", [ABXY[0], F - 1.8, ABXY[1]]), traces: pt("Main Board", [0, 1.4, 40]), cpu: pt("Chips", [0, 3.6, 76]),
    screen: pt("Screen", [SCR.x, SL.f, SCR.z]), batt: pt("Battery", [0, 7.6, 82]), mini: pt("Status Display", [0, F - 0.6, 23]),
  },
  steps: [
    { t: "Press a button", focus: "keys", dist: 0.42, ex: 0, p: ["keys", "traces", "cpu"], n: ["Buttons", "Main Board"], ms: 4000,
      d: "Every press runs down a trace you can actually see through the smoked shell, up the board to the processor." },
    { t: "The processor", focus: "cpu", dist: 0.4, ex: 1, p: ["cpu", "screen"], n: ["Chips", "Main Board"], ms: 3800,
      d: "A modern processor with its memory and wireless chips beside it, running the old games and new ones alike." },
    { t: "The screen", focus: "screen", dist: 0.5, ex: 1, p: ["cpu", "screen"], n: ["Screen", "Screen Unit"], ms: 3800,
      d: "A big square screen fills the unit on top, rather than a small window in a big bezel." },
    { t: "Power and status", focus: "batt", dist: 0.45, ex: 1, p: ["batt", "mini"], n: ["Battery", "Status Display"], ms: 3800,
      d: "A flat battery sits behind the screen; the small display between the pads shows charge and connection at a glance." },
  ],
};
const SY = SL.f - 0.46;
const screen = { module: "screenGlass", origin: [SCR.x - SCR.hw, SY, SCR.z - SCR.hh], right: [SCR.x + SCR.hw, SY, SCR.z - SCR.hh], top: [SCR.x - SCR.hw, SY, SCR.z + SCR.hh], cornerRadius: 3 };

// ---------- page and gallery ----------
const geometry = geometryScript("GBC_GEOMETRY", "gbconcept/build.js", { explode, hotspots, tour, screen, constants: { H } });
const model = read(path.join(HERE, "..", "lib", "screen-runtime.js")) + read(path.join(HERE, "model.js"));
const html = buildPage({ template: "spectre", geometry: geometry.js, model, swaps: [
  [/<title>[^<]*<\/title>/, "<title>Game Boy Concept</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of a modern Game Boy concept in smoked translucent plastic, a square screen over its controls: on hover the screen unit lifts away and the buttons, board, battery and back plate move apart\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Game Boy Concept</b><span>Translucent redesign</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG GBC-001 &middot; Rev A<br>Units mm &middot; View az 25&deg; / el 14&deg;<br>Concept design, modelled from a render, not affiliated with Nintendo</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "gbconcept", label: "Game Boy Concept", kind: "console", tags: "game boy concept translucent smoke redesign handheld modern purple",
  key: "gbc-theme", category: "Consoles", html }, "playdate");
console.log(`gbconcept/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
