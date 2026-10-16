/*
Custom gaming PC: builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm: an ATX mid-tower, X across (the tempered glass side is at +X,
facing the default view), Y back from the front (the front faces -Y), Z up; 230 x 470 x 480. Inside: the
motherboard on the far wall with the CPU under an AIO pump, four DIMMs, an M.2 drive and the triple-fan graphics
card; the 360 mm radiator and its three fans in the roof, three intake fans behind the mesh front and an exhaust
fan at the back; the power supply under its shroud. Every fan is a module of its own, based at its hub, so the
page can spin it. The page's chrome and the shared engine come from the X9 page already in the gallery.

    node gamingpc/build.js

Writes gamingpc/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, squareRing, stripRegion, extrude, rrBody, cyl, revolve, tube,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y
const FX = q => [q[2], q[0], q[1]];   // draws in (y, z) and pushes along x
const HW = 115, HD = 235, H = 480, FOOT = 12;
const MB = -104.4;                     // the motherboard's face
const CPU = [MB, 130, 360];
const GPU = { x0: -96, x1: 44, y0: -103, y1: 233, z0: 228, z1: 288 };
const RAD = { x: 15, z0: 440, z1: 467 };

const FANS = [
  ...[135, 255, 375].map((z, i) => ({ id: "front" + (i + 1), c: [0, -210, z], axis: "y", size: 120, mod: "frontFans", label: "Front Fan " + (i + 1) })),
  ...[-130, 0, 130].map((y, i) => ({ id: "top" + (i + 1), c: [RAD.x, y, 427], axis: "z", size: 120, mod: "topFans", label: "Radiator Fan " + (i + 1) })),
  { id: "rear", c: [20, 220, 360], axis: "y", size: 120, mod: "rearFan", label: "Rear Fan" },
  ...[-45, 65, 175].map((y, i) => ({ id: "gpu" + (i + 1), c: [-26, y, GPU.z0 - 4], axis: "z", size: 96, mod: "gpu", label: "GPU Fan " + (i + 1), bare: true })),
];
const GROUP = { frontFans: [0, -110, 0], topFans: [0, 0, 95], rearFan: [0, 110, 0], gpu: [190, 0, -70] };

const explode = {
  glass: { offset: [280, 0, 0] }, case: { offset: [0, 0, 0] }, front: { offset: [0, -170, 0] }, shroud: { offset: [120, 0, -50] },
  psu: { offset: [0, 170, -40] }, board: { offset: [40, 0, 0] }, cpu: { offset: [75, 0, 0] }, ram: { offset: [100, -20, 40] },
  pump: { offset: [130, 0, 30] }, gpu: { offset: GROUP.gpu }, radiator: { offset: [0, 0, 150] }, cables: { offset: [60, 0, -30] },
};
FANS.forEach(f => { explode["fan_" + f.id] = { offset: GROUP[f.mod], base: f.c }; });

// ---------- the case ----------
const frame = part("Case", "case", "major");
withFrame(FX, () => extrude(frame, rect(-HD, HD, FOOT, H), -HW, -HW + 1.6));                                                   // far wall
extrude(frame, rrRegion(0, 0, HW, HD, 3, 3, [[-48, 78, -205, 205]]), H - 2, H);                                                   // roof, open over the radiator
for (let y = -200; y <= 200; y += 10) line(frame, [-48, y, H + 0.05], [78, y, H + 0.05]);                                        // its dust filter
extrude(frame, rrRegion(0, 0, HW, HD, 3, 3), FOOT, FOOT + 2);                                                                     // floor
withFrame(FY, () => extrude(frame, rect(-HW, HW, FOOT, H), HD - 2, HD, { }));
const rearHoles = part("Rear Panel", "case", "minor");
withFrame(FY, () => {
  const Y = HD + 0.05;
  loop(rearHoles, rrPts(-77, 418, 25, 26, 1, 2).map(q => [...q, Y]));                                                           // I/O shield opening
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) loop(rearHoles, circlePts(-36 + c * 8 + (r % 2) * 4, 304 + r * 8 + 0, 2.6, 8).map(q => [...q, Y]));   // fan grille (rear fan behind it)
  for (let i = 0; i < 7; i++) { extrude(rearHoles, rect(-90, 40, 140 + i * 20.3, 154 + i * 20.3), HD, HD + 1); line(rearHoles, [-86, 147 + i * 20.3, HD + 1.05], [36, 147 + i * 20.3, HD + 1.05]); }   // slot covers
  loop(rearHoles, rrPts(-25, 58, 75, 43, 2, 2).map(q => [...q, Y]));                                                            // the PSU's opening
});
const frontFrame = part("Front Frame", "case", "minor");
withFrame(FY, () => extrude(frontFrame, rrRegion(0, (FOOT + H) / 2, HW, (H - FOOT) / 2, 2, 3, [[-100, 100, 30, H - 14]]), -HD, -HD + 2));
const feet = part("Feet", "case", "minor");
[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => rrBody(feet, sx * (HW - 25), sy * (HD - 35), 18, 28, 4, [[0, 0, true], [0, FOOT, true]], { seg: 3 }));

const glass = part("Glass Side Panel", "glass", "major");
{
  // tempered glass: only its edges and the black print round them are drawn, so you see straight through
  withFrame(FX, () => {
    loop(glass, rrPts(0, (FOOT + H) / 2, HD - 2, (H - FOOT) / 2 - 2, 3, 3).map(q => [...q, HW + 4]));
    loop(glass, rrPts(0, (FOOT + H) / 2, HD - 2, (H - FOOT) / 2 - 2, 3, 3).map(q => [...q, HW]));
    loop(glass, rrPts(0, (FOOT + H) / 2, HD - 14, (H - FOOT) / 2 - 14, 2, 3).map(q => [...q, HW + 4.05]));
    [[-HD + 10, FOOT + 10], [HD - 10, FOOT + 10], [HD - 10, H - 10], [-HD + 10, H - 10]].forEach(([y, z]) => cyl(glass, y, z, 5, HW + 4, HW + 7, 16));   // thumbscrews
  });
}
const front = part("Mesh Front", "front", "major");
withFrame(FY, () => {
  extrude(front, rrRegion(0, (FOOT + H) / 2, HW, (H - FOOT) / 2, 6, 4, [[-96, 96, 34, H - 18]]), -HD - 8, -HD - 2);
  for (let x = -90; x <= 90; x += 9) line(front, [x, 34, -HD - 5], [x, H - 18, -HD - 5]);
  for (let z = 40; z <= H - 20; z += 9) line(front, [-96, z, -HD - 5], [96, z, -HD - 5]);
  cyl(front, 80, H - 8, 4, -HD - 9, -HD - 8, 20);                                                                            // power button
  [55, 40].forEach(x => extrude(front, rrRegion(x, H - 8, 6, 2.4, 0.6, 2), -HD - 8.6, -HD - 8));                          // USB on top of the front
});

// ---------- power supply and its shroud ----------
const shroud = part("PSU Shroud", "shroud", "major");
extrude(shroud, rect(-HW + 2, HW - 2, -180, HD - 2), 108, 110, {});
withFrame(FY, () => extrude(shroud, rect(-HW + 2, HW - 2, FOOT + 2, 108), -182, -180));
withFrame(FX, () => { extrude(shroud, rect(-180, HD - 2, FOOT + 2, 108), HW - 4, HW - 2); loop(shroud, rrPts(30, 61, 70, 26, 4, 3).map(q => [...q, HW - 1.95])); });   // its window
const psu = part("Power Supply", "psu", "major");
rrBody(psu, -25, 150, 75, 80, 3, [[0, FOOT + 4, true], [0, 102, true]], { seg: 3 });
loop(psu, circlePts(-25, 150, 60, 48).map(q => [...q, FOOT + 3.95]));
for (let k = 0; k < 5; k++) loop(psu, circlePts(-25, 150, 12 * k + 8, 32).map(q => [...q, FOOT + 3.9]));
withFrame(FY, () => { extrude(psu, rrRegion(10, 40, 15, 9, 1, 2), 230, 231); for (let x = -90; x <= 40; x += 6) line(psu, [x, 70, 231], [x, 96, 231]); });   // power socket, rear grille

// ---------- the motherboard and what's on it ----------
const board = part("Motherboard", "board", "major");
withFrame(FX, () => {
  extrude(board, rect(-11, 233, 145, 450), MB - 1.6, MB);
  [[-5, 150], [-5, 445], [228, 150], [228, 445], [110, 445], [110, 150]].forEach(([y, z]) => loop(board, circlePts(y, z, 2, 10).map(q => [...q, MB + 0.05])));
});
const io = part("I/O Shield", "board", "minor");
withFrame(FX, () => extrude(io, rect(195, 233, 392, 444), MB, MB + 48));
const vrm = part("VRM Heatsinks", "board", "minor");
withFrame(FX, () => {
  extrude(vrm, rrRegion(140, 410, 46, 9, 2, 2), MB, MB + 22);
  extrude(vrm, rrRegion(176, 352, 9, 38, 2, 2), MB, MB + 22);
  for (let y = 98; y <= 182; y += 6) line(vrm, [y, 419, MB + 22.05], [y, 401, MB + 22.05]);
});
const sock = part("CPU", "cpu", "major");
withFrame(FX, () => {
  extrude(sock, rect(CPU[1] - 26, CPU[1] + 26, CPU[2] - 30, CPU[2] + 30), MB, MB + 3);                                   // socket and its load plate
  extrude(sock, rrRegion(CPU[1], CPU[2], 18.8, 18.8, 1.5, 2), MB + 3, MB + 6);                                             // the heat spreader
});
const ram = part("Memory", "ram", "major");
withFrame(FX, () => [62, 71, 80, 89].forEach(y => {
  extrude(ram, rect(y - 3.4, y + 3.4, 298, 436), MB, MB + 40);
  loop(ram, rrPts(y, 367, 3.45, 68, 0, 1).map(q => [...q, MB + 40.05]));
  line(ram, [y, 300, MB + 34], [y, 434, MB + 34]);                                                                        // the light bar on top
}));
const m2 = part("M.2 SSD", "board", "minor");
withFrame(FX, () => { extrude(m2, rrRegion(85, 204, 55, 9, 2, 2), MB, MB + 8); for (let y = 36; y <= 134; y += 7) line(m2, [y, 197, MB + 8.05], [y, 211, MB + 8.05]); });
const chipset = part("Chipset", "board", "minor");
withFrame(FX, () => { extrude(chipset, rrRegion(25, 172, 22, 20, 3, 3), MB, MB + 10); loop(chipset, circlePts(25, 172, 10, 24).map(q => [...q, MB + 10.05])); });
const slots = part("PCIe Slots", "board", "minor");
withFrame(FX, () => { extrude(slots, rect(60, 150, 286, 293), MB, MB + 9); extrude(slots, rect(60, 150, 172, 178), MB, MB + 9); });
withFrame(FX, () => extrude(slots, rect(-8, 0, 330, 382), MB, MB + 14));   // the 24-pin power socket on the front edge

// ---------- the AIO: pump on the CPU, hoses to the radiator ----------
const pump = part("AIO Pump", "pump", "major");
withFrame(FX, () => {
  revolve(pump, CPU[1], CPU[2], [[0, MB + 6], [34, MB + 6, true], [35, MB + 10], [35, MB + 40, true], [31, MB + 46, true], [0, MB + 46]], 48);
  loop(pump, circlePts(CPU[1], CPU[2], 26, 48).map(q => [...q, MB + 46.1]));                                                  // the screen on its cap
  loop(pump, circlePts(CPU[1], CPU[2], 18, 48).map(q => [...q, MB + 46.1]));
});
const hoses = part("Hoses", "pump", "minor");
[[0, 0], [16, -12]].forEach(([dx, dz]) => tube(hoses, [[MB + 30 + dx * 0.5, CPU[1] + 34, CPU[2] + 10 + dz], [MB + 36 + dx * 0.5, CPU[1] + 56, CPU[2] + 30 + dz],
  [-50 + dx, 120, 410], [-20 + dx, -60, 420], [-10 + dx, -180, 436], [-6 + dx, -196, 446]], 6, 12));

// ---------- the radiator in the roof ----------
const rad = part("Radiator", "radiator", "major");
rrBody(rad, RAD.x, 0, 60, 178, 2, [[0, RAD.z0, true], [0, RAD.z1, true]], { seg: 2 });
for (let y = -170; y <= 170; y += 4) { line(rad, [RAD.x - 59, y, RAD.z0 - 0.05], [RAD.x + 59, y, RAD.z0 - 0.05]); }
[-1, 1].forEach(s => rrBody(rad, RAD.x, s * 189, 60, 11, 3, [[0, RAD.z0 - 2, true], [0, RAD.z1 + 2, true]], { seg: 3 }));   // the end tanks
[[0, 0], [16, -12]].forEach(([dx]) => cyl(rad, -6 + dx, -196, 7, RAD.z0 - 8, RAD.z0, 16));                                 // hose fittings

// ---------- the graphics card ----------
const gpu = part("Graphics Card", "gpu", "major");
{
  const cx = (GPU.x0 + GPU.x1) / 2, cy = (GPU.y0 + GPU.y1) / 2, hw = (GPU.x1 - GPU.x0) / 2, hd = (GPU.y1 - GPU.y0) / 2;
  // the shroud, built top-down so its open face (with the fan holes) is underneath
  rrBody(gpu, cx, cy, hw, hd, 6, [[0, GPU.z1, true], [1.5, GPU.z0 + 1.5], [2.5, GPU.z0, true]], { seg: 3,
    holes: FANS.filter(f => f.mod === "gpu").map(f => [f.c[0] - 47, f.c[0] + 47, f.c[1] - 47, f.c[1] + 47]) });
  extrude(gpu, rrRegion(cx, cy, hw - 1, hd - 1, 5, 3), GPU.z1, GPU.z1 + 2);                                                  // backplate
  for (let k = 0; k < 9; k++) line(gpu, [GPU.x0 + 10, GPU.y0 + 20 + k * 30, GPU.z1 + 2.05], [GPU.x1 - 30, GPU.y0 + 32 + k * 30, GPU.z1 + 2.05]);   // its vents
  withFrame(FY, () => extrude(gpu, rect(GPU.x0 - 2, GPU.x1 - 30, GPU.z0 - 2, GPU.z1 + 2), HD - 2, HD));                     // the bracket
  extrude(gpu, rect(GPU.x0 + 4, GPU.x0 + 9, 60, 150), GPU.z1 - 2, GPU.z1);                                                   // the edge connector in its slot
  withFrame(FX, () => { extrude(gpu, rrRegion(110, 262, 10, 5, 1, 2), GPU.x1, GPU.x1 + 6); line(gpu, [-95, 248, GPU.x1 + 0.05], [225, 248, GPU.x1 + 0.05]); });   // power socket, the lit strip along its edge
}

// ---------- cables ----------
const cables = part("Cables", "cables", "minor");
for (let i = 0; i < 6; i++) tube(cables, [[-70 + i * 3, -40, 110], [-75 + i * 3, -30, 200], [-90 + i * 1.2, -10, 300], [MB + 14, -4, 336 + i * 8]], 1.4, 6);   // the 24-pin
for (let i = 0; i < 4; i++) tube(cables, [[30 + i * 3, 120, 110], [46 + i * 3, 115, 190], [52 + i * 2, 110, 240], [GPU.x1 + 6, 104 + i * 4, 262]], 1.4, 6);   // GPU power
for (let i = 0; i < 4; i++) tube(cables, [[-100, -100 + i * 3, 110], [-108, -100 + i * 3, 300], [-108, 120 + i * 3, 470], [MB + 6, 200 + i * 3, 448]], 1.2, 6);   // CPU power over the top

// ---------- the fans ----------
FANS.forEach(f => {
  const frameOf = f.axis === "y" ? FY : f.axis === "x" ? FX : (q => q);
  const half = f.size / 2, R = half - 3;
  if (!f.bare) {
    const fr = part(f.label + " Frame", "fan_" + f.id, "minor");
    withFrame(frameOf, () => {
      extrude(fr, squareRing(0, 0, half, R, 64), -12.5, 12.5);
      for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; extrude(fr, stripRegion([[17 * Math.cos(a - 0.06), 17 * Math.sin(a - 0.06)], [R * Math.cos(a - 0.03), R * Math.sin(a - 0.03)]], [[17 * Math.cos(a + 0.06), 17 * Math.sin(a + 0.06)], [R * Math.cos(a + 0.03), R * Math.sin(a + 0.03)]]), 9.5, 12); }
      cyl(fr, 0, 0, 18, 9, 12.5, 32);
      loop(fr, circlePts(0, 0, R + 1, 64).map(q => [...q, -12.55]));   // the lit ring round its face
    });
  }
  const rot = part(f.label, "fan_" + f.id, "minor", { spool: f.id });
  withFrame(frameOf, () => {
    const hub = f.bare ? 16 : 18, tip = R - 1.5, depth = f.bare ? 5 : 9;
    revolve(rot, 0, 0, [[0, -depth], [hub, -depth, true], [hub, depth - 1, true], [0, depth - 1]], 32);
    const n = f.bare ? 11 : 9;
    for (let k = 0; k < n; k++) {
      const lead = [], trail = [];
      for (let i = 0; i <= 5; i++) {
        const r = hub + (tip - hub) * i / 5, a = 2 * Math.PI * k / n + 0.55 * i / 5, w = 0.32 + 0.14 * i / 5;
        lead.push([r * Math.cos(a), r * Math.sin(a)]); trail.push([r * Math.cos(a - w), r * Math.sin(a - w)]);
      }
      extrude(rot, stripRegion(lead, trail), -depth + 2, depth - 2);
    }
    if (f.bare) loop(rot, circlePts(0, 0, tip + 0.5, 48).map(q => [...q, depth - 2]));   // the ring that ties the blade tips
  });
});

// ---------- callouts and the tour ----------
const BASE = {};
FANS.forEach(f => { BASE[f.label] = f.c; if (!f.bare) BASE[f.label + " Frame"] = f.c; });
const local = (name, p) => r3(BASE[name] ? p.map((c, i) => c - BASE[name][i]) : p);
const hotspots = [
  ["Tempered glass", "The whole side, see-through", [HW + 4, -150, 420], ["Glass Side Panel"]],
  ["CPU", "16 cores, 32 threads", [MB + 6, CPU[1], CPU[2] + 18], ["CPU"]],
  ["AIO pump", "Liquid cooling, with a screen", [MB + 46, CPU[1], CPU[2]], ["AIO Pump", "Hoses"]],
  ["360 mm radiator", "Three fans in the roof", [RAD.x, 60, RAD.z1], ["Radiator"]],
  ["Graphics card", "24 GB GDDR6X, triple fan", [GPU.x1, 40, GPU.z1], ["Graphics Card"]],
  ["64 GB DDR5", "Four DIMMs, 6000 MT/s", [MB + 40, 75, 436], ["Memory"]],
  ["2 TB NVMe SSD", "Gen 4 under a heatsink", [MB + 8, 85, 204], ["M.2 SSD"]],
  ["Intake fans", "Three 120 mm behind the mesh", [60, -222, 375], ["Front Fan 3", "Front Fan 3 Frame"]],
  ["Exhaust fan", "Out the back", [60, 208, 360], ["Rear Fan", "Rear Fan Frame"]],
  ["1000 W power supply", "Under the shroud", [50, 150, 102], ["Power Supply", "PSU Shroud"]],
  ["Motherboard", "ATX, the hub of it all", [MB, 20, 440], ["Motherboard", "VRM Heatsinks"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    inlet: pt("Mesh Front", [0, -HD - 60, 255]), front: pt("Front Fan 2", [0, -210, 255]), mid: pt("Motherboard", [0, 40, 330]),
    gpu: pt("Graphics Card", [0, 60, GPU.z0]), rear: pt("Rear Fan", [20, 220, 360]), out: pt("Rear Panel", [20, HD + 60, 360]),
    cpu: pt("CPU", [MB + 6, CPU[1], CPU[2]]), pump: pt("AIO Pump", [MB + 46, CPU[1], CPU[2]]), hose: pt("Hoses", [-20, -60, 420]),
    rad: pt("Radiator", [RAD.x, 0, RAD.z0]), roof: pt("Radiator", [RAD.x, 0, H + 60]), ram: pt("Memory", [MB + 40, 75, 400]),
    ssd: pt("M.2 SSD", [MB + 8, 85, 204]), psu: pt("Power Supply", [-25, 150, 102]), cable: pt("Cables", [-75, -30, 200]), board: pt("Motherboard", [MB, -4, 356]),
  },
  steps: [
    { t: "Cool air in at the front", focus: "front", dist: 0.5, ex: 0, p: ["inlet", "front", "mid"], n: ["Mesh Front", "Front Fan 1", "Front Fan 2", "Front Fan 3"], ms: 4200,
      d: "Three 120 mm fans pull cool air through the mesh front. More air comes in than the other fans push out, so dust only gets in through the filters." },
    { t: "Over the graphics card", focus: "gpu", dist: 0.48, ex: 1, p: ["front", "gpu", "rear", "out"], n: ["Graphics Card", "GPU Fan 1", "GPU Fan 2", "GPU Fan 3"], ms: 4400,
      d: "The graphics card's own three fans blow that air through its fins; the exhaust fan at the back takes the warm air out of the case." },
    { t: "Water cools the CPU", focus: "pump", dist: 0.42, ex: 1, p: ["cpu", "pump", "hose", "rad"], n: ["CPU", "AIO Pump", "Hoses"], ms: 4400,
      d: "A pump on the processor pushes liquid through a copper cold plate and up a hose to the radiator. It holds 16 cores near their boost clock without a big air cooler in the way." },
    { t: "Out through the roof", focus: "rad", dist: 0.5, ex: 1, p: ["rad", "roof"], n: ["Radiator", "Radiator Fan 1", "Radiator Fan 2", "Radiator Fan 3"], ms: 4200,
      d: "Three fans push air up through the 360 mm radiator's fins and out of the top, carrying the CPU's heat with it." },
    { t: "Memory and storage", focus: "ram", dist: 0.42, ex: 1, p: ["cpu", "ram", "cpu", "ssd"], n: ["Memory", "M.2 SSD"], ms: 4200,
      d: "64 GB of DDR5 in four DIMMs beside the socket, and a 2 TB Gen 4 NVMe SSD on the board under its own heatsink: games load in seconds." },
    { t: "Power from below", focus: "psu", dist: 0.5, ex: 1, p: ["psu", "cable", "board"], n: ["Power Supply", "PSU Shroud", "Cables"], ms: 4200,
      d: "A 1000 W supply sits under the shroud, out of sight, with its cables routed behind and up through it to the board and the graphics card." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("GPC_GEOMETRY", "gamingpc/build.js", { explode, hotspots, tour, fans: FANS.map(f => ({ id: f.id, axis: f.axis })), constants: { HW, HD, H } });
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>Custom Gaming PC</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of a custom gaming PC in a glass-sided tower, all ten fans turning: on hover the glass, front, radiator, graphics card, memory, pump and power supply move apart\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1PC parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Custom Gaming PC</b><span>ATX tower</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG GPC-001 &middot; Rev A<br>Units mm &middot; View az 50&deg; / el 18&deg;<br>Concept build, generic parts</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "gamingpc", label: "Custom Gaming PC", kind: "desktop", tags: "pc gaming custom build tower desktop rgb gpu cpu aio liquid cooling fans animated",
  key: "gpc-theme", category: "Computers", html }, "macbookpro");
console.log(`gamingpc/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
