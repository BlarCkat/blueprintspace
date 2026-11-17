/*
DualSense controller: builds the model page and adds it to the gallery.

Imported from a Blender model: dualsense/mesh.json.gz is its meshes, exported with the modifiers applied (and the
backdrop plane left out, and the model turned to lie flat) by

    blender -b --factory-startup --disable-autoexec dualsense.blend --python tools/blend_export.py -- \
        dualsense/mesh.json.gz Plane -90 35 160

in mm: X across, Y back from the grips (they point at -Y, towards the default view), Z up; 160 x 109 x 56. Here
the meshes become the page's parts: the white face plates either side, the black core and the bottom shell, the
touchpad with its light bar, the two sticks (modules based at their pivots, so the page can tilt them), the D-pad
and the four face buttons, the PS, mute, create and options buttons, the bumpers and the adaptive triggers (based
at their hinges). The page's chrome and the shared engine come from the X9 page already in the gallery.
Re-run after any change:

    node dualsense/build.js

Writes dualsense/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");
const { load, split, bounds, inset, addPart } = require("../lib/mesh-import");

const HERE = __dirname;
const M = load(path.join(HERE, "mesh.json.gz"));
const take = (name, mat) => M.take({ name, mat });
const pieces = (name, mat) => split(take(name, mat)).map(g => Object.assign(g, { b: bounds([g]) }));
const by = (gs, test) => gs.filter(g => test(g.b.c));

// the white shell: a face plate either side and the bottom shell under everything
const white = pieces("Plane.007", "Material.003");
const lplate = by(white, c => c[0] < -40), rplate = by(white, c => c[0] > 40), bottom = by(white, c => Math.abs(c[0]) <= 40);

// the sticks were one mesh: split them left and right; each tilts about a point under its middle
const sticks = [...pieces("Sphere.001", "Material.001"), ...pieces("Sphere.001", "Material.007"), ...pieces("Sphere.001", "Material.008")];
const stickPivot = gs => { const b = bounds(gs); return r3([b.c[0], b.c[1], b.min[2] - 2]); };
const LS = by(sticks, c => c[0] < 0), RS = by(sticks, c => c[0] > 0);

// shoulders: the bumpers sit above the triggers; the triggers swing about their top front edge
const shoulders = [...pieces("Cube.003", "Material.004"), ...pieces("Cube.003", "Material.016")];
const bumpers = shoulders.filter(g => g.b.min[2] > 15), triggers = shoulders.filter(g => g.b.min[2] <= 15);
const LT = by(triggers, c => c[0] < 0), RT = by(triggers, c => c[0] > 0);
const trigHinge = gs => { const b = bounds(gs); return r3([b.c[0], b.min[1] + 2, b.max[2]]); };
const PIV = { ls: stickPivot(LS), rs: stickPivot(RS), lt: trigHinge(LT), rt: trigHinge(RT) };

// face buttons and D-pad: four pieces each, sorted by where they sit
const face = [...pieces("Cylinder.005", "Material.010"), ...pieces("Cylinder.005", "Material.011"), ...pieces("Cylinder.005", "Material.012")];
const dpad = [...pieces("Plane.009", "Material.011"), ...pieces("Plane.009", "Material.012"), ...pieces("Plane.009", "Material.013")];
const quad = (gs, c0) => ({   // top, bottom, left, right of a cluster round c0
  top: by(gs, c => c[1] - c0[1] > 6), bottom: by(gs, c => c0[1] - c[1] > 6),
  left: by(gs, c => c0[0] - c[0] > 6), right: by(gs, c => c[0] - c0[0] > 6),
});
const FC = bounds(face).c, DC = bounds(dpad).c;
const F = quad(face, FC), D = quad(dpad, DC);
const ps = pieces("Plane.011", "Material.002"), mute = by(ps, c => c[1] < 0), psLogo = by(ps, c => c[1] >= 0);
const menu = pieces("Plane.010", "none");

const explode = {
  bottom: [0, 0, -40], core: [0, 0, 0], lplate: [-34, 0, 28], rplate: [34, 0, 28], touch: [0, 18, 52], center: [0, 0, 40],
  bumpers: [0, 40, 28], lt: { offset: [-12, 52, -12], base: PIV.lt }, rt: { offset: [12, 52, -12], base: PIV.rt },
  ls: { offset: [0, 0, 62], base: PIV.ls }, rs: { offset: [0, 0, 62], base: PIV.rs }, face: [8, 0, 50], dpad: [-8, 0, 50],
};

addPart("Bottom Shell", "bottom", "major", inset(bottom, 0.3));   // the black core lies over it in places
addPart("Black Core", "core", "major", take("Plane.017", "Material"));
addPart("Extension Port", "core", "minor", take("Plane.017", "Material.009"));
addPart("Shoulder Frames", "core", "minor", take("Plane.006"));
addPart("USB-C Port", "core", "minor", [...take("Cube"), ...take("Plane.007", "Material.020")]);
addPart("Left Face Plate", "lplate", "major", lplate);
addPart("Right Face Plate", "rplate", "major", rplate);
addPart("Touchpad", "touch", "major", take("Plane.004"));
addPart("Light Bar", "touch", "minor", take("Plane.002"));
addPart("Player Lights", "touch", "minor", take("Plane.003"));
addPart("Center Panel", "center", "minor", take("Plane.005"));
addPart("PS Button", "center", "minor", psLogo, { spool: "ps" });
addPart("Mute Button", "center", "minor", mute, { spool: "mute" });
addPart("Create Button", "center", "minor", by(menu, c => c[0] < 0), { spool: "create" });
addPart("Options Button", "center", "minor", by(menu, c => c[0] > 0), { spool: "options" });
addPart("Bumpers", "bumpers", "major", bumpers);
addPart("Left Trigger", "lt", "major", LT, { spool: "lt", base: PIV.lt });
addPart("Right Trigger", "rt", "major", RT, { spool: "rt", base: PIV.rt });
addPart("Left Stick", "ls", "major", LS, { spool: "ls", base: PIV.ls });
addPart("Right Stick", "rs", "major", RS, { spool: "rs", base: PIV.rs });
[["Triangle", "top"], ["Cross", "bottom"], ["Square", "left"], ["Circle", "right"]].forEach(([n, k]) => addPart(n + " Button", "face", "major", F[k], { spool: n }));
[["Up", "top"], ["Down", "bottom"], ["Left", "left"], ["Right", "right"]].forEach(([n, k]) => addPart("D-pad " + n, "dpad", "major", D[k], { spool: "d" + n }));
if (M.rest().length) throw new Error("unused mesh groups: " + M.rest().map(g => g.name + " " + g.mat).join(", "));
const used = [white, sticks, shoulders, face, dpad, ps, menu].map(gs => gs.length).join(" ");
const placed = [lplate, rplate, bottom, LS, RS, bumpers, LT, RT, ...Object.values(F), ...Object.values(D), mute, psLogo].reduce((n, gs) => n + gs.length, 0) + menu.length;
if (placed !== white.length + sticks.length + shoulders.length + face.length + dpad.length + ps.length + menu.length) throw new Error("some pieces weren't placed: " + used);

// ---------- callouts and the tour ----------
const MOD = { "Left Stick": "ls", "Right Stick": "rs", "Left Trigger": "lt", "Right Trigger": "rt" };
const local = (name, p) => r3(MOD[name] ? p.map((c, i) => c - PIV[MOD[name]][i]) : p);
const top = gs => { const b = bounds(gs); return r3([b.c[0], b.c[1], b.max[2]]); };
const hotspots = [
  ["Touchpad", "Clicks, and reads two fingers", [0, 36, 41], ["Touchpad"]],
  ["Light bar", "Round the touchpad, in the player's colour", [-29, 38, 37], ["Light Bar"]],
  ["Left stick", "Symmetrical, low between the grips", top(LS), ["Left Stick"]],
  ["Right stick", "Turns the camera", top(RS), ["Right Stick"]],
  ["Face buttons", "Triangle, circle, cross and square", top(F.right), ["Triangle Button", "Circle Button", "Cross Button", "Square Button"]],
  ["D-pad", "Four separate arrows", top(D.left), ["D-pad Up", "D-pad Down", "D-pad Left", "D-pad Right"]],
  ["Adaptive triggers", "A motor pushes back against your finger", [PIV.rt[0], 52, 10], ["Left Trigger", "Right Trigger"]],
  ["PS and mute", "Mute lights orange when the mic is off", top(mute), ["PS Button", "Mute Button"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    ls: pt("Left Stick", top(LS)), rs: pt("Right Stick", top(RS)), pad: pt("Touchpad", [0, 36, 41]), bar: pt("Light Bar", [-29, 38, 37]),
    lt: pt("Left Trigger", [PIV.lt[0], 52, 10]), rt: pt("Right Trigger", [PIV.rt[0], 52, 10]),
    grip: pt("Bottom Shell", [-62, -40, 12]), grip2: pt("Bottom Shell", [62, -40, 12]), mute: pt("Mute Button", top(mute)),
  },
  steps: [
    { t: "Adaptive triggers", focus: "rt", dist: 0.5, ex: 1, p: ["lt", "rt"], n: ["Left Trigger", "Right Trigger"], ms: 4400,
      d: "Each trigger has a little motor and gears behind it that can push back against your finger: a stiff bow string, a jammed gun, a brake pedal." },
    { t: "Haptics in the grips", focus: "grip", dist: 0.55, ex: 0, p: ["grip", "grip2"], n: ["Bottom Shell"], ms: 4200,
      d: "Two voice-coil actuators in the grips, in place of the old rumble motors, play fine vibrations: rain, gravel, footsteps on ice." },
    { t: "Touchpad and light bar", focus: "pad", dist: 0.45, ex: 0, p: ["pad", "bar"], n: ["Touchpad", "Light Bar", "Player Lights"], ms: 4000,
      d: "The touchpad reads two fingers and clicks down as a button. The light bar glows round its edges, and the row of lights under it shows the player number." },
    { t: "Sticks", focus: "ls", dist: 0.5, ex: 0, p: ["ls", "rs"], n: ["Left Stick", "Right Stick"], ms: 4000,
      d: "Two sticks side by side, low between the grips, each on a gimbal over two sensors, and each clicks in." },
    { t: "Built-in mic", focus: "mute", dist: 0.4, ex: 0, p: ["mute"], n: ["Mute Button", "PS Button"], ms: 3800,
      d: "Microphones under the front and a speaker in the middle. The mute button under the PS logo glows orange while the mic is off." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("DS5_GEOMETRY", "dualsense/build.js", { explode, hotspots, tour, constants: { PIV } });
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>DualSense Controller</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of a DualSense controller: on hover the face plates, touchpad, sticks and buttons lift away, the triggers and bumpers swing back and the bottom shell drops\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Controller parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>DualSense</b><span>Controller</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG DS5-001 &middot; Rev A<br>Units mm &middot; View az 30&deg; / el 38&deg;<br>Concept page, not affiliated with Sony</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "dualsense", label: "DualSense Controller", kind: "controller", tags: "dualsense ps5 playstation controller gamepad sony adaptive triggers haptics touchpad",
  key: "ds5-theme", category: "Consoles", html }, "ps5");
console.log(`dualsense/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
