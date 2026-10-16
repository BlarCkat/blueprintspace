// Xbox Series X: the model script for the blueprint engine, which xbox/build.js inlines after the generated
// geometry. The top fan turns all the time (not with reduced motion); "." plays a tour of the airflow, the
// processor and memory, the SSD and the power supply.
(function () {
  "use strict";
  const G = window.XSX_GEOMETRY;

  const DETAIL = {
    "Shell": ["Shell", "A matte black sleeve, open at the top for the vent. It slides off the frame in one piece."],
    "Front Panel": ["Front", "The Xbox button at the top left, the disc slot with its eject button, a USB port and the controller pairing button."],
    "Rear Panel": ["Back", "Vent holes high up; below them two USB ports, HDMI out, Ethernet, power, and the slot for a storage expansion card."],
    "Stand": ["Stand", "A round foot it stands on upright. It can lie on its side as well."],
    "Top Vent": ["Top vent", "The flat black rim round the top, sealed to the shell."],
    "Vent Grille": ["Vent grille", "A shallow dish full of holes, green inside, where all the warm air leaves."],
    "Fan": ["130 mm fan", "One large fan at the very top pulls air through the whole console. Big and slow means quiet."],
    "Fan Shroud": ["Fan shroud", "A ring that seals the fan to the top so it only draws air up through the inside."],
    "Chassis": ["Chassis", "A metal frame between the boards and the drive that holds everything in place and helps carry heat away."],
    "SoC Board": ["Main board", "One half of a split motherboard: the processor with its CPU and GPU, the ten GDDR6 memory chips and the power stages that feed them."],
    "I/O Board": ["I/O board", "The other half: the 1 TB SSD's flash and controller, the expansion card connector and the ports."],
    "Heatsink": ["Vapour chamber and fins", "A sealed chamber on the processor spreads its heat into a tall fin stack in the middle of the console."],
    "Power Supply": ["Power supply", "Built in at the bottom: just plug in the cable. It feeds the boards from below."],
    "Disc Drive": ["Disc drive", "A 4K Ultra HD Blu-ray drive above the power supply; the disc goes in the slot on the front."],
  };

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "xsx-theme",
    touchHint: "Tap the console to take it apart",
    view: { az: 45, el: 22 },
    spoolOf: o => o.spool || null,
    occluders: ["Shell", "Top Vent", "Vent Grille", "Power Supply", "Disc Drive", "Chassis"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    // shaded and photo styles: matte black outside, the green glow in the top vent
    materials: [
      [/^Shell$|Front Panel|Rear Panel|Stand/, ["plastic", { color: 0x141516, roughness: 0.7 }]],
      [/Top Vent/, ["plastic", { color: 0x141516, roughness: 0.7 }]], [/Vent Grille/, ["plastic", { color: 0x1d3a1b, roughness: 0.55 }]],
      [/^Fan$|Fan Shroud/, ["plastic", { color: 0x1c1d1f }]],
      [/Chassis/, "alu"], [/Board/, "pcb"], [/Heatsink/, "copper"], [/Power Supply|Disc Drive/, ["darkAlu", { color: 0x3a3d42 }]],
    ],

    setup(E) {
      let t = 0;
      return {
        tick(now, dt) {
          if (!E.reduceMotion) t += dt;
          (E.spinners.fan || []).forEach(g => { g.rotation.y = 4.5 * t; });   // about its vertical axis
        },
      };
    },
  };
})();
