/*
Front-loading washing machine: builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm: X across, Y back from the front (the door faces -Y, towards the
default view), Z up; 600 x 600 x 850. A porthole door over a rubber seal into the tub; the perforated stainless
drum turns inside it on a direct-drive motor at the back, the tub hung on two springs over two shock absorbers with a
concrete counterweight on top. Along the top of the front: the detergent drawer, the display and the program dial.
Underneath: the heater, the drain pump and its hose, and the inlet valves at the back. The drum (with the motor's
rotor), the door and the dial are modules of their own, based at their axes, so the page can turn them. The page's
chrome and the shared engine come from the Spectre page; lib/screen-runtime.js runs the display.

    node washer/build.js

Writes washer/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, polyRegion, extrude, rrBody, cyl, revolve, tube,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y (negative y is towards the viewer); a revolve's axis runs along y
const FX = q => [q[2], q[0], q[1]];   // draws in (y, z) and pushes along x
const HW = 300, Y0 = -300, Y1 = 300, H = 850, BASE = 40;
const D = [0, 10, 380];                                 // the drum's centre, on its axis
const R = 230, DEPTH = 150;                             // the drum's radius, its half depth
const PORT = 210;                                       // the porthole door's outer radius
const HINGE = [-PORT - 22, Y0 - 22, D[2]];               // the door's hinge, on its left
const PANEL = { z0: 740, z1: H - 14 };                  // the control panel along the top of the front
const DIAL = [190, Y0 - 4, 790];
const SCR = { x: 20, z: 800, hw: 62, hh: 24 };

const explode = {
  top: [0, 0, 260], panel: [0, -200, 150], drawer: [-60, -360, 150], dial: { offset: [0, -200, 150], base: DIAL }, front: [0, -230, 0],
  door: { offset: [0, -380, 0], base: HINGE }, seal: [0, -150, 0], drum: { offset: [0, -60, 0], base: D }, tub: [0, 150, 0],
  rotor: { offset: [0, 300, 0], base: D }, stator: [0, 260, 0], hang: [0, 120, 120], weight: [0, -120, 200], heater: [0, 60, -150],
  pump: [140, -170, -60], valves: [0, 180, 160], board: [0, -160, 240], cabinet: [0, 0, 0],
};

// ---------- the cabinet ----------
const cab = part("Cabinet", "cabinet", "major");
withFrame(FX, () => [-1, 1].forEach(s => extrude(cab, rect(Y0, Y1, BASE, H - 14), s * HW - (s > 0 ? 6 : 0), s * HW + (s < 0 ? 6 : 0))));   // the sides
withFrame(FY, () => extrude(cab, rect(-HW, HW, BASE, H - 14), Y1 - 6, Y1));                                                          // the back
extrude(cab, rect(-HW, HW, Y0, Y1), BASE, BASE + 6);                                                                                  // the base
withFrame(FY, () => extrude(cab, rrRegion(0, BASE / 2, HW - 4, BASE / 2, 2, 2), Y0, Y0 + 30));                                        // the plinth
const feet = part("Feet", "cabinet", "minor");
[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { const x = sx * (HW - 40), y = sy * (HW - 40); cyl(feet, x, y, 24, 0, 10, 20); cyl(feet, x, y, 8, 10, BASE, 12); });
const top = part("Top Panel", "top", "major");
rrBody(top, 0, 0, HW + 4, (Y1 - Y0) / 2 + 4, 6, [[0, H - 14, true], [0, H - 3], [3, H, true]], { seg: 3 });

const front = part("Front Panel", "front", "major");
withFrame(FY, () => {
  // the lower front, with the porthole cut through it, and the service hatch for the pump filter
  extrude(front, rrRegion(0, (BASE + PANEL.z0) / 2, HW, (PANEL.z0 - BASE) / 2, [8, 8, 0, 0], 3, [[-PORT + 6, PORT - 6, D[2] - PORT + 6, D[2] + PORT - 6]]), Y0, Y0 + 6);
  loop(front, circlePts(0, D[2], PORT - 12, 64).map(q => [...q, Y0 - 0.5]));
  extrude(front, rrRegion(HW - 90, 75, 60, 28, 6, 3), Y0 - 3, Y0);                      // the hatch
  loop(front, circlePts(HW - 90, 75, 9, 16).map(q => [...q, Y0 - 3.5]));
});

// ---------- the control panel ----------
const panel = part("Control Panel", "panel", "major");
withFrame(FY, () => {
  extrude(panel, rrRegion(0, (PANEL.z0 + PANEL.z1) / 2, HW, (PANEL.z1 - PANEL.z0) / 2, [0, 0, 8, 8], 3, [[-HW + 14, -110, PANEL.z0 + 12, PANEL.z1 - 12]]), Y0 - 4, Y0 + 30);
  extrude(panel, rrRegion(SCR.x, SCR.z, SCR.hw + 10, SCR.hh + 10, 6, 3), Y0 - 6, Y0 - 4);      // the display's bezel
  [-50, -10, 30, 70].forEach(x => extrude(panel, rrRegion(SCR.x + x, 760, 14, 7, 6.9, 3), Y0 - 8, Y0 - 4));   // the buttons: start, temperature, spin, delay
  loop(panel, circlePts(DIAL[0], DIAL[2], 52, 48).map(q => [...q, Y0 - 4.5]));                 // the dial's ring of programs
  for (let k = 0; k < 14; k++) { const a = Math.PI * (0.25 + 1.5 * k / 13); line(panel, [DIAL[0] + 56 * Math.cos(a), DIAL[2] + 56 * Math.sin(a), Y0 - 4.5], [DIAL[0] + 64 * Math.cos(a), DIAL[2] + 64 * Math.sin(a), Y0 - 4.5]); }
});
const dial = part("Program Dial", "dial", "minor", { spool: "dial" });
withFrame(FY, () => {
  revolve(dial, 0, 0, [[0, -26], [36, -26, true], [40, -20], [40, -2, true], [0, -2]], 40);
  extrude(dial, rrRegion(0, 18, 4, 14, 3.9, 3), -28, -26);                                       // its pointer
});
const drawer = part("Detergent Drawer", "drawer", "major");
withFrame(FY, () => {
  extrude(drawer, rrRegion((-HW + 14 - 110) / 2, (PANEL.z0 + PANEL.z1) / 2, (HW - 14 - 110) / 2 - 2, (PANEL.z1 - PANEL.z0) / 2 - 14, 6, 3), Y0 - 6, Y0);
  extrude(drawer, rrRegion((-HW + 14 - 110) / 2, PANEL.z0 + 30, 40, 6, 5.9, 3), Y0 - 12, Y0 - 6);   // the finger pull
});
withFrame(FX, () => [-HW + 20, -170, -110].forEach(x => extrude(drawer, rect(Y0, Y0 + 280, PANEL.z0 + 16, PANEL.z1 - 20), x - 2, x + 2)));   // its compartments
extrude(drawer, rect(-HW + 18, -108, Y0, Y0 + 280), PANEL.z0 + 14, PANEL.z0 + 18);
const board = part("Control Board", "board", "minor");
withFrame(FY, () => {
  extrude(board, rect(-90, 260, PANEL.z0 + 10, PANEL.z1 - 10), Y0 + 40, Y0 + 42);
  [[20, 800, 14, 10], [120, 790, 10, 8], [190, 790, 20, 20], [-40, 770, 8, 6]].forEach(([x, z, w, h]) => extrude(board, rect(x - w, x + w, z - h, z + h), Y0 + 42, Y0 + 48));
});

// ---------- the door ----------
// built round its hinge so it can swing open
const P = q => [q[0] - HINGE[0], q[1] - HINGE[1], q[2] - HINGE[2]];
const door = part("Door", "door", "major", { spool: "door" });
withFrame(P, () => withFrame(FY, () => {
  revolve(door, 0, D[2], [[PORT - 70, Y0 - 6, true], [PORT, Y0 - 6, true], [PORT + 4, Y0 - 20], [PORT - 4, Y0 - 36, true], [PORT - 60, Y0 - 40, true], [PORT - 70, Y0 - 34, true]], 64, true);
  extrude(door, rrRegion(PORT - 30, D[2], 22, 60, 20, 4), Y0 - 52, Y0 - 34);                     // the handle, on the right
  [-1, 1].forEach(s => extrude(door, rect(-PORT - 28, -PORT + 4, D[2] + s * 120 - 18, D[2] + s * 120 + 18), Y0 - 30, Y0 - 12));   // the hinge arms
}));
const glass = part("Door Glass", "door", "major", { spool: "door" });
withFrame(P, () => withFrame(FY, () => revolve(glass, 0, D[2], [[PORT - 66, Y0 - 34, true], [PORT - 100, Y0 - 30], [PORT - 130, Y0 - 10], [100, Y0 + 30], [50, Y0 + 52], [0, Y0 + 56]], 48)));   // the glass bowl reaching into the drum

// ---------- the seal, the tub and the drum ----------
const seal = part("Door Seal", "seal", "minor");
withFrame(FY, () => revolve(seal, 0, D[2], [[PORT - 8, Y0 + 2, true], [PORT - 20, Y0 + 20], [PORT - 4, Y0 + 45], [PORT - 22, Y0 + 75], [PORT - 10, Y0 + 100, true]], 56));
const tub = part("Tub", "tub", "major");
withFrame(FY, () => {
  revolve(tub, 0, D[2], [[PORT - 10, D[1] - 200, true], [R + 30, D[1] - 170], [R + 42, D[1] - 120, true], [R + 42, D[1] + 190, true], [R + 30, D[1] + 205], [0, D[1] + 210]], 56);
  [-60, 30, 120].forEach(y => loop(tub, circlePts(0, D[2], R + 43, 56).map(q => [...q, D[1] + y])));   // the moulded ribs
});
const drum = part("Drum", "drum", "major", { spool: "drum" });
withFrame(FY, () => {
  revolve(drum, 0, 0, [[0, DEPTH], [R, DEPTH, true], [R, -DEPTH + 10, true], [R - 25, -DEPTH - 8], [R - 50, -DEPTH - 8, true]], 64);
  // the perforations: rings of small holes round the drum
  for (let row = 0; row < 7; row++) for (let k = 0; k < 28; k++) {
    const a = 2 * Math.PI * (k + (row % 2) * 0.5) / 28, y = -DEPTH + 30 + row * 40;
    line(drum, [(R + 0.5) * Math.cos(a - 0.03), (R + 0.5) * Math.sin(a - 0.03), y], [(R + 0.5) * Math.cos(a + 0.03), (R + 0.5) * Math.sin(a + 0.03), y]);
  }
  // three lifters inside, that carry the clothes up and drop them
  for (let k = 0; k < 3; k++) {
    const a = Math.PI / 2 + k * 2 * Math.PI / 3, Pt = (r, da) => [r * Math.cos(a + da), r * Math.sin(a + da)];
    extrude(drum, polyRegion([Pt(R - 1, -0.16), Pt(R - 40, -0.07), Pt(R - 48, 0), Pt(R - 40, 0.07), Pt(R - 1, 0.16)]), -DEPTH + 16, DEPTH - 6);
  }
  // the spider on the back that carries the drum on its shaft
  for (let k = 0; k < 3; k++) {
    const a = Math.PI / 2 + k * 2 * Math.PI / 3, px = -Math.sin(a) * 14, pz = Math.cos(a) * 14;
    extrude(drum, polyRegion([[px, pz], [(R - 10) * Math.cos(a - 0.07), (R - 10) * Math.sin(a - 0.07)], [(R - 10) * Math.cos(a + 0.07), (R - 10) * Math.sin(a + 0.07)], [-px, -pz]]), DEPTH + 4, DEPTH + 18);
  }
  cyl(drum, 0, 0, 22, DEPTH, DEPTH + 80, 24);                                                     // the shaft
});

// ---------- the motor: direct drive on the back of the tub ----------
const stator = part("Motor Stator", "stator", "major");
withFrame(FY, () => {
  revolve(stator, 0, D[2], [[50, D[1] + 212, true], [150, D[1] + 212, true], [150, D[1] + 250, true], [50, D[1] + 250, true]], 48, true);
  for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; line(stator, [150 * Math.cos(a), D[2] + 150 * Math.sin(a), D[1] + 251], [110 * Math.cos(a), D[2] + 110 * Math.sin(a), D[1] + 251]); }   // its windings
});
const rotor = part("Motor Rotor", "rotor", "minor", { spool: "drum" });
withFrame(FY, () => {
  revolve(rotor, 0, 0, [[20, 196, true], [175, 196, true], [175, 262, true], [158, 262, true], [158, 202], [20, 202]], 48);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; line(rotor, [40 * Math.cos(a), 40 * Math.sin(a), 195], [150 * Math.cos(a), 150 * Math.sin(a), 195]); }   // its spokes
});

// ---------- suspension, counterweight, heater, pump, valves ----------
const hang = part("Springs and Dampers", "hang", "minor");
const tubTop = D[2] + R + 42, tubBottom = D[2] - R - 42;
[-1, 1].forEach(s => {
  const a = [s * 210, D[1], H - 30], b = [s * 120, D[1], tubTop], pts = [];
  for (let i = 0; i <= 120; i++) {   // a coil spring from the top of the cabinet to the tub
    const t = i / 120, c = a.map((v, j) => v + (b[j] - v) * t), ang = t * 2 * Math.PI * 14;
    pts.push([c[0] + 12 * Math.cos(ang), c[1] + 12 * Math.sin(ang), c[2]]);
  }
  tube(hang, pts, 2.2, 6);
  tube(hang, [[s * 150, D[1], tubBottom + 10], [s * 200, D[1], tubBottom - 50]], 14, 14);           // the damper's body
  tube(hang, [[s * 200, D[1], tubBottom - 50], [s * 235, D[1], BASE + 14]], 6, 10);                // its rod, down to the base
});
const weight = part("Counterweight", "weight", "major");
rrBody(weight, 0, D[1] - 110, 170, 40, 12, [[0, tubTop - 30, true], [0, tubTop + 40, true]], { seg: 3 });
const heater = part("Heater", "heater", "minor");
tube(heater, [[-40, D[1] - 120, tubBottom + 28], [-40, D[1] + 150, tubBottom + 28], [0, D[1] + 175, tubBottom + 28], [40, D[1] + 150, tubBottom + 28], [40, D[1] - 120, tubBottom + 28]], 5, 10);
const pump = part("Drain Pump", "pump", "major");
withFrame(FY, () => cyl(pump, HW - 90, 75, 30, Y0 + 10, Y0 + 110, 28));
cyl(pump, HW - 90, Y0 + 130, 22, 50, 100, 24);                                                   // its motor
tube(pump, [[0, D[1], tubBottom - 2], [60, D[1] - 80, BASE + 70], [HW - 90, Y0 + 80, 100]], 16, 14);   // the sump hose
tube(pump, [[HW - 90, Y0 + 110, 75], [HW - 60, Y1 - 40, 120], [HW - 60, Y1 - 20, H - 120], [HW - 80, Y1 + 30, H - 160]], 10, 12);   // the drain hose, up the back
const valves = part("Inlet Valves", "valves", "minor");
[[180, "cold"], [120, "hot"]].forEach(([x]) => {
  extrude(valves, rrRegion(x, Y1 - 40, 22, 30, 4, 3), H - 90, H - 50);
  tube(valves, [[x, Y1 - 40, H - 70], [x - 200, Y0 + 200, H - 70], [-200, Y0 + 150, PANEL.z0 + 40]], 6, 10);   // hoses to the detergent drawer
});
tube(valves, [[-200, Y0 + 260, PANEL.z0 + 10], [-150, D[1] - 120, tubTop + 10], [-120, D[1] - 160, tubTop - 20]], 16, 12);   // the drawer's outlet down into the tub

// ---------- callouts and the tour ----------
const BASED = { "Drum": D, "Motor Rotor": D, "Door": HINGE, "Door Glass": HINGE, "Program Dial": DIAL };
const local = (name, p) => r3(BASED[name] ? p.map((c, i) => c - BASED[name][i]) : p);
const hotspots = [
  ["Porthole door", "Toughened glass bowl", [PORT - 30, Y0 - 52, D[2]], ["Door", "Door Glass"]],
  ["Drum", "Perforated stainless steel, 8 kg", [R * 0.7, D[1] - DEPTH, D[2] + R * 0.7], ["Drum"]],
  ["Direct-drive motor", "No belt: the rotor is on the shaft", [0, D[1] + 262, D[2] + 175], ["Motor Rotor", "Motor Stator"]],
  ["Program dial", "Turn to choose a cycle", [DIAL[0], Y0 - 30, DIAL[2] + 36], ["Program Dial"]],
  ["Display", "Time left and the cycle's progress", [SCR.x + 40, Y0 - 6, SCR.z + 20], ["Control Panel"]],
  ["Detergent drawer", "Prewash, main wash, softener", [-200, Y0 - 12, PANEL.z0 + 30], ["Detergent Drawer"]],
  ["Springs and dampers", "Hold the tub as it spins", [210, D[1], H - 60], ["Springs and Dampers"]],
  ["Counterweight", "Concrete, to steady the spin", [100, D[1] - 150, tubTop + 40], ["Counterweight"]],
  ["Drain pump", "Behind the hatch, with its filter", [HW - 90, Y0 - 3, 75], ["Drain Pump", "Front Panel"]],
  ["Heater", "Warms the water under the drum", [40, D[1] - 120, tubBottom + 28], ["Heater"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    valve: pt("Inlet Valves", [180, Y1 - 40, H - 70]), drawer: pt("Detergent Drawer", [-200, Y0 + 100, PANEL.z0 + 40]), tub: pt("Tub", [0, D[1] - 120, tubTop]),
    heat: pt("Heater", [0, D[1], tubBottom + 28]), drum: pt("Drum", D), lifter: pt("Drum", [0, D[1], D[2] + R - 40]), motor: pt("Motor Rotor", [0, D[1] + 262, D[2]]),
    pump: pt("Drain Pump", [HW - 90, Y0 + 60, 75]), out: pt("Drain Pump", [HW - 80, Y1 + 30, H - 160]), spring: pt("Springs and Dampers", [120, D[1], tubTop]),
    weight: pt("Counterweight", [0, D[1] - 110, tubTop + 40]), damper: pt("Springs and Dampers", [200, D[1], tubBottom - 50]),
  },
  steps: [
    { t: "Water in", focus: "drawer", dist: 0.45, ex: 1, p: ["valve", "drawer", "tub"], n: ["Inlet Valves", "Detergent Drawer"], ms: 4200,
      d: "The inlet valves open and the water runs through the detergent drawer, washing the powder or liquid down into the tub." },
    { t: "Warm it", focus: "heat", dist: 0.42, ex: 1, p: ["tub", "heat"], n: ["Heater", "Tub"], ms: 3800,
      d: "A heating element in the bottom of the tub brings the water up to the program's temperature." },
    { t: "Tumble", focus: "drum", dist: 0.42, ex: 1, p: ["motor", "drum", "lifter"], n: ["Drum", "Motor Rotor", "Motor Stator"], ms: 4400,
      d: "The motor turns the drum one way, then the other. The lifters carry the clothes up and drop them through the soapy water: that's the washing." },
    { t: "Drain", focus: "pump", dist: 0.45, ex: 1, p: ["tub", "pump", "out"], n: ["Drain Pump"], ms: 3800,
      d: "The drain pump empties the tub through a filter you can reach behind the hatch, and up the hose at the back." },
    { t: "Spin", focus: "spring", dist: 0.5, ex: 1, p: ["spring", "weight", "damper"], n: ["Springs and Dampers", "Counterweight", "Drum"], ms: 4400,
      d: "The drum spins at up to 1400 rpm and throws the water out through its holes. The tub swings on its springs, the dampers soak up the shaking and the concrete counterweight keeps it steady." },
  ],
};
const SY = Y0 - 6.3;
const screen = { module: "panel", origin: [SCR.x - SCR.hw, SY, SCR.z - SCR.hh], right: [SCR.x + SCR.hw, SY, SCR.z - SCR.hh], top: [SCR.x - SCR.hw, SY, SCR.z + SCR.hh], cornerRadius: 0.5 };

// ---------- page and gallery ----------
const geometry = geometryScript("WSH_GEOMETRY", "washer/build.js", { explode, hotspots, tour, screen, constants: { H } });
const model = read(path.join(HERE, "..", "lib", "screen-runtime.js")) + read(path.join(HERE, "model.js"));
const html = buildPage({ template: "spectre", geometry: geometry.js, model, swaps: [
  [/<title>[^<]*<\/title>/, "<title>Washing Machine</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of a front-loading washing machine: on hover the door, front and control panel come away, the drum slides out of the tub and the motor, springs, counterweight, heater and pump move apart\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Washing Machine</b><span>Front loader</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG WSH-001 &middot; Rev A<br>Units mm &middot; View az 35&deg; / el 18&deg;<br>Concept design, generic parts</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "washer", label: "Washing Machine", kind: "appliance", tags: "washing machine washer laundry front loader drum spin appliance",
  key: "wsh-theme", category: "Appliances", html }, "fridge");
console.log(`washer/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
