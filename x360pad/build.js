/*
Xbox 360 controller: builds the model page and adds it to the gallery.

Imported from a Blender model: x360pad/mesh.json.gz is its meshes, exported with the modifiers applied by

    blender -b --factory-startup --disable-autoexec xbox360_gamepad.blend --python tools/blend_export.py -- \
        x360pad/mesh.json.gz "" 0 35 153

in mm: X across, Y back from the grips (they point at -Y, towards the default view), Z up; 153 x 110 x 57. Here
the meshes become the page's parts: the shell, the two sticks (modules based at their pivots, so the page can tilt
them), the D-pad, the four face buttons, the guide button with its ring of light, back and start, the bumpers and
the triggers (based at their hinges) and the battery pack. The page's chrome and the shared engine come from the
X9 page already in the gallery. Re-run after any change:

    node x360pad/build.js

Writes x360pad/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");
const { load, split, bounds, addPart } = require("../lib/mesh-import");

const HERE = __dirname;
const M = load(path.join(HERE, "mesh.json.gz"));
const take = (name, mat) => M.take({ name, mat });

// the shell, and the pieces that came with it: the battery pack underneath and the wells round the sticks and D-pad
const body = split(take("x360gp.002", "gamepad")).sort((a, b) => b.pos.length - a.pos.length);
const shell = body[0], battery = body.find(g => bounds([g]).max[2] < 20), wells = body.slice(1).filter(g => g !== battery);

// pivots: each stick tilts about a point under its middle, each trigger swings about its top edge
const stickPivot = gs => { const b = bounds(gs); return r3([b.c[0], b.c[1], b.min[2] - 4]); };
const trigHinge = gs => { const b = bounds(gs); return r3([b.c[0], b.min[1] + 2, b.max[2]]); };
const LS = [take("x20.002", "gamepad_shiny_plastic"), take("x20.002", "rubber")];
const RS = [take("x18.002", "gamepad_shiny_plastic"), take("x18.002", "rubber")];
const LT = take("x14.002"), RT = take("x15.002");
const PIV = { ls: stickPivot(LS.flat()), rs: stickPivot(RS.flat()), lt: trigHinge(LT), rt: trigHinge(RT) };

const explode = {
  shell: [0, 0, 0], battery: [0, 0, -45], trim: [0, -35, -12], rear: [0, 34, 18], bumpers: [0, 40, 30],
  lt: { offset: [-12, 50, -14], base: PIV.lt }, rt: { offset: [12, 50, -14], base: PIV.rt },
  ls: { offset: [0, 0, 60], base: PIV.ls }, rs: { offset: [0, 0, 60], base: PIV.rs },
  dpad: [0, 0, 48], face: [0, 0, 48], guide: [0, 0, 58], center: [0, 0, 40],
};

addPart("Shell", "shell", "major", [shell]);
addPart("Control Wells", "shell", "minor", wells);
addPart("Battery Pack", "battery", "major", [battery]);
addPart("Grip Trim", "trim", "minor", take("x16.002"));
addPart("Rear Panel", "rear", "minor", take("x7.004"));
addPart("Bumpers", "bumpers", "major", take("x360gp.002", "gamepad_shiny_plastic"));
addPart("Left Trigger", "lt", "major", LT, { spool: "lt", base: PIV.lt });
addPart("Right Trigger", "rt", "major", RT, { spool: "rt", base: PIV.rt });
addPart("Left Stick", "ls", "major", LS[0], { spool: "ls", base: PIV.ls });
addPart("Left Stick Cap", "ls", "minor", LS[1], { spool: "ls", base: PIV.ls });
addPart("Right Stick", "rs", "major", RS[0], { spool: "rs", base: PIV.rs });
addPart("Right Stick Cap", "rs", "minor", RS[1], { spool: "rs", base: PIV.rs });
addPart("D-pad Base", "dpad", "minor", take("x5.003"));
addPart("D-pad", "dpad", "major", take("x13.002"), { spool: "dpad" });
// A (bottom), B (right), X (left), Y (top): each a tinted cap over its letter
[["A", "x10"], ["B", "x12"], ["X", "x9"], ["Y", "x11"]].forEach(([k, n]) => {
  addPart(k + " Button", "face", "major", take(new RegExp("^" + n + "\\.00[1-9]$"), "glass"), { spool: k });
  addPart(k + " Button Letter", "face", "minor", take(new RegExp("^" + n + "\\.00[1-9]$"), "x"), { spool: k });
});
addPart("Guide Button", "guide", "major", take("x19.002"), { spool: "guide" });
addPart("Ring of Light", "guide", "minor", [...take("x1.003"), ...take("x17.002")]);
addPart("Back Button", "center", "minor", take("x8.002"), { spool: "back" });
addPart("Start Button", "center", "minor", take("x6.003"), { spool: "start" });
if (M.rest().length) throw new Error("unused mesh groups: " + M.rest().map(g => g.name + " " + g.mat).join(", "));

// ---------- callouts and the tour ----------
const BASED = { ls: PIV.ls, rs: PIV.rs, lt: PIV.lt, rt: PIV.rt };
const MOD = { "Left Stick": "ls", "Left Stick Cap": "ls", "Right Stick": "rs", "Right Stick Cap": "rs", "Left Trigger": "lt", "Right Trigger": "rt" };
const local = (name, p) => r3(MOD[name] ? p.map((c, i) => c - BASED[MOD[name]][i]) : p);
const hotspots = [
  ["Left stick", "Moves you; click it in to sprint", [PIV.ls[0], PIV.ls[1], 51], ["Left Stick", "Left Stick Cap"]],
  ["Right stick", "Turns the camera", [PIV.rs[0], PIV.rs[1], 56], ["Right Stick", "Right Stick Cap"]],
  ["D-pad", "Eight-way, on a disc", [-24, 0, 50], ["D-pad", "D-pad Base"]],
  ["Face buttons", "A, B, X and Y", [44, 26, 45], ["A Button", "B Button", "X Button", "Y Button"]],
  ["Guide button", "With the ring of light round it", [0, 27, 49], ["Guide Button", "Ring of Light"]],
  ["Triggers", "Analogue, on a hinge", [PIV.rt[0], 53, 12], ["Left Trigger", "Right Trigger"]],
  ["Bumpers", "Shoulder buttons above the triggers", [50, 48, 38], ["Bumpers"]],
  ["Battery pack", "Two AA cells, clipped on underneath", [0, 15, 5], ["Battery Pack"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    ls: pt("Left Stick Cap", [PIV.ls[0], PIV.ls[1], 51]), rs: pt("Right Stick Cap", [PIV.rs[0], PIV.rs[1], 56]),
    a: pt("A Button", [44, 15, 44]), y: pt("Y Button", [44, 39, 43]), guide: pt("Guide Button", [0, 27, 49]),
    lt: pt("Left Trigger", [PIV.lt[0], 53, 10]), rt: pt("Right Trigger", [PIV.rt[0], 53, 10]), batt: pt("Battery Pack", [0, 15, 5]),
  },
  steps: [
    { t: "Two sticks", focus: "ls", dist: 0.5, ex: 0, p: ["ls", "rs"], n: ["Left Stick", "Left Stick Cap", "Right Stick", "Right Stick Cap"], ms: 4200,
      d: "Each stick tilts on a gimbal over two potentiometers, one for each direction, so the console reads exactly how far you push it. The left one sits high, where your thumb rests." },
    { t: "Face buttons", focus: "a", dist: 0.45, ex: 0, p: ["a", "y"], n: ["A Button", "B Button", "X Button", "Y Button"], ms: 4000,
      d: "Green A, red B, blue X and yellow Y: tinted caps over the letters, each pressing a rubber dome onto contacts on the board." },
    { t: "The guide button", focus: "guide", dist: 0.4, ex: 0, p: ["guide"], n: ["Guide Button", "Ring of Light"], ms: 3800,
      d: "The big X in the middle opens the guide and turns the console on. The ring round it lights the quarter that shows which player you are." },
    { t: "Triggers", focus: "rt", dist: 0.5, ex: 1, p: ["lt", "rt"], n: ["Left Trigger", "Right Trigger", "Bumpers"], ms: 4200,
      d: "The triggers swing on hinges against springs: analogue, for the accelerator and the brake. The bumpers above are plain buttons." },
    { t: "Wireless power", focus: "batt", dist: 0.5, ex: 1, p: ["batt"], n: ["Battery Pack"], ms: 3800,
      d: "Two AA batteries, or a rechargeable pack, clip into the bump underneath; the controller talks to the console by radio." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("X360_GEOMETRY", "x360pad/build.js", { explode, hotspots, tour, constants: { PIV } });
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>Xbox 360 Controller</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of an Xbox 360 controller: on hover the sticks and buttons lift out, the triggers and bumpers swing back and the battery pack drops away\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Controller parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Xbox 360 Controller</b><span>Gamepad</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG X36-001 &middot; Rev A<br>Units mm &middot; View az 30&deg; / el 38&deg;<br>Concept page, not affiliated with Microsoft</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "x360pad", label: "Xbox 360 Controller", kind: "controller", tags: "xbox 360 controller gamepad joypad microsoft wireless sticks triggers",
  key: "x36-theme", category: "Consoles", html }, "xbox");
console.log(`x360pad/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
