/*
V8 engine: builds the model page and adds it to the gallery.

A 90-degree pushrod V8 with small-block proportions (4.00 in bore, 3.48 in stroke, 5.7 in rods), generated in
code (with lib/procedural.js) in mm: the crankshaft runs along Y with its nose at -Y (the front, with the
pulleys, towards the default view), X across the engine, Z up from the crank's axis. The rotating assembly
and valvetrain are spool groups the page moves every frame (model.js): the crank, cam, balancer, pulleys
and flywheel turn; pistons slide, con rods swing on the crank pins, and lifters, pushrods and valves rise and
fall in each cylinder's four-stroke order. The page's chrome and the shared engine come from the X9 page
already in the gallery. Re-run after any change:

    node v8/build.js

Writes v8/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, tri, loop, rrPts, circlePts, rrRegion, rect, polyRegion, stripRegion, extrude, rrBody, cyl, revolve, tube,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const S = Math.SQRT1_2;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y
const FX = q => [q[2], q[0], q[1]];   // draws in (y, z) and pushes along x
const sub = (a, b) => a.map((v, i) => v - b[i]), add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, k) => a.map(v => v * k);

// ---------- dimensions ----------
const BORE = 101.6, STROKE = 88.4, ROD = 144.8, R = STROKE / 2, DECK = 229, PITCH = 111.8;
const TDC = R + ROD;                     // the piston pin's distance from the crank axis at top dead centre
const BANKS = [-1, 1];                   // left bank, right bank (seen from the driver's seat, behind the engine)
// a bank's frame: u across the bank (outwards), y along the engine, w up its cylinders' axis
const axisOf = b => [b * S, 0, S], outOf = b => [b * S, 0, -S];
const bankW = b => ([u, y, w]) => { const a = axisOf(b), p = outOf(b); return [u * p[0] + w * a[0], y, u * p[2] + w * a[2]]; };
// cylinders: the left bank sits a little ahead of the right, so each pair of rods shares a crank pin
const THROWS = [0, 90, 270, 180].map(d => d * Math.PI / 180);   // cross-plane crank
const cylinders = [];
for (let j = 0; j < 4; j++) BANKS.forEach(b => cylinders.push({ b, j, y: -180 + PITCH * j + (b > 0 ? 22 : 0), psi: THROWS[j], beta: b * Math.PI / 4 }));
cylinders.forEach((c, i) => { c.n = i + 1; });
const throwY = j => -180 + PITCH * j + 11;

// ---------- modules (explode offsets; spinning parts are based at their axes) ----------
const DOWN = [0, 0, -330];
const modules = {
  block: { offset: [0, 0, 0] }, pan: { offset: [0, 0, -660] },
  headL: { offset: mul(axisOf(-1), 150) }, headR: { offset: mul(axisOf(1), 150) },
  coverL: { offset: mul(axisOf(-1), 290) }, coverR: { offset: mul(axisOf(1), 290) },
  intake: { offset: [0, 0, 250] }, carb: { offset: [0, 0, 360] }, cleaner: { offset: [0, 0, 470] }, ignition: { offset: [0, 120, 300] },
  headerL: { offset: [-300, 0, 40] }, headerR: { offset: [300, 0, 40] },
  front: { offset: [0, -120, 0] }, belt: { offset: [0, -230, 0] },
  balancer: { offset: [0, -230, 0], base: [0, -300, 0] }, pump: { offset: [0, -230, 0], base: [0, -300, 150] }, alt: { offset: [0, -230, 0], base: [165, -300, 205] },
  flywheel: { offset: [0, 170, 0], base: [0, 290, 0] }, accessories: { offset: [0, 0, 0] },
  crank: { offset: DOWN, base: [0, 0, 0] }, pistons: { offset: DOWN },
  cam: { offset: [0, 0, 130], base: [0, 0, 95] }, pushrods: { offset: [0, 0, 130] },
};

// ---------- the block: a V in front view, pushed along the engine ----------
const block = part("Engine Block", "block", "major");
{
  const deckOut = b => [b * (DECK * S + 62 * S), DECK * S - 62 * S], deckIn = b => [b * (DECK * S - 62 * S), DECK * S + 62 * S];
  const V = [[-125, -50], [125, -50], [125, 30], deckOut(1), deckIn(1), [37.4, 125], [-37.4, 125], deckIn(-1), deckOut(-1), [-125, 30]];
  withFrame(FY, () => extrude(block, polyRegion(V), -250, 262));
  // freeze plugs and casting lines along the sides
  BANKS.forEach(b => {
    [-120, 0, 120].forEach(y => loop(block, circlePts(y, 10, 14, 20).map(([yy, z]) => [b * 125.4, yy, z])));
    line(block, [b * 125.4, -250, 30], [b * 125.4, 262, 30]);
  });
  // bores on the decks, seen when the heads come off
  cylinders.forEach(c => withFrame(bankW(c.b), () => loop(block, circlePts(0, c.y, BORE / 2, 36).map(q => [...q, DECK + 0.4]))));
  // main bearing caps' outlines on the bottom
  [0, 1, 2, 3, 4].forEach(k => { const y = -235 + k * PITCH; loop(block, [[-60, y - 12, -50.4], [60, y - 12, -50.4], [60, y + 12, -50.4], [-60, y + 12, -50.4]]); });
}
const mounts = part("Engine Mounts", "block", "minor");
BANKS.forEach(b => withFrame(FX, () => { extrude(mounts, rrRegion(-60, 20, 40, 26, 6, 3), b * 125, b * 150); extrude(mounts, rrRegion(-60, 20, 26, 14, 6, 3), b * 150, b * 172); }));

const pan = part("Oil Pan", "pan", "major");
rrBody(pan, 0, 15, 128, 262, 16, [[14, -150, true], [6, -144], [0, -132], [0, -60], [-6, -54, true], [-6, -50, true]], { seg: 4 });
for (let y = -200; y <= 200; y += 40) line(pan, [-128.4, y, -60], [-128.4, y, -132]);
cyl(pan, 60, 220, 9, -158, -150, 6);   // drain plug

// ---------- heads, valve covers ----------
BANKS.forEach(b => {
  const side = b < 0 ? "Left" : "Right", W = bankW(b);
  const head = part(side + " Cylinder Head", b < 0 ? "headL" : "headR", "major");
  withFrame(W, () => {
    rrBody(head, 0, 18 + (b > 0 ? 22 : 0) - 11, 64, 248, 6, [[0, DECK, true], [0, 318, true]], { seg: 3 });
    cylinders.filter(c => c.b === b).forEach(c => {
      // exhaust ports on the outer face, intake ports on the inner
      withFrame(q => [64.4, q[0], q[1]], () => { loop(head, rrPts(c.y - 22, 272, 15, 16, 5, 3).map(q => [...q, 0])); loop(head, rrPts(c.y + 26, 300, 9, 9, 8.9, 3).map(q => [...q, 0])); });
      withFrame(q => [-64.4, q[0], q[1]], () => loop(head, rrPts(c.y + 10, 270, 17, 22, 5, 3).map(q => [...q, 0])));
    });
    // head bolts along the outer edge
    for (let k = 0; k < 5; k++) loop(head, circlePts(52, -235 + k * PITCH + (b > 0 ? 22 : 0), 6, 12).map(q => [...q, 318.4]));
  });
  const cover = part(side + " Valve Cover", b < 0 ? "coverL" : "coverR", "major");
  withFrame(W, () => {
    rrBody(cover, 0, 18 + (b > 0 ? 22 : 0) - 11, 56, 232, 20, [[0, 318, true], [-4, 322, true], [0, 326], [0, 362], [6, 374], [14, 380, true]], { seg: 5 });
    for (let k = -3; k <= 3; k++) line(cover, [k * 9, -140 + (b > 0 ? 22 : 0), 380.4], [k * 9, 150 + (b > 0 ? 22 : 0), 380.4]);   // ribs
    for (let k = 0; k < 4; k++) loop(cover, circlePts(48, -170 + k * 116 + (b > 0 ? 22 : 0), 5, 10).map(q => [...q, 326.4]));   // hold-down bolts
    // oil filler cap on the left, breather on the right
    revolve(cover, 0, (b < 0 ? -120 : 150), [[0, 380], [22, 380, true], [24, 384], [24, 396], [20, 400, true], [0, 400]], 24);
  });
});

// ---------- valvetrain: valves, springs, rockers (in the heads); lifters and pushrods (with the cam) ----------
const valves = [];
cylinders.forEach(c => {
  const W = bankW(c.b), mod = c.b < 0 ? "headL" : "headR";
  [["Exhaust", -22], ["Intake", 22]].forEach(([kind, dy], k) => {
    const id = "v" + c.n + kind[0];
    const valve = part(kind + " Valve " + c.n, mod, "minor", { spool: id });
    withFrame(W, () => {
      revolve(valve, 0, c.y + dy, [[0, DECK + 0.6], [kind === "Intake" ? 25 : 20, DECK + 0.6, true], [5, DECK + 6], [4, DECK + 10], [4, 328], [0, 328]], 20);   // head and stem
      revolve(valve, 0, c.y + dy, [[0, 318], [14, 318, true], [14, 322, true], [0, 322]], 16);                                                                  // spring retainer
    });
    const lifterAt = add([c.b * 28, c.y + dy, 0], [0, 0, 118]);
    const rockerIn = W([-30, c.y + dy, 334]);
    valves.push({ spool: id, axis: r3(axisOf(c.b)), cyl: c.n - 1, kind: kind[0] });
    // the pushrod and lifter, which rise as the cam lobe passes
    const pid = "pr" + c.n + kind[0];
    const rod = part("Pushrod " + c.n + kind[0], "pushrods", "minor", { spool: pid });
    tube(rod, [lifterAt, rockerIn], 3.2, 8);
    const dirv = sub(rockerIn, lifterAt), len = Math.hypot(...dirv), u = mul(dirv, 1 / len);
    tube(rod, [add(lifterAt, mul(u, -28)), add(lifterAt, mul(u, 2))], 10, 14);
    valves[valves.length - 1].pushrod = { spool: pid, dir: r3(u) };
  });
});
const springs = { L: part("Left Valve Springs", "headL", "minor"), R: part("Right Valve Springs", "headR", "minor") };
const rockers = { L: part("Left Rocker Arms", "headL", "minor"), R: part("Right Rocker Arms", "headR", "minor") };
cylinders.forEach(c => {
  const W = bankW(c.b), key = c.b < 0 ? "L" : "R";
  [-22, 22].forEach(dy => withFrame(W, () => {
    // a coil spring: a helix from the head up to the retainer
    const pts = []; for (let t = 0; t <= 1; t += 1 / 72) { const a = t * 2 * Math.PI * 6; pts.push([13 * Math.cos(a), c.y + dy + 13 * Math.sin(a), 296 + 22 * t]); }
    pts.forEach((q, i) => i && line(springs[key], pts[i - 1], q));
    // the rocker: a stamped arm over its stud, from pushrod to valve tip
    extrude(rockers[key], rrRegion(-12, c.y + dy, 22, 5.5, 4, 3), 328, 336);
    cyl(rockers[key], -12, c.y + dy, 5, 336, 346, 12);
  }));
});

// ---------- the rotating assembly: crankshaft, con rods, pistons ----------
const crank = part("Crankshaft", "crank", "major", { spool: "crank" });
withFrame(FY, () => {
  [-235, -235 + PITCH, -235 + 2 * PITCH, -235 + 3 * PITCH, -235 + 4 * PITCH].forEach(y => cyl(crank, 0, 0, 31, y - 13, y + 13, 28));   // main journals
  cyl(crank, 0, 0, 22, -320, -248, 24);                                     // snout, out to the balancer
  revolve(crank, 0, 0, [[0, 248], [32, 248, true], [32, 262], [60, 264, true], [60, 276, true], [0, 276]], 32);   // rear flange
  THROWS.forEach((psi, j) => {
    const yc = throwY(j), pin = [R * Math.sin(psi), R * Math.cos(psi)];
    cyl(crank, pin[0], pin[1], 27, yc - 24, yc + 24, 24);                   // the pin both rods share
    [-1, 1].forEach(s => {
      // a web with its counterweight, opposite the pin
      const d = [Math.sin(psi), Math.cos(psi)], n = [Math.cos(psi), -Math.sin(psi)];
      const pts = [[d[0] * (R + 26) + n[0] * 30, d[1] * (R + 26) + n[1] * 30]];
      for (let k = 0; k <= 12; k++) { const a = psi + (100 + 160 * k / 12) * Math.PI / 180; pts.push([80 * Math.sin(a), 80 * Math.cos(a)]); }
      pts.push([d[0] * (R + 26) - n[0] * 30, d[1] * (R + 26) - n[1] * 30]);
      extrude(crank, polyRegion(pts), yc + s * 24 + (s < 0 ? -15 : 0), yc + s * 24 + (s > 0 ? 15 : 0));
    });
  });
});
const pistons = [], rods = [];
cylinders.forEach(c => {
  const W = bankW(c.b);
  const piston = part("Piston " + c.n, "pistons", "minor", { spool: "p" + c.n });
  withFrame(W, () => {
    // crown, ring lands and skirt, built at top dead centre
    revolve(piston, 0, c.y, [[0, TDC + 41], [49, TDC + 41, true], [50.6, TDC + 39], [50.6, TDC + 18], [49.6, TDC - 24, true], [44, TDC - 24, true], [0, TDC - 24]], 36);
    [36, 31, 25].forEach(dw => loop(piston, circlePts(0, c.y, 50.9, 36).map(q => [...q, TDC + dw])));
    withFrame(q => [q[0], q[2], q[1]], () => cyl(piston, 0, TDC, 11, c.y - 30, c.y + 30, 14));   // wrist pin
  });
  pistons.push({ spool: "p" + c.n });
  // the con rod: built round its small end, which is the module's base at top dead centre
  const small = W([0, c.y, TDC]), mod = "rod" + c.n;
  modules[mod] = { offset: DOWN, base: r3(small) };
  const rod = part("Con Rod " + c.n, mod, "minor", { spool: mod });
  withFrame(q => sub(W(q), small), () => {
    withFrame(q => [q[0], q[2], q[1]], () => {
      cyl(rod, 0, TDC, 15, c.y - 11, c.y + 11, 20);                         // small end
      cyl(rod, 0, R, 33, c.y - 11, c.y + 11, 28);                           // big end and cap
    });
  });
  // the beam (an I in section): drawn in the rod's plane through its centre line
  withFrame(q => sub(W(q), small), () => {
    const beam = [[-11, c.y - 6, R + 26], [11, c.y - 6, R + 26], [7, c.y - 6, TDC - 12], [-7, c.y - 6, TDC - 12]];
    const beam2 = beam.map(([u, y, w]) => [u, y + 12, w]);
    [beam, beam2].forEach(b => loop(rod, b));
    beam.forEach((q, i) => line(rod, q, beam2[i]));
    // a solid web so it reads as one part
    tri(rod, beam[0], beam[1], beam[2]); tri(rod, beam[0], beam[2], beam[3]);
    tri(rod, beam2[0], beam2[2], beam2[1]); tri(rod, beam2[0], beam2[3], beam2[2]);
  });
  rods.push({ spool: mod });
});

// ---------- camshaft (in the valley, at half crank speed) ----------
const cam = part("Camshaft", "cam", "major", { spool: "cam" });
withFrame(FY, () => {
  cyl(cam, 0, 0, 16, -260, 250, 20);
  [-228, -228 + PITCH, -228 + 2 * PITCH, -228 + 3 * PITCH, -228 + 4 * PITCH].forEach(y => cyl(cam, 0, 0, 25, y - 10, y + 10, 24));   // journals
  revolve(cam, 0, 0, [[0, -300], [50, -300, true], [50, -282, true], [16, -282], [16, -262], [0, -262]], 32);                          // timing gear
  valves.forEach((v, i) => {
    const c = cylinders[v.cyl], dy = v.kind === "E" ? -22 : 22, phase = i * 1.37;
    const pts = Array.from({ length: 36 }, (_, k) => { const a = 2 * Math.PI * k / 36, rr = 17 + 7 * Math.max(0, Math.cos(a - phase)) ** 2; return [rr * Math.sin(a), rr * Math.cos(a)]; });
    extrude(cam, polyRegion(pts), c.y + dy - 6, c.y + dy + 6);
  });
});

// ---------- induction: intake manifold, carburettor, air cleaner ----------
const intake = part("Intake Manifold", "intake", "major");
rrBody(intake, 0, 10, 70, 205, 14, [[0, 198, true], [0, 262], [8, 272, true]], { seg: 4 });
cylinders.forEach(c => {
  const port = bankW(c.b)([-64.4, c.y + 10, 270]);
  tube(intake, [[c.b * 60, c.y + 10, 238], [c.b * 100, c.y + 10, 244], port], 17, 14);   // a runner to each port
});
revolve(intake, 0, 0, [[0, 272], [44, 272, true], [44, 278, true], [0, 278]], 28);                           // carb pad
const carb = part("Carburettor", "carb", "major");
rrBody(carb, 0, 0, 50, 46, 5, [[0, 278, true], [0, 312, true], [3, 318, true]], { seg: 3 });
[[-19, -18], [19, -18], [-19, 18], [19, 18]].forEach(([x, y]) => loop(carb, circlePts(x, y, 13, 24).map(q => [...q, 318.4])));   // four barrels
tube(carb, [[52, -20, 296], [70, -20, 296], [70, -60, 290]], 2.5, 8);                                        // throttle linkage
const cleaner = part("Air Cleaner", "cleaner", "major");
revolve(cleaner, 0, 0, [[0, 320], [176, 320, true], [180, 324], [180, 386], [176, 390, true], [44, 392], [42, 396], [0, 396]], 64);
for (let z = 334; z <= 374; z += 8) loop(cleaner, circlePts(0, 0, 180.5, 64).map(q => [...q, z]));       // the filter's pleat line
revolve(cleaner, 0, 0, [[0, 396], [10, 396], [10, 410], [0, 410]], 16);                                      // wing nut
extrude(cleaner, rrRegion(0, 0, 26, 4, 3, 2), 402, 408);
// thermostat housing and the top radiator hose
cyl(intake, 0, -205, 22, 262, 280, 20);
tube(intake, [[0, -205, 280], [0, -240, 300], [0, -330, 300]], 19, 14);

// ---------- ignition: distributor, plug boots and wires ----------
const ignition = part("Distributor", "ignition", "major");
const DIST = [0, 245];
revolve(ignition, ...DIST, [[0, 200], [26, 200, true], [26, 290], [30, 292, true], [48, 296], [48, 322, true], [40, 334, true], [0, 336]], 32);
const towers = Array.from({ length: 8 }, (_, k) => { const a = 2 * Math.PI * k / 8; return [DIST[0] + 30 * Math.cos(a), DIST[1] + 30 * Math.sin(a)]; });
towers.forEach(([x, y]) => cyl(ignition, x, y, 6, 334, 350, 12));
const wires = part("Plug Wires", "ignition", "minor");
cylinders.forEach((c, i) => {
  const W = bankW(c.b), boot0 = W([64, c.y + 26, 300]), boot1 = W([100, c.y + 26, 300]);
  tube(wires, [boot0, boot1], 8, 10);                                                                         // the boot over the plug
  const t = towers[[0, 7, 3, 2, 5, 4, 6, 1][i]];
  tube(wires, [boot1, W([108, c.y + 26, 360]), W([40, c.y + 26, 412]), [t[0] * 1.6, (c.y + 26 + t[1]) / 2 + 40, 380], [t[0], t[1], 350]], 3.5, 6);
});

// ---------- exhaust headers ----------
BANKS.forEach(b => {
  const hdr = part((b < 0 ? "Left" : "Right") + " Header", b < 0 ? "headerL" : "headerR", "major");
  const coll = [b * 250, 70, 40];
  cylinders.filter(c => c.b === b).forEach((c, k) => {
    const W = bankW(c.b), port = W([64.4, c.y - 22, 272]), out = W([110, c.y - 22, 262]);
    tube(hdr, [port, out, [b * 238, c.y - 22 + (70 - c.y) * 0.25, 150 - k * 6], [b * 248, (c.y - 22 + 70) / 2, 90], coll], 19, 14);
    withFrame(q => W([64.4 + q[2], q[0], q[1]]), () => extrude(hdr, rrRegion(c.y - 22, 272, 24, 24, 6, 3), 0, 7));   // flange on the port face
  });
  tube(hdr, [coll, [b * 250, 140, -60], [b * 240, 330, -100]], 32, 18);                                       // collector and pipe
});

// ---------- front: timing cover, balancer, water pump, alternator, belt ----------
const front = part("Timing Cover", "front", "major");
withFrame(FY, () => extrude(front, polyRegion([[-90, -30], [-60, -96], [60, -96], [90, -30], [70, 100], [-70, 100]]), -262, -250));
const pumpBody = part("Water Pump", "front", "major");
withFrame(FY, () => { extrude(pumpBody, rrRegion(0, 150, 70, 46, 18, 4), -270, -262); revolve(pumpBody, 0, 150, [[0, -290], [30, -290, true], [34, -280], [34, -270, true], [0, -270]], 24); });
const balancer = part("Harmonic Balancer", "balancer", "major", { spool: "balancer" });
withFrame(FY, () => {
  revolve(balancer, 0, 0, [[0, -14], [96, -14, true], [100, -10], [100, 10], [96, 14, true], [0, 14]], 48);
  [-5, 5].forEach(z => loop(balancer, circlePts(0, 0, 100.4, 48).map(q => [...q, z])));   // belt grooves
  loop(balancer, circlePts(0, 0, 70, 48).map(q => [...q, -14.4]));                        // the rubber ring between hub and inertia ring
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; loop(balancer, circlePts(40 * Math.cos(a), 40 * Math.sin(a), 6, 12).map(q => [...q, -14.4])); }
});
const pumpPulley = part("Water Pump Pulley", "pump", "minor", { spool: "pump" });
withFrame(FY, () => { revolve(pumpPulley, 0, 0, [[0, -10], [60, -10, true], [60, 10, true], [0, 10]], 40); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; loop(pumpPulley, circlePts(30 * Math.cos(a), 30 * Math.sin(a), 9, 14).map(q => [...q, -10.4])); } });
const alternator = part("Alternator", "accessories", "major");
withFrame(FY, () => {
  revolve(alternator, 165, 205, [[0, -280], [58, -280, true], [64, -270], [64, -190], [58, -180, true], [0, -180]], 36);
  for (let k = 0; k < 12; k++) { const a = 2 * Math.PI * k / 12; line(alternator, [165 + 64.4 * Math.cos(a), 205 + 64.4 * Math.sin(a), -260], [165 + 64.4 * Math.cos(a), 205 + 64.4 * Math.sin(a), -200]); }
});
extrude(alternator, rrRegion(130, -230, 10, 40, 4, 2), 120, 170);                        // bracket to the head
const altPulley = part("Alternator Pulley", "alt", "minor", { spool: "alt" });
withFrame(FY, () => { revolve(altPulley, 0, 0, [[0, -10], [32, -10, true], [32, 10, true], [0, 10]], 28); for (let k = 0; k < 10; k++) { const a = 2 * Math.PI * k / 10; line(altPulley, [10 * Math.cos(a), 10 * Math.sin(a), -10.4], [26 * Math.cos(a + 0.4), 26 * Math.sin(a + 0.4), -10.4]); } });
const belt = part("Drive Belt", "belt", "minor");
{
  // the belt wraps the three pulleys: the convex hull of points round each, at the belt's centre line
  const pts = [];
  [[0, 0, 104], [0, 150, 63], [165, 205, 35]].forEach(([x, z, r]) => { for (let k = 0; k < 48; k++) { const a = 2 * Math.PI * k / 48; pts.push([x + r * Math.cos(a), z + r * Math.sin(a)]); } });
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = list => { const h = []; list.forEach(p => { while (h.length > 1) { const [a, b] = [h[h.length - 2], h[h.length - 1]]; if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) <= 0) h.pop(); else break; } h.push(p); }); return h; };
  const lower = half(pts), upper = half(pts.slice().reverse());
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  const path = hull.concat([hull[0]]).map(([x, z]) => [x, -300, z]);
  tube(belt, path, 4.5, 8);
}

// ---------- rear and sides: flywheel, starter, oil filter, dipstick ----------
const flywheel = part("Flywheel", "flywheel", "major", { spool: "flywheel" });
withFrame(FY, () => {
  revolve(flywheel, 0, 0, [[0, -7], [150, -7, true], [150, 7, true], [0, 7]], 72);
  for (let k = 0; k < 96; k++) { const a = 2 * Math.PI * k / 96; line(flywheel, [150 * Math.cos(a), 150 * Math.sin(a), 7.4], [146 * Math.cos(a), 146 * Math.sin(a), 7.4]); }   // ring gear teeth
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; loop(flywheel, circlePts(42 * Math.cos(a), 42 * Math.sin(a), 6, 12).map(q => [...q, 7.4])); }
});
const starter = part("Starter Motor", "accessories", "major");
withFrame(FY, () => { revolve(starter, 112, -72, [[0, 190], [40, 190, true], [40, 300, true], [30, 310], [0, 312]], 28); revolve(starter, 112, -26, [[0, 200], [20, 200, true], [20, 280, true], [0, 280]], 20); });
const filter = part("Oil Filter", "accessories", "minor");
withFrame(FX, () => { revolve(filter, 205, -40, [[0, -128], [48, -128, true], [48, -210], [44, -218, true], [0, -218]], 32); for (let k = 0; k < 16; k++) { const a = 2 * Math.PI * k / 16; line(filter, [205 + 48.4 * Math.cos(a), -40 + 48.4 * Math.sin(a), -140], [205 + 48.4 * Math.cos(a), -40 + 48.4 * Math.sin(a), -200]); } });
tube(filter, [[-128, -150, -30], [-150, -150, 120], [-190, -150, 260]], 4, 8);                               // dipstick tube
revolve(filter, -190, -150, [[0, 260], [12, 262], [12, 272], [0, 274]], 16);                                  // its handle

// ---------- callouts and the "how it works" tour ----------
const BASES = Object.fromEntries(Object.entries(modules).filter(([, m]) => m.base).map(([k, m]) => [k, m.base]));
const baseFor = { "Crankshaft": BASES.crank, "Camshaft": BASES.cam, "Harmonic Balancer": BASES.balancer, "Water Pump Pulley": BASES.pump, "Alternator Pulley": BASES.alt, "Flywheel": BASES.flywheel };
cylinders.forEach(c => { baseFor["Con Rod " + c.n] = BASES["rod" + c.n]; });
const local = (name, p) => r3(sub(p, baseFor[name] || [0, 0, 0]));
const c1 = cylinders[1];   // a right-bank cylinder, facing the view
const hotspots = [
  ["Air cleaner", "14 in round filter", [0, -180, 360], ["Air Cleaner"]],
  ["Four-barrel carburettor", "Mixes fuel into the air", [50, 0, 300], ["Carburettor"]],
  ["Intake manifold", "A runner to every cylinder", [70, -150, 250], ["Intake Manifold"]],
  ["Valve covers", "Over the rockers and springs", bankW(1)([56, 100, 360]), ["Right Valve Cover"]],
  ["Cylinder heads", "Two valves per cylinder", bankW(1)([64.4, -60, 300]), ["Right Cylinder Head"]],
  ["Exhaust headers", "Four tubes to a collector", [250, 40, 60], ["Right Header"]],
  ["Distributor", "Sends the spark to each plug", [48, 245, 320], ["Distributor", "Plug Wires"]],
  ["Harmonic balancer", "Damps the crank's twisting", [0, -314, 100], ["Harmonic Balancer"]],
  ["Alternator", "Charges the battery", [229, -230, 205], ["Alternator"]],
  ["Water pump", "Pushes coolant round the block", [0, -310, 210], ["Water Pump", "Water Pump Pulley"]],
  ["Engine block", "90-degree V, 4.00 in bores", [125.4, -60, 0], ["Engine Block"]],
  ["Oil pan", "Holds 5 quarts of oil", [128.4, 100, -100], ["Oil Pan"]],
  ["Crankshaft", "Cross-plane, 3.48 in stroke", [0, throwY(1), -80], ["Crankshaft"]],
  ["Pistons", "Eight, on 5.7 in con rods", bankW(1)([50.6, c1.y, TDC + 30]), ["Piston 2", "Con Rod 2"]],
  ["Camshaft", "Turns at half crank speed", [0, -228, 120], ["Camshaft"]],
  ["Flywheel", "Smooths out the firing pulses", [0, 297, 150], ["Flywheel"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const W1 = bankW(1);
const tour = {
  points: {
    air: pt("Air Cleaner", [0, 0, 410]), carb: pt("Carburettor", [0, 0, 300]), runner: pt("Intake Manifold", [100, c1.y + 10, 244]),
    port: pt("Right Cylinder Head", W1([-64.4, c1.y + 10, 270])), chamber: pt("Right Cylinder Head", W1([0, c1.y, DECK + 10])),
    piston: pt("Piston 2", W1([0, c1.y, TDC + 41])), pin: pt("Crankshaft", [0, throwY(0), -R]), crank: pt("Crankshaft", [0, throwY(1), 0]),
    flywheel: pt("Flywheel", [0, 297, 0]), plug: pt("Plug Wires", W1([100, c1.y + 26, 300])), dist: pt("Distributor", [0, 245, 336]),
    cam: pt("Camshaft", [0, c1.y + 22, 120]), rocker: pt("Right Rocker Arms", W1([-12, c1.y + 22, 340])), valve: pt("Right Valve Springs", W1([0, c1.y + 22, 310])),
    exPort: pt("Right Header", W1([64.4, c1.y - 22, 272])), collector: pt("Right Header", [250, 140, -60]), tail: pt("Right Header", [240, 330, -100]),
    balancer: pt("Harmonic Balancer", [0, -300, 0]), pump: pt("Water Pump Pulley", [0, -300, 150]), alt: pt("Alternator Pulley", [165, -300, 205]),
  },
  steps: [
    { t: "Intake", focus: "carb", dist: 0.5, ex: 0, p: ["air", "carb", "runner", "port", "chamber"], n: ["Air Cleaner", "Carburettor", "Intake Manifold", "Right Cylinder Head"], ms: 4600,
      d: "Air comes in through the filter and picks up fuel in the carburettor. As a piston falls with its intake valve open, it draws the mixture down a runner into its cylinder." },
    { t: "Compression", focus: "piston", dist: 0.4, ex: 0, p: ["chamber", "piston"], n: ["Piston 2", "Con Rod 2", "Right Cylinder Head"], ms: 4400,
      d: "Both valves close and the piston rises again, squeezing the mixture to about a ninth of its volume." },
    { t: "Power", focus: "chamber", dist: 0.42, ex: 0, p: ["dist", "plug", "chamber", "piston", "crank"], n: ["Distributor", "Plug Wires", "Piston 2", "Con Rod 2", "Crankshaft"], ms: 4800,
      d: "The distributor sends a spark down a wire to the plug. The mixture burns, the pressure drives the piston down, and the con rod turns the crankshaft. With eight cylinders, one fires every quarter turn." },
    { t: "Exhaust", focus: "exPort", dist: 0.5, ex: 0, p: ["chamber", "exPort", "collector", "tail"], n: ["Right Header", "Right Cylinder Head"], ms: 4400,
      d: "The piston rises once more with the exhaust valve open and pushes the burnt gas out through the header's tube into the collector." },
    { t: "The valvetrain keeps time", focus: "cam", dist: 0.45, ex: 1, p: ["cam", "rocker", "valve"], n: ["Camshaft", "Right Rocker Arms", "Right Valve Springs"], ms: 4600,
      d: "Geared to the crank at half its speed, the camshaft's lobes lift the lifters and pushrods; the rockers push each valve open, and its spring snaps it shut." },
    { t: "Power out, and the belt", focus: "balancer", dist: 0.55, ex: 0, p: ["alt", "balancer", "pump", "alt"], n: ["Harmonic Balancer", "Water Pump Pulley", "Alternator Pulley", "Drive Belt", "Flywheel"], ms: 4400,
      d: "The flywheel at the back carries the power to the gearbox and smooths the pulses; at the front the balancer damps the crank's twist and drives the belt to the water pump and alternator." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("V8_GEOMETRY", "v8/build.js", { explode: modules, hotspots, tour,
  cylinders: cylinders.map(c => ({ n: c.n, b: c.b, psi: r3([c.psi])[0], beta: r3([c.beta])[0] })), pistons, rods, valves,
  constants: { R, ROD, TDC } });
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>V8 Engine</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of a running V8 engine: the crankshaft turns, pistons and con rods move, valves open and close and the belt drives the pulleys; on hover the air cleaner, carburettor, intake, heads, headers, oil pan and rotating assembly come apart\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Engine parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>V8</b><span>Pushrod engine</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG V8-350-001 &middot; Rev A<br>Units mm &middot; View az 40&deg; / el 24&deg;<br>Concept design</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "v8", label: "V8 Engine", kind: "engine", tags: "v8 engine motor car pushrod small block pistons crankshaft animated",
  key: "v8-theme", category: "Engines", html }, "turbofan");
console.log(`v8/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
