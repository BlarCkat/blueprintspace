// Custom gaming PC: the model script for the blueprint engine, which gamingpc/build.js inlines after the generated
// geometry. All ten fans turn all the time (not with reduced motion), each at its own speed; "." plays a tour of
// the airflow, the liquid cooling, the memory and storage and the power.
(function () {
  "use strict";
  const G = window.GPC_GEOMETRY;
  const DETAIL = {
    "Case": ["Case", "A steel mid-tower: the motherboard tray on the far wall, the roof open for a radiator, room for a full-length graphics card."],
    "Rear Panel": ["Rear panel", "The I/O shield opening, the exhaust fan's grille, seven expansion slot covers and the power supply's opening."],
    "Front Frame": ["Front frame", "The steel frame the intake fans are screwed to."],
    "Feet": ["Feet", "Raise the case so the power supply can breathe from underneath, through a dust filter."],
    "Glass Side Panel": ["Tempered glass side", "4 mm tempered glass the full size of the side, held on four thumbscrews: the whole build is on show."],
    "Mesh Front": ["Mesh front", "Fine steel mesh so the intake fans can breathe freely, with the power button and two USB ports along the top."],
    "PSU Shroud": ["PSU shroud", "A steel cover over the power supply and the spare cables, with a window to show the supply's side."],
    "Power Supply": ["Power supply", "1000 W, 80 Plus Gold, fully modular: only the cables in use are plugged in. Its fan faces down to draw cool air from under the case."],
    "Motherboard": ["Motherboard", "ATX: the socket, four DIMM slots, two M.2 slots, the PCIe slots and the rear I/O, with heavy power stages for the CPU."],
    "I/O Shield": ["Rear I/O", "USB, network, Wi-Fi antennas and audio, built into the board's back edge."],
    "VRM Heatsinks": ["VRM heatsinks", "Cool the power stages that feed the CPU up to 250 W."],
    "CPU": ["CPU", "A 16-core, 32-thread desktop processor, boosting past 5.5 GHz."],
    "Memory": ["Memory", "64 GB of DDR5-6000 on four DIMMs, with light bars along their tops."],
    "M.2 SSD": ["M.2 SSD", "A 2 TB PCIe Gen 4 NVMe drive under the board's heatsink: about 7 GB/s."],
    "Chipset": ["Chipset", "Handles the extra USB, SATA and M.2 lanes, under its own heatsink."],
    "PCIe Slots": ["Slots and power", "The reinforced x16 slot for the graphics card, another slot below, and the 24-pin power socket on the board's edge."],
    "AIO Pump": ["AIO pump", "An all-in-one liquid cooler's pump and cold plate in one block on the CPU, with a small screen on top."],
    "Hoses": ["Hoses", "Braided hoses carrying the liquid to the radiator and back, sealed for life."],
    "Radiator": ["360 mm radiator", "Thin aluminium fins round flat tubes; three fans push air through it and out of the roof."],
    "Graphics Card": ["Graphics card", "A flagship GPU with 24 GB of GDDR6X: a huge fin stack under three fans, a metal backplate and a 16-pin power socket."],
    "Cables": ["Cables", "Sleeved cables for the board's 24-pin and the CPU's 8-pin, and the graphics card's 16-pin, routed behind the tray and through the shroud."],
  };
  G.fans.forEach(f => {
    const o = G.objects.find(x => x.spool === f.id);
    if (!o) return;
    const desc = /^GPU/.test(o.name) ? ["GPU fan", "One of the graphics card's three fans, pushing air down through its fins."]
      : /^Radiator/.test(o.name) ? ["Radiator fan", "120 mm, pushing air up through the radiator and out of the roof."]
      : /^Rear/.test(o.name) ? ["Exhaust fan", "120 mm at the back, taking the warm air out of the case."]
      : ["Intake fan", "120 mm behind the mesh front, pulling cool air into the case."];
    DETAIL[o.name] = desc;
    DETAIL[o.name + " Frame"] = [desc[0] + " frame", "The frame the fan's motor hangs in, with a lit ring round its face."];
  });

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "gpc-theme",
    touchHint: "Tap the PC to take it apart",
    view: { az: 50, el: 18, fit: 1.0 },
    spoolOf: o => o.spool || null,
    occluders: ["Case", "PSU Shroud", "Motherboard", "Graphics Card", "Radiator", "Mesh Front", "Power Supply"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/^Case$|Rear Panel|Front Frame|PSU Shroud|Mesh Front/, ["paint", { color: 0x16171a, roughness: 0.6 }]],
      [/Glass Side Panel/, "clearGlass"], [/Feet/, "rubber"], [/Power Supply/, ["darkAlu", { color: 0x2b2d31 }]],
      [/Motherboard/, "pcb"], [/I\/O Shield|VRM|Chipset|M\.2/, ["darkAlu", { color: 0x3a3d42 }]], [/^CPU$/, "nickel"],
      [/Memory/, ["darkAlu", { color: 0x26282c }]], [/PCIe/, ["plastic", { color: 0x2d2f33 }]],
      [/AIO Pump/, ["plastic", { color: 0x1c1d20, roughness: 0.3 }]], [/Hoses|Cables/, "rubber"], [/Radiator$/, ["darkAlu", { color: 0x222428 }]],
      [/Graphics Card/, ["alu", { color: 0x8f949b, roughness: 0.35 }]], [/Fan/, ["plastic", { color: 0x1d1e21 }]],
    ],

    setup(E) {
      const AX = { y: new THREE.Vector3(0, 0, -1), z: new THREE.Vector3(0, 1, 0), x: new THREE.Vector3(1, 0, 0) };
      const SPEED = { front: 5, top: 6, rear: 5.5, gpu: 8 };
      const fans = G.fans.map(f => ({ ...f, w: SPEED[f.id.replace(/\d+$/, "")] * (0.92 + 0.16 * Math.sin(f.id.length * 7 + f.id.charCodeAt(f.id.length - 1))) }));
      let t = 0;
      return {
        tick(now, dt) {
          if (!E.reduceMotion) t += dt;
          fans.forEach(f => (E.spinners[f.id] || []).forEach(g => g.quaternion.setFromAxisAngle(AX[f.axis], f.w * t)));
        },
      };
    },
  };
})();
