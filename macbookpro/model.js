// MacBook Pro 14 (M5): the model script for the blueprint engine, which macbookpro/build.js inlines after the
// generated geometry. Like the Spectre, the laptop brings a terminal session for its screen ("/") and an
// interactive "how it works" (".") that follows a key press or a trackpad click from your finger to the display.
(function () {
  "use strict";
  const G = window.MBP_GEOMETRY;

  // ---------- part notes, shown when you click a part ----------
  const DETAIL = {
    "Top Case": ["Unibody top case", "Machined from one block of recycled aluminium, side walls and all. The keyboard sits in a well cut into it, the trackpad drops into an opening below, and the ports are cut through its sides."],
    "Ports": ["Ports", "MagSafe 3, two Thunderbolt 4 ports and the headphone jack down the left; HDMI, a third Thunderbolt 4 port and the SDXC slot down the right."],
    "Speaker Grilles": ["Speaker grilles", "Hundreds of tiny holes drilled either side of the keyboard let the tweeters and woofers underneath fire straight up at you."],
    "Bottom Case": ["Bottom case", "A single aluminium plate with softly rounded edges, held on by screws round its rim. There's nothing to service under it but it's how everything comes out."],
    "Feet": ["Rubber feet", "Four round feet lift the case off the desk so air can get to the intake along the sides."],
    "Battery Cells": ["72.4 Wh battery", "Six lithium-ion cells: a pair under each palm rest and a thinner pair under the trackpad. Good for up to 24 hours of video."],
    "Battery Management": ["Battery management board", "Balances the six cells, measures the charge going in and out, and stops charging at the level macOS asks for."],
    "Logic Board": ["Logic board", "One compact board along the back of the base. The M5 sits in the middle, the storage on its left, Thunderbolt controllers and power circuits round the edges."],
    "M5": ["Apple M5", "A system on a chip built on third-generation 3 nm: a 10-core CPU, a 10-core GPU with a Neural Accelerator in every core, a 16-core Neural Engine, and the display, media and security engines, all on one die."],
    "Unified Memory": ["Unified memory", "Memory packages right on the M5's substrate, shared by the CPU, GPU and Neural Engine with nothing copied between them. 16 GB, up to 32 GB, at 153 GB/s."],
    "SSD": ["SSD", "Flash memory chips soldered to the logic board; the storage controller is part of the M5. 512 GB, up to 4 TB."],
    "Board Components": ["Power and I/O parts", "Inductors and capacitors feed the M5 clean power, retimers keep the Thunderbolt signals sharp, and connectors take the display, keyboard, trackpad and battery."],
    "Fan Housing": ["Fan housing", "A blower housing that pulls air in from below and turns it sideways through the fin stack and out of the vent behind the hinge."],
    "Fan Impeller": ["Fan impeller", "Thirty-one curved blades with uneven spacing, so the fan hums at no single pitch and stays quiet, and stops altogether when the work is light."],
    "Fin Stack": ["Copper fin stack", "Thin copper fins soldered under the heat pipe give the heat a large surface to leave into the fan's air."],
    "Heat Spreader": ["Heat spreader", "A copper plate pressed onto the M5 die and memory, spreading their heat out to the heat pipe."],
    "Heat Pipe": ["Heat pipe", "A sealed, flattened copper pipe. A little water inside boils at the chip and condenses at the fins, moving heat far faster than solid copper would."],
    "Speakers": ["Six-speaker sound system", "Two enclosures either side of the keyboard, each with a tweeter and a pair of force-cancelling woofers mounted back to back so they shake the case less."],
    "Trackpad Glass": ["Force Touch trackpad", "A large glass surface that doesn't move. Press anywhere and it clicks the same way; press harder for a second click."],
    "Taptic Engine": ["Taptic Engine", "Strain gauges under the corners measure how hard you press, and an electromagnetic actuator taps the glass sideways so it feels like a click."],
    "Keyboard": ["Magic Keyboard", "Scissor-switch keys with a full-height function row, an inverted-T arrow cluster, backlighting under every key and Touch ID in the top-right key."],
    "Hinge": ["Hinge", "One long barrel across the back of the base. Friction inside holds the display wherever you leave it, and the display cables run through it."],
    "Display Housing": ["Display enclosure", "The lid's aluminium shell, machined from one piece like the base. It carries the panel, the antennas along the top and the camera in the notch."],
    "Display Glass": ["Display glass", "Cover glass over the whole front of the lid, with the option of a nano-texture finish that cuts glare without a matte coating."],
    "Liquid Retina XDR": ["Liquid Retina XDR display", "14.2 inches, 3024 x 1964. Thousands of mini-LEDs light it from behind in local dimming zones: 1000 nits for everyday work, up to 1600 nits peak for HDR, and ProMotion up to 120 Hz."],
    "Camera": ["12 MP Center Stage camera", "Sits in the notch above the menu bar. Its wide sensor lets Center Stage keep you in frame as you move."],
  };

  window.BLUEPRINT_MODEL = {
    screenPart: "Liquid Retina XDR",   // your photo or video goes on this part's screen
    screenGlass: ["Display Glass"],
    geometry: G,
    themeKey: "mbp14-theme",
    touchHint: "Tap the laptop to take it apart",
    view: { az: 45, el: 28 },
    occluders: ["Top Case", "Bottom Case", "Display Housing", "Display Glass", "Keyboard"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    // shaded and photo styles: silver aluminium, a black keyboard and hinge
    materials: [
      [/^Top Case$|^Bottom Case$|Display Housing/, "alu"],
      [/^Ports$/, ["plastic", { color: 0x0b0b0c }]],
      [/Hinge/, ["plastic", { color: 0x16171a, roughness: 0.45 }]],
      [/^Keyboard$/, ["plastic", { color: 0x111214, roughness: 0.5 }]],
      [/Trackpad Glass/, ["alu", { color: 0xb4b8be, metalness: 0.6, roughness: 0.42, tex: null }]],
      [/Display Glass/, "clearGlass"], [/Liquid Retina XDR/, "glass"],
      [/Feet/, "rubber"], [/Battery Cells/, "battery"], [/Battery Management|Logic Board/, "pcb"],
      [/^M5$|Unified Memory|SSD|Board Components/, "chip"],
      [/Fin Stack|Heat Pipe|Heat Spreader/, "copper"], [/Taptic Engine/, "steel"],
      [/Fan Housing|Fan Impeller|Speakers|Camera/, "plastic"],
    ],

    setup(E) {
      const { toThree, renderer, partGroups, byName, reduceMotion } = E;
      // ---------- looping terminal session on the display ----------
      // drawn into a 2D canvas (16:10, the area below the notch) and mapped onto it in front of the glass;
      // each typed character lights its key on the model's keyboard
      const keys = E.keyPresser({ keys: G.keys, top: G.keyTop, group: partGroups["Keyboard"], enter: "return" });
      const term = (function () {
        const S = G.screen;
        const W = 1440, H = 900, PAD = 44, BAR = 54, FS = 30, LH = 40;
        const ROWS = Math.floor((H - BAR - PAD * 1.4) / LH);
        const cv = document.createElement("canvas");
        cv.width = W; cv.height = H;
        const ctx = cv.getContext("2d");
        const tex = new THREE.CanvasTexture(cv);
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
        mat.userData = { base: 1, k: 1, target: 1 };
        const o = toThree(...S.origin), r = toThree(...S.right), t = toThree(...S.top);
        const q = r.clone().add(t).sub(o);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute([...o.toArray(), ...r.toArray(), ...q.toArray(), ...t.toArray()], 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
        geo.setIndex([0, 1, 2, 0, 2, 3]);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 3;
        partGroups["Liquid Retina XDR"].add(mesh);
        byName["Liquid Retina XDR"].mats.push(mat);

        const PROMPT = "m5@macbook-pro ~/studio % ";
        const bar = (p, n) => "[" + "#".repeat(Math.round(p * n)) + ".".repeat(n - Math.round(p * n)) + "]";
        // the session: typed commands, printed output, live progress bars; it loops forever
        const SCRIPT = [
          ["cmd", "fastfetch --logo none"],
          ["out", "OS      macOS Tahoe 26", 60], ["out", "Host    MacBook Pro (14-inch, M5)", 60],
          ["out", "Chip    Apple M5 (10-core CPU, 10-core GPU)", 60], ["out", "Memory  5.2 GiB / 16 GiB unified", 60],
          ["out", "Display 3024x1964 @ 120 Hz Liquid Retina XDR", 60], ["out", "Battery 72.4 Wh - 96% (on battery)", 400],
          ["cmd", "git pull origin main"],
          ["out", "remote: Enumerating objects: 42, done.", 140], ["out", "Updating 8f3c1a2..d41e07b", 120],
          ["out", "Fast-forward  12 files changed, 318 insertions(+), 41 deletions(-)", 500],
          ["cmd", "swift build -c release"],
          ["out", "Building for production...", 300],
          ["bar", "compiling 412 files", 1800, "Build complete! (14.62s)"], ["ok", "studio linked", 600],
          ["cmd", "swift test --parallel"],
          ["bar", "running 214 tests", 2200, "Executed 214 tests, with 0 failures"], ["ok", "all suites green", 600],
          ["cmd", "python3 render.py --scene laptop --device mps"],
          ["bar", "rendering 3600x2400", 2600, "saved laptop_render.png"],
          ["out", "GPU  Apple M5 (10-core)  -  fan 1700 rpm  -  41 C", 1600],
          ["cmd", "clear"], ["clear", 400],
        ];
        let lines = [], step = 0, typed = 0, t0 = performance.now(), dirty = true, cur = null, lastDraw = 0;
        function push(text, kind) { lines.push({ text, kind }); if (lines.length > ROWS) lines.shift(); dirty = true; }
        function next(now) { step = (step + 1) % SCRIPT.length; typed = 0; t0 = now; cur = null; }

        function update(now) {
          const s = SCRIPT[step], dt = now - t0;
          if (s[0] === "cmd") {
            if (!cur) { cur = { text: PROMPT, kind: "cmd" }; push(cur.text, "cmd"); cur = lines[lines.length - 1]; t0 = now + 350; }
            const n = Math.max(0, Math.min(s[1].length, Math.floor((now - t0) / 55)));
            if (n !== typed) { if (n > typed) keys.char(s[1][n - 1]); typed = n; cur.text = PROMPT + s[1].slice(0, n); dirty = true; }
            if (n === s[1].length && now - t0 > s[1].length * 55 + 260) { keys.press("return"); next(now); }
          } else if (s[0] === "out" || s[0] === "ok") {
            if (!cur) { cur = true; push((s[0] === "ok" ? "✓ " : "") + s[1], s[0]); }
            if (dt > s[2]) next(now);
          } else if (s[0] === "bar") {
            if (!cur) { push("", "bar"); cur = lines[lines.length - 1]; }
            const p = Math.min(1, dt / s[2]);
            const txt = s[1].padEnd(22) + bar(p, 28) + String(Math.round(p * 100)).padStart(4) + "%";
            if (txt !== cur.text) { cur.text = txt; dirty = true; }
            if (p >= 1) { cur.kind = "out"; push(s[3], "out"); next(now); }
          } else if (s[0] === "clear") {
            if (!cur) { cur = true; lines = []; dirty = true; }
            if (dt > s[1]) next(now);
          }
        }

        let fg = "#fff", bg = "#141414";
        function draw(now) {
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = fg; ctx.fillStyle = fg;
          // title bar
          ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, BAR); ctx.lineTo(W, BAR); ctx.stroke();
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(34 + i * 30, BAR / 2, 8, 0, Math.PI * 2); ctx.stroke(); }
          ctx.font = "500 20px 'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("zsh — studio — 120×36", W / 2, BAR / 2 + 1);
          ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
          ctx.font = "400 " + FS + "px 'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace";
          lines.forEach((l, i) => {
            const y = BAR + PAD + i * LH + FS * 0.4;
            ctx.globalAlpha = l.kind === "out" ? 0.72 : 1;
            if (l.kind === "cmd") {
              ctx.globalAlpha = 0.55; ctx.fillText(PROMPT, PAD, y);
              ctx.globalAlpha = 1; ctx.fillText(l.text.slice(PROMPT.length), PAD + ctx.measureText(PROMPT).width, y);
            } else ctx.fillText(l.text, PAD, y);
          });
          // blinking block cursor after the command being typed (or on a fresh line)
          const last = lines[lines.length - 1];
          const typing = last && last.kind === "cmd" && SCRIPT[step][0] === "cmd";
          const idle = SCRIPT[step][0] === "clear" || reduceMotion;
          if ((typing || idle) && (Math.floor(now / 530) % 2 === 0 || reduceMotion)) {
            const row = typing ? lines.length - 1 : Math.min(lines.length, ROWS - 1);
            const x = typing ? PAD + ctx.measureText(last.text).width + 3 : PAD;
            ctx.globalAlpha = 0.9;
            ctx.fillRect(x, BAR + PAD + row * LH + FS * 0.4 - FS * 0.82, FS * 0.6, FS * 1.02);
          }
          ctx.globalAlpha = 1;
          tex.needsUpdate = true;
        }

        // optional: off until the "/" key turns it on; each press toggles it
        let on = false;
        mesh.visible = false;
        addEventListener("keydown", e => {
          if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || e.target.closest("input, textarea, [contenteditable]")) return;
          e.preventDefault();
          on = !on;
          mesh.visible = on;
          if (!on) keys.clear();
          if (on && !reduceMotion) { lines = []; step = 0; typed = 0; cur = null; t0 = performance.now(); dirty = true; }
        });
        function tick(now) {
          if (!on) return;
          if (!reduceMotion) update(now);
          const blink = Math.floor(now / 530);
          if (dirty || blink !== lastDraw) { lastDraw = blink; dirty = false; draw(now); }
        }
        function recolor(f, b) { fg = f; bg = b; dirty = true; }
        if (reduceMotion) {   // a still frame of the session
          [["cmd", PROMPT + "swift build -c release"], ["out", "Building for production..."], ["out", "Build complete! (14.62s)"], ["ok", "✓ studio linked"]]
            .forEach(([k, s]) => push(s, k));
        }
        if (document.fonts) document.fonts.ready.then(() => { dirty = true; });
        return { tick, recolor, mat, geometry: geo };
      })();

      return {
        term,
        mats: [term.mat],
        tick(now, dt, e, fg) { term.tick(now); keys.tick(now, fg); },
        recolor(fg, bg) { term.recolor(fg, bg); },
      };
    },

    flow(E) {
      const { toThree, renderer, scene, camera, canvas, modules, partGroups, pickable, ray, mouse, reduceMotion } = E;
      const term = E.extras.term;
      const refresh = f => E.refresh(f);
      const anchors = {};
      Object.keys(G.flow).forEach(k => {
        const [x, y, z, m] = G.flow[k];
        const a = new THREE.Object3D();
        a.position.copy(toThree(x, y, z));
        modules[m].add(a);
        anchors[k] = a;
      });
      anchors.kin = new THREE.Object3D(); partGroups["Keyboard"].add(anchors.kin);
      anchors.pin = new THREE.Object3D(); partGroups["Trackpad Glass"].add(anchors.pin);
      const KEYS = G.keys.map(k => ({ cx: k[0], cy: k[1], w: k[2], h: k[3], label: k[4] }));
      const byLabel = {};
      KEYS.forEach(k => { byLabel[k.label] = k; });
      const [TPX, TPY, TPW, TPH] = G.touchpad;
      const NICE = { esc: "Esc", touchid: "Touch ID", delete: "Delete", tab: "Tab", caps: "Caps Lock", return: "Return", shift: "Shift",
        rshift: "Shift", fn: "Fn", ctrl: "Control", opt: "Option", ropt: "Option", cmd: "Command", rcmd: "Command", space: "Space",
        left: "Left arrow", up: "Up arrow", down: "Down arrow", right: "Right arrow" };
      const nice = l => NICE[l] || l.toUpperCase();
      const CAP = { esc: "esc", touchid: "", delete: "delete", tab: "tab", caps: "caps", return: "return", shift: "shift", rshift: "shift",
        fn: "fn", ctrl: "⌃", opt: "⌥", ropt: "⌥", cmd: "⌘", rcmd: "⌘", space: "", left: "◀", up: "▲", down: "▼", right: "▶" };

      // --- key legends on the model's keyboard (only while this mode is on)
      let kx0 = Infinity, kx1 = -Infinity, ky0 = Infinity, ky1 = -Infinity;
      KEYS.forEach(k => { kx0 = Math.min(kx0, k.cx - k.w / 2); kx1 = Math.max(kx1, k.cx + k.w / 2); ky0 = Math.min(ky0, k.cy - k.h / 2); ky1 = Math.max(ky1, k.cy + k.h / 2); });
      const LW = 2048, LH = Math.round(LW * (ky1 - ky0) / (kx1 - kx0)), LS = LW / (kx1 - kx0);
      const legend = document.createElement("canvas"); legend.width = LW; legend.height = LH;
      const legTex = new THREE.CanvasTexture(legend);
      legTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const legMat = new THREE.MeshBasicMaterial({ map: legTex, transparent: true, depthWrite: false, opacity: 0 });
      const legMesh = new THREE.Mesh(new THREE.PlaneGeometry(kx1 - kx0, ky1 - ky0), legMat);
      legMesh.rotation.x = -Math.PI / 2;
      legMesh.position.copy(toThree((kx0 + kx1) / 2, (ky0 + ky1) / 2, G.keyTop + 0.05));
      legMesh.renderOrder = 4;
      partGroups["Keyboard"].add(legMesh);
      function drawLegends(fg) {
        const c = legend.getContext("2d");
        c.clearRect(0, 0, LW, LH);
        c.fillStyle = fg; c.textAlign = "center"; c.textBaseline = "middle";
        KEYS.forEach(k => {
          const x = (k.cx - kx0) * LS, y = (ky1 - k.cy) * LS;
          const t = k.label in CAP ? CAP[k.label] : k.label.length === 1 ? k.label.toUpperCase() : k.label;
          const big = t.length === 1;
          c.globalAlpha = big ? 0.9 : 0.7;
          c.font = (big ? 500 : 400) + " " + Math.round(Math.min(k.h, 16) * LS * (big ? 0.42 : 0.26)) + "px 'IBM Plex Mono', ui-monospace, Menlo, monospace";
          c.fillText(t, x, y + 1);
        });
        legTex.needsUpdate = true;
      }

      // --- pressed-key flash and trackpad ripple
      const flashMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flashMat);
      flash.rotation.x = -Math.PI / 2; flash.renderOrder = 4;
      partGroups["Keyboard"].add(flash);
      const ripple = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), flashMat.clone());
      ripple.rotation.x = -Math.PI / 2; ripple.renderOrder = 4;
      partGroups["Trackpad Glass"].add(ripple);

      // --- what the laptop shows: a notes window that the typed keys land in, and a pointer that clicks
      const SW = 1440, SH = 900;
      const scv = document.createElement("canvas"); scv.width = SW; scv.height = SH;
      const sc = scv.getContext("2d");
      const scrTex = new THREE.CanvasTexture(scv);
      scrTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide });
      const scr = new THREE.Mesh(term.geometry, scrMat);
      scr.renderOrder = 4;
      partGroups["Liquid Retina XDR"].add(scr);
      let text = "", ptr = { x: SW * 0.62, y: SH * 0.58 }, clickAt = -1e9, lastKey = "", keyAt = -1e9;
      let fgC = "#fff", bgC = "#141414";
      function drawScreen(now) {
        sc.fillStyle = bgC; sc.fillRect(0, 0, SW, SH);
        sc.strokeStyle = fgC; sc.fillStyle = fgC; sc.lineWidth = 2;
        sc.globalAlpha = 0.55;
        sc.beginPath(); sc.moveTo(0, 60); sc.lineTo(SW, 60); sc.stroke();
        for (let i = 0; i < 3; i++) { sc.beginPath(); sc.arc(36 + i * 32, 30, 9, 0, Math.PI * 2); sc.stroke(); }
        sc.font = "500 24px 'IBM Plex Mono', ui-monospace, Menlo, monospace";
        sc.textAlign = "center"; sc.textBaseline = "middle";
        sc.fillText("Notes.txt", SW / 2, 31);
        sc.textAlign = "left"; sc.textBaseline = "alphabetic";
        // text, wrapped
        const FS = 56, LHt = 72, X0 = 70, MAXC = 36;
        sc.font = "400 " + FS + "px 'IBM Plex Mono', ui-monospace, Menlo, monospace";
        const rows = [];
        text.split("\n").forEach(par => { let s = par; do { rows.push(s.slice(0, MAXC)); s = s.slice(MAXC); } while (s.length); });
        const vis = rows.slice(-10);
        sc.globalAlpha = 1;
        if (!text) { sc.globalAlpha = 0.35; sc.fillText("Start typing…", X0, 160); sc.globalAlpha = 1; }
        vis.forEach((r, i) => sc.fillText(r, X0, 160 + i * LHt));
        const lastRow = vis.length ? vis[vis.length - 1] : "";
        if (Math.floor(now / 530) % 2 === 0 && text) {
          sc.fillRect(X0 + sc.measureText(lastRow).width + 4, 160 + (Math.max(vis.length, 1) - 1) * LHt - FS * 0.8, 4, FS);
        } else if (!text && Math.floor(now / 530) % 2 === 0) sc.fillRect(X0 - 8, 160 - FS * 0.8, 4, FS);
        // the key that just landed, big for a moment
        const ka = 1 - (now - keyAt) / 1400;
        if (ka > 0 && lastKey) {
          sc.globalAlpha = ka * 0.9;
          sc.font = "600 46px 'IBM Plex Mono', ui-monospace, Menlo, monospace";
          sc.textAlign = "right"; sc.fillText(lastKey, SW - 60, SH - 60); sc.textAlign = "left";
        }
        // pointer + click ripple
        const ca = (now - clickAt) / 900;
        if (ca >= 0 && ca < 1) {
          sc.globalAlpha = 1 - ca; sc.lineWidth = 3;
          for (const k of [0, 0.25]) { const r = 20 + 90 * Math.max(0, ca - k); sc.beginPath(); sc.arc(ptr.x, ptr.y, r, 0, Math.PI * 2); sc.stroke(); }
        }
        sc.globalAlpha = 1; sc.lineWidth = 3;
        sc.beginPath();
        const P = [[0, 0], [0, 54], [14, 41], [24, 64], [33, 60], [23, 37], [41, 37]];
        P.forEach(([x, y], i) => (i ? sc.lineTo(ptr.x + x, ptr.y + y) : sc.moveTo(ptr.x + x, ptr.y + y)));
        sc.closePath(); sc.fillStyle = bgC; sc.fill(); sc.stroke();
        scrTex.needsUpdate = true;
      }

      // --- signal path: a dashed line whose dashes march from the source to the destination
      const lineMat = new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color() }, opacity: { value: 0 }, offset: { value: 0 }, dash: { value: 3 }, period: { value: 5 } },
        vertexShader: "attribute float lineDistance; varying float vD; void main() { vD = lineDistance; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform vec3 color; uniform float opacity, offset, dash, period; varying float vD; void main() { if (mod(vD - offset, period) > dash) discard; gl_FragColor = vec4(color, opacity); }",
        transparent: true, depthTest: false, depthWrite: false,
      });
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * 8), 3));
      const path = new THREE.Line(lineGeo, lineMat);
      path.renderOrder = 5; path.frustumCulled = false;
      scene.add(path);

      // --- the steps for one input. dist is the zoom as a fraction of the overview distance.
      const BOARD = ["Logic Board", "Board Components"];
      function stepsFor(inp) {
        const key = inp.kind === "key";
        const name = key ? nice(inp.label) : "";
        const first = key ? [
          { t: "You press " + (name.length === 1 ? "“" + name + "”" : name), focus: "kin", dist: 0.24, ex: 0, p: ["kin", "kbFlex"], n: ["Keyboard"], ms: 3200,
            d: inp.label === "touchid"
              ? "The sapphire key reads your fingerprint through a ring sensor. The print never leaves the Mac: it's matched inside the M5's Secure Enclave."
              : "The key's scissor mechanism pushes a dome down until two traces in the keyboard's switch matrix touch. The keyboard controller scans its rows and columns many times a millisecond and finds which one closed." },
          { t: "The press goes to the logic board", focus: "io", dist: 0.3, ex: 1, p: ["kbFlex", "io"], n: ["Keyboard"].concat(BOARD), ms: 3400,
            d: "The controller turns the key into a short report and sends it down a flex cable to the logic board, and on into the M5." },
        ] : [
          { t: "You click the trackpad", focus: "pin", dist: 0.24, ex: 0, p: ["pin", "padFlex"], n: ["Trackpad Glass", "Taptic Engine"], ms: 3200,
            d: "Strain gauges under the corners feel how hard you press while a grid of electrodes tracks where your finger is. The Taptic Engine taps back, so the still glass feels like it clicked." },
          { t: "The click goes to the logic board", focus: "io", dist: 0.3, ex: 1, p: ["padFlex", "boardFront", "io"], n: ["Taptic Engine"].concat(BOARD), ms: 3400,
            d: "The trackpad controller packs the position, the pressure and the click into a short report and sends it to the logic board." },
        ];
        return first.concat([
          { t: "The M5 stops to listen", focus: "soc", dist: 0.2, ex: 1, p: ["io", "soc"], n: ["M5", "Logic Board"], ms: 3400,
            d: "An interrupt reaches the M5. A CPU core pauses what it was doing, macOS reads the " + (key ? "keyboard" : "trackpad") + " report and hands the event to the app you're using." },
          { t: "Unified memory, shared", focus: "soc", dist: 0.22, ex: 1, p: ["soc", "ram1", "soc", "ram2", "soc"], n: ["M5", "Unified Memory"], ms: 3400,
            d: key ? "The app and your document live in unified memory on the chip's package. The CPU fetches them, adds the character and works out the new line layout."
                   : "The app and the page live in unified memory on the chip's package. The CPU fetches them, works out what was under the pointer and runs the click." },
          { t: "The GPU draws a new frame", focus: "gpu", dist: 0.2, ex: 1, p: ["gpu", "ram1", "gpu", "ram2", "gpu"], n: ["M5", "Unified Memory"], ms: 3400,
            d: "The GPU on the same die reads the very same memory, with nothing copied across, and redraws only the part of the window that changed." },
          { t: "The frame travels to the display", focus: "hinge", dist: 0.42, ex: 1, p: ["soc", "boardRear", "hinge", "lidHinge", "panelDriver", "screen"], n: ["M5", "Hinge", "Liquid Retina XDR"], ms: 3800,
            d: "The M5's display engine sends the frame down a thin cable that runs through the hinge to the panel's timing controller." },
          { t: key ? "And there it is" : "And the click lands", focus: "screen", dist: 0.64, ex: 0, p: [], n: ["Liquid Retina XDR", "Display Glass"], ms: 3600, out: true,
            d: "The timing controller updates the pixels that changed while the mini-LEDs behind them brighten or dim zone by zone. ProMotion refreshes up to 120 times a second; from your finger to the screen took a few milliseconds." },
        ]);
      }

      const box = document.getElementById("flow");
      const elK = box.querySelector(".flow-k"), elT = box.querySelector("b"), elD = box.querySelector("p"), elBar = box.querySelector(".flow-bar i");
      let on = false, steps = null, idx = -1, t0 = 0, fade = 0, inp = null;
      const api = { names: null, explode: 0, get on() { return on; } };
      function caption(k, t, d, n) {
        elK.textContent = k; elT.textContent = t; elD.textContent = d;
        api.names = n; refresh(true);
      }
      function waiting() {
        steps = null; idx = -1; inp = null; api.explode = 0;
        document.body.classList.remove("zoomed");
        caption("How it works", "Press any key or click the laptop",
          "Type on your keyboard, click a key on the drawing, or click the trackpad. Then follow the signal from your finger to the screen.", null);
        elBar.style.transform = "scaleX(0)";
      }
      function show(i, now) {
        const s = steps[i];
        idx = i; t0 = now;
        api.explode = s.ex;
        caption("How it works · " + String(i + 1).padStart(2, "0") + " / " + String(steps.length).padStart(2, "0"), s.t, s.d, s.n);
        if (s.out) {
          if (inp.kind === "key") {
            if (inp.ch === "\b") text = text.slice(0, -1);
            else if (inp.ch) text = (text + inp.ch).slice(-300);
            lastKey = nice(inp.label); keyAt = now;
          } else {
            ptr.x = SW * Math.min(0.9, Math.max(0.08, inp.u)); ptr.y = SH * Math.min(0.88, Math.max(0.12, 1 - inp.v)); clickAt = now;
          }
        }
      }
      function start(input) {
        if (!on || steps) return;
        inp = input;
        if (inp.kind === "key") {
          const k = byLabel[inp.label];
          anchors.kin.position.copy(toThree(k.cx, k.cy, G.keyTop));
          flash.scale.set(k.w, k.h, 1);
          flash.position.copy(toThree(k.cx, k.cy, G.keyTop + 0.08));
        } else {
          anchors.pin.position.copy(toThree(inp.x, inp.y, 10.6));
          ripple.position.copy(toThree(inp.x, inp.y, 10.65));
        }
        steps = stepsFor(inp);
        document.body.classList.add("zoomed");
        show(0, performance.now());
      }
      function toggle() {
        on = !on;
        document.body.classList.toggle("flowing", on);
        box.hidden = !on;
        if (on) waiting();
        else { steps = null; api.names = null; api.explode = 0; document.body.classList.remove("zoomed"); refresh(true); }
      }

      // inputs: real keys (by physical position), clicks on the model's keys, clicks anywhere else on the laptop
      const CODE = { Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]", Backslash: "\\", Semicolon: ";", Quote: "'",
        Comma: ",", Slash: "/", Backquote: "`", Space: "space", Enter: "return", NumpadEnter: "return", ShiftLeft: "shift", ShiftRight: "rshift",
        ControlLeft: "ctrl", ControlRight: "ctrl", AltLeft: "opt", AltRight: "ropt", MetaLeft: "cmd", MetaRight: "rcmd", ArrowLeft: "left",
        ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", Escape: "esc", Backspace: "delete", Tab: "tab", CapsLock: "caps" };
      const charOf = l => l.length === 1 ? l : l === "space" ? " " : l === "return" ? "\n" : l === "delete" ? "\b" : "";
      addEventListener("keydown", e => {
        if (e.ctrlKey || e.metaKey || e.target.closest("input, textarea, [contenteditable]")) return;
        if (e.key === "." && !e.altKey) { e.preventDefault(); toggle(); return; }
        if (!on || e.key === "/" || e.repeat) return;
        let label = CODE[e.code] || null;
        if (!label && /^Key[A-Z]$/.test(e.code)) label = e.code.slice(3).toLowerCase();
        if (!label && /^Digit\d$/.test(e.code)) label = e.code.slice(5);
        if (!label && /^F([1-9]|1[0-2])$/.test(e.code)) label = e.code.toLowerCase();
        if (!label || !byLabel[label]) return;
        e.preventDefault();
        start({ kind: "key", label, ch: e.key.length === 1 ? e.key : charOf(label) });
      });
      const local = new THREE.Vector3();
      canvas.addEventListener("click", () => {
        if (!on || steps) return;
        ray.setFromCamera(mouse, camera);
        const hit = ray.intersectObjects(pickable, false)[0];
        if (!hit) return;
        if (hit.object.name === "Keyboard") {
          partGroups["Keyboard"].worldToLocal(local.copy(hit.point));
          const bx = local.x, by = -local.z;
          let best = null, bd = Infinity;
          KEYS.forEach(k => { const d = Math.max(Math.abs(bx - k.cx) - k.w / 2, 0) + Math.max(Math.abs(by - k.cy) - k.h / 2, 0); if (d < bd) { bd = d; best = k; } });
          start({ kind: "key", label: best.label, ch: charOf(best.label) });
          return;
        }
        let x = TPX, y = TPY;
        if (hit.object.name === "Trackpad Glass") {
          partGroups["Trackpad Glass"].worldToLocal(local.copy(hit.point));
          x = local.x; y = -local.z;
        }
        start({ kind: "click", x, y, u: (x - TPX) / TPW + 0.5, v: (y - TPY) / TPH + 0.5 });
      });

      // where the camera should look while this mode runs (null = the normal framing)
      api.focus = out => {
        if (!on || !steps) return 0;
        anchors[steps[idx].focus].getWorldPosition(out);
        return steps[idx].dist;
      };

      const pts = [];
      api.tick = (now, fg) => {
        fade += ((on ? 1 : 0) - fade) * 0.12;
        legMat.opacity = fade; scrMat.opacity = fade;
        legMesh.visible = scr.visible = fade > 0.01;
        lineMat.uniforms.color.value.copy(fg); flashMat.color.copy(fg); ripple.material.color.copy(fg);
        flashMat.opacity = 0; ripple.material.opacity = 0;
        if (fade > 0.01) drawScreen(now);
        let showPath = false;
        if (on && steps && now - t0 > steps[idx].ms) {
          if (idx + 1 < steps.length) show(idx + 1, now);
          else waiting();
        }
        if (on && steps) {
          const s = steps[idx], dt = now - t0;
          elBar.style.transform = "scaleX(" + Math.min(1, dt / s.ms).toFixed(3) + ")";
          if (idx === 0) {
            const a = Math.max(0, 1 - dt / 1600);
            if (inp.kind === "key") { flashMat.opacity = 0.55 * a + 0.15; flash.position.y = G.keyTop + 0.08 - 0.5 * a; }
            else { const r = 3 + 26 * ((dt % 1100) / 1100); ripple.scale.set(r, r, r); ripple.material.opacity = 0.8 * (1 - (dt % 1100) / 1100); }
          }
          if (s.p.length > 1) {
            showPath = true;
            pts.length = 0;
            s.p.forEach((k, i) => { pts[i] = anchors[k].getWorldPosition(new THREE.Vector3()); });
            const arr = lineGeo.attributes.position.array;
            for (let i = 0; i < 8; i++) {
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
        const pf = showPath ? fade : 0;
        const u = lineMat.uniforms.opacity;
        u.value += (pf - u.value) * 0.2;
        path.visible = u.value > 0.01;
      };
      api.recolor = (fg, bg) => { fgC = fg; bgC = bg; drawLegends(fg); };
      if (document.fonts) document.fonts.ready.then(() => drawLegends(fgC));
      api.toggle = toggle;
      return api;
    },
  };
})();
