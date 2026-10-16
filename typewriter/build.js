/*
Vintage typewriter: builds the model page and adds it to the gallery.

A 1930s-style office typewriter, generated in code (with lib/procedural.js) in mm: X across it, Y back from
the keyboard (towards -Y, facing the default view), Z up. The body's side profile is cut away in the middle
for the type basket: 44 type bars on a half circle round the printing point, each a module of its own based
at its pivot so the page can swing it up to the platen. Four rows of round keys, a space bar, ribbon spools
and the carriage: platen, knobs, paper table and paper, bail, margin scale and return lever, all one spool
group so the page can step it along as it types. The page's chrome and the shared engine come from the X9
page already in the gallery. Re-run after any change:

    node typewriter/build.js

Writes typewriter/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, tri, loop, rrPts, circlePts, rrRegion, rect, polyRegion, extrude, rrBody, cyl, revolve, tube,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FX = q => [q[2], q[0], q[1]];   // draws in (y, z) and pushes along x
const W = 135;                         // the body's half width

// ---------- the mechanism's key points ----------
const STRIKE = [0, 30, 110];           // where the type bars hit the platen
const PIVOT_R = 45, PIVOT_Z = 70, BAR = 60;   // type bars pivot on a half circle round the strike point
const SWING = Math.acos(-PIVOT_R / BAR);       // how far each swings up to reach it
const PLATEN = { y: 47, z: 110, r: 17, half: 128 };
const N = 44;

// ---------- the body: one side profile, pushed across ----------
const PROFILE = [[-150, 0], [150, 0], [150, 116], [128, 140], [66, 120], [60, 62], [-30, 62], [-34, 75], [-60, 72], [-150, 40]];
const surfaceZ = y => 40 + (y + 150) * (72 - 40) / 90;   // the keyboard deck's slope, from the front edge back to the basket

const modules = { body: { offset: [0, 0, 0] }, keys: { offset: [0, -80, -10] }, carriage: { offset: [0, 50, 120] },
  platen: { offset: [0, 50, 120], base: [0, PLATEN.y, PLATEN.z] }, ribbon: { offset: [0, 0, 70] } };

const body = part("Body", "body", "major");
withFrame(FX, () => extrude(body, polyRegion(PROFILE), -W, W));
// gold pinstripes on both sides, inset from the outline
const deco = part("Pinstripes", "body", "minor");
[-1, 1].forEach(s => withFrame(q => [s * (W + 0.3), q[0], q[1]], () => {
  loop(deco, [[-138, 8], [138, 8], [138, 108], [122, 126], [76, 112], [70, 56], [-30, 52], [-138, 34]].map(([y, z]) => [y, z, 0]));
  loop(deco, [[-128, 14], [128, 14], [128, 100], [84, 96], [80, 48], [-128, 28]].map(([y, z]) => [y, z, 0]));
}));
const feet = part("Feet", "body", "minor");
[-1, 1].forEach(sx => [-1, 1].forEach(sy => cyl(feet, sx * 110, sy * 120, 9, -6, 0, 20)));

// ---------- keys: four staggered rows of round keys on stems, and the space bar ----------
const keys = [];
for (let r = 0; r < 4; r++) for (let i = 0; i < 11; i++) {
  const n = keys.length, x = (i - 5) * 21 + r * 5 - 7.5, y = -128 + r * 22, top = 60 + r * 10;
  const key = part("Key " + (n + 1), "keys", "minor", { spool: "k" + n });
  revolve(key, x, y, [[0, top - 2.6], [7.5, top - 2.6, true], [8, top - 1.6], [8, top - 0.4], [7.5, top, true], [0, top]], 28);   // chrome ring and glass top
  loop(key, circlePts(x, y, 5.6, 28).map(q => [...q, top + 0.15]));
  extrude(key, rect(x - 1.4, x + 1.4, y - 2, y + 2), surfaceZ(y) - 2, top - 2.6);                                                    // stem
  keys.push({ spool: "k" + n, p: [x, y, top] });
}
const space = part("Space Bar", "keys", "minor", { spool: "space" });
extrude(space, rrRegion(0, -146, 85, 3.5, 3, 3), 44, 50);
[-70, 70].forEach(x => extrude(space, rect(x - 1.5, x + 1.5, -147, -140), 30, 44));

// ---------- the type basket: 44 bars round the printing point ----------
const typebars = [];
for (let i = 0; i < N; i++) {
  const phi = (10 + 160 * i / (N - 1)) * Math.PI / 180;      // round the front half
  const out = [Math.cos(phi), -Math.sin(phi), 0];
  const pivot = [STRIKE[0] + PIVOT_R * out[0], STRIKE[1] + PIVOT_R * out[1], PIVOT_Z];
  const mod = "tb" + i;
  modules[mod] = { offset: [0, 0, 70], base: pivot };
  const bar = part("Type Bar " + (i + 1), mod, "minor", { spool: mod });
  // built round its pivot: a thin bar lying outwards, a slug with the letter at its head
  withFrame(q => [q[0] * out[0] - q[1] * out[1], q[0] * out[1] + q[1] * out[0], q[2]], () => {
    extrude(bar, rect(0, BAR - 4, -0.7, 0.7), -1.6, 1.6);
    extrude(bar, rect(BAR - 5, BAR + 1, -1.6, 1.6), -2.6, 2.6);
    cyl(bar, 0, 0, 2.2, -2.2, 2.2, 12);
  });
  typebars.push({ spool: mod, out: r3(out) });
}
// the segment the bars pivot in, the type guide at the printing point
const segment = part("Segment", "body", "major");
{
  const arc = (r, z) => Array.from({ length: 33 }, (_, k) => { const a = (4 + 172 * k / 32) * Math.PI / 180; return [STRIKE[0] + r * Math.cos(a), STRIKE[1] - r * Math.sin(a), z]; });
  const outer = arc(PIVOT_R + 5, PIVOT_Z), inner = arc(PIVOT_R - 5, PIVOT_Z);
  [-6, 3].forEach(dz => {
    const o = outer.map(q => [q[0], q[1], q[2] + dz]), n = inner.map(q => [q[0], q[1], q[2] + dz]);
    o.forEach((q, k) => k && line(segment, o[k - 1], q)); n.forEach((q, k) => k && line(segment, n[k - 1], q));
  });
  // a solid half ring, so the drawing reads as one cast part
  const ring = [...outer.map(q => [q[0], q[1]]), ...inner.map(q => [q[0], q[1]]).reverse()];
  extrude(segment, polyRegion(ring), PIVOT_Z - 6, PIVOT_Z + 3);
  extrude(segment, rrRegion(0, STRIKE[1] - 3, 9, 2, 1, 2), STRIKE[2] - 16, STRIKE[2] - 6);   // type guide
}

// ---------- ribbon ----------
const ribbon = part("Ribbon Spools", "ribbon", "minor");
const SPOOLS = [-112, 112].map(x => [x, 52, 64]);
SPOOLS.forEach(([x, y, z]) => {
  revolve(ribbon, x, y, [[0, z], [22, z, true], [22, z + 1.5, true], [16, z + 1.5], [16, z + 11], [22, z + 11, true], [22, z + 12.5, true], [0, z + 12.5]], 36);
  [0, 1, 2, 3, 4, 5].forEach(k => { const a = k * Math.PI / 3; line(ribbon, [x + 5 * Math.cos(a), y + 5 * Math.sin(a), z + 12.8], [x + 20 * Math.cos(a), y + 20 * Math.sin(a), z + 12.8]); });
});
// the ribbon itself: from each spool, round a guide, across the printing point
const band = part("Ribbon", "ribbon", "minor");
[-1, 1].forEach(s => {
  const pts = [[s * 112, 30, 70], [s * 112, 30, 104], [s * 24, 29, 104], [0, 29, 104]];
  pts.forEach((q, k) => k && extrude(band, rect(Math.min(pts[k - 1][0], q[0]) - (q[0] === pts[k - 1][0] ? 0.6 : 0), Math.max(pts[k - 1][0], q[0]) + (q[0] === pts[k - 1][0] ? 0.6 : 0), 28.6, 29.4),
    Math.min(pts[k - 1][2], q[2]) - (q[2] === pts[k - 1][2] ? 4 : 0), Math.max(pts[k - 1][2], q[2])));
});

// ---------- the carriage ----------
const platen = part("Platen", "platen", "major", { spool: "platen" });
withFrame(FX, () => {
  cyl(platen, 0, 0, PLATEN.r, -PLATEN.half, PLATEN.half, 40);
  [-1, 1].forEach(s => revolve(platen, 0, 0, [[0, s * PLATEN.half], [5, s * PLATEN.half, true], [5, s * 148, true], [13, s * 150, true],
    [15, s * 154], [15, s * 162], [13, s * 166, true], [0, s * 166]].map(([r, z, h]) => [r, z, h]), 32));
  for (let k = 0; k < 24; k++) { const a = 2 * Math.PI * k / 24; [-1, 1].forEach(s => line(platen, [15.2 * Math.cos(a), 15.2 * Math.sin(a), s * 154], [15.2 * Math.cos(a), 15.2 * Math.sin(a), s * 162])); }   // knurled knobs
});
const carriage = part("Carriage", "carriage", "major", { spool: "carriage" });
withFrame(FX, () => [-1, 1].forEach(s => extrude(carriage, polyRegion([[24, 96], [72, 96], [92, 140], [70, 150], [30, 132]]), s * 140 - 3, s * 140 + 3)));   // end plates
extrude(carriage, rrRegion(0, 96, 150, 5, 2, 2), 132, 142);                                         // rear rail
withFrame(FX, () => cyl(carriage, 26, 134, 2, -120, 120, 14));                                      // paper bail
[-60, 60].forEach(x => withFrame(FX, () => cyl(carriage, 26, 134, 5, x - 4, x + 4, 16)));           // bail rollers
extrude(carriage, rrRegion(0, 14, 128, 4, 1.5, 2), 140, 145);                                       // margin scale
for (let x = -120; x <= 120; x += 6) line(carriage, [x, 10, 145.3], [x, x % 30 === 0 ? 15 : 12.5, 145.3]);
// paper table: a curved plate rising behind the platen
{
  const sec = Array.from({ length: 7 }, (_, k) => { const t = k / 6; return [62 + 48 * t, 124 + 76 * t * t + 20 * t]; });
  const pts = sec.map(([y, z]) => [[-112, y, z], [112, y, z]]);
  pts.forEach((p, k) => {
    if (!k) return;
    const [a, b] = pts[k - 1];
    tri(carriage, a, b, p[1]); tri(carriage, a, p[1], p[0]);
    line(carriage, a, p[0]); line(carriage, b, p[1]);
  });
  line(carriage, pts[0][0], pts[0][1]); line(carriage, pts[pts.length - 1][0], pts[pts.length - 1][1]);
}
// the return lever, out to the left
tube(carriage, [[-146, 40, 140], [-160, 30, 150], [-182, 4, 168], [-188, -8, 170]], 2.5, 10);
revolve(carriage, -188, -8, [[0, 166], [5, 166], [6, 170], [5, 174], [0, 174]], 16);
// the paper, rising from the platen up the table
const PAPER = { x: 105, y0: PLATEN.y + 6, z0: PLATEN.z + PLATEN.r + 2, y1: 120, z1: 268 };
const paper = part("Paper", "carriage", "minor", { spool: "carriage" });
{
  const a = [-PAPER.x, PAPER.y0, PAPER.z0], b = [PAPER.x, PAPER.y0, PAPER.z0], c = [PAPER.x, PAPER.y1, PAPER.z1], d = [-PAPER.x, PAPER.y1, PAPER.z1];
  tri(paper, a, b, c); tri(paper, a, c, d);
  loop(paper, [a, b, c, d]);
}

// ---------- callouts and the "how it works" tour ----------
const BASES = Object.fromEntries(Object.entries(modules).filter(([, m]) => m.base).map(([k, m]) => [k, m.base]));
const baseOfPart = name => { const m = name.match(/^Type Bar (\d+)$/); return m ? BASES["tb" + (m[1] - 1)] : name === "Platen" ? BASES.platen : [0, 0, 0]; };
const local = (name, p) => r3(p.map((c, i) => c - baseOfPart(name)[i]));
const mid = Math.floor(N / 2);
const hotspots = [
  ["Platen", "The rubber roller the type strikes", [0, PLATEN.y - PLATEN.r, PLATEN.z + 8], ["Platen"]],
  ["Carriage", "Steps left one letter at a time", [120, 96, 142], ["Carriage", "Paper", "Platen"]],
  ["Return lever", "Line feed and carriage return", [-188, -8, 174], ["Carriage"]],
  ["Type bars", "44 on a half circle", [STRIKE[0] + PIVOT_R * typebars[mid].out[0], STRIKE[1] + PIVOT_R * typebars[mid].out[1], PIVOT_Z + 3], ["Segment"]],
  ["Keys", "Glass tops in chrome rings", [keys[5].p[0], keys[5].p[1], keys[5].p[2]], ["Key 6"]],
  ["Space bar", "Moves the carriage on, no letter", [0, -146, 50], ["Space Bar"]],
  ["Ribbon spools", "Two colours, wound across", [112, 52, 76.5], ["Ribbon Spools", "Ribbon"]],
  ["Margin scale", "Ten letters to the inch", [-60, 14, 145], ["Carriage"]],
  ["Body", "Cast frame, black enamel", [W + 0.3, -60, 60], ["Body", "Pinstripes"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const kMid = keys[16];
const tour = {
  points: {
    key: pt("Key 17", kMid.p), lever: pt("Body", [kMid.p[0], -40, 60]), bar: pt("Segment", [0, STRIKE[1] - PIVOT_R, PIVOT_Z]),
    strike: pt("Segment", STRIKE), ribbon: pt("Ribbon", [0, 29, 104]), platen: pt("Platen", [0, PLATEN.y - PLATEN.r, PLATEN.z]),
    rail: pt("Carriage", [0, 96, 142]), railEnd: pt("Carriage", [-140, 96, 142]), lever2: pt("Carriage", [-188, -8, 170]),
    paper: pt("Paper", [0, 90, 200]),
  },
  steps: [
    { t: "You press a key", focus: "key", dist: 0.42, ex: 0, p: ["key", "lever"], n: ["Key 17"], ms: 4000,
      d: "Each key sits on a long lever. Pressing it pivots the lever, which pulls a link running back under the basket." },
    { t: "Its type bar flies up", focus: "bar", dist: 0.42, ex: 0, p: ["lever", "bar", "strike"], n: ["Segment", "Type Bar 17"], ms: 4400,
      d: "The link kicks one of 44 type bars, which swings up out of the basket on its pivot in the segment, the slug with its letter leading." },
    { t: "Through the ribbon onto the paper", focus: "strike", dist: 0.34, ex: 0, p: ["strike", "ribbon", "platen"], n: ["Ribbon", "Platen", "Paper"], ms: 4400,
      d: "At the top of its swing the slug hits an inked ribbon against the paper, which is held round the hard rubber platen, and leaves the letter behind." },
    { t: "The carriage steps along", focus: "rail", dist: 0.55, ex: 0, p: ["rail", "railEnd"], n: ["Carriage", "Platen", "Paper"], ms: 4400,
      d: "As the bar falls back, the escapement lets the spring-drawn carriage move one step to the left, ten letters to the inch, so the next letter lands beside the last." },
    { t: "Ding: a new line", focus: "lever2", dist: 0.5, ex: 0, p: ["lever2", "rail"], n: ["Carriage", "Platen"], ms: 4400,
      d: "Near the end of a line a bell rings. Pushing the return lever first turns the platen up one line, then slides the whole carriage back to the margin." },
    { t: "The page grows", focus: "paper", dist: 0.6, ex: 0, p: ["platen", "paper"], n: ["Paper", "Platen"], ms: 4000,
      d: "Line by line the platen feeds the typed sheet up the paper table, under the bail rollers that keep it pressed flat." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("TW_GEOMETRY", "typewriter/build.js", { explode: modules, hotspots, tour, keys: keys.map(k => k.spool), typebars,
  swing: SWING, paper: { origin: [-PAPER.x, PAPER.y0, PAPER.z0], right: [PAPER.x, PAPER.y0, PAPER.z0], top: [-PAPER.x, PAPER.y1, PAPER.z1] },
  ribbonSpools: SPOOLS, constants: { STRIKE, PLATEN } });
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>Vintage Typewriter</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of a vintage typewriter typing on its own: keys go down, type bars swing up to the platen and the carriage steps along; on hover the carriage, keys and type bars come apart\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Typewriter parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Typewriter</b><span>Vintage office model</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG TW-001 &middot; Rev A<br>Units mm &middot; View az 45&deg; / el 30&deg;<br>Concept design</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "typewriter", label: "Vintage Typewriter", kind: "machine", tags: "typewriter vintage retro office keys type mechanical animated",
  key: "tw-theme", category: "Computers", html }, "macintosh");
console.log(`typewriter/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
