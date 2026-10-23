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
// folder: the page folder beside this one (dir: a folder in this one, for pages built here, like
// macbookpro/, framework/, gamingpc/, egpu/, hover/, cybertruck/, rubiks/, typewriter/, xbox/, switch/, psp/, morph/, steam/, walkman/, gameboy/, playdate/, gbconcept/, ledcube/, spaceship/ and v8/build.js's); key: the localStorage theme key the page uses
const MODELS = [
  { id: "macintosh", label: "Macintosh 128K", kind: "desktop", tags: "desktop apple mac 1984 computer",
    folder: "macintosh_landing", key: "mac128k-theme", category: "Computers" },
  { id: "typewriter", label: "Vintage Typewriter", kind: "machine", tags: "typewriter vintage retro office keys type mechanical animated",
    dir: "typewriter", key: "tw-theme", category: "Computers" },
  { id: "spectre", label: "Spectre x360 14", kind: "laptop", tags: "laptop hp convertible notebook 2-in-1",
    folder: "spectre_landing", key: "sx360-theme", category: "Computers" },
  { id: "macbookpro", label: "MacBook Pro 14 (M5)", kind: "laptop", tags: "laptop apple macbook pro m5 notebook 2025",
    dir: "macbookpro", key: "mbp14-theme", category: "Computers" },
  { id: "framework", label: "Framework Laptop 13", kind: "laptop", tags: "framework laptop 13 repairable modular expansion cards notebook linux",
    dir: "framework", key: "fw13-theme", category: "Computers" },
  { id: "gamingpc", label: "Custom Gaming PC", kind: "desktop", tags: "pc gaming custom build tower desktop rgb gpu cpu aio liquid cooling fans animated",
    dir: "gamingpc", key: "gpc-theme", category: "Computers" },
  { id: "iphone17", label: "iPhone 17", kind: "phone", tags: "phone apple smartphone mobile",
    folder: "iphone17_landing", key: "ip17-theme", category: "Phones" },
  { id: "walkman", label: "Sony Walkman", kind: "player", tags: "walkman sony tps-l2 cassette tape player music 1979 retro portable animated",
    dir: "walkman", key: "wm-theme", category: "Audio" },
  { id: "gameboy", label: "Game Boy", kind: "console", tags: "game boy gameboy nintendo dmg handheld 1989 retro tetris cartridge",
    dir: "gameboy", key: "gb-theme", category: "Consoles" },
  { id: "playdate", label: "Playdate", kind: "console", tags: "playdate panic handheld crank yellow 1-bit games",
    dir: "playdate", key: "pd-theme", category: "Consoles" },
  { id: "gbconcept", label: "Game Boy Concept", kind: "console", tags: "game boy concept translucent smoke redesign handheld modern purple",
    dir: "gbconcept", key: "gbc-theme", category: "Consoles" },
  { id: "playstation", label: "PlayStation", kind: "console", tags: "console sony ps1 psx playstation 1 dualshock controller 1994 games",
    folder: "playstation_landing", key: "ps1-theme", category: "Consoles" },
  { id: "ps3", label: "PlayStation 3", kind: "console", tags: "console sony ps3 cell dualshock 3 sixaxis 2006 games blu-ray",
    folder: "ps3_landing", key: "ps3-theme", category: "Consoles" },
  { id: "ps4", label: "PlayStation 4", kind: "console", tags: "console sony ps4 dualshock 4 2013 games",
    folder: "ps4_landing", key: "ps4-theme", category: "Consoles" },
  { id: "ps5", label: "PlayStation 5", kind: "console", tags: "console sony ps5 dualsense 2020 games",
    folder: "ps5_landing", key: "ps5-theme", category: "Consoles" },
  { id: "xbox", label: "Xbox Series X", kind: "console", tags: "xbox series x microsoft console games 2020 fan",
    dir: "xbox", key: "xsx-theme", category: "Consoles" },
  { id: "switch", label: "Nintendo Switch (OLED)", kind: "console", tags: "nintendo switch oled handheld console joy-con games portable",
    dir: "switch", key: "nsw-theme", category: "Consoles" },
  { id: "psp", label: "PlayStation Portable", kind: "console", tags: "psp playstation portable sony handheld umd 2004 games",
    dir: "psp", key: "psp-theme", category: "Consoles" },
  { id: "morph", label: "Morph Handheld", kind: "console", tags: "morph handheld console concept retro controller screen orange cream design",
    dir: "morph", key: "mrp-theme", category: "Consoles" },
  { id: "steam", label: "Steam Machine", kind: "console", tags: "steam machine valve console pc gaming steamos fan led",
    dir: "steam", key: "stm-theme", category: "Consoles" },
  { id: "cpu", label: "X9 Processor", kind: "chip", tags: "chip cpu desktop socket lga",
    folder: "cpu_landing", key: "x9-theme", category: "Components" },
  { id: "egpu", label: "EG-1 eGPU", kind: "egpu", tags: "egpu external gpu graphics card enclosure thunderbolt fans pcie",
    dir: "egpu", key: "eg1-theme", category: "Components" },
  { id: "turbofan", label: "TF-9 Turbofan", kind: "engine", tags: "engine jet turbine aircraft",
    folder: "turbofan_landing", key: "tf9-theme", category: "Engines" },
  { id: "v8", label: "V8 Engine", kind: "engine", tags: "v8 engine motor car pushrod small block pistons crankshaft animated",
    dir: "v8", key: "v8-theme", category: "Engines" },
  { id: "hover", label: "HV-9 Hover Hauler", kind: "vehicle", tags: "vehicle hover hovercraft futuristic sci-fi spaceship ship hauler",
    dir: "hover", key: "hv9-theme", category: "Vehicles" },
  { id: "cybertruck", label: "Cybertruck", kind: "truck", tags: "cybertruck tesla truck pickup electric ev vehicle car",
    dir: "cybertruck", key: "ct-theme", category: "Vehicles" },
  { id: "spaceship", label: "SX-7 Starhopper", kind: "spaceship", tags: "spaceship starship space ship sci-fi shuttle rocket starhopper spacecraft",
    dir: "spaceship", key: "sx7-theme", category: "Vehicles" },
  { id: "rubiks", label: "Rubik's Cube", kind: "puzzle", tags: "rubiks rubik cube puzzle toy 3x3 speedcube animated",
    dir: "rubiks", key: "rc3-theme", category: "Toys" },
  { id: "ledcube", label: "LED Cube", kind: "gadget", tags: "led cube volumetric display voxel light lamp gadget animated red",
    dir: "ledcube", key: "led-theme", category: "Gadgets" },
];
const DEFAULT = "macintosh";

