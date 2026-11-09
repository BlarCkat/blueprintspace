/*
An open hardcover book whose pages turn by themselves, forever: builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm, lying open on its back: X across (the spine on X = 0), Y up the
page (the head of the book at +Y), Z up; 340 x 250 open, its page blocks 16 mm deep. The covers, the rounded spine,
the two page blocks with their fore-edges, the headbands and a ribbon bookmark are geometry here. The pages that
turn, and the two that lie open on top of the blocks, are made by model.js, which bends them every frame and prints
them as they come round. The page's chrome and the shared engine come from the X9 page.

    node book/build.js

Writes book/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, polyRegion, extrude, rrBody, cyl, tube,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y
const PW = 155, PH = 236;            // a page: width out from the spine, height
const BOARD = 3, TOP = 16;           // the boards' thickness; the top of the page blocks
const COVER = { w: 168, h: 125 };    // each board, out from the spine, and half its height
// the top of a page block, out from the spine: it dips into the gutter where the pages are sewn
const gutter = s => TOP - 6 * Math.pow(1 - Math.min(1, s / 24), 2);
const PAGE = { w: PW, h: PH, top: TOP, gutterDip: 6, gutterW: 24 };

const explode = { covers: [0, 0, -50], spine: [0, 0, -20], left: [-50, 0, 30], right: [50, 0, 30], ribbon: [30, 0, 80], bands: [0, 30, 10] };

// ---------- the case: two boards and the spine ----------
const covers = part("Covers", "covers", "major");
[-1, 1].forEach(s => {
  const x0 = s < 0 ? -COVER.w : 6, x1 = s < 0 ? -6 : COVER.w;
  rrBody(covers, (x0 + x1) / 2, 0, (x1 - x0) / 2, COVER.h, [s < 0 ? 3 : 0, s < 0 ? 0 : 3, s < 0 ? 0 : 3, s < 0 ? 3 : 0], [[0.6, 0, true], [0, 0.8], [0, BOARD - 0.8], [0.6, BOARD, true]], { seg: 3 });
  loop(covers, rrPts((x0 + x1) / 2, 0, (x1 - x0) / 2 - 6, COVER.h - 6, 2, 3).map(q => [...q, BOARD + 0.05]));   // the turn-in of the cloth
});
const spine = part("Spine", "spine", "major");
withFrame(FY, () => {
  // the rounded back, seen end-on: an arc under the gutter, pushed along the book's height
  const arc = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI + Math.PI * i / 16; arc.push([14 * Math.cos(a), 4 + 8 * Math.sin(a)]); }
  extrude(spine, polyRegion([...arc, [8, BOARD], [-8, BOARD]]), -COVER.h, COVER.h);
  [-1, 1].forEach(s => line(spine, [s * 9, 4, -COVER.h + 0.05], [s * 9, 4, COVER.h - 0.05]));   // the hinges where the boards fold
});

// ---------- the page blocks ----------
function block(s) {
  const p = part(s < 0 ? "Left Pages" : "Right Pages", s < 0 ? "left" : "right", "major");
  const N = 28, prof = Array.from({ length: N + 1 }, (_, i) => { const u = 2 + (PW - 2) * i / N; return [s * u, gutter(u)]; });
  withFrame(FY, () => {
    const outline = [[s * 2, BOARD], [s * PW, BOARD], ...prof.slice().reverse()];
    extrude(p, polyRegion(s < 0 ? outline : outline.slice().reverse()), -PH / 2, PH / 2);
  });
  // the fore-edge and the head and tail: the edges of the leaves
  for (let z = BOARD + 0.9; z < TOP - 0.4; z += 0.9) {
    line(p, [s * (PW + 0.05), -PH / 2 + 1, z], [s * (PW + 0.05), PH / 2 - 1, z]);
    [-1, 1].forEach(e => line(p, [s * 40, e * (PH / 2 + 0.05), z], [s * (PW - 1), e * (PH / 2 + 0.05), z]));
  }
  return p;
}
block(-1);
block(1);
const bands = part("Headbands", "bands", "minor");
[-1, 1].forEach(e => tube(bands, [[-8, e * (PH / 2 + 1.5), 7], [0, e * (PH / 2 + 2.5), 5], [8, e * (PH / 2 + 1.5), 7]], 1.6, 10));
const ribbon = part("Bookmark", "ribbon", "minor");
tube(ribbon, [[2, PH / 2 - 2, gutter(2) + 0.6], [14, PH / 2 - 60, TOP + 0.6], [30, -PH / 2 + 40, TOP + 0.6], [36, -PH / 2 - 2, TOP - 2], [40, -PH / 2 - 14, BOARD - 6], [42, -PH / 2 - 40, -14]], 1.4, 8);

// ---------- callouts and the tour ----------
const hotspots = [
  ["Turning pages", "They never run out", [80, 0, TOP + 40], ["Right Pages"]],
  ["Text block", "Folded sections, sewn together", [-PW, 40, TOP - 4], ["Left Pages"]],
  ["Fore-edge", "Every leaf's edge, trimmed flat", [PW, -60, 8], ["Right Pages"]],
  ["Rounded spine", "Glued, lined and rounded", [0, -COVER.h, -4], ["Spine"]],
  ["Boards", "Card covered in cloth", [-COVER.w + 20, -COVER.h + 20, BOARD], ["Covers"]],
  ["Headbands", "At the head and tail of the spine", [0, PH / 2 + 2.5, 5], ["Headbands"]],
  ["Ribbon bookmark", "Sewn into the spine", [30, -PH / 2 + 40, TOP + 0.6], ["Bookmark"]],
].map(([t, s, p, o]) => ({ t, s, p: r3(p), o }));
const pt = (name, p) => [...r3(p), name];
const tour = {
  points: {
    left: pt("Left Pages", [-PW / 2, 0, TOP]), right: pt("Right Pages", [PW / 2, 0, TOP]), gutter: pt("Spine", [0, 0, 6]), spine: pt("Spine", [0, -COVER.h, -4]),
    edge: pt("Right Pages", [PW, 0, 8]), board: pt("Covers", [-COVER.w / 2, 0, BOARD]), band: pt("Headbands", [0, PH / 2 + 2.5, 5]), lift: pt("Right Pages", [80, 0, TOP + 60]),
  },
  steps: [
    { t: "Folded and sewn", focus: "gutter", dist: 0.45, ex: 1, p: ["right", "gutter", "left"], n: ["Left Pages", "Right Pages"], ms: 4200,
      d: "Big printed sheets are folded into sections of 16 or 32 pages, and the sections are sewn together through their folds. That's why the pages dip into the gutter." },
    { t: "The spine", focus: "spine", dist: 0.45, ex: 1, p: ["gutter", "spine"], n: ["Spine", "Headbands"], ms: 4000,
      d: "The sewn back is glued, lined with mull and paper and rounded, so the book opens flat and the fore-edge curves in. Headbands finish the head and tail." },
    { t: "The case", focus: "board", dist: 0.5, ex: 1, p: ["spine", "board"], n: ["Covers", "Spine"], ms: 4000,
      d: "Two boards covered in cloth make the case; it's glued on through the endpapers, hinging at the grooves either side of the spine." },
    { t: "Turning a page", focus: "lift", dist: 0.55, ex: 0, p: ["right", "lift", "left"], n: ["Right Pages", "Left Pages"], ms: 4400,
      d: "A page lifts at its outer edge first, bends, and curls over the spine to lie on the left, showing its other side. In this book the pages never run out." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("BOOK_GEOMETRY", "book/build.js", { explode, hotspots, tour, page: PAGE, constants: { COVER } });
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>Book</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of an open hardcover book whose pages turn by themselves without end: on hover the page blocks lift apart from the spine and the covers\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Book parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Book</b><span>Pages that never end</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG BK-001 &middot; Rev A<br>Units mm &middot; View az 20&deg; / el 40&deg;<br>Original concept design</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "book", label: "Book", kind: "object", tags: "book hardcover pages turning reading infinite animated paper",
  key: "bk-theme", category: "Objects", html }, "washer");
console.log(`book/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
