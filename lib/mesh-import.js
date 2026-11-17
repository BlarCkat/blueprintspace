/*
Turns a mesh exported from Blender with tools/blend_export.py (gzipped JSON: groups of positions in 0.05 mm units,
triangles and feature edges, one group per object and material) into parts for lib/procedural.js.

  const M = load(file);
  M.take(filter)                       -> the groups matching { name, mat } (strings or regexps), removed from the pool
  M.split(groups)                      -> one group per connected piece
  addPart(name, module, kind, groups, { spool, base, extra })
                                       -> a part made of these groups; positions are made relative to base (in mm)
  bounds(groups)                       -> { min, max, c } in mm
  inset(groups, mm)                    -> moves every vertex this far in against its normal, so a surface that lay
                                          on top of another's (two-tone shells) sits just under it
*/
"use strict";
const fs = require("fs");
const zlib = require("zlib");
const { SCALE, part } = require("./procedural");

function load(file) {
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8"));
  if (Math.abs(data.unit - SCALE) > 1e-9) throw new Error("the mesh's unit isn't the gallery's");
  let pool = data.groups;
  const match = (v, f) => f === undefined || (f instanceof RegExp ? f.test(v) : v === f);
  return {
    take(f) {
      const hit = pool.filter(g => match(g.name, f.name) && match(g.mat, f.mat));
      if (!hit.length) throw new Error("no mesh group matches " + JSON.stringify(String(f.name) + " " + String(f.mat)));
      pool = pool.filter(g => !hit.includes(g));
      return hit;
    },
    rest: () => pool,
    split,
  };
}

// connected pieces of a group (by shared vertices across its triangles and edges)
function split(groups) {
  const out = [];
  groups.forEach(g => {
    const n = g.pos.length / 3, up = Array.from({ length: n }, (_, i) => i);
    const find = i => { while (up[i] !== i) i = up[i] = up[up[i]]; return i; };
    const join = (a, b) => { a = find(a); b = find(b); if (a !== b) up[a] = b; };
    for (let i = 0; i < g.tris.length; i += 3) { join(g.tris[i], g.tris[i + 1]); join(g.tris[i], g.tris[i + 2]); }
    for (let i = 0; i < g.lines.length; i += 2) join(g.lines[i], g.lines[i + 1]);
    const pieces = new Map();
    const piece = r => {
      if (!pieces.has(r)) pieces.set(r, { name: g.name, mat: g.mat, at: new Map(), pos: [], tris: [], lines: [] });
      return pieces.get(r);
    };
    const idx = (p, v) => {
      let k = p.at.get(v);
      if (k === undefined) { k = p.pos.length / 3; p.pos.push(g.pos[3 * v], g.pos[3 * v + 1], g.pos[3 * v + 2]); p.at.set(v, k); }
      return k;
    };
    for (let i = 0; i < g.tris.length; i += 3) { const p = piece(find(g.tris[i])); p.tris.push(idx(p, g.tris[i]), idx(p, g.tris[i + 1]), idx(p, g.tris[i + 2])); }
    for (let i = 0; i < g.lines.length; i += 2) { const p = piece(find(g.lines[i])); p.lines.push(idx(p, g.lines[i]), idx(p, g.lines[i + 1])); }
    pieces.forEach(p => { delete p.at; out.push(p); });
  });
  return out;
}

function bounds(groups) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  groups.forEach(g => { for (let i = 0; i < g.pos.length; i++) { const k = i % 3; min[k] = Math.min(min[k], g.pos[i] * SCALE); max[k] = Math.max(max[k], g.pos[i] * SCALE); } });
  return { min, max, c: min.map((v, i) => (v + max[i]) / 2) };
}

function inset(groups, mm) {
  groups.forEach(g => {
    const n = new Float64Array(g.pos.length);
    for (let i = 0; i < g.tris.length; i += 3) {
      const [a, b, c] = [g.tris[i], g.tris[i + 1], g.tris[i + 2]].map(k => 3 * k);
      const u = [0, 1, 2].map(k => g.pos[b + k] - g.pos[a + k]), w = [0, 1, 2].map(k => g.pos[c + k] - g.pos[a + k]);
      const f = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      [a, b, c].forEach(v => { for (let k = 0; k < 3; k++) n[v + k] += f[k]; });
    }
    const d = mm / SCALE;
    for (let v = 0; v < g.pos.length; v += 3) {
      const l = Math.hypot(n[v], n[v + 1], n[v + 2]);
      if (l > 0) for (let k = 0; k < 3; k++) g.pos[v + k] = Math.round(g.pos[v + k] - d * n[v + k] / l);
    }
  });
  return groups;
}

function addPart(name, module, kind, groups, o = {}) {
  const p = part(name, module, kind, Object.assign(o.spool ? { spool: o.spool } : {}, o.extra));
  const b = (o.base || [0, 0, 0]).map(c => Math.round(c / SCALE));
  groups.forEach(g => {
    const off = p.v.length / 3;
    for (let i = 0; i < g.pos.length; i++) p.v.push(g.pos[i] - b[i % 3]);
    g.lines.forEach(i => p.lines.push(i + off));
    g.tris.forEach(i => p.tris.push(i + off));
  });
  return p;
}

module.exports = { load, split, bounds, inset, addPart };
