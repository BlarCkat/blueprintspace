// LED cube (a concept design): the model script for the blueprint engine, which ledcube/build.js inlines after the
// generated geometry. A thousand voxels, drawn as instanced light bars inside the layers, play patterns all the
// time: rain, a rolling wave, a sphere pulsing out from the centre and a plane spinning through the volume. In the
// Shaded and Photo styles they glow red behind smoked glass, with every bar faintly lit as in the render; in the
// line drawing they're the drawing's own colour, and dark ones disappear. Reduced motion holds one still frame.
(function () {
  "use strict";
  const G = window.LED_GEOMETRY;
  const DETAIL = {
    "Base": ["Base", "Bead-blasted white aluminium: the controls and USB-C on the front, the electronics inside."],
    "Controls": ["Controls", "A slider that steps through the patterns, an X button that turns it off, USB-C, and the regulatory marks."],
    "Feet": ["Feet", "Four rubber feet."],
    "Driver Board": ["Driver board", "The controller, the wireless chip and ten LED drivers."],
    "LED Drivers": ["LED drivers", "One chip for each layer of a hundred bars, switching them fast enough to look steady."],
    "Battery": ["Battery", "Runs the cube unplugged for a few hours."],
    "Diffuser Plate": ["Diffuser plate", "The top of the base, with a socket for each column of light bars."],
    "Light Layers": ["Light layers", "Ten clear sheets stacked on four posts, each carrying a 10 x 10 grid of light bars: a thousand voxels."],
    "Glass Cube": ["Glass cube", "Smoked glass, 96 mm on a side, that keeps the dust off and darkens the bars that are off."],
    "Glass Rims": ["Glass rims", "Thin metal frames that hold the glass at the top and bottom."],
    "Layer Posts": ["Posts", "Four slim posts in the corners that the ten layers hang on."],
  };

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "led-theme",
    touchHint: "Tap the cube to take it apart",
    view: { az: 30, el: 20, fit: 0.9 },
    occluders: ["Base", "Diffuser Plate", "Driver Board"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/^Base$|Controls/, ["alu", { color: 0xe9e9e7, roughness: 0.5 }]], [/Feet/, "rubber"], [/Diffuser/, ["plastic", { color: 0xf2f2f0, roughness: 0.3 }]],
      [/Glass Rims|Layer Posts/, ["alu", { color: 0x9a9da2 }]], [/Driver Board/, "pcb"], [/LED Drivers/, "chip"], [/Battery/, "battery"],
    ],

    setup(E) {
      const { toThree, partGroups, reduceMotion } = E;
      const V = G.voxels, N = V.n, COUNT = N * N * N;
      const style = () => (window.__bpGetStyle && window.__bpGetStyle()) || "blueprint";
      // the voxels: one instanced bar each, in the layers' group so they move with them
      const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
      const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(V.size[0], V.size[2], V.size[1]), mat, COUNT);
      bars.raycast = () => {};
      bars.renderOrder = 2;
      const pos = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(0, 0, 0);
      for (let k = 0; k < N; k++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = -V.pitch * (N - 1) / 2 + i * V.pitch, y = -V.pitch * (N - 1) / 2 + j * V.pitch, z = V.z0 + k * V.zp;
        pos.push({ p: toThree(x, y, z), u: i / (N - 1) * 2 - 1, w: j / (N - 1) * 2 - 1, h: k / (N - 1) * 2 - 1, col: i * N + j });
      }
      pos.forEach((v, n) => { m4.compose(v.p, q, one); bars.setMatrixAt(n, m4); bars.setColorAt(n, new THREE.Color(0)); });
      partGroups["Light Layers"].add(bars);
      // smoked glass for the shaded styles (the line drawing shows only its edges)
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
      const box = new THREE.Mesh(new THREE.BoxGeometry(96, G.constants.CT - G.constants.BH - 2, 96), glassMat);
      box.position.copy(toThree(0, 0, (G.constants.BH + 2 + G.constants.CT) / 2));
      box.raycast = () => {}; box.renderOrder = 5; box.visible = false;
      partGroups["Glass Cube"].add(box);

      // ---------- the patterns ----------
      const g = x => Math.exp(-x * x);
      const seeds = Array.from({ length: N * N }, (_, c) => [0.35 + ((c * 7919) % 97) / 97 * 0.5, ((c * 104729) % 89) / 89]);
      const PATTERNS = [
        (v, t) => { const [sp, ph] = seeds[v.col], hh = 1.3 - ((t * sp + ph) % 1) * 3; return g((v.h - hh) * 4) * 0.9 + g((v.h - hh - 0.35) * 3) * 0.3; },   // rain
        (v, t) => { const s = 0.75 * Math.sin(2.6 * v.u + 2 * t) * Math.cos(2.2 * v.w + 1.3 * t); return g((v.h - s) * 3.5); },                               // a wave
        (v, t) => { const r = (t * 0.8) % 1.9, d = Math.sqrt(v.u * v.u + v.w * v.w + v.h * v.h); return g((d - r) * 4); },                                    // a sphere
        (v, t) => { const n = [Math.cos(t), Math.sin(t), 0.6 * Math.sin(0.7 * t)], l = Math.hypot(...n); return g((v.u * n[0] + v.w * n[1] + v.h * n[2]) / l * 4); },   // a spinning plane
      ];
      const SPAN = 7, FADE = 0.8;
      const lit = new THREE.Color(), dim = new THREE.Color(), c = new THREE.Color(), fgC = new THREE.Color(0xffffff), bgC = new THREE.Color(0x141414);
      let t = 0, last = "";
      return {
        tick(now, dt) {
          if (!reduceMotion && dt > 0 && dt < 1) t += dt;
          const st = style(), shaded = st !== "blueprint";
          box.visible = shaded;
          if (st !== last) { last = st; mat.needsUpdate = true; }
          if (shaded) { lit.set(0xff3324); dim.set(0x3a0b06); } else { lit.copy(fgC); dim.copy(bgC); }
          const T = reduceMotion ? 3 : t, k = Math.floor(T / SPAN) % PATTERNS.length, f = (T % SPAN) / SPAN * SPAN;
          const A = PATTERNS[k], B = PATTERNS[(k + 1) % PATTERNS.length], mixB = f > SPAN - FADE ? (f - (SPAN - FADE)) / FADE : 0;
          pos.forEach((v, n) => {
            let a = A(v, T) * (1 - mixB) + B(v, T) * mixB;
            a = Math.min(1, a);
            if (shaded) {
              c.copy(dim).lerp(lit, Math.max(0.12, a));   // every bar glows faintly, the pattern bright
              m4.compose(v.p, q, one);
            } else {
              c.copy(dim).lerp(lit, a);
              m4.compose(v.p, q, a < 0.12 ? zero : one);  // in the line drawing, dark bars vanish
            }
            bars.setMatrixAt(n, m4); bars.setColorAt(n, c);
          });
          bars.instanceMatrix.needsUpdate = true; bars.instanceColor.needsUpdate = true;
        },
        recolor(fg, bg) { fgC.set(fg); bgC.set(bg); },
      };
    },
  };
})();
