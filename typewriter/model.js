// Vintage typewriter: the model script for the blueprint engine, which typewriter/build.js inlines after the
// generated geometry. It types on its own (not with reduced motion): for each letter a key goes down and its
// type bar swings up to the platen, the letter appears on the paper and the carriage steps one place left; at
// the end of a line the platen turns up a line and the carriage slides back. Every key, type bar, the carriage
// and the platen is a spool group the page moves directly.
(function () {
  "use strict";
  const G = window.TW_GEOMETRY;

  const DETAIL = {
    "Body": ["Body", "A cast-iron frame under black enamel. It carries the key levers, the type basket and the rails the carriage runs on."],
    "Pinstripes": ["Pinstripes", "Gold lines painted along the sides, as on most office typewriters of the 1930s."],
    "Feet": ["Rubber feet", "Four soft feet that stop the machine walking across the desk as you type."],
    "Segment": ["Segment", "A slotted half ring of steel. Each type bar pivots on a wire through one slot, so all 44 swing up to the same spot."],
    "Space Bar": ["Space bar", "Moves the carriage on a space without lifting a type bar."],
    "Ribbon Spools": ["Ribbon spools", "The inked ribbon winds from one spool to the other as you type, and reverses at the end."],
    "Ribbon": ["Ribbon", "A cloth ribbon soaked in ink, held up across the printing point by the ribbon guide."],
    "Platen": ["Platen", "A hard rubber roller the paper wraps round. The type bars strike against it, and the knobs at its ends turn it."],
    "Carriage": ["Carriage", "Carries the platen and paper. A spring pulls it left, and the escapement lets it move one step for each letter."],
    "Paper": ["Paper", "Fed in behind the platen and out over the paper table, held flat by the bail and its rollers."],
  };
  G.objects.forEach(o => {
    if (/^Key \d/.test(o.name)) DETAIL[o.name] = ["Key", "A glass-topped key in a chrome ring, on a long lever that runs back to its type bar."];
    if (/^Type Bar/.test(o.name)) DETAIL[o.name] = ["Type bar", "A thin steel arm with a slug at its tip carrying one letter in upper and lower case."];
  });

  // what it types: a letter or figure picks one of the 44 bars
  const TEXT = [
    "Dear reader,", "",
    "the quick brown fox jumps over the lazy dog.",
    "Pack my box with five dozen liquor jugs!",
    "Each key swings one type bar up to the platen,",
    "and the carriage steps along a tenth of an inch.",
    "", "Yours, 1937",
  ];
  const ORDER = "abcdefghijklmnopqrstuvwxyz1234567890.,;:'-!?";
  const barFor = ch => { const i = ORDER.indexOf(ch.toLowerCase()); return i < 0 ? -1 : i % G.typebars.length; };

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "tw-theme",
    touchHint: "Tap the typewriter to take it apart",
    view: { az: 45, el: 30 },
    spoolOf: o => o.spool || null,
    occluders: ["Body", "Carriage", "Platen", "Paper"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    // shaded and photo styles: black enamel, nickel and chrome, cream paper
    materials: [
      [/^Body$/, ["gloss", { color: 0x121314 }]], [/Pinstripes/, "gold"], [/Feet/, "rubber"],
      [/^Key \d/, ["nickel", { roughness: 0.18 }]], [/Space Bar|Segment|Type Bar|Carriage/, "nickel"],
      [/Platen/, ["rubber", { color: 0x1b1b1c }]], [/Ribbon Spools/, "steel"], [/^Ribbon$/, ["rubber", { color: 0x5a1414 }]],
      [/Paper/, ["paint", { color: 0xf3efe2, roughness: 0.9 }]],
    ],

    setup(E) {
      const { toThree, spinners, partGroups, renderer, reduceMotion } = E;
      const UP = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0);
      const keys = G.keys.map(s => (spinners[s] || [])[0]);
      const space = (spinners.space || [])[0];
      const bars = G.typebars.map(b => ({ g: (spinners[b.spool] || [])[0], axis: new THREE.Vector3(b.out[0], 0, -b.out[1]).cross(UP).normalize() }));
      const carriage = spinners.carriage || [], platen = (spinners.platen || [])[0];
      const PITCH = 2.54, START = 70, LINE = 4.23, LINE_TURN = LINE / G.constants.PLATEN.r;

      // ---------- the typed text, on the paper ----------
      const P = G.paper, o = toThree(...P.origin), r = toThree(...P.right), t = toThree(...P.top);
      const u = r.clone().sub(o), v = t.clone().sub(o), lift = u.clone().cross(v).normalize().multiplyScalar(0.4);
      const PX = 5, CW = Math.round(u.length() * PX), CH = Math.round(v.length() * PX);   // 5 px to the mm
      const cv = document.createElement("canvas"); cv.width = CW; cv.height = CH;
      const ctx = cv.getContext("2d");
      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      mat.userData = { base: 1, k: 1, target: 1 };
      const q = r.clone().add(t).sub(o);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute([o, r, q, t].flatMap(p => p.clone().add(lift).toArray()), 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      const sheet = new THREE.Mesh(geo, mat);
      sheet.renderOrder = 4; sheet.raycast = () => {};
      (partGroups.Paper.children[0] || partGroups.Paper).add(sheet);
      let lines = [""], ink = "#fff", dirty = true;
      function draw() {
        ctx.clearRect(0, 0, CW, CH);
        const photo = window.__bpGetStyle && window.__bpGetStyle() !== "blueprint";
        ctx.fillStyle = photo ? "#1d1b18" : ink;
        ctx.font = "500 " + Math.round(3.9 * PX) + "px 'IBM Plex Mono', 'Courier New', monospace";
        ctx.textBaseline = "alphabetic";
        // the newest line sits just above the platen; earlier ones further up the sheet
        lines.forEach((s, i) => {
          const y = CH - 4 * PX - (lines.length - 1 - i) * LINE * PX;
          for (let c = 0; c < s.length; c++) ctx.fillText(s[c], 22 * PX + c * PITCH * PX, y);
        });
        tex.needsUpdate = true; dirty = false;
      }
      let lastStyle = null;

      // ---------- the typing ----------
      let li = 0, ci = 0, col = 0, step = null, turned = 0, carriageX = START;
      const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
      function next(now) {
        const s = TEXT[li];
        if (ci < s.length) { const ch = s[ci++]; step = { kind: ch === " " ? "space" : "key", ch, bar: barFor(ch), t0: now, from: carriageX }; }
        else { step = { kind: "return", t0: now, from: carriageX, turn0: turned }; li = (li + 1) % TEXT.length; ci = 0; }
      }
      if (reduceMotion) { lines = TEXT.slice(0, 5); carriageX = START - PITCH * TEXT[4].length; }
      return {
        mats: [mat],
        tick(now) {
          const style = window.__bpGetStyle ? window.__bpGetStyle() : "blueprint";
          if (style !== lastStyle) { lastStyle = style; dirty = true; }
          if (!reduceMotion) {
            if (!step) next(now);
            const dt = now - step.t0;
            keys.forEach(k => k && (k.position.y = 0));
            if (space) space.position.y = 0;
            bars.forEach(b => b.g && b.g.quaternion.identity());
            if (step.kind === "key" || step.kind === "space") {
              const T = 170, hit = 60;
              // the key goes down and comes back; its bar swings up to the platen and falls back
              const down = dt < hit ? dt / hit : Math.max(0, 1 - (dt - hit) / 90);
              if (step.kind === "space") { if (space) space.position.y = -3.2 * down; }
              else {
                const k = keys[step.bar]; if (k) k.position.y = -3.5 * down;
                const b = bars[step.bar]; if (b && b.g) b.g.quaternion.setFromAxisAngle(b.axis, G.swing * (dt < hit ? ease(dt / hit) : Math.max(0, 1 - (dt - hit) / 110)));
              }
              if (!step.printed && dt >= hit) {
                step.printed = true;
                lines[lines.length - 1] += step.kind === "space" ? " " : step.ch;
                dirty = true;
              }
              // the escapement lets the carriage step one place left as the bar falls back
              carriageX = step.from - PITCH * Math.min(1, Math.max(0, (dt - hit - 20) / 50));
              if (dt >= T) { carriageX = step.from - PITCH; step = null; }
            } else {
              // line feed, then the carriage slides back to the margin
              const T = 760;
              turned = step.turn0 + LINE_TURN * Math.min(1, dt / 220);
              carriageX = step.from + (START - step.from) * ease(Math.min(1, Math.max(0, (dt - 160) / 560)));
              if (!step.fed && dt >= 220) {
                step.fed = true;
                lines.push("");
                if (li === 0) lines = [""];          // a fresh sheet after the last line
                if (lines.length > 30) lines.shift();
                dirty = true;
              }
              if (dt >= T) { carriageX = START; step = null; }
            }
          }
          carriage.forEach(g => { g.position.x = carriageX - START; });
          if (platen) { platen.position.x = carriageX - START; platen.quaternion.setFromAxisAngle(X, turned); }
          if (dirty) draw();
        },
        recolor(fg) { ink = fg; dirty = true; },
      };
    },
  };
})();
