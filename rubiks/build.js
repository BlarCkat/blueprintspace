/*
Rubik's Cube: builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm, the cube's centre at the origin: X right, Y back (the green
face towards the default view), Z up (white on top). 26 bevelled cubies with their stickers round a core of
six spindles. Every cubie and its stickers share a spool of their own, a group that turns about the cube's
centre, so the page can turn any layer by turning the cubies that are in it at that moment (model.js). The
page's chrome and the shared engine come from the X9 page already in the gallery. Re-run after any change:

    node rubiks/build.js

Writes rubiks/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, rrRegion, extrude, rrBody, cyl, revolve, r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const PITCH = 19, HALF = 9.3;   // cubie spacing, and half a cubie (0.4 mm gaps between them)
// faces: letter, colour, outward axis and sign, and a frame that draws in the face's plane, pushing outwards
const FACES = [
  ["U", "White", 2, 1, (c, q) => [c[0] + q[0], c[1] + q[1], c[2] + q[2]]],
  ["D", "Yellow", 2, -1, (c, q) => [c[0] + q[0], c[1] - q[1], c[2] - q[2]]],
  ["R", "Red", 0, 1, (c, q) => [c[0] + q[2], c[1] + q[0], c[2] + q[1]]],
  ["L", "Orange", 0, -1, (c, q) => [c[0] - q[2], c[1] - q[0], c[2] + q[1]]],
  ["B", "Blue", 1, 1, (c, q) => [c[0] - q[0], c[1] + q[2], c[2] + q[1]]],
  ["F", "Green", 1, -1, (c, q) => [c[0] + q[0], c[1] - q[2], c[2] + q[1]]],
];

const modules = { core: { offset: [0, 0, 0] }, cube: { offset: [0, 0, 0] } };
// the core: a hub with six spindles, one up into each centre
const core = part("Core", "core", "major");
revolve(core, 0, 0, Array.from({ length: 9 }, (_, i) => { const a = -Math.PI / 2 + Math.PI * i / 8; return [Math.max(0, 7 * Math.cos(a)), 7 * Math.sin(a)]; }), 24);
[q => q, q => [q[2], q[0], q[1]], q => [q[0], q[2], q[1]]].forEach(f => withFrame(f, () => cyl(core, 0, 0, 2.6, -17, 17, 16)));

const cubies = [];
for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
  if (!i && !j && !k) continue;
  const home = [i, j, k], c = home.map(v => v * PITCH);
  const faces = FACES.filter(([, , ax, s]) => home[ax] === s);
  const kind = faces.length === 3 ? "Corner" : faces.length === 2 ? "Edge" : "Center";
  const name = kind + " " + faces.map(f => f[0]).join("");
  const spool = "q" + cubies.length;
  const body = part(name, "cube", "major", { spool });
  rrBody(body, c[0], c[1], HALF, HALF, 1.8, [[1.2, c[2] - HALF, true], [0, c[2] - HALF + 1.2], [0, c[2] + HALF - 1.2], [1.2, c[2] + HALF, true]], { seg: 3 });
  faces.forEach(([letter, colour, , , frame]) => {
    const st = part(name + " " + colour + " Sticker", "cube", "minor", { spool });
    withFrame(q => frame(c, q), () => extrude(st, rrRegion(0, 0, 7.9, 7.9, 1.8, 3), HALF - 0.05, HALF + 0.35));
  });
  cubies.push({ name, spool, home });
}

// ---------- callouts and the "how it works" tour (on the centres and the core, which stay where they are) ----------
const hotspots = [
  ["Centre pieces", "Six, fixed to the core; they only spin", [0, 0, 1.5 * PITCH + 0.35], ["Center U"]],
  ["Stickers", "54 squares, nine to a face", [0, -1.5 * PITCH - 0.35, 0], ["Center F"]],
  ["Layers", "Any face or middle slice turns", [1.5 * PITCH + 0.35, 0, 0], ["Center R"]],
  ["Core", "A hub with six spindles", [0, 0, 0], ["Core"]],
].map(([t, s, p, o]) => ({ t, s, p: r3(p), o }));
const tour = {
  points: {
    core: [0, 0, 0, "Core"], up: [0, 0, 1.5 * PITCH, "Center U"], front: [0, -1.5 * PITCH, 0, "Center F"], right: [1.5 * PITCH, 0, 0, "Center R"],
    above: [0, 0, 3 * PITCH, "Center U"], spin: [0, -2.4 * PITCH, 0, "Center F"],
  },
  steps: [
    { t: "A core with six arms", focus: "core", dist: 0.55, ex: 1, p: ["core", "up"], n: ["Core"], ms: 4200,
      d: "At the heart is a hub with six spindles. Each centre piece is screwed to the end of one, on a spring, so it can spin but never move." },
    { t: "Centres set the colours", focus: "up", dist: 0.6, ex: 1, p: ["above", "up", "core"], n: ["Center U", "Center D", "Center R", "Center L", "Center F", "Center B"], ms: 4200,
      d: "Because the centres never move, they fix each face's colour: white opposite yellow, red opposite orange, green opposite blue." },
    { t: "Edges and corners ride on them", focus: "front", dist: 0.6, ex: 1, p: ["spin", "front"], n: [], ms: 4400,
      d: "The twelve edges and eight corners have feet that hook under their neighbours, so the whole cube holds itself together round the centres, with nothing else inside." },
    { t: "Any layer can turn", focus: "right", dist: 0.7, ex: 0, p: ["right", "core"], n: [], ms: 4400,
      d: "A face turns about its centre's spindle, carrying its edges and corners with it. Turns can follow in any order: about 43 quintillion arrangements, and every one can be solved in 20 moves or fewer." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("RC_GEOMETRY", "rubiks/build.js", { explode: modules, hotspots, tour, cubies, constants: { PITCH, HALF } });
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>Rubik's Cube</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of a Rubik's Cube turning its layers, scrambling and solving itself: on hover the 26 pieces spread apart round the core\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Cube parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Rubik\'s Cube</b><span>3 x 3 x 3</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG RC3-001 &middot; Rev A<br>Units mm &middot; View az 45&deg; / el 30&deg;<br>Concept page, not affiliated with Rubik\'s</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "rubiks", label: "Rubik's Cube", kind: "puzzle", tags: "rubiks rubik cube puzzle toy 3x3 speedcube animated",
  key: "rc3-theme", category: "Toys", html }, "cybertruck");
console.log(`rubiks/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
