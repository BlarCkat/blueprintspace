/*
Procedural blueprint models: the mesh building, packing and page assembly shared by the models whose
geometry is generated in code instead of exported from Blender (macbookpro/build.js, egpu/build.js).

Geometry is in Blender mm (Z up) and packed as export_geometry.py does: Int16 positions times `scale`,
then per-object Uint16 indices local to each object, line pairs first, then triangles. A page is an existing
gallery page (its chrome and the shared engine) with the model's geometry and script swapped in.
*/
"use strict";
const fs = require("fs");
const path = require("path");

const REPO = path.join(__dirname, "..");
const SCALE = 0.05;
const read = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");

// ---------- mesh building ----------
const parts = [];
let frame = q => q;
function withFrame(f, fn) {
  const prev = frame;
  frame = q => prev(f(q));
  try { fn(); } finally { frame = prev; }
}
function part(name, module, kind, extra) {
  const p = Object.assign({ name, module, kind, v: [], at: new Map(), lines: [], lineSet: new Set(), tris: [] }, extra);
  parts.push(p);
  return p;
}
function vert(p, q) {
  const k = frame(q).map(c => Math.round(c / SCALE));
  const key = k.join(",");
  let i = p.at.get(key);
  if (i === undefined) { i = p.v.length / 3; p.v.push(...k); p.at.set(key, i); }
  return i;
}
function line(p, a, b) {
  const i = vert(p, a), j = vert(p, b);
  if (i === j) return;
  const key = i < j ? i + "," + j : j + "," + i;
  if (p.lineSet.has(key)) return;
  p.lineSet.add(key);
  p.lines.push(i, j);
}
function tri(p, a, b, c) {
  const i = vert(p, a), j = vert(p, b), k = vert(p, c);
  if (i === j || j === k || i === k) return;
  p.tris.push(i, j, k);
}
function loop(p, pts) { pts.forEach((q, i) => line(p, q, pts[(i + 1) % pts.length])); }

