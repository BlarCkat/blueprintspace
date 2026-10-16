// Cybertruck: the model script for the blueprint engine, which cybertruck/build.js inlines after the generated
// geometry. Taken apart, the body and tonneau lift off, the wheels move out and the battery and drive units drop
// away; "." plays a tour of how it's powered, steered, sprung and carries a load.
(function () {
  "use strict";
  const G = window.CT_GEOMETRY;

  const DETAIL = {
    "Exoskeleton": ["Stainless exoskeleton", "The body panels are cold-rolled stainless steel, too hard to stamp into curves, which is why every panel is flat and every edge a sharp fold. They carry load, and there's no paint to chip."],
    "Armor Glass": ["Armor glass", "Laminated glass in layers with polymer between them, so a hit cracks it without shattering. The windscreen is one huge pane, swept by a single long wiper."],
    "Mirrors": ["Side mirrors", "Small mirrors on the doors at the base of the A-pillars."],
    "Light Bars": ["Light bars", "One strip of light right across the nose, and another across the tailgate."],
    "Tonneau Cover": ["Tonneau cover", "A powered, lockable cover of hinged slats over the six-foot bed. It rolls up into a housing behind the cab."],
    "Left Wheels": ["Wheels and tyres", "35-inch all-terrain tyres with flat aero covers. The rear wheels steer a few degrees too."],
    "Right Wheels": ["Wheels and tyres", "35-inch all-terrain tyres with flat aero covers. The rear wheels steer a few degrees too."],
    "Battery Pack": ["Battery pack", "A flat pack of cells that forms part of the floor, stiffening the truck as well as powering it."],
    "Drive Units": ["Drive units and air springs", "A motor drives the front axle and two more the rear, each with short half-shafts to its wheels. An air spring at each corner sets the ride height."],
  };

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "ct-theme",
    touchHint: "Tap the truck to take it apart",
    view: { az: 45, el: 22 },
    occluders: ["Exoskeleton", "Armor Glass", "Tonneau Cover", "Left Wheels", "Right Wheels"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    // shaded and photo styles: brushed stainless, dark glass and black trim
    materials: [
      [/Exoskeleton/, ["steel", { color: 0xb8bcc1, roughness: 0.38 }]], [/Mirrors/, ["steel", { color: 0xb8bcc1 }]],
      [/Armor Glass/, ["glass", { color: 0x15181c }]], [/Light Bars/, ["gloss", { color: 0xeef2f6 }]],
      [/Tonneau Cover/, ["plastic", { color: 0x141517, roughness: 0.85 }]], [/Wheels/, "rubber"],
      [/Battery Pack/, "battery"], [/Drive Units/, ["darkAlu", { color: 0x50555c }]],
    ],
  };
})();
