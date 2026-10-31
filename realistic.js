  // ---------- shaded and photo render styles (added by blueprints/build_gallery.py) ----------
  // window.__bpSetStyle("blueprint" | "realistic" | "photo"). "realistic" (Shaded) swaps the line drawing for
  // flat-coloured shaded parts in a soft studio. "photo" goes further: physical materials with surface texture
  // (plastic grain, brushed metal, circuit boards, clear-coated gloss), lit like a product photoshoot: a warm
  // seamless backdrop in the colours of the page's theme (LOOKS below), a big soft key, a coloured rim light and
  // a soft shadow on the backdrop's floor; the page's text turns dark or light to sit on it. Surfaces carry
  // high-resolution normal and roughness maps, sized in real millimetres. Materials come from the model's own list (M.materials) first, then from
  // each part's name.
  (function () {
    const P = {
      alu:      { color: 0xc4c8ce, metalness: 1, roughness: 0.32, tex: "brushed" },
      darkAlu:  { color: 0x4a505c, metalness: 1, roughness: 0.38, tex: "brushed" },
      steel:    { color: 0x9da2a8, metalness: 1, roughness: 0.3, tex: "brushed" },
      nickel:   { color: 0xc9cbce, metalness: 1, roughness: 0.22, tex: "brushed" },
      titanium: { color: 0xa7a59c, metalness: 1, roughness: 0.34, tex: "brushed" },
      hot:      { color: 0x7d6655, metalness: 0.9, roughness: 0.45, tex: "cast" },
      inconel:  { color: 0x8b8680, metalness: 1, roughness: 0.4, tex: "cast" },
      copper:   { color: 0xc27a45, metalness: 1, roughness: 0.3, tex: "brushed" },
      gold:     { color: 0xe0b44a, metalness: 1, roughness: 0.25, tex: "brushed" },
      pcb:      { color: 0x1d5a3a, metalness: 0.1, roughness: 0.55, tex: "pcb", clearcoat: 0.4 },
      chip:     { color: 0x1c1c1f, metalness: 0.2, roughness: 0.4, tex: "grain" },
      silicon:  { color: 0x3b4466, metalness: 0.7, roughness: 0.18 },
      ceramic:  { color: 0x9b7a4c, metalness: 0, roughness: 0.5, tex: "grain" },
      plastic:  { color: 0x232427, metalness: 0, roughness: 0.6, tex: "grain" },
      gloss:    { color: 0x0d0e10, metalness: 0, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.04, tex: "peel" },
      rubber:   { color: 0x2c2c2e, metalness: 0, roughness: 0.85, tex: "rubber" },
      glass:    { color: 0x101318, metalness: 0.2, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, tex: "smudge" },
      clearGlass:{ color: 0x0b0d10, metalness: 0, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02, opacity: 0.22, tex: "smudge" },
      battery:  { color: 0x30343b, metalness: 0.3, roughness: 0.55, tex: "foil" },
      beige:    { color: 0xd9d0b6, metalness: 0, roughness: 0.62, tex: "grain" },
      keycap:   { color: 0xc9bfa3, metalness: 0, roughness: 0.55, tex: "grain" },
      paint:    { color: 0xe9eaeb, metalness: 0.1, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.15, tex: "peel" },
      greyPaint:{ color: 0x8e9196, metalness: 0.2, roughness: 0.5, tex: "grain" },
      composite:{ color: 0x2f3134, metalness: 0.2, roughness: 0.6, tex: "carbon" },
      other:    { color: 0xa0a5ab, metalness: 0.5, roughness: 0.45, tex: "grain" },
    };
    // first match wins
    const RULES = [
      [/Construction Lines|Floorplan/, null],
      // Macintosh
      [/Front Bezel|Rear Case|Keyboard Top Case|Keyboard Base|Mouse Shell|Mouse Button|Mouse Base/, "beige"],
      [/Keycaps/, "keycap"], [/CRT Tube/, "glass"], [/Deflection Yoke/, "copper"], [/Mouse Ball/, "rubber"],
      [/Floppy Drive|Drive Mechanism|Chassis Frame|I\/O Connectors/, "steel"],
      [/Flyback|Speaker|Power Components|Mouse Encoders/, "plastic"],
      [/Analog Board|Logic Board|Neck Board|Key Switches/, "pcb"],
      // Spectre
      [/A-Cover|Top Case|Bottom Cover|Hinge|Screw Bosses/, "darkAlu"],
      [/Cover Glass|Touchpad Glass/, "clearGlass"], [/OLED Panel/, "glass"],
      [/^Keyboard$|Woofers|Fan Housings|Fan Impellers|IR Camera/, "plastic"],
      [/Fin Stacks|Heat Pipes/, "copper"], [/Battery/, "battery"], [/Mainboard/, "pcb"],
      [/Processor|Memory|RAM|ROM|68000|IWM|SSD|Haptic|Board Components/, "chip"],
      // CPU
      [/IHS Logo|IHS Data Matrix/, "steel"], [/IHS/, "nickel"], [/Substrate/, "pcb"], [/CCD|I\/O Die/, "silicon"],
      [/LGA Contacts|Pin1/, "gold"], [/Decoupling/, "ceramic"], [/Socket Frame/, "steel"], [/Socket Floor|Sealant/, "plastic"],
      // Turbofan
      [/Nacelle|Spinner Spiral/, "paint"], [/Core Cowl/, "greyPaint"], [/Fan Case Liner/, "composite"],
      [/Fan Blades|Fan Disk|Spinner|Booster|HPC/, "titanium"], [/Combustor|HPT|Fuel Nozzles/, "hot"],
      [/LPT|Turbine Rear Frame|Exhaust Plug/, "inconel"], [/Shaft/, "steel"], [/Outlet Guide Vanes|Fan Frame Struts/, "alu"],
    ];
    const OWN = (M.materials || []).map(([re, k]) => [re instanceof RegExp ? re : new RegExp(re), k]);
    const pick = name => {
      for (const [re, k] of OWN) if (re.test(name)) return k;
      for (const [re, k] of RULES) if (re.test(name)) return k;
      return "other";
    };
    // a material entry is a preset name, or a preset name with overrides: ["plastic", { color: 0xbdbcb6 }], or a full spec
    const spec = k => Array.isArray(k) ? Object.assign({}, P[k[0]], k[1]) : typeof k === "string" ? P[k] : k;

    // creased normals: smooth across shallow facets (rounded corners, tubes), sharp across real edges.
    // Each triangle also gets texture coordinates projected along its main axis (1 unit = 40 mm).
    function shade(geo) {
      const pos = geo.attributes.position.array, idx = geo.index.array, n = idx.length / 3;
      const fn = new Float32Array(n * 3), fu = new Float32Array(n * 3);
      const nv = pos.length / 3, cnt = new Uint32Array(nv + 1);
      for (let f = 0; f < n; f++) {
        const a = idx[3 * f] * 3, b = idx[3 * f + 1] * 3, c = idx[3 * f + 2] * 3;
        const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
        const wx = pos[c] - pos[a], wy = pos[c + 1] - pos[a + 1], wz = pos[c + 2] - pos[a + 2];
        const x = uy * wz - uz * wy, y = uz * wx - ux * wz, z = ux * wy - uy * wx, l = Math.hypot(x, y, z) || 1;
        fn[3 * f] = x; fn[3 * f + 1] = y; fn[3 * f + 2] = z;
        fu[3 * f] = x / l; fu[3 * f + 1] = y / l; fu[3 * f + 2] = z / l;
        for (let k = 0; k < 3; k++) cnt[idx[3 * f + k] + 1]++;
      }
      for (let i = 0; i < nv; i++) cnt[i + 1] += cnt[i];
      const vf = new Uint32Array(n * 3), fill = cnt.slice(0, nv);
      for (let f = 0; f < n; f++) for (let k = 0; k < 3; k++) vf[fill[idx[3 * f + k]]++] = f;
      const cos = Math.cos(THREE.MathUtils.degToRad(32));
      const op = new Float32Array(n * 9), on = new Float32Array(n * 9), uv = new Float32Array(n * 6);
      const S = 1 / 40;
      for (let f = 0; f < n; f++) {
        const ax = Math.abs(fu[3 * f]), ay = Math.abs(fu[3 * f + 1]), az = Math.abs(fu[3 * f + 2]);
        const axis = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2;
        for (let k = 0; k < 3; k++) {
          const v = idx[3 * f + k], o = 9 * f + 3 * k;
          op[o] = pos[v * 3]; op[o + 1] = pos[v * 3 + 1]; op[o + 2] = pos[v * 3 + 2];
          const t = 6 * f + 2 * k;
          if (axis === 0) { uv[t] = op[o + 2] * S; uv[t + 1] = op[o + 1] * S; }
          else if (axis === 1) { uv[t] = op[o] * S; uv[t + 1] = op[o + 2] * S; }
          else { uv[t] = op[o] * S; uv[t + 1] = op[o + 1] * S; }
          let x = 0, y = 0, z = 0;
          for (let j = cnt[v]; j < cnt[v + 1]; j++) {
            const g = vf[j];
            if (fu[3 * f] * fu[3 * g] + fu[3 * f + 1] * fu[3 * g + 1] + fu[3 * f + 2] * fu[3 * g + 2] < cos) continue;
            x += fn[3 * g]; y += fn[3 * g + 1]; z += fn[3 * g + 2];
          }
          const l = Math.hypot(x, y, z) || 1;
          on[o] = x / l; on[o + 1] = y / l; on[o + 2] = z / l;
        }
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute("position", new THREE.BufferAttribute(op, 3));
      out.setAttribute("normal", new THREE.BufferAttribute(on, 3));
      out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      out.computeBoundingSphere();
      return out;
    }

    // ---------- procedural surface textures for the photo style ----------
    // Generated once, at high resolution, when the Photo style is first used: colour where the surface has a
    // pattern (circuit boards, carbon weave), and everywhere a normal map for the surface's relief (moulded
    // plastic stipple, brushed-metal streaks, orange-peel paint, rubber, wrinkled battery foil) with a
    // roughness map so highlights break up the way real surfaces do. Tiles are sized in real millimetres.
    let rnd = 1234567;
    const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
    const seed = v => { rnd = v; };
    const TEX = {};
    const toTex = (c, color) => {
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (color) t.encoding = THREE.sRGBEncoding;
      return t;
    };
    function canvasTex(size, draw, color) {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      draw(c.getContext("2d"), size);
      return toTex(c, color);
    }
    // tileable value noise: a lattice of random values with period `cells`, smoothly interpolated
    function noise(size, cells, stretch) {
      const cx = cells, cy = Math.max(1, Math.round(cells / (stretch || 1)));
      const L = new Float32Array(cx * cy);
      for (let i = 0; i < L.length; i++) L[i] = rand();
      const out = new Float32Array(size * size), sm = t => t * t * (3 - 2 * t);
      for (let y = 0; y < size; y++) {
        const fy = y / size * cy, y0 = Math.floor(fy), ty = sm(fy - y0), y1 = (y0 + 1) % cy;
        for (let x = 0; x < size; x++) {
          const fx = x / size * cx, x0 = Math.floor(fx), tx = sm(fx - x0), x1 = (x0 + 1) % cx;
          const a = L[y0 * cx + x0], b = L[y0 * cx + x1], c = L[y1 * cx + x0], d = L[y1 * cx + x1];
          out[y * size + x] = (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
        }
      }
      return out;
    }
    // octaves of noise added together: [cells, weight] pairs
    function fbm(size, octaves, stretch) {
      const out = new Float32Array(size * size);
      octaves.forEach(([cells, w]) => { const n = noise(size, cells, stretch); for (let i = 0; i < out.length; i++) out[i] += n[i] * w; });
      return out;
    }
    // a height field to a tangent-space normal map
    function normalMap(h, size, k) {
      const c = document.createElement("canvas"); c.width = c.height = size;
      const g = c.getContext("2d"), im = g.createImageData(size, size), d = im.data;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const l = h[y * size + (x + size - 1) % size], r = h[y * size + (x + 1) % size];
        const u = h[((y + size - 1) % size) * size + x], dn = h[((y + 1) % size) * size + x];
        let nx = (l - r) * k, ny = (dn - u) * k, nz = 1;
        const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
        const i = (y * size + x) * 4;
        d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
      }
      g.putImageData(im, 0, 0);
      return toTex(c);
    }
    // a height field to a roughness map: lo..hi (0-1) scales the material's own roughness
    function greyMap(h, size, lo, hi) {
      let mn = Infinity, mx = -Infinity;
      for (let i = 0; i < h.length; i++) { if (h[i] < mn) mn = h[i]; if (h[i] > mx) mx = h[i]; }
      const c = document.createElement("canvas"); c.width = c.height = size;
      const g = c.getContext("2d"), im = g.createImageData(size, size), d = im.data;
      for (let i = 0; i < h.length; i++) { const v = (lo + (hi - lo) * (h[i] - mn) / (mx - mn || 1)) * 255; d.set([v, v, v, 255], i * 4); }
      g.putImageData(im, 0, 0);
      return toTex(c);
    }
    // one tile's size in model units, from the drawing's units (the textures are designed in millimetres)
    const UNIT_MM = (() => { const m = /Units\s+(mm|cm|m)\b/i.exec((document.querySelector(".dwg") || {}).textContent || ""); return m ? { mm: 1, cm: 10, m: 1000 }[m[1].toLowerCase()] : 1; })();
    const tile = (t, mm) => { const r = 40 * UNIT_MM / mm; [t.map, t.normalMap, t.roughnessMap].forEach(x => x && x.repeat.set(r, r)); return t; };
    function textures(kind) {
      if (TEX[kind]) return TEX[kind];
      seed(1234567 + kind.length * 7919);
      let t = {};
      const S = 1024;
      if (kind === "grain") {
        // moulded plastic: a fine, even stipple with soft larger ripples under it
        const h = fbm(S, [[256, 1], [128, 0.5], [32, 0.15]]);
        t = tile({ normalMap: normalMap(h, S, 1.6), normalScale: 0.5, roughnessMap: greyMap(h, S, 0.82, 1) }, 18);
      } else if (kind === "rubber") {
        const h = fbm(S, [[160, 1], [80, 0.6], [20, 0.25]]);
        t = tile({ normalMap: normalMap(h, S, 2.4), normalScale: 0.8, roughnessMap: greyMap(h, S, 0.85, 1) }, 22);
      } else if (kind === "brushed") {
        // brushed metal: long fine streaks one way, a slight waviness across them
        const h = fbm(S, [[512, 1], [256, 0.7], [96, 0.35], [24, 0.15]], 96);
        t = tile({ normalMap: normalMap(h, S, 2), normalScale: 0.2, roughnessMap: greyMap(h, S, 0.78, 1) }, 30);
      } else if (kind === "peel") {
        // automotive-style paint: a soft orange-peel ripple under the clear coat
        const h = fbm(S, [[48, 1], [24, 0.6], [96, 0.25]]);
        t = tile({ normalMap: normalMap(h, S, 0.9), normalScale: 0.18, roughnessMap: greyMap(h, S, 0.88, 1), clearcoatNormal: true }, 40);
      } else if (kind === "foil") {
        // a battery's printed foil wrap: broad soft wrinkles
        const h = fbm(S, [[12, 1], [24, 0.5], [64, 0.2]]);
        t = tile({ normalMap: normalMap(h, S, 1.2), normalScale: 0.45, roughnessMap: greyMap(h, S, 0.6, 1) }, 60);
      } else if (kind === "cast") {
        // sand-cast iron under paint: pitted and lumpy
        const h = fbm(S, [[200, 1], [64, 0.8], [16, 0.4]]);
        t = tile({ normalMap: normalMap(h, S, 3), normalScale: 0.6, roughnessMap: greyMap(h, S, 0.75, 1) }, 30);
      } else if (kind === "smudge") {
        // glass: faint fingerprints and wipe marks in the highlights
        const h = fbm(S, [[6, 1], [14, 0.6], [40, 0.3]]);
        t = tile({ roughnessMap: greyMap(h, S, 0.2, 1) }, 90);
      } else if (kind === "pcb") {
        // solder mask over copper traces, vias, gold pads and silkscreen, with the copper raised under the mask
        const P = 2048;
        const draw = (g, s, relief) => {
          seed(424242);
          g.fillStyle = relief ? "#404040" : "#1d5a39"; g.fillRect(0, 0, s, s);
          g.lineCap = g.lineJoin = "round";
          for (let i = 0; i < 1400; i++) {
            let x = rand() * s, y = rand() * s;
            g.strokeStyle = relief ? "#8a8a8a" : "rgba(64,138,88," + (0.55 + rand() * 0.35) + ")";
            g.lineWidth = 1.5 + rand() * 3.5;
            g.beginPath(); g.moveTo(x, y);
            for (let k = 0; k < 5; k++) {
              const len = 10 + rand() * 90, dir = Math.floor(rand() * 8), a = dir * Math.PI / 4;
              x += Math.cos(a) * len; y += Math.sin(a) * len; g.lineTo(x, y);
            }
            g.stroke();
          }
          for (let i = 0; i < 260; i++) {   // component pads in rows
            const x = rand() * s, y = rand() * s, n = 2 + Math.floor(rand() * 8), w = 3 + rand() * 5, gap = w * 2.2, v = rand() < 0.5;
            g.fillStyle = relief ? "#b0b0b0" : "#d9b45c";
            for (let k = 0; k < n; k++) g.fillRect(x + (v ? 0 : k * gap), y + (v ? k * gap : 0), v ? w * 2 : w, v ? w : w * 2);
          }
          for (let i = 0; i < 2200; i++) {   // vias
            const x = rand() * s, y = rand() * s, r = 1.6 + rand() * 2.4;
            g.fillStyle = relief ? "#a0a0a0" : "#c9a64f"; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
            g.fillStyle = relief ? "#202020" : "#0d2a1b"; g.beginPath(); g.arc(x, y, r * 0.45, 0, Math.PI * 2); g.fill();
          }
          if (!relief) {
            g.fillStyle = "#ece8da"; g.font = "600 13px monospace";
            for (let i = 0; i < 320; i++) g.fillText(["R", "C", "U", "Q", "L", "D", "J"][Math.floor(rand() * 7)] + Math.floor(rand() * 900), rand() * s, rand() * s);
            g.strokeStyle = "#ece8da"; g.lineWidth = 1.4;
            for (let i = 0; i < 120; i++) { const w = 20 + rand() * 80, hh = 12 + rand() * 50; g.strokeRect(rand() * s, rand() * s, w, hh); }
          }
        };
        const col = canvasTex(P, (g, s) => draw(g, s, false), true);
        const hc = document.createElement("canvas"); hc.width = hc.height = P;
        draw(hc.getContext("2d"), P, true);
        const hd = hc.getContext("2d").getImageData(0, 0, P, P).data, h = new Float32Array(P * P);
        for (let i = 0; i < h.length; i++) h[i] = hd[i * 4] / 255;
        t = tile({ map: col, colorOnly: true, normalMap: normalMap(h, P, 1.4), normalScale: 0.5, roughnessMap: greyMap(h.map(v => 1 - v), P, 0.45, 1) }, 80);
      } else if (kind === "carbon") {
        // twill weave: the colour and the bundles' relief
        const q = 64;
        const col = canvasTex(512, (g, s) => {
          for (let y = 0; y < s / q * 2; y++) for (let x = 0; x < s / q; x++) {
            const sx = x * q, sy = y * q / 2, horiz = (x + y) % 4 < 2;
            const grd = horiz ? g.createLinearGradient(0, sy, 0, sy + q / 2) : g.createLinearGradient(sx, 0, sx + q, 0);
            grd.addColorStop(0, "#1e2023"); grd.addColorStop(0.5, "#50545a"); grd.addColorStop(1, "#1e2023");
            g.fillStyle = grd; g.fillRect(sx, sy, q, q / 2);
          }
        }, true);
        const h = new Float32Array(512 * 512);
        for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
          const cx = Math.floor(x / q), cy = Math.floor(y / (q / 2)), horiz = (cx + cy) % 4 < 2;
          const u = horiz ? (y % (q / 2)) / (q / 2) : (x % q) / q;
          h[y * 512 + x] = Math.sin(u * Math.PI);
        }
        t = tile({ map: col, colorOnly: true, normalMap: normalMap(h, 512, 1.5), normalScale: 0.6 }, 16);
      }
      return (TEX[kind] = t);
    }

    let built = false, photoBuilt = false, style = "blueprint", env = null, photoEnv = null;
    const reals = [], photos = [], lights = [], photoLights = [];
    let fills = null;
    const fillMeshes = () => fills || (fills = (() => {
      const f = [];
      scene.traverse(o => { if (o.isMesh && o.material === fillMat && o.geometry.index && o.geometry.index.count) f.push(o); });
      return f;
    })());
    const geoCache = new Map();
    const shaded = m => geoCache.get(m) || (geoCache.set(m, shade(m.geometry)), geoCache.get(m));
    if (!camera.parent) scene.add(camera);

    function studio(panels, wall) {
      const room = new THREE.Scene();
      room.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: wall, side: THREE.BackSide })));
      panels.forEach(([x, y, z, w, h, s, tint]) => {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: tint || 0xffffff }));
        p.material.color.multiplyScalar(s);
        p.position.set(x, y, z); p.lookAt(0, 0, 0);
        room.add(p);
      });
      const pm = new THREE.PMREMGenerator(renderer);
      const tex = pm.fromScene(room, 0.04).texture;
      pm.dispose();
      return tex;
    }

    function build() {
      built = true;
      fillMeshes().forEach(m => {
        const k = pick(m.name || "");
        if (!k) return;
        const sp = spec(k);
        const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, envMapIntensity: 1, color: sp.color, metalness: sp.metalness, roughness: sp.roughness });
        mat.color.convertSRGBToLinear();          // palette is written in sRGB
        mat.userData.base = mat.color.clone();
        const r = new THREE.Mesh(shaded(m), mat);
        r.visible = false; r.raycast = () => {};
        m.add(r);
        reals.push({ r, mat, entry: byName[m.name] });
      });
      // soft studio: a dim room with a few bright panels, prefiltered for reflections
      env = studio([[0, 4.9, 0, 6, 6, 3.2], [-4.9, 1.5, 1, 3, 4, 1.6], [4.9, 2, -1, 3, 5, 2.2], [0, 1, 4.9, 6, 2, 0.8]], 0x3a3c40);
      // lights ride with the camera, so the model is lit the same way from any angle
      const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(0.6, 0.9, 0.4);
      const fill = new THREE.DirectionalLight(0xdfe8ff, 0.45); fill.position.set(-0.8, 0.2, 0.5);
      const rim = new THREE.DirectionalLight(0xffffff, 0.6); rim.position.set(0, 0.5, -1);
      const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 0.35);
      [key, fill, rim].forEach(l => { camera.add(l); camera.add(l.target); l.target.position.set(0, 0, -1); });
      scene.add(hemi);
      lights.push(key, fill, rim, hemi);
      lights.forEach(l => { l.visible = false; });
    }

    // ---------- photo: physical materials, textures, soft shadows on an invisible floor ----------
    let floor = null, sun = null, contact = null, backdrop = null, rim = null, kick = null, hemi = null, lookKey = "";
    // the backdrop follows the page's theme: each swatch (and its inverted side) has its own set
    const LOOKS = {
      dark: ["#4a4c52", "#121315", true], "dark:inv": ["#ffffff", "#d9dade"],
      light: ["#ffffff", "#e3ddd5"], "light:inv": ["#4a4c52", "#121315", true],
      amber: ["#ffe3cb", "#f29a5e"], "amber:inv": ["#5a3a1c", "#160d06", true],
      navy: ["#3d6ea8", "#0a1f3c", true], "navy:inv": ["#f4f8fd", "#c4d5ea"],
      lime: ["#effcc6", "#a8d64a"], "lime:inv": ["#2f7346", "#0a2414", true],
    };
    function currentLook() {
      const t = root.getAttribute("data-theme") || "dark", bgInline = root.style.getPropertyValue("--bg").trim().toLowerCase();
      const inv = THEMES[t] && bgInline && bgInline !== THEMES[t][0].toLowerCase();
      return (t + (inv ? ":inv" : "")) in LOOKS ? t + (inv ? ":inv" : "") : "amber";
    }
    // the set for the current theme: backdrop, the studio reflected in the model, the coloured lights, the page's ink
    function look() {
      const k = currentLook();
      if (k === lookKey) return;
      lookKey = k;
      const [l, d, dark] = LOOKS[k], light = new THREE.Color(l), deep = new THREE.Color(d);
      if (photoEnv) photoEnv.dispose();
      photoEnv = studio([
        [0, 4.9, 0, 7, 7, 3.2], [-4.9, 2.2, 1.2, 2.2, 7, 2.4], [4.9, 2.2, -0.8, 2.2, 7, 1.8],
        [0, -4.9, 0, 9, 9, dark ? 0.35 : 0.55, light.getHex()], [1.5, 1.5, 4.9, 4, 3, 0.9, light.getHex()], [-2, 1, -4.9, 8, 6, 0.9, deep.getHex()],
      ], deep.clone().multiplyScalar(0.45).getHex());
      if (backdrop) backdrop.dispose();
      backdrop = backdropTexture([light, deep]);
      rim.color.copy(dark ? light.clone().lerp(new THREE.Color(0xffffff), 0.5) : deep.clone().lerp(new THREE.Color(0xffffff), 0.25));
      kick.color.copy(light);
      hemi.color.copy(light); hemi.groundColor.copy(deep);
      root.classList.toggle("bp-photo-dark", !!dark);
      if (style === "photo") { scene.environment = photoEnv; scene.background = backdrop; }
    }
    // a theme change while in the Photo style re-dresses the set
    const recolorBase = window.__bpRecolor;
    window.__bpRecolor = () => { recolorBase(); if (photoBuilt) look(); };
    // the seamless paper: lighter round the model and towards the light, deepening to the corners
    function backdropTexture([light, deep]) {
      const c = document.createElement("canvas"); c.width = c.height = 1024;
      const g = c.getContext("2d"), css = col => "#" + col.getHexString();
      g.fillStyle = css(deep); g.fillRect(0, 0, 1024, 1024);
      let gr = g.createRadialGradient(560, 430, 40, 512, 512, 760);
      gr.addColorStop(0, css(light)); gr.addColorStop(0.5, css(light.clone().lerp(deep, 0.4))); gr.addColorStop(1, css(deep));
      g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
      gr = g.createRadialGradient(880, 120, 0, 880, 120, 520);   // the glow of the key light on the paper
      gr.addColorStop(0, "rgba(255,248,240,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
      // a touch of grain, so the gradient doesn't band
      const im = g.getImageData(0, 0, 1024, 1024), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 5; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      g.putImageData(im, 0, 0);
      const t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding;
      return t;
    }
    // dark text and panels for the page while the backdrop is up
    const photoCss = document.createElement("style");
    photoCss.textContent = "html.bp-photo{--bg:#fff3e8!important;--fg:#22180f!important;--fg-2:rgba(34,24,15,.7)!important;--fg-3:rgba(34,24,15,.48)!important;" +
      "--rule:rgba(34,24,15,.2)!important;--panel:rgba(255,244,234,.72)!important;--grid:transparent!important;color-scheme:light}" +
      "html.bp-photo.bp-photo-dark{--bg:#141414!important;--fg:#f6f3ef!important;--fg-2:rgba(246,243,239,.7)!important;--fg-3:rgba(246,243,239,.46)!important;" +
      "--rule:rgba(246,243,239,.2)!important;--panel:rgba(20,20,20,.62)!important;color-scheme:dark}" +
      "html.bp-photo .sheet{opacity:0}";
    document.head.appendChild(photoCss);
    function buildPhoto() {
      photoBuilt = true;
      fillMeshes().forEach(m => {
        const k = pick(m.name || "");
        if (!k) return;
        const sp = spec(k);
        const tx = sp.tex ? textures(sp.tex) : {};
        const o = { side: THREE.DoubleSide, color: sp.color, metalness: sp.metalness, roughness: sp.roughness,
          clearcoat: sp.clearcoat || 0, clearcoatRoughness: sp.clearcoatRoughness !== undefined ? sp.clearcoatRoughness : 0.1,
          envMapIntensity: sp.env !== undefined ? sp.env : 0.9 };
        if (tx.map) o.map = tx.map;
        if (tx.normalMap) {
          const k = tx.normalScale * (sp.bump !== undefined ? sp.bump : 1);
          o.normalMap = tx.normalMap; o.normalScale = new THREE.Vector2(k, -k);
          if (tx.clearcoatNormal && o.clearcoat) { o.clearcoatNormalMap = tx.normalMap; o.clearcoatNormalScale = new THREE.Vector2(k * 0.6, -k * 0.6); }
        }
        if (tx.roughnessMap) o.roughnessMap = tx.roughnessMap;
        if (sp.emissive) { o.emissive = sp.emissive; o.emissiveIntensity = sp.emissiveIntensity || 1; }
        if (sp.opacity !== undefined) { o.transparent = true; o.opacity = sp.opacity; o.depthWrite = sp.opacity > 0.6; }
        const mat = new THREE.MeshPhysicalMaterial(o);
        mat.color.convertSRGBToLinear();
        if (sp.emissive) { mat.emissive.convertSRGBToLinear(); mat.userData.glow = true; }
        // a coloured texture carries the colour, the material colour tints it
        if (tx.colorOnly) mat.color.setScalar(1);
        mat.userData.base = mat.color.clone();
        const r = new THREE.Mesh(shaded(m), mat);
        r.visible = false; r.raycast = () => {};
        r.castShadow = r.receiveShadow = true;
        m.add(r);
        photos.push({ r, mat, entry: byName[m.name] });
      });

      // the sun casts the shadows; it turns with the model so they stay put under it
      sun = new THREE.DirectionalLight(0xfff3e6, 1.7);
      const R = rE * 1.25, c = cA.clone().add(cE).multiplyScalar(0.5);
      sun.position.set(c.x - R * 0.35, c.y + R * 2.2, c.z + R * 0.55);
      sun.target.position.copy(c);
      sun.castShadow = true;
      sun.shadow.mapSize.set(4096, 4096);
      Object.assign(sun.shadow.camera, { left: -R * 1.4, right: R * 1.4, top: R * 1.4, bottom: -R * 1.4, near: R * 0.2, far: R * 5 });
      sun.shadow.camera.updateProjectionMatrix();
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = rE * 0.0015;
      sun.shadow.radius = 5;
      model.add(sun, sun.target);
      // a soft key from the viewer's side, a rim in the backdrop's colour from behind and a kicker from the
      // other side, so edges catch a warm glow and dark parts keep their shape
      const key = new THREE.DirectionalLight(0xffffff, 0.75); key.position.set(0.5, 0.6, 0.8);
      rim = new THREE.DirectionalLight(0xffffff, 1.4); rim.position.set(0.7, 0.4, -1);
      kick = new THREE.DirectionalLight(0xffffff, 0.5); kick.position.set(-0.9, 0.1, -0.3);
      [key, rim, kick].forEach(l => { camera.add(l); camera.add(l.target); l.target.position.set(0, 0, -1); });
      hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.35);
      scene.add(hemi);
      floor = new THREE.Mesh(new THREE.PlaneGeometry(rE * 12, rE * 12), new THREE.ShadowMaterial({ opacity: 0.16 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      floor.raycast = () => {};
      model.add(floor);
      // and a broad, soft contact shadow under the model, like a product resting on paper
      const blob = document.createElement("canvas"); blob.width = blob.height = 256;
      const bg = blob.getContext("2d"), gr = bg.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, "rgba(60,30,10,0.42)"); gr.addColorStop(0.45, "rgba(60,30,10,0.2)"); gr.addColorStop(1, "rgba(60,30,10,0)");
      bg.fillStyle = gr; bg.fillRect(0, 0, 256, 256);
      contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blob), transparent: true, depthWrite: false, toneMapped: false }));
      contact.rotation.x = -Math.PI / 2;
      contact.raycast = () => {};
      contact.renderOrder = -1;
      model.add(contact);
      photoLights.push(sun, key, rim, kick, hemi, floor, contact);
      photoLights.forEach(l => { l.visible = false; });
      look();
    }

    function apply() {
      const real = style !== "blueprint", photo = style === "photo";
      if (style === "realistic" && !built) build();
      if (photo && !photoBuilt) buildPhoto();
      fillMat.visible = !real;
      scene.traverse(o => { if ((o.isLineSegments || o.isLine) && !(o.material && o.material.isShaderMaterial)) o.visible = !real; });
      reals.forEach(x => { x.r.visible = style === "realistic"; });
      photos.forEach(x => { x.r.visible = photo; });
      lights.forEach(l => { l.visible = style === "realistic"; });
      photoLights.forEach(l => { l.visible = photo; });
      scene.environment = photo ? photoEnv : real ? env : null;
      scene.background = photo ? backdrop : null;
      document.documentElement.classList.toggle("bp-photo", photo);
      // the page's colours change with the photo set's ink: refresh the fills and lines that read them
      if (window.__bpRecolor) window.__bpRecolor();
      renderer.shadowMap.enabled = photo;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // filmic tone mapping and sRGB output for the shaded parts; the page's own flat materials
      // (screen animations, key legends, signal paths) keep their colours
      renderer.outputEncoding = real ? THREE.sRGBEncoding : THREE.LinearEncoding;
      renderer.toneMapping = real ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
      renderer.toneMappingExposure = photo ? 0.95 : 1;
      scene.traverse(o => {
        if (!o.material) return;
        if (!o.material.isMeshStandardMaterial) o.material.toneMapped = false;
        o.material.needsUpdate = true;
      });
    }
    window.__bpSetStyle = s => { style = ["realistic", "photo"].includes(s) ? s : "blueprint"; apply(); };
    window.__bpGetStyle = () => style;
    // hover and "how it works" highlighting: lit parts glow a little, the rest fade back
    const render = renderer.render.bind(renderer);
    renderer.render = (s, c) => {
      const set = style === "photo" ? photos : style === "realistic" ? reals : null;
      if (set) set.forEach(({ mat, entry }) => {
        const k = entry && entry.mats[0] ? entry.mats[0].userData.k : 1;
        const fade = k < 0.95 ? Math.max(0.12, (k - 0.25) / 0.75) : 1;
        const own = mat.userData.opacity !== undefined ? mat.userData.opacity : (mat.userData.opacity = mat.opacity);
        mat.transparent = fade < 0.99 || own < 1; mat.opacity = own * fade; mat.depthWrite = fade > 0.6 && own > 0.6;
        if (!mat.userData.glow) mat.emissive.copy(mat.userData.base).multiplyScalar(Math.max(0, k - 1.05) * 0.45);
      });
      if (style === "photo" && floor) {
        // the floor sits just under the lowest part as the model opens and closes
        const e = explode * explode * (3 - 2 * explode);
        floor.position.y = boxA.min.y + (boxE.min.y - boxA.min.y) * e - rE * 0.01;
        floor.position.x = (cA.x + cE.x) / 2; floor.position.z = (cA.z + cE.z) / 2;
        // the contact shadow spreads with the model's footprint
        const sx = (boxA.max.x - boxA.min.x) + ((boxE.max.x - boxE.min.x) - (boxA.max.x - boxA.min.x)) * e;
        const sz = (boxA.max.z - boxA.min.z) + ((boxE.max.z - boxE.min.z) - (boxA.max.z - boxA.min.z)) * e;
        contact.position.copy(floor.position); contact.position.y += rE * 0.002;
        contact.scale.set(sx * 1.35, sz * 1.35, 1);
      }
      render(s, c);
    };
  })();

