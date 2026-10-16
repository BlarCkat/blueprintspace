/*
Cybertruck: builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in centimetres: Y along its length with the nose at -Y (towards
the default view), X across it, Z up from the ground. The body is lofted through six-sided sections: a
straight line rises from the nose to the roof's peak and another falls to the tail, the lower sides stand
almost upright to the beltline crease and the glass above leans in, and trapezoid notches in the bottom edge
make the wheel arches. On it, as separate parts laid on those flat faces: the frunk lid, four doors with
their windows, the tailgate, glass, light bars, mirrors, the wiper, the arch and rocker cladding, the front
fascia and rear bumper, and the vault's tonneau. Underneath: the castings, the structural battery, the drive
units and half-shafts, double-wishbone corners with air springs, brakes and steering racks, and the wheels;
inside, the seats, dash, screens and yoke. The page's chrome and the shared engine come from the X9 page
already in the gallery. Re-run after any change:

    node cybertruck/build.js

Writes cybertruck/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, tri, loop, rrPts, circlePts, rrRegion, rect, polyRegion, stripRegion, extrude, loft, rrBody, cyl, revolve, tube,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y
const FX = q => [q[2], q[0], q[1]];   // draws in (y, z) and pushes along x
// ---------- the body's shape (cm) ----------
const NOSE = -284, TAIL = 284, PEAK = -30;         // 568 long, the roof's peak just behind the windscreen
const AXLES = [-189, 192], WHEEL_R = 44;           // 381 wheelbase, 35-inch tyres
const BELT = 103, HALF = 100;                      // the beltline crease and the half width there
// the top line: straight up from the nose to the peak, straight down to the tail
const topZ = y => y <= PEAK ? 100 + (179 - 100) * (y - NOSE) / (PEAK - NOSE) : 179 + (120 - 179) * (y - PEAK) / (TAIL - PEAK);
// the bottom edge, with its trapezoid wheel arches: [y, z] corners, straight between them
const BOTTOM = [[NOSE, 88], [-272, 45], [-251, 40], [-229, 98], [-149, 98], [-127, 40], [130, 40], [152, 98], [232, 98], [254, 40], [270, 46], [TAIL, 52]];
const bottomZ = y => { for (let i = 0; i + 1 < BOTTOM.length; i++) { const [a, za] = BOTTOM[i], [b, zb] = BOTTOM[i + 1]; if (y <= b) return za + (zb - za) * (y - a) / (b - a); } return BOTTOM[BOTTOM.length - 1][1]; };
const ARCHES = [[-251, -229, -149, -127], [130, 152, 232, 254]];
// a section: the rocker, the beltline and the roof edge on each side; above the belt the sides lean in
function section(y) {
  const zt = topZ(y), zb = bottomZ(y), belt = Math.max(zb + 1, Math.min(BELT, zt - 0.5));
  const wb = HALF - 4, wm = y <= NOSE + 1 ? HALF - 4 : HALF, wt = wm - (zt - belt) * 0.45;
  return { y, zb, belt, zt, wb, wm, wt };
}
const ring = s => [[-s.wb, s.zb], [s.wb, s.zb], [s.wm, s.belt], [s.wt, s.zt], [-s.wt, s.zt], [-s.wm, s.belt]].map(([x, z]) => [x, s.y, z]);
// a point on the upper (glass) face of one side: s runs from the beltline (0) to the roof edge (1), pushed out a little
function upper(y, s, side, lift = 0.35) {
  const c = section(y), x0 = c.wm, z0 = c.belt, x1 = c.wt, z1 = c.zt;
  const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1;
  return [side * (x0 + dx * s + lift * dz / l), y, z0 + dz * s - lift * dx / l];
}
// a point on the lower (steel) face of one side: s from the rocker (0) to the beltline (1)
function lower(y, s, side, lift = 0.35) {
  const c = section(y), x = c.wb + (c.wm - c.wb) * s;
  return [side * (x + lift), y, c.zb + (c.belt - c.zb) * s];
}
// a point on the top face: x from the centre line, lifted a little
const onTop = (x, y, lift = 0.35) => [x, y, topZ(y) + lift];
// a panel laid on a face: a grid over y (and s), its outline drawn; f(y, s) gives the point
function facePanel(p, f, y0, y1, s0, s1, ny = 12, flip = false) {
  const S0 = typeof s0 === "function" ? s0 : () => s0, S1 = typeof s1 === "function" ? s1 : () => s1, ns = 3;
  const grid = [];
  for (let i = 0; i <= ny; i++) { const y = y0 + (y1 - y0) * i / ny; grid.push(Array.from({ length: ns + 1 }, (_, j) => f(y, S0(y) + (S1(y) - S0(y)) * j / ns))); }
  for (let i = 0; i < ny; i++) for (let j = 0; j < ns; j++) {
    const a = grid[i][j], b = grid[i + 1][j], c = grid[i + 1][j + 1], d = grid[i][j + 1];
    if (flip) { tri(p, a, c, b); tri(p, a, d, c); } else { tri(p, a, b, c); tri(p, a, c, d); }
  }
  for (let i = 0; i < ny; i++) { line(p, grid[i][0], grid[i + 1][0]); line(p, grid[i][ns], grid[i + 1][ns]); }
  for (let j = 0; j < ns; j++) { line(p, grid[0][j], grid[0][j + 1]); line(p, grid[ny][j], grid[ny][j + 1]); }
  return grid;
}

const modules = {
  body: { offset: [0, 0, 140] }, frunk: { offset: [0, -50, 240] }, tonneau: { offset: [0, 0, 250] }, tailgate: { offset: [0, 120, 140] },
  doorFL: { offset: [-100, -10, 140] }, doorRL: { offset: [-100, 10, 140] }, doorFR: { offset: [100, -10, 140] }, doorRR: { offset: [100, 10, 140] },
  interior: { offset: [0, 0, 70] },
  wheelsL: { offset: [-160, 0, 0] }, wheelsR: { offset: [160, 0, 0] }, cornersL: { offset: [-80, 0, 0] }, cornersR: { offset: [80, 0, 0] },
  drive: { offset: [0, 0, -45] }, battery: { offset: [0, 0, -100] }, castings: { offset: [0, 0, -25] },
};

// ---------- exoskeleton ----------
const body = part("Exoskeleton", "body", "major");
{
  const STATIONS = [NOSE, -272, -251, -229, -149, -127, PEAK, 130, 152, 232, 254, 270, TAIL];
  const rings = STATIONS.map(y => ring(section(y)));
  loft(body, rings.map(pts => ({ pts })));
  // every crease along the length
  rings.forEach((r, i) => i && r.forEach((q, k) => line(body, rings[i - 1][k], q)));
  // across: the nose, the bumper's edge, the peak, the tail; at the arches, only their sides
  [0, 1, 6, rings.length - 1].forEach(i => loop(body, rings[i]));
  [2, 3, 4, 5, 7, 8, 9, 10].forEach(i => { const r = rings[i]; line(body, r[0], r[5]); line(body, r[1], r[2]); });
  // nose and tail faces
  [[rings[0], true], [rings[rings.length - 1], false]].forEach(([r, flip]) => {
    const c = r.reduce((m, q) => m.map((v, i) => v + q[i] / r.length), [0, 0, 0]);
    r.forEach((q, i) => (flip ? tri(body, c, r[(i + 1) % r.length], q) : tri(body, c, q, r[(i + 1) % r.length])));
  });
  // the charge port door on the left rear quarter, side repeater cameras on the front fenders
  loop(body, [lower(116, 0.55, -1), lower(138, 0.55, -1), lower(138, 0.88, -1), lower(116, 0.88, -1)]);
  [-1, 1].forEach(side => loop(body, [upper(-214, 0.08, side, 0.5), upper(-204, 0.08, side, 0.5), upper(-204, 0.2, side, 0.5), upper(-214, 0.2, side, 0.5)]));
  // the A-pillars' edges, where the doors' glass meets the body
  [-1, 1].forEach(side => line(body, upper(-160, 0.12, side), upper(-70, 0.88, side)));
}

// ---------- opening panels: frunk, doors and their windows, tailgate ----------
const frunk = part("Frunk Lid", "frunk", "major");
facePanel(frunk, (y, s) => onTop((-1 + 2 * s) * (section(y).wt - 5), y, 0.45), NOSE + 7, -208, 0, 1, 10, true);
for (let y = -270; y <= -220; y += 10) line(frunk, onTop(-section(y).wt + 8, y, 0.6), onTop(-section(y).wt + 14, y, 0.6));   // a row of vents
[["F", -150, -15], ["R", -13, 112]].forEach(([fr, y0, y1]) => [["L", -1], ["R", 1]].forEach(([lr, side]) => {
  const mod = "door" + fr + lr, name = (fr === "F" ? "Front" : "Rear") + (side < 0 ? " Left" : " Right");
  const door = part(name + " Door", mod, "major");
  // the steel skin below the belt, and the strip of frame above it up to the glass
  facePanel(door, (y, s) => lower(y, s, side, 0.5), y0, y1, 0.06, 1, 14, side < 0);
  facePanel(door, (y, s) => upper(y, s, side, 0.5), y0, y1, 0, 0.11, 14, side < 0);
  // the button that opens it, on the pillar behind (no handles), and the door's speaker grille outline
  loop(door, [upper(y1 - 7, 0.03, side, 0.8), upper(y1 - 3, 0.03, side, 0.8), upper(y1 - 3, 0.08, side, 0.8), upper(y1 - 7, 0.08, side, 0.8)]);
  loop(door, [lower(y0 + 12, 0.2, side, 0.8), lower(y0 + 34, 0.2, side, 0.8), lower(y0 + 34, 0.45, side, 0.8), lower(y0 + 12, 0.45, side, 0.8)]);
  const win = part(name + " Window", mod, "major");
  const yA = -160, yP = -70, lo = 0.12, hi = 0.88;
  const sTop = y => fr === "F" ? Math.min(hi, lo + (hi - lo) * Math.max(0.02, (y - yA) / (yP - yA))) : hi;
  facePanel(win, (y, s) => upper(y, s, side, 0.6), y0 + 3, y1 - 3, lo, sTop, 16, side < 0);
}));
const tailgate = part("Tailgate", "tailgate", "major");
{
  const pts = [[-90, 56], [90, 56], [94, 100], [88, 112], [-88, 112], [-94, 100]];
  withFrame(q => [q[0], TAIL + q[2], q[1]], () => extrude(tailgate, polyRegion(pts), 0.4, 2.2));
  loop(tailgate, [[-24, TAIL + 2.5, 74], [24, TAIL + 2.5, 74], [24, TAIL + 2.5, 86], [-24, TAIL + 2.5, 86]]);   // plate recess
}

// ---------- glass, mirrors, wiper, lights ----------
const glass = part("Armor Glass", "body", "major");
{
  const topStrip = (y0, y1, inset) => facePanel(glass, (y, s) => onTop((-1 + 2 * s) * (section(y).wt - inset), y), y0, y1, 0, 1, 8, true);
  topStrip(-205, PEAK - 2, 5);     // the windscreen, up to the roof's peak
  topStrip(PEAK + 4, 46, 6);       // the rear window over the cab
  // the fixed glass behind the rear doors
  [-1, 1].forEach(side => facePanel(glass, (y, s) => upper(y, s, side, 0.5), 116, 150, 0.12, y => 0.88 - (y - 116) * 0.018, 6, side < 0));
}
const wiper = part("Wiper", "body", "minor");
tube(wiper, [onTop(56, -178, 1), onTop(-60, -196, 1)], 0.8, 6);
tube(wiper, [onTop(62, -206, 1.2), onTop(48, -186, 1.2)], 1.1, 6);
const mirrors = part("Mirrors", "body", "minor");
[-1, 1].forEach(s => {
  rrBody(mirrors, s * (HALF + 12), -150, 8, 4.5, 2, [[1, 107, true], [0, 109], [0, 118], [1, 120, true]], { seg: 3 });
  tube(mirrors, [[s * HALF, -146, 105], [s * (HALF + 5), -148, 110], [s * (HALF + 8), -150, 112]], 1.4, 8);
  loop(mirrors, [[s * (HALF + 12 + s * 0.3) - 6, -154.6, 109], [s * (HALF + 12) + 6, -154.6, 109], [s * (HALF + 12) + 6, -154.6, 118], [s * (HALF + 12) - 6, -154.6, 118]]);
});
const lights = part("Light Bars", "body", "minor");
withFrame(FY, () => {
  extrude(lights, rrRegion(0, 98, 92, 1.4, 1, 2), NOSE - 0.7, NOSE + 1.5);       // front, across the nose
  for (let x = -84; x <= 84; x += 12) line(lights, [x, 96.6, NOSE - 0.9], [x, 99.4, NOSE - 0.9]);
  extrude(lights, rrRegion(0, 115, 88, 2, 1, 2), TAIL - 1.5, TAIL + 0.9);       // rear, across the tailgate
});
[-1, 1].forEach(s => { tube(lights, [[s * 93, NOSE + 1, 98], [s * 96, NOSE + 14, 99]], 0.8, 6); tube(lights, [[s * 92, TAIL - 1, 115], [s * 99, TAIL - 18, 108]], 1, 6); });   // the bars wrap round the corners

// ---------- cladding, fascia, bumper ----------
const clad = part("Cladding", "body", "minor");
{
  // the grey flares round every arch: a band outside its edges, standing a little proud of the side
  ARCHES.forEach(([a, b, c, d]) => [-1, 1].forEach(side => withFrame(q => [side * (95 + q[2]), q[0], q[1]], () => {
    const inner = [[a, 40], [b, 98], [c, 98], [d, 40]], W = 6;
    const outer = [[a - W, 40], [b - W * 0.55, 98 + 4.5], [c + W * 0.55, 98 + 4.5], [d + W, 40]];
    extrude(clad, stripRegion(inner, outer), 0, 5.6);
  })));
  // the rocker strips between and beyond the arches
  [[-127, 130], [-272, -251], [254, 280]].forEach(([y0, y1]) => [-1, 1].forEach(side => withFrame(q => [side * (95 + q[2]), q[0], q[1]], () =>
    extrude(clad, polyRegion([[y0, bottomZ(y0)], [y1, bottomZ(y1)], [y1, bottomZ(y1) + 11], [y0, bottomZ(y0) + 11]]), 0, 5.4))));
}
const fascia = part("Front Fascia", "body", "minor");
{
  // the black panel on the nose's sloping underside, with tow hook covers, a camera and the radar
  const r0 = section(NOSE), r1 = section(-272);
  const P = (s, t) => { const a = [(-1 + 2 * s) * r0.wb, NOSE, r0.zb], b = [(-1 + 2 * s) * r1.wb, -272, r1.zb]; return a.map((v, i) => v + (b[i] - v) * t + (i === 1 ? -0.4 : i === 2 ? -0.3 : 0)); };
  const g = [];
  for (let i = 0; i <= 6; i++) g.push([0, 1, 2, 3].map(j => P(i / 6, j / 3)));
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { tri(fascia, g[i][j], g[i][j + 1], g[i + 1][j + 1]); tri(fascia, g[i][j], g[i + 1][j + 1], g[i + 1][j]); }
  loop(fascia, [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]);
  [0.2, 0.8].forEach(s => loop(fascia, [P(s - 0.03, 0.35), P(s + 0.03, 0.35), P(s + 0.03, 0.65), P(s - 0.03, 0.65)]));
  loop(fascia, [P(0.47, 0.2), P(0.53, 0.2), P(0.53, 0.4), P(0.47, 0.4)]);
  loop(fascia, [P(0.4, 0.6), P(0.6, 0.6), P(0.6, 0.85), P(0.4, 0.85)]);
}
const bumper = part("Rear Bumper", "body", "minor");
rrBody(bumper, 0, TAIL - 4, 96, 6, 2, [[0, 46, true], [0, 56, true]], { seg: 3 });
[-70, 70].forEach(x => { extrude(bumper, rrRegion(x, TAIL + 3, 14, 3, 1, 2), 52, 56); for (let k = -10; k <= 10; k += 5) line(bumper, [x + k, TAIL + 0.5, 56.3], [x + k, TAIL + 5.5, 56.3]); });   // step pads
rrBody(bumper, 0, TAIL + 6, 4, 6, 0.6, [[0, 40, true], [0, 48, true]], { seg: 2 });                    // hitch receiver
cyl(bumper, 0, TAIL - 1, 1.5, 57, 59, 10);                                                            // rear camera

// ---------- the vault's tonneau cover ----------
const tonneau = part("Tonneau Cover", "tonneau", "major");
facePanel(tonneau, (y, s) => onTop((-1 + 2 * s) * (section(y).wt - 3), y, 0.6), 52, 280, 0, 1, 12, true);
for (let y = 52 + 9.5; y < 280; y += 9.5) line(tonneau, onTop(-section(y).wt + 3, y, 0.9), onTop(section(y).wt - 3, y, 0.9));   // slats

// ---------- inside ----------
const seats = part("Seats", "interior", "major");
[-42, 42].forEach(x => {
  rrBody(seats, x, -48, 24, 24, 6, [[0, 56, true], [0, 70], [3, 76, true]], { seg: 3 });                                   // cushion
  withFrame(q => [x + q[2], q[0], q[1]], () => extrude(seats, polyRegion([[-26, 74], [-14, 72], [-2, 138], [-14, 140]]), -23, 23));   // backrest
  rrBody(seats, x, -6, 13, 6, 4, [[0, 140, true], [0, 156, true]], { seg: 3 });                                           // headrest
});
rrBody(seats, 0, 62, 72, 22, 6, [[0, 58, true], [0, 72], [3, 78, true]], { seg: 3 });                                      // rear bench
withFrame(q => [q[2], q[0], q[1]], () => extrude(seats, polyRegion([[82, 76], [94, 74], [104, 134], [92, 136]]), -72, 72));
[-46, 0, 46].forEach(x => rrBody(seats, x, 99, 11, 5, 3, [[0, 134, true], [0, 146, true]], { seg: 3 }));
const dash = part("Dashboard", "interior", "major");
rrBody(dash, 0, -146, 88, 22, 6, [[0, 78, true], [0, 98], [6, 102, true]], { seg: 3 });
const screen = part("Touchscreen", "interior", "minor");
withFrame(q => [q[0], -122 + q[2] * Math.cos(0.3) - (q[1] - 100) * Math.sin(0.3), q[1]], () => extrude(screen, rrRegion(0, 112, 20.5, 12.5, 1.5, 3), -1, 0));   // 18.5 in, tilted
const yoke = part("Yoke", "interior", "minor");
withFrame(q => [-42 + q[0], -116 + q[2], 102 + q[1]], () => {
  const loopPts = rrPts(0, 0, 17, 9, 7, 5);
  tube(yoke, [...loopPts, loopPts[0]].map(([x, z]) => [x, z, 0]), 1.6, 8);
  tube(yoke, [[-9, 0, 0], [9, 0, 0]], 2.2, 8);
  rrBody(yoke, 0, 0, 6, 4.5, 2, [[0, -2, true], [0, 2, true]], { seg: 2 });
});
tube(yoke, [[-42, -116, 102], [-42, -134, 96]], 3, 10);                                                // column
const consoleP = part("Center Console", "interior", "major");
rrBody(consoleP, 0, -42, 12, 70, 4, [[0, 56, true], [0, 80], [2, 83, true]], { seg: 3 });
[-70, -54].forEach(y => loop(consoleP, circlePts(0, y, 4, 20).map(q => [...q, 83.3])));                // cupholders
loop(consoleP, [[-9, -40, 83.3], [9, -40, 83.3], [9, 10, 83.3], [-9, 10, 83.3]]);                     // armrest lid
withFrame(q => [q[0], 28.4 + q[2], q[1]], () => extrude(consoleP, rrRegion(0, 74, 10, 6.5, 1, 3), 0, 0.6));   // rear screen

// ---------- underneath: castings, battery, drive units ----------
const castings = part("Castings", "castings", "major");
rrBody(castings, 0, -228, 62, 40, 8, [[0, 44, true], [0, 86, true]], { seg: 3 });
rrBody(castings, 0, 222, 66, 46, 8, [[0, 44, true], [0, 92, true]], { seg: 3 });
[-228, 222].forEach(y => { for (let x = -50; x <= 50; x += 20) line(castings, [x, y - 36, 44], [x, y + 36, 44]); });
withFrame(FY, () => [-228, 222].forEach(y => loop(castings, [[-50, 50, y - 41], [50, 50, y - 41], [50, 80, y - 41], [-50, 80, y - 41]])));
const battery = part("Battery Pack", "battery", "major");
rrBody(battery, 0, 2, 78, 118, 6, [[2, 42, true], [0, 44], [0, 54, true]], { seg: 3 });
for (let y = -100; y <= 100; y += 25) line(battery, [-76, y, 54.3], [76, y, 54.3]);
line(battery, [0, -116, 54.3], [0, 120, 54.3]);
for (let k = 0; k < 14; k++) { const y = -110 + k * 17; [-74, 74].forEach(x => loop(battery, circlePts(x, y, 1.2, 8).map(q => [...q, 54.3]))); }   // bolts round the edge
const drive = part("Drive Units", "drive", "major");
withFrame(FX, () => {
  revolve(drive, AXLES[0], 48, [[0, -28], [17, -28, true], [18, -24], [18, 6], [17, 10, true], [0, 10]], 28);                 // front motor
  [-1, 1].forEach(s => revolve(drive, AXLES[1], 48, [[0, s * 4], [17, s * 4, true], [18, s * 8], [18, s * 32], [17, s * 36, true], [0, s * 36]], 28));   // two at the rear
});
rrBody(drive, 14, AXLES[0], 14, 16, 3, [[0, 32, true], [0, 64, true]], { seg: 3 });                    // front gearbox
rrBody(drive, 0, AXLES[1] + 18, 20, 9, 3, [[0, 34, true], [0, 62, true]], { seg: 3 });                 // rear gearbox
[AXLES[0] + 6, AXLES[1] - 22].forEach(y => rrBody(drive, 0, y, 22, 11, 2, [[0, 66, true], [0, 74, true]], { seg: 3 }));   // inverters
const shafts = part("Half Shafts", "drive", "minor");
AXLES.forEach(y => [-1, 1].forEach(s => withFrame(FX, () => {
  tube(shafts, [[y, WHEEL_R + 2, s * 32], [y, WHEEL_R, s * 64]], 2.6, 10);
  [36, 60].forEach(x => revolve(shafts, y, WHEEL_R + 1, [[0, s * (x - 4)], [4, s * (x - 4)], [6, s * (x - 2.5)], [4.5, s * (x - 1)], [6.5, s * x], [4.5, s * (x + 1.5)], [5.5, s * (x + 3)], [3, s * (x + 4)], [0, s * (x + 4)]], 16));   // CV boots
})));

// ---------- the corners: wheels, brakes, suspension, steering ----------
[["Left", -1, "L"], ["Right", 1, "R"]].forEach(([name, s, k]) => {
  const wheels = part(name + " Wheels", "wheels" + k, "major");
  const corners = part(name + " Suspension", "corners" + k, "major");
  const brakes = part(name + " Brakes", "corners" + k, "minor");
  AXLES.forEach(y => {
    withFrame(q => [s * q[2], q[0], q[1]], () => {
      // the tyre, turned about the axle, with chevron tread blocks over its shoulder
      revolve(wheels, y, WHEEL_R, [[29, 70, true], [38, 69], [42.5, 72], [44, 78], [44, 94], [42.5, 100], [38, 103], [30, 103.5, true]], 48);
      for (let i = 0; i < 64; i++) {
        const a = 2 * Math.PI * i / 64, b = a + 0.045, P = (ang, x, r = 44.35) => [y + r * Math.cos(ang), WHEEL_R + r * Math.sin(ang), x];
        line(wheels, P(a, 79), P(b, 86)); line(wheels, P(b, 86), P(a, 93));
        line(wheels, P(a, 74, 43.2), P(a, 78.5, 44.3)); line(wheels, P(a + 0.05, 93.5, 44.3), P(a + 0.05, 98, 43.2));
      }
      [36.5, 40.5].forEach(r => loop(wheels, circlePts(y, WHEEL_R, r, 48).map(q => [...q, 103.7])));   // sidewall lettering bands
      // the aero cover: flat, with six facets and a centre cap
      cyl(wheels, y, WHEEL_R, 30, 70, 102.6, 36);
      for (let j = 0; j < 6; j++) {
        const a = Math.PI / 6 + j * Math.PI / 3, b = a + Math.PI / 3;
        line(wheels, [y + 12 * Math.cos(a), WHEEL_R + 12 * Math.sin(a), 102.9], [y + 12 * Math.cos(b), WHEEL_R + 12 * Math.sin(b), 102.9]);
        line(wheels, [y + 12 * Math.cos(a), WHEEL_R + 12 * Math.sin(a), 102.9], [y + 28 * Math.cos(a), WHEEL_R + 28 * Math.sin(a), 102.9]);
      }
      revolve(wheels, y, WHEEL_R, [[0, 103.4], [6, 103.4, true], [6, 102.6, true]], 20);
      // a vented brake disc and its caliper, inside the wheel
      revolve(brakes, y, WHEEL_R, [[9, 64], [21, 64, true], [21, 67, true], [9, 67]], 36);
      loop(brakes, circlePts(y, WHEEL_R, 15, 36).map(q => [...q, 67.3]));
      extrude(brakes, rrRegion(y + 13, WHEEL_R + 13, 7, 4, 1.5, 2), 62, 69);
    });
    // double wishbones, the knuckle, an air spring with its damper, and a tie rod
    const S = v => [s * v[0], v[1], v[2]];
    rrBody(corners, s * 66, y, 3, 7, 1.5, [[0, 30, true], [0, 60, true]], { seg: 2 });
    [[-18, 32], [18, 32]].forEach(([dy, z]) => tube(corners, [S([66, y, 32]), S([24, y + dy, z])], 1.8, 8));
    [[-14, 66], [14, 66]].forEach(([dy, z]) => tube(corners, [S([64, y, 60]), S([30, y + dy, z])], 1.5, 8));
    revolve(corners, s * 46, y, [[0, 58], [7, 58], [10, 62], [11.5, 68], [9.5, 73], [11.5, 78], [10, 84], [7, 88], [0, 88]].map(([r, z], i, a) => [r, z, i === 1 || i === a.length - 2]), 20);
    tube(corners, [[s * 46, y, 88], [s * 46, y, 100]], 1.4, 8);
    tube(corners, [S([66, y + (y < 0 ? -9 : 9), 46]), S([20, y + (y < 0 ? -9 : 9), 46])], 1.1, 8);
  });
  withFrame(FX, () => AXLES.forEach(y => cyl(corners, y + (y < 0 ? -9 : 9), 46, 3.4, s > 0 ? 0 : -24, s > 0 ? 24 : 0, 14)));   // steering racks, front and rear
});

// ---------- callouts and the "how it works" tour ----------
const hotspots = [
  ["Stainless exoskeleton", "Cold-rolled stainless steel, unpainted", [...lower(-180, 0.6, 1)], ["Exoskeleton"]],
  ["Frunk", "A lockable trunk under the hood", onTop(0, -240, 0.45), ["Frunk Lid"]],
  ["Armor glass", "Laminated, one big windscreen", onTop(0, -110), ["Armor Glass"]],
  ["Light bar", "Edge to edge across the nose", [0, NOSE - 0.7, 98], ["Light Bars"]],
  ["Doors", "Four, no handles: buttons on the pillars", lower(-80, 0.6, 1, 0.5), ["Front Right Door", "Front Right Window"]],
  ["Vault", "A 6 ft bed under a powered tonneau", onTop(0, 180, 0.6), ["Tonneau Cover"]],
  ["Tailgate", "Drops flat; hitch and steps below", [0, TAIL + 2.2, 100], ["Tailgate"]],
  ["Wheel arch cladding", "Takes the stones, not the steel", [101, -190, 101], ["Cladding"]],
  ["35-inch tyres", "All-terrain tread, aero covers", [102.9, AXLES[0], WHEEL_R + 20], ["Right Wheels"]],
  ["Air suspension", "Double wishbones and air springs", [57.5, AXLES[1], 70], ["Right Suspension"]],
  ["Rear-wheel steer", "Steer-by-wire racks front and rear", [24, AXLES[1] + 9, 46], ["Right Suspension"]],
  ["Brakes", "Vented discs at every corner", [67.3, AXLES[0] + 13, WHEEL_R + 13], ["Right Brakes"]],
  ["Battery pack", "Structural, in the floor", [0, 0, 54], ["Battery Pack"]],
  ["Drive units", "One motor front, two at the rear", [0, AXLES[1], 64], ["Drive Units"]],
  ["Castings", "Two big pieces make each end", [0, -228, 86], ["Castings"]],
  ["Cabin", "Six seats, 18.5 in screen, a yoke", [0, -122, 124], ["Touchscreen", "Dashboard"]],
  ["Side mirrors", "On arms from the doors", [HALF + 12, -150, 120], ["Mirrors"]],
].map(([t, s, p, o]) => ({ t, s, p: r3(p), o }));
const tour = {
  points: {
    pack: [0, 0, 50, "Battery Pack"], front: [0, AXLES[0], 48, "Drive Units"], rear: [0, AXLES[1], 48, "Drive Units"],
    shaft: [0, AXLES[1], WHEEL_R + 2, "Half Shafts"], fw: [102.9, AXLES[0], WHEEL_R, "Right Wheels"], rw: [102.9, AXLES[1], WHEEL_R, "Right Wheels"],
    rackF: [24, AXLES[0] - 9, 46, "Right Suspension"], rackR: [24, AXLES[1] + 9, 46, "Right Suspension"], yoke: [-42, -116, 102, "Yoke"],
    spring: [46, AXLES[1], 88, "Right Suspension"], ground: [102.9, AXLES[1], -10, "Right Wheels"],
    vault: [...onTop(0, 180, 0.6), "Tonneau Cover"], above: [0, 180, topZ(180) + 60, "Tonneau Cover"],
    castF: [0, -228, 86, "Castings"], castR: [0, 222, 92, "Castings"], nose: [0, NOSE - 0.7, 98, "Light Bars"], ahead: [0, NOSE - 80, 98, "Light Bars"],
  },
  steps: [
    { t: "Power from the floor", focus: "pack", dist: 0.55, ex: 1, p: ["pack", "front", "pack", "rear"], n: ["Battery Pack", "Drive Units"], ms: 4400,
      d: "The battery is part of the floor's structure, bolted between the two castings. It feeds a motor at the front axle and two at the rear." },
    { t: "Each motor drives its wheels", focus: "rear", dist: 0.5, ex: 1, p: ["rear", "shaft", "rw"], n: ["Drive Units", "Half Shafts", "Right Wheels", "Left Wheels"], ms: 4200,
      d: "Half-shafts with rubber-booted joints carry each motor's torque out to the wheels; with a motor for each rear wheel, the truck can send power to whichever has grip." },
    { t: "Steer-by-wire, at both ends", focus: "rackF", dist: 0.5, ex: 1, p: ["yoke", "rackF", "rackR"], n: ["Yoke", "Right Suspension", "Left Suspension"], ms: 4400,
      d: "The yoke isn't connected to the wheels: it sends signals to motors on the steering racks. The front wheels turn, and the rear ones steer a few degrees too, shrinking the turning circle." },
    { t: "Air suspension", focus: "spring", dist: 0.45, ex: 1, p: ["spring", "ground"], n: ["Right Suspension", "Left Suspension", "Right Wheels"], ms: 4200,
      d: "Each corner hangs on two wishbones with an air spring and damper between them; pumping the springs up raises the body for clearance off-road, and letting air out lowers it for loading." },
    { t: "Big castings, few parts", focus: "castF", dist: 0.6, ex: 1, p: ["castF", "pack", "castR"], n: ["Castings", "Battery Pack"], ms: 4200,
      d: "Each end of the truck is one large aluminium casting instead of dozens of stamped and welded pieces; the battery ties the two together." },
    { t: "The vault", focus: "vault", dist: 0.6, ex: 0, p: ["above", "vault"], n: ["Tonneau Cover", "Tailgate"], ms: 4200,
      d: "The six-foot bed hides under a powered tonneau cover, whose slats roll up into the back of the cab; the tailgate drops flat over the hitch and steps." },
    { t: "One line of light", focus: "nose", dist: 0.5, ex: 0, p: ["ahead", "nose"], n: ["Light Bars", "Exoskeleton"], ms: 4000,
      d: "A single light bar runs edge to edge across the nose and wraps round its corners, and another runs across the tailgate, following the body's sharp creases." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("CT_GEOMETRY", "cybertruck/build.js", { explode: modules, hotspots, tour, constants: { NOSE, TAIL, PEAK, AXLES, WHEEL_R } });
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>Cybertruck</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the Cybertruck: on hover the stainless body, frunk, doors, tailgate and tonneau lift off, the cabin rises, the wheels and suspension move out and the battery, drive units and castings drop away\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Truck parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Cybertruck</b><span>Electric pickup</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG CT-001 &middot; Rev B<br>Units cm &middot; View az 45&deg; / el 22&deg;<br>Concept page, not affiliated with Tesla</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "cybertruck", label: "Cybertruck", kind: "truck", tags: "cybertruck tesla truck pickup electric ev vehicle car",
  key: "ct-theme", category: "Vehicles", html }, "hover");
console.log(`cybertruck/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
