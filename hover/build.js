/*
HV-9 hover hauler: builds the model page and adds it to the gallery.

A concept vehicle after a sketch, generated in code (with lib/procedural.js) in centimetres: Y along its
length with the nose at -Y (towards the default view), X across it, Z up from the ground it floats over.
The hull is lofted through rounded sections (superellipses) that swell, round off at a blunt nose and
taper at the tail, so its outline curves like the sketch's; panel lines follow the same surface. On it sit
a domed canopy in a fat ring collar, a spine fairing up to the outrigger beam, a drum-shaped lift turbine
half sunk into each flank, and two capsule engine pods on the beam with a sensor mast between them; fins
and hover pads underneath. The turbines' rotors and the mast's sensor head are modules of their own, based
at their axes, so the page can spin them in place. The page's chrome and the shared engine come from the
X9 page already in the gallery. Re-run after any change:

    node hover/build.js

Writes hover/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, tri, loop, rrPts, circlePts, rrRegion, rect, fanRegion, stripRegion, extrude, loft, rrBody, cyl,
  revolve, sweep, r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
// faces drawn in another plane: FY draws in (x, z) and pushes along y; FX draws in (y, z) and pushes along x
const FY = q => [q[0], q[2], q[1]];
const FX = q => [q[2], q[0], q[1]];

// ---------- the hull's shape ----------
// in plan: a blunt, rounded nose, full width amidships, a rounded taper to the tail; in section: a
// superellipse, a box with generously rounded corners, whose top and bottom lift towards both ends
const Y0 = -470, Y1 = 360, N = 3.2, M = 36;   // nose, tail, section roundness, points round a section
function hullAt(y) {
  if (y < -330) {
    const t = Math.min(1, (-330 - y) / (-330 - Y0)), c = Math.sqrt(1 - t * t);
    return { hw: 150 * (0.55 + 0.45 * c), zb: 30 * (1 - c), zt: 140 - 50 * (1 - c) };
  }
  if (y > 250) {
    const t = (y - 250) / (Y1 - 250);
    return { hw: 150 - 40 * t * t, zb: 24 * t * t, zt: 140 - 26 * t * t };
  }
  const b = 1 - ((y + 40) / 290) ** 2;   // a slight swell amidships
  return { hw: 150 + 4 * Math.max(0, b), zb: 0, zt: 140 };
}
const se = v => Math.sign(v) * Math.abs(v) ** (2 / N);
// a point on the hull: k counts round the section from the right-hand side (k = 0), up over the top
function hullPt(y, k, grow = 0) {
  const { hw, zb, zt } = hullAt(y), a = 2 * Math.PI * k / M, zc = (zb + zt) / 2, hh = (zt - zb) / 2;
  return [(hw + grow) * se(Math.cos(a)), y, zc + (hh + grow) * se(Math.sin(a))];
}
// the top of the hull at (x, y), for laying lines on it
function topZ(x, y) {
  const { hw, zb, zt } = hullAt(y), zc = (zb + zt) / 2, hh = (zt - zb) / 2;
  return zc + hh * Math.max(0, 1 - Math.abs(x / hw) ** N) ** (1 / N);
}
// the flank's distance out from the centre line at height z
function sideX(y, z) {
  const { hw, zb, zt } = hullAt(y), zc = (zb + zt) / 2, hh = (zt - zb) / 2;
  return hw * Math.max(0, 1 - Math.abs((z - zc) / hh) ** N) ** (1 / N);
}
const onTop = (pts, lift = 0.6) => pts.map(([x, y]) => [x, y, topZ(x, y) + lift]);
// a line drawn over the top, sampled so it follows the curve
function topLine(p, a, b, n = 12) {
  const pts = Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
  onTop(pts).forEach((q, i, all) => i && line(p, all[i - 1], q));
}

// spinning parts: each its own module, based at its axis
const TURBINE = { y: 120, z: 72, x: 168 };
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
  const STATIONS = [-470, -468, -464, -457, -447, -434, -418, -399, -378, -355, -330, -250, -150, -40, 60, 160, 250, 280, 305, 325, 342, 355, 360];
  const SEAMS = [-470, -418, -330, 250, 360];
  const rings = STATIONS.map(y => ({ hard: SEAMS.includes(y), pts: Array.from({ length: M }, (_, k) => hullPt(y, k)) }));
  // the nose's face domes forward a little before it closes
  const tip = rings[0].pts.map(q => [q[0] * 0.72, Y0 - 3, 60 + (q[2] - 60) * 0.72]);
  loft(hull, [{ pts: tip }, ...rings]);
  const fan = (ring, c, flip) => ring.forEach((q, i) => (flip ? tri(hull, c, ring[(i + 1) % M], q) : tri(hull, c, q, ring[(i + 1) % M])));
  fan(tip, [0, Y0 - 4, 60], true);
  fan(rings[rings.length - 1].pts, [0, Y1, 70], false);
  // panel lines along the length: the shoulders over the top and a waist line down each flank
  [4, 14, 19, 35].forEach(k => rings.forEach((r, i) => i && rings[i - 1].pts[k] && line(hull, rings[i - 1].pts[k], r.pts[k])));
  // the hood: a hatch, and the facets running back from the nose
  loop(hull, onTop([...rrPts(0, -380, 42, 30, 8, 3)]));
  [-1, 1].forEach(s => { topLine(hull, [s * 70, -440], [s * 50, -330]); topLine(hull, [s * 50, -330], [s * 62, -200]); });
  topLine(hull, [-50, -330], [50, -330]);
  // the tail's access door
  loop(hull, rrPts(0, 70, 50, 26, 8, 3).map(q => [q[0], Y1 + 0.4, q[1]]));
}

// side armour: plates with rounded corners on both flanks, ahead of the turbines
const armour = part("Side Armour", "armour", "minor");
[[-320, -165], [-150, 30]].forEach(([y0, y1]) => [-1, 1].forEach(s => {
  withFrame(q => [s * q[2], q[0], q[1]], () => {
    extrude(armour, rrRegion((y0 + y1) / 2, 70, (y1 - y0) / 2, 32, 14, 4), 146, 155);
    loop(armour, rrPts((y0 + y1) / 2, 70, (y1 - y0) / 2 - 12, 20, 8, 3).map(q => [...q, 155.3]));
  });
}));

// the ribbed skirt along the bottom of each flank, from the nose to the turbines
const skirt = part("Side Skirts", "armour", "minor");
[-1, 1].forEach(s => {
  const ys = []; for (let y = -400; y <= 40; y += 20) ys.push(y);
  const along = ys.map(y => [s * (sideX(y, 24) + 2), y, 24]);
  sweep(skirt, s > 0 ? along : along.slice().reverse(), rrPts(0, 0, 6, 9, 5.9, 4));
  ys.slice(1, -1).forEach(y => { const x = s * (sideX(y, 24) + 8.4); line(skirt, [x, y, 17], [x, y, 31]); });
});

// ---------- dorsal deck, spine fairing, cockpit ----------
const deck = part("Dorsal Deck", "deck", "major");
rrBody(deck, 0, -40, 108, 210, 46, [[0, 128, true], [0, 140], [3, 146], [9, 150, true]], { seg: 6 });
for (let i = 0; i < 9; i++) loop(deck, rrPts(-32 + i * 8, -40, 2, 16, 1.9, 3).map(q => [...q, 150.4]));      // vent ahead of the cockpit
[-1, 1].forEach(s => loop(deck, rrPts(s * 52, -170, 28, 36, 8, 3).map(q => [...q, 150.4])));                 // hatches
// the fairing that rises from behind the cockpit to the beam's pylon
withFrame(FY, () => {
  const sec = [[190, 50, 132, 152], [225, 46, 132, 166], [255, 40, 132, 182], [280, 34, 132, 196], [300, 30, 132, 206]];
  const rings = sec.map(([y, hw, z0, z1], i) => ({ hard: i === 0 || i === sec.length - 1,
    pts: rrPts(0, (z0 + z1) / 2, hw, (z1 - z0) / 2, Math.min(14, (z1 - z0) / 2 - 1), 4).map(q => [q[0], q[1], y]) }));
  loft(deck, rings);
  [rings[0].pts, rings[rings.length - 1].pts].forEach((ring, e) => {
    const c = ring.reduce((m, q) => m.map((v, i) => v + q[i] / ring.length), [0, 0, 0]);
    ring.forEach((q, i) => (e ? tri(deck, c, q, ring[(i + 1) % ring.length]) : tri(deck, c, ring[(i + 1) % ring.length], q)));
  });
});
const COCKPIT = [0, 100];
const collar = part("Cockpit Collar", "cockpit", "major");
// a stepped base on the deck, then a fat round ring
revolve(collar, ...COCKPIT, [[94, 148, true], [124, 148, true], [129, 151], [128, 155], [118, 158, true], [94, 158, true]], 64, true);
revolve(collar, ...COCKPIT, Array.from({ length: 16 }, (_, i) => {
  const a = 2 * Math.PI * i / 16;
  return [92 + 21 * Math.cos(a), 174 + 16 * Math.sin(a)];
}), 64, true);
const pilot = part("Pilot Station", "cockpit", "minor");
extrude(pilot, rrRegion(0, 112, 18, 14, 4, 3), 152, 168);                     // seat
extrude(pilot, rrRegion(0, 128, 17, 4, 3, 2), 168, 202);                      // seat back
revolve(pilot, 0, 116, [[0, 200], [7, 201], [11, 206], [12, 212], [11, 218], [7, 223], [0, 224]], 24);   // helmet
extrude(pilot, rrRegion(0, 62, 30, 7, 3, 2), 152, 172);                       // console
cyl(pilot, 0, 86, 2.2, 152, 174, 12);                                          // control stick
const canopy = part("Canopy", "canopy", "major");
const DOME = Array.from({ length: 10 }, (_, i) => {
  const a = Math.PI / 2 * i / 9;
  return [72 * Math.cos(a), 186 + 52 * Math.sin(a)];
});
revolve(canopy, ...COCKPIT, DOME.map(([r, z], i) => [Math.max(r, 0), z, i === 0]), 64);
// the canopy's frame: four arches and a ring
[0, 1, 2, 3].forEach(k => {
  const a = Math.PI / 4 + k * Math.PI / 2;
  DOME.forEach((q, i) => i && line(canopy, [COCKPIT[0] + DOME[i - 1][0] * 1.006 * Math.cos(a), COCKPIT[1] + DOME[i - 1][0] * 1.006 * Math.sin(a), DOME[i - 1][1] + 0.3],
    [COCKPIT[0] + q[0] * 1.006 * Math.cos(a), COCKPIT[1] + q[0] * 1.006 * Math.sin(a), q[1] + 0.3]));
});
loop(canopy, circlePts(...COCKPIT, DOME[4][0] * 1.006, 64).map(q => [...q, DOME[4][1] + 0.3]));

// ---------- nose ----------
const nose = part("Nose Sensor Bay", "nose", "minor");
const FACE = Y0 - 3;   // the nose's face
withFrame(FY, () => {
  extrude(nose, rrRegion(0, 62, 50, 21, 9, 4, [[-42, 42, 47, 77]]), FACE - 6, FACE + 4);   // window frame
  extrude(nose, rrRegion(0, 62, 42, 15, 6, 4), FACE - 2, FACE + 4);                       // window, set back in the frame
  for (let x = -32; x <= 32; x += 8) line(nose, [x, 50, FACE - 2.3], [x, 74, FACE - 2.3]);
  [-54, 54].forEach(x => { cyl(nose, x, 38, 8, FACE - 6, FACE + 6, 24); loop(nose, circlePts(x, 38, 4.5, 24).map(q => [...q, FACE - 6.3])); });   // headlights
});
revolve(nose, 0, -432, [[0, 0], [7, 1.5], [11, 5], [13, 10], [11, 15], [7, 18.5], [0, 20]], 24);   // chin sensor ball
[-1, 1].forEach(s => withFrame(FY, () => extrude(nose, rrRegion(s * 32, 26, 9, 4, 3, 3), -455, -440)));   // chin lights

// ---------- flank turbines: drums half sunk into the hull ----------
[["port", -1], ["stbd", 1]].forEach(([side, s]) => {
  const name = side === "port" ? "Port" : "Starboard";
  const housing = part(name + " Turbine", side + "Turbine", "major");
  // a rounded tyre-like rim, turned about the axis across the vehicle
  withFrame(q => [s * q[2], q[0], q[1]], () => {
    revolve(housing, TURBINE.y, TURBINE.z, [[60, 144, true], [74, 144, true], [79, 150], [81, 160], [81, 176], [78, 186], [72, 191, true], [61, 191, true]], 56);
    cyl(housing, TURBINE.y, TURBINE.z, 61, 144, 150, 48);                                       // the back wall
    for (let k = 0; k < 12; k++) {                                                             // bolts round the rim
      const a = 2 * Math.PI * k / 12;
      loop(housing, circlePts(TURBINE.y + 66.5 * Math.cos(a), TURBINE.z + 66.5 * Math.sin(a), 1.8, 10).map(q => [...q, 191.4]));
    }
  });
  const rotor = part(name + " Rotor", side + "Rotor", "minor", { spool: "turbine" });
  withFrame(q => [s * q[2], q[0], q[1]], () => {
    revolve(rotor, 0, 0, [[0, -14], [12, -14], [18, -10], [19, 4], [16, 12], [8, 16], [0, 17]], 32);   // the hub's nose cone
    for (let k = 0; k < 9; k++) {
      const lead = [], trail = [];
      for (let i = 0; i <= 6; i++) {
        const r = 18 + 40 * i / 6, a = 2 * Math.PI * k / 9 + 0.55 * i / 6, w = 0.34 + 0.12 * i / 6;
        lead.push([r * Math.cos(a), r * Math.sin(a)]); trail.push([r * Math.cos(a - w), r * Math.sin(a - w)]);
      }
      extrude(rotor, stripRegion(lead, trail), 2, 6);
    }
  });
});

// ---------- outrigger beam, sensor mast, engine pods ----------
const beam = part("Outrigger Beam", "beam", "major");
withFrame(FX, () => rrBody(beam, 330, 220, 30, 15, 12, [[8, -182, true], [2, -178], [0, -172], [0, 172], [2, 178], [8, 182, true]], { seg: 4 }));
rrBody(beam, 0, 330, 26, 26, 12, [[0, 118, true], [0, 205, true]], { seg: 4, top: false });   // pylon down into the fairing
cyl(beam, 0, 330, 6, 235, 300, 16);                                                           // mast
const radar = part("Radar", "radar", "minor", { spool: "radar" });
revolve(radar, 0, 0, [[0, 0], [12, 0], [15, 4], [15, 16], [12, 20], [0, 20]], 28);
extrude(radar, rrRegion(0, 0, 34, 5, 4.5, 3), 8, 16);
withFrame(FY, () => { cyl(radar, 30, 12, 7, -5.5, 5.5, 20); cyl(radar, -30, 12, 4, -5.5, 5.5, 16); });

// capsules: a rounded section with ends that round off on a quarter circle
const POD = { hw: 66, hh: 62, r: 32, y0: 180, y1: 486, end: 26 };
const podProfile = () => {
  const out = [];
  for (let i = 0; i <= 5; i++) { const a = Math.PI / 2 * i / 5; out.push([POD.end * (1 - Math.sin(a)), POD.y0 + POD.end * (1 - Math.cos(a)), i === 0]); }
  for (let i = 5; i >= 0; i--) { const a = Math.PI / 2 * i / 5; out.push([POD.end * (1 - Math.sin(a)), POD.y1 - POD.end * (1 - Math.cos(a)), i === 0]); }
  return out;
};
[["port", -1], ["stbd", 1]].forEach(([side, s]) => {
  const name = side === "port" ? "Port" : "Starboard";
  const pod = part(name + " Engine Pod", side + "Pod", "major");
  const cx = s * 250, cz = 215;
  withFrame(FY, () => {
    rrBody(pod, cx, cz, POD.hw, POD.hh, POD.r, podProfile(), { seg: 6 });
    // a bell nozzle at the back, and the intake ring at the front
    revolve(pod, cx, cz - 4, [[28, POD.y1 - 4, true], [36, POD.y1 + 2], [41, POD.y1 + 12], [43, POD.y1 + 22, true], [36, POD.y1 + 22, true]], 40);
    loop(pod, rrPts(cx, cz, 36, 32, 16, 4).map(q => [...q, POD.y0 - 0.4]));
    loop(pod, rrPts(cx, cz, 24, 20, 10, 4).map(q => [...q, POD.y0 - 0.4]));
  });
  // grille slots along the top
  for (let i = 0; i < 9; i++) loop(pod, rrPts(cx + (i - 4) * 9, 300, 2, 64, 1.9, 3).map(q => [...q, cz + POD.hh + 0.4]));
  // the open hatch on the inboard side, its ribs showing
  withFrame(q => [cx - s * (POD.hw + 0.4 + q[2]), q[0], q[1]], () => {
    loop(pod, rrPts(330, cz, 104, 38, 10, 3).map(q => [...q, 0]));
    for (let y = 240; y <= 420; y += 10) line(pod, [y, cz - 30, 0], [y, cz + 30, 0]);
  });
});

// ---------- underneath: canted fins and hover pads ----------
const fins = part("Ventral Fins", "fins", "major");
[-1, 1].forEach(s => withFrame(q => [s * (92 + q[2] - q[1] * 0.36), q[0], q[1]], () =>
  extrude(fins, fanRegion([[240, 14], [300, -40], [380, -112], [416, -112], [432, -66], [330, 24]]), 0, 7)));
const pads = part("Hover Pads", "pads", "major");
[[-80, -250], [80, -250], [-80, 150], [80, 150]].forEach(([x, y]) => {
  rrBody(pads, x, y, 50, 70, 24, [[4, -10, true], [0, -7], [0, 1, true]], { seg: 5 });
  [0.7, 0.4].forEach(k => loop(pads, rrPts(x, y, 50 * k, 70 * k, 24 * k, 5).map(q => [...q, -10.3])));
});

// ---------- callouts and the "how it works" tour ----------
const BASES = { "Port Rotor": modules.portRotor.base, "Starboard Rotor": modules.stbdRotor.base, "Radar": RADAR };
const local = (name, p) => r3(p.map((c, i) => c - (BASES[name] || [0, 0, 0])[i]));
const hotspots = [
  ["Hull", "Composite skin on a space frame", [0, -300, topZ(0, -300)], ["Hull"]],
  ["Sensor bay", "Lidar, cameras and headlights", [0, FACE - 6, 64], ["Nose Sensor Bay"]],
  ["Canopy", "Single-piece, 360 degree view", [0, 100, 238], ["Canopy"]],
  ["Cockpit collar", "Armoured ring round the pilot", [-113, 100, 174], ["Cockpit Collar"]],
  ["Pilot station", "One seat, stick and console", [0, 116, 224], ["Pilot Station"]],
  ["Lift turbines", "Ducted rotors in both flanks", [191.4, 120, 140], ["Starboard Turbine", "Starboard Rotor", "Port Turbine", "Port Rotor"]],
  ["Engine pods", "Main thrust, on the outriggers", [250, 380, 215 + POD.hh], ["Starboard Engine Pod", "Port Engine Pod"]],
  ["Outrigger beam", "Carries both pods and the mast", [-120, 330, 235], ["Outrigger Beam"]],
  ["Rotating sensor", "Sweeps the ground ahead", [0, 330, 320], ["Radar", "Outrigger Beam"]],
  ["Dorsal deck", "Vents, hatches and the spine", [-52, -170, 150], ["Dorsal Deck"]],
  ["Side armour", "Bolt-on plates", [155.3, -240, 98], ["Side Armour"]],
  ["Ventral fins", "Keep it straight at speed", [130, 400, -80], ["Ventral Fins"]],
  ["Hover pads", "Four lift emitters", [80, -250, -10], ["Hover Pads"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    padA: pt("Hover Pads", [80, -250, -10]), padB: pt("Hover Pads", [80, 150, -10]), ground: pt("Hover Pads", [80, -50, -60]),
    turbine: pt("Starboard Rotor", [TURBINE.x, TURBINE.y, TURBINE.z]), duct: pt("Starboard Turbine", [191, 120, 72]), below: pt("Starboard Turbine", [210, 120, -20]),
    intake: pt("Starboard Engine Pod", [250, POD.y0, 215]), nozzle: pt("Starboard Engine Pod", [250, POD.y1 + 22, 211]), wake: pt("Starboard Engine Pod", [250, 600, 211]),
    hullCore: pt("Hull", [0, 260, 70]), beamMid: pt("Outrigger Beam", [0, 330, 220]), beamEnd: pt("Outrigger Beam", [182, 330, 220]),
    radar: pt("Radar", [0, 330, 310]), nose: pt("Nose Sensor Bay", [0, FACE - 6, 64]), ahead: pt("Nose Sensor Bay", [0, -580, 40]),
    pilot: pt("Pilot Station", [0, 116, 212]), stick: pt("Pilot Station", [0, 86, 174]),
  },
  steps: [
    { t: "It floats", focus: "padA", dist: 0.5, ex: 0, p: ["padA", "ground", "padB"], n: ["Hover Pads", "Hull"], ms: 4200,
      d: "Four emitters under the hull push against the ground, holding the hauler steady about a metre up whatever the load." },
    { t: "The turbines trim and steer", focus: "turbine", dist: 0.4, ex: 0, p: ["duct", "turbine", "below"], n: ["Starboard Turbine", "Starboard Rotor", "Port Turbine", "Port Rotor"], ms: 4200,
      d: "A ducted rotor in each flank pushes air down and out. Speeding one up and slowing the other turns the hauler, and both together lift it over rough ground." },
    { t: "Power from the core", focus: "beamMid", dist: 0.5, ex: 0, p: ["hullCore", "beamMid", "beamEnd"], n: ["Hull", "Outrigger Beam", "Dorsal Deck"], ms: 4200,
      d: "A power cell in the tail of the hull feeds both engine pods. The cables rise through the spine fairing and the beam's pylon, and out along the beam." },
    { t: "The pods push it along", focus: "nozzle", dist: 0.5, ex: 0, p: ["intake", "nozzle", "wake"], n: ["Starboard Engine Pod", "Port Engine Pod"], ms: 4400,
      d: "Each pod draws air in at the front ring, heats and compresses it, and throws it out of the bell nozzle at the back. The open hatches show the cooling ribs inside." },
    { t: "Eyes all round", focus: "radar", dist: 0.4, ex: 0, p: ["radar", "nose", "ahead"], n: ["Radar", "Nose Sensor Bay"], ms: 4200,
      d: "The sensor head on the mast sweeps all the way round, and the nose's lidar, cameras and chin sensor map the ground just ahead, so the pads know what's coming." },
    { t: "One pilot", focus: "pilot", dist: 0.32, ex: 0, p: ["stick", "pilot"], n: ["Pilot Station", "Canopy", "Cockpit Collar"], ms: 4200,
      d: "The pilot sits high in the ring collar under a one-piece canopy, with a clear view in every direction, and flies with a single stick." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("HV9_GEOMETRY", "hover/build.js", { explode: modules, hotspots, tour, constants: { Y0, Y1, N } });
// the X9 page's chrome and engine (no screen), with this model's geometry and script
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>HV-9 Hover Hauler</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the HV-9 hover hauler, a futuristic hover vehicle with its lift turbines and sensor turning: on hover the canopy, cockpit, deck, turbines, engine pods, fins and hover pads come apart\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Vehicle parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>HV-9</b><span>Hover hauler</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG HV9-001 &middot; Rev B<br>Units cm &middot; View az 45&deg; / el 26&deg;<br>Concept design</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
// a group of its own at the end of the list
const count = addToGallery({ id: "hover", label: "HV-9 Hover Hauler", kind: "vehicle", tags: "vehicle hover hovercraft futuristic sci-fi spaceship ship hauler",
  key: "hv9-theme", category: "Vehicles", html }, "turbofan");
console.log(`hover/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
