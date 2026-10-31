/*
Builds the blueprintspace npm package (packages/blueprintspace) from the gallery: every model page from index.html as
its own file (models/<id>.html), the grid's thumbnails (thumbs/<id>.webp), a manifest (models.json), and the
<blueprint-model> web component (index.js, with index.d.ts) that embeds a model on any site. Re-run after adding or
changing models:

    node tools/build_package.js [version]

Then publish from packages/blueprintspace with `npm publish` (jsDelivr and unpkg serve every npm version as a CDN).
*/
"use strict";
const fs = require("fs");
const path = require("path");

const REPO = path.join(__dirname, "..");
const OUT = path.join(REPO, "packages", "blueprintspace");
const SRC = path.join(__dirname, "package");
const pkgPath = path.join(OUT, "package.json");
const old = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, "utf8")) : {};
const VERSION = process.argv[2] || old.version || "1.0.0";

const gallery = fs.readFileSync(path.join(REPO, "index.html"), "utf8");
const models = JSON.parse(gallery.match(/\n  const MODELS = (\[.*\]);\n/)[1]);
const manifest = models.map(({ id, label, kind, category, tags }) => ({ id, label, kind, category, tags }));

for (const d of ["models", "thumbs"]) { fs.rmSync(path.join(OUT, d), { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, d), { recursive: true }); }
models.forEach(m => {
  fs.writeFileSync(path.join(OUT, "models", m.id + ".html"), m.html);
  const t = path.join(REPO, "thumbs", m.id + ".webp");
  if (fs.existsSync(t)) fs.copyFileSync(t, path.join(OUT, "thumbs", m.id + ".webp"));
});
fs.writeFileSync(path.join(OUT, "models.json"), JSON.stringify(manifest, null, 2) + "\n");
// the component, with the manifest and version filled in
const fill = s => s.replace("/*MODELS*/[]", JSON.stringify(manifest)).replace(/__VERSION__/g, VERSION)
  .replace("/*IDS*/string", manifest.map(m => JSON.stringify(m.id)).join(" | "));
fs.writeFileSync(path.join(OUT, "index.js"), fill(fs.readFileSync(path.join(SRC, "index.js"), "utf8")));
fs.writeFileSync(path.join(OUT, "index.d.ts"), fill(fs.readFileSync(path.join(SRC, "index.d.ts"), "utf8")));
fs.writeFileSync(path.join(OUT, "README.md"), fill(fs.readFileSync(path.join(SRC, "README.md"), "utf8"))
  .replace("<!--MODELS-->", manifest.map(m => "| `" + m.id + "` | " + m.label + " | " + (m.category || "") + " |").join("\n")));
fs.copyFileSync(path.join(SRC, "demo.html"), path.join(OUT, "demo.html"));
fs.writeFileSync(pkgPath, JSON.stringify({
  name: "blueprintspace",
  version: VERSION,
  description: "Interactive 3D blueprint illustrations (consoles, computers, engines, vehicles...) as a drop-in <blueprint-model> web component: line drawing, shaded and photo styles, exploded views, animations.",
  type: "module",
  main: "./index.js",
  module: "./index.js",
  types: "./index.d.ts",
  exports: { ".": { types: "./index.d.ts", default: "./index.js" }, "./models.json": "./models.json", "./models/*": "./models/*", "./thumbs/*": "./thumbs/*" },
  jsdelivr: "./index.js",
  unpkg: "./index.js",
  files: ["index.js", "index.d.ts", "models.json", "models/", "thumbs/", "demo.html", "README.md"],
  sideEffects: ["./index.js"],
  keywords: ["3d", "illustration", "blueprint", "web-component", "custom-element", "three.js", "exploded-view", "product", "hardware"],
  homepage: old.homepage || "https://github.com/BlarCkat/blueprintspace",
  repository: { type: "git", url: "git+https://github.com/BlarCkat/blueprintspace.git", directory: "packages/blueprintspace" },
  license: old.license || "MIT",
}, null, 2) + "\n");
const size = fs.readdirSync(path.join(OUT, "models")).reduce((s, f) => s + fs.statSync(path.join(OUT, "models", f)).size, 0);
console.log(`packages/blueprintspace ${VERSION}: ${manifest.length} models, ${(size / 1e6).toFixed(1)} MB of pages`);
