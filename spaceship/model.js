// SX-7 Starhopper (an original design): the model script for the blueprint engine, which spaceship/build.js inlines
// after the generated geometry. All the time (not with reduced motion) the nacelle fans turn, and every so often
// the landing legs fold up into the hull, stay up a while, and come back down.
(function () {
  "use strict";
  const G = window.SX7_GEOMETRY;
  const DETAIL = {
    "Upper Hull": ["Upper hull", "The top of the fuselage, lofted from rounded sections and split at the waterline so it lifts off the decks inside."],
    "Lower Hull": ["Lower hull", "The belly, with bays the landing legs fold into."],
    "Canopy": ["Canopy", "A wraparound glass bulge over the cockpit, braced by three ribs."],
    "Windows": ["Windows", "Portholes down both sides of the crew cabin."],
    "Sensor Dome": ["Sensor dome", "Radar and long-range comms under a dome on the spine, with an antenna mast."],
    "RCS Thrusters": ["RCS thrusters", "Blocks of small jets at the nose and tail that fire in puffs to turn the ship in space."],
    "Dorsal Fin": ["Dorsal fin", "Keeps the ship pointing straight when it flies through air."],
    "Main Engine": ["Main engine", "A big bell at the tail for leaving a planet and crossing space."],
    "Main Engine Glow": ["Main engine", "The hot core of the main engine, glowing at the back of its bell."],
    "Left Wing": ["Wing", "A swept delta with a rounded leading edge and a winglet at its tip; only used in an atmosphere."],
    "Right Wing": ["Wing", "A swept delta with a rounded leading edge and a winglet at its tip; only used in an atmosphere."],
    "Port Light": ["Navigation light", "Red on the left, so other ships can tell which way you're facing."],
    "Starboard Light": ["Navigation light", "Green on the right."],
    "Left Nacelle": ["Engine nacelle", "An air-breathing engine: the intake fan feeds air past the reactor's heat and out of the nozzle."],
    "Right Nacelle": ["Engine nacelle", "An air-breathing engine: the intake fan feeds air past the reactor's heat and out of the nozzle."],
    "Left Engine Glow": ["Nozzle", "The nacelle's hot exhaust."], "Right Engine Glow": ["Nozzle", "The nacelle's hot exhaust."],
    "Left Fan": ["Intake fan", "Eighteen blades behind a spinner, turning in the nacelle's mouth."],
    "Right Fan": ["Intake fan", "Eighteen blades behind a spinner, turning in the nacelle's mouth."],
    "Nose Leg": ["Nose leg", "Folds back into the belly; an oleo strut soaks up the landing."],
    "Left Leg": ["Main leg", "Folds back into the belly, with a wide pad for soft ground."],
    "Right Leg": ["Main leg", "Folds back into the belly, with a wide pad for soft ground."],
    "Cockpit": ["Cockpit", "Two seats facing a console with three screens, under the canopy."],
    "Crew Cabin": ["Crew cabin", "Bunks for four, two up and two down, and a table between them."],
    "Reactor": ["Reactor", "A compact reactor amidships that powers the engines and every system aboard."],
    "Fuel Tanks": ["Fuel tanks", "Two spherical propellant tanks feeding the main engine."],
    "Deck": ["Deck", "The floor the cockpit, cabin and engine room stand on."],
  };

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "sx7-theme",
    touchHint: "Tap the ship to take it apart",
    view: { az: 30, el: 30, fit: 0.72 },
    spoolOf: o => o.spool || null,
    occluders: ["Upper Hull", "Lower Hull", "Left Wing", "Right Wing", "Left Nacelle", "Right Nacelle", "Canopy", "Main Engine"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/Upper Hull|Lower Hull|Wing|Dorsal Fin/, ["paint", { color: 0xe7e8ea, roughness: 0.38 }]],
      [/Nacelle|Sensor Dome|RCS/, ["darkAlu", { color: 0x5c6168, roughness: 0.32 }]], [/Main Engine$/, ["inconel", { color: 0x6e6a66 }]],
      [/Glow/, ["plastic", { color: 0x8fd6ff, emissive: 0x2f9fff, emissiveIntensity: 1.1, roughness: 0.3 }]],
      [/Canopy|Windows/, ["glass", { color: 0x1d2a38 }]], [/Fan$/, "titanium"], [/Leg/, "steel"],
      [/Port Light/, ["plastic", { emissive: 0xff2a1a, emissiveIntensity: 2, color: 0xff3a2a }]], [/Starboard Light/, ["plastic", { emissive: 0x1aff5a, emissiveIntensity: 2, color: 0x2aff6a }]],
      [/Cockpit|Crew Cabin/, ["plastic", { color: 0x3b3d42 }]], [/Reactor/, ["nickel", { roughness: 0.25 }]], [/Fuel Tanks/, ["alu", { color: 0xd8d4c8 }]], [/Deck/, "darkAlu"],
    ],

    setup(E) {
      const FWD = new THREE.Vector3(0, 0, -1), X = new THREE.Vector3(1, 0, 0);
      let t = 0;
      return {
        tick(now, dt) {
          if (!E.reduceMotion) t += dt;
          (E.spinners.fans || []).forEach(g => g.quaternion.setFromAxisAngle(FWD, 8 * t));
          // the legs: down for a while, folding up, up for a while, folding down (16 s round)
          const c = t % 16, ease = u => u * u * (3 - 2 * u);
          const up = c < 6 ? 0 : c < 8 ? ease((c - 6) / 2) : c < 13 ? 1 : c < 15 ? 1 - ease((c - 13) / 2) : 0;
          (E.spinners.legs || []).forEach(g => g.quaternion.setFromAxisAngle(X, up * 1.45));
        },
      };
    },
  };
})();
