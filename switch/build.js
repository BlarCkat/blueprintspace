/*
Nintendo Switch (OLED model): builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm, standing upright: X across, Y back from the screen (the screen
faces -Y, towards the default view), Z up. The tablet is 173 x 102 x 14 with a Joy-Con on each rail (242 wide in
all). Each analog stick is a module of its own, based at its pivot, so the page can tilt it; the blower fan
inside is based at its hub so it can spin. Layers from the front: glass, OLED panel, front frame, midframe,
battery and main board, the heat pipe and fan, the back cover and its wide kickstand. The page's chrome
and the shared engine come from the Spectre page (it has the photo-screen button); lib/screen-runtime.js
gives the screen its home-menu animation.

    node switch/build.js

Writes switch/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, polyRegion, stripRegion, extrude, rrBody, cyl, revolve, sweep, tube,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y (negative y is towards the viewer)
const TW = 86.5, TH = 102, T = 7, ZC = TH / 2;   // the tablet's half width, height, half thickness, centre height
const JW = 33, JX = TW + JW / 2;                 // a Joy-Con's width and centre
const SCR = { hw: 77.5, hh: 43.6, zc: 52 };      // the 7-inch OLED panel's active area
const STICK = { L: [-JX, -T, 74], R: [JX, -T, 42] };
const FAN = [4, 3.6, 78];

const explode = {
  display: { offset: [0, -100, 0] }, front: { offset: [0, -50, 0] },
  midframe: { offset: [0, -22, 0] }, battery: { offset: [0, 0, -30] }, board: { offset: [0, 18, 10] },
  cooling: { offset: [0, 42, 10] }, fan: { offset: [0, 60, 10], base: FAN }, back: { offset: [0, 95, 0] }, kickstand: { offset: [0, 125, -10] },
  joyL: { offset: [-95, 0, 0] }, joyR: { offset: [95, 0, 0] },
  stickL: { offset: [-95, 0, 0], base: STICK.L }, stickR: { offset: [95, 0, 0], base: STICK.R },
};

// ---------- the front: glass and the OLED panel behind it ----------
const glass = part("Display Glass", "display", "major");
withFrame(FY, () => {
  extrude(glass, rrRegion(0, ZC, TW - 0.6, ZC - 0.6, 3.4, 4), -T - 0.4, -T);
  loop(glass, rrPts(0, SCR.zc, SCR.hw, SCR.hh, 0.6, 2).map(q => [...q, -T - 0.45]));   // where the picture ends and the black border starts
});
const panel = part("OLED Display", "display", "major");
withFrame(FY, () => {
  extrude(panel, rrRegion(0, SCR.zc, SCR.hw + 2, SCR.hh + 2, 1, 2), -T + 0.1, -T + 1.1);
  extrude(panel, rect(-30, 30, SCR.zc - SCR.hh - 7, SCR.zc - SCR.hh - 2), -T + 1.1, -T + 1.4);   // the driver flex folded behind it
});

// ---------- the tablet's shell ----------
const frontFrame = part("Front Frame", "front", "major");
withFrame(FY, () => rrBody(frontFrame, 0, ZC, TW, ZC, 3.5, [[1, -T, true], [0, -T + 1.2], [0, 0, true]], { seg: 3, top: false, holes: [] }));
// the top edge: power button, volume rocker, headphone jack and the game card slot's flap
const topEdge = part("Top Buttons", "front", "minor");
{
  const Z = TH;
  extrude(topEdge, rrRegion(-70, -3, 4, 1.4, 1.3, 3), Z, Z + 0.9);                        // power
  extrude(topEdge, rrRegion(-54, -3, 7.5, 1.4, 1.3, 3), Z, Z + 0.9);                      // volume
  line(topEdge, [-54, -4.4, Z + 0.95], [-54, -1.6, Z + 0.95]);
  loop(topEdge, circlePts(36, -2, 1.9, 16).map(q => [...q, Z + 0.05]));                   // headphone jack
  extrude(topEdge, rrRegion(61, -2.6, 13, 2.2, 1, 3), Z, Z + 0.5);                        // game card flap
}
const bottomEdge = part("USB-C and Speakers", "front", "minor");
{
  extrude(bottomEdge, rrRegion(0, 0, 4.4, 1.6, 1.5, 4), -0.6, 0.05);                      // USB-C
  [-1, 1].forEach(s => { for (let i = 0; i < 5; i++) loop(bottomEdge, rrPts(s * (54 + i * 4), -2.5, 0.8, 2.4, 0.7, 2).map(q => [...q, -0.05])); });   // speaker slots
}
const midframe = part("Midframe", "midframe", "major");
withFrame(FY, () => extrude(midframe, rrRegion(0, ZC, TW - 2, ZC - 2, 2, 3, [[-70, 30, 12, 46]]), -4.8, -4.3));
const speakers = part("Speakers", "midframe", "minor");
withFrame(FY, () => [-1, 1].forEach(s => extrude(speakers, rrRegion(s * 62, 10, 14, 6, 2, 3), -4.3, -1.2)));

// ---------- battery, board and cooling ----------
const battery = part("Battery", "battery", "major");
withFrame(FY, () => {
  extrude(battery, rrRegion(-20, 29, 48, 18, 2.5, 3), -4.2, -1);
  line(battery, [-64, 44, -4.25], [24, 44, -4.25]);
  extrude(battery, rect(26, 36, 38, 44), -2.6, -2);                                      // its connector
});
const board = part("Main Board", "board", "major");
withFrame(FY, () => {
  extrude(board, polyRegion([[-80, 50], [24, 50], [30, 56], [80, 56], [80, 97], [-80, 97]]), -1, 0.2);
  for (let i = 0; i < 7; i++) loop(board, circlePts(-76 + i * 25, 94, 1.1, 10).map(q => [...q, 0.25]));   // screw holes
});
const soc = part("NVIDIA Tegra", "board", "major");
withFrame(FY, () => {
  extrude(soc, rrRegion(-38, 72, 11, 11, 0.8, 2), 0.2, 1.1);
  extrude(soc, rrRegion(-38, 72, 6, 6, 0.3, 2), 1.1, 1.6);                                // the die
});
const chips = part("Memory and Storage", "board", "minor");
withFrame(FY, () => {
  [[-60, 80], [-60, 64]].forEach(([x, z]) => extrude(chips, rrRegion(x, z, 7, 5, 0.5, 2), 0.2, 1.1));   // LPDDR4X
  extrude(chips, rrRegion(-14, 88, 6, 4.5, 0.5, 2), 0.2, 1.2);                             // 64 GB eMMC
  extrude(chips, rrRegion(-66, 92, 4.5, 3.2, 0.4, 2), 0.2, 0.9);                           // Wi-Fi and Bluetooth
  extrude(chips, rrRegion(-14, 62, 5, 4, 0.4, 2), 0.2, 0.9);                               // power management
  for (let i = 0; i < 8; i++) extrude(chips, rect(-28 + i * 3, -26.6 + i * 3, 56, 58.4), 0.2, 0.8);   // capacitors
});
const card = part("Game Card Reader", "board", "minor");
withFrame(FY, () => {
  extrude(card, rrRegion(61, 89, 14, 9, 1, 2), 0.2, 3.8);
  extrude(card, rect(48, 74, 97, 98.6), 0.6, 3.4);
});
const shield = part("Heat Shield", "cooling", "major");
withFrame(FY, () => extrude(shield, polyRegion([[-80, 52], [-20, 52], [-20, 60], [-12, 60], [-12, 97], [-80, 97]]), 1.7, 2));
const pipe = part("Heat Pipe", "cooling", "minor");
tube(pipe, [[-38, 2.3, 72], [-30, 2.3, 80], [-22, 2.3, 90], [-14, 2.3, 96], [4, 2.3, 98]], 1.2, 10);
const fins = part("Heatsink Fins", "cooling", "minor");
for (let x = -22; x <= 26; x += 2) withFrame(FY, () => extrude(fins, rect(x - 0.25, x + 0.25, 95.4, 100.2), 1.2, 5.6));
const housing = part("Fan Housing", "cooling", "minor");
withFrame(FY, () => {
  const R0 = 19, R1 = 17.4, a0 = -0.15, n = 40;
  const outer = Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (Math.PI * 1.85) * i / n, r = R0 + 2.4 * i / n; return [FAN[0] + r * Math.cos(a), FAN[2] + r * Math.sin(a)]; });
  const inner = outer.map(([x, z]) => { const dx = x - FAN[0], dz = z - FAN[2], l = Math.hypot(dx, dz); return [x - dx / l * 1.2, z - dz / l * 1.2]; });
  extrude(housing, stripRegion(inner, outer), 1.2, 5.8);                                   // the scroll that turns the air up to the fins
  extrude(housing, rrRegion(FAN[0], FAN[2], 22, 22, 4, 3, [[FAN[0] - 9, FAN[0] + 9, FAN[2] - 9, FAN[2] + 9]]), 5.6, 5.9);   // the lid, open over the hub
});
const fan = part("Fan", "fan", "minor", { spool: "fan" });
withFrame(FY, () => {
  cyl(fan, 0, 0, 6.5, -1.8, 1.8, 24);
  for (let k = 0; k < 23; k++) {
    const a = 2 * Math.PI * k / 23, lead = [], trail = [];
    for (let i = 0; i <= 3; i++) {
      const r = 6.5 + 9.8 * i / 3, b = a + 0.35 * i / 3;
      lead.push([r * Math.cos(b), r * Math.sin(b)]); trail.push([r * Math.cos(b - 0.06), r * Math.sin(b - 0.06)]);
    }
    extrude(fan, stripRegion(lead, trail), -1.5, 1.5);
  }
});

// ---------- the back cover, its vents and the kickstand ----------
const back = part("Back Cover", "back", "major");
withFrame(FY, () => rrBody(back, 0, ZC, TW, ZC, 3.5, [[0, 0, true], [0, T - 1.2], [1, T, true]], { seg: 3, bottom: false }));
const vents = part("Vents", "back", "minor");
for (let x = -24; x <= 24; x += 3) loop(vents, rrPts(x, 3, 0.7, 2, 0.6, 2).map(q => [...q, TH + 0.05]));   // the exhaust along the top
withFrame(FY, () => { for (let x = -40; x <= 30; x += 4) loop(vents, rrPts(x, 94, 0.9, 3, 0.8, 2).map(q => [...q, T + 0.05])); });   // and the intake on the back
const stand = part("Kickstand", "kickstand", "major");
withFrame(FY, () => {
  extrude(stand, rrRegion(0, 32, 76, 22, [5, 5, 2, 2], 3), T + 0.05, T + 1.1);
  line(stand, [-76, 52, T + 1.15], [76, 52, T + 1.15]);                                   // the hinge
  loop(stand, rrPts(0, 30, 10, 7, 1.5, 2).map(q => [...q, T + 1.15]));                    // microSD slot under it
});

// ---------- the Joy-Cons ----------
function joycon(s) {
  const L = s < 0, mod = L ? "joyL" : "joyR", X = x => s * x;
  const name = L ? "Left Joy-Con" : "Right Joy-Con";
  const body = part(name, mod, "major");
  const R = L ? [15, 1.5, 1.5, 15] : [1.5, 15, 15, 1.5];
  withFrame(FY, () => rrBody(body, X(JX), ZC, JW / 2, ZC, R, [[1.2, -T, true], [0, -T + 1.3], [0, T - 1.3], [1.2, T, true]], { seg: 6 }));
  const rail = part(L ? "Left Rail" : "Right Rail", mod, "minor");
  withFrame(FY, () => {
    extrude(rail, rect(Math.min(X(TW), X(TW + 1.2)), Math.max(X(TW), X(TW + 1.2)), 8, 94), -3, 3);
    [[22, "SL"], [80, "SR"]].forEach(([z]) => extrude(rail, rrRegion(X(TW + 0.6), z, 0.9, 6, 0.8, 2), -2.4, 2.4));
  });
  const btn = part(L ? "Left Buttons" : "Right Buttons", mod, "minor");
  withFrame(FY, () => {
    const F = -T, cx = X(JX), pad = L ? [cx, 46] : [cx, 76];
    // four round buttons in a diamond: the direction buttons on the left, A B X Y on the right
    [[0, 8.5], [8.5, 0], [0, -8.5], [-8.5, 0]].forEach(([dx, dz]) => {
      cyl(btn, pad[0] + dx, pad[1] + dz, 3.7, F - 1.3, F, 24);
      if (L) { const a = Math.atan2(dz, dx), c = [pad[0] + dx, pad[1] + dz]; loop(btn, [0, 2.1, -2.1].map(k => [c[0] + 1.6 * Math.cos(a + k), c[1] + 1.6 * Math.sin(a + k), F - 1.35])); }
      else loop(btn, circlePts(pad[0] + dx, pad[1] + dz, 1.5, 12).map(q => [...q, F - 1.35]));
    });
    if (L) extrude(btn, rrRegion(X(JX - 9), 94, 2.6, 0.8, 0.7, 2), F - 0.9, F);                  // minus
    else { extrude(btn, rrRegion(X(JX - 9), 94, 2.6, 0.8, 0.7, 2), F - 0.9, F); extrude(btn, rrRegion(X(JX - 9), 94, 0.8, 2.6, 0.7, 2), F - 0.9, F); }   // plus
    if (L) { extrude(btn, rrRegion(X(JX - 6), 23, 3.2, 3.2, 0.8, 2), F - 0.8, F); loop(btn, circlePts(X(JX - 6), 23, 1.8, 16).map(q => [...q, F - 0.85])); }   // capture
    else { cyl(btn, X(JX - 6), 23, 3.4, F - 0.8, F, 24); loop(btn, circlePts(X(JX - 6), 23, 2.4, 16).map(q => [...q, F - 0.85])); }   // home
    loop(btn, circlePts(...(L ? [cx, 74] : [cx, 42]), 10.5, 32).map(q => [...q, F - 0.05]));   // the stick's well
    // L and ZL (R and ZR) round the top outer corner: the bumper at the front, the trigger behind it
    const cc = [X(TW + JW - 15), TH - 15];
    const pathPts = [[X(TW + 4), TH + 0.2], ...Array.from({ length: 11 }, (_, i) => {
      const a = Math.PI / 2 + s * -(Math.PI * 0.42) * i / 10;   // round the corner, from the top towards the outer side
      return [cc[0] + 15.2 * Math.cos(a), cc[1] + 15.2 * Math.sin(a)];
    })];
    if (!L) pathPts.reverse();   // so outwards is the sweep's negative side on both
    sweep(btn, pathPts.map(q => [q[0], q[1], -T + 0.8]), [[0, 0], [-2.2, 0], [-2.2, 4.2], [0, 4.2]]);
    sweep(btn, pathPts.map(q => [q[0], q[1], 0.8]), [[0, 0], [-3.2, 0], [-3.2, 5.6], [0, 5.6]]);
  });
  // the stick: built round its pivot, so the page can tilt it
  const stick = part(L ? "Left Stick" : "Right Stick", L ? "stickL" : "stickR", "minor", { spool: L ? "stickL" : "stickR" });
  withFrame(FY, () => revolve(stick, 0, 0, [[0, 0.5], [9.6, 0.5, true], [9.6, -0.6, true], [4.5, -1.6], [3.6, -4.2], [8.4, -5, true], [8.9, -6.6], [8.2, -7.8, true], [6, -7.4], [0, -7]], 32));
  return body;
}
joycon(-1);
joycon(1);

// ---------- callouts and the tour ----------
const BASED = { "Fan": FAN, "Left Stick": STICK.L, "Right Stick": STICK.R };
const local = (name, p) => r3(BASED[name] ? p.map((c, i) => c - BASED[name][i]) : p);
const hotspots = [
  ["7-inch OLED screen", "1280 x 720, deep blacks", [-40, -T - 0.5, 70], ["Display Glass", "OLED Display"]],
  ["Joy-Con (L)", "Stick, direction buttons, L and ZL", [-JX, -T - 1.3, 46], ["Left Joy-Con", "Left Buttons"]],
  ["Joy-Con (R)", "A B X Y, stick, R and ZR", [JX, -T - 1.3, 76], ["Right Joy-Con", "Right Buttons"]],
  ["Analog stick", "Tilts and clicks", [-JX, -T - 7.6, 74], ["Left Stick"]],
  ["Rails", "The Joy-Cons slide off", [-TW - 0.6, 0, 80], ["Left Rail", "Left Joy-Con"]],
  ["NVIDIA Tegra", "Custom chip: CPU and GPU", [-38, 1.6, 72], ["NVIDIA Tegra", "Main Board"]],
  ["Blower fan", "Out through the top vent", [0, 0, 12], ["Fan", "Fan Housing"]],
  ["Battery", "4310 mAh, 4.5 to 9 hours", [-20, -4.2, 29], ["Battery"]],
  ["Game card slot", "Cartridges go in the top", [61, 3.8, 89], ["Game Card Reader", "Top Buttons"]],
  ["Kickstand", "Wide and adjustable", [0, T + 1.1, 32], ["Kickstand"]],
  ["Memory", "4 GB LPDDR4X", [-60, 1.1, 80], ["Memory and Storage"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    railL: pt("Left Rail", [-TW - 0.6, 0, 50]), joyL: pt("Left Joy-Con", [-JX, -T - 1, 60]), railR: pt("Right Rail", [TW + 0.6, 0, 50]), joyR: pt("Right Joy-Con", [JX, -T - 1, 60]),
    screen: pt("OLED Display", [0, -T, 52]), soc: pt("NVIDIA Tegra", [-38, 1.6, 72]), ram: pt("Memory and Storage", [-60, 1.1, 80]),
    pipe: pt("Heat Pipe", [-22, 2.3, 90]), fins: pt("Heatsink Fins", [2, 3.4, 98]), fan: pt("Fan", FAN), out: pt("Vents", [0, 3, TH + 40]),
    batt: pt("Battery", [-20, -4.2, 29]), board: pt("Main Board", [0, 0, 70]), stand: pt("Kickstand", [0, T + 1, 32]),
  },
  steps: [
    { t: "Joy-Cons slide off", focus: "joyL", dist: 0.55, ex: 1, p: ["joyL", "railL", "railR", "joyR"], n: ["Left Joy-Con", "Right Joy-Con", "Left Rail", "Right Rail"], ms: 4200,
      d: "Each controller slides down its rail and locks. Off the console they talk to it over Bluetooth; on it, through the rail's contacts, which also charge them." },
    { t: "The screen", focus: "screen", dist: 0.5, ex: 1, p: ["screen", "board"], n: ["OLED Display", "Display Glass"], ms: 4000,
      d: "A 7-inch OLED panel: each pixel makes its own light, so black is truly off. The board drives it at 1280 x 720 handheld, or sends 1080p to the TV through the dock." },
    { t: "One chip does it all", focus: "soc", dist: 0.38, ex: 1, p: ["soc", "ram", "soc"], n: ["NVIDIA Tegra", "Memory and Storage", "Main Board"], ms: 4200,
      d: "A custom NVIDIA Tegra holds four ARM CPU cores and a Maxwell GPU, sharing 4 GB of LPDDR4X memory beside it. It clocks down handheld and up in the dock." },
    { t: "Heat out the top", focus: "fan", dist: 0.42, ex: 1, p: ["soc", "pipe", "fins", "out"], n: ["Heat Pipe", "Heatsink Fins", "Fan", "Fan Housing"], ms: 4400,
      d: "A copper heat pipe carries the chip's heat to a fin stack under the top edge; the small blower draws air in at the back and blows it through the fins and out the vent." },
    { t: "Battery", focus: "batt", dist: 0.45, ex: 1, p: ["batt", "board"], n: ["Battery"], ms: 3800,
      d: "A flat 4310 mAh lithium-ion pack fills the lower half, behind the screen: four and a half to nine hours, depending on the game." },
    { t: "Stand it up", focus: "stand", dist: 0.5, ex: 0, p: ["stand"], n: ["Kickstand", "Back Cover"], ms: 3800,
      d: "The wide kickstand folds out to any angle for tabletop play, and hides the microSD card slot." },
  ],
};
const SY = -T - 0.42;   // just in front of the glass
const screen = { module: "display", origin: [-SCR.hw, SY, SCR.zc - SCR.hh], right: [SCR.hw, SY, SCR.zc - SCR.hh], top: [-SCR.hw, SY, SCR.zc + SCR.hh], cornerRadius: 0.6 };

// ---------- page and gallery ----------
const geometry = geometryScript("NSW_GEOMETRY", "switch/build.js", { explode, hotspots, tour, screen, constants: { TW, TH, T } });
const model = read(path.join(HERE, "..", "lib", "screen-runtime.js")) + read(path.join(HERE, "model.js"));
const html = buildPage({ template: "spectre", geometry: geometry.js, model, swaps: [
  [/<title>[^<]*<\/title>/, "<title>Nintendo Switch (OLED)</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the Nintendo Switch OLED model standing upright: on hover the Joy-Cons slide off and the glass, screen, frame, battery, board, cooling, back cover and kickstand move apart\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Nintendo Switch</b><span>OLED model</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG NSW-OLED-001 &middot; Rev A<br>Units mm &middot; View az 35&deg; / el 18&deg;<br>Concept page, not affiliated with Nintendo</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "switch", label: "Nintendo Switch (OLED)", kind: "console", tags: "nintendo switch oled handheld console joy-con games portable",
  key: "nsw-theme", category: "Consoles", html }, "xbox");
console.log(`switch/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
