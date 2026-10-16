/*
Copy engine.js into every model page built into index.html.

Each page carries its own copy of the shared engine, with the shaded and photo styles (realistic.js) spliced in
just before its end. The pages' sources and build_pages.py aren't in this repo, so after a change to engine.js
this puts it into the built pages directly: everything from the engine's first line up to the spliced styles is
replaced, and the styles and the engine's closing lines are left as they are. Then rebuild the pages made here
(they take their engine from those pages):

    node sync_engine.js && node macbookpro/build.js && node egpu/build.js && node hover/build.js
*/
"use strict";
const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const read = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const engine = read(path.join(HERE, "engine.js"));
// the engine up to the end of its frame loop, where the pages splice in the styles
const tail = engine.lastIndexOf("  requestAnimationFrame(tick);\n})();");
if (tail < 0) throw new Error("engine.js doesn't end as expected");
const START = "// Blueprint model engine", STYLES = "// ---------- shaded and photo render styles";
const head = engine.slice(engine.indexOf(START), tail);

const galleryPath = path.join(HERE, "index.html");
const gallery = read(galleryPath);
const m = gallery.match(/\n(  const MODELS = )(\[.*\]);\n/);
if (!m) throw new Error("no MODELS line in index.html");
// JSON as build_gallery.js writes it (Python's json.dumps style), so the rest of the file is unchanged
const json = v => JSON.stringify(v)
  .replace(/[\u0080-￿]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))
  .replace(/("(?:[^"\\]|\\.)*"|[^"]+)/g, t => t[0] === '"' ? t : t.replace(/,/g, ", ").replace(/:/g, ": "));
const models = JSON.parse(m[2]);
if (json(models).split("<").join("\\u003c") !== m[2]) throw new Error("index.html's MODELS wouldn't round-trip; not rewriting it");
let changed = 0;
models.forEach(x => {
  const a = x.html.indexOf(START), s = x.html.indexOf(STYLES, a);
  if (a < 0 || s < 0) throw new Error(x.id + ": engine or styles not found in its page");
  const b = x.html.lastIndexOf("\n", s) + 1;   // the start of the styles' first line
  const html = x.html.slice(0, a) + head + x.html.slice(b);
  if (html !== x.html) { x.html = html; changed++; }
});
fs.writeFileSync(galleryPath, gallery.slice(0, m.index) + "\n" + m[1] + json(models).split("<").join("\\u003c") + ";\n" + gallery.slice(m.index + m[0].length));
console.log(`engine.js copied into ${changed} of ${models.length} pages`);
