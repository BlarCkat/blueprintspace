/*
SX-7 Starhopper, an original spaceship design: builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in cm: X across, Y back from the nose (the nose points -Y, towards the
default view), Z up; 15 m long, 13 m across the wings, standing on three legs. The hull is lofted from
superellipse sections and split at its waterline, so the top lifts away from the decks inside: cockpit, crew
cabin, reactor and fuel tanks. Two engine nacelles hang from the wings, each with a fan you can see turning in its
intake; the landing legs are modules of their own, based at their hinges, so the page can fold them up into the
hull and down again.

    node spaceship/build.js

Writes spaceship/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, tri, rrPts, circlePts, rrRegion, rect, polyRegion, stripRegion, extrude, loft, rrBody, cyl, revolve, tube,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y; a revolve's axis runs along y
const FX = q => [q[2], q[0], q[1]];   // draws in (y, z) and pushes along x
const ZC = 130, GROUND = -90;

// ---------- the hull: superellipse sections along the length, split at the waterline ----------
// [y, half width, height above the waterline, depth below it, waterline height]
const KEY = [[-760, 4, 3, 3, 120], [-700, 48, 36, 30, 124], [-600, 98, 72, 56, 129], [-450, 142, 110, 76, 133],
  [-250, 165, 124, 90, 133], [0, 170, 128, 95, 130], [250, 165, 124, 95, 130], [450, 150, 110, 90, 130], [600, 126, 90, 80, 130]];
const lerpKey = y => {
  // Catmull-Rom through the key sections, per column
  let i = 0; while (i < KEY.length - 2 && KEY[i + 1][0] < y) i++;
  const P = k => KEY[Math.max(0, Math.min(KEY.length - 1, k))], a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
  const t = (y - b[0]) / (c[0] - b[0]);
  return b.map((_, j) => j === 0 ? y : 0.5 * ((2 * b[j]) + (-a[j] + c[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t * t + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * t * t * t));
};
const SE = 2 / 2.6;
const sp = v => Math.sign(v) * Math.pow(Math.abs(v), SE);
const hullPt = (y, a) => { const [, w, ht, hb, zc] = lerpKey(y), c = Math.cos(a), s = Math.sin(a); return [w * sp(c), y, zc + (s >= 0 ? ht : hb) * sp(s)]; };
const STATIONS = Array.from({ length: 41 }, (_, i) => -760 + 1360 * (i / 40) ** 1.15);
const K = 24;
function hull(name, mod, a0, a1) {
  const p = part(name, mod, "major");
  const rings = STATIONS.map((y, i) => ({ hard: i === 0 || i === STATIONS.length - 1 || i % 6 === 0, pts: Array.from({ length: K + 1 }, (_, k) => hullPt(y, a0 + (a1 - a0) * k / K)) }));
  loft(p, rings);
  const nose = rings[0].pts, tail = rings[rings.length - 1].pts;
  const tip = [0, -770, 120], tc = [0, 600, ZC];
  nose.forEach((q, i) => i < nose.length - 1 && tri(p, tip, nose[i + 1], q));
  tail.forEach((q, i) => i < tail.length - 1 && tri(p, tc, q, tail[i + 1]));
  return p;
}
hull("Upper Hull", "upper", 0, Math.PI);
hull("Lower Hull", "lower", Math.PI, 2 * Math.PI);

// the canopy: a glass bulge over the nose
const canopy = part("Canopy", "upper", "major");
{
  const A0 = 40 * Math.PI / 180, A1 = Math.PI - A0, s0 = Math.sin(A0);
  const rings = [];
  for (let i = 0; i <= 14; i++) {
    const y = -630 + 290 * i / 14, B = 52 * Math.pow(Math.sin(Math.PI * i / 14), 0.8);
    rings.push({ hard: i === 0 || i === 14 || i % 4 === 2, pts: Array.from({ length: 13 }, (_, k) => {
      const a = A0 + (A1 - A0) * k / 12, q = hullPt(y, a);
      return [q[0] * (1 - 0.05 * B / 52), q[1], q[2] + B * Math.max(0, (Math.sin(a) - s0) / (1 - s0)) + 0.6];
    }) });
  }
  loft(canopy, rings);
  [3, 6, 9].forEach(k => loop(canopy, rings.map(r => r.pts[k])));   // the frame's ribs
}
const windows = part("Windows", "upper", "minor");
for (let y = -360; y <= -140; y += 55) [-1, 1].forEach(s => {
  const q = hullPt(y, s > 0 ? 0.32 : Math.PI - 0.32);
  withFrame(FX, () => loop(windows, circlePts(y, q[2], 11, 16).map(c => [...c, q[0] + s * 1.5])));
});
const sensor = part("Sensor Dome", "upper", "minor");
{
  const top = hullPt(-150, Math.PI / 2)[2];
  revolve(sensor, 0, -150, [[34, top - 6, true], [34, top + 8], [26, top + 18], [0, top + 22]], 32);
  line(sensor, [0, -150, top + 22], [0, -150, top + 70]); line(sensor, [-12, -150, top + 58], [12, -150, top + 58]);
}
const rcs = part("RCS Thrusters", "upper", "minor");
[[-560, 0], [520, 0]].forEach(([y]) => [-1, 1].forEach(s => {
  const q = hullPt(y, s > 0 ? 0.05 : Math.PI - 0.05);
  withFrame(FX, () => {
    extrude(rcs, rrRegion(y, q[2] + 6, 16, 10, 3, 3), q[0] - s * 8, q[0] + s * 8);
    [-8, 0, 8].forEach(dy => loop(rcs, circlePts(y + dy, q[2] + 6, 2.5, 10).map(c => [...c, q[0] + s * 8.05])));
  });
}));

// ---------- the dorsal fin and the main engine ----------
const fin = part("Dorsal Fin", "fin", "major");
withFrame(FX, () => {
  extrude(fin, polyRegion([[240, 235], [560, 200], [655, 430], [585, 430]]), -6, 6);
  line(fin, [300, 236, 6.05], [600, 410, 6.05]);
});
const engine = part("Main Engine", "main", "major");
withFrame(FY, () => {
  revolve(engine, 0, ZC, [[66, 560, true], [74, 610], [84, 660], [100, 720, true], [96, 722, true], [72, 640]], 48);
  for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; line(engine, [74 * Math.cos(a), ZC + 74 * Math.sin(a), 610], [100 * Math.cos(a), ZC + 100 * Math.sin(a), 720]); }
});
const mainGlow = part("Main Engine Glow", "main", "minor");
withFrame(FY, () => revolve(mainGlow, 0, ZC, [[0, 650], [72, 650, true]], 48));

// ---------- the wings ----------
const WING = [[140, -150, 480, 42, 92], [300, -10, 488, 34, 100], [480, 160, 494, 24, 110], [640, 330, 500, 14, 120]];   // x, LE y, TE y, thickness, height
function wing(s) {
  const mod = s < 0 ? "wingL" : "wingR", p = part(s < 0 ? "Left Wing" : "Right Wing", mod, "major");
  const U = 14, rings = WING.map(([x, le, te, t, z], i) => {
    const top = [], bot = [];
    for (let k = 0; k <= U; k++) {
      const u = k / U, y = le + (te - le) * (1 - Math.cos(Math.PI * u)) / 2, cu = (1 - Math.cos(Math.PI * u)) / 2;
      const th = t * 2.6 * Math.sqrt(Math.max(cu, 0)) * (1 - cu);   // a teardrop: round leading edge, sharp trailing edge
      top.push([s * x, y, z + th * 0.65]); bot.push([s * x, y, z - th * 0.35]);
    }
    return { hard: i === 0 || i === WING.length - 1, pts: [...top, ...bot.slice(1, -1).reverse()] };
  });
  loft(p, rings);
  const tipR = rings[rings.length - 1].pts, c = tipR.reduce((m, q) => m.map((v, j) => v + q[j] / tipR.length), [0, 0, 0]);
  tipR.forEach((q, i) => tri(p, c, q, tipR[(i + 1) % tipR.length]));
  withFrame(FX, () => extrude(p, polyRegion([[330, 116], [500, 116], [545, 262], [458, 262]]), s * 642 - 6, s * 642 + 6));   // the winglet
  const nav = part(s < 0 ? "Port Light" : "Starboard Light", mod, "minor");
  revolve(nav, s * 642, 500, [[0, 272], [6, 266], [6, 262, true]], 16);
}
wing(-1);
wing(1);

// ---------- the nacelles and their fans ----------
const NAC = 270, NZ = 66, FAN_Y = 165;
function nacelle(s) {
  const mod = s < 0 ? "nacL" : "nacR", p = part(s < 0 ? "Left Nacelle" : "Right Nacelle", mod, "major");
  withFrame(FY, () => {
    revolve(p, s * NAC, NZ, [[50, 128, true], [58, 120, true], [64, 140], [68, 200, true], [68, 560], [64, 640, true], [56, 700, true], [50, 700, true], [56, 640]], 48);
    [300, 420, 540].forEach(y => loop(p, circlePts(s * NAC, NZ, 68.4, 48).map(q => [...q, y])));   // panel seams
    for (let k = 0; k < 18; k++) { const a = k * Math.PI / 9; line(p, [s * NAC + 50 * Math.cos(a), NZ + 50 * Math.sin(a), 700], [s * NAC + 56 * Math.cos(a), NZ + 56 * Math.sin(a), 640]); }
  });
  const glow = part(s < 0 ? "Left Engine Glow" : "Right Engine Glow", mod, "minor");
  withFrame(FY, () => revolve(glow, s * NAC, NZ, [[0, 690], [50, 690, true]], 40));
  const fan = part(s < 0 ? "Left Fan" : "Right Fan", "fan" + (s < 0 ? "L" : "R"), "minor", { spool: "fans" });
  withFrame(FY, () => {
    revolve(fan, 0, 0, [[0, -34], [10, -22], [16, -6, true], [16, 6, true], [0, 6]], 24);   // the spinner
    for (let k = 0; k < 18; k++) {
      const lead = [], trail = [];
      for (let i = 0; i <= 4; i++) { const r = 16 + 36 * i / 4, a = 2 * Math.PI * k / 18 + 0.3 * i / 4; lead.push([r * Math.cos(a), r * Math.sin(a)]); trail.push([r * Math.cos(a - 0.2), r * Math.sin(a - 0.2)]); }
      extrude(fan, stripRegion(lead, trail), -4, 4);
    }
  });
}
nacelle(-1);
nacelle(1);

// ---------- landing legs, folding into the hull ----------
const LEGS = [["Nose Leg", "legN", [0, -430, 62]], ["Left Leg", "legL", [-110, 260, 52]], ["Right Leg", "legR", [110, 260, 52]]];
LEGS.forEach(([name, mod, piv]) => {
  const p = part(name, mod, "minor", { spool: "legs" });
  const L = piv[2] - GROUND;
  tube(p, [[0, 0, 0], [0, 0, -L * 0.55]], 10, 14);                 // the upper strut
  tube(p, [[0, 0, -L * 0.5], [0, 0, -L + 8]], 6.5, 14);            // the oleo
  tube(p, [[0, 0, -12], [0, 18, -L * 0.4], [0, 4, -L * 0.62]], 3, 8);   // the drag brace
  cyl(p, 0, 0, 26, -L, -L + 7, 32);                                 // the foot pad
  loop(p, circlePts(0, 0, 18, 24).map(q => [...q, -L + 7.05]));
});

// ---------- inside: cockpit, cabin, reactor, fuel ----------
const cockpit = part("Cockpit", "inside", "major");
[-34, 34].forEach(x => { rrBody(cockpit, x, -505, 20, 22, 4, [[0, ZC, true], [0, ZC + 34, true]], { seg: 3 }); rrBody(cockpit, x, -486, 20, 5, 3, [[0, ZC + 30, true], [0, ZC + 92, true]], { seg: 3 }); });   // two seats
rrBody(cockpit, 0, -585, 70, 18, 6, [[0, ZC, true], [0, ZC + 40], [8, ZC + 52, true]], { seg: 3 });   // the console
[-40, 0, 40].forEach(x => loop(cockpit, rrPts(x, -585, 14, 8, 2, 2).map(q => [...q, ZC + 52.1])));   // its screens
const cabin = part("Crew Cabin", "inside", "major");
[-1, 1].forEach(s => { rrBody(cabin, s * 85, -250, 30, 100, 6, [[0, ZC, true], [0, ZC + 30, true]], { seg: 3 }); rrBody(cabin, s * 85, -250, 30, 100, 6, [[0, ZC + 76, true], [0, ZC + 100, true]], { seg: 3 }); });   // bunks
rrBody(cabin, 0, -250, 30, 40, 8, [[0, ZC, true], [0, ZC + 44, true]], { seg: 3 });   // the table
const reactor = part("Reactor", "inside", "major");
revolve(reactor, 0, 40, [[0, ZC], [62, ZC, true], [62, ZC + 8], [54, ZC + 14, true], [54, ZC + 96, true], [62, ZC + 102], [62, ZC + 112, true], [0, ZC + 112]], 40);
[ZC + 34, ZC + 56, ZC + 78].forEach(z => loop(reactor, circlePts(0, 40, 55, 40).map(q => [...q, z])));
const tanks = part("Fuel Tanks", "inside", "major");
[-1, 1].forEach(s => revolve(tanks, s * 72, 300, Array.from({ length: 13 }, (_, i) => { const a = -Math.PI / 2 + Math.PI * i / 12; return [56 * Math.cos(a), ZC + 58 + 56 * Math.sin(a), i % 6 === 0]; }), 32));
tube(tanks, [[-72, 300, ZC + 58], [0, 300, ZC + 70], [72, 300, ZC + 58]], 5, 10);
tube(tanks, [[0, 300, ZC + 70], [0, 450, ZC + 80], [0, 560, ZC]], 5, 10);   // the feed to the main engine
const deck = part("Deck", "inside", "minor");
extrude(deck, rrRegion(0, -40, 90, 440, 30, 4), ZC - 2, ZC);

// ---------- explode, callouts and the tour ----------
const explode = {
  upper: [0, 0, 330], fin: [0, 0, 430], lower: [0, 0, -150], legN: { offset: [0, 0, -150], base: LEGS[0][2] }, legL: { offset: [0, 0, -150], base: LEGS[1][2] },
  legR: { offset: [0, 0, -150], base: LEGS[2][2] }, inside: [0, 0, 40], wingL: [-320, 0, 30], wingR: [320, 0, 30], nacL: [-520, 0, -30], nacR: [520, 0, -30],
  fanL: { offset: [-520, 0, -30], base: [-NAC, FAN_Y, NZ] }, fanR: { offset: [520, 0, -30], base: [NAC, FAN_Y, NZ] }, main: [0, 320, 0],
};
const BASED = { "Left Fan": [-NAC, FAN_Y, NZ], "Right Fan": [NAC, FAN_Y, NZ] };
LEGS.forEach(([n, , piv]) => { BASED[n] = piv; });
const local = (name, p) => r3(BASED[name] ? p.map((c, i) => c - BASED[name][i]) : p);
const hotspots = [
  ["Canopy", "Wraparound glass over two seats", [0, -480, hullPt(-480, Math.PI / 2)[2] + 50], ["Canopy", "Cockpit"]],
  ["Engine nacelle", "Fan-fed fusion thruster", [NAC, 400, NZ + 68], ["Right Nacelle"]],
  ["Intake fan", "Turning in the nacelle's mouth", [NAC, FAN_Y, NZ + 52], ["Right Fan"]],
  ["Main engine", "The big push for orbit", [0, 720, ZC + 100], ["Main Engine", "Main Engine Glow"]],
  ["Delta wings", "With winglets for air work", [-460, 300, 116], ["Left Wing"]],
  ["Reactor", "Powers everything aboard", [0, 40, ZC + 112], ["Reactor"]],
  ["Fuel tanks", "Feeding the main engine", [72, 300, ZC + 114], ["Fuel Tanks"]],
  ["Crew cabin", "Bunks for four", [85, -250, ZC + 100], ["Crew Cabin"]],
  ["Landing legs", "Fold up into the hull", [110, 260, GROUND + 7], ["Right Leg", "Left Leg", "Nose Leg"]],
  ["Sensor dome", "Radar and comms", [0, -150, hullPt(-150, Math.PI / 2)[2] + 22], ["Sensor Dome"]],
  ["RCS thrusters", "Small jets for steering in space", [hullPt(-560, 0.05)[0] + 8, -560, hullPt(-560, 0.05)[2] + 6], ["RCS Thrusters"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    intake: pt("Right Fan", [NAC, FAN_Y - 120, NZ]), fan: pt("Right Fan", [NAC, FAN_Y, NZ]), noz: pt("Right Nacelle", [NAC, 700, NZ]), out: pt("Right Nacelle", [NAC, 900, NZ]),
    reactor: pt("Reactor", [0, 40, ZC + 60]), tanks: pt("Fuel Tanks", [0, 300, ZC + 70]), main: pt("Main Engine", [0, 650, ZC]), plume: pt("Main Engine", [0, 900, ZC]),
    seat: pt("Cockpit", [0, -505, ZC + 40]), console: pt("Cockpit", [0, -585, ZC + 52]), rcs: pt("RCS Thrusters", [hullPt(-560, 0.05)[0] + 8, -560, ZC + 6]),
    legs: pt("Right Leg", [110, 260, 0]), cabin: pt("Crew Cabin", [0, -250, ZC + 40]),
  },
  steps: [
    { t: "Atmosphere: the fans", focus: "fan", dist: 0.5, ex: 0, p: ["intake", "fan", "noz", "out"], n: ["Right Nacelle", "Right Fan", "Left Nacelle", "Left Fan"], ms: 4400,
      d: "In air, each nacelle's fan swallows air and the reactor's heat expands it out of the nozzle: a jet engine with no fuel to burn. The wings and winglets handle the flying." },
    { t: "Space: the main engine", focus: "main", dist: 0.5, ex: 1, p: ["tanks", "main", "plume"], n: ["Main Engine", "Main Engine Glow", "Fuel Tanks"], ms: 4400,
      d: "Above the air, the main engine takes over, heating propellant from the two tanks in the reactor's core and throwing it out of the bell." },
    { t: "Power from the reactor", focus: "reactor", dist: 0.42, ex: 1, p: ["reactor", "tanks", "main"], n: ["Reactor"], ms: 4200,
      d: "A compact reactor amidships powers the engines, the life support and every system aboard. Its shielding sits between it and the crew." },
    { t: "Steering", focus: "rcs", dist: 0.42, ex: 0, p: ["rcs"], n: ["RCS Thrusters"], ms: 3800,
      d: "With no air to push on, small thruster blocks at the nose and tail fire in short puffs to turn the ship and line it up for docking." },
    { t: "Crew", focus: "seat", dist: 0.45, ex: 1, p: ["console", "seat", "cabin"], n: ["Cockpit", "Crew Cabin", "Canopy"], ms: 4200,
      d: "Two seats under the canopy fly the ship; behind them, a cabin with bunks for four and a table for the long trips." },
    { t: "Touchdown", focus: "legs", dist: 0.5, ex: 0, p: ["legs"], n: ["Nose Leg", "Left Leg", "Right Leg", "Lower Hull"], ms: 3800,
      d: "Three legs fold down out of the hull for landing, with wide pads to spread the weight on soft ground." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("SX7_GEOMETRY", "spaceship/build.js", { explode, hotspots, tour, constants: { ZC } });
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>SX-7 Starhopper</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the SX-7 Starhopper, an original spaceship design with delta wings and two engine nacelles, its fans turning and landing legs folding: on hover the upper hull lifts off the cockpit, cabin, reactor and fuel tanks, and the wings, nacelles and main engine move apart\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Ship parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>SX-7 Starhopper</b><span>Spaceship</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG SX7-001 &middot; Rev A<br>Units cm &middot; View az 30&deg; / el 30&deg;<br>Original concept design</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "spaceship", label: "SX-7 Starhopper", kind: "spaceship", tags: "spaceship starship space ship sci-fi shuttle rocket starhopper spacecraft",
  key: "sx7-theme", category: "Vehicles", html }, "cybertruck");
console.log(`spaceship/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
