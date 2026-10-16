/*
PlayStation Portable (PSP-1000): builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm, standing on its bottom edge: X across, Y back from the screen
(the screen faces -Y, towards the default view), Z up; 170 x 74 x 23. The UMD disc is a module of its own, based
at its spindle, so the page can spin it, and the analog nub is based at its centre so it can slide. Layers
from the front: glass and LCD, the front shell with its buttons, the main board, the UMD drive with the battery
beside it, the disc in its caddy, the back shell and the drive door. The page's chrome and the shared engine
come from the Spectre page (the photo-screen button); lib/screen-runtime.js runs the menu on the screen.

    node psp/build.js

Writes psp/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, polyRegion, extrude, rrBody, cyl, revolve, sweep,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y (negative y is towards the viewer)
const HW = 85, H = 74, ZC = H / 2, RE = 33, F = -10.5, B = 11.5;   // half width, height, end radius, front and back faces
const SCR = { hw: 47.7, hh: 27, zc: 40 };
const NUB = [-64, F, 19], DISC = [8, 7.4, ZC];

const explode = {
  display: { offset: [0, -70, 0] }, front: { offset: [0, -40, 0] }, controls: { offset: [0, -55, 0] },
  nub: { offset: [0, -55, 0], base: NUB }, board: { offset: [0, -16, 0] }, drive: { offset: [0, 14, 0] },
  battery: { offset: [-30, 30, 0] }, umd: { offset: [0, 44, 0] }, disc: { offset: [0, 44, 0], base: DISC },
  back: { offset: [0, 70, 0] }, door: { offset: [0, 92, 0] },
};

// ---------- the screen ----------
const glass = part("Screen Glass", "display", "major");
withFrame(FY, () => {
  extrude(glass, rrRegion(0, 39, 54, 31, 4, 4), F - 0.5, F);
  loop(glass, rrPts(0, SCR.zc, SCR.hw, SCR.hh, 0.4, 2).map(q => [...q, F - 0.55]));
});
const lcd = part("LCD", "display", "major");
withFrame(FY, () => {
  extrude(lcd, rrRegion(0, SCR.zc, SCR.hw + 2.5, SCR.hh + 2.5, 1, 2), F + 0.1, F + 2.6);   // panel and backlight
  extrude(lcd, rect(-20, 20, SCR.zc - SCR.hh - 7, SCR.zc - SCR.hh - 2.5), F + 2.6, F + 2.9);   // its flex
});

// ---------- the shells ----------
const front = part("Front Shell", "front", "major");
withFrame(FY, () => rrBody(front, 0, ZC, HW, ZC, RE, [[2.6, F, true], [0.9, F + 0.6], [0, F + 2], [0, 0, true]], { seg: 10, top: false }));
const back = part("Back Shell", "back", "major");
withFrame(FY, () => rrBody(back, 0, ZC, HW, ZC, RE, [[0, 0, true], [0, B - 4], [1.2, B - 1.2], [3.6, B, true]], { seg: 10, bottom: false }));
const edges = part("Edge Ports", "back", "minor");
{
  extrude(edges, rrRegion(0, 1.5, 4, 1.3, 1.2, 3), H - 0.4, H + 0.05);                       // mini USB on the top
  extrude(edges, rrRegion(-26, 0, 5, 2.4, 1.2, 3), H - 0.6, H + 0.05);                       // IR port
  loop(edges, circlePts(30, 0, 1.6, 12).map(q => [...q, -0.05]));                             // headphone and remote socket on the bottom
  extrude(edges, rrRegion(-20, 1, 9, 2.2, 1.6, 3), -0.6, 0.05);                              // DC in
  withFrame(q => [q[2], q[0], q[1]], () => {                                                   // the sides: the WLAN switch on the left, power and hold on the right
    extrude(edges, rrRegion(-1, 42, 1.6, 3, 1.4, 2), -HW - 0.6, -HW + 1.2);
    extrude(edges, rrRegion(-1, 32, 2, 5, 1.8, 2), HW - 1.6, HW + 0.8);
  });
}
const stick = part("Memory Stick Slot", "back", "minor");
withFrame(FY, () => extrude(stick, rrRegion(-38, 8, 14, 2, 1, 2), B - 1.6, B - 0.6));

// ---------- the controls ----------
const ctl = part("Buttons", "controls", "minor");
withFrame(FY, () => {
  const Z = F - 1.1;
  // the direction pad: four separate keys in a cross
  [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([dx, dz]) => {
    const c = [-64 + dx * 7.5, 46 + dz * 7.5], a = Math.atan2(dz, dx);
    const P = (u, v) => [c[0] + u * Math.cos(a) - v * Math.sin(a), c[1] + u * Math.sin(a) + v * Math.cos(a)];
    extrude(ctl, polyRegion([P(-3.2, -3.4), P(4.2, -3.4), P(5.2, 0), P(4.2, 3.4), P(-3.2, 3.4)]), Z, F);
    loop(ctl, [P(1.6, 0), P(-0.8, 1.4), P(-0.8, -1.4)].map(q => [...q, Z - 0.05]));
  });
  // triangle, circle, cross, square
  [[0, 9], [9, 0], [0, -9], [-9, 0]].forEach(([dx, dz], k) => {
    const c = [64 + dx, 46 + dz];
    cyl(ctl, c[0], c[1], 4.2, Z - 0.3, F, 24);
    const S = Z - 0.35, s = 1.9;
    if (k === 0) loop(ctl, [0, 1, 2].map(i => [c[0] + s * Math.cos(Math.PI / 2 + i * 2.094), c[1] + s * Math.sin(Math.PI / 2 + i * 2.094), S]));
    if (k === 1) loop(ctl, circlePts(c[0], c[1], s, 14).map(q => [...q, S]));
    if (k === 2) { line(ctl, [c[0] - s, c[1] - s, S], [c[0] + s, c[1] + s, S]); line(ctl, [c[0] - s, c[1] + s, S], [c[0] + s, c[1] - s, S]); }
    if (k === 3) loop(ctl, rrPts(c[0], c[1], s * 0.85, s * 0.85, 0, 1).map(q => [...q, S]));
  });
  // the row under the screen: home, volume, display, sound, select, start
  [[-44, 6, "home"], [-24, 3.4], [-14, 3.4], [-2, 3.4], [8, 3.4], [30, 4.2], [42, 4.2]].forEach(([x, w]) => extrude(ctl, rrRegion(x, 4.6, w, 1.5, 1.4, 3), F - 0.5, F + 0.2));
  // speakers either side of the bottom row
  [-1, 1].forEach(s => { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) loop(ctl, circlePts(s * (62 + i * 3.2), 4.6 + j * 3, 0.8, 8).map(q => [...q, F - 0.05])); });
  // L and R round the top corners
  [-1, 1].forEach(s => {
    const cc = [s * (HW - RE), H - RE], pts = [[s * (HW - RE - 22), H + 0.2], ...Array.from({ length: 9 }, (_, i) => {
      const a = Math.PI / 2 - s * (Math.PI * 0.32) * i / 8;
      return [cc[0] + (RE + 0.2) * Math.cos(a), cc[1] + (RE + 0.2) * Math.sin(a)];
    })];
    if (s > 0) pts.reverse();
    sweep(ctl, pts.map(q => [q[0], q[1], F + 1.6]), [[0, 0], [-2.4, 0], [-2.4, 6.5], [0, 6.5]]);
  });
});
const nub = part("Analog Nub", "nub", "minor", { spool: "nub" });
withFrame(FY, () => revolve(nub, 0, 0, [[0, -1.6], [8.6, -1.6, true], [9, -0.9], [8.6, -0.3, true], [0, -0.6]], 32));
const well = part("Nub Well", "front", "minor");
withFrame(FY, () => { loop(well, circlePts(NUB[0], NUB[2], 12, 40).map(q => [...q, F - 0.05])); loop(well, circlePts(NUB[0], NUB[2], 10.5, 40).map(q => [...q, F + 0.3])); });

// ---------- inside ----------
const board = part("Main Board", "board", "major");
withFrame(FY, () => {
  extrude(board, rrRegion(0, ZC, 74, 31, 16, 4, []), -3.6, -2.6);
  [[-60, 10], [60, 10], [-60, 64], [60, 64]].forEach(([x, z]) => loop(board, circlePts(x, z, 1.4, 10).map(q => [...q, -2.55])));
});
const cpu = part("CPU", "board", "major");
withFrame(FY, () => { extrude(cpu, rrRegion(-14, 40, 10, 10, 0.8, 2), -2.6, -1.4); loop(cpu, rrPts(-14, 40, 6, 6, 0.4, 2).map(q => [...q, -1.35])); });
const chips = part("Memory and Chips", "board", "minor");
withFrame(FY, () => {
  extrude(chips, rrRegion(12, 44, 7, 6, 0.6, 2), -2.6, -1.6);           // 32 MB main memory
  extrude(chips, rrRegion(12, 26, 5, 5, 0.5, 2), -2.6, -1.8);           // flash
  extrude(chips, rrRegion(-38, 30, 5, 4, 0.5, 2), -2.6, -1.8);          // power management
  extrude(chips, rrRegion(-38, 50, 4.5, 4.5, 0.5, 2), -2.6, -1.8);      // audio codec
});
const wifi = part("Wi-Fi Module", "board", "minor");
withFrame(FY, () => { extrude(wifi, rrRegion(48, 56, 10, 7, 0.8, 2), -2.6, -1.2); line(wifi, [40, 56, -1.15], [56, 56, -1.15]); });
const drive = part("UMD Drive", "drive", "major");
withFrame(FY, () => {
  extrude(drive, rrRegion(8, ZC, 37, 30, 8, 3, [[-12, 28, 30, 44]]), -1.2, 4.6);              // the drive's tray
  cyl(drive, DISC[0], DISC[2], 5, 4.6, 6.2, 24);                                           // spindle motor
  extrude(drive, rect(16, 40, 33, 41), 4.6, 5.6);                                          // the laser sled on its rail
  line(drive, [12, 37, 5.65], [44, 37, 5.65]);
});
const battery = part("Battery", "battery", "major");
withFrame(FY, () => extrude(battery, rrRegion(-58, ZC, 12, 22, 6, 3), -1.2, 8.6));
const caddy = part("UMD Caddy", "umd", "major");
withFrame(FY, () => {
  const pts = [[-24, -30], [24, -30], [27, -27], [27, 26], [20, 33], [-20, 33], [-27, 26], [-27, -27]].map(([x, z]) => [DISC[0] + x, DISC[2] + z]);
  extrude(caddy, polyRegion(pts), 6.2, 6.6);
  extrude(caddy, polyRegion(pts), 9.4, 9.8);
  loop(caddy, circlePts(DISC[0], DISC[2], 23, 40).map(q => [...q, 9.85]));                     // the window on its back
});
const disc = part("UMD Disc", "disc", "minor", { spool: "disc" });
withFrame(FY, () => {
  revolve(disc, 0, 0, [[3, -0.6], [30, -0.6, true], [30, 0.6, true], [3, 0.6]], 64, true);
  for (let k = 0; k < 6; k++) loop(disc, circlePts(0, 0, 9 + k * 3.6, 48).map(q => [...q, -0.65]));   // data rings
});
const door = part("UMD Door", "door", "major");
withFrame(FY, () => {
  extrude(door, rrRegion(DISC[0], DISC[2], 33, 32, 16, 4), B, B + 0.8);
  loop(door, circlePts(DISC[0], DISC[2], 24, 48).map(q => [...q, B + 0.85]));                  // the window you see the disc through
  extrude(door, rrRegion(DISC[0] + 33, DISC[2], 1.4, 6, 1.2, 2), B, B + 1.6);                // the OPEN latch
});
const battDoor = part("Battery Cover", "back", "minor");
withFrame(FY, () => { loop(battDoor, rrPts(-58, ZC, 14, 24, 8, 4).map(q => [...q, B + 0.05])); extrude(battDoor, rrRegion(-58, 56, 3, 1.4, 1.2, 2), B, B + 0.8); });

// ---------- callouts and the tour ----------
const BASED = { "UMD Disc": DISC, "Analog Nub": NUB };
const local = (name, p) => r3(BASED[name] ? p.map((c, i) => c - BASED[name][i]) : p);
const hotspots = [
  ["4.3-inch LCD", "480 x 272, widescreen", [-30, F - 0.6, 56], ["Screen Glass", "LCD"]],
  ["Direction pad", "Four separate keys", [-64, F - 1.1, 46], ["Buttons"]],
  ["Face buttons", "Triangle, circle, cross, square", [64, F - 1.4, 55], ["Buttons"]],
  ["Analog nub", "Slides, doesn't tilt", [-64, F - 1.6, 19], ["Analog Nub"]],
  ["L and R", "Shoulder buttons round the top", [-60, F + 4, H + 2], ["Buttons"]],
  ["CPU", "MIPS R4000, up to 333 MHz", [-14, -1.4, 40], ["CPU", "Main Board"]],
  ["UMD drive", "Optical, 1.8 GB discs", [28, 5.6, 37], ["UMD Drive"]],
  ["UMD disc", "60 mm in a plastic caddy", [8, 0.6, 52], ["UMD Disc", "UMD Caddy"]],
  ["Battery", "1800 mAh lithium-ion", [-58, 8.6, 50], ["Battery", "Battery Cover"]],
  ["Wi-Fi", "802.11b, ad hoc play", [48, -1.2, 56], ["Wi-Fi Module"]],
  ["Memory Stick slot", "Saves, music and photos", [-38, B - 0.6, 8], ["Memory Stick Slot"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    disc: pt("UMD Disc", DISC), spindle: pt("UMD Drive", [8, 6.2, ZC]), sled: pt("UMD Drive", [28, 5.6, 37]), cpu: pt("CPU", [-14, -1.4, 40]),
    ram: pt("Memory and Chips", [12, -1.6, 44]), lcd: pt("LCD", [0, F, 40]), nub: pt("Analog Nub", [-64, F - 1.6, 19]), pad: pt("Buttons", [64, F - 1.4, 46]),
    batt: pt("Battery", [-58, 8.6, 37]), wifi: pt("Wi-Fi Module", [48, -1.2, 56]), air: pt("Wi-Fi Module", [80, -40, 90]),
  },
  steps: [
    { t: "The disc spins up", focus: "disc", dist: 0.45, ex: 1, p: ["disc", "spindle", "sled"], n: ["UMD Disc", "UMD Caddy", "UMD Drive"], ms: 4200,
      d: "A UMD is a 60 mm optical disc sealed in a plastic caddy. The spindle motor spins it and a laser on a sled reads up to 1.8 GB from it." },
    { t: "Into the processor", focus: "cpu", dist: 0.38, ex: 1, p: ["sled", "cpu", "ram", "cpu"], n: ["CPU", "Memory and Chips", "Main Board"], ms: 4400,
      d: "The main chip holds a MIPS CPU (333 MHz at most), a Media Engine for video and sound, and a graphics core, working from 32 MB of memory." },
    { t: "Onto the screen", focus: "lcd", dist: 0.45, ex: 1, p: ["cpu", "lcd"], n: ["LCD", "Screen Glass"], ms: 3800,
      d: "A 4.3-inch widescreen LCD, 480 x 272, lit from behind. In 2004 nothing handheld looked like it." },
    { t: "Your thumbs", focus: "nub", dist: 0.42, ex: 0, p: ["nub", "pad"], n: ["Analog Nub", "Buttons"], ms: 4000,
      d: "The analog nub slides sideways instead of tilting, so it stays flat. The four direction keys and the four face buttons are on either side of the screen." },
    { t: "Battery and Wi-Fi", focus: "batt", dist: 0.48, ex: 1, p: ["batt", "cpu", "wifi", "air"], n: ["Battery", "Wi-Fi Module"], ms: 4200,
      d: "An 1800 mAh battery sits beside the drive. Built-in Wi-Fi lets several PSPs play together with no router at all." },
  ],
};
const SY = F - 0.56;   // just in front of the glass
const screen = { module: "display", origin: [-SCR.hw, SY, SCR.zc - SCR.hh], right: [SCR.hw, SY, SCR.zc - SCR.hh], top: [-SCR.hw, SY, SCR.zc + SCR.hh], cornerRadius: 0.4 };

// ---------- page and gallery ----------
const geometry = geometryScript("PSP_GEOMETRY", "psp/build.js", { explode, hotspots, tour, screen, constants: { HW, H } });
const model = read(path.join(HERE, "..", "lib", "screen-runtime.js")) + read(path.join(HERE, "model.js"));
const html = buildPage({ template: "spectre", geometry: geometry.js, model, swaps: [
  [/<title>[^<]*<\/title>/, "<title>PlayStation Portable</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the PlayStation Portable (PSP-1000): on hover the screen, front shell, buttons, board, UMD drive, battery, disc and back shell move apart\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>PlayStation Portable</b><span>PSP-1000</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG PSP-1000-001 &middot; Rev A<br>Units mm &middot; View az 35&deg; / el 18&deg;<br>Concept page, not affiliated with Sony</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "psp", label: "PlayStation Portable", kind: "console", tags: "psp playstation portable sony handheld umd 2004 games",
  key: "psp-theme", category: "Consoles", html }, "switch");
console.log(`psp/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