// read as text with \r\n folded to \n, so a checkout with Windows line endings builds the same file
const read = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");

function page(folder, dir) {
  const d = dir ? path.join(HERE, dir) : path.join(ROOT, folder);
  const html = read(path.join(d, "index.html"));
  // local <script src="x.js"> -> inline script
  return html.replace(/<script src="(?!https?:)([^"]+)"><\/script>/g,
    (_, src) => "<script>\n" + read(path.join(d, src)) + "</script>");
}

// JSON as Python's json.dumps writes it: ", " and ": " separators, everything past ASCII as \uXXXX
const json = v => JSON.stringify(v)
  .replace(/[\u0080-￿]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))
  .replace(/("(?:[^"\\]|\\.)*"|[^"]+)/g, t => t[0] === '"' ? t : t.replace(/,/g, ", ").replace(/:/g, ": "));

const models = MODELS.map(({ id, label, kind, tags, folder, dir, key, category }) =>
  ({ id, label, kind, tags, key, category, html: page(folder, dir) }));

const shell = read(path.join(HERE, "gallery_shell.html"));
const data = json(models).split("<").join("\\u003c");  // no "</script>" or "<!--" inside the script
const out = shell.split("/*MODELS*/[]").join(data).split('/*DEFAULT*/""').join(json(DEFAULT));
const dest = path.join(HERE, "index.html");
fs.writeFileSync(dest, out);
console.log(`index.html ${(fs.statSync(dest).size / 1e6).toFixed(2)} MB, models: ` + models.map(m => m.label).join(", "));
