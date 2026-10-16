// HV-9 hover hauler: the model script for the blueprint engine, which hover/build.js inlines after the generated
// geometry. The flank turbines' rotors and the mast's sensor head turn all the time (not with reduced motion),
// and "." plays a tour of how it floats, steers, moves and sees.
(function () {
  "use strict";
  const G = window.HV9_GEOMETRY;

  // ---------- part notes, shown when you click a part ----------
  const DETAIL = {
    "Hull": ["Hull", "A rounded composite skin over a welded space frame: blunt at the nose, swelling amidships and tapering to the tail, which holds the power cell behind an access door."],
    "Side Armour": ["Side armour", "Bolt-on plates over the flanks ahead of the turbines, where stones and debris thrown up by the pads hit hardest."],
    "Side Skirts": ["Side skirts", "Ribbed rubbing strips along the bottom of each flank. They take the knocks when the hauler settles against a dock or brushes past an obstacle."],
    "Dorsal Deck": ["Dorsal deck", "A raised deck along the spine with the cockpit set into it, a cooling vent ahead of the canopy, two service hatches near the nose, and a fairing that rises behind the cockpit to the beam."],
    "Cockpit Collar": ["Cockpit collar", "An armoured ring that raises the pilot above the deck and protects the canopy's edge."],
    "Canopy": ["Canopy", "A one-piece dome with a light frame, giving the pilot a clear view all the way round."],
    "Pilot Station": ["Pilot station", "A single seat facing a console, flown with one stick: forward and back for the pods, side to side for the turbines."],
    "Nose Sensor Bay": ["Nose sensor bay", "Lidar and cameras behind a window in the nose, headlights either side and marker lights under the chin."],
    "Port Turbine": ["Lift turbine duct", "A ducted housing in the flank. The duct keeps the rotor's air together and protects anyone standing nearby."],
    "Starboard Turbine": ["Lift turbine duct", "A ducted housing in the flank. The duct keeps the rotor's air together and protects anyone standing nearby."],
    "Port Rotor": ["Lift turbine rotor", "Nine curved blades round an electric hub motor. It trims the hauler's height and, against the other side, steers it."],
    "Starboard Rotor": ["Lift turbine rotor", "Nine curved blades round an electric hub motor. It trims the hauler's height and, against the other side, steers it."],
    "Outrigger Beam": ["Outrigger beam", "Carries both engine pods clear of the hull and the sensor mast between them. A pylon ties it down into the hull."],
    "Radar": ["Rotating sensor", "A sensor head on the mast that sweeps all the way round, mapping the ground and anything moving near the hauler."],
    "Port Engine Pod": ["Engine pod", "Draws air in at the front ring, heats and compresses it, and throws it out of the nozzle for forward thrust. The open hatch shows its cooling ribs."],
    "Starboard Engine Pod": ["Engine pod", "Draws air in at the front ring, heats and compresses it, and throws it out of the nozzle for forward thrust. The open hatch shows its cooling ribs."],
    "Ventral Fins": ["Ventral fins", "Two fins under the tail keep the hauler pointing straight at speed, and it rests on them when it's parked."],
    "Hover Pads": ["Hover pads", "Four lift emitters under the hull push against the ground and hold the hauler level about a metre up."],
  };

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "hv9-theme",
    touchHint: "Tap the hauler to take it apart",
    view: { az: 45, el: 26 },
    spoolOf: o => o.spool || null,
    occluders: ["Hull", "Dorsal Deck", "Cockpit Collar", "Port Engine Pod", "Starboard Engine Pod"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    // shaded and photo styles: off-white panels like the sketch, dark machinery
    materials: [
      [/^Hull$|Dorsal Deck|Engine Pod|Outrigger Beam|Cockpit Collar|Side Armour|Side Skirts/, ["paint", { color: 0xe4e4e0 }]],
      [/Canopy/, ["clearGlass", { color: 0xc9d3da, opacity: 0.16 }]], [/Pilot Station/, ["plastic", { color: 0x3a3c40 }]],
      [/Turbine$|Ventral Fins|Nose Sensor Bay/, ["greyPaint", { color: 0x5d6066 }]],
      [/Rotor|Radar/, ["darkAlu", { color: 0x3c4046 }]], [/Hover Pads/, ["plastic", { color: 0x2a2c30 }]],
    ],

    setup(E) {
      // rad/s: the turbines turn about their (X) axes, the sensor head about its (vertical) mast
      let t = 0;
      return {
        tick(now, dt) {
          if (!E.reduceMotion) t += dt;
          (E.spinners.turbine || []).forEach(g => { g.rotation.x = 6 * t; });
          (E.spinners.radar || []).forEach(g => { g.rotation.y = 1.3 * t; });
        },
      };
    },
  };
})();
