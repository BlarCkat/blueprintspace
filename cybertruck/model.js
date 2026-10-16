// Cybertruck: the model script for the blueprint engine, which cybertruck/build.js inlines after the generated
// geometry. Taken apart, the body, frunk lid, doors, tailgate and tonneau lift off, the cabin rises, the wheels
// and suspension move out and the battery, drive units and castings drop away; "." plays a tour of how it's
// powered, steered, sprung, built and carries a load.
(function () {
  "use strict";
  const G = window.CT_GEOMETRY;
  const DOOR = ["Door", "A flat stainless panel with no handle: a button on the pillar behind it opens it. The window drops into it."];
  const WINDOW = ["Door window", "Laminated armor glass, leaning in with the cab's upper sides."];
  const DETAIL = {
    "Exoskeleton": ["Stainless exoskeleton", "The body panels are cold-rolled stainless steel, too hard to stamp into curves, which is why every panel is flat and every edge a sharp fold. They carry load, and there's no paint to chip."],
    "Frunk Lid": ["Frunk lid", "The hood over a lockable front trunk, with a row of vents along its edge."],
    "Armor Glass": ["Armor glass", "Laminated glass in layers with polymer between them, so a hit cracks it without shattering: the windscreen, the rear window and the fixed glass behind the rear doors."],
    "Tailgate": ["Tailgate", "Drops flat to load the vault, over the rear bumper's steps and the hitch receiver."],
    "Wiper": ["Wiper", "One very long wiper sweeps the whole windscreen from a single pivot."],
    "Mirrors": ["Side mirrors", "Small mirrors on short arms at the base of the A-pillars."],
    "Light Bars": ["Light bars", "One strip of light right across the nose, wrapping round its corners, and another across the tailgate."],
    "Cladding": ["Arch and rocker cladding", "Grey composite flares round every wheel arch and along the rockers, so stones and kerbs hit plastic, not steel."],
    "Front Fascia": ["Front fascia", "The black panel under the nose, with covers for the tow hooks, the bumper camera and the radar behind it."],
    "Rear Bumper": ["Rear bumper", "Steps to climb into the vault, the hitch receiver for towing and the rear camera."],
    "Tonneau Cover": ["Tonneau cover", "A powered, lockable cover of hinged slats over the six-foot bed. It rolls up into a housing behind the cab."],
    "Seats": ["Seats", "Two front seats and a bench for three in the back, under the big glass roof."],
    "Dashboard": ["Dashboard", "A long, plain dash with almost no buttons: nearly everything is on the screen."],
    "Touchscreen": ["Touchscreen", "18.5 inches across, in the middle of the dash, for navigation, climate, music and the truck's settings."],
    "Yoke": ["Yoke", "A squared-off steering yoke; with steer-by-wire it only needs to turn a little way either side."],
    "Center Console": ["Centre console", "Cupholders, a deep bin under the armrest and a screen for the rear seats on its back."],
    "Castings": ["Front and rear castings", "Each end of the truck is one big aluminium casting, which carries the suspension and the drive units."],
    "Battery Pack": ["Battery pack", "A flat pack of cells that forms part of the floor, stiffening the truck as well as powering it."],
    "Drive Units": ["Drive units", "A motor and gearbox at the front axle and two motors at the rear, each with an inverter turning the battery's DC into AC for it."],
    "Half Shafts": ["Half-shafts", "Shafts with rubber-booted constant-velocity joints at each end, carrying the motors' torque to the wheels as the suspension moves."],
  };
  ["Front Left", "Front Right", "Rear Left", "Rear Right"].forEach(n => { DETAIL[n + " Door"] = DOOR; DETAIL[n + " Window"] = WINDOW; });
  ["Left", "Right"].forEach(n => {
    DETAIL[n + " Wheels"] = ["Wheels and tyres", "35-inch all-terrain tyres with chevron tread blocks, behind flat aero covers."];
    DETAIL[n + " Suspension"] = ["Suspension and steering", "Upper and lower wishbones, a knuckle, an air spring round a damper, and a tie rod from the steering rack. The rear racks steer the back wheels a few degrees."];
    DETAIL[n + " Brakes"] = ["Brakes", "A vented disc and caliper at each corner, though the motors do most of the slowing by turning back into generators."];
  });

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "ct-theme",
    touchHint: "Tap the truck to take it apart",
    view: { az: 45, el: 22 },
    occluders: ["Exoskeleton", "Armor Glass", "Tonneau Cover", "Frunk Lid", "Tailgate", "Left Wheels", "Right Wheels",
      "Front Left Door", "Front Right Door", "Rear Left Door", "Rear Right Door"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    // shaded and photo styles: brushed stainless, tinted glass with the cabin behind it, grey cladding, black trim
    materials: [
      [/Exoskeleton|Door$|Frunk Lid|Tailgate|Mirrors/, ["steel", { color: 0xb8bcc1, roughness: 0.38 }]],
      [/Armor Glass|Window/, ["clearGlass", { color: 0x0e1215, opacity: 0.5 }]], [/Light Bars/, ["gloss", { color: 0xeef2f6 }]],
      [/Cladding/, ["plastic", { color: 0x4a4d52, roughness: 0.8 }]], [/Front Fascia|Rear Bumper|Wiper/, ["plastic", { color: 0x18191b }]],
      [/Tonneau Cover/, ["plastic", { color: 0x141517, roughness: 0.85 }]], [/Wheels/, "rubber"],
      [/Seats/, ["plastic", { color: 0x2b2c2e, roughness: 0.75 }]], [/Dashboard|Center Console/, ["plastic", { color: 0x8a8f96 }]],
      [/Touchscreen/, "glass"], [/Yoke/, ["plastic", { color: 0x1a1b1c }]],
      [/Castings/, "alu"], [/Battery Pack/, "battery"], [/Drive Units/, ["darkAlu", { color: 0x50555c }]], [/Half Shafts|Suspension/, "steel"],
      [/Brakes/, ["steel", { color: 0x7a7d82, roughness: 0.5 }]],
    ],
  };
})();
