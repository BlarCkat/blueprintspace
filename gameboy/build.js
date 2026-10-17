/*
Nintendo Game Boy (DMG-01, 1989): builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm, standing upright: X across, Y back from the front (the front
faces -Y, towards the default view), Z up; 90 x 148 x 32 with the big round corner at the bottom right. The
Game Pak stands in its slot at the top of the back, the four AA cells lie in the hump behind the buttons.
The D-pad (it rocks) and the A button (it presses) are modules of their own, based at their pivots. The page's
chrome and the shared engine come from the Spectre page (the photo-screen button); lib/screen-runtime.js
runs the boot logo and a game of falling blocks on the screen.

    node gameboy/build.js

Writes gameboy/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, polyRegion, extrude, rrBody, cyl, tube,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y (negative y is towards the viewer)
const FX = q => [q[2], q[0], q[1]];   // draws in (y, z) and pushes along x
const HW = 45, H = 148, F = -16, B = 6, HUMP = 17;   // half width, height, front face, back face, the battery hump's back
const RAD = [4, 24, 4, 4];                            // corner radii: bl, br (the famous one), tr, tl
const SCR = { x: 0, z: 108, hw: 23.5, hh: 21.5 };      // the LCD's picture, 160 x 144 pixels
const DPAD = [-24, F, 52], ABTN = [31, F, 58];

const explode = {
  lens: { offset: [0, -60, 0] }, lcd: { offset: [0, -40, 0] }, front: { offset: [0, -20, 0] }, keys: { offset: [0, -45, 0] },
  dpad: { offset: [0, -45, 0], base: DPAD }, abtn: { offset: [0, -45, 0], base: ABTN }, cpu: { offset: [0, 5, 0] },
  batt: { offset: [0, 30, -20] }, back: { offset: [0, 55, 0] }, pak: { offset: [0, 40, 90] }, pakBoard: { offset: [0, 20, 70] },
};

// ---------- the shells ----------
const front = part("Front Shell", "front", "major");
withFrame(FY, () => rrBody(front, 0, H / 2, HW, H / 2, RAD, [[1.8, F, true], [0.4, F + 1.2], [0, F + 2.4], [0, -4, true]], { seg: 8, top: false }));
const back = part("Back Shell", "back", "major");
withFrame(FY, () => rrBody(back, 0, H / 2, HW, H / 2, RAD, [[0, -4, true], [0, B - 1.4], [1.2, B, true]], { seg: 8, bottom: false }));
const hump = part("Battery Cover", "back", "major");
withFrame(FY, () => {
  rrBody(hump, 0, 46, HW - 4, 36, [3, 18, 4, 4], [[0, B - 0.5, true], [0, HUMP - 1.6], [1.6, HUMP, true]], { seg: 6, bottom: false });
  for (let i = 0; i < 6; i++) extrude(hump, rrRegion(0, 64 + i * 2.6, 14, 0.5, 0.45, 2), HUMP, HUMP + 0.6);   // the grip ridges
  loop(hump, rrPts(0, 46, HW - 8, 32, [2, 14, 3, 3], 6).map(q => [...q, HUMP + 0.05]));
});
// the cartridge slot's lip on top, the edge controls and jacks
const edges = part("Switches and Jacks", "back", "minor");
{
  extrude(edges, rrRegion(-24, -4, 9, 2, 1.5, 3), H - 0.6, H + 0.6);                      // OFF/ON slider
  line(edges, [-32, -1.6, H + 0.65], [-16, -1.6, H + 0.65]);
  loop(edges, circlePts(-10, 0, 2, 16).map(q => [...q, -0.05]));                         // headphones, underneath
  withFrame(FX, () => {
    cyl(edges, 0, 64, 7, HW - 1.6, HW + 1.4, 32);                                         // volume wheel, right side
    for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; line(edges, [7.05 * Math.cos(a), 64 + 7.05 * Math.sin(a), HW - 1.4], [7.05 * Math.cos(a), 64 + 7.05 * Math.sin(a), HW + 1.2]); }
    cyl(edges, 0, 106, 7, -HW - 1.4, -HW + 1.6, 32);                                      // contrast wheel, left side
    for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; line(edges, [7.05 * Math.cos(a), 106 + 7.05 * Math.sin(a), -HW - 1.2], [7.05 * Math.cos(a), 106 + 7.05 * Math.sin(a), -HW + 1.4]); }
    extrude(edges, rrRegion(-2, 128, 4, 5, 1.5, 3), -HW - 0.6, -HW + 0.2);                 // link port
    extrude(edges, rrRegion(-2, 26, 2.5, 2.5, 2.4, 4), -HW - 0.6, -HW + 0.2);              // DC in
  });
}

// ---------- the front: lens, logo, controls, speaker ----------
const lens = part("Screen Lens", "lens", "major");
withFrame(FY, () => {
  extrude(lens, rrRegion(0, 108, 38, 28, [3, 12, 3, 3], 6), F - 0.5, F);
  [130.6, 132].forEach(z => { line(lens, [-34, z, F - 0.55], [-16, z, F - 0.55]); line(lens, [16, z, F - 0.55], [34, z, F - 0.55]); });   // the stripes either side of DOT MATRIX
  loop(lens, rrPts(SCR.x, SCR.z, SCR.hw + 1, SCR.hh + 1, 0.5, 2).map(q => [...q, F - 0.55]));
  loop(lens, circlePts(-30, 112, 1.6, 12).map(q => [...q, F - 0.55]));                  // the battery light
});
const lcd = part("LCD", "lcd", "major");
withFrame(FY, () => {
  extrude(lcd, rrRegion(SCR.x, SCR.z, SCR.hw + 4, SCR.hh + 3, 1, 2), F + 0.6, F + 3);
  extrude(lcd, rect(-12, 12, SCR.z - SCR.hh - 9, SCR.z - SCR.hh - 3), F + 3, F + 3.3);   // its ribbon
});
const logo = part("Logo", "front", "minor");
withFrame(FY, () => { extrude(logo, rrRegion(-14, 74, 16, 3, 1.5, 3), F - 0.3, F); loop(logo, rrPts(10, 74, 12, 2.4, 1, 2).map(q => [...q, F - 0.05])); });
const keys = part("Buttons", "keys", "minor");
withFrame(FY, () => {
  // B (the A button is its own module), then select and start: rubber pills at an angle
  const ang = 25 * Math.PI / 180, rot = (c, pts) => pts.map(([x, z]) => [c[0] + (x - c[0]) * Math.cos(ang) - (z - c[1]) * Math.sin(ang), c[1] + (x - c[0]) * Math.sin(ang) + (z - c[1]) * Math.cos(ang)]);
  loop(keys, rot([24, 55], rrPts(24, 55, 15, 7.5, 7.4, 8)).map(q => [...q, F - 0.05]));   // the well round A and B
  [[-9, 22], [8, 22]].forEach(c => extrude(keys, polyRegion(rot(c, rrPts(c[0], c[1], 6, 1.8, 1.7, 4))), F - 1.6, F));
  // the speaker: six slots at the bottom right, angled like the buttons
  for (let i = 0; i < 6; i++) { const c = [17 + i * 3.6, 21 - i * 1.6]; loop(keys, rot(c, rrPts(c[0], c[1], 0.7, 7, 0.65, 3)).map(q => [...q, F - 0.05])); }
});
const bbtn = part("B Button", "keys", "minor");
withFrame(FY, () => cyl(bbtn, 17, 52, 5, F - 3, F, 32));
const dpad = part("D-pad", "dpad", "minor", { spool: "dpad" });
withFrame(FY, () => {
  const a = 4.3, b = 13;
  extrude(dpad, polyRegion([[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a]]), -3.4, 0);
  loop(dpad, circlePts(0, 0, 2.8, 20).map(q => [...q, -3.45]));
  [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([dx, dz]) => { const c = [dx * 9.5, dz * 9.5], t = Math.atan2(dz, dx); loop(dpad, [0, 2.3, -2.3].map(k => [c[0] + 1.6 * Math.cos(t + k), c[1] + 1.6 * Math.sin(t + k), -3.45])); });
});
const well = part("D-pad Well", "front", "minor");
withFrame(FY, () => loop(well, circlePts(DPAD[0], DPAD[2], 15.5, 48).map(q => [...q, F - 0.05])));
const abtn = part("A Button", "abtn", "minor", { spool: "abtn" });
withFrame(FY, () => cyl(abtn, 0, 0, 5, -3, 0, 32));

// ---------- inside ----------
const cpu = part("CPU Board", "cpu", "major");
withFrame(FY, () => {
  extrude(cpu, rrRegion(0, 46, 40, 40, [3, 20, 3, 3], 6), -2, -0.6);
  [[-24, 52], [17, 52], [31, 58], [-9, 22], [8, 22]].forEach(([x, z]) => loop(cpu, circlePts(x, z, 4.5, 20).map(q => [...q, -2.05])));   // button contacts
});
const chips = part("Chips", "cpu", "major");
withFrame(FY, () => {
  extrude(chips, rect(-14, 6, 60, 80), -0.6, 1.2);       // the Sharp LR35902 CPU
  extrude(chips, rect(10, 26, 66, 78), -0.6, 1);          // work RAM
  extrude(chips, rect(10, 26, 50, 62), -0.6, 1);          // video RAM
  extrude(chips, rect(-30, -18, 66, 78), -0.6, 0.8);      // amplifier
});
const lcdBoard = part("LCD Board", "lcd", "minor");
withFrame(FY, () => extrude(lcdBoard, rrRegion(0, 112, 38, 30, 2, 3), F + 3.3, F + 4.6));
const speaker = part("Speaker", "cpu", "minor");
withFrame(FY, () => { cyl(speaker, 26, 17, 10, F + 2, F + 6, 32); loop(speaker, circlePts(26, 17, 7, 28).map(q => [...q, F + 1.95])); });
const cells = part("AA Batteries", "batt", "major");
[22, 37, 52, 67].forEach((z, i) => {
  tube(cells, [[-25, 11, z], [25, 11, z]], 7, 20);
  tube(cells, [[i % 2 ? 25 : -25, 11, z], [i % 2 ? 26.5 : -26.5, 11, z]], 2.6, 10);   // the positive ends, alternating
});
const pak = part("Game Pak", "pak", "major");
withFrame(FY, () => {
  extrude(pak, polyRegion([[-28.5, 100], [28.5, 100], [28.5, 160], [24.5, 165], [-28.5, 165]]), -2.8, 5);
  loop(pak, rrPts(0, 140, 22, 15, 1, 2).map(q => [...q, -2.85]));                         // the label
  for (let i = 0; i < 6; i++) line(pak, [-20 + i * 8, 161, -2.85], [-20 + i * 8 + 4, 161, -2.85]);   // grip lines
});
const pakBoard = part("Cartridge Board", "pakBoard", "minor");
withFrame(FY, () => { extrude(pakBoard, rect(-24, 24, 98, 152), -0.6, 0.6); extrude(pakBoard, rect(-14, 8, 120, 140), 0.6, 2); extrude(pakBoard, rect(-26, 26, 96, 100), -0.6, 0.6); });

// ---------- callouts and the tour ----------
const BASED = { "D-pad": DPAD, "A Button": ABTN };
const local = (name, p) => r3(BASED[name] ? p.map((c, i) => c - BASED[name][i]) : p);
const hotspots = [
  ["Dot-matrix screen", "160 x 144, four shades of green", [SCR.x - 14, F - 0.55, SCR.z + 12], ["Screen Lens", "LCD"]],
  ["D-pad", "Nintendo's cross, rocking on a pivot", [DPAD[0], F - 3.4, DPAD[2] + 9], ["D-pad"]],
  ["A and B", "Tilted for your thumb", [31, F - 3, 58], ["A Button", "B Button"]],
  ["Select and Start", "Rubber pills", [8, F - 1.6, 22], ["Buttons"]],
  ["Speaker", "Mono, behind six slots", [26, F - 0.05, 17], ["Speaker", "Buttons"]],
  ["Game Pak", "Slots in at the top", [0, -2.8, 150], ["Game Pak", "Cartridge Board"]],
  ["Sharp LR35902", "A Z80-like CPU at 4.19 MHz", [-4, 1.2, 70], ["Chips", "CPU Board"]],
  ["Four AA batteries", "About 15 hours of play", [0, 11, 67], ["AA Batteries", "Battery Cover"]],
  ["Volume", "A wheel on the right", [HW + 1.4, 0, 64], ["Switches and Jacks"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    pak: pt("Game Pak", [0, 1, 150]), rom: pt("Cartridge Board", [-3, 2, 130]), cpu: pt("Chips", [-4, 1.2, 70]), ram: pt("Chips", [18, 1, 72]),
    lcd: pt("LCD", [0, F + 0.6, SCR.z]), dpad: pt("D-pad", DPAD), a: pt("A Button", ABTN), spk: pt("Speaker", [26, F + 2, 17]),
    batt: pt("AA Batteries", [0, 11, 44]), board: pt("CPU Board", [0, -2, 40]),
  },
  steps: [
    { t: "Slot in a Game Pak", focus: "pak", dist: 0.45, ex: 1, p: ["rom", "pak"], n: ["Game Pak", "Cartridge Board"], ms: 3800,
      d: "The game lives on a ROM chip inside the cartridge. Pushed into the slot at the top, its edge connector joins it straight to the CPU's address and data lines." },
    { t: "The CPU runs it", focus: "cpu", dist: 0.38, ex: 1, p: ["rom", "cpu", "ram"], n: ["Chips", "CPU Board"], ms: 4200,
      d: "A Sharp LR35902, a cousin of the Z80, at 4.19 MHz, with 8 KB of work RAM and 8 KB of video RAM. It also holds the sound and graphics hardware." },
    { t: "Onto the screen", focus: "lcd", dist: 0.42, ex: 1, p: ["cpu", "lcd"], n: ["LCD", "LCD Board", "Screen Lens"], ms: 4000,
      d: "160 x 144 pixels on a reflective LCD in four shades of grey-green, redrawn 60 times a second. There's no backlight: you play by the light around you." },
    { t: "Your thumbs", focus: "dpad", dist: 0.42, ex: 0, p: ["dpad", "board", "a"], n: ["D-pad", "A Button", "Buttons"], ms: 4000,
      d: "Under each button a carbon pad on a rubber dome closes a contact on the board. The D-pad is one cross that rocks, so you can't press left and right at once." },
    { t: "Sound and power", focus: "batt", dist: 0.45, ex: 1, p: ["batt", "board", "spk"], n: ["AA Batteries", "Speaker"], ms: 4000,
      d: "Four AA cells give about 15 hours. Four sound channels play through the little speaker, or in stereo through the headphone jack." },
  ],
};
const SY = F - 0.56;
const screen = { module: "lens", origin: [SCR.x - SCR.hw, SY, SCR.z - SCR.hh], right: [SCR.x + SCR.hw, SY, SCR.z - SCR.hh], top: [SCR.x - SCR.hw, SY, SCR.z + SCR.hh], cornerRadius: 0.5 };

// ---------- page and gallery ----------
const geometry = geometryScript("GB_GEOMETRY", "gameboy/build.js", { explode, hotspots, tour, screen, constants: { H } });
const model = read(path.join(HERE, "..", "lib", "screen-runtime.js")) + read(path.join(HERE, "model.js"));
const html = buildPage({ template: "spectre", geometry: geometry.js, model, swaps: [
  [/<title>[^<]*<\/title>/, "<title>Game Boy</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the original Nintendo Game Boy standing upright with a Game Pak in its slot: on hover the lens, screen, front shell, buttons, board, batteries and back shell move apart and the cartridge lifts out\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Game Boy</b><span>DMG-01, 1989</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG DMG-01-001 &middot; Rev A<br>Units mm &middot; View az 30&deg; / el 16&deg;<br>Concept page, not affiliated with Nintendo</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "gameboy", label: "Game Boy", kind: "console", tags: "game boy gameboy nintendo dmg handheld 1989 retro tetris cartridge",
  key: "gb-theme", category: "Consoles", html }, "walkman");
console.log(`gameboy/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
