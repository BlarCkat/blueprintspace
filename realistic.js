  // ---------- shaded and photo render styles (added by blueprints/build_gallery.py) ----------
  // window.__bpSetStyle("blueprint" | "realistic" | "photo"). "realistic" (Shaded) swaps the line drawing for
  // flat-coloured shaded parts in a soft studio. "photo" goes further: physical materials with surface texture
  // (plastic grain, brushed metal, circuit boards, clear-coated gloss), lit like a product photoshoot: a warm
  // seamless backdrop (M.backdrop: [light, deep] colours, peach by default), a big soft key, a coloured rim
  // light and a soft shadow on the backdrop's floor; the page's text turns dark to sit on it. Materials come from the model's own list (M.materials) first, then from
  // each part's name.
  (function () {
    const P = {
      alu:      { color: 0xc4c8ce, metalness: 1, roughness: 0.32, tex: "brushed" },
      darkAlu:  { color: 0x4a505c, metalness: 1, roughness: 0.38, tex: "brushed" },
      steel:    { color: 0x9da2a8, metalness: 1, roughness: 0.3, tex: "brushed" },
      nickel:   { color: 0xc9cbce, metalness: 1, roughness: 0.22, tex: "brushed" },
      titanium: { color: 0xa7a59c, metalness: 1, roughness: 0.34, tex: "brushed" },
      hot:      { color: 0x7d6655, metalness: 0.9, roughness: 0.45, tex: "grain" },
      inconel:  { color: 0x8b8680, metalness: 1, roughness: 0.4, tex: "grain" },
      copper:   { color: 0xc27a45, metalness: 1, roughness: 0.3, tex: "brushed" },
      gold:     { color: 0xe0b44a, metalness: 1, roughness: 0.25 },
      pcb:      { color: 0x1d5a3a, metalness: 0.1, roughness: 0.55, tex: "pcb", clearcoat: 0.4 },
      chip:     { color: 0x1c1c1f, metalness: 0.2, roughness: 0.4, tex: "grain" },
      silicon:  { color: 0x3b4466, metalness: 0.7, roughness: 0.18 },
      ceramic:  { color: 0x9b7a4c, metalness: 0, roughness: 0.5, tex: "grain" },
      plastic:  { color: 0x232427, metalness: 0, roughness: 0.6, tex: "grain" },
      gloss:    { color: 0x0d0e10, metalness: 0, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.04 },
      rubber:   { color: 0x2c2c2e, metalness: 0, roughness: 0.85, tex: "grain" },
      glass:    { color: 0x101318, metalness: 0.2, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02 },
      clearGlass:{ color: 0x0b0d10, metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, opacity: 0.22 },
      battery:  { color: 0x30343b, metalness: 0.3, roughness: 0.55, tex: "grain" },
      beige:    { color: 0xd9d0b6, metalness: 0, roughness: 0.62, tex: "grain" },
      keycap:   { color: 0xc9bfa3, metalness: 0, roughness: 0.55, tex: "grain" },
      paint:    { color: 0xe9eaeb, metalness: 0.1, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.15 },
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
    function canvasTex(size, draw, color) {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      draw(c.getContext("2d"), size);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (color) t.encoding = THREE.sRGBEncoding;
      return t;
    }
    let rnd = 1234567;
    const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
    const TEX = {};
    function textures(kind) {
      if (TEX[kind]) return TEX[kind];
      let t = {};
      if (kind === "grain") {
        // fine moulded-plastic stipple: bump and a little roughness variation
        const n = canvasTex(256, (g, s) => {
          const d = g.createImageData(s, s);
          for (let i = 0; i < s * s; i++) { const v = 118 + rand() * 20; d.data.set([v, v, v, 255], i * 4); }
          g.putImageData(d, 0, 0);
        });
        n.repeat.set(10, 10);
        t = { bumpMap: n, bumpScale: 0.004, roughnessMap: n };
      } else if (kind === "brushed") {
        // brushed metal: long fine streaks one way
        const b = canvasTex(512, (g, s) => {
          g.fillStyle = "#7a7a7a"; g.fillRect(0, 0, s, s);
          for (let i = 0; i < 2600; i++) {
            const y = rand() * s, v = Math.round(90 + rand() * 80);
            g.strokeStyle = "rgba(" + v + "," + v + "," + v + "," + (0.15 + rand() * 0.25) + ")";
            g.lineWidth = 0.5 + rand();
            g.beginPath(); g.moveTo(0, y); g.lineTo(s, y + (rand() - 0.5) * 2); g.stroke();
          }
        });
        b.repeat.set(3, 3);
        t = { bumpMap: b, bumpScale: 0.002, roughnessMap: b };
      } else if (kind === "pcb") {
        // solder mask over copper traces, vias and gold pads
        const c = canvasTex(1024, (g, s) => {
          g.fillStyle = "#1f5c3b"; g.fillRect(0, 0, s, s);
          g.lineCap = "round";
          for (let i = 0; i < 420; i++) {
            let x = rand() * s, y = rand() * s;
            g.strokeStyle = "rgba(70,140,90," + (0.5 + rand() * 0.4) + ")";
            g.lineWidth = 1.5 + rand() * 3;
            g.beginPath(); g.moveTo(x, y);
            for (let k = 0; k < 4; k++) {
              const len = 20 + rand() * 120, dir = Math.floor(rand() * 4);
              x += dir === 0 ? len : dir === 1 ? -len : (dir === 2 ? len : -len) * 0.7;
              y += dir < 2 ? (rand() < 0.5 ? len * 0.7 : 0) : len * (dir === 2 ? 1 : -1) * 0.5;
              g.lineTo(x, y);
            }
            g.stroke();
          }
          for (let i = 0; i < 900; i++) {
            const x = rand() * s, y = rand() * s;
            g.fillStyle = rand() < 0.3 ? "#d8b55a" : "#6a8f70";
            g.beginPath(); g.arc(x, y, 1.5 + rand() * 2.5, 0, Math.PI * 2); g.fill();
          }
          for (let i = 0; i < 160; i++) {
            g.fillStyle = "#e7e3d4";
            g.font = "10px monospace";
            g.fillText(["R", "C", "U", "Q", "L"][Math.floor(rand() * 5)] + Math.floor(rand() * 400), rand() * s, rand() * s);
          }
        }, true);
        c.repeat.set(1.5, 1.5);
        t = { map: c, colorOnly: true };
      } else if (kind === "carbon") {
        const c = canvasTex(256, (g, s) => {
          const q = s / 8;
          for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
            const grd = (x + y) % 2 ? g.createLinearGradient(x * q, 0, x * q + q, 0) : g.createLinearGradient(0, y * q, 0, y * q + q);
            grd.addColorStop(0, "#2a2c2f"); grd.addColorStop(0.5, "#4a4d52"); grd.addColorStop(1, "#2a2c2f");
            g.fillStyle = grd; g.fillRect(x * q, y * q, q, q);
          }
        }, true);
        c.repeat.set(6, 6);
        t = { map: c, colorOnly: true };
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
    let floor = null, sun = null, contact = null, backdrop = null;
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
        if (tx.bumpMap) { o.bumpMap = tx.bumpMap; o.bumpScale = tx.bumpScale * (sp.bump !== undefined ? sp.bump : 1); }
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
      // a product studio inside the backdrop's colour: a big overhead softbox, two strip lights, the warm
      // backdrop bouncing light back from below and behind, so glossy parts reflect the set they sit in
      const BD = (M.backdrop || ["#ffe3cb", "#f29a5e"]).map(c => new THREE.Color(c));
      const deep = BD[1].getHex(), light = BD[0].getHex();
      photoEnv = studio([
        [0, 4.9, 0, 7, 7, 3.2], [-4.9, 2.2, 1.2, 2.2, 7, 2.4], [4.9, 2.2, -0.8, 2.2, 7, 1.8],
        [0, -4.9, 0, 9, 9, 0.55, light], [1.5, 1.5, 4.9, 4, 3, 0.9, light], [-2, 1, -4.9, 8, 6, 0.9, deep],
      ], new THREE.Color(deep).multiplyScalar(0.45).getHex());
      backdrop = backdropTexture(BD);
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
      const rim = new THREE.DirectionalLight(new THREE.Color(deep).lerp(new THREE.Color(0xffffff), 0.25), 1.4); rim.position.set(0.7, 0.4, -1);
      const kick = new THREE.DirectionalLight(new THREE.Color(light), 0.5); kick.position.set(-0.9, 0.1, -0.3);
      [key, rim, kick].forEach(l => { camera.add(l); camera.add(l.target); l.target.position.set(0, 0, -1); });
      const hemi = new THREE.HemisphereLight(light, deep, 0.35);
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

