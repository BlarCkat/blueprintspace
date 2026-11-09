// Front-loading washing machine: the model script for the blueprint engine, which washer/build.js inlines after the
// generated geometry (and lib/screen-runtime.js). "/" (or the Animate button) runs a whole cycle with the display:
// the dial turns to the program, the drum tumbles one way and the other to wash, drains, spins up to speed and down,
// and at the end the door opens. In the Shaded and Photo styles the display is its own dark glass.
(function () {
  "use strict";
  const G = window.WSH_GEOMETRY;
  const DETAIL = {
    "Cabinet": ["Cabinet", "Painted sheet steel sides and back on a base with four levelling feet."],
    "Feet": ["Feet", "Screw up or down to stand it level, so it doesn't walk during the spin."],
    "Top Panel": ["Top panel", "Lifts off to reach the springs, the valves and the top of the tub."],
    "Front Panel": ["Front panel", "The porthole is cut through it; the hatch at the bottom right opens onto the pump's filter."],
    "Control Panel": ["Control panel", "The display and its buttons, the ring of programs round the dial, and the detergent drawer's opening."],
    "Program Dial": ["Program dial", "Turns through the programs: cotton, synthetics, wool, quick wash and the rest."],
    "Detergent Drawer": ["Detergent drawer", "Three compartments, for prewash, main wash and softener; the incoming water washes each one into the tub at its moment in the cycle."],
    "Control Board": ["Control board", "Runs the program: the valves, heater, pump and the motor's speed, and the display."],
    "Door": ["Door", "A chrome ring on two hinge arms with a handle on the right. It locks while there's water in the drum."],
    "Door Glass": ["Door glass", "A toughened glass bowl that reaches into the drum, so the clothes tumble back off it."],
    "Door Seal": ["Door seal", "A rubber bellows from the front panel to the tub, flexible so the tub can move while the door stays shut."],
    "Tub": ["Tub", "The plastic outer tub that holds the water; it hangs on the springs and doesn't turn."],
    "Drum": ["Drum", "Perforated stainless steel, turning inside the tub on one shaft, with three lifters that carry the clothes up and drop them."],
    "Motor Stator": ["Motor stator", "The fixed coils of the direct-drive motor, on the back of the tub."],
    "Motor Rotor": ["Motor rotor", "Magnets in a ring round the stator, fixed straight to the drum's shaft: no belt, no pulleys, and quieter."],
    "Springs and Dampers": ["Springs and dampers", "Two coil springs hang the tub from the top; two dampers below soak up its swing during the spin."],
    "Counterweight": ["Counterweight", "A block of concrete on the tub that makes it heavier and steadier as the drum spins."],
    "Heater": ["Heater", "An element in the bottom of the tub that warms the water."],
    "Drain Pump": ["Drain pump", "Empties the tub through a filter behind the front hatch and up the hose at the back."],
    "Inlet Valves": ["Inlet valves", "Hot and cold solenoid valves that let water in, through the detergent drawer and down into the tub."],
  };

  window.BLUEPRINT_MODEL = {
    screenPart: "Control Panel",
    screenGlass: [],
    screenAnimation: true,
    geometry: G,
    themeKey: "wsh-theme",
    touchHint: "Tap the washer to take it apart",
    view: { az: 35, el: 18, fit: 0.95 },
    spoolOf: o => o.spool || null,
    occluders: ["Cabinet", "Top Panel", "Front Panel", "Control Panel", "Tub", "Drum"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/Cabinet|Top Panel|Front Panel|Control Panel|Detergent/, ["paint", { color: 0xf3f3f1, roughness: 0.35 }]],
      [/^Door$|Program Dial/, ["nickel", { color: 0xc9ccd1, roughness: 0.2 }]], [/Door Glass/, ["clearGlass", { color: 0x9fb7c4, opacity: 0.3 }]],
      [/Door Seal/, ["rubber", { color: 0x9a9da2 }]], [/^Tub$/, ["plastic", { color: 0x3a3c40, roughness: 0.5 }]], [/^Drum$/, ["steel", { roughness: 0.25 }]],
      [/Motor/, ["darkAlu", { color: 0x55595f }]], [/Springs/, "steel"], [/Counterweight/, ["plastic", { color: 0x8d8a84, roughness: 0.9 }]],
      [/Heater/, "nickel"], [/Pump|Valves/, ["plastic", { color: 0x2a2c30 }]], [/Control Board/, "pcb"], [/Feet/, "rubber"],
    ],

    setup(E) {
      const photo = () => window.__bpGetStyle && window.__bpGetStyle() !== "blueprint";
      const LOOP = 24, ease = u => u * u * (3 - 2 * u);
      // the cycle: program 0-2 s, wash 2-10, drain 10-12, spin 12-19, end 19-24 (the door opens at 20 and shuts at 23)
      const phase = t => t < 2 ? "select" : t < 10 ? "wash" : t < 12 ? "drain" : t < 19 ? "spin" : "end";
      const state = { speed: 0, dial: 0, door: 0 };
      function drive(t) {
        const ph = phase(t);
        state.dial = Math.min(1, t / 1.6);
        if (ph === "wash") { const c = (t - 2) % 3; state.speed = c < 1.2 ? 2.4 : c < 1.5 ? 0 : c < 2.7 ? -2.4 : 0; }   // a tumble one way, a pause, the other way
        else if (ph === "spin") state.speed = 2 + 40 * ease(Math.min(1, (t - 12) / 3)) * (t > 17.5 ? Math.max(0, (19 - t) / 1.5) : 1);
        else state.speed = 0;
        state.door = t < 20 ? 0 : t < 21 ? ease(t - 20) : t < 23 ? 1 : t < 24 ? 1 - ease(t - 23) : 0;
        return ph;
      }
      const display = window.BP_screenAnimation(E, {
        screen: G.screen, part: "Control Panel", width: 620, height: 240, still: 5,
        toggle: on => { if (!on) Object.assign(state, { speed: 0, dial: 0, door: 0 }); },
        draw(ctx, T, { W, H, fg, bg }) {
          const [ink, paper] = photo() ? ["#8fe3c8", "#061210"] : [fg, bg];
          ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = ctx.strokeStyle = ink; ctx.textBaseline = "middle";
          const t = T % LOOP, ph = drive(t);
          const mono = (txt, x, y, s, a) => { ctx.textAlign = a || "left"; ctx.font = "500 " + s + "px 'IBM Plex Mono', ui-monospace, monospace"; ctx.fillText(txt, x, y); };
          mono("COTTON", 24, 36, 26); mono("40°C  1400 rpm", W - 24, 36, 22, "right");
          if (ph === "end") { mono("END", W / 2, 118, 70, "center"); mono(t > 20 ? "DOOR UNLOCKED" : "UNLOCKING...", W / 2, 186, 22, "center"); return; }
          const left = Math.max(0, Math.round((19 - t) / 19 * 118));
          mono(Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0"), W / 2, 112, 72, "center");
          // the phases along the bottom, the current one filled
          ["WASH", "RINSE", "SPIN"].forEach((p, i) => {
            const on = (i === 0 && (ph === "wash" || ph === "select")) || (i === 1 && ph === "drain") || (i === 2 && ph === "spin");
            const x = 100 + i * 210, y = 196;
            ctx.lineWidth = 3; ctx.beginPath(); ctx.rect(x - 80, y - 20, 160, 40);
            if (on) { ctx.fill(); ctx.fillStyle = paper; } else ctx.stroke();
            mono(p, x, y + 1, 20, "center"); ctx.fillStyle = ink;
          });
          // a lock while there's water in it
          ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(W - 40, 108, 10, Math.PI, 0); ctx.stroke(); ctx.fillRect(W - 54, 108, 28, 22);
        },
      });
      const sp = n => E.spinners[n] || [], AXLE = new THREE.Vector3(0, 0, -1), UP = new THREE.Vector3(0, 1, 0);
      let ang = 0, speed = 0, dial = 0, door = 0;
      return {
        mats: [display.mat],
        tick(now, dt) {
          display.tick(now);
          const on = display.isOn() && !E.reduceMotion, k = Math.min(1, (dt || 0) * 4);
          speed += ((on ? state.speed : 0) - speed) * k;
          if (dt > 0 && dt < 1) ang += speed * dt;
          sp("drum").forEach(g => g.quaternion.setFromAxisAngle(AXLE, ang));
          dial += ((on ? state.dial : 0) - dial) * Math.min(1, (dt || 0) * 6);
          sp("dial").forEach(g => g.quaternion.setFromAxisAngle(AXLE, -dial * 1.2));
          door += ((on ? state.door : 0) - door) * Math.min(1, (dt || 0) * 8);
          sp("door").forEach(g => g.quaternion.setFromAxisAngle(UP, -door * 1.7));   // swings out to the left on its hinge
        },
        recolor(fg, bg) { display.recolor(fg, bg); },
      };
    },
  };
})();
