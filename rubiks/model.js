// Rubik's Cube: the model script for the blueprint engine, which rubiks/build.js inlines after the generated
// geometry. The cube turns its layers on its own, twenty random quarter turns and then the same turns undone,
// over and over (not with reduced motion). Every cubie is a spool group that turns about the cube's centre:
// a move turns the groups of the cubies in that layer at that moment, then keeps the new orientation. Taken
// apart, each cubie moves outward from wherever it is, so the turns carry on while the cube is open.
(function () {
  "use strict";
  const G = window.RC_GEOMETRY;
  const piece = n => /^Corner/.test(n) ? ["Corner piece", "One of eight corners, with three stickers. Its foot hooks under the three edges beside it, which keeps it on the cube as layers turn."]
    : /^Edge/.test(n) ? ["Edge piece", "One of twelve edges, with two stickers. It sits between two centres and holds the corners next to it in place."]
    : /^Center/.test(n) ? ["Centre piece", "One of six centres, screwed to a spindle of the core on a spring. It only spins in place, so its colour is the colour of its face."]
    : null;
  const DETAIL = { "Core": ["Core", "A hub with six spindles at right angles. The centre pieces are screwed onto them, and everything else hangs off the centres."] };
  G.objects.forEach(o => { if (!/Sticker$/.test(o.name) && piece(o.name)) DETAIL[o.name] = piece(o.name); });

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "rc3-theme",
    touchHint: "Tap the cube to take it apart",
    view: { az: 45, el: 30, fit: 1.3 },
    spoolOf: o => o.spool || null,
    guides: false,
    occluders: G.objects.filter(o => !/Sticker$/.test(o.name) && o.name !== "Core").map(o => o.name),
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    // shaded and photo styles: a black body and the six colours
    materials: [
      [/White Sticker/, ["paint", { color: 0xf4f4f2 }]], [/Yellow Sticker/, ["paint", { color: 0xffd500 }]],
      [/Red Sticker/, ["paint", { color: 0xc41e3a }]], [/Orange Sticker/, ["paint", { color: 0xff5800 }]],
      [/Blue Sticker/, ["paint", { color: 0x0051ba }]], [/Green Sticker/, ["paint", { color: 0x009e60 }]],
      [/^Core$/, ["plastic", { color: 0x2a2b2e }]], [/^(Corner|Edge|Center)/, ["gloss", { color: 0x111214 }]],
    ],

    setup(E) {
      const GAP = 9;              // mm each cubie moves out per step from the centre when taken apart
      const TURN = 420, REST = 140;   // ms per quarter turn, and between turns
      const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
      // home positions in three's axes (Blender Z is three's Y, Blender Y is three's -Z)
      const cubies = G.cubies.map(c => ({ groups: E.spinners[c.spool] || [], home: new THREE.Vector3(c.home[0], c.home[2], -c.home[1]),
        q: new THREE.Quaternion(), now: new THREE.Quaternion() }));
      const at = new THREE.Vector3(), qm = new THREE.Quaternion();
      // a scramble of quarter turns (no axis twice in a row), then the same turns undone in reverse
      function script() {
        const turns = [];
        let last = -1;
        for (let n = 0; n < 20; n++) {
          let a; do { a = Math.floor(Math.random() * 3); } while (a === last);
          last = a;
          turns.push({ a, layer: [-1, 1, -1, 1, 0][Math.floor(Math.random() * 5)], dir: Math.random() < 0.5 ? 1 : -1 });
        }
        return turns.concat(turns.slice().reverse().map(t => ({ a: t.a, layer: t.layer, dir: -t.dir })));
      }
      let turns = script(), idx = 0, move = null, restUntil = 0;
      const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      return {
        tick(now, dt, e) {
          if (!E.reduceMotion) {
            if (!move && now >= restUntil) {
              const t = turns[idx];
              // the cubies in that layer now
              const members = cubies.filter(c => Math.round(at.copy(c.home).applyQuaternion(c.q).getComponent(t.a)) === t.layer);
              move = { t, members, t0: now };
            }
            if (move) {
              const p = Math.min(1, (now - move.t0) / TURN);
              qm.setFromAxisAngle(AXES[move.t.a], move.t.dir * Math.PI / 2 * ease(p));
              move.members.forEach(c => c.now.multiplyQuaternions(qm, c.q));
              if (p >= 1) {
                move.members.forEach(c => { c.q.copy(c.now).normalize(); });
                move = null; restUntil = now + REST;
                // solved: every cubie is home again (reset exactly, so rounding never builds up), a pause, then again
                if (++idx >= turns.length) { cubies.forEach(c => c.q.identity()); turns = script(); idx = 0; restUntil = now + 1600; }
              }
            }
          }
          // place every cubie: turned, and pushed out from the centre when the cube is apart
          cubies.forEach(c => {
            const q = move && move.members.includes(c) ? c.now : c.q;
            at.copy(c.home).applyQuaternion(q).multiplyScalar(GAP * e);
            c.groups.forEach(g => { g.quaternion.copy(q); g.position.copy(at); });
          });
        },
      };
    },
  };
})();
