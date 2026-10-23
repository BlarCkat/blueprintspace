/*
Playdate: builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm, standing upright: X across, Y back from the front (the front faces
-Y, towards the default view), Z up; 76 x 74 x 9. The crank on the right side is a module of its own, based at its
axle, so the page can turn it, and the D-pad is based at its pivot so it can rock. The page's chrome and the shared
engine come from the Spectre page (the photo-screen button); lib/screen-runtime.js runs a 1-bit game on the
screen that follows the crank.

    node playdate/build.js

Writes playdate/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, polyRegion, extrude, rrBody, cyl,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y (negative y is towards the viewer)
const FX = q => [q[2], q[0], q[1]];   // draws in (y, z) and pushes along x
const HW = 38, H = 74, F = -4.6, B = 4.6, R = 4;
const SCR = { x: -5, z: 49.5, hw: 29.4, hh: 17.6 };   // 400 x 240 pixels
const CRANK = [HW, 0, 52], DPAD = [-21, F, 17];

const explode = {
  glass: { offset: [0, -45, 0] }, front: { offset: [0, -22, 0] }, keys: { offset: [0, -34, 0] }, dpad: { offset: [0, -34, 0], base: DPAD },
  board: { offset: [0, 10, 0] }, batt: { offset: [0, 22, 0] }, back: { offset: [0, 36, 0] }, crank: { offset: [28, 0, 0], base: CRANK },
};

// ---------- the shells ----------
const front = part("Front Shell", "front", "major");
withFrame(FY, () => rrBody(front, 0, H / 2, HW, H / 2, R, [[1, F, true], [0, F + 0.9], [0, 0, true]], { seg: 6, top: false }));
const back = part("Back Shell", "back", "major");
withFrame(FY, () => rrBody(back, 0, H / 2, HW, H / 2, R, [[0, 0, true], [0, B - 0.9], [1, B, true]], { seg: 6, bottom: false }));
const screws = part("Screws", "front", "minor");
withFrame(FY, () => [[-33.5, 5], [33.5, 5], [-33.5, 69], [33.5, 69]].forEach(([x, z]) => {
  cyl(screws, x, z, 2.3, F - 0.3, F, 20);
  loop(screws, circlePts(x, z, 1.1, 6).map(q => [...q, F - 0.35]));   // hex socket
}));
const edges = part("Ports and Lock", "back", "minor");
{
  loop(edges, circlePts(-16, 0, 1.9, 16).map(q => [...q, -0.05]));                              // headphones
  extrude(edges, rrRegion(9, 0, 4.4, 1.6, 1.5, 3), -0.5, 0.05);                                 // USB-C
  [-26, -24.5, -23].forEach(x => loop(edges, circlePts(x, 0, 0.4, 8).map(q => [...q, -0.05])));    // microphone
  extrude(edges, rrRegion(24, -0.5, 4, 1.4, 1.3, 3), H - 0.05, H + 0.7);                         // the lock button on top
  withFrame(FX, () => loop(edges, rrPts(0, 39, 3.2, 19, 3, 3).map(q => [...q, HW + 0.05])));     // the crank's dock in the right side
}

// ---------- the front: screen, menu button, speaker, buttons ----------
const glass = part("Screen Glass", "glass", "major");
withFrame(FY, () => {
  extrude(glass, rrRegion(SCR.x, SCR.z, SCR.hw + 1.8, SCR.hh + 1.9, 1.6, 4), F - 0.3, F);
  loop(glass, rrPts(SCR.x, SCR.z, SCR.hw, SCR.hh, 0.3, 2).map(q => [...q, F - 0.35]));
});
const lcd = part("Memory LCD", "glass", "major");
withFrame(FY, () => extrude(lcd, rrRegion(SCR.x, SCR.z, SCR.hw + 1.4, SCR.hh + 1.4, 0.5, 2), F + 0.4, F + 1.8));
const menu = part("Menu Button", "keys", "minor");
withFrame(FY, () => { cyl(menu, 31.5, 63, 3, F - 0.9, F, 24); loop(menu, circlePts(31.5, 63, 2.2, 20).map(q => [...q, F - 0.95])); });
const grille = part("Speaker Grille", "front", "minor");
withFrame(FY, () => {
  extrude(grille, rrRegion(31.5, 47.5, 1.8, 7.5, 1.7, 4), F - 0.05, F + 0.4);
  for (let z = 41.5; z <= 53.5; z += 1.5) line(grille, [30.2, z, F - 0.1], [32.8, z, F - 0.1]);
});
const ab = part("A and B", "keys", "minor");
withFrame(FY, () => [[6.5, "B"], [21.5, "A"]].forEach(([x, l]) => {
  cyl(ab, x, 17, 5.6, F - 1.4, F, 32);
  loop(ab, circlePts(x, 17, 4.4, 28).map(q => [...q, F - 1.45]));
  if (l === "A") loop(ab, [[x - 1.6, 15.4], [x, 18.8], [x + 1.6, 15.4]].map(q => [...q, F - 1.45]));
  else loop(ab, [[x - 1.2, 15.4], [x - 1.2, 18.6], [x + 0.8, 18.6], [x + 1.4, 17.8], [x + 0.6, 17], [x + 1.4, 16.2], [x + 0.8, 15.4]].map(q => [...q, F - 1.45]));
}));
const dpad = part("D-pad", "dpad", "minor", { spool: "dpad" });
withFrame(FY, () => {
  const a = 4.1, b = 11;
  extrude(dpad, polyRegion([[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a]]), -1.7, 0);
  loop(dpad, circlePts(0, 0, 2.2, 20).map(q => [...q, -1.75]));
});

// ---------- the crank ----------
const crank = part("Crank", "crank", "minor", { spool: "crank" });
withFrame(FX, () => {
  cyl(crank, 0, 0, 4.2, 0, 2.6, 28);                                         // the hub on its axle
  extrude(crank, rrRegion(0, -12, 3.4, 15.5, 3.3, 6), 2.6, 5.2);             // the arm
  cyl(crank, 0, -24, 3.2, 5.2, 13.5, 24);                                    // the knob you turn it by
  loop(crank, circlePts(0, -24, 2.2, 20).map(q => [...q, 13.55]));
  [-1.2, 1.2].forEach(d => line(crank, [d, -24, 5.3], [d, -24, 13.4]));
});

// ---------- inside ----------
const board = part("Main Board", "board", "major");
withFrame(FY, () => {
  extrude(board, rrRegion(0, 34, 34, 30, 2, 3), -0.6, 0.6);
  [[-21, 17], [6.5, 17], [21.5, 17], [31.5, 63]].forEach(([x, z]) => loop(board, circlePts(x, z, 3.6, 20).map(q => [...q, -0.65])));   // button contacts
});
const chips = part("Chips", "board", "minor");
withFrame(FY, () => {
  extrude(chips, rrRegion(-10, 36, 6, 6, 0.4, 2), 0.6, 1.6);      // the STM32 processor
  extrude(chips, rrRegion(4, 38, 4, 3, 0.3, 2), 0.6, 1.4);        // memory
  extrude(chips, rrRegion(16, 44, 5, 4, 0.4, 2), 0.6, 1.8);       // Wi-Fi and Bluetooth
  extrude(chips, rrRegion(30, 52, 2.5, 2.5, 0.3, 2), 0.6, 1.4);   // the crank's magnetic sensor
});
const speaker = part("Speaker", "board", "minor");
withFrame(FY, () => extrude(speaker, rrRegion(31.5, 47.5, 3, 9, 2, 3), F + 0.4, F + 3.4));
const battery = part("Battery", "batt", "major");
withFrame(FY, () => extrude(battery, rrRegion(-4, 34, 28, 22, 2, 3), 0.8, 3.8));

// ---------- callouts and the tour ----------
const BASED = { "Crank": CRANK, "D-pad": DPAD };
const local = (name, p) => r3(BASED[name] ? p.map((c, i) => c - BASED[name][i]) : p);
const hotspots = [
  ["Black-and-white screen", "400 x 240, no backlight, 50 fps", [SCR.x - 16, F - 0.35, SCR.z + 10], ["Screen Glass", "Memory LCD"]],
  ["The crank", "Folds out of the side", [HW + 13.5, 0, 28], ["Crank"]],
  ["D-pad", "Rocks on its pivot", [-21, F - 1.7, 26], ["D-pad"]],
  ["A and B", "Yellow, with their letters", [21.5, F - 1.4, 17], ["A and B"]],
  ["Menu button", "The system menu", [31.5, F - 0.9, 63], ["Menu Button"]],
  ["Speaker", "Behind the grille", [31.5, F - 0.05, 47.5], ["Speaker Grille", "Speaker"]],
  ["Processor", "An STM32 microcontroller", [-10, 1.6, 36], ["Chips", "Main Board"]],
  ["Lock button", "Sleeps it, on the top", [24, -0.5, H + 0.7], ["Ports and Lock"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    crank: pt("Crank", [HW + 13.5, 0, 28]), sensor: pt("Chips", [30, 1.4, 52]), cpu: pt("Chips", [-10, 1.6, 36]), lcd: pt("Memory LCD", [SCR.x, F + 0.4, SCR.z]),
    dpad: pt("D-pad", DPAD), ab: pt("A and B", [14, F - 1.4, 17]), batt: pt("Battery", [-4, 3.8, 34]), board: pt("Main Board", [0, 0, 30]),
  },
  steps: [
    { t: "Turn the crank", focus: "crank", dist: 0.45, ex: 0, p: ["crank", "sensor"], n: ["Crank"], ms: 4000,
      d: "The crank folds out of the right side. A magnet in its hub turns over a sensor on the board, which reads its angle all the way round, so games can use it as a dial." },
    { t: "Into the processor", focus: "cpu", dist: 0.4, ex: 1, p: ["sensor", "cpu"], n: ["Chips", "Main Board"], ms: 4000,
      d: "An STM32 microcontroller with 16 MB of RAM runs the game and reads the crank, the D-pad and the buttons." },
    { t: "The screen", focus: "lcd", dist: 0.45, ex: 1, p: ["cpu", "lcd"], n: ["Memory LCD", "Screen Glass"], ms: 4000,
      d: "A Sharp Memory LCD: pure black and white, 400 x 240, sharp in sunlight and frugal enough to stay on. Each pixel holds its state until it's told to change." },
    { t: "Your thumbs", focus: "dpad", dist: 0.45, ex: 0, p: ["dpad", "board", "ab"], n: ["D-pad", "A and B"], ms: 3800,
      d: "A rocking D-pad on the left, A and B on the right, each pressing a contact on the board." },
    { t: "Power", focus: "batt", dist: 0.45, ex: 1, p: ["batt", "board"], n: ["Battery"], ms: 3600,
      d: "A flat lithium battery behind the board, charged over USB-C." },
  ],
};
const SY = F - 0.36;
const screen = { module: "glass", origin: [SCR.x - SCR.hw, SY, SCR.z - SCR.hh], right: [SCR.x + SCR.hw, SY, SCR.z - SCR.hh], top: [SCR.x - SCR.hw, SY, SCR.z + SCR.hh], cornerRadius: 0.3 };

// ---------- page and gallery ----------
const geometry = geometryScript("PD_GEOMETRY", "playdate/build.js", { explode, hotspots, tour, screen, constants: { H } });
const model = read(path.join(HERE, "..", "lib", "screen-runtime.js")) + read(path.join(HERE, "model.js"));
const html = buildPage({ template: "spectre", geometry: geometry.js, model, swaps: [
  [/<title>[^<]*<\/title>/, "<title>Playdate</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the Playdate handheld with its crank turning: on hover the screen, front shell, buttons, board, battery and back move apart and the crank swings out\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Playdate</b><span>Handheld with a crank</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG PD-001 &middot; Rev A<br>Units mm &middot; View az 30&deg; / el 16&deg;<br>Concept page, not affiliated with Panic</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "playdate", label: "Playdate", kind: "console", tags: "playdate panic handheld crank yellow 1-bit games",
  key: "pd-theme", category: "Consoles", html }, "gameboy");
console.log(`playdate/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
