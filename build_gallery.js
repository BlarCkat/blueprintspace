/*
Combine every blueprint landing page into one self-contained file, blueprints/index.html.

Each model page (with its geometry inlined) is embedded as a string and shown in a full-window
frame. A model dropdown is added to each page's header, next to its theme swatches; the chosen
theme carries over between models. Re-run after any page changes:

    node build_gallery.js
*/
"use strict";
const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const ROOT = path.join(HERE, "..");
// listed in dropdown order: models are grouped under their category's heading.
// folder: the page folder; key: the localStorage theme key the page uses
const MODELS = [
  { id: "macintosh", label: "Macintosh 128K", kind: "desktop", tags: "desktop apple mac 1984 computer",
    folder: "macintosh_landing", key: "mac128k-theme", category: "Computers" },
  { id: "spectre", label: "Spectre x360 14", kind: "laptop", tags: "laptop hp convertible notebook 2-in-1",
    folder: "spectre_landing", key: "sx360-theme", category: "Computers" },
  { id: "iphone17", label: "iPhone 17", kind: "phone", tags: "phone apple smartphone mobile",
    folder: "iphone17_landing", key: "ip17-theme", category: "Phones" },
  { id: "playstation", label: "PlayStation", kind: "console", tags: "console sony ps1 psx playstation 1 dualshock controller 1994 games",
    folder: "playstation_landing", key: "ps1-theme", category: "Consoles" },
  { id: "ps3", label: "PlayStation 3", kind: "console", tags: "console sony ps3 cell dualshock 3 sixaxis 2006 games blu-ray",
    folder: "ps3_landing", key: "ps3-theme", category: "Consoles" },
  { id: "ps4", label: "PlayStation 4", kind: "console", tags: "console sony ps4 dualshock 4 2013 games",
    folder: "ps4_landing", key: "ps4-theme", category: "Consoles" },
  { id: "ps5", label: "PlayStation 5", kind: "console", tags: "console sony ps5 dualsense 2020 games",
    folder: "ps5_landing", key: "ps5-theme", category: "Consoles" },
  { id: "cpu", label: "X9 Processor", kind: "chip", tags: "chip cpu desktop socket lga",
    folder: "cpu_landing", key: "x9-theme", category: "Components" },
  { id: "turbofan", label: "TF-9 Turbofan", kind: "engine", tags: "engine jet turbine aircraft",
    folder: "turbofan_landing", key: "tf9-theme", category: "Engines" },
];
const DEFAULT = "macintosh";

// read as text with \r\n folded to \n, so a checkout with Windows line endings builds the same file
const read = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");

function page(folder) {
  const d = path.join(ROOT, folder);
  const html = read(path.join(d, "index.html"));
  // local <script src="x.js"> -> inline script
  return html.replace(/<script src="(?!https?:)([^"]+)"><\/script>/g,
    (_, src) => "<script>\n" + read(path.join(d, src)) + "</script>");
}

// JSON as Python's json.dumps writes it: ", " and ": " separators, everything past ASCII as \uXXXX
const json = v => JSON.stringify(v)
  .replace(/[\u0080-￿]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))
  .replace(/("(?:[^"\\]|\\.)*"|[^"]+)/g, t => t[0] === '"' ? t : t.replace(/,/g, ", ").replace(/:/g, ": "));

const models = MODELS.map(({ id, label, kind, tags, folder, key, category }) =>
  ({ id, label, kind, tags, key, category, html: page(folder) }));

const shell = read(path.join(HERE, "gallery_shell.html"));
const data = json(models).split("<").join("\\u003c");  // no "</script>" or "<!--" inside the script
const out = shell.split("/*MODELS*/[]").join(data).split('/*DEFAULT*/""').join(json(DEFAULT));
const dest = path.join(HERE, "index.html");
fs.writeFileSync(dest, out);
console.log(`index.html ${(fs.statSync(dest).size / 1e6).toFixed(2)} MB, models: ` + models.map(m => m.label).join(", "));
