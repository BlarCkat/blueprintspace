// Book: the model script for the blueprint engine, which book/build.js inlines after the generated geometry.
// The pages are made here: the one lying open on each side and the one turning, a strip of quads bent every frame.
// A turn starts every 1.5 s, all the time (not with reduced motion): the page lifts at its outer edge first, curls
// over the spine and lies down on the left, showing its other side, and the next page is already waiting underneath.
// Each page is printed as it comes round (running head, chapters, text, the odd figure, its number), so the book
// never ends. In the line drawing the print is the theme's ink on its paper; in Shaded and Photo, ink on cream.
(function () {
  "use strict";
  const G = window.BOOK_GEOMETRY;
  const DETAIL = {
    "Covers": ["Covers", "Two boards of thick card covered in book cloth, turned in round the edges."],
    "Spine": ["Spine", "Glued, lined and rounded: it lets the book open flat and bends at the grooves either side."],
    "Left Pages": ["Text block", "The pages already read: folded sections sewn through their folds, trimmed flat at the edges."],
    "Right Pages": ["Text block", "The pages still to come. In this book there are always more."],
    "Headbands": ["Headbands", "Little bands of stitched cloth at the head and tail of the spine."],
    "Bookmark": ["Ribbon bookmark", "A ribbon sewn into the spine, hanging out at the foot."],
  };

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "bk-theme",
    touchHint: "Tap the book to take it apart",
    view: { az: 20, el: 40, fit: 0.9 },
    occluders: ["Covers", "Left Pages", "Right Pages", "Spine"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/Covers|Spine/, ["plastic", { color: 0x5a1820, roughness: 0.8 }]],
      [/Pages/, ["plastic", { color: 0xf3ecdc, roughness: 0.85, metalness: 0 }]],
      [/Headbands/, ["plastic", { color: 0xd8b04a }]], [/Bookmark/, ["plastic", { color: 0xb3262e, roughness: 0.5 }]],
    ],

    setup(E) {
      const { toThree, partGroups, reduceMotion } = E;
      const P = G.page, W = P.w, H = P.h, N = 28;
      const PERIOD = 1.5, TURN = 1.15;                     // a new page every 1.5 s; each takes 1.15 s to go over
      const style = () => (window.__bpGetStyle && window.__bpGetStyle()) || "blueprint";
      let fg = "#ffffff", bg = "#141414";

      // ---------- printing a page ----------
      const CW = 512, CH = Math.round(512 * H / W);
      const rnd = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const WORDS = ["Gears", "Light", "Engines", "Circuits", "The Drum", "Signals", "Springs", "The Turbine", "Folding", "Glass"];
      function print(ctx, n, ink, paper) {
        ctx.fillStyle = paper; ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = ctx.strokeStyle = ink;
        const r = rnd(n * 7919 + 13), right = n % 2 === 1, M = 46;
        ctx.globalAlpha = 0.55; ctx.font = "500 15px 'IBM Plex Mono', ui-monospace, monospace"; ctx.textAlign = right ? "right" : "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText(right ? "THE BOOK OF BLUEPRINTS" : "ON HOW THINGS WORK", right ? CW - M : M, 44);
        ctx.globalAlpha = 1;
        let y = 92;
        if (n % 11 === 3) {                                // a chapter opens
          ctx.textAlign = "center";
          ctx.font = "500 18px 'IBM Plex Mono', ui-monospace, monospace"; ctx.fillText("CHAPTER " + (1 + Math.floor(n / 11)), CW / 2, 170);
          ctx.font = "800 46px 'Archivo', 'Helvetica Neue', Arial, sans-serif"; ctx.fillText(WORDS[Math.floor(n / 11) % WORDS.length], CW / 2, 230);
          ctx.fillRect(CW / 2 - 30, 256, 60, 3);
          y = 320;
        }
        const figure = n % 5 === 0 && n % 11 !== 3;
        const figAt = figure ? 300 + Math.floor(r() * 160) : -1;
        // the text: lines of grey bars, the last of each paragraph short, with an indent to start the next
        let para = 0;
        while (y < CH - 92) {
          if (figure && Math.abs(y - figAt) < 12) {        // a figure: a little drawing, framed, with its caption
            const fy = y, fh = 190;
            ctx.lineWidth = 2; ctx.strokeRect(M, fy, CW - 2 * M, fh);
            const cx = CW / 2, cy = fy + fh / 2 - 8;
            ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
            for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ctx.beginPath(); ctx.moveTo(cx + 52 * Math.cos(a), cy + 52 * Math.sin(a)); ctx.lineTo(cx + 64 * Math.cos(a), cy + 64 * Math.sin(a)); ctx.stroke(); }
            ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(M + 20, cy); ctx.lineTo(CW - M - 20, cy); ctx.stroke(); ctx.setLineDash([]);
            ctx.font = "400 13px 'IBM Plex Mono', ui-monospace, monospace"; ctx.textAlign = "center"; ctx.globalAlpha = 0.7;
            ctx.fillText("Fig. " + n + " — a gear, seen end on", cx, fy + fh - 14); ctx.globalAlpha = 1;
            y += fh + 28; continue;
          }
          const lines = 3 + Math.floor(r() * 5);
          for (let l = 0; l < lines && y < CH - 92; l++) {
            const indent = l === 0 && para > 0 ? 28 : 0, last = l === lines - 1;
            let x = M + indent; const end = last ? M + indent + (CW - 2 * M - indent) * (0.3 + 0.5 * r()) : CW - M;
            ctx.globalAlpha = 0.62;
            while (x < end - 10) { const w = Math.min(end - x, 18 + r() * 52); ctx.fillRect(x, y - 7, w, 7); x += w + 7; }   // words
            ctx.globalAlpha = 1;
            y += 17;
          }
          y += 9; para++;
        }
        ctx.font = "500 16px 'IBM Plex Mono', ui-monospace, monospace"; ctx.textAlign = right ? "right" : "left";
        ctx.fillText(String(n), right ? CW - M : M, CH - 40);
      }
      // a printed side: its canvas, texture, and the page number it shows
      function side(flip) {
        const cv = document.createElement("canvas"); cv.width = CW; cv.height = CH;
        const tex = new THREE.CanvasTexture(cv);
        tex.anisotropy = E.renderer.capabilities.getMaxAnisotropy();
        if (flip) { tex.repeat.x = -1; tex.offset.x = 1; }   // the back of a leaf reads the other way
        return { cv, ctx: cv.getContext("2d"), tex, n: -1, look: "" };
      }
      function show(sd, n) {
        const shaded = style() !== "blueprint", look = (shaded ? "s" : "l") + fg + bg;
        if (sd.n === n && sd.look === look) return;
        sd.n = n; sd.look = look;
        print(sd.ctx, n, shaded ? "#2f2a24" : fg, shaded ? "#f3ecdc" : bg);
        sd.tex.encoding = shaded ? THREE.sRGBEncoding : THREE.LinearEncoding;
        sd.tex.needsUpdate = true;
      }

      // ---------- a leaf: a strip bent along its width ----------
      const gutter = s => P.top - P.gutterDip * Math.pow(1 - Math.min(1, s / P.gutterW), 2);
      const slope = s => s < P.gutterW ? 2 * P.gutterDip / P.gutterW * (1 - s / P.gutterW) : 0;
      // the leaf's shape at turn t (0 lying right, 1 lying left): each step along it at its own angle, the outer edge leading
      function bend(t, lift) {
        const pts = [], ds = W / N, th = t * Math.PI;
        let x = 0, z = gutter(0) + lift;
        for (let i = 0; i <= N; i++) {
          pts.push([x, z]);
          const s = i * ds, b = Math.atan(slope(s));
          const f = Math.max(0, Math.min(1, t + 0.42 * Math.sin(th) * (s / W - 0.25)));
          const a = b + (Math.PI - 2 * b) * f;
          x += ds * Math.cos(a); z += ds * Math.sin(a);
        }
        return pts;
      }
      function leaf(group, sides, outline) {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array((N + 1) * 2 * 3), uv = new Float32Array((N + 1) * 2 * 2), idx = [];
        for (let i = 0; i <= N; i++) for (let j = 0; j < 2; j++) { const k = i * 2 + j; uv[k * 2] = i / N; uv[k * 2 + 1] = j; }
        for (let i = 0; i < N; i++) { const a = i * 2, b = a + 2; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        geo.setIndex(idx);
        const mk = (sd, sideFlag) => ({
          line: new THREE.MeshBasicMaterial({ map: sd.tex, side: sideFlag, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
          shade: new THREE.MeshStandardMaterial({ map: sd.tex, side: sideFlag, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
        });
        const faces = sides.map(([sd, flag]) => { const m = mk(sd, flag); const mesh = new THREE.Mesh(geo, m.line); mesh.renderOrder = 3; mesh.raycast = () => {}; group.add(mesh); return { mesh, m, sd }; });
        let edge = null;
        if (outline) {
          const lg = new THREE.BufferGeometry();
          lg.setAttribute("position", new THREE.BufferAttribute(new Float32Array((N * 2 + 2) * 2 * 3), 3));
          edge = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xffffff }));
          edge.renderOrder = 4; edge.raycast = () => {};
          group.add(edge);
        }
        // place it at turn t
        function place(t, lift) {
          const pts = bend(t, lift);
          pts.forEach(([x, z], i) => [-H / 2, H / 2].forEach((y, j) => { const v = toThree(x, y, z), k = (i * 2 + j) * 3; pos[k] = v.x; pos[k + 1] = v.y; pos[k + 2] = v.z; }));
          geo.attributes.position.needsUpdate = true;
          geo.computeVertexNormals(); geo.computeBoundingSphere();
          if (edge) {
            const e = edge.geometry.attributes.position.array; let o = 0;
            const put = k => { e[o++] = pos[k * 3]; e[o++] = pos[k * 3 + 1]; e[o++] = pos[k * 3 + 2]; };
            for (let i = 0; i < N; i++) for (let j = 0; j < 2; j++) { put(i * 2 + j); put((i + 1) * 2 + j); }   // head and tail edges
            put(N * 2); put(N * 2 + 1);                                                                          // the fore-edge
            put(0); put(1);                                                                                      // along the gutter
            edge.geometry.attributes.position.needsUpdate = true; edge.geometry.computeBoundingSphere();
          }
        }
        function look(shaded, visible) {
          faces.forEach(f => { f.mesh.material = shaded ? f.m.shade : f.m.line; f.mesh.visible = visible; });
          if (edge) { edge.visible = visible && !shaded; edge.material.color.set(fg); }
        }
        return { place, look, faces };
      }

      // the two open pages, and the one turning over
      const sRight = side(false), sLeft = side(true), sFront = side(false), sBack = side(true);
      const right = leaf(partGroups["Right Pages"], [[sRight, THREE.FrontSide]], false);
      const left = leaf(partGroups["Left Pages"], [[sLeft, THREE.BackSide]], false);
      const turning = leaf(partGroups["Spine"], [[sFront, THREE.FrontSide], [sBack, THREE.BackSide]], true);
      right.place(0, 0.25); left.place(1, 0.25);
      const FIRST = 2;   // the book opens at pages 2 and 3

      let t = 0;
      return {
        tick(now, dt) {
          if (!reduceMotion && dt > 0 && dt < 1) t += dt;
          const k = Math.floor(t / PERIOD), u = (t - k * PERIOD) / TURN;
          const turningNow = !reduceMotion && u < 1;
          // the numbers: turn k carries page FIRST+2k+1 over (its back is FIRST+2k+2) and uncovers FIRST+2k+3
          const shaded = style() !== "blueprint";
          show(sRight, FIRST + 2 * k + 3);                    // already uncovered underneath
          show(sLeft, FIRST + 2 * k + (turningNow ? 0 : 2));  // until the turning page lands on it
          show(sFront, FIRST + 2 * k + 1);
          show(sBack, FIRST + 2 * k + 2);
          right.look(shaded, true); left.look(shaded, true);
          turning.look(shaded, turningNow);
          if (turningNow) {
            const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;   // ease in and out
            turning.place(e, 0.25 + 0.6 * Math.sin(Math.PI * e));
          }
        },
        recolor(f, b) { fg = f; bg = b; },
      };
    },
  };
})();
