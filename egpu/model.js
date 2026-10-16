// EG-1 external GPU: the model script for the blueprint engine, which egpu/build.js inlines after the generated
// geometry. The card's three fans and the power supply's fan turn all the time (not with reduced motion), and
// "." plays a tour from the Thunderbolt cable to the screen, by way of the power supply and the airflow.
(function () {
  "use strict";
  const G = window.EG1_GEOMETRY;

  // ---------- part notes, shown when you click a part ----------
  const FAN = ["Axial fan", "One of three 90 mm fans with eleven curved blades tied together by a ring at their tips. The ring stiffens the blades and stops air spilling round their ends, so the fans move more air at lower, quieter speeds."];
  const DETAIL = {
    "Enclosure Shell": ["Aluminium shell", "One extruded aluminium tube forms the top, bottom and far side. It slides off in one piece once the end caps are off."],
    "Top Vents": ["Top vents", "Slots above the card let the hot air the fans push through the fin stack rise out of the enclosure."],
    "Mesh Side Panel": ["Mesh side panel", "A perforated steel panel right in front of the card's fans, so they breathe cool room air instead of their own exhaust."],
    "Power End Cap": ["Power end cap", "Closes the power-supply end of the shell, with the mains socket, the power switch and the status light."],
    "Power Inlet": ["Mains inlet and switch", "A standard IEC socket for the power cord, a rocker switch, and a light that glows when a laptop is connected."],
    "I/O End Cap": ["I/O end cap", "Openings for the card's display outputs and the Thunderbolt port. The card's own bracket screws to it."],
    "Shroud": ["Shroud", "The card's cover, with three openings for the fans. It ducts their air through the fin stack instead of letting it escape round the sides."],
    "Fan 1": FAN, "Fan 2": FAN, "Fan 3": FAN,
    "Heatsink": ["Fin stack", "More than a hundred thin aluminium fins with a copper cold plate under them, pressed onto the graphics processor and its memory."],
    "Heat Pipes": ["Heat pipes", "Five sealed copper pipes. Liquid inside boils at the cold plate and condenses in the far ends of the fin stack, spreading the heat along its whole length."],
    "PCB": ["Circuit board", "A 12-layer board carrying the processor, memory and power stages, with the PCIe x16 edge connector along its bottom edge."],
    "GPU": ["Graphics processor", "Thousands of shader cores on one large die. They turn the laptop's draw calls into finished frames."],
    "GDDR Memory": ["GDDR memory", "Eight memory chips round the processor, each on its own 32-bit channel: a 256-bit bus at hundreds of gigabytes a second."],
    "VRM": ["Power stages", "Inductors and power stages that step the supply's 12 V down to the fraction of a volt the processor runs on, at hundreds of amps."],
    "Power Connector": ["12V-2x6 connector", "A single connector that carries up to 600 W into the card, with sense pins that tell the card how much it may draw."],
    "Backplate": ["Backplate", "A metal plate that stiffens the long board and spreads heat from the back of it. The cut-out at the end lets the last fan blow straight through."],
    "I/O Bracket": ["I/O bracket", "The steel bracket at the end of the card that holds its display outputs and screws to the enclosure."],
    "Display Outputs": ["Display outputs", "Three DisplayPort outputs and one HDMI, for monitors plugged straight into the card."],
    "Sled Tray": ["Slide-out sled", "A steel tray that carries the Thunderbolt board and the card. It slides out of the shell so a card can be swapped without tools."],
    "Controller Board": ["Controller board", "Turns the Thunderbolt link into a PCIe slot, adds USB ports, and manages power for the laptop it charges."],
    "PCIe Slot": ["PCIe x16 slot", "A full-size slot so any desktop card fits. Four of its lanes are wired, which is everything Thunderbolt carries."],
    "Thunderbolt Controller": ["Thunderbolt controller", "The bridge between the laptop and the card: it carries PCI Express, USB and DisplayPort over one 40 Gb/s cable, and negotiates up to 100 W of charging back to the laptop."],
    "Board Components": ["Board components", "A USB hub, the power input from the supply and the small regulators that run the board."],
    "Power Supply": ["750 W power supply", "Turns mains power into the 12 V the card and board run on. Its own fan cools it, separately from the card's."],
    "PSU Fan": ["Power supply fan", "Seven wide blades that pull air through the supply. It spins faster than the card's fans but is smaller and further back."],
    "Power Cable": ["Power cables", "One 12V-2x6 cable up and over to the card, and a short one down to the controller board."],
  };

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "eg1-theme",
    touchHint: "Tap the enclosure to take it apart",
    view: { az: 45, el: 26 },
    spoolOf: o => o.spool || null,
    occluders: ["Enclosure Shell", "Power End Cap", "I/O End Cap", "Shroud", "Power Supply", "Backplate"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    // shaded and photo styles: a space-grey shell, a black card with an aluminium fin stack
    materials: [
      [/Enclosure Shell|End Cap|Mesh Side Panel/, ["darkAlu", { color: 0x55595f }]],
      [/Shroud/, ["plastic", { color: 0x1a1b1e, roughness: 0.4 }]], [/Fan|PSU Fan/, ["plastic", { color: 0x141416 }]],
      [/Heatsink/, "alu"], [/Heat Pipes/, "copper"], [/^PCB$|Controller Board/, "pcb"],
      [/^GPU$|GDDR Memory|VRM|Thunderbolt Controller|Board Components/, "chip"],
      [/Backplate/, ["darkAlu", { color: 0x2a2c30 }]], [/I\/O Bracket|Sled Tray/, "steel"],
      [/Display Outputs|Power Connector|PCIe Slot|Power Inlet/, ["plastic", { color: 0x0b0b0c }]],
      [/Power Supply/, ["greyPaint", { color: 0x2b2d31 }]], [/Power Cable/, "rubber"],
    ],

    setup(E) {
      // fan speeds in rad/s; each fan's module is based at its hub, so it turns in place (Blender Y is three's -Z)
      const SPEED = { gpu: 5.5, psu: 8 };
      let t = 0;
      return {
        tick(now, dt) {
          if (!E.reduceMotion) t += dt;
          Object.keys(SPEED).forEach(k => (E.spinners[k] || []).forEach(g => { g.rotation.z = SPEED[k] * t; }));
        },
      };
    },
  };
})();
