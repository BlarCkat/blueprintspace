/*
French-door refrigerator: builds the model page and adds it to the gallery.

Generated in code (with lib/procedural.js). It's drawn in mm but stored in cm (the packed geometry only reaches
1.6 m in mm and the fridge stands 1.78 m): every part goes through MM, and every point handed to the page goes
through cm(). X across, Y back from the front (the doors face -Y, towards the default view), Z up; 910 x 740 x 1780.
Two French doors over a freezer drawer, a water and ice dispenser with a display on the left door. Inside: glass
shelves, crisper drawers, door bins and the ice maker; the evaporator and its fan behind the back panel; the
compressor, condenser coil and condenser fan in the machine compartment at the bottom, joined by the refrigerant
lines. The doors are modules of their own, based at their hinges, so the page can swing them open, and the two fans
are based at their hubs so they turn. The page's chrome and the shared engine come from the Spectre page;
lib/screen-runtime.js runs the dispenser's display.

    node fridge/build.js

Writes fridge/index.html (the page on its own) and replaces or inserts the model in index.html.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { read, withFrame, part, line, loop, rrPts, circlePts, rrRegion, rect, polyRegion, stripRegion, extrude, rrBody, cyl, revolve, tube,
  r3, geometryScript, buildPage, addToGallery } = require("../lib/procedural");

const HERE = __dirname;
const MM = q => q.map(c => c / 10);                    // drawn in mm, stored in cm
const cm = p => r3(p.map(c => c / 10));
const FY = q => [q[0], q[2], q[1]];                    // draws in (x, z) and pushes along y (negative y is towards the viewer)
const FX = q => [q[2], q[0], q[1]];                    // draws in (y, z) and pushes along x
const HW = 455, Y0 = -340, Y1 = 370, H = 1780, BASE = 60;   // half width; the cabinet's front and back; height; the toe kick
const WALL = 45;                                        // the insulated walls
const SPLIT = 760;                                      // the divider between the freezer and the fresh food compartment
const DOOR = { y0: -400, y1: Y0, z0: SPLIT + 8, z1: H - 6 };   // the French doors, in front of the cabinet
const HINGE_L = [-HW, (DOOR.y0 + DOOR.y1) / 2, DOOR.z0], HINGE_R = [HW, (DOOR.y0 + DOOR.y1) / 2, DOOR.z0];
const EVAP_FAN = [0, Y1 - WALL - 50, 1590], COND_FAN = [-150, Y1 - 120, 150];
const DISP = { x: -HW + 225, z: 1260 };                 // the dispenser's centre on the left door
const SCR = { x: DISP.x, z: DISP.z + 115, hw: 52, hh: 28 };

const explode = {
  cabinet: [0, 0, 0], liner: [0, 0, 0], doorL: { offset: [-150, -420, 0], base: cm(HINGE_L) }, doorR: { offset: [150, -420, 0], base: cm(HINGE_R) },
  drawer: [0, -560, -40], shelves: [0, -220, 60], crispers: [0, -320, 20], evap: [0, 230, 120], evapFan: { offset: [0, 300, 120], base: cm(EVAP_FAN) },
  machine: [0, 260, -140], condFan: { offset: [0, 330, -140], base: cm(COND_FAN) }, lines: [0, 240, -20], feet: [0, 0, -120],
};
// the explode offsets are in cm like everything else the page sees
Object.keys(explode).forEach(k => { const e = explode[k]; if (Array.isArray(e)) explode[k] = cm(e); else e.offset = cm(e.offset); });

withFrame(MM, () => {
  // ---------- the cabinet: stainless outer shell, open at the front ----------
  const cab = part("Cabinet", "cabinet", "major");
  withFrame(FX, () => [-1, 1].forEach(s => extrude(cab, rect(Y0, Y1, BASE, H), s * HW - (s > 0 ? 8 : 0), s * HW + (s < 0 ? 8 : 0))));   // the sides
  extrude(cab, rrRegion(0, (Y0 + Y1) / 2, HW, (Y1 - Y0) / 2, [0, 0, 6, 6], 3), H - 10, H);                                         // the top
  withFrame(FY, () => extrude(cab, rect(-HW, HW, BASE, H), Y1 - 8, Y1));                                                          // the back
  extrude(cab, rect(-HW, HW, Y0, Y1), BASE, BASE + 10);                                                                            // the floor
  withFrame(FY, () => extrude(cab, rect(-HW + 8, HW - 8, SPLIT - 20, SPLIT + 20), Y0, Y0 + WALL));                                  // the mullion between the compartments
  const grille = part("Toe Grille", "cabinet", "minor");
  withFrame(FY, () => {
    extrude(grille, rect(-HW + 20, HW - 20, 6, BASE - 6), Y0 - 50, Y0 - 40);
    for (let x = -HW + 60; x <= HW - 60; x += 24) loop(grille, rrPts(x, BASE / 2, 6, 14, 5.5, 2).map(q => [...q, Y0 - 50.5]));
  });
  const feet = part("Feet", "feet", "minor");
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { const x = sx * (HW - 50), y = sy > 0 ? Y1 - 60 : Y0 + 60; cyl(feet, x, y, 22, 0, 14, 20); cyl(feet, x, y, 8, 14, BASE, 12); });

  // the white liner inside, an insulated wall in from the shell
  const liner = part("Liner", "liner", "minor");
  const IN = { x: HW - WALL, y0: Y0 + 20, y1: Y1 - WALL, zf0: SPLIT + 20, zf1: H - WALL, zz0: BASE + WALL, zz1: SPLIT - 20 };
  [[IN.zf0, IN.zf1], [IN.zz0, IN.zz1]].forEach(([z0, z1]) => {
    withFrame(FX, () => [-1, 1].forEach(s => extrude(liner, rect(IN.y0, IN.y1, z0, z1), s * IN.x - (s > 0 ? 3 : 0), s * IN.x + (s < 0 ? 3 : 0))));
    withFrame(FY, () => extrude(liner, rect(-IN.x, IN.x, z0, z1), IN.y1, IN.y1 + 3));
    loop(liner, [[-IN.x, IN.y0, z0], [IN.x, IN.y0, z0], [IN.x, IN.y0, z1], [-IN.x, IN.y0, z1]]);
  });
  const light = part("LED Light", "liner", "minor");
  extrude(light, rrRegion(0, -40, 240, 14, 13, 4), IN.zf1 - 8, IN.zf1);

  // ---------- inside the fresh food compartment ----------
  const shelves = part("Glass Shelves", "shelves", "major");
  [1060, 1290, 1500].forEach(z => {
    extrude(shelves, rrRegion(0, -20, IN.x - 8, 280, 6, 3), z, z + 6);
    extrude(shelves, rect(-IN.x + 8, IN.x - 8, -300, -286), z - 14, z + 6);                     // the trim along the front
  });
  const crispers = part("Crisper Drawers", "crispers", "major");
  [-1, 1].forEach(s => {
    const x0 = s < 0 ? -IN.x + 10 : 8, x1 = s < 0 ? -8 : IN.x - 10;
    extrude(crispers, rect(x0, x1, -300, 300), SPLIT + 30, SPLIT + 36);                          // floor
    withFrame(FY, () => extrude(crispers, rect(x0, x1, SPLIT + 30, SPLIT + 230), -306, -300));     // front
    withFrame(FY, () => extrude(crispers, rect(x0, x1, SPLIT + 36, SPLIT + 210), 294, 300));       // back
    withFrame(FX, () => [x0, x1].forEach(x => extrude(crispers, rect(-300, 300, SPLIT + 36, SPLIT + 210), x - 3, x + 3)));
    withFrame(FY, () => extrude(crispers, rrRegion((x0 + x1) / 2, SPLIT + 190, 80, 12, 11, 4), -312, -306));   // the handle
  });
  extrude(crispers, rrRegion(0, -10, IN.x - 8, 300, 6, 3), SPLIT + 250, SPLIT + 256);              // the glass over them

  // the evaporator behind the back panel, and its fan
  const evap = part("Evaporator", "evap", "major");
  withFrame(FY, () => {
    extrude(evap, rect(-IN.x + 10, IN.x - 10, 1430, IN.zf1 - 10), IN.y1 - 40, IN.y1 - 34);         // the back panel
    for (let x = -360; x <= 360; x += 30) loop(evap, rrPts(x, 1460, 8, 3, 2.9, 2).map(q => [...q, IN.y1 - 40.5]));   // the air slots at its foot
    loop(evap, circlePts(EVAP_FAN[0], EVAP_FAN[2], 70, 40).map(q => [...q, IN.y1 - 40.5]));       // the fan's grille
    for (let x = -340; x <= 340; x += 8) extrude(evap, rect(x - 0.6, x + 0.6, 1500, 1700), IN.y1 - 30, IN.y1 - 4);   // the fins
  });
  [1530, 1600, 1670].forEach(z => tube(evap, [[-345, IN.y1 - 17, z], [345, IN.y1 - 17, z]], 5, 10));   // the tubes through them
  const fan1 = part("Evaporator Fan", "evapFan", "minor", { spool: "fans" });
  withFrame(FY, () => {
    cyl(fan1, 0, 0, 20, -12, 12, 20);
    for (let k = 0; k < 5; k++) { const a = k * 2 * Math.PI / 5, l = [], r = []; for (let i = 0; i <= 4; i++) { const rr = 20 + 42 * i / 4, b = a + 0.5 * i / 4; l.push([rr * Math.cos(b), rr * Math.sin(b)]); r.push([rr * Math.cos(b - 0.55), rr * Math.sin(b - 0.55)]); } extrude(fan1, stripRegion(l, r), -6, 6); }
  });

  // ---------- the machine compartment: compressor, condenser, fan ----------
  const comp = part("Compressor", "machine", "major");
  revolve(comp, 230, Y1 - 150, [[0, BASE + 14], [80, BASE + 14, true], [95, BASE + 40], [95, BASE + 140], [70, BASE + 200], [0, BASE + 215]], 40);
  extrude(comp, rrRegion(230, Y1 - 150, 120, 110, 14, 3), BASE + 4, BASE + 14);                    // its mounting plate
  [-1, 1].forEach(s => cyl(comp, 230 + s * 90, Y1 - 150 + s * 70, 18, BASE + 4, BASE + 26, 16));    // rubber grommets
  const cond = part("Condenser Coil", "machine", "major");
  {
    const pts = []; let up = true;
    for (let x = -420; x <= 60; x += 40) { pts.push([x, Y1 - 60, up ? BASE + 40 : BASE + 290], [x, Y1 - 60, up ? BASE + 290 : BASE + 40]); up = !up; }
    tube(cond, pts, 6, 8);
    for (let z = BASE + 60; z <= BASE + 280; z += 22) line(cond, [-425, Y1 - 60, z], [65, Y1 - 60, z]);   // the wire fins
  }
  const drain = part("Drain Pan", "machine", "minor");
  extrude(drain, rrRegion(-150, Y1 - 260, 200, 70, 10, 3), BASE + 10, BASE + 50, {});
  const fan2 = part("Condenser Fan", "condFan", "minor", { spool: "fans" });
  withFrame(FY, () => {
    cyl(fan2, 0, 0, 22, -14, 14, 20);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, l = [], r = []; for (let i = 0; i <= 4; i++) { const rr = 22 + 56 * i / 4, b = a + 0.6 * i / 4; l.push([rr * Math.cos(b), rr * Math.sin(b)]); r.push([rr * Math.cos(b - 0.7), rr * Math.sin(b - 0.7)]); } extrude(fan2, stripRegion(l, r), -7, 7); }
  });
  const shroud = part("Fan Shroud", "machine", "minor");
  withFrame(FY, () => extrude(shroud, rrRegion(COND_FAN[0], COND_FAN[2], 90, 90, 10, 3, [[COND_FAN[0] - 64, COND_FAN[0] + 64, COND_FAN[2] - 64, COND_FAN[2] + 64]]), COND_FAN[1] - 20, COND_FAN[1] - 14));
  const lines = part("Refrigerant Lines", "lines", "minor");
  tube(lines, [[230, Y1 - 150, BASE + 190], [300, Y1 - 60, BASE + 260], [300, Y1 - 30, 900], [330, Y1 - 30, 1550], [345, Y1 - 17, 1530]], 6, 10);   // the suction line up the back
  tube(lines, [[60, Y1 - 60, BASE + 290], [80, Y1 - 30, 400], [-330, Y1 - 30, 1200], [-345, Y1 - 17, 1670]], 3.5, 8);                        // the capillary down to the evaporator
  tube(lines, [[230, Y1 - 150, BASE + 120], [150, Y1 - 60, BASE + 80], [-420, Y1 - 60, BASE + 40]], 5, 10);                                // discharge to the condenser

  // ---------- the freezer drawer ----------
  const drawer = part("Freezer Drawer", "drawer", "major");
  withFrame(FY, () => {
    rrBody(drawer, 0, (BASE + 10 + SPLIT - 8) / 2, HW - 4, (SPLIT - 8 - BASE - 10) / 2, 6, [[3, DOOR.y0, true], [0, DOOR.y0 + 4], [0, DOOR.y1, true]], { seg: 3 });
    loop(drawer, rrPts(0, (BASE + 10 + SPLIT - 8) / 2, HW - 14, (SPLIT - 8 - BASE - 10) / 2 - 10, 4, 3).map(q => [...q, DOOR.y1 + 0.5]));   // the gasket
    [-1, 1].forEach(s => extrude(drawer, rect(s * 300 - 14, s * 300 + 14, SPLIT - 140, SPLIT - 100), DOOR.y0 - 40, DOOR.y0));   // handle standoffs
  });
  tube(drawer, [[-330, DOOR.y0 - 48, SPLIT - 120], [330, DOOR.y0 - 48, SPLIT - 120]], 14, 20);                                     // the bar handle
  // the wire basket the drawer pulls out with
  {
    const bx = HW - 70, z0 = BASE + 70, z1 = SPLIT - 90, y0 = Y0 + 40, y1 = Y1 - 120;
    [z0, z1].forEach(z => loop(drawer, [[-bx, y0, z], [bx, y0, z], [bx, y1, z], [-bx, y1, z]]));
    for (let x = -bx; x <= bx; x += 40) { line(drawer, [x, y0, z0], [x, y0, z1]); line(drawer, [x, y1, z0], [x, y1, z1]); line(drawer, [x, y0, z0], [x, y1, z0]); }
    for (let y = y0; y <= y1; y += 40) { line(drawer, [-bx, y, z0], [-bx, y, z1]); line(drawer, [bx, y, z0], [bx, y, z1]); }
  }
});

// ---------- the doors: built round their hinges, so they can swing ----------
function door(s) {
  const L = s < 0, mod = L ? "doorL" : "doorR", hinge = L ? HINGE_L : HINGE_R;
  // the door's own frame: x from the hinge across (inward), y through it, z up from its foot; mm, then cm
  const rel = ([x, y, z]) => [x - hinge[0], y - hinge[1], z - hinge[2]];
  const P = q => MM(rel(q));
  const d = part(L ? "Left Door" : "Right Door", mod, "major", { spool: mod });
  const x0 = L ? -HW : 2, x1 = L ? -2 : HW, cx = (x0 + x1) / 2, cz = (DOOR.z0 + DOOR.z1) / 2;
  withFrame(P, () => withFrame(FY, () => {
    rrBody(d, cx, cz, (x1 - x0) / 2, (DOOR.z1 - DOOR.z0) / 2, 8, [[3, DOOR.y0, true], [0, DOOR.y0 + 5], [0, DOOR.y1, true]], { seg: 4 });
    loop(d, rrPts(cx, cz, (x1 - x0) / 2 - 12, (DOOR.z1 - DOOR.z0) / 2 - 12, 6, 3).map(q => [...q, DOOR.y1 + 0.5]));   // the magnetic gasket
    const hx = L ? -40 : 40;
    [1060, 1520].forEach(z => extrude(d, rect(hx - 12, hx + 12, z - 16, z + 16), DOOR.y0 - 50, DOOR.y0));            // handle standoffs
  }));
  withFrame(P, () => tube(d, [[L ? -40 : 40, DOOR.y0 - 58, 1040], [L ? -40 : 40, DOOR.y0 - 58, 1540]], 14, 20));      // the bar handle
  // the bins on the inside of the door
  const bins = part(L ? "Left Door Bins" : "Right Door Bins", mod, "minor", { spool: mod });
  withFrame(P, () => withFrame(FY, () => [920, 1180, 1440].forEach(z => {
    extrude(bins, rect(x0 + 50, x1 - 50, z, z + 110), DOOR.y1 + 90, DOOR.y1 + 96);   // the front lip
  })));
  withFrame(P, () => [920, 1180, 1440].forEach(z => extrude(bins, rect(x0 + 50, x1 - 50, DOOR.y1 + 4, DOOR.y1 + 96), z, z + 6)));   // their floors
  if (L) {
    // the dispenser: a recess, the display above it, the paddle and the drip tray
    const disp = part("Dispenser", mod, "minor", { spool: mod });
    withFrame(P, () => withFrame(FY, () => {
      extrude(disp, rrRegion(DISP.x, DISP.z - 40, 120, 150, 18, 4), DOOR.y0 - 2, DOOR.y0 + 1);
      extrude(disp, rrRegion(DISP.x, DISP.z - 60, 30, 70, 10, 4), DOOR.y0 + 1 - 30, DOOR.y0 + 1);       // the paddle
      extrude(disp, rrRegion(DISP.x, DISP.z - 175, 105, 12, 6, 3), DOOR.y0 - 40, DOOR.y0);              // the drip tray
      for (let x = DISP.x - 90; x <= DISP.x + 90; x += 12) line(disp, [x, DISP.z - 175, DOOR.y0 - 40.5], [x + 4, DISP.z - 168, DOOR.y0 - 40.5]);
      extrude(disp, rrRegion(SCR.x, SCR.z, SCR.hw + 8, SCR.hh + 8, 6, 3), DOOR.y0 - 4, DOOR.y0 - 2);     // the display's bezel
    }));
    const ice = part("Ice Maker", mod, "minor", { spool: mod });
    withFrame(P, () => {
      rrBody(ice, cx, DOOR.y1 + 90, 160, 80, 10, [[0, 1500, true], [0, 1700, true]], { seg: 3 });
      loop(ice, rrPts(cx, DOOR.y1 + 90, 140, 60, 8, 3).map(q => [...q, 1700.5]));
    });
  }
}
door(-1);
door(1);

// ---------- callouts and the tour ----------
const BASED = { "Left Door": HINGE_L, "Left Door Bins": HINGE_L, "Dispenser": HINGE_L, "Ice Maker": HINGE_L, "Right Door": HINGE_R, "Right Door Bins": HINGE_R,
  "Evaporator Fan": EVAP_FAN, "Condenser Fan": COND_FAN };
const local = (name, p) => cm(BASED[name] ? p.map((c, i) => c - BASED[name][i]) : p);
const hotspots = [
  ["French doors", "Swing open on hinges at each side", [HW - 60, DOOR.y0, 1650], ["Right Door"]],
  ["Dispenser", "Water, cubed and crushed ice", [DISP.x, DOOR.y0 - 30, DISP.z - 60], ["Dispenser", "Ice Maker"]],
  ["Display", "Temperatures and modes", [SCR.x + 40, DOOR.y0 - 4, SCR.z + 20], ["Dispenser"]],
  ["Glass shelves", "Spill-proof, three heights", [200, -300, 1296], ["Glass Shelves"]],
  ["Crisper drawers", "Humidity for fruit and veg", [200, -306, SPLIT + 200], ["Crisper Drawers"]],
  ["Freezer drawer", "Pulls out on a wire basket", [0, DOOR.y0 - 62, SPLIT - 120], ["Freezer Drawer"]],
  ["Evaporator", "Where the cold comes from", [200, Y1 - 50, 1650], ["Evaporator", "Evaporator Fan"]],
  ["Compressor", "The heart of the cooling loop", [230, Y1 - 150, BASE + 215], ["Compressor"]],
  ["Condenser coil", "Gives the heat off to the room", [-200, Y1 - 60, BASE + 290], ["Condenser Coil", "Condenser Fan"]],
  ["Insulated walls", "Foam between steel and liner", [-HW, -100, 1200], ["Cabinet", "Liner"]],
].map(([t, s, p, o]) => ({ t, s, p: local(o[0], p), o }));
const pt = (name, p) => [...local(name, p), name];
const tour = {
  points: {
    comp: pt("Compressor", [230, Y1 - 150, BASE + 200]), cond: pt("Condenser Coil", [-200, Y1 - 60, BASE + 200]), cfan: pt("Condenser Fan", COND_FAN),
    room: pt("Condenser Coil", [-200, Y1 + 260, BASE + 200]), up: pt("Refrigerant Lines", [-330, Y1 - 30, 1200]), evap: pt("Evaporator", [0, Y1 - 20, 1600]),
    efan: pt("Evaporator Fan", EVAP_FAN), shelf: pt("Glass Shelves", [0, -100, 1296]), back: pt("Refrigerant Lines", [300, Y1 - 30, 900]),
    freezer: pt("Freezer Drawer", [0, -100, 400]), disp: pt("Dispenser", [DISP.x, DOOR.y0, DISP.z]), ice: pt("Ice Maker", [-230, DOOR.y1 + 90, 1600]),
  },
  steps: [
    { t: "Squeeze the gas", focus: "comp", dist: 0.45, ex: 1, p: ["back", "comp", "cond"], n: ["Compressor", "Refrigerant Lines"], ms: 4400,
      d: "The compressor squeezes the refrigerant gas, which makes it hot, and pushes it into the condenser coil at the back." },
    { t: "Lose the heat", focus: "cond", dist: 0.45, ex: 1, p: ["cond", "cfan", "room"], n: ["Condenser Coil", "Condenser Fan"], ms: 4200,
      d: "The fan blows room air over the coil. The hot gas gives its heat off to the kitchen and condenses into a liquid." },
    { t: "Let it expand", focus: "evap", dist: 0.45, ex: 1, p: ["cond", "up", "evap"], n: ["Refrigerant Lines", "Evaporator"], ms: 4400,
      d: "The liquid squeezes through a thin capillary tube into the evaporator. Its pressure drops, it boils, and boiling takes heat from the fins around it: they go well below freezing." },
    { t: "Blow the cold round", focus: "efan", dist: 0.45, ex: 1, p: ["evap", "efan", "shelf", "freezer"], n: ["Evaporator Fan", "Evaporator", "Glass Shelves"], ms: 4400,
      d: "A fan pulls air through the cold fins and blows it round both compartments. The gas returns to the compressor, and the loop goes on." },
    { t: "Ice and water", focus: "disp", dist: 0.45, ex: 0, p: ["ice", "disp"], n: ["Dispenser", "Ice Maker"], ms: 4000,
      d: "An ice maker in the door freezes trays of cubes and drops them into a bin; pressing the paddle sends water, cubes or crushed ice down the chute." },
  ],
};
// the dispenser's display, in the left door's own (cm) frame
const sp = [SCR.x - SCR.hw, DOOR.y0 - 4.3, SCR.z - SCR.hh], sr = [SCR.x + SCR.hw, DOOR.y0 - 4.3, SCR.z - SCR.hh], st = [SCR.x - SCR.hw, DOOR.y0 - 4.3, SCR.z + SCR.hh];
const screen = { module: "doorL", origin: local("Dispenser", sp), right: local("Dispenser", sr), top: local("Dispenser", st), cornerRadius: 0.3 };

// ---------- page and gallery ----------
const geometry = geometryScript("FRG_GEOMETRY", "fridge/build.js", { explode, hotspots, tour, screen, constants: { H: H / 10 } });
const model = read(path.join(HERE, "..", "lib", "screen-runtime.js")) + read(path.join(HERE, "model.js"));
const html = buildPage({ template: "spectre", geometry: geometry.js, model, swaps: [
  [/<title>[^<]*<\/title>/, "<title>Refrigerator</title>"],
  [/(<canvas id="scene" aria-label=")[^"]*"/, "$1Line drawing of a stainless French-door refrigerator with a water and ice dispenser: on hover the doors and freezer drawer come away, the shelves and drawers slide out and the evaporator, compressor, condenser and fans move apart\""],
  [/<a class="mark" href="#top">.*?<\/a>/, '<a class="mark" href="#top"><b>Refrigerator</b><span>French door</span></a>'],
  [/<div class="dwg" aria-hidden="true">.*?<\/div>/,
    '<div class="dwg" aria-hidden="true">DWG FRG-001 &middot; Rev A<br>Units cm &middot; View az 35&deg; / el 16&deg;<br>Concept design, generic parts</div>'],
] });
fs.writeFileSync(path.join(HERE, "index.html"), html);
const count = addToGallery({ id: "fridge", label: "Refrigerator", kind: "appliance", tags: "fridge refrigerator freezer french door appliance kitchen ice water dispenser compressor",
  key: "frg-theme", category: "Appliances", html }, "ledcube");
console.log(`fridge/index.html ${(html.length / 1e6).toFixed(2)} MB, ${geometry.stats}; index.html now has ${count} models`);