// ---------- 2D regions (lists of counter-clockwise triangles) ----------
const CORNERS = [[-1, -1, 180], [1, -1, 270], [1, 1, 0], [-1, 1, 90]];   // bl, br, tr, tl and each arc's start angle
const radii = r => Array.isArray(r) ? r : [r, r, r, r];
// rounded rectangle outline, counter-clockwise from the bottom-left arc; always seg + 1 points per corner,
// so rings of a loft line up even where a corner is square
function rrPts(cx, cy, hw, hh, r, seg = 6) {
  const out = [];
  radii(r).forEach((rk, k) => {
    const [sx, sy, a0] = CORNERS[k];
    const ox = cx + sx * (hw - rk), oy = cy + sy * (hh - rk);
    for (let s = 0; s <= seg; s++) {
      const a = (a0 + 90 * s / seg) * Math.PI / 180;
      out.push([ox + rk * Math.cos(a), oy + rk * Math.sin(a)]);
    }
  });
  return out;
}
const circlePts = (cx, cy, r, n, a0 = 0) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(a0 + 2 * Math.PI * i / n), cy + r * Math.sin(a0 + 2 * Math.PI * i / n)]);
// a rounded rectangle less axis-aligned rectangular holes [x0, x1, y0, y1] (which may run off its edge):
// a grid of cells between every edge, with a fan in each rounded corner
function rrRegion(cx, cy, hw, hh, r, seg = 6, holes = []) {
  const Rs = radii(r);
  const x0 = cx - hw, x1 = cx + hw, y0 = cy - hh, y1 = cy + hh;
  const xs = new Set([x0, x1]), ys = new Set([y0, y1]);
  Rs.forEach((rk, k) => {
    if (rk <= 0) return;
    xs.add(cx + CORNERS[k][0] * (hw - rk)); ys.add(cy + CORNERS[k][1] * (hh - rk));
  });
  holes.forEach(h => {
    [h[0], h[1]].forEach(x => { if (x > x0 && x < x1) xs.add(x); });
    [h[2], h[3]].forEach(y => { if (y > y0 && y < y1) ys.add(y); });
  });
  const X = [...xs].sort((a, b) => a - b), Y = [...ys].sort((a, b) => a - b);
  const inCorner = (px, py) => Rs.some((rk, k) => rk > 0 &&
    (px - cx) * CORNERS[k][0] > hw - rk && (py - cy) * CORNERS[k][1] > hh - rk);
  const inHole = (px, py) => holes.some(h => px > h[0] && px < h[1] && py > h[2] && py < h[3]);
  const out = [];
  for (let i = 0; i + 1 < X.length; i++) for (let j = 0; j + 1 < Y.length; j++) {
    const mx = (X[i] + X[i + 1]) / 2, my = (Y[j] + Y[j + 1]) / 2;
    if (inCorner(mx, my) || inHole(mx, my)) continue;
    const a = [X[i], Y[j]], b = [X[i + 1], Y[j]], c = [X[i + 1], Y[j + 1]], d = [X[i], Y[j + 1]];
    out.push([a, b, c], [a, c, d]);
  }
  Rs.forEach((rk, k) => {
    if (rk <= 0) return;
    const [sx, sy, a0] = CORNERS[k];
    const o = [cx + sx * (hw - rk), cy + sy * (hh - rk)];
    if (inHole(o[0] + sx * rk / 2, o[1] + sy * rk / 2)) return;
    const arc = [];
    for (let s = 0; s <= seg; s++) {
      const a = (a0 + 90 * s / seg) * Math.PI / 180;
      arc.push([o[0] + rk * Math.cos(a), o[1] + rk * Math.sin(a)]);
    }
    // grid edges that cross the corner's two straight sides would meet the fan in a T: put those points
    // on its sides and fan from inside the sector instead of from its corner
    const along = (p, q) => {
      const horiz = Math.abs(q[1] - p[1]) < 1e-9, vals = horiz ? X : Y, a = horiz ? p[0] : p[1], b = horiz ? q[0] : q[1];
      return vals.filter(v => (v - a) * (b - v) > 1e-9).sort((u, v) => (u - v) * Math.sign(b - a))
        .map(v => horiz ? [v, p[1]] : [p[0], v]);
    };
    const side0 = along(o, arc[0]), side1 = along(arc[seg], o);
    if (!side0.length && !side1.length) {
      for (let s = 0; s < seg; s++) out.push([o, arc[s], arc[s + 1]]);
      return;
    }
    const poly = [o, ...side0, ...arc, ...side1];
    const ac = (a0 + 45) * Math.PI / 180, c = [o[0] + 0.45 * rk * Math.cos(ac), o[1] + 0.45 * rk * Math.sin(ac)];
    poly.forEach((q, i) => out.push([c, q, poly[(i + 1) % poly.length]]));
  });
  return out;
}
const rect = (x0, x1, y0, y1) => rrRegion((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, 0);
// a square less a round opening (a fan's): rays from the centre meet the circle and the square's edge.
// n is a multiple of 8, so the square's corners are on it and neighbouring squares share their edge points.
function squareRing(cx, cy, half, r, n = 48) {
  const out = [];
  const at = i => {
    const a = 2 * Math.PI * i / n + Math.PI / 4, c = Math.cos(a), s = Math.sin(a), m = Math.max(Math.abs(c), Math.abs(s));
    return [[cx + r * c, cy + r * s], [cx + half * c / m, cy + half * s / m]];
  };
  for (let i = 0; i < n; i++) {
    const [ia, oa] = at(i), [ib, ob] = at(i + 1);
    out.push([ia, oa, ob], [ia, ob, ib]);
  }
  return out;
}
// a convex outline, fanned from its centre
function fanRegion(pts) {
  const c = pts.reduce((m, q) => [m[0] + q[0] / pts.length, m[1] + q[1] / pts.length], [0, 0]);
  return pts.map((q, i) => [c, q, pts[(i + 1) % pts.length]]);
}
// the band between two polylines (a curved blade)
function stripRegion(left, right) {
  const out = [];
  for (let i = 0; i + 1 < left.length; i++) out.push([right[i], right[i + 1], left[i + 1]], [right[i], left[i + 1], left[i]]);
  return out;
}
const k2 = q => q[0].toFixed(3) + "," + q[1].toFixed(3);
// the region's outline: triangle edges that no other triangle shares, in the triangles' direction
function boundary(tris) {
  const seen = new Map();
  tris.forEach(t => {
    for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3], ka = k2(a), kb = k2(b);
      const u = ka < kb ? ka + "|" + kb : kb + "|" + ka;
      const e = seen.get(u);
      if (e) e.n++; else seen.set(u, { n: 1, a, b });
    }
  });
  return [...seen.values()].filter(e => e.n === 1).map(e => [e.a, e.b]);
}
// outline points where it turns by more than `deg` (a real corner, not a step round an arc)
function sharpPoints(B, deg = 30) {
  const into = new Map();
  B.forEach(e => into.set(k2(e[1]), e));
  const out = [];
  B.forEach(([a, b]) => {
    const e = into.get(k2(a));
    if (!e) return;
    const d0 = [a[0] - e[0][0], a[1] - e[0][1]], d1 = [b[0] - a[0], b[1] - a[1]];
    const c = (d0[0] * d1[0] + d0[1] * d1[1]) / (Math.hypot(...d0) * Math.hypot(...d1));
    if (c < Math.cos(deg * Math.PI / 180)) out.push(a);
  });
  return out;
}

