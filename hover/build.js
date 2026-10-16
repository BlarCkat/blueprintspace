/*
HV-9 hover hauler: builds the model page and adds it to the gallery.

A concept vehicle, generated in code (with lib/procedural.js) in centimetres: Y along its length with the nose
at -Y (towards the default view), X across it, Z up from the ground it floats over. A faceted hull with a
domed cockpit in a raised collar, a lift turbine in each flank, two engine pods on an outrigger beam at the
back with a sensor mast between them, ventral fins and hover pads underneath. The flank turbines' rotors and
the mast's sensor head are modules of their own, based at their axes, so the page can spin them in place.
The page's chrome and the shared engine come from the X9 page already in the gallery. Re-run after any change:

    node hover/build.js

Writes hover/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, tri, loop, rrPts, circlePts, rrRegion, rect, fanRegion, stripRegion, extrude, loft, rrBody, cyl,
  revolve, r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
// faces drawn in another plane: FY draws in (x, z) and pushes along y; FX draws in (y, z) and pushes along x
const FY = q => [q[0], q[2], q[1]];
const FX = q => [q[2], q[0], q[1]];

// ---------- the hull's sections, nose to tail: [y, half width, bottom, top, chamfer] ----------
const SECTIONS = [
  [-450, 90, 30, 90, 25], [-420, 125, 15, 115, 35], [-330, 145, 5, 135, 40], [0, 150, 0, 140, 40],
  [250, 145, 5, 135, 40], [330, 122, 20, 120, 34], [350, 112, 28, 112, 30],
];
const oct = ([y, hw, z0, z1, ch]) => [[hw - ch, z0], [hw, z0 + ch], [hw, z1 - ch], [hw - ch, z1], [-hw + ch, z1], [-hw, z1 - ch], [-hw, z0 + ch], [-hw + ch, z0]]
  .map(([x, z]) => [x, y, z]);
// the hull's section at any y, between the listed ones
function sectionAt(y) {
  const i = Math.max(0, SECTIONS.findIndex((s, k) => k + 1 < SECTIONS.length && y >= s[0] && y <= SECTIONS[k + 1][0]));
  const a = SECTIONS[i], b = SECTIONS[i + 1], t = (y - a[0]) / (b[0] - a[0]);
  return a.map((v, k) => v + (b[k] - v) * t);
}

// spinning parts: each its own module, based at its axis
const TURBINE = { y: 120, z: 72, x: 169 };
const RADAR = [0, 330, 300];
const modules = {
  hull: { offset: [0, 0, 0] }, deck: { offset: [0, 0, 70] }, cockpit: { offset: [0, 0, 150] }, canopy: { offset: [0, 0, 250] },
  nose: { offset: [0, -110, 0] }, armour: { offset: [0, 0, 0] },
  portTurbine: { offset: [-110, 0, 0] }, portRotor: { offset: [-150, 0, 0], base: [-TURBINE.x, TURBINE.y, TURBINE.z] },
  stbdTurbine: { offset: [110, 0, 0] }, stbdRotor: { offset: [150, 0, 0], base: [TURBINE.x, TURBINE.y, TURBINE.z] },
  beam: { offset: [0, 190, 110] }, radar: { offset: [0, 190, 110], base: RADAR },
  portPod: { offset: [-150, 190, 110] }, stbdPod: { offset: [150, 190, 110] },
  fins: { offset: [0, 0, -120] }, pads: { offset: [0, 0, -70] },
};

// ---------- hull ----------
const hull = part("Hull", "hull", "major");
{
  const rings = SECTIONS.map(s => ({ hard: true, pts: oct(s) }));
  loft(hull, rings);
  // the facets' long edges
  for (let r = 0; r + 1 < rings.length; r++) for (let i = 0; i < 8; i++) line(hull, rings[r].pts[i], rings[r + 1].pts[i]);
  // nose and tail faces, fanned from their centres
  [[rings[0].pts, true], [rings[rings.length - 1].pts, false]].forEach(([ring, flip]) => {
    const c = ring.reduce((m, q) => m.map((v, i) => v + q[i] / ring.length), [0, 0, 0]);
    ring.forEach((q, i) => (flip ? tri(hull, c, ring[(i + 1) % ring.length], q) : tri(hull, c, q, ring[(i + 1) % ring.length])));
  });
  // panel seams along the flanks and across the top
  [-330, -170, -20, 210].forEach(y => {
    const [, hw, z0, z1, ch] = sectionAt(y);
    [-1, 1].forEach(s => line(hull, [s * (hw + 0.4), y, z0 + ch], [s * (hw + 0.4), y, z1 - ch]));
    line(hull, [-(hw - ch), y, z1 + 0.4], [hw - ch, y, z1 + 0.4]);
  });
  // the tail's access door
  loop(hull, rrPts(0, 70, 55, 30, 6, 2).map(q => [q[0], 350.4, q[1]]));
}
// side armour: chamfered plates on both flanks, ahead of the turbines
const armour = part("Side Armour", "armour", "minor");
[[-320, -165], [-155, 30]].forEach(([y0, y1]) => [-1, 1].forEach(s => {
  const hw = sectionAt((y0 + y1) / 2)[1];
  withFrame(q => [s * q[2], q[0], q[1]], () => extrude(armour, rrRegion((y0 + y1) / 2, 70, (y1 - y0) / 2, 38, 10, 1), hw - 4, hw + 5));
  withFrame(q => [s * (hw + 5.3), q[0], q[1]], () => loop(armour, rrPts((y0 + y1) / 2, 70, (y1 - y0) / 2 - 12, 26, 6, 1).map(q => [...q, 0])));
}));

// ---------- dorsal deck, cockpit ----------
const deck = part("Dorsal Deck", "deck", "major");
rrBody(deck, 0, -10, 112, 250, 30, [[10, 132, true], [0, 142, true], [4, 150, true]], { seg: 2 });
for (let i = 0; i < 9; i++) loop(deck, rrPts(-32 + i * 8, -60, 2, 16, 1.9, 3).map(q => [...q, 150.4]));      // vent ahead of the cockpit
loop(deck, rrPts(-55, -170, 30, 40, 4, 2).map(q => [...q, 150.4]));                                          // hatches
loop(deck, rrPts(55, -170, 30, 40, 4, 2).map(q => [...q, 150.4]));
const COCKPIT = [0, 100];
const collar = part("Cockpit Collar", "cockpit", "major");
revolve(collar, ...COCKPIT, [[70, 150, true], [108, 150, true], [113, 162], [110, 175], [96, 184, true], [72, 184, true]], 56, true);
const pilot = part("Pilot Station", "cockpit", "minor");
extrude(pilot, rrRegion(0, 112, 18, 14, 3, 2), 150, 166);                       // seat
extrude(pilot, rrRegion(0, 128, 17, 4, 2, 2), 166, 200);                        // seat back
revolve(pilot, 0, 116, [[0, 198], [8, 199], [12, 207], [12, 214], [8, 221], [0, 223]], 24);   // helmet
extrude(pilot, rrRegion(0, 64, 30, 7, 2, 2), 150, 170);                         // console
cyl(pilot, 0, 86, 2.2, 150, 172, 12);                                            // control stick
const canopy = part("Canopy", "canopy", "major");
revolve(canopy, ...COCKPIT, [[72, 184, true], [71, 196], [66, 210], [56, 222], [41, 231], [22, 237], [0, 239]], 56);
// the canopy's frame
[0, 1, 2, 3].forEach(k => {
  const a = Math.PI / 4 + k * Math.PI / 2, pts = [[72, 184], [71, 196], [66, 210], [56, 222], [41, 231], [22, 237]];
  pts.forEach((q, i) => i && line(canopy, [COCKPIT[0] + pts[i - 1][0] * Math.cos(a) * 1.004, COCKPIT[1] + pts[i - 1][0] * Math.sin(a) * 1.004, pts[i - 1][1]],
    [COCKPIT[0] + q[0] * Math.cos(a) * 1.004, COCKPIT[1] + q[0] * Math.sin(a) * 1.004, q[1]]));
});

// ---------- nose ----------
const nose = part("Nose Sensor Bay", "nose", "minor");
withFrame(FY, () => {
  extrude(nose, rrRegion(0, 60, 45, 21, 4, 2, [[-37, 37, 46, 74]]), -456, -449);     // window frame
  extrude(nose, rect(-37, 37, 46, 74), -452, -449);                                 // window
  for (let x = -30; x <= 30; x += 10) line(nose, [x, 48, -452.3], [x, 72, -452.3]);
  [-62, 62].forEach(x => { cyl(nose, x, 52, 9, -458, -449, 20); loop(nose, circlePts(x, 52, 5, 20).map(q => [...q, -458.3])); });   // headlights
  [-40, -20, 20, 40].forEach(x => extrude(nose, rrRegion(x, 22, 6, 4, 1.5, 2), -428, -418));                                      // chin lights
});

// ---------- flank turbines ----------
[["port", -1], ["stbd", 1]].forEach(([side, s]) => {
  const name = side === "port" ? "Port" : "Starboard";
  const housing = part(name + " Turbine", side + "Turbine", "major");
  withFrame(q => [s * q[2], q[0], q[1]], () => {
    const outer = circlePts(TURBINE.y, TURBINE.z, 74, 48), inner = circlePts(TURBINE.y, TURBINE.z, 61, 48);
    extrude(housing, stripRegion([...outer, outer[0]], [...inner, inner[0]]), 148, 190);     // the duct
    cyl(housing, TURBINE.y, TURBINE.z, 61, 148, 152, 48);                                       // its back wall
    for (let k = 0; k < 12; k++) {                                                             // vents round the rim
      const a = 2 * Math.PI * k / 12;
      loop(housing, rrPts(TURBINE.y + 67.5 * Math.cos(a), TURBINE.z + 67.5 * Math.sin(a), 2.2, 2.2, 2, 2).map(q => [...q, 190.3]));
    }
  });
  const rotor = part(name + " Rotor", side + "Rotor", "minor", { spool: "turbine" });
  withFrame(q => [s * q[2], q[0], q[1]], () => {
    cyl(rotor, 0, 0, 18, -16, 14, 28);
    for (let k = 0; k < 9; k++) {
      const lead = [], trail = [];
      for (let i = 0; i <= 5; i++) {
        const r = 19 + 39 * i / 5, a = 2 * Math.PI * k / 9 + 0.5 * i / 5, w = 0.34 + 0.1 * i / 5;
        lead.push([r * Math.cos(a), r * Math.sin(a)]); trail.push([r * Math.cos(a - w), r * Math.sin(a - w)]);
      }
      extrude(rotor, stripRegion(lead, trail), 4, 8);
    }
  });
});

// ---------- outrigger beam, sensor mast, engine pods ----------
const beam = part("Outrigger Beam", "beam", "major");
rrBody(beam, 0, 330, 180, 30, 6, [[0, 205, true], [0, 231, true], [4, 235, true]], { seg: 2 });
rrBody(beam, 0, 330, 24, 24, 5, [[0, 118, true], [0, 205, true]], { seg: 2, top: false });      // pylon down to the hull
cyl(beam, 0, 330, 6, 235, 300, 16);                                                               // mast
const radar = part("Radar", "radar", "minor", { spool: "radar" });
cyl(radar, 0, 0, 14, 0, 20, 28);
extrude(radar, rrRegion(0, 0, 34, 5, 4, 2), 8, 16);
withFrame(FY, () => { cyl(radar, 30, 12, 7, -5.5, 5.5, 20); cyl(radar, -30, 12, 4, -5.5, 5.5, 16); });

[["port", -1], ["stbd", 1]].forEach(([side, s]) => {
  const name = side === "port" ? "Port" : "Starboard";
  const pod = part(name + " Engine Pod", side + "Pod", "major");
  const cx = s * 250, cz = 215;
  withFrame(FY, () => {
    rrBody(pod, cx, cz, 70, 65, 26, [[18, 182, true], [4, 196], [0, 212, true], [0, 466, true], [9, 482, true]], { seg: 5 });
    cyl(pod, cx, cz - 5, 40, 480, 500, 32);                                                     // nozzle
    [32, 22].forEach(r => loop(pod, circlePts(cx, cz - 5, r, 32).map(q => [...q, 500.3])));
    loop(pod, rrPts(cx, cz, 40, 36, 12, 3).map(q => [...q, 181.7]));                             // intake ring
  });
  // grille slots on top
  for (let i = 0; i < 10; i++) loop(pod, rrPts(cx + (i - 4.5) * 9, 280, 2, 60, 1.9, 3).map(q => [...q, cz + 65.3]));
  // the open hatch on the inboard side, its ribs showing
  withFrame(q => [cx - s * (70.3 + q[2]), q[0], q[1]], () => {
    loop(pod, rrPts(330, cz, 100, 40, 6, 2).map(q => [...q, 0]));
    for (let y = 242; y <= 418; y += 11) line(pod, [y, cz - 34, 0], [y, cz + 34, 0]);
  });
});

// ---------- underneath: fins and hover pads ----------
const fins = part("Ventral Fins", "fins", "major");
[-1, 1].forEach(s => withFrame(q => [s * q[2], q[0], q[1]], () =>
  extrude(fins, fanRegion([[240, 8], [300, -40], [380, -115], [420, -110], [432, -60], [330, 22]]), 91, 99)));
const pads = part("Hover Pads", "pads", "major");
[[-80, -250], [80, -250], [-80, 150], [80, 150]].forEach(([x, y]) => {
  extrude(pads, rrRegion(x, y, 50, 70, 22, 4), -10, 1);
  [0.7, 0.4].forEach(k => loop(pads, rrPts(x, y, 50 * k, 70 * k, 22 * k, 4).map(q => [...q, -10.3])));
});

// ---------- callouts and the "how it works" tour ----------
const BASES = { "Port Rotor": modules.portRotor.base, "Starboard Rotor": modules.stbdRotor.base, "Radar": RADAR };
const local = (name, p) => r3(p.map((c, i) => c - (BASES[name] || [0, 0, 0])[i]));
const hotspots = [
  ["Faceted hull", "Composite armour on a space frame", [0, -390, 123], ["Hull"]],
  ["Sensor bay", "Lidar, cameras and headlights", [0, -452.3, 60], ["Nose Sensor Bay"]],
  ["Canopy", "Single-piece, 360 degree view", [0, 100, 239], ["Canopy"]],
  ["Cockpit collar", "Armoured ring round the pilot", [-110, 100, 175], ["Cockpit Collar"]],
  ["Pilot station", "One seat, stick and console", [0, 116, 223], ["Pilot Station"]],
  ["Lift turbines", "Ducted rotors in both flanks", [190.3, 120, 140], ["Starboard Turbine", "Starboard Rotor", "Port Turbine", "Port Rotor"]],
  ["Engine pods", "Main thrust, on the outriggers", [250, 380, 280], ["Starboard Engine Pod", "Port Engine Pod"]],
  ["Outrigger beam", "Carries both pods and the mast", [-120, 330, 235], ["Outrigger Beam"]],
  ["Rotating sensor", "Sweeps the ground ahead", [0, 330, 320], ["Radar", "Outrigger Beam"]],
  ["Dorsal deck", "Vents and service hatches", [-70, -170, 150], ["Dorsal Deck"]],
  ["Side armour", "Bolt-on plates", [sectionAt(-240)[1] + 5, -240, 108], ["Side Armour"]],
  ["Ventral fins", "Keep it straight at speed", [99, 400, -80], ["Ventral Fins"]],
  ["Hover pads", "Four lift emitters", [80, -250, -10], ["Hover Pads"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    padA: pt("Hover Pads", [80, -250, -10]), padB: pt("Hover Pads", [80, 150, -10]), ground: pt("Hover Pads", [80, -50, -60]),
    turbine: pt("Starboard Rotor", [TURBINE.x, TURBINE.y, TURBINE.z]), duct: pt("Starboard Turbine", [190, 120, 72]), below: pt("Starboard Turbine", [210, 120, -20]),
    intake: pt("Starboard Engine Pod", [250, 181, 215]), nozzle: pt("Starboard Engine Pod", [250, 500, 210]), wake: pt("Starboard Engine Pod", [250, 580, 210]),
    hullCore: pt("Hull", [0, 260, 70]), beamMid: pt("Outrigger Beam", [0, 330, 220]), beamEnd: pt("Outrigger Beam", [180, 330, 220]),
    radar: pt("Radar", [0, 330, 310]), nose: pt("Nose Sensor Bay", [0, -452, 60]), ahead: pt("Nose Sensor Bay", [0, -560, 40]),
    pilot: pt("Pilot Station", [0, 116, 210]), stick: pt("Pilot Station", [0, 86, 172]),
  },
  steps: [
    { t: "It floats", focus: "padA", dist: 0.5, ex: 0, p: ["padA", "ground", "padB"], n: ["Hover Pads", "Hull"], ms: 4200,
      d: "Four emitters under the hull push against the ground, holding the hauler steady about a metre up whatever the load." },
    { t: "The turbines trim and steer", focus: "turbine", dist: 0.4, ex: 0, p: ["duct", "turbine", "below"], n: ["Starboard Turbine", "Starboard Rotor", "Port Turbine", "Port Rotor"], ms: 4200,
      d: "A ducted rotor in each flank pushes air down and out. Speeding one up and slowing the other turns the hauler, and both together lift it over rough ground." },
    { t: "Power from the core", focus: "beamMid", dist: 0.5, ex: 0, p: ["hullCore", "beamMid", "beamEnd"], n: ["Hull", "Outrigger Beam"], ms: 4200,
      d: "A power cell in the tail of the hull feeds both engine pods through the outrigger beam, and the beam's pylon carries the cables up out of the hull." },
    { t: "The pods push it along", focus: "nozzle", dist: 0.5, ex: 0, p: ["intake", "nozzle", "wake"], n: ["Starboard Engine Pod", "Port Engine Pod"], ms: 4400,
      d: "Each pod draws air in at the front, heats and compresses it, and throws it out of the nozzle at the back. The open hatches show the cooling ribs inside." },
    { t: "Eyes all round", focus: "radar", dist: 0.4, ex: 0, p: ["radar", "nose", "ahead"], n: ["Radar", "Nose Sensor Bay"], ms: 4200,
      d: "The sensor head on the mast sweeps all the way round, and the nose bay's lidar and cameras map the ground just ahead, so the pads know what's coming." },
    { t: "One pilot", focus: "pilot", dist: 0.32, ex: 0, p: ["stick", "pilot"], n: ["Pilot Station", "Canopy", "Cockpit Collar"], ms: 4200,
      d: "The pilot sits high in the armoured collar under a one-piece canopy, with a clear view in every direction, and flies with a single stick." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("HV9_GEOMETRY", "hover/build.js", { explode: modules, hotspots, tour, constants: { SECTIONS } });
// the X9 page's chrome and engine (no screen), with this model's geometry and script
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>HV-9 Hover Hauler</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the HV-9 hover hauler, a futuristic hover vehicle with its lift turbines and sensor turning: on hover the canopy, cockpit, deck, turbines, engine pods, fins and hover pads come apart\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Vehicle parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>HV-9</b><span>Hover hauler</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG HV9-001 &middot; Rev A<br>Units cm &middot; View az 45&deg; / el 26&deg;<br>Concept design</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
// a group of its own at the end of the list
const count = addToGallery({ id: "hover", label: "HV-9 Hover Hauler", kind: "vehicle", tags: "vehicle hover hovercraft futuristic sci-fi spaceship ship hauler",
  key: "hv9-theme", category: "Vehicles", html }, "turbofan");
console.log(`hover/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
