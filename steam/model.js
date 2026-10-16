// Steam Machine: the model script for the blueprint engine, which steam/build.js inlines after the generated
// geometry (and lib/screen-runtime.js). The fan turns and the light strip across the front animates all the time
// (a still glow with reduced motion): a sweep as it starts, a download filling up, then a slow breathing glow.
(function () {
  "use strict";
  const G = window.STM_GEOMETRY;
  const DETAIL = {
    "Shell": ["Shell", "One matte black sleeve with rounded edges over the whole machine; it lifts off upwards."],
    "Top Grille": ["Top grille", "Slots across the top let a little warm air rise out on its own."],
    "Feet": ["Feet", "Four rubber feet lift it off the shelf so air can reach the bottom."],
    "Base Plate": ["Base plate", "The steel floor the power supply and the chassis are fixed to."],
    "Front Panel": ["Front panel", "Perforated for the intake and held on by magnets, so it can be swapped for another colour or design."],
    "Light Strip": ["Light strip", "A row of LEDs that shows the machine's state: starting, downloading, idle. It can be set to match a game, or turned off."],
    "Front Ports": ["Front ports", "Two USB-A ports and a microSD slot on the left, the power button on the right."],
    "Rear Panel": ["Rear panel", "A grille across the top half for the exhaust, the ports underneath."],
    "Rear Ports": ["Rear ports", "Four USB-A, USB-C, HDMI 2.0, DisplayPort 1.4, gigabit Ethernet and the power socket."],
    "Fan Frame": ["Fan frame", "Holds the fan behind the front panel and seals it so all its air goes through the fins."],
    "Fan": ["Fan", "A large fan right behind the front panel. Large and slow is quiet."],
    "Mainboard": ["Mainboard", "Carries the processor, its memory, the SSD, the Wi-Fi card and the rear ports."],
    "AMD Processor": ["AMD processor", "Semi-custom: a CPU with six Zen 4 cores and an RDNA 3 GPU with 28 compute units on one package."],
    "Memory": ["Memory", "8 GB of GDDR6 round the processor for the graphics, and 16 GB of DDR5 on two SO-DIMMs for everything else."],
    "Power Stages": ["Power stages", "The chokes, capacitors and switching stages that turn 12 V into the low, precise voltages the chip needs."],
    "SSD": ["NVMe SSD", "An M.2 drive at the front of the board: 512 GB or 2 TB, with a microSD slot for more."],
    "Wi-Fi Card": ["Wi-Fi card", "Wi-Fi 6E and Bluetooth, with antenna leads running up the back."],
    "Cold Plate": ["Cold plate", "Copper, pressed onto the processor with thermal paste."],
    "Heat Pipes": ["Heat pipes", "Four sealed copper pipes; liquid inside boils at the chip and condenses in the fins."],
    "Fin Stack": ["Fin stack", "Dozens of thin aluminium fins the heat pipes run through, filling the middle of the box."],
    "Power Supply": ["Power supply", "Built in under the board: one cable from the wall, no brick."],
    "Chassis": ["Chassis", "Steel side plates the board, fan and fin stack hang from."],
  };

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "stm-theme",
    touchHint: "Tap the machine to take it apart",
    view: { az: 40, el: 22, fit: 0.95 },
    spoolOf: o => o.spool || null,
    occluders: ["Shell", "Front Panel", "Rear Panel", "Power Supply", "Mainboard", "Fin Stack"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/^Shell$|Top Grille|Front Panel|Rear Panel|Front Ports/, ["plastic", { color: 0x17181a, roughness: 0.75 }]],
      [/Light Strip/, ["plastic", { color: 0xf2f4f6, roughness: 0.2 }]], [/Feet/, "rubber"], [/Rear Ports/, "steel"],
      [/Fan/, ["plastic", { color: 0x1d1e21 }]], [/Mainboard/, "pcb"], [/AMD|Memory|SSD|Wi-Fi|Power Stages/, "chip"],
      [/Cold Plate|Heat Pipes/, "copper"], [/Fin Stack|Chassis|Base Plate/, "alu"], [/Power Supply/, ["darkAlu", { color: 0x3a3d42 }]],
    ],

    setup(E) {
      const LOOP = 14;
      const strip = window.BP_screenAnimation(E, {
        screen: G.ledPanel, part: "Light Strip", width: 1024, height: 32, always: true, still: 12, fps: 40,
        draw(ctx, T, { W, H, fg }) {
          const t = T % LOOP, N = 48, cw = W / N;
          for (let i = 0; i < N; i++) {
            const u = (i + 0.5) / N;
            let a;
            if (t < 3) a = Math.max(0.08, Math.exp(-(((u - t / 2.4) * 9) ** 2)));                 // a sweep across as it starts
            else if (t < 9) { const p = (t - 3) / 6; a = u < p ? 0.9 : u < p + 0.03 ? 0.5 + 0.5 * Math.sin(T * 12) : 0.1; }   // a download filling up
            else a = 0.3 + 0.25 * Math.sin((t - 9) * 1.6 - 1.57) + 0.05 * Math.sin(u * 12 + T);     // breathing while idle
            ctx.globalAlpha = Math.max(0.06, Math.min(1, a));
            ctx.fillRect(i * cw + 2, 4, cw - 4, H - 8);
          }
          ctx.globalAlpha = 1;
        },
      });
      let t = 0;
      return {
        mats: [strip.mat],
        tick(now, dt) {
          if (!E.reduceMotion) t += dt;
          (E.spinners.fan || []).forEach(g => g.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -5 * t));
          strip.tick(now);
        },
        recolor(fg, bg) { strip.recolor(fg, bg); },
      };
    },
  };
})();
