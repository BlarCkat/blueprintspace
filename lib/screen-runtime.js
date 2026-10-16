// A looping animation on a model's screen (or any flat panel: o.always keeps it on, with no key), drawn into a 2D canvas and mapped onto the screen's active area
// (G.screen: origin, right and top corners) just in front of it. Off until "/" turns it on (the Animate button
// on touch screens sends the same key); each press toggles it. Build scripts put this before the model script.
window.BP_screenAnimation = function (E, o) {
  const { toThree, renderer, partGroups, byName, reduceMotion } = E;
  const S = o.screen, W = o.width || 1280, H = o.height || 720;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  mat.userData = { base: 1, k: 1, target: 1 };
  const p0 = toThree(...S.origin), pr = toThree(...S.right), pt = toThree(...S.top);
  const u = pr.clone().sub(p0), v = pt.clone().sub(p0);
  const lift = u.clone().cross(v).normalize().multiplyScalar(Math.max(0.1, u.length() * 0.0015));
  const pq = pr.clone().add(pt).sub(p0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([p0, pr, pq, pt].flatMap(p => p.clone().add(lift).toArray()), 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 3;
  mesh.raycast = () => {};
  mesh.visible = false;
  partGroups[o.part].add(mesh);
  if (byName[o.part]) byName[o.part].mats.push(mat);

  let on = !!o.always, t0 = 0, fg = "#fff", bg = "#141414", last = -1;
  mesh.visible = on;
  if (!o.always) addEventListener("keydown", e => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || (e.target.closest && e.target.closest("input, textarea, [contenteditable]"))) return;
    e.preventDefault();
    on = !on;
    mesh.visible = on;
    t0 = performance.now();
    last = -1;
    if (o.toggle) o.toggle(on);
  });
  function tick(now) {
    if (!on) return;
    const t = reduceMotion ? (o.still || 4) : (now - t0) / 1000;
    const frame = Math.floor(t * (o.fps || 30));
    if (frame === last) return;
    last = frame;
    ctx.save();
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = fg; ctx.strokeStyle = fg;
    o.draw(ctx, t, { W, H, fg, bg });
    ctx.restore();
    tex.needsUpdate = true;
  }
  function recolor(f, b) { fg = f; bg = b; last = -1; }
  return { tick, recolor, mat, isOn: () => on };
};
// small drawing helpers shared by the screens
window.BP_rr = function (ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};
