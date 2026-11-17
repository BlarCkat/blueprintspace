// DualSense controller: the model script for the blueprint engine, which dualsense/build.js inlines after the
// generated geometry. The controller plays itself (not with reduced motion): the sticks roll round, the face
// buttons and the D-pad press in turn and the adaptive triggers squeeze. "." plays a tour of what's inside.
(function () {
  "use strict";
  const G = window.DS5_GEOMETRY;

  const DETAIL = {
    "Bottom Shell": ["Bottom shell", "The white underside and the backs of the grips, with a fine texture of tiny PlayStation shapes to grip."],
    "Black Core": ["Black core", "The black middle of the controller, between the face plates, and the insides of the grips."],
    "Extension Port": ["Extension port", "Gold contacts on the front edge, beside the headphone jack, for a charging dock or an accessory."],
    "Shoulder Frames": ["Shoulder frames", "The black surrounds the bumpers and triggers sit in."],
    "USB-C Port": ["USB-C port", "On the top edge between the triggers: charging and a wired connection."],
    "Left Face Plate": ["Left face plate", "The white wing round the D-pad, sweeping back over the left grip."],
    "Right Face Plate": ["Right face plate", "The white wing round the face buttons, sweeping back over the right grip."],
    "Touchpad": ["Touchpad", "A capacitive pad that reads two fingers at once, and clicks down as a big button."],
    "Light Bar": ["Light bar", "Strips of light down both sides of the touchpad in the player's colour, which a camera can track."],
    "Player Lights": ["Player lights", "A row of five small lights under the touchpad that shows the player number."],
    "Center Panel": ["Centre panel", "The black panel between the sticks: the speaker grille, the PS button and the mute button."],
    "PS Button": ["PS button", "Turns the console on and opens the control centre."],
    "Mute Button": ["Mute button", "Mutes the built-in microphones, and glows orange while they're off."],
    "Create Button": ["Create", "Left of the touchpad: screenshots and clips."], "Options Button": ["Options", "Right of the touchpad: menus."],
    "Bumpers": ["L1 and R1", "Shoulder buttons above the triggers."],
    "Left Trigger": ["L2, adaptive trigger", "A motor and gears behind it can push back against your finger, or stop it part way."],
    "Right Trigger": ["R2, adaptive trigger", "Analogue, with its own motor to give it weight: a bow string, a trigger that jams, a brake."],
    "Left Stick": ["Left stick", "Low between the grips, level with the right one. Tilts on a gimbal and clicks in as L3."],
    "Right Stick": ["Right stick", "Tilts on a gimbal over two sensors; clicks in as R3."],
    "Triangle Button": ["Triangle", "The top face button."], "Circle Button": ["Circle", "The right face button."],
    "Cross Button": ["Cross", "The bottom face button."], "Square Button": ["Square", "The left face button."],
    "D-pad Up": ["D-pad up", "Four separate arrow buttons in a cross."], "D-pad Down": ["D-pad down", "Four separate arrow buttons in a cross."],
    "D-pad Left": ["D-pad left", "Four separate arrow buttons in a cross."], "D-pad Right": ["D-pad right", "Four separate arrow buttons in a cross."],
  };

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "ds5-theme",
    touchHint: "Tap the controller to take it apart",
    view: { az: 30, el: 38, fit: 0.95 },
    silhouetteFlat: 0.9998,
    spoolOf: o => o.spool || null,
    occluders: ["Bottom Shell", "Black Core", "Left Face Plate", "Right Face Plate", "Touchpad"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/Bottom Shell|Face Plate/, ["plastic", { color: 0xe6e7e8, roughness: 0.55 }]],
      [/Black Core|Shoulder Frames|Center Panel/, ["plastic", { color: 0x1a1b1e, roughness: 0.82 }]],
      [/Touchpad/, ["plastic", { color: 0x16171a, roughness: 0.3 }]], [/Light Bar/, ["plastic", { color: 0x7fb4ff, emissive: 0x2a6cff, emissiveIntensity: 1.2 }]],
      [/Player Lights/, ["plastic", { color: 0xffffff, emissive: 0xdde8ff, emissiveIntensity: 1 }]],
      [/Extension Port/, ["copper", { color: 0xd9a441 }]], [/USB-C/, "steel"],
      [/PS Button/, ["darkAlu", { color: 0x2a2c30, roughness: 0.15 }]], [/Mute Button/, ["plastic", { color: 0xff8a3a, emissive: 0xc04a10, emissiveIntensity: 0.6 }]],
      [/Create|Options/, ["plastic", { color: 0x222326 }]],
      [/Bumpers|Trigger/, ["plastic", { color: 0x1e1f22, roughness: 0.4 }]],
      [/Stick/, ["rubber", { color: 0x202124 }]],
      [/Button$|D-pad/, ["plastic", { color: 0x232427, roughness: 0.3 }]],
    ],

    setup(E) {
      const LOOP = 8, X = new THREE.Vector3(1, 0, 0), axis = new THREE.Vector3();
      const sp = n => E.spinners[n] || [];
      const pulse = (t, a, w) => { const u = (t - a) / w; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };
      const tilt = (n, ang, amt) => { axis.set(-Math.sin(ang), 0, -Math.cos(ang)).normalize(); sp(n).forEach(g => g.quaternion.setFromAxisAngle(axis, amt)); };
      let t = 0;
      return {
        tick(now, dt) {
          if (!E.reduceMotion && dt > 0 && dt < 1) t += dt;
          const k = t % LOOP, on = !E.reduceMotion;
          const reach = on ? 0.2 * Math.min(1, Math.sin(Math.PI * k / LOOP) * 2) : 0;
          tilt("ls", 2 * Math.PI * k / 4, reach);
          tilt("rs", -2 * Math.PI * k / 4 + 1, reach * 0.8);
          ["Cross", "Circle", "Square", "Triangle"].forEach((b, i) => { const p = on ? pulse(k, 0.6 + i * 0.5, 0.35) : 0; sp(b).forEach(g => { g.position.y = -1.4 * p; }); });
          ["dUp", "dRight", "dDown", "dLeft"].forEach((b, i) => { const p = on ? pulse(k, 2.8 + i * 0.35, 0.3) : 0; sp(b).forEach(g => { g.position.y = -1.2 * p; }); });
          const lt = on ? pulse(k, 4.6, 1.4) : 0, rt = on ? pulse(k, 5.6, 1.6) : 0;
          sp("lt").forEach(g => g.quaternion.setFromAxisAngle(X, -0.3 * lt));
          sp("rt").forEach(g => g.quaternion.setFromAxisAngle(X, -0.3 * rt));
        },
      };
    },
  };
})();
