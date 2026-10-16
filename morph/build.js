/*
Morph handheld (a concept design): builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm: X across, Y back (the fronts face -Y, towards the default view),
Z up. Two pieces: the controller lies flat in front (130 x 80 x 17) and the console stands on its plinth behind
it (140 x 24 x 100): a cream body with a 4:3 screen and speaker slots, and a side module with a glowing dome and
a small status display. The turning bits are modules of their own, based at their axles, so the page can move
them: the dial on top, the D-pad (it rocks), the start button (it presses) and the rumble motor's weight. The
page's chrome and the shared engine come from the Spectre page (the photo-screen button); lib/screen-runtime.js
runs the start screen, a game and the status display.

    node morph/build.js

Writes morph/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, polyRegion, extrude, rrBody, cyl, revolve, tube,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y (negative y is towards the viewer)
const FX = q => [q[2], q[0], q[1]];   // draws in (y, z) and pushes along x

// the console, standing behind the controller
const Y0 = 52, Y1 = 76, YM = 64;                       // its front and back faces, the shells' seam
const MAIN = { x0: -70, x1: 34, z0: 5, z1: 116 };      // the main body
const MOD = { x0: 34, x1: 70, z0: 5, z1: 100 };         // the side module
const SCR = { x: -18, z: 80, hw: 38, hh: 28.5 };          // the screen's picture (4:3)
const DOME = [52, 79], DIAL = [-6, YM, MAIN.z1];
// the controller, lying flat in front
const CW = 65, CD = 40, CT = 17;
const DPAD = [-30, -6, CT], ABXY = [30, -6], START = [0, 26, CT], RUMBLE = [0, -22, 3.6];

const explode = {
  glass: { offset: [0, -60, 120] }, bezel: { offset: [0, -40, 120] }, front: { offset: [0, -20, 120] }, guts: { offset: [0, 0, 120] },
  module: { offset: [40, -10, 120] }, back: { offset: [0, 30, 120] }, dial: { offset: [0, -20, 150], base: DIAL }, plinth: { offset: [0, 0, 80] },
  cTop: { offset: [0, -10, 70] }, keys: { offset: [0, -10, 95] }, dpad: { offset: [0, -10, 95], base: DPAD }, start: { offset: [0, -10, 95], base: START },
  cBoard: { offset: [0, -10, 40] }, rumble: { offset: [0, -10, 40], base: RUMBLE }, cBottom: { offset: [0, -10, 0] },
};

// ---------- console: shells ----------
const chamferFront = (x0, x1, z0, z1, r) => withFrame(FY, () =>
  rrBody(frontShell, (x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2, r, [[2.4, Y0, true], [0.6, Y0 + 1.6], [0, Y0 + 3], [0, YM, true]], { seg: 6, top: false }));
const frontShell = part("Console Front Shell", "front", "major");
chamferFront(MAIN.x0, MAIN.x1, MAIN.z0, MAIN.z1, [6, 2, 10, 10]);
const backShell = part("Console Back Shell", "back", "major");
withFrame(FY, () => rrBody(backShell, (MAIN.x0 + MAIN.x1) / 2, (MAIN.z0 + MAIN.z1) / 2, (MAIN.x1 - MAIN.x0) / 2, (MAIN.z1 - MAIN.z0) / 2, [6, 2, 10, 10],
  [[0, YM, true], [0, Y1 - 3], [0.6, Y1 - 1.6], [2.4, Y1, true]], { seg: 6, bottom: false }));
withFrame(FY, () => { for (let i = 0; i < 6; i++) loop(backShell, rrPts(-50 + i * 13, 100, 4, 1.2, 1.1, 2).map(q => [...q, Y1 + 0.05])); });   // vents on the back
const modShell = part("Side Module", "module", "major");
withFrame(FY, () => rrBody(modShell, (MOD.x0 + MOD.x1) / 2, (MOD.z0 + MOD.z1) / 2, (MOD.x1 - MOD.x0) / 2, (MOD.z1 - MOD.z0) / 2, [2, 8, 12, 4],
  [[2.4, Y0 + 1, true], [0.6, Y0 + 2.6], [0, Y0 + 4], [0, Y1 - 4], [0.6, Y1 - 2.6], [2.4, Y1 - 1, true]], { seg: 6 }));

// the front: speaker slots under the screen, the side tabs
const grille = part("Speaker Grille", "front", "minor");
withFrame(FY, () => [37, 30, 23].forEach((z, r) => {
  for (let i = 0; i < 9 - (r === 2 ? 1 : 0); i++) {
    const x = -54 + i * 9 + (r === 2 ? 4.5 : 0) + (r === 1 ? 2.2 : 0);
    extrude(grille, rrRegion(x, z, 3.4, 1, 0.9, 2), Y0 - 0.2, Y0 + 0.4);
  }
}));
const tabs = part("Side Buttons", "front", "minor");
withFrame(FX, () => {
  extrude(tabs, rrRegion(YM - 4, 90, 5, 9, 2, 3), MAIN.x0 - 3.5, MAIN.x0 + 0.5);                  // the left tab
  extrude(tabs, rrRegion(YM - 4, 86, 5, 7, 2, 3), MOD.x1 - 0.5, MOD.x1 + 4);                       // the right tab, on the module
  extrude(tabs, rrRegion(YM + 4, 70, 3, 4, 1.5, 3), MOD.x1 - 0.5, MOD.x1 + 2.2);
});

// ---------- console: the screen ----------
const bezel = part("Screen Bezel", "bezel", "major");
withFrame(FY, () => {
  extrude(bezel, rrRegion(SCR.x, SCR.z, SCR.hw + 5.5, SCR.hh + 5.5, 6, 6), Y0 - 0.8, Y0 + 0.5);
  loop(bezel, rrPts(SCR.x, SCR.z, SCR.hw + 6.3, SCR.hh + 6.3, 6.6, 6).map(q => [...q, Y0 - 0.1]));   // the silver frame round it
});
const glass = part("Screen Glass", "glass", "major");
withFrame(FY, () => {
  extrude(glass, rrRegion(SCR.x, SCR.z, SCR.hw + 3.5, SCR.hh + 3.5, 3, 4), Y0 - 1.3, Y0 - 0.8);
  loop(glass, rrPts(SCR.x, SCR.z, SCR.hw, SCR.hh, 1, 2).map(q => [...q, Y0 - 1.35]));
});
const lcd = part("Display", "guts", "major");
withFrame(FY, () => {
  extrude(lcd, rrRegion(SCR.x, SCR.z, SCR.hw + 2, SCR.hh + 2, 1, 2), Y0 + 0.6, Y0 + 3);
  extrude(lcd, rect(SCR.x - 14, SCR.x + 14, SCR.z - SCR.hh - 8, SCR.z - SCR.hh - 2), Y0 + 3, Y0 + 3.3);   // its flex
});

// ---------- console: inside ----------
const board = part("Console Board", "guts", "major");
withFrame(FY, () => {
  extrude(board, rrRegion(-18, 72, 46, 32, 3, 3), YM - 2, YM - 0.6);
  [[-60, 44], [24, 44], [-60, 100], [24, 100]].forEach(([x, z]) => loop(board, circlePts(x, z, 1.4, 10).map(q => [...q, YM - 0.55])));
});
const chips = part("Processor and Memory", "guts", "major");
withFrame(FY, () => {
  extrude(chips, rrRegion(-24, 80, 8, 8, 0.8, 2), YM - 0.6, YM + 0.8);   // the processor
  extrude(chips, rrRegion(-24, 80, 5, 5, 0.4, 2), YM + 0.8, YM + 1.4);
  extrude(chips, rrRegion(-6, 84, 5, 4, 0.5, 2), YM - 0.6, YM + 0.4);    // memory
  extrude(chips, rrRegion(-6, 72, 4, 4, 0.5, 2), YM - 0.6, YM + 0.4);    // storage
  extrude(chips, rrRegion(10, 92, 4, 3, 0.4, 2), YM - 0.6, YM + 0.2);    // wireless
  extrude(chips, rrRegion(-46, 66, 3.5, 3.5, 0.4, 2), YM - 0.6, YM + 0.2);   // power
  extrude(chips, rect(26, 34, 62, 88), YM - 0.6, YM + 1.6);               // the connector to the module
});
const shield = part("Heat Spreader", "guts", "minor");
withFrame(FY, () => extrude(shield, rrRegion(-24, 80, 13, 12, 2, 3), YM + 1.4, YM + 2));
const battery = part("Console Battery", "guts", "major");
withFrame(FY, () => extrude(battery, rrRegion(-18, 24, 40, 12, 3, 3), YM - 8, YM - 2.4));
const speaker = part("Speaker", "guts", "minor");
withFrame(FY, () => { extrude(speaker, rrRegion(-18, 30, 30, 9, 4, 3), Y0 + 2, Y0 + 6); loop(speaker, rrPts(-18, 30, 26, 6, 3, 3).map(q => [...q, Y0 + 1.95])); });

// ---------- console: the side module ----------
const domeRing = part("Dome Bezel", "module", "minor");
withFrame(FY, () => revolve(domeRing, DOME[0], DOME[1], [[11.6, Y0 + 1], [14.5, Y0 + 1, true], [14.5, Y0 - 0.6, true], [11.6, Y0 - 0.6, true]], 48, true));
const dome = part("Glow Dome", "module", "major");
withFrame(FY, () => revolve(dome, DOME[0], DOME[1], [[11.6, Y0 - 0.6, true], [11.4, Y0 - 2.4], [10, Y0 - 5.2], [7.2, Y0 - 7.4], [3.6, Y0 - 8.6], [0, Y0 - 8.9]], 48));
const led = part("Dome Light", "module", "minor");
withFrame(FY, () => { cyl(led, DOME[0], DOME[1], 4, Y0 + 1, Y0 + 3, 20); extrude(led, rrRegion(DOME[0], DOME[1], 9, 9, 2, 2), Y0 + 3, Y0 + 4); });
const status = part("Status Display", "module", "major");
withFrame(FY, () => {
  extrude(status, rrRegion(DOME[0], 44, 9.5, 20, 4.5, 4), Y0 - 0.2, Y0 + 1.2);
  loop(status, rrPts(DOME[0], 44, 10.3, 20.8, 5.2, 4).map(q => [...q, Y0 + 0.4]));
});
const modBtn = part("Module Button", "module", "minor");
withFrame(FY, () => extrude(modBtn, rrRegion(62, 12, 3.2, 2, 0.8, 2), Y0, Y0 + 2));
const modBoard = part("Module Board", "module", "minor");
withFrame(FY, () => { extrude(modBoard, rrRegion(52, 52, 14, 40, 2, 3), YM, YM + 1.2); extrude(modBoard, rrRegion(52, 36, 4, 3, 0.4, 2), YM - 1, YM); });

// the dial on top, and the plinth it stands on
const dial = part("Dial", "dial", "minor", { spool: "dial" });
revolve(dial, 0, 0, [[0, 0], [6.5, 0, true], [7, 0.6], [7, 4.4, true], [6.4, 5, true], [0, 5]], 40);
for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; line(dial, [7.05 * Math.cos(a), 7.05 * Math.sin(a), 0.8], [7.05 * Math.cos(a), 7.05 * Math.sin(a), 4.2]); }   // knurling
line(dial, [0, 0, 5.05], [0, 5, 5.05]);
const plinth = part("Plinth", "plinth", "major");
rrBody(plinth, -18, YM, 48, 9, 4, [[1, 0, true], [0, 1], [0, MAIN.z0, true]], { seg: 4 });
withFrame(FY, () => extrude(plinth, rrRegion(-18, 2.6, 5, 0.8, 0.7, 2), Y0 + 2.4, Y0 + 3.2));   // the charging light

// ---------- controller ----------
const cBottom = part("Controller Base", "cBottom", "major");
rrBody(cBottom, 0, 0, CW, CD, 11, [[2.2, 0, true], [0.5, 1.5], [0, 3], [0, 9, true]], { seg: 6, top: false });
withFrame(FY, () => { extrude(cBottom, rrRegion(0, 5, 4.4, 1.6, 1.5, 3), -CD - 0.4, -CD + 0.6); });   // USB-C
const cTop = part("Controller Top", "cTop", "major");
rrBody(cTop, 0, 0, CW, CD, 11, [[0, 9, true], [0, CT - 1.6], [0.6, CT - 0.6], [2, CT, true]], { seg: 6, bottom: false });
const face = part("Face Plate", "cTop", "major");
extrude(face, rrRegion(0, -3, 59, 33, 8, 6, [[DPAD[0] - 13, DPAD[0] + 13, DPAD[1] - 13, DPAD[1] + 13], [ABXY[0] - 15, ABXY[0] + 15, ABXY[1] - 15, ABXY[1] + 15]]), CT - 0.4, CT + 0.3);
line(face, [-56, 18, CT + 0.35], [56, 18, CT + 0.35]);                                                  // the line under the top buttons
withFrame(FY, () => extrude(face, rrRegion(0, 10, 3.5, 1, 0.9, 2), -CD - 0.3, -CD + 0.6));              // the light on its front
const keys = part("Buttons", "keys", "minor");
[-24, 24].forEach(x => { extrude(keys, rrRegion(x, START[1], 5, 1.9, 1.8, 3), CT + 0.3, CT + 1.6); line(keys, [x - 3, START[1] + 4, CT + 0.35], [x + 3, START[1] + 4, CT + 0.35]); });   // select, home
[[-5, 7], [4, -18]].forEach(([x, y]) => extrude(keys, rrRegion(x, y, 2.4, 2.4, 0.6, 2), CT + 0.3, CT + 1.8));                          // the two small square keys
revolve(keys, ABXY[0], ABXY[1], [[0, CT + 0.3], [14, CT + 0.3, true], [14, CT + 1.3, true], [13.4, CT + 1.6, true], [0, CT + 1.6]], 48);   // the orange disc
const abxy = part("Face Buttons", "keys", "minor");
[[0, 6.8], [6.8, 0], [0, -6.8], [-6.8, 0]].forEach(([dx, dy]) => {
  cyl(abxy, ABXY[0] + dx, ABXY[1] + dy, 3.6, CT + 1.6, CT + 3.6, 24);
  loop(abxy, circlePts(ABXY[0] + dx, ABXY[1] + dy, 1.4, 12).map(q => [...q, CT + 3.65]));
});
const dpadWell = part("D-pad Well", "cTop", "minor");
revolve(dpadWell, DPAD[0], DPAD[1], [[13, CT + 0.3], [12.4, CT - 0.2, true], [0, CT - 0.2]], 48);
const dpad = part("D-pad", "dpad", "minor", { spool: "dpad" });
{
  const a = 4.2, b = 11.2;
  extrude(dpad, polyRegion([[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a]]), 0, 2.6);
  [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([dx, dy]) => {
    const c = [dx * 8, dy * 8], ang = Math.atan2(dy, dx);
    loop(dpad, [0, 2.3, -2.3].map(k => [c[0] + 1.6 * Math.cos(ang + k), c[1] + 1.6 * Math.sin(ang + k), 2.65]));
  });
  loop(dpad, circlePts(0, 0, 2.6, 20).map(q => [...q, 2.65]));
}
const start = part("Start Button", "start", "minor", { spool: "start" });
extrude(start, rrRegion(0, 0, 5, 1.9, 1.8, 3), 0.3, 1.6);
line(start, [-3, 4, 0.35], [3, 4, 0.35]);
const cBoard = part("Controller Board", "cBoard", "major");
extrude(cBoard, rrRegion(0, 0, 58, 34, 8, 4), 7, 8.2);
[[-30, 2.8], [-30 + 8, -6], [-30 - 8, -6], [-30, -14], [-24, 26], [24, 26], [0, 26], [-5, 7], [4, -18], [30, 0.8], [36.8, -6], [30, -12.8], [23.2, -6]]
  .forEach(([x, y]) => loop(cBoard, circlePts(x, y, 2.6, 16).map(q => [...q, 8.25])));   // the contacts under each button
extrude(cBoard, rrRegion(0, 8, 6, 6, 0.6, 2), 8.2, 9.2);       // its controller chip
extrude(cBoard, rrRegion(44, 26, 6, 4, 0.5, 2), 8.2, 9);       // wireless
const cBatt = part("Controller Battery", "cBoard", "minor");
extrude(cBatt, rrRegion(0, 12, 30, 9, 3, 3), 1.6, 6.6);
const rumble = part("Rumble Motor", "rumble", "minor", { spool: "rumble" });
withFrame(FX, () => {
  cyl(rumble, 0, 0, 3.6, -8, 4, 20);                                                                   // the motor, its axis along x
  extrude(rumble, polyRegion([[0, -1], [3.6, -3.6], [5.2, 0], [3.6, 3.6], [0, 1]].map(([u, v]) => [v, u])), 4.4, 8);   // the off-centre weight
});

// ---------- callouts and the tour ----------
const BASED = { "Dial": DIAL, "D-pad": DPAD, "Start Button": START, "Rumble Motor": RUMBLE };
const local = (name, p) => r3(BASED[name] ? p.map((c, i) => c - BASED[name][i]) : p);
const hotspots = [
  ["Screen", "4:3, under glass", [SCR.x - 20, Y0 - 1.3, SCR.z + 12], ["Screen Glass", "Display", "Screen Bezel"]],
  ["Speaker", "Behind three rows of slots", [-30, Y0 - 0.2, 30], ["Speaker Grille", "Speaker"]],
  ["Glow dome", "Lights up with the game", [DOME[0], Y0 - 8.9, DOME[1]], ["Glow Dome", "Dome Light"]],
  ["Status display", "Time, sync and battery", [DOME[0], Y0 - 0.2, 52], ["Status Display"]],
  ["Dial", "Volume, and menus", [-6, YM, MAIN.z1 + 5], ["Dial"]],
  ["D-pad", "Rocks in four directions", [DPAD[0], DPAD[1], CT + 2.6], ["D-pad"]],
  ["A B X Y", "On an orange disc", [ABXY[0], ABXY[1] + 6.8, CT + 3.6], ["Face Buttons", "Buttons"]],
  ["Start", "Between select and home", [0, START[1], CT + 1.6], ["Start Button"]],
  ["Processor", "Under a heat spreader", [-24, YM + 2, 80], ["Processor and Memory", "Console Board"]],
  ["Rumble", "An off-centre weight", [0, -22, 7.2], ["Rumble Motor"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    start: pt("Start Button", [0, START[1], CT + 1.6]), dpad: pt("D-pad", [DPAD[0], DPAD[1], CT + 2.6]), cchip: pt("Controller Board", [0, 8, 9]),
    air: pt("Controller Board", [0, 40, 40]), cboard: pt("Console Board", [10, YM, 92]), soc: pt("Processor and Memory", [-24, YM + 1.4, 80]),
    lcd: pt("Display", [SCR.x, Y0 + 0.6, SCR.z]), spk: pt("Speaker", [-18, Y0 + 2, 30]), dome: pt("Glow Dome", [DOME[0], Y0 - 8.9, DOME[1]]),
    stat: pt("Status Display", [DOME[0], Y0 - 0.2, 44]), mod: pt("Module Board", [52, YM, 52]), batt: pt("Console Battery", [-18, YM - 8, 24]),
    rumble: pt("Rumble Motor", [0, -22, 3.6]),
  },
  steps: [
    { t: "Press start", focus: "start", dist: 0.45, ex: 0, p: ["start", "cchip"], n: ["Start Button", "Buttons"], ms: 3600,
      d: "Each button closes a contact on the controller's board, and its chip reads them hundreds of times a second." },
    { t: "Over the air", focus: "cchip", dist: 0.55, ex: 1, p: ["dpad", "cchip", "air", "cboard"], n: ["Controller Board", "D-pad"], ms: 4200,
      d: "The two halves aren't wired together: the controller sends its buttons to the console over a low-latency wireless link." },
    { t: "The processor", focus: "soc", dist: 0.4, ex: 1, p: ["cboard", "soc"], n: ["Processor and Memory", "Console Board", "Heat Spreader"], ms: 4000,
      d: "A small processor with its memory and storage runs the game, under a heat spreader that passes its warmth to the shell." },
    { t: "Picture and sound", focus: "lcd", dist: 0.45, ex: 1, p: ["soc", "lcd", "spk"], n: ["Display", "Screen Glass", "Speaker"], ms: 4000,
      d: "It draws each frame on the 4:3 screen and plays the sound through a speaker behind the three rows of slots." },
    { t: "The side module", focus: "dome", dist: 0.42, ex: 1, p: ["soc", "mod", "dome", "stat"], n: ["Glow Dome", "Dome Light", "Status Display", "Module Board"], ms: 4200,
      d: "A light under the translucent dome glows with the game, and the little display shows the time, the sync with the controller and the battery." },
    { t: "Feel it", focus: "rumble", dist: 0.42, ex: 1, p: ["rumble"], n: ["Rumble Motor", "Controller Battery"], ms: 3800,
      d: "A tiny motor spins an off-centre weight to shake the controller when something happens in the game." },
  ],
};
const SY = Y0 - 1.36;   // the screen's picture, just in front of the glass
const screen = { module: "glass", origin: [SCR.x - SCR.hw, SY, SCR.z - SCR.hh], right: [SCR.x + SCR.hw, SY, SCR.z - SCR.hh], top: [SCR.x - SCR.hw, SY, SCR.z + SCR.hh], cornerRadius: 1 };
const statusPanel = { module: "module", origin: [DOME[0] - 8.5, Y0 - 0.25, 26], right: [DOME[0] + 8.5, Y0 - 0.25, 26], top: [DOME[0] - 8.5, Y0 - 0.25, 62] };

// ---------- page and gallery ----------
const geometry = geometryScript("MRP_GEOMETRY", "morph/build.js", { explode, hotspots, tour, screen, statusPanel, constants: { CT } });
const model = read(path.join(HERE, "..", "lib", "screen-runtime.js")) + read(path.join(HERE, "model.js"));
const html = buildPage({ template: "spectre", geometry: geometry.js, model, swaps: [
  [/<title>[^<]*<\/title>/, "<title>Morph Handheld</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the Morph, a two-piece handheld concept: a cream console with a screen, a glowing dome and a status display standing behind its controller; on hover the shells open and the screen, boards, battery, buttons and rumble motor move apart\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Morph</b><span>Handheld concept</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG MRP-001 &middot; Rev A<br>Units mm &middot; View az 30&deg; / el 24&deg;<br>Concept design, modelled from a render</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "morph", label: "Morph Handheld", kind: "console", tags: "morph handheld console concept retro controller screen orange cream design",
  key: "mrp-theme", category: "Consoles", html }, "psp");
console.log(`morph/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
