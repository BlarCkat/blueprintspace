// Xbox 360 controller: the model script for the blueprint engine, which x360pad/build.js inlines after the
// generated geometry. The controller plays itself (not with reduced motion): the sticks roll round, the face
// buttons and the D-pad press in turn and the triggers squeeze. "." plays a tour of the controls.
(function () {
  "use strict";
  const G = window.X360_GEOMETRY;

  const DETAIL = {
    "Shell": ["Shell", "Glossy white plastic in two halves, shaped round your palms, with the grips curving down and back."],
    "Control Wells": ["Wells", "Dished rings round the sticks and the D-pad that guide your thumbs and keep the dust out."],
    "Battery Pack": ["Battery pack", "The bump underneath: two AA cells, or a rechargeable pack that charges over the cable."],
    "Grip Trim": ["Grip trim", "The grey band round the inside of the grips, where the shell's two halves meet."],
    "Rear Panel": ["Rear panel", "Between the bumpers: the charging port and the button that pairs the controller with the console."],
    "Bumpers": ["Bumpers", "LB and RB: long shoulder buttons above the triggers, under your index fingers."],
    "Left Trigger": ["Left trigger", "LT: analogue, swinging on a hinge against a spring. The console reads how far you pull it."],
    "Right Trigger": ["Right trigger", "RT: the accelerator, or the trigger. Analogue, on a hinge and a spring."],
    "Left Stick": ["Left stick", "Sits high, where your thumb rests. Tilts on a gimbal over two potentiometers, and clicks in."],
    "Left Stick Cap": ["Left stick cap", "A rubber-topped dish your thumb grips."],
    "Right Stick": ["Right stick", "Lower down, beside the face buttons; usually for the camera. Clicks in as well."],
    "Right Stick Cap": ["Right stick cap", "A rubber-topped dish your thumb grips."],
    "D-pad": ["D-pad", "A cross on a disc that rocks eight ways over four contacts."],
    "D-pad Base": ["D-pad disc", "The disc under the cross that it rocks on."],
    "A Button": ["A button", "Green: yes, jump, pick up."], "A Button Letter": ["A", "The letter under the green cap."],
    "B Button": ["B button", "Red: back, cancel."], "B Button Letter": ["B", "The letter under the red cap."],
    "X Button": ["X button", "Blue."], "X Button Letter": ["X", "The letter under the blue cap."],
    "Y Button": ["Y button", "Yellow."], "Y Button Letter": ["Y", "The letter under the yellow cap."],
    "Guide Button": ["Guide button", "The chrome X in the middle: opens the guide, and turns the console and the controller on."],
    "Ring of Light": ["Ring of light", "Four green quarters round the guide button; the lit one shows which player you are."],
    "Back Button": ["Back", "Left of the guide button."], "Start Button": ["Start", "Right of the guide button: pause, menus."],
  };

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "x36-theme",
    touchHint: "Tap the controller to take it apart",
    view: { az: 30, el: 38, fit: 0.95 },
    silhouetteFlat: 0.9998,
    spoolOf: o => o.spool || null,
    occluders: ["Shell", "Bumpers", "Battery Pack"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/^Shell$|Battery Pack/, ["plastic", { color: 0xdcddda, roughness: 0.35 }]], [/Control Wells|Rear Panel|Bumpers/, ["plastic", { color: 0xe4e4e0, roughness: 0.18 }]],
      [/Grip Trim/, ["plastic", { color: 0xb9bcbf, roughness: 0.3 }]], [/Trigger/, ["plastic", { color: 0xdcdcd8, roughness: 0.3 }]],
      [/Stick$/, ["plastic", { color: 0xd6d7d4, roughness: 0.3 }]], [/Stick Cap/, ["rubber", { color: 0x9a9c9e }]],
      [/D-pad/, ["plastic", { color: 0xc4c6c8, roughness: 0.25 }]],
      [/^A Button$/, ["clearGlass", { color: 0x3fae3a, opacity: 0.7 }]], [/^B Button$/, ["clearGlass", { color: 0xd8312b, opacity: 0.7 }]],
      [/^X Button$/, ["clearGlass", { color: 0x2f6fd6, opacity: 0.7 }]], [/^Y Button$/, ["clearGlass", { color: 0xf0c020, opacity: 0.7 }]],
      [/^A Button Letter/, ["plastic", { color: 0x2d8a2a }]], [/^B Button Letter/, ["plastic", { color: 0xb02520 }]],
      [/^X Button Letter/, ["plastic", { color: 0x2357b0 }]], [/^Y Button Letter/, ["plastic", { color: 0xc89a10 }]],
      [/Guide Button/, ["nickel", { color: 0xc9ccd0, roughness: 0.15 }]],
      [/Ring of Light/, ["plastic", { color: 0x7dff6a, emissive: 0x3fd534, emissiveIntensity: 1.1 }]],
      [/Back Button|Start Button/, ["plastic", { color: 0xb4b6b9, roughness: 0.25 }]],
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
          // the left stick rolls round once a loop, the right one the other way, both easing in and out of the middle
          const reach = on ? 0.2 * Math.min(1, Math.sin(Math.PI * k / LOOP) * 2) : 0;
          tilt("ls", 2 * Math.PI * k / 4, reach);
          tilt("rs", -2 * Math.PI * k / 4 + 1, reach * 0.8);
          ["A", "B", "X", "Y"].forEach((b, i) => { const p = on ? pulse(k, 0.6 + i * 0.5, 0.35) : 0; sp(b).forEach(g => { g.position.y = -1.6 * p; }); });
          sp("dpad").forEach(g => { g.position.y = on ? -1.2 * (pulse(k, 3.2, 0.35) + pulse(k, 3.7, 0.35)) : 0; });
          const lt = on ? pulse(k, 4.6, 1.4) : 0, rt = on ? pulse(k, 5.6, 1.6) : 0;
          sp("lt").forEach(g => g.quaternion.setFromAxisAngle(X, -0.32 * lt));
          sp("rt").forEach(g => g.quaternion.setFromAxisAngle(X, -0.32 * rt));
          ["guide", "back", "start"].forEach(n => sp(n).forEach(g => { g.position.y = 0; }));
        },
      };
    },
  };
})();
