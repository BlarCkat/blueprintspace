/*
Sony Walkman TPS-L2 (1979): builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js) in mm, lying flat: X across, Y back from the front edge (the front
faces -Y, towards the default view), Z up; 134 x 89 x 29. The cassette lies under a door with a window. Every
turning part is a module of its own, based at its axle, so the page can spin it: the two tape reels and the
spindles under them, the capstan with its flywheel, the pinch roller and the motor's pulley. A belt runs from
the motor to the flywheel. The keys are on the right-hand edge, the two headphone jacks, the volume sliders
and the orange HOTLINE button on the front. The page's chrome and the shared engine come from the X9 page.

    node walkman/build.js

Writes walkman/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, polyRegion, stripRegion, extrude, rrBody, cyl, revolve, tube,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const FY = q => [q[0], q[2], q[1]];   // draws in (x, z) and pushes along y
const FX = q => [q[2], q[0], q[1]];   // draws in (y, z) and pushes along x
const HW = 66.8, HD = 44.5, H = 29, R = 5;
const CAS = { x: -15, y: 5, hw: 50.2, hd: 31.9, z0: 7, z1: 19 };       // the compact cassette, lying flat
const HUB = 21.3, HZ = 13;                                              // reel hubs either side of its centre
const TAPE_Y = CAS.y - CAS.hd + 2.2;                                    // where the tape runs along its front edge
const SUP = [CAS.x - HUB, CAS.y, HZ], TAK = [CAS.x + HUB, CAS.y, HZ];
const CAP = [CAS.x + 33, TAPE_Y - 2.6, 0], PINCH = [CAS.x + 33, TAPE_Y + 3.2, 0], MOTOR = [CAS.x - 36, CAS.y - 12, 0];
const FLY_R = 13, PUL_R = 3;

const explode = {
  door: { offset: [0, 0, 80] }, cassette: { offset: [0, 0, 50] },
  supply: { offset: [0, 0, 50], base: SUP }, takeup: { offset: [0, 0, 50], base: TAK },
  mech: { offset: [0, -16, 22] }, spindleL: { offset: [0, -16, 22], base: [SUP[0], SUP[1], 0] }, spindleR: { offset: [0, -16, 22], base: [TAK[0], TAK[1], 0] },
  pinch: { offset: [0, -16, 22], base: PINCH }, capstan: { offset: [0, -16, 0], base: CAP }, drive: { offset: [0, -16, 0] }, pulley: { offset: [0, -16, 0], base: MOTOR },
  case: { offset: [0, 0, -36] }, keys: { offset: [36, 0, 0] }, front: { offset: [0, -40, 0] }, battery: { offset: [44, 20, -18] },
};

// ---------- the case ----------
const lower = part("Lower Case", "case", "major");
rrBody(lower, 0, 0, HW, HD, R, [[1.2, 0, true], [0, 1.4], [0, 20, true]], { seg: 4, top: false });
const bottomDoor = part("Battery Door", "case", "minor");
loop(bottomDoor, rrPts(51, 0, 13, 40, 2, 2).map(q => [...q, -0.05]));
extrude(bottomDoor, rrRegion(51, -32, 6, 1.2, 1, 2), -0.8, 0);
const top = part("Top Cover", "door", "major");
rrBody(top, 0, 0, HW, HD, R, [[0, 20, true], [0, H - 1.6], [1.4, H, true]], { seg: 4, bottom: false,
  holes: [[CAS.x - 36, CAS.x + 36, CAS.y - 13, CAS.y + 13]] });
const window_ = part("Cassette Window", "door", "major");
loop(window_, rrPts(CAS.x, CAS.y, 36, 13, 0, 1).map(q => [...q, H - 1]));   // clear: only its edge is drawn
loop(window_, rrPts(CAS.x, CAS.y, 35, 12, 0, 1).map(q => [...q, H - 1]));
const badge = part("Badge", "door", "minor");
extrude(badge, rect(CAS.x - 48, CAS.x + 48, CAS.y - 27, CAS.y - 19), H, H + 0.3);   // the "WALKMAN" plate
extrude(badge, rrRegion(52, 26, 9, 9, 3, 3), H, H + 0.3);                           // the stereo badge
loop(badge, circlePts(52, 26, 5, 24).map(q => [...q, H + 0.35]));
const hotline = part("Hotline Button", "door", "minor");
cyl(hotline, 52, -8, 6, H, H + 2.2, 28);
loop(hotline, circlePts(52, -8, 4.2, 24).map(q => [...q, H + 2.25]));
const hinge = part("Door Hinge", "door", "minor");
withFrame(FX, () => cyl(hinge, HD - 3, H - 2, 1.6, -60, 30, 12));

// ---------- the keys on the right-hand edge ----------
const keys = part("Keys", "keys", "major");
withFrame(FX, () => [[-30, 0], [-15, 0], [0, 0], [15, 2.5]].forEach(([y, pressed], i) => {   // stop/eject, rewind, fast-forward, play (pressed)
  extrude(keys, rrRegion(y, 15, 6.5, 8, 1.5, 3), HW - 1, HW + 4.2 - pressed);
  const c = [y, 15], X = HW + 4.25 - pressed;
  if (i === 0) loop(keys, rrPts(c[0], c[1], 2, 2, 0, 1).map(q => [...q, X]));
  if (i === 1) [-1.5, 1.5].forEach(d => loop(keys, [[c[0] + d - 1.5, c[1]], [c[0] + d + 1.5, c[1] + 2], [c[0] + d + 1.5, c[1] - 2]].map(q => [...q, X])));
  if (i === 2) [-1.5, 1.5].forEach(d => loop(keys, [[c[0] + d + 1.5, c[1]], [c[0] + d - 1.5, c[1] + 2], [c[0] + d - 1.5, c[1] - 2]].map(q => [...q, X])));
  if (i === 3) loop(keys, [[c[0] + 2, c[1]], [c[0] - 1.6, c[1] + 2.4], [c[0] - 1.6, c[1] - 2.4]].map(q => [...q, X]));
}));

// ---------- the front edge: two jacks, two volume sliders ----------
const fr = part("Jacks and Volume", "front", "minor");
withFrame(FY, () => {
  const F = -HD;
  [-52, -38].forEach(x => { cyl(fr, x, 12, 4.2, F - 2, F + 0.5, 24, { top: false }); loop(fr, circlePts(x, 12, 1.8, 16).map(q => [...q, F - 2.05])); });   // A and B
  [[-14, 0.3], [16, 0.7]].forEach(([x, p]) => {
    loop(fr, rrPts(x, 12, 11, 1.2, 1.1, 2).map(q => [...q, F - 0.05]));                                                         // slot
    extrude(fr, rrRegion(x - 9 + 18 * p, 12, 2.2, 4, 0.8, 2), F - 3, F);                                                         // knob
  });
  extrude(fr, rrRegion(44, 12, 5, 1.6, 0.8, 2), F - 0.6, F);                                                                     // the DC-in cover
});

// ---------- the cassette ----------
const cas = part("Cassette", "cassette", "major");
{
  // both halves have a window wide enough to see the two packs of tape
  const win = [[CAS.x - 33, CAS.x + 33, CAS.y - 12, CAS.y + 12]];
  extrude(cas, rrRegion(CAS.x, CAS.y, CAS.hw, CAS.hd, 3, 3, win), CAS.z0, CAS.z0 + 1.2);
  extrude(cas, rrRegion(CAS.x, CAS.y, CAS.hw, CAS.hd, 3, 3, win), CAS.z1 - 1.2, CAS.z1);
  loop(cas, rrPts(CAS.x, CAS.y + 22, 42, 6, 1, 2).map(q => [...q, CAS.z1 + 0.05]));                                   // label area
  const trap = [[-28, -CAS.hd], [28, -CAS.hd], [24, -CAS.hd + 6], [-24, -CAS.hd + 6]].map(([x, y]) => [CAS.x + x, CAS.y + y]);
  extrude(cas, polyRegion(trap), CAS.z0 + 1.2, CAS.z1 - 1.2);                                                          // the bottom lip with the tape openings
  [-1, 1].forEach(s => extrude(cas, rrRegion(CAS.x + s * 44, CAS.y, 2.5, 22, 1, 2), CAS.z0 + 1.2, CAS.z1 - 1.2));    // side walls
}
const tape = part("Tape", "cassette", "minor");
{
  const z0 = HZ - 1.9, z1 = HZ + 1.9, th = 0.25;
  const run = [[SUP[0] - 18, SUP[1] - 10], [CAS.x - 44, TAPE_Y + 1.5], [CAS.x - 30, TAPE_Y], [CAS.x + 30, TAPE_Y], [CAS.x + 44, TAPE_Y + 1.5], [TAK[0] + 12, TAK[1] - 8]];
  const off = run.map(([x, y], i) => { const a = run[Math.max(0, i - 1)], b = run[Math.min(run.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [x - dy / l * th, y + dx / l * th]; });
  extrude(tape, stripRegion(run, off), z0, z1);
}
function reel(name, mod, spool, pack) {
  const p = part(name, mod, "minor", { spool });
  revolve(p, 0, 0, [[4.5, -2.6], [pack, -1.9, true], [pack, 1.9, true], [4.5, 2.6]], 48, true);   // the wound tape round its hub
  revolve(p, 0, 0, [[4.5, -2.4], [11, -2.4, true], [11, 2.4, true], [4.5, 2.4]], 24, true);       // the hub
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; line(p, [4.5 * Math.cos(a), 4.5 * Math.sin(a), 2.45], [3 * Math.cos(a), 3 * Math.sin(a), 2.45]); }   // its drive teeth
  return p;
}
reel("Supply Reel", "supply", "supply", 22);
reel("Take-up Reel", "takeup", "takeup", 15);

// ---------- the transport ----------
const deck = part("Chassis Plate", "mech", "major");
extrude(deck, rrRegion(CAS.x + 2, CAS.y - 2, 52, 34, 3, 3, [[SUP[0] - 6, SUP[0] + 6, SUP[1] - 6, SUP[1] + 6], [TAK[0] - 6, TAK[0] + 6, TAK[1] - 6, TAK[1] + 6],
  [CAP[0] - 2.5, CAP[0] + 2.5, CAP[1] - 2.5, CAP[1] + 2.5], [MOTOR[0] - 4, MOTOR[0] + 4, MOTOR[1] - 4, MOTOR[1] + 4]]), 5.4, 6.2);
const head = part("Playback Head", "mech", "major");
extrude(head, rrRegion(CAS.x, TAPE_Y - 4.6, 6, 3.6, [0.6, 0.6, 2.5, 2.5], 3), HZ - 4, HZ + 4);   // the stereo head, its curved face on the tape
extrude(head, rect(CAS.x - 14, CAS.x + 14, TAPE_Y - 10, TAPE_Y - 7), 6.2, 8.4);                  // the sliding head plate
loop(head, [[CAS.x - 0.8, TAPE_Y - 1, HZ - 1.5], [CAS.x + 0.8, TAPE_Y - 1, HZ - 1.5], [CAS.x + 0.8, TAPE_Y - 1, HZ + 1.5], [CAS.x - 0.8, TAPE_Y - 1, HZ + 1.5]]);   // the gap
[CAS.x - 40, CAS.x + 40].forEach(x => cyl(head, x, TAPE_Y - 1.2, 1.4, 6.2, HZ + 3, 12));         // tape guides
[["spindleL", SUP], ["spindleR", TAK]].forEach(([s, c]) => {
  const p = part(s === "spindleL" ? "Supply Spindle" : "Take-up Spindle", s, "minor", { spool: s });
  revolve(p, 0, 0, [[0, 3], [5.5, 3, true], [5.5, 6.2, true], [2.6, 6.6], [2.6, 12, true], [0, 12]], 24);
  for (let k = 0; k < 3; k++) { const a = k * 2.094; line(p, [2.6 * Math.cos(a), 2.6 * Math.sin(a), 12], [3.6 * Math.cos(a), 3.6 * Math.sin(a), 9]); }   // keys that catch the reel's teeth
});
const pinch = part("Pinch Roller", "pinch", "minor", { spool: "pinch" });
revolve(pinch, 0, 0, [[1, HZ - 3.5], [4, HZ - 3.5, true], [4, HZ + 3.5, true], [1, HZ + 3.5]], 24, true);
const pinchArm = part("Pinch Arm", "mech", "minor");
extrude(pinchArm, polyRegion([[PINCH[0] - 2, PINCH[1] - 2], [PINCH[0] + 14, PINCH[1] - 1], [PINCH[0] + 14, PINCH[1] + 3], [PINCH[0] - 2, PINCH[1] + 2]]), HZ + 3.6, HZ + 4.6);
const capstan = part("Capstan and Flywheel", "capstan", "minor", { spool: "capstan" });
revolve(capstan, 0, 0, [[0, 1.2], [FLY_R, 1.2, true], [FLY_R, 4.4, true], [FLY_R - 3, 4.4, true], [FLY_R - 3, 3.4], [1, 3.4], [1, HZ + 4.5, true], [0, HZ + 4.5]], 48);
for (let k = 0; k < 5; k++) { const a = k * 2 * Math.PI / 5; line(capstan, [3 * Math.cos(a), 3 * Math.sin(a), 3.45], [(FLY_R - 3.5) * Math.cos(a), (FLY_R - 3.5) * Math.sin(a), 3.45]); }
const motor = part("Motor", "drive", "major");
cyl(motor, MOTOR[0], MOTOR[1], 10, 0.8, 3.8, 32);
loop(motor, circlePts(MOTOR[0], MOTOR[1], 7, 24).map(q => [...q, 3.85]));
extrude(motor, rect(MOTOR[0] - 4, MOTOR[0] + 4, MOTOR[1] - 14, MOTOR[1] - 10), 1.2, 3.6);   // its speed governor
const pulley = part("Motor Pulley", "pulley", "minor", { spool: "pulley" });
revolve(pulley, 0, 0, [[0, 3.8], [PUL_R, 3.8, true], [PUL_R - 0.8, 4.9], [PUL_R, 6, true], [0, 6]], 16);
const belt = part("Belt", "drive", "minor");
{
  // the open belt round the pulley and the flywheel: two arcs joined by their outer tangents
  const A = [MOTOR[0], MOTOR[1]], B = [CAP[0], CAP[1]], d = Math.hypot(B[0] - A[0], B[1] - A[1]), base = Math.atan2(B[1] - A[1], B[0] - A[0]);
  const phi = Math.acos((FLY_R - PUL_R) / d), z = 3.9, pts = [];
  for (let i = 0; i <= 16; i++) { const a = base + phi + (2 * Math.PI - 2 * phi) * i / 16; pts.push([A[0] + (PUL_R - 0.4) * Math.cos(a), A[1] + (PUL_R - 0.4) * Math.sin(a), z + 1]); }
  for (let i = 0; i <= 24; i++) { const a = base - phi + 2 * phi * i / 24; pts.push([B[0] + FLY_R * Math.cos(a), B[1] + FLY_R * Math.sin(a), z]); }
  pts.push(pts[0]);
  tube(belt, pts, 0.6, 6);
}
const board = part("Amplifier Board", "drive", "minor");
extrude(board, rrRegion(30, 28, 10, 13, 1, 2), 1, 2.2);
[[26, 22], [34, 22], [30, 32]].forEach(([x, y]) => extrude(board, rrRegion(x, y, 2.5, 2, 0.3, 2), 2.2, 3.4));
cyl(board, 30, 38, 2.2, 2.2, 8, 16);

// ---------- batteries ----------
const batt = part("AA Batteries", "battery", "major");
[45.5, 58.5].forEach((x, i) => {
  const p0 = [x, -25, 7.5], p1 = [x, 25, 7.5];
  tube(batt, [p0, p1], 6.5, 24);
  tube(batt, [[x, i ? 25 : -25, 7.5], [x, i ? 26.5 : -26.5, 7.5]], 2.6, 12);   // the positive end, alternating
});

// ---------- callouts and the tour ----------
const BASED = { "Supply Reel": SUP, "Take-up Reel": TAK, "Supply Spindle": [SUP[0], SUP[1], 0], "Take-up Spindle": [TAK[0], TAK[1], 0],
  "Pinch Roller": PINCH, "Capstan and Flywheel": CAP, "Motor Pulley": MOTOR };
const local = (name, p) => r3(BASED[name] ? p.map((c, i) => c - BASED[name][i]) : p);
const hotspots = [
  ["Cassette", "C60 or C90, both sides", [CAS.x + 20, CAS.y + 20, CAS.z1], ["Cassette"]],
  ["Tape reels", "Supply left, take-up right", [SUP[0], SUP[1] + 14, HZ + 2], ["Supply Reel", "Take-up Reel"]],
  ["Playback head", "Reads the magnetic tracks", [CAS.x, TAPE_Y - 4.6, HZ + 4], ["Playback Head"]],
  ["Capstan", "Pulls the tape at 4.76 cm/s", [CAP[0], CAP[1], HZ + 4.5], ["Capstan and Flywheel", "Pinch Roller"]],
  ["Flywheel", "Smooths the speed out", [CAP[0] + FLY_R, CAP[1], 4.4], ["Capstan and Flywheel"]],
  ["Motor and belt", "DC motor, rubber belt", [MOTOR[0], MOTOR[1], 3.8], ["Motor", "Belt"]],
  ["Keys", "Stop, rewind, fast-forward, play", [HW + 4.2, -7, 23], ["Keys"]],
  ["Two headphone jacks", "Listen together", [-45, -HD - 2, 12], ["Jacks and Volume"]],
  ["HOTLINE", "Talk over the music", [52, -8, H + 2.2], ["Hotline Button"]],
  ["Two AA batteries", "About 8 hours of play", [52, 0, 14], ["AA Batteries"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    sup: pt("Supply Reel", [SUP[0] - 18, SUP[1] - 10, HZ]), guideL: pt("Playback Head", [CAS.x - 40, TAPE_Y - 1.2, HZ]), head: pt("Playback Head", [CAS.x, TAPE_Y - 1, HZ]),
    cap: pt("Capstan and Flywheel", [CAP[0], CAP[1], HZ]), tak: pt("Take-up Reel", [TAK[0] + 12, TAK[1] - 8, HZ]), motor: pt("Motor", [MOTOR[0], MOTOR[1], 5]),
    fly: pt("Capstan and Flywheel", [CAP[0], CAP[1], 3]), amp: pt("Amplifier Board", [30, 28, 3]), jack: pt("Jacks and Volume", [-45, -HD - 2, 12]),
    hot: pt("Hotline Button", [52, -8, H + 2]), mic: pt("Hotline Button", [52, -40, H + 20]), keys: pt("Keys", [HW + 3, 15, 15]),
  },
  steps: [
    { t: "Press play", focus: "keys", dist: 0.45, ex: 0, p: ["keys"], n: ["Keys"], ms: 3400,
      d: "The play key latches down, pushes the head plate forward against the tape and swings the pinch roller in against the capstan." },
    { t: "The motor turns the flywheel", focus: "fly", dist: 0.42, ex: 1, p: ["motor", "fly"], n: ["Motor", "Motor Pulley", "Belt", "Capstan and Flywheel"], ms: 4200,
      d: "A small DC motor with a speed governor drives a rubber belt to a heavy flywheel. Its weight evens out any wobble, so the music doesn't waver." },
    { t: "The capstan pulls the tape", focus: "cap", dist: 0.4, ex: 1, p: ["sup", "guideL", "head", "cap", "tak"], n: ["Capstan and Flywheel", "Pinch Roller", "Tape"], ms: 4400,
      d: "The tape is squeezed between the capstan (the flywheel's shaft) and the rubber pinch roller, and pulled past the head at exactly 4.76 cm per second." },
    { t: "The head reads the music", focus: "head", dist: 0.36, ex: 1, p: ["head", "amp", "jack"], n: ["Playback Head", "Amplifier Board"], ms: 4400,
      d: "Magnetised oxide on the tape passing the head's tiny gap induces a voltage in its coils: two tracks for stereo. A small amplifier boosts it for the headphones." },
    { t: "The reels keep up", focus: "sup", dist: 0.45, ex: 1, p: ["sup", "tak"], n: ["Supply Reel", "Take-up Reel", "Supply Spindle", "Take-up Spindle"], ms: 4200,
      d: "A slipping clutch turns the take-up spindle just hard enough to wind the tape in. As one reel grows and the other shrinks, they turn at different speeds." },
    { t: "HOTLINE", focus: "hot", dist: 0.45, ex: 0, p: ["mic", "hot"], n: ["Hotline Button"], ms: 3800,
      d: "With two jacks, two people could listen at once. Hold the orange button and a built-in microphone talks over the music, so you can chat without taking the headphones off." },
  ],
};

// ---------- page and gallery ----------
const geometry = geometryScript("WM_GEOMETRY", "walkman/build.js", { explode, hotspots, tour, constants: { HUB, SUP_R: 22, TAK_R: 15, FLY_R, PUL_R } });
const html = buildPage({ template: "cpu", geometry: geometry.js, model: read(path.join(HERE, "model.js")), swaps: [
  [/<title>[^<]*<\/title>/, "<title>Sony Walkman TPS-L2</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of the Sony Walkman TPS-L2 playing a cassette, its reels, capstan and motor turning: on hover the door lifts, the cassette rises out, the transport comes forward and the case drops away\""],
  [/(<div id="hotspots" aria-label=")[^"]*"/, "$1Walkman parts\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Walkman</b><span>TPS-L2, 1979</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG TPS-L2-001 &middot; Rev A<br>Units mm &middot; View az 35&deg; / el 34&deg;<br>Concept page, not affiliated with Sony</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "walkman", label: "Sony Walkman", kind: "player", tags: "walkman sony tps-l2 cassette tape player music 1979 retro portable animated",
  key: "wm-theme", category: "Audio", html }, "iphone17");
console.log(`walkman/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
