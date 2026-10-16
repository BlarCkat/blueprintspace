/*
EG-1 external GPU: builds the model page and adds it to the gallery.

A concept enclosure, generated in code (with lib/procedural.js) in Blender mm: X along its length (the I/O end
at +X), Y across it (the mesh side panel at -Y, facing the default view), Z up from the desk. Inside: a
triple-fan graphics card on a slide-out sled with the Thunderbolt board and PCIe slot, and a power supply with
its own fan. Each fan is a module of its own, based at its hub, so the page can spin it in place. The page's
chrome and the shared engine come from the X9 page already in the gallery. Re-run after any change:

    node egpu/build.js

Writes egpu/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, squareRing, stripRegion, extrude, sheet, cyl,
  tube, holeWalls, r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;

// ---------- dimensions (mm) ----------
const L = 205, W = 80, H = 215;   // half length, half width, height of the shell (410 x 160 x 215)
const R = 12, T = 3;              // the shell's corner radius and wall
const CAP = 4;                    // end cap thickness
// faces drawn in another plane: FY draws in (x, z) and pushes along y; FX draws in (y, z) and pushes along x
const FY = q => [q[0], q[2], q[1]];
const FX = q => [q[2], q[0], q[1]];

// modules: explode offsets, and a base for the fans so each turns about its own hub
const FANS = [[-100, 81], [0, 81], [100, 81]].map(([x, z]) => [x, -24, z]);
const PSU_FAN = [-154, -66, 78];
const modules = {
  shell: { offset: [0, 0, 230] }, panel: { offset: [0, -130, 0] },
  capL: { offset: [-140, 0, 0] }, capR: { offset: [70, 0, 0] },
  gpu: { offset: [0, 0, 120] },
  fan1: { offset: [0, -45, 120], base: FANS[0] }, fan2: { offset: [0, -45, 120], base: FANS[1] }, fan3: { offset: [0, -45, 120], base: FANS[2] },
  sled: { offset: [0, 0, -110] },
  psu: { offset: [-60, 0, 0] }, psuFan: { offset: [-60, -30, 0], base: PSU_FAN },
};

// ---------- shell, side panel, end caps ----------
const shell = part("Enclosure Shell", "shell", "major");
// one aluminium extrusion: top, bottom and the far side; the near side is open for the mesh panel
withFrame(FX, () => extrude(shell, rrRegion(0, H / 2, W, H / 2, R, 6, [[-W + T, W - T, T, H - T], [-W - 5, -W + T + 1, 22, H - 22]]), -L, L));
const vents = part("Top Vents", "shell", "minor");
for (let i = 0; i < 14; i++) {
  const x = -40 + i * 14;
  loop(vents, rrPts(x, 0, 2.5, 44, 2.4, 4).map(q => [q[0], q[1], H + 0.05]));
}

const panel = part("Mesh Side Panel", "panel", "major");
withFrame(FY, () => {
  extrude(panel, rrRegion(0, H / 2, L, H / 2 - 22, 0, 6, [[-L + 10, L - 10, 32, H - 32]]), -W, -W + T);
  // the perforations: hexagons, lines only, so the fans show through
  const P = 9, rh = 3.1;
  for (let row = 0, z = 36; z <= H - 36; row++, z += P * 0.866) for (let x = -L + 14 + (row % 2) * P / 2; x <= L - 14; x += P)
    loop(panel, circlePts(x, z, rh, 6, Math.PI / 6).map(q => [q[0], q[1], -W - 0.05]));
});

withFrame(FX, () => {
  const capL = part("Power End Cap", "capL", "major");
  extrude(capL, rrRegion(0, H / 2, W, H / 2, R, 6), -L - CAP, -L);
  const capR = part("I/O End Cap", "capR", "major");
  // an opening for the card's bracket and one for the Thunderbolt port
  extrude(capR, rrRegion(0, H / 2, W, H / 2, R, 6, [[-34, 36, 8, 142], [46, 64, 7, 14]]), L, L + CAP);
});
const inlet = part("Power Inlet", "capL", "minor");
withFrame(q => [-L - CAP - 0.05 + q[2], q[0], q[1]], () => {
  extrude(inlet, rrRegion(-30, 40, 13.5, 9.5, 2, 4), 0, 0.35);     // IEC socket
  extrude(inlet, rrRegion(10, 40, 6, 10, 1.5, 3), 0, 0.35);        // rocker switch
  loop(inlet, rrPts(-30, 40, 9, 5.5, 1.5, 3).map(q => [...q, 0]));
  cyl(inlet, 0, 190, 2, 0, 0.35, 16);                              // status light
});

// ---------- the graphics card ----------
const shroud = part("Shroud", "gpu", "major");
withFrame(FY, () => {
  const face = [...squareRing(-100, 81, 50, 46), ...squareRing(0, 81, 50, 46), ...squareRing(100, 81, 50, 46),
    ...rect(-150, 150, 22, 31), ...rect(-150, 150, 131, 140), ...rect(150, 196, 22, 140)];
  extrude(shroud, face, -28, -26.5);
  holeWalls(shroud, [-150, 196, 22, 140], -26.5, 26, false);
  loop(shroud, [[-150, 22, 26], [196, 22, 26], [196, 140, 26], [-150, 140, 26]]);
});
FANS.forEach((c, i) => {
  const fan = part("Fan " + (i + 1), "fan" + (i + 1), "minor", { spool: "gpu" });
  withFrame(FY, () => {
    cyl(fan, 0, 0, 15, -3, 5, 32);
    for (let k = 0; k < 11; k++) {
      const lead = [], trail = [];
      for (let s = 0; s <= 6; s++) {
        const r = 15 + 28 * s / 6, a = 2 * Math.PI * k / 11 + 0.6 * s / 6, w = 0.3 + 0.12 * s / 6;
        lead.push([r * Math.cos(a), r * Math.sin(a)]); trail.push([r * Math.cos(a - w), r * Math.sin(a - w)]);
      }
      extrude(fan, stripRegion(lead, trail), -1.5, 1.5);
    }
    // the ring that ties the blade tips together
    const outer = circlePts(0, 0, 44.5, 48), inner = circlePts(0, 0, 43, 48);
    extrude(fan, stripRegion([...outer, outer[0]], [...inner, inner[0]]), -1.5, 1.5);
  });
});
const heatsink = part("Heatsink", "gpu", "minor");
withFrame(FX, () => { for (let x = -146; x <= 146.1; x += 2.6) extrude(heatsink, rect(-17, 24, 26, 136), x - 0.2, x + 0.2); });
withFrame(FY, () => extrude(heatsink, rrRegion(40, 81, 22, 22, 1.5, 3), 24, 26));                   // cold plate
const pipes = part("Heat Pipes", "gpu", "minor");
[45, 63, 81, 99, 117].forEach((z, i) => tube(pipes, [[-146, 6, z], [10, 6, z], [26, 18, 81 + (z - 81) * 0.35], [56, 18, 81 + (z - 81) * 0.35], [72, 6, z], [146, 6, z]], 3.2, 12));
const pcb = part("PCB", "gpu", "major");
withFrame(FY, () => {
  extrude(pcb, rect(-98, 200, 26, 129), 30, 31.6);
  extrude(pcb, rect(70, 159, 18, 26), 30, 31.6);                 // the PCIe x16 edge connector
  for (let x = 71; x <= 158; x += 1) line(pcb, [x, 19, 29.95], [x, 24.5, 29.95]);
});
const gpuChip = part("GPU", "gpu", "major");
withFrame(FY, () => {
  extrude(gpuChip, rrRegion(40, 81, 22, 22, 1, 3), 27.4, 30);
  extrude(gpuChip, rrRegion(40, 81, 13, 11, 0.5, 2), 26.2, 27.4);
});
const gddr = part("GDDR Memory", "gpu", "minor");
withFrame(FY, () => [[6, 66], [6, 96], [74, 66], [74, 96], [25, 113], [55, 113], [25, 49], [55, 49]].forEach(([x, z]) =>
  extrude(gddr, rrRegion(x, z, 6, 7, 0.5, 2), 28, 30)));
const vrm = part("VRM", "gpu", "minor");
withFrame(FY, () => {
  for (let i = 0; i < 9; i++) [100, 70].forEach(z => extrude(vrm, rrRegion(-90 + i * 10, z, 3, 3, 0.4, 2), 25, 30));
  for (let i = 0; i < 12; i++) extrude(vrm, rect(-92 + i * 7.5, -89 + i * 7.5, 50, 54), 28.5, 30);
});
const conn = part("Power Connector", "gpu", "minor");
withFrame(FY, () => extrude(conn, rrRegion(176, 130, 11, 6, 0.8, 2), 26, 34));
const backplate = part("Backplate", "gpu", "major");
withFrame(FY, () => {
  extrude(backplate, rrRegion(23, 81, 173, 55, 2, 3, [[-140, -108, 36, 120]]), 31.6, 34);
  [[-90, 60], [-90, 102]].forEach(([x, z]) => line(backplate, [x, z, 34.05], [x + 260, z, 34.05]));
});
const bracket = part("I/O Bracket", "gpu", "major");
withFrame(FX, () => extrude(bracket, rect(-30, 34, 10, 138), 200, 201.5));
const outputs = part("Display Outputs", "gpu", "minor");
withFrame(q => [201.55 - q[2], q[0], q[1]], () => {
  extrude(outputs, rrRegion(22, 42, 3, 7.6, 0.8, 3), 0, 0.35);                                   // HDMI
  [66, 90, 114].forEach(z => extrude(outputs, rrRegion(22, z, 3.4, 9.2, 1, 3), 0, 0.35));      // DisplayPort
  for (let i = 0; i < 6; i++) loop(outputs, rrPts(-25 + i * 6, 74, 1.4, 52, 1.3, 3).map(q => [...q, 0]));   // vent slots
});

// ---------- the sled: tray, Thunderbolt board, PCIe slot ----------
const tray = part("Sled Tray", "sled", "major");
extrude(tray, rrRegion(0, 0, L - 4, W - 5, 3, 3), T, 5.5);
const board = part("Controller Board", "sled", "major");
extrude(board, rect(-100, 198, 8, 74), 5.5, 7.1);
const slot = part("PCIe Slot", "sled", "minor");
extrude(slot, rrRegion(114.5, 30.8, 46.5, 5.5, 0.8, 2), 7.1, 19);
loop(slot, [[70, 30.2, 19.05], [159, 30.2, 19.05], [159, 31.4, 19.05], [70, 31.4, 19.05]]);
const tb = part("Thunderbolt Controller", "sled", "minor");
extrude(tb, rrRegion(150, 55, 7, 7, 0.6, 2), 7.1, 8.4);
extrude(tb, rect(194, 207, 48.5, 61.5), 7.1, 12.5);              // the port, through the end cap
extrude(tb, rrRegion(176, 40, 4, 4, 0.5, 2), 7.1, 8.2);           // retimer
const comps = part("Board Components", "sled", "minor");
for (let i = 0; i < 4; i++) extrude(comps, rrRegion(120 + i * 9, 18, 3, 3, 0.4, 2), 7.1, 11);
extrude(comps, rrRegion(-60, 50, 6, 6, 0.6, 2), 7.1, 8.4);        // USB hub
extrude(comps, rect(-96, -82, 44, 56), 7.1, 13);                  // power input from the supply
for (let i = 0; i < 8; i++) extrude(comps, rect(10 + i * 6, 12 + i * 6, 60, 63), 7.1, 8.2);

// ---------- power supply ----------
const psu = part("Power Supply", "psu", "major");
withFrame(FY, () => {
  extrude(psu, rect(-198, -110, 8, 148), -72, 72, { bottom: false });
  // the face towards the panel, open for the fan, behind a wire grille
  sheet(psu, [...squareRing(-154, 78, 40, 38), ...rect(-198, -194, 8, 148), ...rect(-114, -110, 8, 148),
    ...rect(-194, -114, 8, 38), ...rect(-194, -114, 118, 148)], -72);
  [36, 26, 16].forEach(r => loop(psu, circlePts(-154, 78, r, 40).map(q => [...q, -72.6])));
  [0, 1, 2, 3].forEach(k => { const a = Math.PI / 4 + k * Math.PI / 2; line(psu, [-154 + 16 * Math.cos(a), 78 + 16 * Math.sin(a), -72.6], [-154 + 36 * Math.cos(a), 78 + 36 * Math.sin(a), -72.6]); });
});
const psuFan = part("PSU Fan", "psuFan", "minor", { spool: "psu" });
withFrame(FY, () => {
  cyl(psuFan, 0, 0, 12, -2, 4, 28);
  for (let k = 0; k < 7; k++) {
    const lead = [], trail = [];
    for (let s = 0; s <= 5; s++) {
      const r = 12 + 24 * s / 5, a = 2 * Math.PI * k / 7 + 0.5 * s / 5, w = 0.42 + 0.16 * s / 5;
      lead.push([r * Math.cos(a), r * Math.sin(a)]); trail.push([r * Math.cos(a - w), r * Math.sin(a - w)]);
    }
    extrude(psuFan, stripRegion(lead, trail), -1.2, 1.2);
  }
});
const cable = part("Power Cable", "psu", "minor");
tube(cable, [[-140, 30, 148], [-140, 30, 170], [-110, 30, 186], [150, 30, 186], [176, 30, 170], [176, 30, 136]], 4, 12);
tube(cable, [[-111, 50, 60], [-100, 50, 40], [-89, 50, 26], [-89, 50, 13]], 3, 10);

// ---------- callouts and the "how it works" tour ----------
// positions are in each part's module; a fan's module is based at its hub
const baseOf = name => { const m = modules[{ "Fan 1": "fan1", "Fan 2": "fan2", "Fan 3": "fan3", "PSU Fan": "psuFan" }[name]]; return (m && m.base) || [0, 0, 0]; };
const local = (name, p) => r3(p.map((c, i) => c - baseOf(name)[i]));
const hotspots = [
  ["Aluminium shell", "Slides off in one piece", [-120, 0, H], ["Enclosure Shell"]],
  ["Mesh side panel", "Open to the fans", [-185, -W - 0.05, 190], ["Mesh Side Panel"]],
  ["Triple-fan graphics card", "Up to 330 mm, three slots", [176, -28, 120], ["Shroud"]],
  ["Axial fans", "Three 90 mm, always turning", [FANS[1][0] + 30, -26, 112], ["Fan 2", "Fan 1", "Fan 3"]],
  ["Fin stack + heat pipes", "Five pipes from the GPU", [-146, -17, 136], ["Heatsink", "Heat Pipes"]],
  ["Graphics processor", "GDDR memory round it", [40, 26.2, 81], ["GPU", "GDDR Memory"]],
  ["Display outputs", "3 x DisplayPort, HDMI", [201.55, 22, 100], ["Display Outputs", "I/O Bracket"]],
  ["Backplate", "Flow-through cut-out", [-124, 34, 120], ["Backplate"]],
  ["PCIe x16 slot", "Wired x4 to the host", [114, 25.3, 19], ["PCIe Slot"]],
  ["Thunderbolt controller", "40 Gb/s to the laptop", [150, 55, 8.4], ["Thunderbolt Controller", "Controller Board"]],
  ["Thunderbolt port", "Data, displays, 100 W charging", [L + CAP + 0.05, 55, 11], ["I/O End Cap"]],
  ["Power supply", "750 W, its own fan", [-154, -72, 140], ["Power Supply", "PSU Fan"]],
  ["12V-2x6 cable", "Up to 600 W to the card", [20, 26, 186], ["Power Cable", "Power Connector"]],
  ["Slide-out sled", "Card and board come out together", [-60, -75, 5.5], ["Sled Tray"]],
  ["Power inlet + switch", "Mains in at the back", [-L - CAP - 0.05, -30, 50], ["Power Inlet"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    tbPort: pt("Thunderbolt Controller", [206, 55, 10]), tbChip: pt("Thunderbolt Controller", [150, 55, 8.4]),
    slot: pt("PCIe Slot", [114.5, 30.8, 19]), fingers: pt("PCB", [114.5, 30.8, 24]), gpu: pt("GPU", [40, 26.2, 81]),
    mem1: pt("GDDR Memory", [6, 28, 66]), mem2: pt("GDDR Memory", [74, 28, 96]),
    inlet: pt("Power Inlet", [-L - CAP, -30, 40]), psu: pt("Power Supply", [-154, 0, 120]),
    cableA: pt("Power Cable", [-140, 30, 172]), cableB: pt("Power Cable", [150, 30, 186]), conn: pt("Power Connector", [176, 30, 136]),
    vrm: pt("VRM", [-50, 25, 85]),
    meshOut: pt("Mesh Side Panel", [0, -112, 81]), fan: pt("Fan 2", [0, -24, 81]), fins: pt("Heatsink", [0, 4, 81]), topVent: pt("Top Vents", [60, 0, H + 20]),
    dp: pt("Display Outputs", [201.55, 22, 90]), monitor: pt("Display Outputs", [260, 22, 90]),
  },
  steps: [
    { t: "The laptop sends work", focus: "tbPort", dist: 0.36, ex: 0, p: ["tbPort", "tbChip"], n: ["Thunderbolt Controller", "I/O End Cap"], ms: 4200,
      d: "One Thunderbolt cable carries PCI Express from the laptop at up to 40 Gb/s, along with USB, and sends up to 100 W back to charge it." },
    { t: "Thunderbolt becomes PCIe", focus: "tbChip", dist: 0.4, ex: 0, p: ["tbChip", "slot"], n: ["Thunderbolt Controller", "Controller Board", "PCIe Slot"], ms: 4200,
      d: "The controller unpacks the PCIe lanes and hands them to the x16 slot. Four of its lanes are wired: that's all Thunderbolt carries, and for most games it's enough." },
    { t: "The card takes the commands", focus: "gpu", dist: 0.4, ex: 0, p: ["slot", "fingers", "gpu"], n: ["PCB", "GPU", "PCIe Slot"], ms: 4200,
      d: "Draw calls, textures and shaders arrive through the gold edge connector, and the graphics processor's thousands of cores get to work on them." },
    { t: "Memory feeds the GPU", focus: "gpu", dist: 0.3, ex: 0, p: ["gpu", "mem1", "gpu", "mem2", "gpu"], n: ["GPU", "GDDR Memory"], ms: 4200,
      d: "Eight GDDR chips round the processor hold the textures and the frame being drawn, and feed them to it at hundreds of gigabytes a second." },
    { t: "Power from the wall", focus: "psu", dist: 0.5, ex: 0, p: ["inlet", "psu", "cableA", "cableB", "conn", "vrm"], n: ["Power Inlet", "Power Supply", "Power Cable", "Power Connector", "VRM"], ms: 4800,
      d: "The supply turns mains into 12 V. One 12V-2x6 cable carries up to 600 W to the card, where the VRMs step it down to under a volt for the processor." },
    { t: "The fans keep it cool", focus: "fan", dist: 0.5, ex: 0, p: ["meshOut", "fan", "fins", "topVent"], n: ["Fan 1", "Fan 2", "Fan 3", "Heatsink", "Heat Pipes", "Mesh Side Panel", "Top Vents"], ms: 4800,
      d: "Heat pipes carry the processor's heat into the fin stack. The fans draw cool air in through the mesh and push it through the fins, and the warm air leaves through the vents on top." },
    { t: "Frames go out", focus: "dp", dist: 0.42, ex: 0, p: ["gpu", "dp", "monitor"], n: ["GPU", "Display Outputs", "I/O Bracket"], ms: 4400,
      d: "Finished frames go straight out of DisplayPort or HDMI to a monitor, or back over the Thunderbolt cable to the laptop's own screen." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("EG1_GEOMETRY", "egpu/build.js", { explode: modules, hotspots, tour,
  constants: { HALF_LENGTH: L, HALF_WIDTH: W, HEIGHT: H } });
// the X9 page's chrome and engine (no screen), with this model's geometry and script
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>EG-1 eGPU</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the EG-1 external GPU enclosure with its fans turning: on hover the shell lifts off, the mesh panel and end caps come away, the graphics card rises off the Thunderbolt board and the power supply slides out\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1eGPU parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>EG-1</b><span>External GPU enclosure</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG EG1-001 &middot; Rev A<br>Units mm &middot; View az 45&deg; / el 26&deg;<br>Concept design</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
// in the Components group, after the X9
const count = addToGallery({ id: "egpu", label: "EG-1 eGPU", kind: "egpu", tags: "egpu external gpu graphics card enclosure thunderbolt fans pcie",
  key: "eg1-theme", category: "Components", html }, "cpu");
console.log(`egpu/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