// ---------- solids ----------
// a region pushed from z0 to z1: caps, walls round its outline, lines round both ends and up its corners
function extrude(p, tris, z0, z1, o = {}) {
  const P = (q, z) => [q[0], q[1], z];
  if (o.top !== false) tris.forEach(t => tri(p, P(t[0], z1), P(t[1], z1), P(t[2], z1)));
  if (o.bottom !== false) tris.forEach(t => tri(p, P(t[0], z0), P(t[2], z0), P(t[1], z0)));
  const B = boundary(tris);
  B.forEach(([a, b]) => {
    if (!o.wallIf || o.wallIf(a, b)) { tri(p, P(a, z0), P(b, z0), P(b, z1)); tri(p, P(a, z0), P(b, z1), P(a, z1)); }
    line(p, P(a, z0), P(b, z0));
    line(p, P(a, z1), P(b, z1));
  });
  sharpPoints(B).forEach(q => line(p, P(q, z0), P(q, z1)));
}
// a flat sheet with its outline
function sheet(p, tris, z) {
  const P = q => [q[0], q[1], z];
  tris.forEach(t => tri(p, P(t[0]), P(t[1]), P(t[2])));
  boundary(tris).forEach(([a, b]) => line(p, P(a), P(b)));
}
// rings of matching points joined by quads; hard rings are drawn as lines
function loft(p, rings) {
  const n = rings[0].pts.length;
  for (let r = 0; r + 1 < rings.length; r++) for (let i = 0; i < n; i++) {
    const A = rings[r].pts, B = rings[r + 1].pts, j = (i + 1) % n;
    tri(p, A[i], A[j], B[j]); tri(p, A[i], B[j], B[i]);
  }
  rings.forEach(g => { if (g.hard) loop(p, g.pts); });
}
// a rounded-rectangle body whose outline steps in along `profile` ([inset, z, hard] from bottom to top),
// for filleted and chamfered edges (the step next to a cap is kept steeper than the shaded style's 32 degree
// crease, or the corner fans shade as if they were part of the fillet); caps on either end, the top one with optional holes
function rrBody(p, cx, cy, hw, hh, r, profile, o = {}) {
  const seg = o.seg || 6;
  const ring = ([inset, z, hard]) => ({
    hard, pts: rrPts(cx, cy, hw - inset, hh - inset, radii(r).map(rk => Math.max(rk - inset, 0)), seg).map(q => [q[0], q[1], z]),
  });
  loft(p, profile.map(ring));
  const cap = ([inset, z], holes) => ({ z, tris: rrRegion(cx, cy, hw - inset, hh - inset, radii(r).map(rk => Math.max(rk - inset, 0)), seg, holes) });
  if (o.top !== false) { const c = cap(profile[profile.length - 1], o.holes); c.tris.forEach(t => tri(p, [...t[0], c.z], [...t[1], c.z], [...t[2], c.z])); }
  if (o.bottom !== false) { const c = cap(profile[0]); c.tris.forEach(t => tri(p, [...t[0], c.z], [...t[2], c.z], [...t[1], c.z])); }
}
function cyl(p, cx, cy, r, z0, z1, n = 32, o = {}) {
  const pts = circlePts(cx, cy, r, n);
  loft(p, [{ hard: true, pts: pts.map(q => [...q, z0]) }, { hard: true, pts: pts.map(q => [...q, z1]) }]);
  if (o.top !== false) pts.forEach((q, i) => tri(p, [cx, cy, z1], [...q, z1], [...pts[(i + 1) % n], z1]));
  if (o.bottom !== false) pts.forEach((q, i) => tri(p, [cx, cy, z0], [...pts[(i + 1) % n], z0], [...q, z0]));
}
// a profile of [radius, z, hard] turned round a vertical axis through (cx, cy): domes, collars, drums.
// A closed profile joins its last point back to its first (a ring with a hole); radius 0 closes it at the axis.
function revolve(p, cx, cy, profile, n = 48, closed = false) {
  const rings = profile.map(([r, z, hard]) => ({ hard, pts: circlePts(cx, cy, r, n).map(q => [...q, z]) }));
  loft(p, closed ? [...rings, rings[0]] : rings);
}
// a profile (side, up) swept along a path of points, capped at both ends
function sweep(p, pathPts, profile) {
  const rings = pathPts.map((q, i) => {
    const a = pathPts[Math.max(0, i - 1)], b = pathPts[Math.min(pathPts.length - 1, i + 1)];
    const t = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(...t);
    const s = [-t[1] / l, t[0] / l];
    // keep the section's width at the bends
    let k = 1;
    if (i > 0 && i < pathPts.length - 1) {
      const u = [q[0] - a[0], q[1] - a[1]], v = [b[0] - q[0], b[1] - q[1]];
      const cos = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v));
      k = 1 / Math.cos(Math.acos(Math.max(-1, Math.min(1, cos))) / 2);
    }
    return { pts: profile.map(([x, y]) => [q[0] + s[0] * x * k, q[1] + s[1] * x * k, q[2] + y]) };
  });
  rings[0].hard = rings[rings.length - 1].hard = true;
  loft(p, rings);
  [rings[0].pts, rings[rings.length - 1].pts].forEach((ring, e) => {
    const c = ring.reduce((m, q) => m.map((v, i) => v + q[i] / ring.length), [0, 0, 0]);
    ring.forEach((q, i) => (e ? tri(p, c, q, ring[(i + 1) % ring.length]) : tri(p, c, ring[(i + 1) % ring.length], q)));
  });
}
// a round tube along a path in 3D (cables, heat pipes): rings perpendicular to each segment
function tube(p, pathPts, r, n = 12) {
  const sub = (a, b) => a.map((v, i) => v - b[i]), norm = a => { const l = Math.hypot(...a); return a.map(v => v / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  let prev = null;
  const rings = pathPts.map((q, i) => {
    const t = norm(sub(pathPts[Math.min(pathPts.length - 1, i + 1)], pathPts[Math.max(0, i - 1)]));
    // carry the last ring's frame along the path (parallel transport), so the rings don't twist
    const u = prev ? norm(sub(prev, t.map(c => c * (prev[0] * t[0] + prev[1] * t[1] + prev[2] * t[2]))))
      : norm(cross(t, Math.abs(t[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
    const v = cross(t, u);
    prev = u;
    return { pts: Array.from({ length: n }, (_, k) => {
      const a = 2 * Math.PI * k / n;
      return q.map((c, j) => c + r * (Math.cos(a) * u[j] + Math.sin(a) * v[j]));
    }) };
  });
  rings[0].hard = rings[rings.length - 1].hard = true;
  loft(p, rings);
  [[rings[0].pts, pathPts[0], 0], [rings[rings.length - 1].pts, pathPts[pathPts.length - 1], 1]].forEach(([ring, c, e]) =>
    ring.forEach((q, i) => (e ? tri(p, c, q, ring[(i + 1) % n]) : tri(p, c, ring[(i + 1) % n], q))));
}
// the walls (and optional floor) of a rectangular opening cut down from z1 to z0
function holeWalls(p, [x0, x1, y0, y1], z0, z1, floor) {
  const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  c.forEach((a, i) => {
    const b = c[(i + 1) % 4];
    tri(p, [...a, z0], [...a, z1], [...b, z1]); tri(p, [...a, z0], [...b, z1], [...b, z0]);
    line(p, [...a, z0], [...b, z0]); line(p, [...a, z0], [...a, z1]);
  });
  if (floor) rect(x0, x1, y0, y1).forEach(t => tri(p, [...t[0], z0], [...t[1], z0], [...t[2], z0]));
}

// ---------- packing ----------
const r3 = v => v.map(c => Math.round(c * 1000) / 1000);
// the geometry script: window[varName] with the objects, the packed data and any extra fields
function geometryScript(varName, generator, extra) {
  let vertexCount = 0, indexCount = 0;
  const objects = parts.map(p => {
    if (p.v.length / 3 > 65535) throw new Error(p.name + " has too many vertices");
    const o = { name: p.name, module: p.module, kind: p.kind };
    if (p.spool) o.spool = p.spool;
    Object.assign(o, { vStart: vertexCount, vCount: p.v.length / 3, lCount: p.lines.length, tCount: p.tris.length, iStart: indexCount });
    vertexCount += o.vCount; indexCount += o.lCount + o.tCount;
    return o;
  });
  const buf = Buffer.alloc(vertexCount * 6 + indexCount * 2);
  let off = 0;
  parts.forEach(p => p.v.forEach(c => {
    if (c < -32768 || c > 32767) throw new Error(p.name + " is out of range");
    buf.writeInt16LE(c, off); off += 2;
  }));
  parts.forEach(p => p.lines.concat(p.tris).forEach(i => { buf.writeUInt16LE(i, off); off += 2; }));
  const G = Object.assign({ scale: SCALE, vertexCount, indexCount, objects }, extra);
  return {
    stats: `${parts.length} parts, ${vertexCount} vertices, ${indexCount} indices`,
    js: "// Generated by " + generator + ". Do not edit.\nwindow." + varName + " = " + JSON.stringify(G) +
      ";\nwindow." + varName + ".data = \"" + buf.toString("base64") + "\";\n",
  };
}

// ---------- the page and the gallery ----------
// JSON as build_gallery.js writes it (Python's json.dumps style), so the rest of index.html is unchanged
const json = v => JSON.stringify(v)
  .replace(/[\u0080-￿]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))
  .replace(/("(?:[^"\\]|\\.)*"|[^"]+)/g, t => t[0] === '"' ? t : t.replace(/,/g, ", ").replace(/:/g, ": "));
const galleryPath = path.join(REPO, "index.html");
function galleryModels() {
  const gallery = read(galleryPath);
  const m = gallery.match(/\n(  const MODELS = )(\[.*\]);\n/);
  if (!m) throw new Error("no MODELS line in index.html");
  const models = JSON.parse(m[2]);
  if (json(models).split("<").join("\\u003c") !== m[2]) throw new Error("index.html's MODELS wouldn't round-trip; not rewriting it");
  return { gallery, m, models };
}
// a gallery page with this model's geometry and script in place of its own
function buildPage({ template, geometry, model, swaps }) {
  const page = galleryModels().models.find(x => x.id === template);
  if (!page) throw new Error("the template page (" + template + ") isn't in index.html");
  let html = page.html;
  const g0 = html.indexOf("<script>", html.indexOf("three.min.js"));
  const g1 = html.lastIndexOf("<script>", html.indexOf("// Blueprint model engine"));
  if (g0 < 0 || g1 < g0) throw new Error("unexpected layout in the " + template + " page");
  html = html.slice(0, g0) + "<script>\n" + geometry + "</script>\n<script>\n" + model + "</script>\n" + html.slice(g1);
  swaps.forEach(([re, to]) => {
    if (!re.test(html)) throw new Error("template text not found: " + re);
    html = html.replace(re, to);
  });
  return html;
}
// put the model in index.html after `after`, replacing any earlier build of it
function addToGallery(entry, after) {
  const { gallery, m, models } = galleryModels();
  const list = models.filter(x => x.id !== entry.id);
  list.splice(list.findIndex(x => x.id === after) + 1, 0, entry);
  fs.writeFileSync(galleryPath, gallery.slice(0, m.index) + "\n" + m[1] + json(list).split("<").join("\\u003c") + ";\n" + gallery.slice(m.index + m[0].length));
  return list.length;
}

module.exports = {
  SCALE, read, withFrame, part, line, tri, loop, rrPts, circlePts, rrRegion, rect, squareRing, fanRegion, stripRegion,
  boundary, extrude, sheet, loft, rrBody, cyl, revolve, sweep, tube, holeWalls, r3, geometryScript, buildPage, addToGallery,
};
