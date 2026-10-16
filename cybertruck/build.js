/*
Cybertruck: builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in centimetres: Y along its length with the nose at -Y (towards
the default view), X across it, Z up from the ground. The body is lofted through six-sided sections: a
straight line rises from the nose to the roof's peak and another falls to the tail, the lower sides stand
almost upright to the beltline crease and the glass above leans in, and trapezoid notches in the bottom
edge make the wheel arches. Glass, light bars, the tonneau and door seams are laid on those flat faces. The
page's chrome and the shared engine come from the X9 page already in the gallery. Re-run after any change:

    node cybertruck/build.js

Writes cybertruck/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, tri, loop, rrPts, circlePts, rrRegion, extrude, loft, rrBody, cyl, revolve,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
// ---------- the body's shape (cm) ----------
const NOSE = -284, TAIL = 284, PEAK = -30;         // 568 long, the roof's peak just behind the windscreen
const AXLES = [-189, 192], WHEEL_R = 44;           // 381 wheelbase, 35-inch tyres
const BELT = 103, HALF = 100;                      // the beltline crease and the half width there
// the top line: straight up from the nose to the peak, straight down to the tail
const topZ = y => y <= PEAK ? 100 + (179 - 100) * (y - NOSE) / (PEAK - NOSE) : 179 + (120 - 179) * (y - PEAK) / (TAIL - PEAK);
// the bottom edge, with its trapezoid wheel arches: [y, z] corners, straight between them
const BOTTOM = [[NOSE, 88], [-272, 45], [-251, 40], [-229, 98], [-149, 98], [-127, 40], [130, 40], [152, 98], [232, 98], [254, 40], [270, 46], [TAIL, 52]];
const bottomZ = y => { for (let i = 0; i + 1 < BOTTOM.length; i++) { const [a, za] = BOTTOM[i], [b, zb] = BOTTOM[i + 1]; if (y <= b) return za + (zb - za) * (y - a) / (b - a); } return BOTTOM[BOTTOM.length - 1][1]; };
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

const modules = {
  body: { offset: [0, 0, 130] }, tonneau: { offset: [0, 0, 210] },
  wheelsL: { offset: [-90, 0, 0] }, wheelsR: { offset: [90, 0, 0] },
  battery: { offset: [0, 0, -70] }, drive: { offset: [0, 0, -36] },
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
  // door seams and handles-free door edges, and the charge port door on the rear quarter
  [-1, 1].forEach(side => {
    [-150, -14, 112].forEach(y => {
      const a = lower(y, 0.08, side), b = lower(y, 1, side);
      line(body, a, b);
      line(body, b, upper(y, 0.1, side));
    });
    const lo = lower(-150, 0.08, side), lo2 = lower(112, 0.08, side);
    line(body, lo, lo2);
    loop(body, [lower(120, 0.55, side), lower(140, 0.55, side), lower(140, 0.85, side), lower(120, 0.85, side)]);
  });
  // the tailgate's edge
  loop(body, [[-80, TAIL + 0.35, 60], [80, TAIL + 0.35, 60], [80, TAIL + 0.35, 108], [-80, TAIL + 0.35, 108]]);
}

// ---------- glass ----------
const glass = part("Armor Glass", "body", "major");
{
  // a strip of quads over the top face, from y0 to y1, inset from the roof edges
  const topStrip = (y0, y1, inset) => {
    const pts = [];
    for (let y = y0; y <= y1 + 1e-6; y += (y1 - y0) / 8) { const c = section(y); pts.push([[-(c.wt - inset), y, c.zt + 0.35], [c.wt - inset, y, c.zt + 0.35]]); }
    pts.forEach((p, i) => { if (!i) return; const [a, b] = pts[i - 1]; tri(glass, a, b, p[1]); tri(glass, a, p[1], p[0]); });
    loop(glass, [pts[0][0], pts[0][1], ...pts.map(p => p[1]).slice(1), pts[pts.length - 1][0], ...pts.map(p => p[0]).slice(1, -1).reverse()]);
  };
  topStrip(-205, PEAK - 2, 5);     // the windscreen
  topStrip(PEAK + 4, 46, 6);       // the rear window
  // side windows on the leaning glass faces: the front edge follows the A-pillar
  [-1, 1].forEach(side => {
    const lo = 0.12, hi = 0.88, yA = -160, yP = -70, yE = 110;
    const sTop = y => Math.min(hi, lo + (hi - lo) * Math.max(0, (y - yA) / (yP - yA)));
    const ys = []; for (let y = yA; y <= yE + 1e-6; y += 10) ys.push(y);
    ys.forEach((y, i) => {
      if (!i) return;
      const y0 = ys[i - 1], a = upper(y0, lo, side), b = upper(y, lo, side), c = upper(y, sTop(y), side), d = upper(y0, sTop(y0), side);
      if (side > 0) { tri(glass, a, b, c); tri(glass, a, c, d); } else { tri(glass, a, c, b); tri(glass, a, d, c); }
      line(glass, a, b); line(glass, d, c);
    });
    line(glass, upper(yE, lo, side), upper(yE, hi, side));
    line(glass, upper(-14, lo, side), upper(-14, hi, side));   // the B-pillar
  });
  // the one long wiper
  line(glass, [-60, -196, topZ(-196) + 0.6], [56, -178, topZ(-178) + 0.6]);
}
const mirrors = part("Mirrors", "body", "minor");
[-1, 1].forEach(s => extrude(mirrors, rrRegion(s * (HALF + 7), -152, 7, 4, 1.5, 2), 108, 119));
const lights = part("Light Bars", "body", "minor");
withFrame(q => [q[0], q[2], q[1]], () => {
  extrude(lights, rrRegion(0, 98, 92, 1.6, 1.2, 2), NOSE - 0.6, NOSE + 2);   // front, across the nose
  extrude(lights, rrRegion(0, 115, 88, 2.2, 1.2, 2), TAIL - 2, TAIL + 0.8); // rear, across the tailgate
});

// ---------- the vault's tonneau cover ----------
const tonneau = part("Tonneau Cover", "tonneau", "major");
{
  const y0 = 52, y1 = 280, pts = [];
  for (let y = y0; y <= y1 + 1e-6; y += (y1 - y0) / 12) { const c = section(y); pts.push([[-(c.wt - 3), y, c.zt + 0.6], [c.wt - 3, y, c.zt + 0.6]]); }
  pts.forEach((p, i) => { if (!i) return; const [a, b] = pts[i - 1]; tri(tonneau, a, b, p[1]); tri(tonneau, a, p[1], p[0]); });
  loop(tonneau, [pts[0][0], pts[0][1], ...pts.map(p => p[1]).slice(1), pts[pts.length - 1][0], ...pts.map(p => p[0]).slice(1, -1).reverse()]);
  for (let y = y0 + 9.5; y < y1; y += 9.5) { const c = section(y); line(tonneau, [-(c.wt - 3), y, c.zt + 0.9], [c.wt - 3, y, c.zt + 0.9]); }   // slats
}

// ---------- wheels ----------
[["Left", -1, "wheelsL"], ["Right", 1, "wheelsR"]].forEach(([name, s, mod]) => {
  const wheels = part(name + " Wheels", mod, "major");
  AXLES.forEach(y => withFrame(q => [s * q[2], q[0], q[1]], () => {
    // the tyre, turned about the axle, and the flat aero cover with its six-sided pattern
    revolve(wheels, y, WHEEL_R, [[29, 70, true], [38, 69], [42.5, 72], [44, 78], [44, 94], [42.5, 100], [38, 103], [30, 103.5, true]], 48);
    cyl(wheels, y, WHEEL_R, 30, 70, 102.6, 36);
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + k * Math.PI / 3, b = a + Math.PI / 3;
      line(wheels, [y + 12 * Math.cos(a), WHEEL_R + 12 * Math.sin(a), 102.9], [y + 12 * Math.cos(b), WHEEL_R + 12 * Math.sin(b), 102.9]);
      line(wheels, [y + 12 * Math.cos(a), WHEEL_R + 12 * Math.sin(a), 102.9], [y + 27 * Math.cos(a), WHEEL_R + 27 * Math.sin(a), 102.9]);
    }
  }));
});

// ---------- underneath: battery and drive units ----------
const battery = part("Battery Pack", "battery", "major");
rrBody(battery, 0, 2, 78, 118, 6, [[2, 42, true], [0, 44], [0, 54, true]], { seg: 3 });
for (let y = -100; y <= 100; y += 25) line(battery, [-76, y, 54.3], [76, y, 54.3]);
const drive = part("Drive Units", "drive", "major");
AXLES.forEach((y, i) => {
  rrBody(drive, 0, y, i ? 42 : 26, 22, 6, [[0, 30, true], [0, 60, true]], { seg: 3 });   // one motor in front, two at the back
  withFrame(q => [q[2], q[0], q[1]], () => cyl(drive, y, WHEEL_R, 4, -70, 70, 14));        // half-shafts
  [-1, 1].forEach(s => cyl(drive, s * 58, y, 9, WHEEL_R + 16, WHEEL_R + 42, 20));           // air springs
});

// ---------- callouts and the "how it works" tour ----------
const hotspots = [
  ["Stainless exoskeleton", "Cold-rolled stainless steel, unpainted", [...lower(-80, 0.5, 1).slice(0, 3)], ["Exoskeleton"]],
  ["Armor glass", "Laminated, one big windscreen", [0, -110, topZ(-110) + 0.35], ["Armor Glass"]],
  ["Light bar", "Edge to edge across the nose", [0, NOSE - 0.6, 98], ["Light Bars"]],
  ["Vault", "A 6 ft bed under a powered tonneau", [0, 180, topZ(180) + 0.6], ["Tonneau Cover"]],
  ["Wheels and tyres", "35-inch all-terrain, aero covers", [102.9, AXLES[0], WHEEL_R + 20], ["Right Wheels"]],
  ["Rear-wheel steer", "Steer-by-wire at both ends", [102.9, AXLES[1], WHEEL_R + 20], ["Right Wheels"]],
  ["Battery pack", "Structural, in the floor", [0, 0, 54], ["Battery Pack"]],
  ["Drive units", "One motor front, two at the rear", [0, AXLES[1], 60], ["Drive Units"]],
  ["Side mirrors", "Small, on the doors", [HALF + 7, -152, 119], ["Mirrors"]],
].map(([t, s, p, o]) => ({ t, s, p: r3(p), o }));
const tour = {
  points: {
    pack: [0, 0, 50, "Battery Pack"], front: [0, AXLES[0], 45, "Drive Units"], rear: [0, AXLES[1], 45, "Drive Units"],
    fw: [102.9, AXLES[0], WHEEL_R, "Right Wheels"], rw: [102.9, AXLES[1], WHEEL_R, "Right Wheels"],
    spring: [58, AXLES[1], WHEEL_R + 42, "Drive Units"], ground: [102.9, AXLES[1], -10, "Right Wheels"],
    vault: [0, 180, topZ(180) + 0.6, "Tonneau Cover"], above: [0, 180, topZ(180) + 60, "Tonneau Cover"],
    nose: [0, NOSE - 0.6, 98, "Light Bars"], ahead: [0, NOSE - 80, 98, "Light Bars"],
  },
  steps: [
    { t: "Power from the floor", focus: "pack", dist: 0.55, ex: 1, p: ["pack", "front", "pack", "rear"], n: ["Battery Pack", "Drive Units"], ms: 4400,
      d: "The battery is part of the floor's structure. It feeds a motor at the front axle and two at the rear, three in all on the top version." },
    { t: "Each motor drives its wheels", focus: "rear", dist: 0.5, ex: 1, p: ["rear", "rw"], n: ["Drive Units", "Right Wheels", "Left Wheels"], ms: 4200,
      d: "Short half-shafts carry each motor's torque out to the wheels; with a motor for each rear wheel, the truck can send power to whichever has grip." },
    { t: "Steer-by-wire, at both ends", focus: "fw", dist: 0.5, ex: 0, p: ["fw", "rw"], n: ["Right Wheels", "Left Wheels"], ms: 4200,
      d: "There's no steering column: the yoke sends signals to motors that turn the front wheels, and the rear wheels steer a few degrees too, shrinking the turning circle." },
    { t: "Air suspension", focus: "spring", dist: 0.45, ex: 1, p: ["spring", "ground"], n: ["Drive Units", "Right Wheels"], ms: 4200,
      d: "An air spring at each corner raises the body for clearance off-road and lowers it for loading and on the highway." },
    { t: "The vault", focus: "vault", dist: 0.6, ex: 0, p: ["above", "vault"], n: ["Tonneau Cover"], ms: 4200,
      d: "The six-foot bed hides under a powered tonneau cover, whose slats roll up into the back of the cab." },
    { t: "One line of light", focus: "nose", dist: 0.5, ex: 0, p: ["ahead", "nose"], n: ["Light Bars", "Exoskeleton"], ms: 4000,
      d: "A single light bar runs edge to edge across the nose, and another across the tailgate, following the body's sharp creases." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("CT_GEOMETRY", "cybertruck/build.js", { explode: modules, hotspots, tour, constants: { NOSE, TAIL, PEAK, AXLES, WHEEL_R } });
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>Cybertruck</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the Cybertruck: on hover the stainless body and tonneau lift off, the wheels move out and the battery and drive units drop away\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Truck parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Cybertruck</b><span>Electric pickup</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG CT-001 &middot; Rev A<br>Units cm &middot; View az 45&deg; / el 22&deg;<br>Concept page, not affiliated with Tesla</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "cybertruck", label: "Cybertruck", kind: "truck", tags: "cybertruck tesla truck pickup electric ev vehicle car",
  key: "ct-theme", category: "Vehicles", html }, "hover");
console.log(`cybertruck/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
