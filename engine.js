
// Blueprint model engine, shared by every model page (build_pages.py inlines it after the model's script).
// The model script sets window.BLUEPRINT_MODEL: its geometry, how the parts group into modules that slide
// apart, hotspots, part notes and, optionally, a screen animation and a "how it works" mode. Everything
// else is the same on every page:
//   hover to take the model apart, double-click (or Space) to lock it open or closed,
//   click a part to zoom in on it, drag a part to move it, right-drag (or Shift + arrows) to rotate,
//   ← → to step through the parts, R to put everything back, Esc to zoom out, "." for how it works,
//   "/" for the screen on models that have one. Clicking the active theme swatch again inverts the theme.
(function () {
  "use strict";
  const M = window.BLUEPRINT_MODEL;
  const G = M.geometry;
  // reduced motion: the system setting, or an embed asked to keep still (motion=0)
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches || /^#embed\b.*[&]motion=(0|false)\b/.test(location.hash) || !!(window.BLUEPRINT_EMBED && /^(0|false)$/.test(String(window.BLUEPRINT_EMBED.motion)));
  const touchMode = matchMedia("(hover: none)").matches;
  const root = document.documentElement;

  // ---------- theme ----------
  // each theme is a background / line colour pair; inverted swaps the two
  const THEMES = {
    dark: ["#141414", "#ffffff"], light: ["#f3f3f1", "#141414"], amber: ["#ffdf77", "#141414"],
    navy: ["#0d2c51", "#ffffff"], lime: ["#c8f25c", "#123d22"],
  };
  const swatches = Array.from(document.querySelectorAll(".swatch"));
  const rgba = (hex, a) => "rgba(" + [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(", ") + ", " + a + ")";
  let theme = "dark", inverted = false;
  function applyTheme(t, inv) {
    theme = THEMES[t] ? t : "dark"; inverted = !!inv;
    let [bg, fg] = THEMES[theme];
    if (inverted) [bg, fg] = [fg, bg];
    const lum = [1, 3, 5].map(i => parseInt(bg.slice(i, i + 2), 16)).reduce((s, v, i) => s + v * [0.3, 0.59, 0.11][i], 0);
    const light = lum > 140;
    const s = root.style;
    s.setProperty("--bg", bg); s.setProperty("--fg", fg);
    s.setProperty("--fg-2", rgba(fg, 0.64)); s.setProperty("--fg-3", rgba(fg, 0.4));
    s.setProperty("--rule", rgba(fg, light ? 0.18 : 0.16)); s.setProperty("--grid", rgba(fg, light ? 0.055 : 0.04));
    s.setProperty("--panel", rgba(bg, 0.8));
    s.colorScheme = light ? "light" : "dark";
    root.setAttribute("data-theme", theme);
    swatches.forEach(b => {
      const on = b.dataset.t === theme;
      b.setAttribute("aria-pressed", String(on));
      b.classList.toggle("inv", on && inverted);
    });
    if (!root.classList.contains("bp-embed")) try { localStorage.setItem(M.themeKey, theme + (inverted ? ":inv" : "")); } catch (e) {}   // an embed doesn't save its theme
    if (window.__bpRecolor) window.__bpRecolor();
  }
  let saved = "";
  try { saved = localStorage.getItem(M.themeKey) || ""; } catch (e) {}
  applyTheme(saved.split(":")[0], saved.split(":")[1] === "inv");
  // a new swatch switches theme; the active one again flips its background and lines
  swatches.forEach(b => b.addEventListener("click", () => applyTheme(b.dataset.t, b.dataset.t === theme ? !inverted : false)));

  // ---------- embedded on another site (the blueprintspace package's <blueprint-model>) ----------
  // The page is opened in an iframe at  model.html#embed&theme=amber:inv&render=photo&transparent=1&xray=0&animation=1...
  // (or with window.BLUEPRINT_EMBED set to the same options). It hides its own chrome, takes the options it's given
  // without saving them, and answers postMessage commands from the host page:
  //   { type: "blueprint", action: "set", key, value }   key: theme, render, transparent, controls, labels, xray,
  //                                                      exploded, animation, autorotate, interactive
  //   { type: "blueprint", action: "explode" | "animate" | "tour" | "reset" }   (toggles and one-offs)
  // and tells the host when it's ready: { type: "blueprint", event: "ready", title, state }.
  const EMBED = (() => {
    if (/^#embed\b/.test(location.hash)) return Object.fromEntries(new URLSearchParams(location.hash.slice(1).replace(/^embed&?/, "")));
    return window.BLUEPRINT_EMBED || null;
  })();
  if (EMBED) {
    root.classList.add("bp-embed");
    const css = document.createElement("style");
    css.textContent = ".bp-embed:not(.bp-controls) .page, .bp-embed:not(.bp-controls) .hint, .bp-embed:not(.bp-controls) .dwg," +
      ".bp-embed:not(.bp-controls) .viewbar, .bp-embed:not(.bp-controls) .panpad, .bp-embed:not(.bp-controls) .exportbar { display: none !important; }" +
      ".bp-embed:not(.bp-labels) #hotspots { display: none !important; }" +
      ".bp-embed .sheet { display: none; }" +
      "html.bp-transparent, .bp-transparent body { background: transparent !important; }" +
      ".bp-still #scene { pointer-events: none; }";
    document.head.appendChild(css);
    const truthy = v => v === true || v === "" || v === "1" || v === "true" || v === "on";
    const RENDER = { lines: "blueprint", shaded: "realistic", photo: "photo", blueprint: "blueprint", realistic: "realistic" };
    const press = key => document.body.dispatchEvent(new KeyboardEvent("keydown", { key, code: key === " " ? "Space" : "", bubbles: true }));
    // the screen animation is a toggle on "/": keep track of it so the host can set it on or off
    let animation = false, spin = 0, still = false;
    addEventListener("keydown", e => { if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) animation = !animation; }, true);
    const state = {};
    function set(key, v) {
      if (key === "theme") { const [t, inv] = String(v || "dark").split(":"); applyTheme(t, inv === "inv"); }
      else if (key === "render") { if (window.__bpSetStyle) window.__bpSetStyle(RENDER[v] || "blueprint"); }
      else if (key === "transparent" || key === "background") root.classList.toggle("bp-transparent", key === "background" ? v === "transparent" : truthy(v));
      else if (key === "controls") root.classList.toggle("bp-controls", truthy(v));
      else if (key === "labels") { root.classList.toggle("bp-labels", truthy(v)); if (truthy(v)) setLabels(true); }
      else if (key === "xray") setXray(truthy(v));
      else if (key === "exploded") lock(v === "hover" || v === null || v === undefined ? null : truthy(v));
      else if (key === "animation") { if (truthy(v) !== animation) press("/"); }
      else if (key === "autorotate") spin = truthy(v) ? (parseFloat(v) || 12) * Math.PI / 180 : 0;   // degrees a second
      else if (key === "interactive") { still = !truthy(v); root.classList.toggle("bp-still", still); }
      else return;
      state[key] = v;
    }
    addEventListener("message", e => {
      const d = e.data;
      if (!d || d.type !== "blueprint") return;
      if (d.action === "set") set(d.key, d.value);
      else if (d.action === "theme" || d.action === "render") set(d.action, d.value);
      else if (d.action === "explode") lock(!(explodeTarget === 1));
      else if (d.action === "animate") press("/");
      else if (d.action === "tour") press(".");
      else if (d.action === "reset") press("r");
    });
    // autorotate turns the model about its vertical axis, as dragging it would
    let lastSpin = performance.now();
    (function turn(now) {
      if (spin && !reduceMotion) drag.tYaw += spin * Math.min(0.1, (now - lastSpin) / 1000);
      lastSpin = now;
      requestAnimationFrame(turn);
    })(lastSpin);
    // once the rest of the page (the render styles included) has run, apply the options and say so
    setTimeout(() => {
      Object.entries(EMBED).forEach(([k, v]) => set(k, v));
      try { parent.postMessage({ type: "blueprint", event: "ready", title: document.title, state }, "*"); } catch (e) {}
    }, 0);
  }

  const HINT0 = (document.getElementById("hint") || {}).innerHTML || "";   // the page's own hint, before a touch hint replaces it
  if (touchMode && M.touchHint) document.getElementById("hint").textContent = M.touchHint + "; drag to turn it, pinch to zoom, two fingers to pan.";
  else {
    const hint = document.getElementById("hint");
    if (hint) hint.innerHTML = hint.innerHTML.replace("to rotate,", "to rotate, drag empty space to pan,");
  }

  if (!window.THREE) return;

  // ---------- decode geometry (Blender mm, Z-up -> three Y-up) ----------
  const bin = atob(G.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const P = new Int16Array(bytes.buffer, 0, G.vertexCount * 3);
  const I = new Uint16Array(bytes.buffer, G.vertexCount * 6, G.indexCount);
  const toThree = (x, y, z) => new THREE.Vector3(x, z, -y);
  const V = Object.assign({ az: 45, el: 28, near: 10, far: 20000, fit: 0.92 }, M.view);
  V.sway = 0; V.parallax = 0;   // the model holds still unless you turn it

  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, V.near, V.far);

  const model = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);

  // each module slides apart on its own offset (Blender mm), from an optional assembled base position
  const modules = {};
  const MODS = M.modules || G.explode;
  Object.keys(MODS).forEach(k => {
    const d = Array.isArray(MODS[k]) ? { offset: MODS[k] } : MODS[k];
    const g = new THREE.Group();
    g.userData.offset = toThree(...d.offset);
    g.userData.base = toThree(...(d.base || [0, 0, 0]));
    g.position.copy(g.userData.base);
    model.add(g);
    modules[k] = g;
  });

  const BASE = M.base || { major: 0.95, minor: 0.66 };
  const fillMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
  const lineMats = [];
  const byName = {};
  const pickable = [], occluders = [];
  const boxA = new THREE.Box3(), boxE = new THREE.Box3();
  function lineMat(base, hidden) {
    const m = new THREE.LineBasicMaterial({ transparent: true, opacity: base, depthWrite: false });
    if (hidden) m.depthFunc = THREE.GreaterDepth;
    m.userData = { base, k: 1, target: 1 };
    lineMats.push(m);
    return m;
  }

  // ---------- silhouettes ----------
  // Rounded corners, tubes, cowls and balls are made of many shallow facets, so they have no hard edges
  // to draw and their outline would vanish. Each frame, every edge between a triangle facing the camera
  // and one facing away is drawn as well: the true outline from any angle.
  const sils = [];
  function addSilhouette(li, ti, attr, pos, parent, mat) {
    const n = ti.length / 3;
    if (!n) return;
    const key = (a, b) => a < b ? a * 65536 + b : b * 65536 + a;
    const hard = new Set();
    for (let i = 0; i < li.length; i += 2) hard.add(key(li[i], li[i + 1]));
    const nrm = new Float32Array(n * 3), faces = new Map();
    for (let f = 0; f < n; f++) {
      const v = [ti[3 * f], ti[3 * f + 1], ti[3 * f + 2]];
      const ax = pos[v[0] * 3], ay = pos[v[0] * 3 + 1], az = pos[v[0] * 3 + 2];
      const ux = pos[v[1] * 3] - ax, uy = pos[v[1] * 3 + 1] - ay, uz = pos[v[1] * 3 + 2] - az;
      const wx = pos[v[2] * 3] - ax, wy = pos[v[2] * 3 + 1] - ay, wz = pos[v[2] * 3 + 2] - az;
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      const l = Math.hypot(nx, ny, nz);
      if (l < M.silhouetteMinArea) continue;          // sliver triangle: its normal is noise
      nrm[3 * f] = nx / l; nrm[3 * f + 1] = ny / l; nrm[3 * f + 2] = nz / l;
      for (let k = 0; k < 3; k++) {
        const e = key(v[k], v[(k + 1) % 3]);
        const s = faces.get(e);
        if (s) s.push(f); else faces.set(e, [f]);
      }
    }
    const E = [];
    faces.forEach((fs, e) => {
      if (fs.length !== 2 || hard.has(e)) return;
      const [f, g] = fs;
      // flat regions split into triangles (and quantisation noise) are not outlines
      if (nrm[3 * f] * nrm[3 * g] + nrm[3 * f + 1] * nrm[3 * g + 1] + nrm[3 * f + 2] * nrm[3 * g + 2] > M.silhouetteFlat) return;
      E.push(Math.floor(e / 65536), e % 65536, f, g);
    });
    if (!E.length) return;
    const edges = Uint32Array.from(E), idx = new Uint16Array(E.length / 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", attr);
    const ib = new THREE.BufferAttribute(idx, 1);
    ib.setUsage(THREE.DynamicDrawUsage);
    geo.setIndex(ib);
    geo.setDrawRange(0, 0);
    const seg = new THREE.LineSegments(geo, mat);
    seg.renderOrder = 2; seg.frustumCulled = false;
    parent.add(seg);
    sils.push({ seg, pos, nrm, edges, idx, ib });
  }
  const silCam = new THREE.Vector3();
  function updateSilhouettes() {
    sils.forEach(s => {
      if (!s.seg.visible) return;
      s.seg.parent.worldToLocal(silCam.copy(camera.position));
      const { pos, nrm, edges, idx } = s;
      let m = 0;
      for (let i = 0; i < edges.length; i += 4) {
        const a = edges[i], f = edges[i + 2] * 3, g = edges[i + 3] * 3;
        const dx = silCam.x - pos[a * 3], dy = silCam.y - pos[a * 3 + 1], dz = silCam.z - pos[a * 3 + 2];
        const sf = nrm[f] * dx + nrm[f + 1] * dy + nrm[f + 2] * dz > 0;
        const sg = nrm[g] * dx + nrm[g + 1] * dy + nrm[g + 2] * dz > 0;
        if (sf !== sg) { idx[m++] = a; idx[m++] = edges[i + 1]; }
      }
      s.ib.needsUpdate = true;
      s.seg.geometry.setDrawRange(0, m);
    });
  }
  M.silhouetteMinArea = M.silhouetteMinArea || 0.05;
  // how alike two faces' normals must be to count as one flat face. Finely divided revolved surfaces (the
  // turbofan's casings) turn only a degree or so per facet, so they need a stricter value than the default.
  M.silhouetteFlat = M.silhouetteFlat || 0.99;

  // ---------- parts ----------
  // every part sits in its own group so it can be dragged away from its module; parts on a spinning
  // spool (the turbofan) get an inner group that turns, so hotspots and drags don't spin with them
  const partGroups = {}, spinners = {};
  // X-ray: faint hidden edges seen through the parts, and dashed guides from each part to where it fits
  const HIDDEN_KINDS = M.hiddenLines === false ? [] : (M.hiddenLines || ["major"]);
  const xrayMats = [];
  function indices(start, n, o) {
    if (!M.globalIndices) return I.slice(start, start + n);
    const a = new Uint16Array(n);
    for (let i = 0; i < n; i++) a[i] = I[start + i] - o.vStart;
    return a;
  }
  G.objects.forEach(o => {
    const kind = M.kindOf ? M.kindOf(o) : o.kind;
    const mod = modules[M.moduleOf ? M.moduleOf(o) : o.module];
    const pos = new Float32Array(o.vCount * 3);
    for (let i = 0; i < o.vCount; i++) {
      const j = (o.vStart + i) * 3;
      pos[i * 3] = P[j] * G.scale; pos[i * 3 + 1] = P[j + 2] * G.scale; pos[i * 3 + 2] = -P[j + 1] * G.scale;
    }
    const attr = new THREE.BufferAttribute(pos, 3);
    const lStart = o.lStart !== undefined ? o.lStart : o.iStart;
    const tStart = o.tStart !== undefined ? o.tStart : o.iStart + o.lCount;
    const li = indices(lStart, o.lCount, o), ti = indices(tStart, o.tCount, o);
    const mat = lineMat(BASE[kind] !== undefined ? BASE[kind] : 0.8);
    const entry = byName[o.name] = { mats: [mat] };

    const pg = new THREE.Group();
    pg.userData.name = o.name;
    mod.add(pg);
    partGroups[o.name] = pg;
    let inner = pg;
    const spool = M.spoolOf && M.spoolOf(o);
    if (spool) {
      inner = new THREE.Group();
      pg.add(inner);
      (spinners[spool] = spinners[spool] || []).push(inner);
    }

    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", attr);
    lg.setIndex(new THREE.BufferAttribute(li, 1));
    const lines = new THREE.LineSegments(lg, mat);
    lines.renderOrder = 2;
    inner.add(lines);
    if (HIDDEN_KINDS.includes(kind)) {
      // the hidden edges of major parts, faint, as on the blueprint (the X-ray layer)
      const hm = lineMat(BASE.hidden || 0.09, true);
      xrayMats.push(hm);
      lines.userData.hiddenMat = hm;
      const hidden = new THREE.LineSegments(lg, hm);
      hidden.renderOrder = 3;
      inner.add(hidden);
      entry.mats.push(hm);
    }
    if (!M.silhouette || M.silhouette(o, kind)) addSilhouette(li, ti, attr, pos, inner, mat);

    const tg = new THREE.BufferGeometry();
    tg.setAttribute("position", attr);
    tg.setIndex(new THREE.BufferAttribute(ti, 1));
    tg.computeBoundingBox();
    tg.computeBoundingSphere();
    const mesh = new THREE.Mesh(tg, fillMat);
    mesh.name = o.name;
    mesh.renderOrder = 1;
    inner.add(mesh);
    // dense parts (blade rows) are picked through a simple stand-in shape instead of every triangle
    const proxyGeo = M.proxy && M.proxy(o, kind, pos);
    if (proxyGeo) {
      proxyGeo.computeBoundingBox(); proxyGeo.computeBoundingSphere();
      const proxy = new THREE.Mesh(proxyGeo, proxyMat);
      proxy.name = o.name;
      pg.add(proxy);
      pickable.push(proxy);
    } else pickable.push(mesh);
    if ((M.occluders || []).includes(o.name)) occluders.push(mesh);
    if (o.tCount) {
      (mod.userData.box = mod.userData.box || new THREE.Box3()).union(tg.boundingBox);
      const bb = tg.boundingBox.clone().translate(mod.userData.base);
      boxA.union(bb);
      boxE.union(bb.clone().translate(mod.userData.offset));
    }
  });
  const cA = boxA.getCenter(new THREE.Vector3()), cE = boxE.getCenter(new THREE.Vector3());
  const mid = cA.clone().add(cE).multiplyScalar(0.5);
  model.position.copy(mid).negate();
  const rA = boxA.getSize(new THREE.Vector3()).length() / 2, rE = boxE.getSize(new THREE.Vector3()).length() / 2;

  // assembly guides: dashed lines from the trailing corners of each module that moves, back to where it sits
  // when assembled, so you can see where every part goes. Models can turn them off (M.guides === false).
  const guide = { ends: [], mat: null, lines: null, base: BASE.guides || 0.32 };
  if (M.guides !== false) {
    const corner = new THREE.Vector3();
    Object.values(modules).forEach(g => {
      const off = g.userData.offset, b = g.userData.box;
      if (!b || off.length() < rA * 0.02) return;
      const dir = off.clone().normalize();
      const cs = [];
      for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
        cs.push({ p: corner.clone(), d: corner.dot(dir) });
      }
      // the four corners on the face that leads back towards the assembled position; small parts get one
      // guide from that face's centre so a crowded drawing doesn't fill with dashes
      const lead = cs.sort((a, c) => a.d - c.d).slice(0, 4);
      if (b.getSize(corner).length() < rA * 0.25)
        guide.ends.push({ g, p: lead.reduce((m, c) => m.add(c.p), new THREE.Vector3()).multiplyScalar(0.25) });
      else lead.forEach(c => guide.ends.push({ g, p: c.p }));
    });
    if (guide.ends.length) {
      const gg = new THREE.BufferGeometry();
      gg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(guide.ends.length * 6), 3));
      gg.setAttribute("lineDistance", new THREE.BufferAttribute(new Float32Array(guide.ends.length * 2), 1));
      const dash = rA * 0.014;
      guide.mat = new THREE.LineDashedMaterial({ transparent: true, opacity: 0, depthWrite: false, dashSize: dash, gapSize: dash * 0.9 });
      guide.mat.userData = { base: 0, k: 1, target: 1 };
      lineMats.push(guide.mat);
      xrayMats.push(guide.mat);
      guide.lines = new THREE.LineSegments(gg, guide.mat);
      guide.lines.userData.guide = true;
      guide.lines.frustumCulled = false;
      guide.lines.renderOrder = 2;
      model.add(guide.lines);
    }
  }
  function updateGuides(e) {
    if (!guide.lines) return;
    // fade in as the parts come apart; none while closed
    guide.mat.userData.base = guide.base * Math.max(0, Math.min(1, (e - 0.15) / 0.5));
    const pa = guide.lines.geometry.attributes.position, la = guide.lines.geometry.attributes.lineDistance;
    guide.ends.forEach((c, i) => {
      const g = c.g, b = g.userData.base, o = g.userData.offset;
      // the part's own corner as it moves (dragged parts included), and that corner at its assembled place
      tmpG.copy(c.p).applyMatrix4(g.matrix);
      if (g.children.length === 1) tmpG.copy(c.p).applyMatrix4(g.children[0].matrix).applyMatrix4(g.matrix);
      pa.setXYZ(i * 2, tmpG.x, tmpG.y, tmpG.z);
      pa.setXYZ(i * 2 + 1, c.p.x + b.x, c.p.y + b.y, c.p.z + b.z);
      la.setX(i * 2, 0);
      la.setX(i * 2 + 1, tmpG.distanceTo(tmpH.set(c.p.x + b.x, c.p.y + b.y, c.p.z + b.z)));
    });
    pa.needsUpdate = la.needsUpdate = true;
  }
  const tmpG = new THREE.Vector3(), tmpH = new THREE.Vector3();

  // ---------- key presses on a model keyboard (lit fills that pulse and fade) ----------
  // keys: [cx, cy, w, h, label] in the keyboard part's Blender mm; top: the keycap top height
  function keyPresser(o) {
    const byLabel = {};
    o.keys.forEach(k => { byLabel[k[4]] = { cx: k[0], cy: k[1], w: k[2], h: k[3] }; });
    const SHIFTED = { "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0",
      "_": "-", "+": "=", "{": "[", "}": "]", "|": "\\", ":": ";", "\"": "'", "<": ",", ">": ".", "?": "/", "~": "`" };
    const pool = [];
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.renderOrder = 4; m.visible = false;
      o.group.add(m);
      pool.push(m);
    }
    let next = 0;
    function press(label) {
      const k = byLabel[label];
      if (!k) return;
      // a key already lit restarts its pulse instead of stacking another fill
      const m = pool.find(p => p.visible && p.userData.k === k) || pool[next++ % pool.length];
      m.userData = { k, at: performance.now() };
      m.position.copy(toThree(k.cx, k.cy, o.top + 0.12));
      m.visible = true;
    }
    function char(ch) {
      if (ch === " ") return press("space");
      if (ch === "\n") return press(o.enter);
      let l = ch.toLowerCase(), shift = ch !== l;
      if (SHIFTED[ch]) { l = SHIFTED[ch]; shift = true; }
      if (shift) press("shift");
      press(l);
    }
    const DOWN = 70, UP = 480;
    function tick(now, color) {
      pool.forEach(m => {
        if (!m.visible) return;
        const t = now - m.userData.at, k = m.userData.k;
        if (t > DOWN + UP) { m.visible = false; return; }
        // pressed: the fill snaps in a little smaller, then springs back to the key's size as it fades
        const a = t < DOWN ? t / DOWN : 1 - (t - DOWN) / UP;
        const s = t < DOWN ? 1 - 0.14 * a : 0.86 + 0.14 * Math.min(1, (t - DOWN) / 160);
        m.material.color.copy(color);
        m.material.opacity = 0.88 * a * (reduceMotion ? 1 : 1);
        m.scale.set(k.w * 0.9 * s, k.h * 0.9 * s, 1);
      });
    }
    return { press, char, tick, clear() { pool.forEach(m => { m.visible = false; }); } };
  }

  // ---------- model extras: screen animations, spinning spools, construction lines ----------
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const E = { G, M, toThree, renderer, scene, camera, canvas, modules, partGroups, byName, pickable, lineMats, fillMat,
    reduceMotion, touchMode, ray, mouse, spinners, keyPresser, refresh: f => refresh(f), xray: () => xray };
  const extras = (M.setup && M.setup(E)) || {};
  E.extras = extras;

  // ---------- "how it works" ----------
  // Models with a keyboard bring their own interactive version; the others play a guided tour (M.tour)
  // that zooms onto each stage in turn while a dashed line follows the path through the parts.
  const flow = M.flow ? M.flow(E) : tour(M.tour);
  function tour(T) {
    const api = { on: false, names: null, explode: 0, focus: () => 0, tick() {}, recolor() {}, toggle() {} };
    if (!T) return api;
    const anchors = {};
    // a point is [x, y, z, part] in the part's Blender mm, or just a part name for the middle of that part
    Object.keys(T.points).forEach(k => {
      const v = T.points[k];
      const a = new THREE.Object3D();
      if (typeof v === "string") {
        const mesh = pickable.find(m => m.name === v);
        mesh.geometry.boundingBox.getCenter(a.position);
        partGroups[v].add(a);
      } else {
        a.position.copy(toThree(v[0], v[1], v[2]));
        partGroups[v[3]].add(a);
      }
      anchors[k] = a;
    });
    const MAXP = 12;
    const lineMat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color() }, opacity: { value: 0 }, offset: { value: 0 }, dash: { value: 3 }, period: { value: 5 } },
      vertexShader: "attribute float lineDistance; varying float vD; void main() { vD = lineDistance; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 color; uniform float opacity, offset, dash, period; varying float vD; void main() { if (mod(vD - offset, period) > dash) discard; gl_FragColor = vec4(color, opacity); }",
      transparent: true, depthTest: false, depthWrite: false,
    });
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * MAXP), 3));
    const path = new THREE.Line(lineGeo, lineMat);
    path.renderOrder = 5; path.frustumCulled = false; path.visible = false;
    scene.add(path);

    const box = document.getElementById("flow");
    const elK = box.querySelector(".flow-k"), elT = box.querySelector("b"), elD = box.querySelector("p"), elBar = box.querySelector(".flow-bar i");
    let on = false, idx = -1, t0 = 0;
    Object.defineProperty(api, "on", { get: () => on });
    const steps = T.steps;
    function show(i, now) {
      const s = steps[i];
      idx = i; t0 = now;
      api.explode = s.ex;
      elK.textContent = "How it works · " + String(i + 1).padStart(2, "0") + " / " + String(steps.length).padStart(2, "0");
      elT.textContent = s.t; elD.textContent = s.d;
      api.names = s.n; refresh(true);
    }
    api.toggle = () => {
      on = !on;
      document.body.classList.toggle("flowing", on);
      document.body.classList.toggle("zoomed", on);
      box.hidden = !on;
      if (on) show(0, performance.now());
      else { idx = -1; api.names = null; api.explode = 0; refresh(true); }
    };
    api.focus = out => {
      if (!on) return 0;
      anchors[steps[idx].focus].getWorldPosition(out);
      return steps[idx].dist;
    };
    const pts = [];
    api.tick = (now, fg) => {
      let showPath = false;
      if (on) {
        if (now - t0 > steps[idx].ms) show((idx + 1) % steps.length, now);   // the tour loops until "." again
        const s = steps[idx], dt = now - t0;
        elBar.style.transform = "scaleX(" + Math.min(1, dt / s.ms).toFixed(3) + ")";
        if (s.p.length > 1) {
          showPath = true;
          pts.length = 0;
          s.p.forEach((k, i) => { pts[i] = anchors[k].getWorldPosition(new THREE.Vector3()); });
          const arr = lineGeo.attributes.position.array;
          for (let i = 0; i < MAXP; i++) {
            const v = pts[Math.min(i, pts.length - 1)];
            arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z;
          }
          lineGeo.attributes.position.needsUpdate = true;
          lineGeo.setDrawRange(0, pts.length);
          path.computeLineDistances();
          // dash length and speed follow the zoom so they read the same at any distance
          const camD = camera.position.distanceTo(pts[0]);
          lineMat.uniforms.dash.value = camD * 0.009;
          lineMat.uniforms.period.value = camD * 0.015;
          if (!reduceMotion) lineMat.uniforms.offset.value = (dt / 1000) * camD * 0.05;
        }
      }
      lineMat.uniforms.color.value.copy(fg);
      const u = lineMat.uniforms.opacity;
      u.value += ((showPath ? 1 : 0) - u.value) * 0.2;
      path.visible = u.value > 0.01;
    };
    addEventListener("keydown", e => {
      if (e.key !== "." || e.ctrlKey || e.metaKey || e.altKey || e.target.closest("input, select, textarea, [contenteditable]")) return;
      e.preventDefault();
      api.toggle();
    });
    return api;
  }

  // ---------- hotspots (the blueprint's callout anchors) ----------
  const HOT = M.hotspots.map(h => Object.assign({}, h));
  const layer = document.getElementById("hotspots");
  HOT.forEach((h, i) => {
    h.anchor = new THREE.Object3D();
    h.anchor.position.copy(toThree(...h.p));
    partGroups[h.o[0]].add(h.anchor);
    const el = document.createElement("div");
    el.className = "hs";
    el.style.setProperty("--delay", (i * 0.37 % 3.2).toFixed(2) + "s");
    el.innerHTML = '<span class="ring"></span><button class="hit" type="button" aria-label="' + h.t + '"></button>' +
      '<span class="label"><span class="txt"><b>' + h.t + "</b><span>" + h.s + "</span></span></span>";
    layer.appendChild(el);
    h.el = el;
    h.ring = el.querySelector(".ring");
    const hit = el.querySelector(".hit");
    hit.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { domHover = h; refresh(); } });
    hit.addEventListener("pointerleave", e => { if (e.pointerType === "mouse" && domHover === h) { domHover = null; refresh(); } });
    hit.addEventListener("focus", () => { domHover = h; refresh(); });
    hit.addEventListener("blur", () => { if (domHover === h) { domHover = null; refresh(); } });
    hit.addEventListener("click", e => { e.stopPropagation(); tapped = tapped === h ? null : h; zoomTo(tapped ? meshByName[h.o[0]] : null); });
  });

  let domHover = null, pickHover = null, tapped = null, active = null;
  function setActive(h, force) {
    if (h === active && !force) return;
    if (active) {
      active.el.classList.remove("active");
      const cur = getComputedStyle(active.ring).transform;
      active.ring.animate([{ transform: cur === "none" ? "scale(1)" : cur }, { transform: "scale(1)" }],
        { duration: 220, easing: "ease-out", fill: "forwards" });
    }
    active = h;
    if (h) {
      h.el.classList.add("active");
      h.ring.animate(reduceMotion ? [{ transform: "scale(1.35)" }, { transform: "scale(1.35)" }] : [
        { transform: "scale(1)" }, { transform: "scale(1.85)", offset: 0.32 }, { transform: "scale(1.1)", offset: 0.58 },
        { transform: "scale(1.5)", offset: 0.8 }, { transform: "scale(1.35)" }
      ], { duration: 650, easing: "ease-out", fill: "forwards" });
    }
    const names = h ? h.o : (flow.names || (detail.mesh ? [detail.mesh.name] : null));
    Object.keys(byName).forEach(n => byName[n].mats.forEach(m => { m.userData.target = !names ? 1 : names.includes(n) ? 1.6 : 0.3; }));
    canvas.classList.toggle("pointing", !!pickHover);
  }
  const refresh = force => setActive(domHover || pickHover || tapped, force === true);

  // ---------- picking ----------
  let wantPick = false, pointerIn = false;
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", e => {
    mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    parallax.tx = mouse.x; parallax.ty = mouse.y;
    pointerIn = e.target === canvas;
    wantPick = true;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { pointerIn = false; wantPick = true; });
  addEventListener("pointerdown", e => {
    mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    pointerIn = e.target === canvas;
  }, { passive: true });
  canvas.addEventListener("click", () => {
    if (touchMode) {
      if (!touchOpen) { touchOpen = true; return; }
      pick();
      if (!pickHover) { touchOpen = false; return; }
    }
    tapped = pickHover; refresh();
  });
  document.addEventListener("click", e => { if (e.target !== canvas && !e.target.closest(".hs")) { tapped = null; touchOpen = false; refresh(); } });

  function pick() {
    wantPick = false;
    let found = null;
    if (pointerIn && revealed && !flow.on && !exporting) {
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(pickable, false)[0];
      if (hit) {
        let best = Infinity;
        HOT.forEach(h => {
          if (!h.o.includes(hit.object.name)) return;
          const d = h.anchor.getWorldPosition(tmp).distanceTo(hit.point);
          if (d < best) { best = d; found = h; }
        });
      }
    }
    if (found !== pickHover) { pickHover = found; refresh(); }
    canvas.classList.toggle("pointing", !!pickHover);
  }

  // ---------- click a part while the model is apart: zoom in on it ----------
  // Click empty space, the same part again, or press Esc to zoom back out.
  const DETAIL = M.detail || {};
  const meshByName = {};
  pickable.forEach(m => { meshByName[m.name] = m; });
  const detailBox = document.getElementById("detail");
  const detail = { mesh: null, radius: 0 };
  const tmpD = new THREE.Vector3();
  function zoomTo(mesh) {
    detail.mesh = mesh;
    document.body.classList.toggle("zoomed", !!mesh || flow.on);
    detailBox.hidden = !mesh;
    if (mesh) {
      const d = DETAIL[mesh.name] || [mesh.name, ""];
      detailBox.querySelector("b").textContent = d[0];
      detailBox.querySelector("p").textContent = d[1];
      const sz = mesh.geometry.boundingBox.getSize(tmpD);
      detail.radius = Math.max(sz.length() / 2, rA * 0.06);
    }
    refresh(true);
  }
  detail.focus = out => {
    if (!detail.mesh) return 0;
    detail.mesh.geometry.boundingBox.getCenter(out);
    detail.mesh.localToWorld(out);
    return detail.radius;
  };
  canvas.addEventListener("click", () => {
    if (flow.on || !revealed) return;
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(pickable, false)[0];
    if (!hit || hit.object === detail.mesh) { zoomTo(null); tapped = null; refresh(); return; }
    zoomTo(hit.object);
  });

  // ---------- colours ----------
  function recolor() {
    const cs = getComputedStyle(root);
    const fgS = cs.getPropertyValue("--fg").trim(), bgS = cs.getPropertyValue("--bg").trim();
    fillMat.color.set(bgS);
    lineMats.forEach(m => m.color.set(fgS));
    if (extras.recolor) extras.recolor(fgS, bgS);
    flow.recolor(fgS, bgS);
  }
  window.__bpRecolor = recolor;
  recolor();

  // ---------- camera framing ----------
  // the camera eases out as the parts separate so both states fill the frame, centred on the page
  const AZ = THREE.MathUtils.degToRad(V.az), EL = THREE.MathUtils.degToRad(V.el);
  const dir = new THREE.Vector3(Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL));
  let mobile = false, dA = 1000, dE = 1000, fitSin = 0.2;
  function resize() {
    const w = innerWidth, h = innerHeight;
    mobile = w < 760;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
    const availW = mobile ? 0.98 : 0.9, availH = mobile ? 0.8 : 0.86;
    const hf = Math.atan(Math.tan(vf) * camera.aspect * availW);
    const vfa = Math.atan(Math.tan(vf) * availH);
    const s = Math.sin(Math.min(hf, vfa));
    fitSin = s;
    // fit < 1 lets the bounding sphere overlap the frame a little: boxes are rarely full to their corners
    dA = rA * 1.08 * V.fit / s;
    dE = rE * 1.02 * Math.max(V.fit, 0.97) / s;
    // a nudge down so the drawing clears the header
    camera.setViewOffset(w, h, 0, -h * 0.015, w, h);
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();
  const camTarget = new THREE.Vector3(), camCur = { t: new THREE.Vector3(), d: 0, init: false };
  const tmpFocus = new THREE.Vector3();
  let zoom = 1;   // zoom from the keyboard (+ / -), a pinch or the wheel
  // pan: the camera's target moved across the screen, in model radii (x right, y up)
  const pan = { x: 0, y: 0 };
  const panRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
  const panUp = new THREE.Vector3().crossVectors(dir, panRight);
  // normal framing follows the explode amount; in "how it works" or on a part the camera zooms onto it
  function placeCamera(e, dt) {
    camTarget.lerpVectors(cA, cE, e).sub(mid);
    let d = (dA + (dE - dA) * e) * zoom;
    const z = flow.focus(tmpFocus);
    if (z) { camTarget.copy(tmpFocus); d = dA * z; }
    else {
      const r = detail.focus(tmpFocus);
      if (r) { camTarget.copy(tmpFocus); d = r * 1.5 / fitSin; }
      else camTarget.addScaledVector(panRight, pan.x * rA).addScaledVector(panUp, pan.y * rA);
    }
    if (!camCur.init) { camCur.t.copy(camTarget); camCur.d = d; camCur.init = true; }
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 3);
    camCur.t.lerp(camTarget, k);
    camCur.d += (d - camCur.d) * k;
    camera.position.copy(dir).multiplyScalar(camCur.d).add(camCur.t);
    camera.lookAt(camCur.t);
  }

  // ---------- explode on hover: assembled at rest, parts slide apart while hovered ----------
  let explode = 0, explodeTarget = 0, revealed = false, leaveAt = 0, touchOpen = false;
  // double-click switches from hover mode to a fixed state: null = follow hover, true = apart, false = assembled
  let manual = null, exporting = false;
  function lock(open) {
    manual = open;
    if (touchMode) touchOpen = open;
  }
  canvas.addEventListener("dblclick", e => {
    e.preventDefault();
    lock(!(explodeTarget === 1));
  });

  // right-button drag rotates the model
  const drag = { on: false, id: null, x: 0, y: 0, yaw: 0, pitch: 0, tYaw: 0, tPitch: 0 };
  const PITCH = [-0.7, 0.9];
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  canvas.addEventListener("pointerdown", e => {
    if (e.button !== 2) return;
    drag.on = true; drag.id = e.pointerId; drag.x = e.clientX; drag.y = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("dragging");
  });
  canvas.addEventListener("pointermove", e => {
    if (!drag.on || e.pointerId !== drag.id) return;
    drag.tYaw += (e.clientX - drag.x) * 0.008;
    drag.tPitch = Math.max(PITCH[0], Math.min(PITCH[1], drag.tPitch + (e.clientY - drag.y) * 0.006));
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const endDrag = e => {
    if (!drag.on || e.pointerId !== drag.id) return;
    drag.on = false;
    canvas.classList.remove("dragging");
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // ---------- touch: one finger turns the model, two fingers pinch to zoom; the wheel zooms too ----------
  // A finger only starts turning once it has moved, so a tap still opens the model and picks parts.
  const touches = new Map();
  let pinch = 0, touchTurned = false, between = null;
  const spread = () => { const [a, b] = [...touches.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
  const midway = () => { const [a, b] = [...touches.values()]; return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null; };
  const zoomBy = f => { zoom = Math.max(0.45, Math.min(2.2, zoom * f)); };
  canvas.addEventListener("pointerdown", e => {
    if (e.pointerType !== "touch") return;
    if (!touches.size) touchTurned = false;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    pinch = spread(); between = midway();
  });
  canvas.addEventListener("pointermove", e => {
    const t = touches.get(e.pointerId);
    if (!t) return;
    const dx = e.clientX - t.x, dy = e.clientY - t.y;
    t.x = e.clientX; t.y = e.clientY;
    if (touches.size === 1) {
      if (!touchTurned && Math.hypot(t.x - t.x0, t.y - t.y0) < 8) return;
      touchTurned = true;
      drag.tYaw += dx * 0.008;
      drag.tPitch = Math.max(PITCH[0], Math.min(PITCH[1], drag.tPitch + dy * 0.006));
    } else {
      touchTurned = true;
      const s = spread(), m = midway();
      if (pinch && s) zoomBy(pinch / s);
      if (between && m) panBy(m.x - between.x, m.y - between.y);
      pinch = s; between = m;
    }
  });
  const endTouch = e => {
    if (!touches.delete(e.pointerId)) return;
    pinch = spread(); between = midway();
    // the finger left on the glass carries on turning from where it is, without a jump
    touches.forEach(t => { t.x0 = t.x; t.y0 = t.y; });
  };
  canvas.addEventListener("pointerup", endTouch);
  canvas.addEventListener("pointercancel", endTouch);
  // the tap that ends a turn or a pinch is not a tap on the model
  canvas.addEventListener("click", e => {
    if (touchTurned && !touches.size) { touchTurned = false; e.stopImmediatePropagation(); }
  }, true);
  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    zoomBy(Math.exp(Math.max(-1, Math.min(1, e.deltaY * (e.deltaMode ? 0.05 : 0.0015)))));
  }, { passive: false });

  // ---------- left-drag a part while the model is apart: move it around ----------
  // The part slides in a plane facing the camera. A press that doesn't move is still a click (zoom in).
  // Parts return to their places when the model closes up, "how it works" starts, or R is pressed.
  const partDrag = { down: false, on: false, id: null, x: 0, y: 0, g: null, start: new THREE.Vector3(), from: new THREE.Vector3(),
    plane: new THREE.Plane(), justDragged: false };
  const dragHit = new THREE.Vector3(), dragA = new THREE.Vector3(), dragB = new THREE.Vector3();
  const groupOf = o => { while (o && !o.userData.name) o = o.parent; return o; };
  canvas.addEventListener("pointerdown", e => {
    if (e.button !== 0 || e.pointerType !== "mouse" || !revealed || flow.on) return;
    mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(pickable, false)[0];
    if (!hit) return;
    partDrag.down = true; partDrag.id = e.pointerId; partDrag.x = e.clientX; partDrag.y = e.clientY;
    partDrag.g = groupOf(hit.object);
    partDrag.start.copy(hit.point);
    partDrag.from.copy(partDrag.g.position);
    partDrag.plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(dragA).negate(), hit.point);
  });
  canvas.addEventListener("pointermove", e => {
    if (!partDrag.down || e.pointerId !== partDrag.id) return;
    if (!partDrag.on) {
      if (Math.hypot(e.clientX - partDrag.x, e.clientY - partDrag.y) < 5) return;
      partDrag.on = true;
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add("dragging");
    }
    mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    if (!ray.ray.intersectPlane(partDrag.plane, dragHit)) return;
    // the move, in the coordinates of the part's module
    const m = partDrag.g.parent;
    m.worldToLocal(dragA.copy(partDrag.start));
    m.worldToLocal(dragB.copy(dragHit));
    partDrag.g.position.copy(partDrag.from).add(dragB.sub(dragA));
  });
  const endPartDrag = e => {
    if (!partDrag.down || e.pointerId !== partDrag.id) return;
    if (partDrag.on) { partDrag.justDragged = true; canvas.classList.remove("dragging"); }
    partDrag.down = partDrag.on = false;
  };
  canvas.addEventListener("pointerup", endPartDrag);
  canvas.addEventListener("pointercancel", endPartDrag);
  // the click that ends a drag is not a click on the part
  canvas.addEventListener("click", e => {
    if (partDrag.justDragged) { partDrag.justDragged = false; e.stopImmediatePropagation(); }
  }, true);

  // ---------- pan: drag empty space with the mouse, or middle-drag anywhere (two fingers on a touch screen) ----------
  // The model follows the pointer across the screen. A press that doesn't move is still a click.
  const panDrag = { down: false, on: false, id: null, x: 0, y: 0, just: false };
  const clampPan = v => Math.max(-3, Math.min(3, v));
  function panBy(dx, dy) {
    const perPx = 2 * camCur.d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / innerHeight / rA;
    pan.x = clampPan(pan.x - dx * perPx);
    pan.y = clampPan(pan.y + dy * perPx);
  }
  canvas.addEventListener("mousedown", e => { if (e.button === 1) e.preventDefault(); });   // no autoscroll
  canvas.addEventListener("pointerdown", e => {
    if (e.pointerType !== "mouse" || (e.button !== 0 && e.button !== 1)) return;
    if (e.button === 0 && partDrag.down) return;   // on a part, that's the part's drag
    panDrag.down = true; panDrag.on = e.button === 1; panDrag.id = e.pointerId; panDrag.x = e.clientX; panDrag.y = e.clientY;
    if (panDrag.on) { canvas.setPointerCapture(e.pointerId); canvas.classList.add("dragging"); }
  });
  canvas.addEventListener("pointermove", e => {
    if (!panDrag.down || e.pointerId !== panDrag.id) return;
    if (!panDrag.on) {
      if (Math.hypot(e.clientX - panDrag.x, e.clientY - panDrag.y) < 5) return;
      panDrag.on = true;
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add("dragging");
    }
    panBy(e.clientX - panDrag.x, e.clientY - panDrag.y);
    panDrag.x = e.clientX; panDrag.y = e.clientY;
  });
  const endPan = e => {
    if (!panDrag.down || e.pointerId !== panDrag.id) return;
    if (panDrag.on) { panDrag.just = true; canvas.classList.remove("dragging"); }
    panDrag.down = panDrag.on = false;
  };
  canvas.addEventListener("pointerup", endPan);
  canvas.addEventListener("pointercancel", endPan);
  canvas.addEventListener("click", e => { if (panDrag.just) { panDrag.just = false; e.stopImmediatePropagation(); } }, true);
  const partList = Object.values(partGroups);
  let resetUntil = 0;
  function settleParts(k) {
    partList.forEach(g => { if (g !== partDrag.g || !partDrag.on) g.position.multiplyScalar(1 - k); });
  }

  // ---------- keyboard ----------
  // Space / Enter: lock open or closed. ← →: step through the parts, zooming in on each. Shift + arrows:
  // turn and tilt. + / -: zoom. R: reset the view and put moved parts back. Esc: zoom out (or leave "how it works").
  const tourParts = Object.keys(DETAIL).filter(n => meshByName[n] && meshByName[n].geometry.index && meshByName[n].geometry.index.count);
  let partIdx = -1;
  addEventListener("keydown", e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input, select, textarea, [contenteditable]")) return;
    const k = e.key;
    if (k === "Escape") {
      if (detail.mesh) { zoomTo(null); tapped = null; refresh(); }
      else if (flow.on) flow.toggle();
      return;
    }
    if (flow.on) return;   // in "how it works" the keys belong to the model
    const onControl = e.target.closest("button, a, select");
    if ((k === " " || k === "Enter") && !onControl) {
      e.preventDefault();
      if (detail.mesh) zoomTo(null);
      lock(!(explodeTarget === 1));
    } else if (k.startsWith("Arrow") && e.shiftKey) {
      e.preventDefault();
      if (k === "ArrowLeft") drag.tYaw -= 0.3;
      if (k === "ArrowRight") drag.tYaw += 0.3;
      if (k === "ArrowUp") drag.tPitch = Math.max(PITCH[0], drag.tPitch - 0.15);
      if (k === "ArrowDown") drag.tPitch = Math.min(PITCH[1], drag.tPitch + 0.15);
    } else if ((k === "ArrowRight" || k === "ArrowLeft") && tourParts.length) {
      e.preventDefault();
      const cur = detail.mesh ? tourParts.indexOf(detail.mesh.name) : partIdx;
      partIdx = cur < 0 ? (k === "ArrowRight" ? 0 : tourParts.length - 1)
        : (cur + (k === "ArrowRight" ? 1 : -1) + tourParts.length) % tourParts.length;
      tapped = null;
      zoomTo(meshByName[tourParts[partIdx]]);
    } else if (k === "ArrowUp" || k === "ArrowDown") {
      e.preventDefault();
      drag.tPitch = Math.max(PITCH[0], Math.min(PITCH[1], drag.tPitch + (k === "ArrowUp" ? -0.15 : 0.15)));
    } else if (k === "+" || k === "=") { zoom = Math.max(0.45, zoom / 1.15); }
    else if (k === "-" || k === "_") { zoom = Math.min(2.2, zoom * 1.15); }
    else if (k === "r" || k === "R") {
      drag.tYaw = drag.tPitch = 0; zoom = 1; pan.x = pan.y = 0; partIdx = -1;
      resetUntil = performance.now() + 1500;
      if (detail.mesh) zoomTo(null);
      tapped = null; refresh();
    }
    else if (k === "h" || k === "H") setLabels(!labels);
    else if (k === "x" || k === "X") setXray(!xray);
  });

  // ---------- part labels on or off (the Labels button or H), remembered across models ----------
  const labelsBtn = document.getElementById("labels");
  let labels = true;
  try { labels = localStorage.getItem("bp-labels") !== "off"; } catch (e) {}
  function setLabels(on) {
    labels = on;
    document.body.classList.toggle("no-labels", !on);
    if (labelsBtn) labelsBtn.setAttribute("aria-pressed", String(on));
    try { localStorage.setItem("bp-labels", on ? "on" : "off"); } catch (e) {}
  }
  setLabels(labels);
  if (labelsBtn) labelsBtn.addEventListener("click", () => setLabels(!labels));

  // ---------- X-ray on or off (the X-ray button or X): hidden edges and assembly guides ----------
  const xrayBtn = document.getElementById("xray");
  let xray = true;
  try { xray = localStorage.getItem("bp-xray") !== "off"; } catch (e) {}
  function setXray(on) {
    xray = on;
    xrayMats.forEach(m => { m.visible = on; });
    if (xrayBtn) xrayBtn.setAttribute("aria-pressed", String(on));
    try { localStorage.setItem("bp-xray", on ? "on" : "off"); } catch (e) {}
  }
  setXray(xray);
  if (xrayBtn) xrayBtn.addEventListener("click", () => setXray(!xray));

  // ---------- views: preset angles, and a saved view that every model opens in ----------
  // A view is absolute: the angle round the model and the height it's seen from (degrees), the zoom and the pan, so a
  // view saved on one model frames every other model the same way. Turning the model by `yaw` moves the camera
  // the other way round it, and tilting it by `pitch` raises the camera. While a view is saved, it follows
  // whatever you turn to, and other models open in it; Save view again forgets it.
  const VIEW_KEY = "bp-view", PRESETS = [30, 45, 90];
  const rad = THREE.MathUtils.degToRad, deg = THREE.MathUtils.radToDeg, round1 = v => Math.round(v * 10) / 10;
  const wrap360 = a => ((a % 360) + 360) % 360;
  const viewNow = () => ({ az: round1(wrap360(V.az - deg(drag.tYaw))), el: round1(V.el + deg(drag.tPitch)), zoom: round1(zoom * 100) / 100,
    panX: Math.round(pan.x * 1000) / 1000, panY: Math.round(pan.y * 1000) / 1000 });
  function applyView(v, snap) {
    // the shortest way round to the new angle
    const target = rad(V.az - v.az), d = ((target - drag.tYaw) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    drag.tYaw += d;
    drag.tPitch = Math.max(PITCH[0], Math.min(PITCH[1], rad(v.el - V.el)));
    if (v.zoom) zoom = Math.max(0.45, Math.min(2.2, v.zoom));
    if (typeof v.panX === "number") { pan.x = clampPan(v.panX); pan.y = clampPan(v.panY || 0); }
    if (snap) { drag.yaw = drag.tYaw; drag.pitch = drag.tPitch; }
  }
  const viewCss = document.createElement("style");
  viewCss.textContent = `
    .viewbar { position: fixed; z-index: 5; left: var(--gutter); display: flex; flex-direction: column; gap: 4px; padding: 4px;
      border: 1px solid var(--rule); border-radius: 22px; background: var(--panel); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
    .viewbar button { font: 500 11px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--fg-2); background: transparent;
      border: 0; border-radius: 999px; min-width: 52px; padding: 10px 8px; cursor: pointer; transition: background-color .2s, color .2s; }
    .viewbar button:hover { color: var(--fg); }
    .viewbar button[aria-pressed="true"] { background: var(--fg); color: var(--bg); }
    .viewbar button:focus-visible { outline: 1px dashed var(--fg); outline-offset: 1px; }
    .viewbar hr { width: 70%; margin: 2px auto; border: 0; border-top: 1px solid var(--rule); }
    .viewbar .vb-k { font: 500 9px/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--fg-3); text-align: center; padding: 6px 0 2px; }
    .zoomed .viewbar, .flowing .viewbar { opacity: .3; }
    @media (max-width: 760px) { .viewbar button { min-width: 44px; padding: 9px 6px; } }`;
  document.head.appendChild(viewCss);
  const viewbar = document.createElement("div");
  viewbar.className = "viewbar"; viewbar.setAttribute("role", "group"); viewbar.setAttribute("aria-label", "View");
  viewbar.innerHTML = '<div class="vb-k">View</div>' +
    PRESETS.map(a => `<button type="button" data-az="${a}" aria-pressed="false" title="See it from ${a}° round">${a}°</button>`).join("") +
    '<hr><button type="button" class="vb-save" aria-pressed="false">Save</button>';
  document.body.appendChild(viewbar);
  const saveBtn = viewbar.querySelector(".vb-save"), presetBtns = [...viewbar.querySelectorAll("[data-az]")];
  // sits under the header, however many rows the header wraps to
  function placeViewbar() {
    const h = document.querySelector("header");
    viewbar.style.top = Math.round((h ? h.getBoundingClientRect().bottom : 70) + 14) + "px";
  }
  addEventListener("resize", placeViewbar);
  new MutationObserver(placeViewbar).observe(document.querySelector("header") || document.body, { childList: true, subtree: true });
  placeViewbar();
  let savedView = null;
  try { savedView = JSON.parse(localStorage.getItem(VIEW_KEY) || "null"); } catch (e) {}
  function setSaved(v) {
    savedView = v;
    saveBtn.setAttribute("aria-pressed", String(!!v));
    saveBtn.textContent = v ? "Saved" : "Save";
    saveBtn.title = v ? "This view is savedView: other models open in it. Click to forget it" : "Save this view: other models open in it";
    try { v ? localStorage.setItem(VIEW_KEY, JSON.stringify(v)) : localStorage.removeItem(VIEW_KEY); } catch (e) {}
  }
  if (savedView && typeof savedView.az === "number") applyView(savedView, true);
  setSaved(savedView && typeof savedView.az === "number" ? savedView : null);
  presetBtns.forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    applyView({ az: +b.dataset.az, el: V.el + deg(drag.tPitch) });
  }));
  saveBtn.addEventListener("click", e => { e.stopPropagation(); setSaved(savedView ? null : viewNow()); });
  // keep the savedView view up to date with the one on screen, and light the preset it matches
  setInterval(() => {
    const v = viewNow();
    presetBtns.forEach(b => b.setAttribute("aria-pressed", String(Math.abs(((v.az - b.dataset.az) % 360 + 540) % 360 - 180) < 0.5)));
    if (savedView && JSON.stringify(v) !== JSON.stringify(savedView)) setSaved(v);
  }, 300);

  // ---------- the screen animation, from a button: what "/" does, for touch screens with no keyboard ----------
  // Models with one say so in their hint (or set M.screenAnimation); the button sends the same key press.
  const toolsEl = document.querySelector(".tools");
  if (toolsEl && (M.screenAnimation || /for the screen/.test(HINT0))) {
    const anim = document.createElement("button");
    anim.type = "button"; anim.className = "tool"; anim.id = "animate"; anim.textContent = "Animate";
    anim.setAttribute("aria-pressed", "false"); anim.title = "Play the screen's animation (/)";
    let playing = false;
    const press = () => document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "/", code: "Slash", bubbles: true }));
    anim.addEventListener("click", e => { e.stopPropagation(); press(); });
    // the key itself toggles it too, so the button follows either
    addEventListener("keydown", e => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || (e.target.closest && e.target.closest("input, textarea, [contenteditable]"))) return;
      playing = !playing; anim.setAttribute("aria-pressed", String(playing));
    });
    toolsEl.insertBefore(anim, document.getElementById("xray") || toolsEl.firstChild);
    const css = document.createElement("style");
    css.textContent = "#animate[aria-pressed=\"true\"] { background: var(--fg); color: var(--bg); border-color: var(--fg); }";
    document.head.appendChild(css);
  }

  // ---------- pan pad: arrows that move the view, held to keep moving, and a button that centres it ----------
  // An arrow moves the view that way (so the model slides the other way); Alt + arrow keys do the same.
  const padCss = document.createElement("style");
  padCss.textContent = `
    .panpad { position: fixed; z-index: 5; left: var(--gutter); display: grid; grid-template-columns: repeat(3, 24px); grid-auto-rows: 24px;
      gap: 2px; padding: 5px; border: 1px solid var(--rule); border-radius: 18px; background: var(--panel);
      -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
    .panpad button { width: 24px; height: 24px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--fg-2);
      font: 500 12px/1 var(--mono); cursor: pointer; touch-action: none; -webkit-user-select: none; user-select: none; transition: background-color .15s, color .15s; }
    .panpad button:hover { color: var(--fg); }
    .panpad button.held, .panpad button:active { background: var(--fg); color: var(--bg); }
    .panpad button:focus-visible { outline: 1px dashed var(--fg); outline-offset: 1px; }
    .zoomed .panpad, .flowing .panpad { opacity: .3; }
    /* on a phone it sits bottom right, above the hint, clear of the model */
    @media (max-width: 760px) { .panpad { left: auto; right: var(--gutter); top: auto !important; bottom: calc(env(safe-area-inset-bottom, 0px) + 78px); } }`;
  document.head.appendChild(padCss);
  const panpad = document.createElement("div");
  panpad.className = "panpad"; panpad.setAttribute("role", "group"); panpad.setAttribute("aria-label", "Pan the view");
  const PAD = [["up", 0, 1, "↑", 2, 1], ["left", -1, 0, "←", 1, 2], ["centre", 0, 0, "◎", 2, 2], ["right", 1, 0, "→", 3, 2], ["down", 0, -1, "↓", 2, 3]];
  const nudge = (dx, dy, k) => { pan.x = clampPan(pan.x + dx * k * zoom); pan.y = clampPan(pan.y + dy * k * zoom); };
  PAD.forEach(([name, dx, dy, glyph, col, row]) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = glyph; b.style.gridColumn = col; b.style.gridRow = row;
    b.setAttribute("aria-label", name === "centre" ? "Centre the view" : "Pan " + name);
    b.title = name === "centre" ? "Centre the view" : "Pan " + name + " (Alt + arrow; hold to keep going)";
    let wait = null, rep = null;
    const stop = () => { clearTimeout(wait); clearInterval(rep); wait = rep = null; b.classList.remove("held"); };
    b.addEventListener("pointerdown", e => {
      e.preventDefault(); e.stopPropagation();
      if (name === "centre") { pan.x = pan.y = 0; return; }
      nudge(dx, dy, 0.08); b.classList.add("held");
      // held: a steady speed (radii a second), however often the timer gets to run
      wait = setTimeout(() => { let last = performance.now(); rep = setInterval(() => { const now = performance.now(); nudge(dx, dy, 0.75 * (now - last) / 1000); last = now; }, 30); }, 280);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(t => b.addEventListener(t, stop));
    // from the keyboard (Enter or Space on a focused button) a click is one step
    b.addEventListener("click", e => { e.stopPropagation(); if (e.detail === 0) { if (name === "centre") pan.x = pan.y = 0; else nudge(dx, dy, 0.08); } });
    panpad.appendChild(b);
  });
  document.body.appendChild(panpad);
  function placePanpad() { panpad.style.top = Math.round(viewbar.getBoundingClientRect().bottom + 10) + "px"; }
  addEventListener("resize", () => requestAnimationFrame(placePanpad));
  new MutationObserver(() => requestAnimationFrame(placePanpad)).observe(document.querySelector("header") || document.body, { childList: true, subtree: true });
  requestAnimationFrame(placePanpad);
  addEventListener("keydown", e => {
    if (!e.altKey || e.metaKey || e.ctrlKey || !e.key.startsWith("Arrow") || e.target.closest("input, select, textarea, [contenteditable]")) return;
    e.preventDefault();
    const d = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    nudge(d[0], d[1], 0.08);
  });

  // ---------- your own photo or video on the screen (models with a screen) ----------
  // The picture fills the screen's active area (cropped to fit, rounded corners kept) in every render style
  // and in the exports. It's only held in this page; nothing is uploaded.
  const scr = { mesh: null, tex: null, video: null, url: "", img: null };
  const screenBtn = document.getElementById("screen"), screenFile = document.getElementById("screen-file");
  if (G.screen && screenBtn && screenFile) {
    const S = G.screen;
    const o = toThree(...S.origin), r = toThree(...S.right), t = toThree(...S.top);
    const u = r.clone().sub(o), v = t.clone().sub(o), nrm = u.clone().cross(v).normalize();
    const lift = nrm.multiplyScalar(M.screenLift !== undefined ? M.screenLift : Math.max(0.15, u.length() * 0.002));
    const q = r.clone().add(t).sub(o);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([o, r, q, t].flatMap(p => p.clone().add(lift).toArray()), 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    // the picture is cropped to fill the screen and cut to its rounded corners (and the phone's camera island)
    // in a 2D canvas, which is the texture; a video is redrawn whenever it shows a new frame
    const SW = u.length(), SH = v.length();
    const cv = document.createElement("canvas"), k = 1280 / Math.max(SW, SH);
    cv.width = Math.round(SW * k); cv.height = Math.round(SH * k);
    const cg = cv.getContext("2d");
    const mask = document.createElement("canvas");
    mask.width = cv.width; mask.height = cv.height;
    (function () {
      const g = mask.getContext("2d");
      const rr = (x, y, w, h, rad) => { g.beginPath(); g.moveTo(x + rad, y); g.arcTo(x + w, y, x + w, y + h, rad); g.arcTo(x + w, y + h, x, y + h, rad);
        g.arcTo(x, y + h, x, y, rad); g.arcTo(x, y, x + w, y, rad); g.closePath(); g.fill(); };
      g.fillStyle = "#fff"; rr(0, 0, mask.width, mask.height, (S.cornerRadius || 0) * k);
      if (S.island) {
        g.globalCompositeOperation = "destination-out";
        const ix = (S.island.center[0] - S.origin[0]) * k, iy = mask.height - (S.island.center[1] - S.origin[1]) * k;
        rr(ix - S.island.w * k / 2, iy - S.island.h * k / 2, S.island.w * k, S.island.h * k, S.island.h * k / 2);
      }
    })();
    const tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false, transparent: true,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    mat.userData = { media: true };
    scr.mesh = new THREE.Mesh(geo, mat);
    scr.mesh.renderOrder = 4;
    scr.mesh.visible = false;
    scr.mesh.raycast = () => {};
    scr.size = [SW, SH]; scr.corners = { o, r, t, lift }; scr.canvas = cv;
    (partGroups[M.screenPart] || modules[S.module]).add(scr.mesh);
    screenBtn.hidden = false;

    // crop the picture to fill the screen, like a phone wallpaper
    function draw() {
      const src = scr.video || scr.img;
      if (!src) return;
      const w = scr.video ? src.videoWidth : src.naturalWidth, h = scr.video ? src.videoHeight : src.naturalHeight;
      if (!w || !h) return;
      const s = Math.max(cv.width / w, cv.height / h);
      cg.globalCompositeOperation = "source-over";
      cg.clearRect(0, 0, cv.width, cv.height);
      cg.drawImage(src, (cv.width - w * s) / 2, (cv.height - h * s) / 2, w * s, h * s);
      cg.globalCompositeOperation = "destination-in";
      cg.drawImage(mask, 0, 0);
      tex.needsUpdate = true;
    }
    let lastT = -1;
    scr.tick = () => {
      if (scr.video && scr.video.readyState >= 2 && scr.video.currentTime !== lastT) { lastT = scr.video.currentTime; draw(); }
      // the picture's colours pass straight through in the line drawing, and are encoded with the shaded styles
      if (tex.encoding !== renderer.outputEncoding) { tex.encoding = renderer.outputEncoding; tex.needsUpdate = true; mat.needsUpdate = true; }
    };
    // glass in front of the screen stops hiding it while a picture is on it
    const seeThrough = new THREE.MeshBasicMaterial({ visible: false });
    const glass = (M.screenGlass || []).map(n => meshByName[n]).filter(Boolean);
    const showGlass = on => glass.forEach(m => { m.material = on ? fillMat : seeThrough; });
    function clear() {
      if (scr.video) { scr.video.pause(); scr.video.removeAttribute("src"); scr.video.load(); }
      if (scr.url) URL.revokeObjectURL(scr.url);
      scr.video = scr.img = null; scr.url = "";
      scr.mesh.visible = false;
      showGlass(true);
      screenBtn.setAttribute("aria-pressed", "false");
      screenBtn.textContent = "Screen";
      screenBtn.title = "Put your own photo or video on the screen";
    }
    function use(file) {
      if (!file) return;
      const isVideo = file.type.startsWith("video/");
      if (!isVideo && !file.type.startsWith("image/")) return;
      clear();
      scr.url = URL.createObjectURL(file);
      const ready = () => {
        draw();
        scr.mesh.visible = true;
        showGlass(false);
        screenBtn.setAttribute("aria-pressed", "true");
        screenBtn.textContent = "Screen ✕";
        screenBtn.title = "Take your photo or video off the screen";
      };
      if (isVideo) {
        const vid = scr.video = document.createElement("video");
        Object.assign(vid, { muted: true, loop: true, playsInline: true, autoplay: true });
        vid.addEventListener("loadeddata", () => { ready(); vid.play().catch(() => {}); }, { once: true });
        vid.src = scr.url;
      } else {
        const img = scr.img = new Image();
        img.onload = ready;
        img.src = scr.url;
      }
    }
    screenBtn.addEventListener("click", () => { if (scr.tex) clear(); else screenFile.click(); });
    screenFile.addEventListener("change", () => { use(screenFile.files[0]); screenFile.value = ""; });
    // drop a file onto the page to put it on the screen
    addEventListener("dragover", e => { if (e.dataTransfer && [...e.dataTransfer.items].some(i => i.kind === "file")) e.preventDefault(); });
    addEventListener("drop", e => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) { e.preventDefault(); use(f); } });
    window.__bpScreen = { use, clear };
  }
  // the screen picture for the vector exports: an <image> mapped onto the screen as it's seen, when it's in view
  function screenSVG() {
    if (!scr.mesh || !scr.mesh.visible) return null;
    return { href: scr.canvas.toDataURL("image/png") };
  }
  function screenPlacement() {
    if (!scr.mesh || !scr.mesh.visible) return null;
    scr.mesh.updateMatrixWorld();
    const W = innerWidth, H = innerHeight, m = scr.mesh.matrixWorld, { o, r, t, lift } = scr.corners;
    const P = p => { const q = p.clone().add(lift).applyMatrix4(m).project(camera); return [(q.x + 1) / 2 * W, (1 - q.y) / 2 * H, q.z]; };
    const po = P(o), pr = P(r), pt = P(t);
    if (po[2] > 1 || pr[2] > 1 || pt[2] > 1) return null;
    // facing away from the camera: not drawn
    const cross = (pr[0] - po[0]) * (pt[1] - po[1]) - (pr[1] - po[1]) * (pt[0] - po[0]);
    if (cross > 0) return null;
    // hidden behind other parts: the screen's centre is checked against the solid parts
    const cen = r.clone().add(t).multiplyScalar(0.5).add(lift).applyMatrix4(m);
    camera.getWorldPosition(tmpG);
    ray.set(tmpG, cen.clone().sub(tmpG).normalize());
    ray.far = tmpG.distanceTo(cen) - rA * 0.04;   // cover glass just above the screen doesn't count
    const blocked = ray.intersectObjects(pickable, false).some(hh => hh.object.parent !== scr.mesh.parent);
    ray.far = Infinity;
    if (blocked) return null;
    // perspective can't be written in SVG, so the picture is laid down as a grid of small flat patches
    const [SW, SH] = scr.size, f = v => v.toFixed(3), N = SCR_GRID;
    const at = (x, y) => P(t.clone().addScaledVector(r.clone().sub(o), x / SW).addScaledVector(o.clone().sub(t), y / SH));
    const out = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x0 = SW * i / N, x1 = SW * (i + 1) / N, y0 = SH * j / N, y1 = SH * (j + 1) / N;
      const p00 = at(x0, y0), p10 = at(x1, y0), p01 = at(x0, y1);
      const a = (p10[0] - p00[0]) / (x1 - x0), b = (p10[1] - p00[1]) / (x1 - x0);
      const c = (p01[0] - p00[0]) / (y1 - y0), d = (p01[1] - p00[1]) / (y1 - y0);
      out.push({ k: j * N + i, m: "matrix(" + [a, b, c, d, p00[0] - a * x0 - c * y0, p00[1] - b * x0 - d * y0].map(f).join(" ") + ")" });
    }
    return out;
  }
  const SCR_GRID = 8;
  function screenUse(id, cells) {
    return '<g id="screen">' + cells.map(c => '<use href="#' + id + '" transform="' + c.m + '" clip-path="url(#' + id + "-" + c.k + ')"/>').join("") + "</g>";
  }
  function screenDefs(img, id) {
    const [SW, SH] = scr.size;
    // one clip per patch, a hair larger than the patch so no seams show between them
    let clips = "";
    const N = SCR_GRID, pad = Math.max(SW, SH) * 0.002;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++)
      clips += '<clipPath id="' + id + "-" + (j * N + i) + '"><rect x="' + (SW * i / N - pad).toFixed(3) + '" y="' + (SH * j / N - pad).toFixed(3) +
        '" width="' + (SW / N + 2 * pad).toFixed(3) + '" height="' + (SH / N + 2 * pad).toFixed(3) + '"/></clipPath>';
    return '<defs>' + clips + '<image id="' + id + '" href="' + img.href + '" width="' + SW.toFixed(2) + '" height="' + SH.toFixed(2) + '" preserveAspectRatio="none"/></defs>\n';
  }

  // ---------- export: SVG, animated SVG, transparent PNG, JPG ----------
  const fileBase = document.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "blueprint";
  function download(name, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  const cssColor = () => {
    const cs = getComputedStyle(root);
    return { fg: cs.getPropertyValue("--fg").trim(), bg: cs.getPropertyValue("--bg").trim() };
  };
  // what the canvas shows, at `scale` times the screen size; the WebGL canvas is copied straight after drawing
  // what the canvas shows, at `scale` times the screen size; the WebGL canvas is copied straight after drawing
  function snapshot(scale) {
    const pr = renderer.getPixelRatio();
    const gl = renderer.getContext(), max = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0]);
    renderer.setPixelRatio(Math.min(scale, max / Math.max(innerWidth, innerHeight)));
    renderer.setSize(innerWidth, innerHeight, false);
    scene.updateMatrixWorld(); updateSilhouettes();
    renderer.render(scene, camera);
    const c = document.createElement("canvas");
    c.width = canvas.width; c.height = canvas.height;
    c.getContext("2d").drawImage(canvas, 0, 0);
    renderer.setPixelRatio(pr);
    renderer.setSize(innerWidth, innerHeight, false);
    return c;
  }
  // PNG (transparent) or JPG at size [w, h]. The line drawing is traced and drawn as vectors, so its lines stay
  // as crisp and as heavy, relative to the model, at 8K as on screen; the shaded style is rendered at that size.
  function exportRaster(kind, size) {
    const [OW, OH] = size || [innerWidth * 2, innerHeight * 2];
    const c = document.createElement("canvas");
    c.width = OW; c.height = OH;
    const g = c.getContext("2d");
    const done = () => c.toBlob(b => download(fileBase + "-" + OW + "x" + OH + "." + kind, b),
      kind === "png" ? "image/png" : "image/jpeg", 0.92);
    if (kind === "jpg") { g.fillStyle = cssColor().bg; g.fillRect(0, 0, OW, OH); }
    const style = window.__bpGetStyle && window.__bpGetStyle();
    if (style && style !== "blueprint") {
      g.drawImage(snapshot(OW / innerWidth), 0, 0, OW, OH);
      return Promise.resolve(done());
    }
    let svg;
    asLines(() => { const st = stillBody(); svg = svgDoc(st.body, st.defs, [OW, OH], true); });
    return new Promise(res => {
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      img.onload = () => { g.drawImage(img, 0, 0, OW, OH); URL.revokeObjectURL(url); done(); res(); };
      img.onerror = () => { URL.revokeObjectURL(url); res(); };
      img.src = url;
    });
  }

  // Vector export: every visible line (feature edges and the outlines for this view) projected to the page,
  // with hidden-line removal against a depth image of the solid parts, grouped by part.
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  const DS = 2;   // depth image resolution, times the screen
  function depthImage(W, H) {
    const rt = new THREE.WebGLRenderTarget(W, H);
    const off = [];
    scene.traverse(o => { if (o.visible && o !== scr.mesh && (o.isLine || (o.isMesh && o.material !== fillMat))) { off.push(o); o.visible = false; } });
    const fv = fillMat.visible;
    fillMat.visible = true;
    scene.overrideMaterial = depthMat;
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(scene, camera);
    const px = new Uint8Array(W * H * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 0);
    scene.overrideMaterial = null;
    fillMat.visible = fv;
    off.forEach(o => { o.visible = true; });
    rt.dispose();
    // unpack, then keep the farthest depth around each pixel so lines on a part's own edge stay visible
    const d = new Float32Array(W * H);
    const k = 255 / 256 / 255;
    for (let i = 0; i < W * H; i++) {
      d[i] = k * (px[4 * i] / 16777216 + px[4 * i + 1] / 65536 + px[4 * i + 2] / 256 + px[4 * i + 3]);
    }
    const out = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let m = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = Math.min(W - 1, Math.max(0, x + dx)), yy = Math.min(H - 1, Math.max(0, y + dy));
        m = Math.max(m, d[yy * W + xx]);
      }
      out[y * W + x] = m;
    }
    return out;
  }
  const partNameOf = o => { while (o && !o.userData.name) o = o.parent; return o ? o.userData.name : "model"; };
  // one frame of the drawing: { part: { opacity: "M x y L x y ..." } } in CSS pixels
  const fmt = v => String(Math.round(v * 10) / 10);
  function traceLines() {
    scene.updateMatrixWorld(); updateSilhouettes();
    const W = innerWidth, H = innerHeight, DW = Math.round(W * DS), DH = Math.round(H * DS);
    const depth = depthImage(DW, DH);
    const n = camera.near, f = camera.far;
    const lin = z => (n * f) / (f - z * (f - n));          // window depth -> distance from the camera
    const PM = new THREE.Matrix4(), e = PM.elements;
    const parts = {};
    scene.traverseVisible(o => {
      if (!o.isLineSegments || o.material.isShaderMaterial || o.material.depthFunc === THREE.GreaterDepth || !o.material.visible) return;
      if (o.userData.guide) { traceGuides(o, parts); return; }
      const op = o.material.userData && o.material.userData.base !== undefined ? Math.min(1, o.material.userData.base) : o.material.opacity;
      if (op < 0.03) return;
      const g = o.geometry, pos = g.attributes.position.array, idx = g.index ? g.index.array : null;
      if (!idx) return;
      const count = Math.min(g.drawRange.count, idx.length);
      PM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(o.matrixWorld);
      const key = Math.round(op * 20) / 20;
      // the faint hidden edges, when X-ray is on, come out as their own lighter strokes
      const hm = o.userData.hiddenMat, hkey = hm && hm.visible ? Math.round(Math.min(1, hm.userData.base) * 100) / 100 : 0;
      const hout = [];
      let hlast = "";
      const name = partNameOf(o);
      const bucket = (parts[name] = parts[name] || {});
      const out = [];
      let last = "";
      const P = new Float32Array(8);
      const proj = (vi, j) => {
        const x = pos[vi * 3], y = pos[vi * 3 + 1], z = pos[vi * 3 + 2];
        const w = e[3] * x + e[7] * y + e[11] * z + e[15];
        if (w <= n * 0.5) return false;
        P[j] = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w + 1) / 2 * W;
        P[j + 1] = (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / w) / 2 * H;
        P[j + 2] = ((e[2] * x + e[6] * y + e[10] * z + e[14]) / w) * 0.5 + 0.5;
        return true;
      };
      for (let i = g.drawRange.start; i + 1 < count; i += 2) {
        if (!proj(idx[i], 0) || !proj(idx[i + 1], 3)) continue;
        const dx = P[3] - P[0], dy = P[4] - P[1], len = Math.hypot(dx, dy);
        if (len < 0.25) continue;
        const steps = Math.max(1, Math.ceil(len / 1.5));
        let run = -1, hrun = -1;
        for (let s = 0; s <= steps + 1; s++) {
          let hid = false;
          let vis = false;
          if (s <= steps) {
            const t = s / steps, x = P[0] + dx * t, y = P[1] + dy * t, z = P[2] + (P[5] - P[2]) * t;
            const xi = Math.floor(x * DS), yi = DH - 1 - Math.floor(y * DS);
            if (xi >= 0 && yi >= 0 && xi < DW && yi < DH && z > 0 && z < 1) {
              const lz = lin(z), lb = lin(Math.min(depth[yi * DW + xi], 0.9999999));
              vis = lz <= lb * 1.004 + 0.002 * rA;
              hid = !vis && hkey > 0;
            }
          }
          if (hid && hrun < 0) hrun = s;
          if (!hid && hrun >= 0) {
            const t0 = hrun / steps, t1 = Math.min(1, (s - 1) / steps);
            const a = fmt(P[0] + dx * t0) + " " + fmt(P[1] + dy * t0), b = fmt(P[0] + dx * t1) + " " + fmt(P[1] + dy * t1);
            if (a !== b) { hout.push((a === hlast ? "L" : "M" + a + "L") + b); hlast = b; }
            hrun = -1;
          }
          if (vis && run < 0) run = s;
          if (!vis && run >= 0) {
            const t0 = run / steps, t1 = Math.min(1, (s - 1) / steps);
            if (t1 > t0 || steps === 1) {
              // segments that carry on from the last one's end extend its path instead of starting a new one
              const a = fmt(P[0] + dx * t0) + " " + fmt(P[1] + dy * t0), b = fmt(P[0] + dx * t1) + " " + fmt(P[1] + dy * t1);
              if (a !== b) { out.push((a === last ? "L" : "M" + a + "L") + b); last = b; }
            }
            run = -1;
          }
        }
      }
      if (out.length) bucket[key] = (bucket[key] || "") + out.join("");
      if (hout.length) bucket[hkey + "h"] = (bucket[hkey + "h"] || "") + hout.join("");
    });
    return parts;
  }
  function traceGuides(o, parts) {
    const op = Math.round(o.material.userData.base * 20) / 20;
    if (op < 0.03) return;
    const W = innerWidth, H = innerHeight, pa = o.geometry.attributes.position, v = new THREE.Vector3(), out = [];
    for (let i = 0; i < pa.count; i += 2) {
      const a = v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).project(camera);
      const ax = (a.x + 1) / 2 * W, ay = (1 - a.y) / 2 * H;
      const b = v.fromBufferAttribute(pa, i + 1).applyMatrix4(o.matrixWorld).project(camera);
      const bx = (b.x + 1) / 2 * W, by = (1 - b.y) / 2 * H;
      if (Math.hypot(bx - ax, by - ay) > 1) out.push("M" + fmt(ax) + " " + fmt(ay) + "L" + fmt(bx) + " " + fmt(by));
    }
    if (out.length) (parts["Assembly guides"] = parts["Assembly guides"] || {})[op + "d"] = out.join("");
  }
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  // hidden (X-ray) strokes come first, then the screen picture, then everything in view on top
  function framePaths(parts, fg, screen) {
    const pass = hidden => Object.keys(parts).map(name => {
      const ops = Object.keys(parts[name]).filter(op => op.endsWith("h") === hidden);
      if (!ops.length) return "";
      return '<g ' + (hidden ? 'class="xray"' : 'id="' + esc(name.toLowerCase().replace(/[^a-z0-9]+/g, "-")) + '"') + ' data-part="' + esc(name) + '">' +
      ops.map(op => '<path stroke-opacity="' + parseFloat(op) + '"' + (op.endsWith("d") ? ' stroke-dasharray="4 4"' : "") +
        ' d="' + parts[name][op] + '"/>').join("") + "</g>";
    }).join("");
    return pass(true) + (screen || "") + pass(false);
  }
  function svgDoc(body, extra, size, noBg) {
    const { fg, bg } = cssColor(), W = innerWidth, H = innerHeight;
    const [OW, OH] = size || [W, H];
    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + OW + '" height="' + OH +
      '" viewBox="0 0 ' + W + " " + H + '">\n<title>' + esc(document.title) + "</title>\n" + (extra || "") +
      (noBg ? "" : '<rect id="background" width="100%" height="100%" fill="' + bg + '"/>\n') +
      '<g fill="none" stroke="' + fg + '" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">\n' + body + "\n</g>\n</svg>\n";
  }
  // the vector exports trace the line drawing, so the Shaded and Photo styles (gallery only) step aside while they run
  function asLines(fn) {
    const st = window.__bpGetStyle && window.__bpGetStyle();
    const shaded = st && st !== "blueprint";
    if (shaded) window.__bpSetStyle("blueprint");
    try { fn(); } finally { if (shaded) window.__bpSetStyle(st); }
  }
  // the line drawing with the screen picture (if any) underneath it
  function stillBody() {
    const img = screenSVG(), tr = img && screenPlacement();
    return { defs: tr ? screenDefs(img, "screen-media") : "", body: framePaths(traceLines(), cssColor().fg, tr ? screenUse("screen-media", tr) : "") };
  }
  function exportSVG(size) {
    const st = stillBody();
    const svg = svgDoc(st.body, st.defs, size);
    download(fileBase + ".svg", new Blob([svg], { type: "image/svg+xml" }));
  }
  // Animated SVG: the model coming apart and back together, as a loop of frames traced like the still,
  // each shown in turn (SMIL, so it plays in browsers and most viewers)
  function exportAnimatedSVG(size) {
    const N = 14, RAMP = 1.4, HOLD0 = 1.0, HOLD1 = 1.6;
    const slots = [[0, HOLD0]];
    for (let k = 1; k < N - 1; k++) slots.push([k, RAMP / (N - 1)]);
    slots.push([N - 1, HOLD1]);
    for (let k = N - 2; k >= 1; k--) slots.push([k, RAMP / (N - 1)]);
    const T = slots.reduce((s, x) => s + x[1], 0);
    const target = new THREE.Vector3();
    const frames = [];
    const img = screenSVG();
    for (let k = 0; k < N; k++) {
      const x = k / (N - 1), ek = x * x * (3 - 2 * x);
      Object.values(modules).forEach(g => g.position.copy(g.userData.offset).multiplyScalar(ek).add(g.userData.base));
      // the same framing the page uses: the camera eases out as the parts separate
      target.lerpVectors(cA, cE, ek).sub(mid);
      camera.position.copy(dir).multiplyScalar((dA + (dE - dA) * ek) * zoom).add(target);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      const tr = img && screenPlacement();
      frames.push(framePaths(traceLines(), cssColor().fg, tr ? screenUse("screen-media", tr) : ""));
    }
    let t = 0;
    const times = frames.map(() => []);
    slots.forEach(([k, d]) => { times[k].push([t / T, (t + d) / T]); t += d; });
    const body = frames.map((paths, k) => {
      const pts = [];
      times[k].forEach(([a, b]) => { pts.push([a, "visible"], [b, "hidden"]); });
      if (pts[0][0] > 0) pts.unshift([0, "hidden"]);
      const kt = [], vals = [];
      pts.forEach(([a, v]) => {
        if (a >= 1) return;
        if (kt.length && Math.abs(kt[kt.length - 1] - a) < 1e-6) { vals[vals.length - 1] = v; return; }
        kt.push(a); vals.push(v);
      });
      return '<g id="frame-' + k + '" visibility="' + (k === 0 ? "visible" : "hidden") + '"><animate attributeName="visibility" calcMode="discrete" dur="' +
        T.toFixed(2) + 's" repeatCount="indefinite" keyTimes="' + kt.map(v => v.toFixed(4)).join(";") + '" values="' + vals.join(";") + '"/>' + paths + "</g>";
    }).join("\n");
    download(fileBase + "-animated.svg", new Blob([svgDoc(body, img ? screenDefs(img, "screen-media") : "", size)], { type: "image/svg+xml" }));
  }
  // ---------- export mode ----------
  // Export clears the page down to the drawing, the theme swatches and the export bar. The model holds still;
  // you can still turn it, zoom, open or close it and change the theme, and the file is made from exactly that.
  const exportBtn = document.getElementById("export"), bar = document.getElementById("exportbar");
  const SIZES = { screen: 0, "2k": 2048, "4k": 3840, "8k": 7680 };
  const xp = { f: "png", r: "4k" };
  try { Object.assign(xp, JSON.parse(localStorage.getItem("bp-export") || "{}")); } catch (e) {}
  const outSize = () => {
    const W = innerWidth, H = innerHeight, long = SIZES[xp.r];
    if (!long) return [W * 2, H * 2];
    return W >= H ? [long, Math.round(long * H / W)] : [Math.round(long * W / H), long];
  };
  function syncBar() {
    if (!bar) return;
    bar.querySelectorAll("[data-f]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === xp.f)));
    bar.querySelectorAll("[data-r]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.r === xp.r)));
    const open = manual !== null ? manual : explodeTarget === 1;
    bar.querySelectorAll("[data-open]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.open === "1") === open)));
    const [w, h] = outSize();
    const dims = bar.querySelector(".xb-dims");
    if (dims) dims.textContent = w + " × " + h + (xp.f === "svg" || xp.f === "asvg" ? " · vector" : xp.f === "png" ? " · transparent" : "");
    bar.querySelector(".xb-open").hidden = xp.f === "asvg";   // the animation opens and closes by itself
    try { localStorage.setItem("bp-export", JSON.stringify(xp)); } catch (e) {}
  }
  function setExporting(on) {
    if (on === exporting || !bar) return;
    exporting = on;
    if (on) {
      if (flow.on) flow.toggle();
      if (detail.mesh) zoomTo(null);
      tapped = null; pickHover = null; refresh();
      if (manual === null) lock(explodeTarget === 1);
    }
    document.body.classList.toggle("exporting", on);
    bar.hidden = !on;
    if (exportBtn) { exportBtn.setAttribute("aria-pressed", String(on)); exportBtn.textContent = on ? "Done" : "Export"; }
    syncBar();
    if (on) { const b = bar.querySelector(".xb-go"); if (b) b.focus(); }
  }
  async function runExport() {
    const go = bar.querySelector(".xb-go"), label = go.textContent;
    go.textContent = "Exporting…"; go.disabled = true;
    await new Promise(r => setTimeout(r, 30));   // let the label paint before the (synchronous) tracing runs
    try {
      const size = outSize();
      if (xp.f === "svg") asLines(() => exportSVG(size));
      else if (xp.f === "asvg") asLines(() => exportAnimatedSVG(size));
      else await exportRaster(xp.f, size);
    } finally { go.textContent = label; go.disabled = false; }
  }
  if (exportBtn && bar) {
    exportBtn.addEventListener("click", e => { e.stopPropagation(); setExporting(!exporting); });
    bar.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.f) xp.f = b.dataset.f;
      else if (b.dataset.r) xp.r = b.dataset.r;
      else if (b.dataset.open) lock(b.dataset.open === "1");
      else if (b.classList.contains("xb-go")) { runExport(); return; }
      else if (b.classList.contains("xb-done")) { setExporting(false); return; }
      syncBar();
    });
    addEventListener("resize", () => { if (exporting) syncBar(); });
    // while exporting, keys and clicks only set up the shot: no tours, part zooms or screens
    addEventListener("keydown", e => {
      if (!exporting || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "Escape") { e.stopPropagation(); setExporting(false); return; }
      if (k.startsWith("Arrow")) {
        e.stopPropagation(); e.preventDefault();
        if (k === "ArrowLeft") drag.tYaw -= 0.3;
        if (k === "ArrowRight") drag.tYaw += 0.3;
        if (k === "ArrowUp") drag.tPitch = Math.max(PITCH[0], drag.tPitch - 0.15);
        if (k === "ArrowDown") drag.tPitch = Math.min(PITCH[1], drag.tPitch + 0.15);
        return;
      }
      if (k === " " || k === "Enter") {
        if (e.target.closest("button, a, input")) return;
        e.stopPropagation(); e.preventDefault(); lock(!(explodeTarget === 1)); setTimeout(syncBar, 0); return;
      }
      if (!["+", "=", "-", "_", "r", "R", "x", "X", "h", "H"].includes(k)) e.stopPropagation();
    }, true);
    canvas.addEventListener("click", e => { if (exporting) e.stopImmediatePropagation(); }, true);
    canvas.addEventListener("dblclick", () => { if (exporting) setTimeout(syncBar, 0); });
    syncBar();
  }
  window.__bpExport = {
    svg: size => asLines(() => exportSVG(size)), animatedSvg: size => asLines(() => exportAnimatedSVG(size)),
    png: size => exportRaster("png", size), jpg: size => exportRaster("jpg", size), mode: setExporting,
  };

  // one box per part, so a part dragged away still counts as "over the model"
  const partBoxes = pickable.filter(m => m.geometry.index ? m.geometry.index.count : true)
    .filter(m => !m.geometry.boundingBox.isEmpty()).map(m => ({ g: m, b: m.geometry.boundingBox }));
  const corner = new THREE.Vector3();
  function overModel() {
    if (!(pointerIn || domHover)) return false;
    const w = innerWidth, h = innerHeight;
    const px = (mouse.x + 1) / 2 * w, py = (1 - mouse.y) / 2 * h;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    partBoxes.forEach(({ g, b }) => {
      for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)
          .applyMatrix4(g.matrixWorld).project(camera);
        const sx = (corner.x + 1) / 2 * w, sy = (1 - corner.y) / 2 * h;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
    });
    const m = 16;
    return px > x0 - m && px < x1 + m && py > y0 - m && py < y1 + m;
  }

  // ---------- loop ----------
  const tmp = new THREE.Vector3(), camPos = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0), qYaw = new THREE.Quaternion(), qPitch = new THREE.Quaternion();
  const camRight = new THREE.Vector3().crossVectors(UP, dir).normalize();
  let sway = 0, last = performance.now(), frame = 0;
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    frame++;

    const hovering = touchMode ? touchOpen : (drag.on || partDrag.on || overModel());
    if (flow.on) { leaveAt = 0; explodeTarget = flow.explode; }
    else if (detail.mesh) { leaveAt = 0; explodeTarget = 1; }
    else if (manual !== null) { explodeTarget = manual ? 1 : 0; }
    else if (hovering) { leaveAt = 0; explodeTarget = 1; }
    else if (explodeTarget === 1) { if (!leaveAt) leaveAt = now; if (now - leaveAt > 300) explodeTarget = 0; }
    explode = reduceMotion ? explodeTarget : explode + (explodeTarget - explode) * (1 - Math.exp(-dt * 4));
    const open = explodeTarget === 1 && explode > 0.9;
    if (open !== revealed) {
      revealed = open;
      document.body.classList.toggle("open", open);
      HOT.forEach((h, i) => {
        clearTimeout(h.timer);
        if (open) h.timer = setTimeout(() => h.el.classList.add("ready"), i * 35);
        else h.el.classList.remove("ready");
      });
      if (!open) { domHover = pickHover = tapped = null; if (detail.mesh) zoomTo(null); else refresh(); }
    }
    // ease each module so the stack opens from the middle outwards
    const e = explode * explode * (3 - 2 * explode);
    Object.values(modules).forEach(g => g.position.copy(g.userData.offset).multiplyScalar(e).add(g.userData.base));
    updateGuides(e);
    if (scr.tick) scr.tick();
    placeCamera(e, dt);

    if (!reduceMotion && !active && !drag.on && !partDrag.on) sway += dt;
    if (explodeTarget === 0 || flow.on || now < resetUntil) settleParts(reduceMotion ? 1 : 1 - Math.exp(-dt * 6));
    drag.yaw += (drag.tYaw - drag.yaw) * 0.2;
    drag.pitch += (drag.tPitch - drag.pitch) * 0.2;
    parallax.x += (parallax.tx - parallax.x) * 0.04;
    parallax.y += (parallax.ty - parallax.y) * 0.04;
    qYaw.setFromAxisAngle(UP, (reduceMotion ? 0 : Math.sin(sway * 0.2) * V.sway) + parallax.x * V.parallax + drag.yaw);
    qPitch.setFromAxisAngle(camRight, parallax.y * V.parallax * 0.4 + drag.pitch);
    pivot.quaternion.multiplyQuaternions(qPitch, qYaw);

    const fg = lineMats[0].color;
    if (extras.tick) extras.tick(now, dt, e, fg);
    flow.tick(now, fg);
    lineMats.concat(extras.mats || []).forEach(m => {
      const u = m.userData;
      u.k += (u.target - u.k) * 0.15;
      m.opacity = Math.min(1, u.base * u.k);
    });

    if (wantPick || (pointerIn && frame % 4 === 0)) pick();

    // place DOM hotspots
    camera.getWorldPosition(camPos);
    const w = innerWidth, h = innerHeight;
    const checkOcc = frame % 6 === 0;
    HOT.forEach(hs => {
      hs.anchor.getWorldPosition(tmp);
      const world = tmp.clone();
      tmp.project(camera);
      const x = (tmp.x + 1) / 2 * w, y = (1 - tmp.y) / 2 * h;
      hs.el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      hs.el.classList.toggle("flip", x > w * 0.74);
      if (checkOcc) {
        const v = world.clone().sub(camPos);
        const dist = v.length();
        ray.set(camPos, v.normalize());
        ray.far = dist - rA * 0.01;
        const blocked = ray.intersectObjects(occluders, false).length > 0;
        ray.far = Infinity;
        hs.el.classList.toggle("hidden", blocked && hs !== active);
      }
    });

    scene.updateMatrixWorld();
    updateSilhouettes();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
