// French-door refrigerator: the model script for the blueprint engine, which fridge/build.js inlines after the
// generated geometry (and lib/screen-runtime.js). The evaporator and condenser fans turn all the time (not with
// reduced motion). "/" (or the Animate button) turns on the dispenser's display, which runs through its day:
// the temperatures and ice modes, a glass of water, both doors swinging open (and the display warning about it),
// then cooling back down. In the Shaded and Photo styles the display is its own dark glass with ice-blue figures.
(function () {
  "use strict";
  const G = window.FRG_GEOMETRY;
  const DETAIL = {
    "Cabinet": ["Cabinet", "Stainless steel sides, top and back round a core of insulating foam, with the mullion that separates the two compartments."],
    "Toe Grille": ["Toe grille", "Slots at the foot of the front: air for the machine compartment comes and goes here."],
    "Feet": ["Levelling feet", "Screw up or down to stand it level, so the doors close by themselves."],
    "Liner": ["Liner", "The white plastic inside walls, foamed in place an insulated wall's depth in from the steel."],
    "LED Light": ["LED light", "A strip across the top of the fresh food compartment that comes on when a door opens."],
    "Glass Shelves": ["Glass shelves", "Tempered glass with a lip all round to hold a spill, at three heights."],
    "Crisper Drawers": ["Crisper drawers", "Two drawers under a glass cover that keep fruit and vegetables in more humid air."],
    "Evaporator": ["Evaporator", "Rows of thin fins round the refrigerant tubes, behind the back panel. The refrigerant boils inside them and takes their heat: they run well below freezing."],
    "Evaporator Fan": ["Evaporator fan", "Pulls air through the cold fins and blows it round both compartments."],
    "Compressor": ["Compressor", "A sealed motor and pump that squeezes the refrigerant gas and drives the whole loop, on rubber feet to keep it quiet."],
    "Condenser Coil": ["Condenser coil", "A long folded tube with wire fins at the bottom of the back, where the heat taken from inside goes into the room."],
    "Drain Pan": ["Drain pan", "Catches the water from defrosting, which the warm compressor evaporates away."],
    "Condenser Fan": ["Condenser fan", "Blows room air over the condenser coil and the compressor."],
    "Fan Shroud": ["Fan shroud", "Directs the condenser fan's air through the coil."],
    "Refrigerant Lines": ["Refrigerant lines", "Discharge to the condenser, the thin capillary that drops the pressure on the way to the evaporator, and the suction line back to the compressor."],
    "Freezer Drawer": ["Freezer drawer", "Pulls out on rails with a wire basket inside; the gasket round its back seals it with magnets."],
    "Left Door": ["Left door", "Stainless steel, foam-filled, with a magnetic gasket, the dispenser and its display on the front."],
    "Right Door": ["Right door", "Stainless steel, foam-filled, with a magnetic gasket. It swings on a hinge at its outer edge."],
    "Left Door Bins": ["Door bins", "Three bins on the inside of the door for jars and bottles."],
    "Right Door Bins": ["Door bins", "Three bins on the inside of the door for jars and bottles."],
    "Dispenser": ["Dispenser", "Water, cubed or crushed ice into a glass held against the paddle, over a drip tray, with the display above."],
    "Ice Maker": ["Ice maker", "Inside the door: fills a tray with water, freezes it, then twists the cubes out into a bin above the chute."],
  };

  window.BLUEPRINT_MODEL = {
    screenPart: "Dispenser",
    screenGlass: [],
    screenAnimation: true,
    geometry: G,
    themeKey: "frg-theme",
    touchHint: "Tap the fridge to take it apart",
    view: { az: 35, el: 16, fit: 0.95 },
    spoolOf: o => o.spool || null,
    occluders: ["Cabinet", "Left Door", "Right Door", "Freezer Drawer", "Liner", "Evaporator"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/Cabinet|Left Door$|Right Door$|Freezer Drawer/, ["steel", { color: 0xdfe2e6, roughness: 0.42, metalness: 0.8 }]],
      [/Liner|Door Bins|Ice Maker/, ["plastic", { color: 0xf1f2f0, roughness: 0.4 }]], [/LED Light/, ["plastic", { color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 1.2 }]],
      [/Glass Shelves|Crisper/, ["clearGlass", { color: 0xd8eef0, opacity: 0.35 }]], [/Dispenser/, ["plastic", { color: 0x1b1d20, roughness: 0.35 }]],
      [/Toe Grille|Fan Shroud|Drain Pan/, ["plastic", { color: 0x2a2c2f }]], [/Feet/, "rubber"],
      [/Evaporator$|Condenser Coil|Refrigerant/, "copper"], [/Fan$/, ["plastic", { color: 0x3a3d42 }]], [/Compressor/, ["paint", { color: 0x1d1f22, roughness: 0.5 }]],
    ],

    setup(E) {
      const photo = () => window.__bpGetStyle && window.__bpGetStyle() !== "blueprint";
      const LOOP = 18, state = { open: 0 };
      const ease = u => u * u * (3 - 2 * u);
      const display = window.BP_screenAnimation(E, {
        screen: G.screen, part: "Dispenser", width: 640, height: 344, still: 2,
        toggle: on => { if (!on) state.open = 0; },
        draw(ctx, T, { W, H, fg, bg }) {
          const [ink, dim, paper] = photo() ? ["#9fe4ff", "rgba(159,228,255,.35)", "#071016"] : [fg, fg, bg];
          ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = ctx.strokeStyle = ink; ctx.lineCap = "round"; ctx.textBaseline = "middle";
          const t = T % LOOP;
          state.open = t < 8.2 ? 0 : t < 9.4 ? ease((t - 8.2) / 1.2) : t < 12 ? 1 : t < 13.2 ? 1 - ease((t - 12) / 1.2) : 0;
          const big = (txt, x, y, s) => { ctx.font = "500 " + s + "px 'IBM Plex Mono', ui-monospace, monospace"; ctx.fillText(txt, x, y); };
          const label = (txt, x, y) => { ctx.globalAlpha = 0.6; ctx.font = "500 20px 'IBM Plex Mono', ui-monospace, monospace"; ctx.fillText(txt, x, y); ctx.globalAlpha = 1; };
          const fridgeT = t >= 9 && t < 14 ? 37 + Math.min(2, (t - 9) * 0.5) - Math.max(0, (t - 12) * 0.9) : 37;
          if (t < 5 || t >= 13) {
            ctx.textAlign = "center";
            label("FRIDGE", 160, 46); big(Math.round(fridgeT) + "°F", 160, 112, 76);
            label("FREEZER", 480, 46); big("0°F", 480, 112, 76);
            ctx.globalAlpha = 0.3; ctx.fillRect(W / 2 - 1, 30, 2, 130); ctx.globalAlpha = 1;
            // the dispenser modes, the selected one filled
            const modes = ["CUBED", "CRUSHED", "WATER"], sel = Math.floor(t / 1.7) % 3;
            modes.forEach((m, i) => {
              const x = 120 + i * 200, y = 236;
              ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 84, y - 24, 168, 48, 24) : ctx.rect(x - 84, y - 24, 168, 48);
              if (i === sel) { ctx.fill(); ctx.fillStyle = paper; } else ctx.stroke();
              ctx.font = "500 20px 'IBM Plex Mono', ui-monospace, monospace"; ctx.fillText(m, x, y + 1); ctx.fillStyle = ink;
            });
            if (t >= 13) { ctx.save(); ctx.translate(W - 46, H - 40); ctx.rotate(t * 1.5); for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -18); ctx.stroke(); } ctx.restore(); label("COOLING", W - 130, H - 40); }
            else { label("FILTER", 60, H - 40); for (let k = 0; k < 5; k++) { ctx.globalAlpha = k < 4 ? 1 : 0.3; ctx.fillRect(110 + k * 22, H - 48, 16, 16); } ctx.globalAlpha = 1; }
          } else if (t < 8) {
            ctx.textAlign = "center";
            label("DISPENSING", W / 2, 50); big("WATER", W / 2, 120, 64);
            const p = (t - 5) / 3;
            ctx.lineWidth = 3; ctx.strokeRect(120, 196, 400, 34); ctx.fillRect(124, 200, 392 * p, 26);
            big(Math.round(p * 250) + " ml", W / 2, 286, 30);
          } else {
            ctx.textAlign = "center";
            const flash = Math.floor(t * 2) % 2 === 0;
            ctx.globalAlpha = flash ? 1 : 0.45; big("DOOR OPEN", W / 2, 110, 66); ctx.globalAlpha = 1;
            label("CLOSE THE DOOR TO SAVE ENERGY", W / 2, 180);
            big("0:" + String(Math.floor(t - 8)).padStart(2, "0"), W / 2, 250, 44);
            label("FRIDGE " + fridgeT.toFixed(0) + "°F", W / 2, 306);
          }
          ctx.fillStyle = dim;
        },
      });
      const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, -1), sp = n => E.spinners[n] || [];
      let t = 0, open = 0;
      return {
        mats: [display.mat],
        tick(now, dt) {
          if (!E.reduceMotion && dt > 0 && dt < 1) t += dt;
          sp("fans").forEach(g => g.quaternion.setFromAxisAngle(FWD, 9 * t));
          display.tick(now);
          const want = display.isOn() && !E.reduceMotion ? state.open : 0;
          open += (want - open) * Math.min(1, (dt || 0) * 8);
          // the doors swing outwards on their hinges, the left one clockwise from above, the right one anticlockwise
          sp("doorL").forEach(g => g.quaternion.setFromAxisAngle(UP, -open * 1.9));
          sp("doorR").forEach(g => g.quaternion.setFromAxisAngle(UP, open * 1.9));
        },
        recolor(fg, bg) { display.recolor(fg, bg); },
      };
    },
  };
})();
