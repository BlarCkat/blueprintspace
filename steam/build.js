/*
Steam Machine: builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm: X across the front, Y back from the front face (the front faces
-Y, towards the default view), Z up; a 152 x 156 x 162 cube with rounded edges. Air comes in through the
removable front panel, a 110 mm fan (a module of its own, based at its hub, so the page can spin it) pushes it
through the fin stack over the processor and out of the back. Under the board: the power supply. The light
strip across the front is animated by lib/screen-runtime.js. The page's chrome and the shared engine come
from the X9 page already in the gallery.

    node steam/build.js

Writes steam/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, squareRing, stripRegion, extrude, rrBody, cyl, revolve, tube,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y
const FX = q => [q[2], q[0], q[1]];   // draws in (y, z) and pushes along x
const HW = 76, HD = 78, H = 162, R = 12, FOOT = 4;   // half width, half depth, height, edge radius, foot height
const FAN = [0, -58, 100], LED = { x: 58, z: 22, h: 1.6 };

const explode = {
  shell: { offset: [0, 0, 190] }, top: { offset: [0, 0, 225] }, front: { offset: [0, -110, 0] }, fan: { offset: [0, -70, 0], base: FAN },
  fanFrame: { offset: [0, -70, 0] }, cooling: { offset: [0, 0, 40] }, board: { offset: [0, 0, 0] }, psu: { offset: [0, 0, -70] },
  rear: { offset: [0, 95, 0] }, ssd: { offset: [60, 0, 20] },
};

// ---------- outside ----------
const shell = part("Shell", "shell", "major");
rrBody(shell, 0, 0, HW, HD, R, [[0, FOOT, true], [0, H - 6], [1.6, H - 2.2], [4.6, H, true]], { seg: 6, bottom: false,
  holes: [[-60, 60, -60, 60]] });
const top = part("Top Grille", "top", "minor");
extrude(top, rect(-60, 60, -60, 60), H - 1.2, H - 0.6);
for (let x = -54; x <= 54; x += 6) loop(top, rrPts(x, 0, 1.4, 54, 1.3, 2).map(q => [...q, H - 0.55]));
const feet = part("Feet", "shell", "minor");
[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => cyl(feet, sx * (HW - 18), sy * (HD - 18), 9, 0, FOOT, 24));
const base = part("Base Plate", "psu", "minor");
rrBody(base, 0, 0, HW - 1, HD - 1, R - 1, [[0, FOOT, true], [0, FOOT + 1.2, true]], { seg: 6 });

const front = part("Front Panel", "front", "major");
withFrame(FY, () => {
  const F = -HD;
  extrude(front, rrRegion(0, (FOOT + H) / 2, HW - 1, (H - FOOT) / 2 - 1, R - 2, 6, [[-LED.x - 1, LED.x + 1, LED.z - LED.h - 1, LED.z + LED.h + 1]]), F - 2.4, F);
  for (let z = 50; z <= 146; z += 8) for (let x = -56 + ((z / 8) % 2) * 4; x <= 56; x += 8) loop(front, circlePts(x, z, 2.2, 10).map(q => [...q, F - 2.45]));   // the intake perforation
});
const led = part("Light Strip", "front", "minor");
withFrame(FY, () => extrude(led, rect(-LED.x, LED.x, LED.z - LED.h, LED.z + LED.h), -HD - 1.8, -HD - 0.6));
const fports = part("Front Ports", "front", "minor");
withFrame(FY, () => {
  const F = -HD - 2.4;
  cyl(fports, HW - 18, 11, 4.2, F - 0.8, F + 0.2, 28);                                      // power
  loop(fports, circlePts(HW - 18, 11, 2.4, 20).map(q => [...q, F - 0.85]));
  [-56, -40].forEach(x => extrude(fports, rrRegion(x, 11, 6.5, 2.6, 0.6, 2), F - 0.2, F + 0.4));   // two USB-A
  extrude(fports, rrRegion(-20, 11, 6, 0.8, 0.6, 2), F - 0.2, F + 0.4);                     // microSD
});

const rear = part("Rear Panel", "rear", "major");
withFrame(q => [-q[0], -q[2], q[1]], () => {   // the back, seen from behind
  const B = -HD;
  extrude(rear, rrRegion(0, (FOOT + H) / 2, HW - 1, (H - FOOT) / 2 - 1, R - 2, 6), B - 1.2, B);
  for (let z = 70; z <= 150; z += 7) for (let x = -58; x <= 58; x += 7) loop(rear, rrPts(x, z, 2.4, 2.4, 0.6, 2).map(q => [...q, B - 1.25]));   // exhaust grille
});
const rports = part("Rear Ports", "rear", "minor");
withFrame(q => [-q[0], -q[2], q[1]], () => {
  const B = -HD - 1.2;
  [[-52, 44, 7, 2.8], [-52, 34, 7, 2.8], [-34, 44, 7, 2.8], [-34, 34, 7, 2.8], [-16, 44, 4.5, 1.6], [0, 44, 8, 3], [0, 32, 9.5, 3.4], [22, 40, 8, 6.5], [50, 22, 10, 7]]
    .forEach(([x, z, w, h]) => extrude(rports, rrRegion(x, z, w, h, 0.8, 2), B - 0.4, B + 0.2));   // USB-A x4, USB-C, HDMI, DisplayPort, Ethernet, power
});

// ---------- the fan and its frame ----------
const fanFrame = part("Fan Frame", "fanFrame", "minor");
withFrame(FY, () => {
  extrude(fanFrame, squareRing(FAN[0], FAN[2], 55, 52, 64), FAN[1] - 13, FAN[1] + 13);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => loop(fanFrame, circlePts(FAN[0] + sx * 48, FAN[2] + sz * 48, 2.2, 10).map(q => [...q, FAN[1] - 13.05])));
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; extrude(fanFrame, stripRegion([[FAN[0] + 18 * Math.cos(a - 0.05), FAN[2] + 18 * Math.sin(a - 0.05)], [FAN[0] + 52 * Math.cos(a - 0.03), FAN[2] + 52 * Math.sin(a - 0.03)]], [[FAN[0] + 18 * Math.cos(a + 0.05), FAN[2] + 18 * Math.sin(a + 0.05)], [FAN[0] + 52 * Math.cos(a + 0.03), FAN[2] + 52 * Math.sin(a + 0.03)]]), FAN[1] + 10, FAN[1] + 12); }   // struts
  cyl(fanFrame, FAN[0], FAN[2], 19, FAN[1] + 9, FAN[1] + 12, 32);                                                                                    // motor mount
});
const fan = part("Fan", "fan", "minor", { spool: "fan" });
withFrame(FY, () => {
  revolve(fan, 0, 0, [[0, -11], [19, -11, true], [20, -9], [20, 8, true], [0, 8]], 36);
  for (let k = 0; k < 9; k++) {
    const lead = [], trail = [];
    for (let i = 0; i <= 6; i++) {
      const r = 20 + 31 * i / 6, a = 2 * Math.PI * k / 9 + 0.6 * i / 6, w = 0.34 + 0.16 * i / 6;
      lead.push([r * Math.cos(a), r * Math.sin(a)]); trail.push([r * Math.cos(a - w), r * Math.sin(a - w)]);
    }
    extrude(fan, stripRegion(lead, trail), -7, 6);
  }
});

// ---------- inside: board, processor, cooling, power ----------
const BZ = 42;   // the board's top face
const board = part("Mainboard", "board", "major");
extrude(board, rrRegion(0, 4, 70, 70, 4, 3), BZ - 1.6, BZ);
[[-64, -62], [64, -62], [64, 70], [-64, 70]].forEach(([x, y]) => loop(board, circlePts(x, y, 1.6, 10).map(q => [...q, BZ + 0.05])));
const apu = part("AMD Processor", "board", "major");
extrude(apu, rrRegion(0, -6, 22, 18, 1, 2), BZ, BZ + 1.4);
extrude(apu, rrRegion(-8, -6, 7, 8, 0.4, 2), BZ + 1.4, BZ + 2.2);                          // CPU die (6 Zen 4 cores)
extrude(apu, rrRegion(9, -6, 9, 10, 0.4, 2), BZ + 1.4, BZ + 2.2);                          // GPU die (28 RDNA 3 units)
const vram = part("Memory", "board", "minor");
[[-32, -26], [-32, 14], [32, -26], [32, 14]].forEach(([x, y]) => extrude(vram, rrRegion(x, y, 6, 7, 0.5, 2), BZ, BZ + 1.2));   // 8 GB GDDR6
[0, 5].forEach(dz => {   // 16 GB DDR5 on two SO-DIMMs, stacked flat behind the fins
  extrude(vram, rect(-36, 33, 53, 70), BZ + dz, BZ + dz + 1.2);
  for (let i = 0; i < 4; i++) extrude(vram, rrRegion(-26 + i * 16, 61.5, 5.5, 5, 0.4, 2), BZ + dz + 1.2, BZ + dz + 2);
});
const vrm = part("Power Stages", "board", "minor");
for (let i = 0; i < 8; i++) extrude(vrm, rrRegion(-28 + i * 8, -44, 3, 3, 0.4, 2), BZ, BZ + 2.4);
for (let i = 0; i < 6; i++) cyl(vrm, -24 + i * 9.6, -54, 3, BZ, BZ + 6, 16);                 // chokes and capacitors
const ssd = part("SSD", "ssd", "minor");
extrude(ssd, rect(30, 66, -66, -54), BZ, BZ + 1.4);
extrude(ssd, rrRegion(40, -60, 6, 5, 0.4, 2), BZ + 1.4, BZ + 2.4);
extrude(ssd, rrRegion(56, -60, 5, 5, 0.4, 2), BZ + 1.4, BZ + 2.4);
const wifi = part("Wi-Fi Card", "board", "minor");
extrude(wifi, rect(-66, -42, 46, 68), BZ, BZ + 1.2);
tube(wifi, [[-60, 66, BZ + 1.2], [-60, 72, BZ + 20], [-66, 74, H - 30]], 0.6, 6);
tube(wifi, [[-50, 66, BZ + 1.2], [-48, 72, BZ + 26], [62, 74, H - 30]], 0.6, 6);
const plate = part("Cold Plate", "cooling", "minor");
extrude(plate, rrRegion(0, -6, 24, 20, 1.5, 2), BZ + 2.2, BZ + 6);
const pipes = part("Heat Pipes", "cooling", "minor");
[-12, -4, 4, 12].forEach((x, i) => tube(pipes, [[x, -18, BZ + 4.5], [x, 4, BZ + 4.5], [x, 18, BZ + 14], [x * 3.4, 22, BZ + 30], [x * 3.4, 22, H - 18]], 3, 10));
const fins = part("Fin Stack", "cooling", "major");
for (let z = BZ + 10; z <= H - 18; z += 3.2) extrude(fins, rect(-58, 58, -44, 50), z, z + 0.4, { wallIf: () => true });
withFrame(FX, () => [-1, 1].forEach(s => extrude(fins, rect(-44, 50, BZ + 9, H - 17), s * 58, s * 58 + s * 0.8)));
const psu = part("Power Supply", "psu", "major");
rrBody(psu, 0, 4, 70, 70, 4, [[0, FOOT + 1.4, true], [0, BZ - 4, true]], { seg: 3 });
for (let x = -60; x <= 60; x += 12) line(psu, [x, -64, BZ - 3.95], [x, 72, BZ - 3.95]);
extrude(psu, rrRegion(-40, 20, 12, 10, 1, 2), BZ - 4, BZ - 2);   // the cable up to the board
const chassis = part("Chassis", "board", "minor");
[-1, 1].forEach(s => withFrame(FX, () => extrude(chassis, rect(-74, 76, FOOT + 2, H - 10), s * 72 - 0.8, s * 72 + 0.8, { wallIf: () => true })));

// ---------- callouts and the tour ----------
const local = (name, p) => r3(name === "Fan" ? p.map((c, i) => c - FAN[i]) : p);
const hotspots = [
  ["Light strip", "Status, downloads, ambient glow", [40, -HD - 1.8, LED.z], ["Light Strip", "Front Panel"]],
  ["Front panel", "Swappable, held on by magnets", [-40, -HD - 2.4, 120], ["Front Panel"]],
  ["110 mm fan", "Big, slow and quiet", [30, -66, 124], ["Fan", "Fan Frame"]],
  ["Fin stack", "Over the processor", [0, 0, H - 18], ["Fin Stack", "Heat Pipes"]],
  ["AMD processor", "Zen 4 CPU, RDNA 3 GPU", [9, -6, BZ + 2.2], ["AMD Processor", "Mainboard"]],
  ["GDDR6", "8 GB for graphics", [32, 14, BZ + 1.2], ["Memory"]],
  ["DDR5", "16 GB system memory", [6, 61.5, BZ + 7], ["Memory"]],
  ["NVMe SSD", "512 GB or 2 TB", [48, -60, BZ + 2.4], ["SSD"]],
  ["Power supply", "Built in, no brick", [0, -66, 30], ["Power Supply"]],
  ["Rear I/O", "DisplayPort, HDMI, USB, Ethernet", [0, HD + 1.6, 44], ["Rear Ports", "Rear Panel"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    inlet: pt("Front Panel", [0, -HD - 40, 100]), face: pt("Front Panel", [0, -HD - 2.4, 100]), fan: pt("Fan", FAN), fins: pt("Fin Stack", [0, 0, 110]),
    out: pt("Rear Panel", [0, HD + 40, 110]), back: pt("Rear Panel", [0, HD + 1.2, 110]), apu: pt("AMD Processor", [0, -6, BZ + 2.2]),
    plate: pt("Cold Plate", [0, -6, BZ + 6]), pipe: pt("Heat Pipes", [0, 18, BZ + 14]), mem: pt("Memory", [32, 14, BZ + 1.2]),
    ssd: pt("SSD", [48, -60, BZ + 2.4]), psu: pt("Power Supply", [0, 0, BZ - 4]), led: pt("Light Strip", [0, -HD - 1.8, LED.z]),
  },
  steps: [
    { t: "Air in at the front", focus: "fan", dist: 0.5, ex: 1, p: ["inlet", "face", "fan"], n: ["Front Panel", "Fan", "Fan Frame"], ms: 4200,
      d: "The fan draws cool air in through the perforated front panel. At 110 mm it can turn slowly and still move a lot of air, so the machine stays quiet." },
    { t: "Through the fins, out the back", focus: "fins", dist: 0.5, ex: 1, p: ["fan", "fins", "back", "out"], n: ["Fin Stack", "Rear Panel"], ms: 4400,
      d: "It blows straight through the tall fin stack and leaves through the grille in the back. One straight path, front to back." },
    { t: "Heat from the chip", focus: "apu", dist: 0.38, ex: 1, p: ["apu", "plate", "pipe", "fins"], n: ["AMD Processor", "Cold Plate", "Heat Pipes"], ms: 4400,
      d: "A copper cold plate sits on the processor; four heat pipes carry its heat up into the fins, where the fan's air takes it away." },
    { t: "CPU, GPU and memory", focus: "apu", dist: 0.36, ex: 1, p: ["apu", "mem", "ssd"], n: ["AMD Processor", "Memory", "SSD"], ms: 4400,
      d: "A semi-custom AMD chip: six Zen 4 CPU cores and an RDNA 3 GPU with 28 compute units, its own 8 GB of GDDR6, 16 GB of DDR5 for the system and a fast NVMe SSD." },
    { t: "Power inside", focus: "psu", dist: 0.45, ex: 1, p: ["psu", "apu"], n: ["Power Supply"], ms: 3800,
      d: "The power supply fills the space under the board, so a single cable plugs straight in. No external brick." },
    { t: "The light strip", focus: "led", dist: 0.45, ex: 0, p: ["led"], n: ["Light Strip"], ms: 3800,
      d: "A strip of LEDs across the front shows what it's doing: a sweep while it starts, progress while it downloads, a slow glow when it's idle." },
  ],
};
const ledPanel = { module: "front", origin: [-LED.x, -HD - 1.85, LED.z - LED.h], right: [LED.x, -HD - 1.85, LED.z - LED.h], top: [-LED.x, -HD - 1.85, LED.z + LED.h] };

// ---------- page and gallery ----------
const geometry = geometryScript("STM_GEOMETRY", "steam/build.js", { explode, hotspots, tour, ledPanel, constants: { HW, HD, H } });
const model = read(path.join(HERE, "..", "lib", "screen-runtime.js")) + read(path.join(HERE, "model.js"));
const html = buildPage({ template: "cpu", geometry: geometry.js, model, swaps: [
  [/<title>[^<]*<\/title>/, "<title>Steam Machine</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the Steam Machine with its fan turning and light strip glowing: on hover the shell lifts, the front panel and fan come forward, the back comes off and the fin stack, board and power supply move apart\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Console parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Steam Machine</b><span>Console</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG STM-001 &middot; Rev A<br>Units mm &middot; View az 40&deg; / el 22&deg;<br>Concept page, not affiliated with Valve</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "steam", label: "Steam Machine", kind: "console", tags: "steam machine valve console pc gaming steamos fan led",
  key: "stm-theme", category: "Consoles", html }, "psp");
console.log(`steam/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
