// Morph handheld (a concept design): the model script for the blueprint engine, which morph/build.js inlines after
// the generated geometry (and lib/screen-runtime.js). The status display beside the dome always shows the time,
// the controller's sync and the battery. "/" (or the Animate button) turns on the screen: the start screen's orb
// turns, start is pressed, and a game of bricks plays, the D-pad rocking with the paddle and the controller
// rumbling at each hit. In the Photo style the screens use the console's own light-grey and graphite colours.
(function () {
  "use strict";
  const G = window.MRP_GEOMETRY;
  const DETAIL = {
    "Console Front Shell": ["Console shell", "Satin cream plastic with a bright chamfer round the front edge, holding the screen and speaker."],
    "Console Back Shell": ["Back shell", "The back half of the console, with vents near the top."],
    "Side Module": ["Side module", "A tower on the console's right with the glow dome, the status display and its own little board."],
    "Speaker Grille": ["Speaker slots", "Three staggered rows of slots under the screen."],
    "Side Buttons": ["Side buttons", "Orange tabs on either side: power on the left, a shoulder button and a mode switch on the module."],
    "Screen Bezel": ["Screen bezel", "A graphite surround with a polished frame, setting the screen into the cream face."],
    "Screen Glass": ["Screen glass", "Cover glass over the 4:3 display."],
    "Display": ["Display", "A 4:3 panel, square enough for retro games, bright and sharp up close."],
    "Console Board": ["Console board", "The processor, memory, storage, wireless and power chips, with the connector to the side module."],
    "Processor and Memory": ["Processor and memory", "A small, efficient processor beside its memory, storage and wireless chips."],
    "Heat Spreader": ["Heat spreader", "A copper plate that spreads the processor's warmth into the shell. No fan, so it's silent."],
    "Console Battery": ["Battery", "A flat cell under the screen powering the console for hours away from the plinth."],
    "Speaker": ["Speaker", "A full-range driver in its own small box behind the slots."],
    "Dome Bezel": ["Dome bezel", "A polished ring holding the dome."],
    "Glow Dome": ["Glow dome", "Translucent red, lit from inside: it pulses when you start, flashes with the game and glows while charging."],
    "Dome Light": ["Dome light", "The LED and diffuser under the dome."],
    "Status Display": ["Status display", "A tall, narrow pixel display: the time, the controller's sync and the battery."],
    "Module Button": ["Module button", "A small orange key under the status display."],
    "Module Board": ["Module board", "Drives the dome's light and the status display."],
    "Dial": ["Dial", "A knurled copper dial on top for the volume, and for scrolling menus."],
    "Plinth": ["Plinth", "The base the console stands on, which charges it; the light on its front shows it's charging."],
    "Controller Base": ["Controller base", "The bottom half of the controller, with USB-C at the front."],
    "Controller Top": ["Controller top", "A silver-cream rim round the graphite face plate."],
    "Face Plate": ["Face plate", "Graphite, carrying the D-pad, the orange button disc and the row of keys along the top."],
    "Buttons": ["Orange keys", "Select and home either side of start, two small keys in the middle and the orange disc under A, B, X and Y."],
    "Face Buttons": ["A B X Y", "Four cream buttons on the orange disc."],
    "D-pad Well": ["D-pad well", "The dished recess the D-pad rocks in."],
    "D-pad": ["D-pad", "One cross that rocks on a pivot in its centre, closing a contact under each arm."],
    "Start Button": ["Start", "The middle key of the three along the top."],
    "Controller Board": ["Controller board", "A contact under every button, the chip that reads them and the wireless link to the console."],
    "Controller Battery": ["Controller battery", "A small cell; the controller charges over USB-C."],
    "Rumble Motor": ["Rumble motor", "Spins an off-centre weight to shake the controller."],
  };

  window.BLUEPRINT_MODEL = {
    screenPart: "Screen Glass",
    screenGlass: ["Screen Glass"],
    screenAnimation: true,
    geometry: G,
    themeKey: "mrp-theme",
    touchHint: "Tap the Morph to take it apart",
    view: { az: 30, el: 24, fit: 0.9 },
    spoolOf: o => o.spool || null,
    occluders: ["Console Front Shell", "Console Back Shell", "Side Module", "Controller Top", "Controller Base", "Face Plate", "Screen Bezel", "Plinth"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/Console Front Shell|Console Back Shell|Side Module/, ["paint", { color: 0xece4d6, roughness: 0.4, clearcoat: 0.3 }]],
      [/Controller Base|Controller Top/, ["alu", { color: 0xe8e3da, roughness: 0.26 }]], [/Plinth/, ["plastic", { color: 0xcfc8bc, roughness: 0.45 }]],
      [/Screen Bezel/, ["plastic", { color: 0x1c1b1a, roughness: 0.28, clearcoat: 0.6 }]], [/Screen Glass/, "clearGlass"], [/^Display$|Status Display/, "glass"],
      [/Speaker Grille/, ["plastic", { color: 0x3b3734 }]], [/Face Plate|D-pad Well/, ["plastic", { color: 0x2b2928, roughness: 0.5 }]],
      [/^D-pad$/, ["plastic", { color: 0x47433f, roughness: 0.42 }]], [/Face Buttons/, ["plastic", { color: 0xe9e0cf, roughness: 0.35 }]],
      [/Side Buttons|Module Button|^Buttons$|Start Button/, ["plastic", { color: 0xf0742a, roughness: 0.32, clearcoat: 0.6 }]],
      [/^Dial$/, ["copper", { color: 0xd8743c, roughness: 0.3 }]], [/Dome Bezel/, "nickel"],
      [/Glow Dome/, ["clearGlass", { color: 0xd9452c, opacity: 0.62, emissive: 0x9a2a10, emissiveIntensity: 0.7 }]],
      [/Board/, "pcb"], [/Processor/, "chip"], [/Heat Spreader/, "copper"], [/Battery/, "battery"], [/Speaker$|Dome Light/, "plastic"], [/Rumble/, "steel"],
    ],

    setup(E) {
      const rr = window.BP_rr;
      const photo = () => window.__bpGetStyle && window.__bpGetStyle() === "photo";
      const LOOP = 14, state = { tilt: 0, press: 0, rumble: 0, dial: 0 };
      let game = null, lastT = 0;
      function newGame() {
        const bricks = [];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) bricks.push({ x: 92 + c * 94, y: 120 + r * 42, on: true });
        return { bx: 512, by: 520, vx: 330, vy: -360, px: 512, bricks, score: 0 };
      }
      function splash(ctx, t, W, H, a) {
        ctx.globalAlpha = a;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = "400 34px 'IBM Plex Mono', ui-monospace, monospace";
        if (Math.floor(t * 1.6) % 2 === 0 || t > 5.2) ctx.fillText("Press <start>", W / 2, 110);
        // the orb, its highlight sliding round as it turns
        const cx = W / 2, cy = H / 2, R = 120, hx = cx + Math.cos(t * 1.4) * 55, hy = cy - 40 + Math.sin(t * 1.4) * 18;
        const fg = ctx.fillStyle;
        const gr = ctx.createRadialGradient(hx, hy, 6, cx, cy, R);
        gr.addColorStop(0, ctx.canvas.dataset.hi); gr.addColorStop(0.4, ctx.canvas.dataset.mid); gr.addColorStop(1, ctx.canvas.dataset.lo);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = fg; ctx.lineWidth = 3; ctx.stroke();
        ctx.font = "400 28px 'IBM Plex Mono', ui-monospace, monospace";
        ctx.fillText("Welcome to Morph.", W / 2, H - 100);
        ctx.globalAlpha = 1;
      }
      function bricks(ctx, dt, W, H) {
        const g = game;
        if (!g) return;
        // the paddle chases the ball; the D-pad leans the way it moves
        const want = g.bx + Math.sin(g.by / 60) * 30, dx = Math.max(-520 * dt, Math.min(520 * dt, want - g.px));
        g.px += dx; state.tilt = dt ? Math.max(-1, Math.min(1, dx / (520 * dt))) : 0;
        g.bx += g.vx * dt; g.by += g.vy * dt;
        if (g.bx < 20 || g.bx > W - 20) { g.vx *= -1; g.bx = Math.max(20, Math.min(W - 20, g.bx)); }
        if (g.by < 80) { g.vy = Math.abs(g.vy); }
        if (g.by > H - 92 && g.vy > 0 && Math.abs(g.bx - g.px) < 90) { g.vy = -Math.abs(g.vy); g.vx += (g.bx - g.px) * 2; g.vx = Math.max(-480, Math.min(480, g.vx)); }
        if (g.by > H + 20) { g.bx = g.px; g.by = H - 120; g.vy = -360; }
        g.bricks.forEach(b => {
          if (b.on && Math.abs(g.bx - b.x) < 46 && Math.abs(g.by - b.y) < 20) { b.on = false; g.vy *= -1; g.score += 10; state.rumble = 1; }
        });
        if (!g.bricks.some(b => b.on)) g.bricks.forEach(b => { b.on = true; });
        ctx.lineWidth = 3;
        g.bricks.forEach(b => { if (b.on) { rr(ctx, b.x - 42, b.y - 15, 84, 30, 6); ctx.stroke(); } });
        rr(ctx, g.px - 80, H - 80, 160, 18, 9); ctx.fill();
        ctx.beginPath(); ctx.arc(g.bx, g.by, 12, 0, Math.PI * 2); ctx.fill();
        ctx.font = "500 26px 'IBM Plex Mono', ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText("MORPH", 30, 40); ctx.textAlign = "right"; ctx.fillText(String(g.score).padStart(5, "0"), W - 30, 40);
      }
      const mix = (a, b, k) => {
        const h = c => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : null; };
        const A = h(a), B = h(b);
        return A && B ? "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(",") + ")" : a;
      };
      const palette = (ctx, W, H, fg, bg) => {
        // the console's own screen colours in the Photo style, the drawing's colours otherwise
        const P = photo() ? ["#2a2522", "#ece8e2"] : [fg, bg];
        ctx.fillStyle = P[1]; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = ctx.strokeStyle = P[0];
        // the orb: a light highlight fading to a dark edge, whichever way round the colours are
        const light = photo() ? "#ffffff" : fg, dark = photo() ? "#2a2522" : mix(bg, fg, 0.18);
        ctx.canvas.dataset.hi = light; ctx.canvas.dataset.mid = mix(light, dark, 0.55); ctx.canvas.dataset.lo = dark;
      };
      const screen = window.BP_screenAnimation(E, {
        screen: G.screen, part: "Screen Glass", width: 1024, height: 768, still: 3,
        toggle: on => { game = null; if (!on) Object.assign(state, { tilt: 0, press: 0 }); },
        draw(ctx, T, { W, H, fg, bg }) {
          palette(ctx, W, H, fg, bg);
          const t = T % LOOP, dt = Math.max(0, Math.min(0.1, t - lastT));
          lastT = t;
          state.press = t > 5.4 && t < 5.9 ? 1 : 0;
          if (t < 5.9) { game = null; splash(ctx, T, W, H, 1); }
          else if (t < 6.5) { splash(ctx, T, W, H, 1 - (t - 5.9) / 0.6); }
          else { if (!game) game = newGame(); bricks(ctx, dt, W, H); }
        },
      });
      const status = window.BP_screenAnimation(E, {
        screen: G.statusPanel, part: "Status Display", width: 256, height: 512, always: true, fps: 10,
        draw(ctx, T, { W, H, fg, bg }) {
          const P = photo() ? ["#f4ebe2", "#1c1411"] : [fg, bg];
          ctx.fillStyle = P[1]; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = ctx.strokeStyle = P[0];
          const d = new Date(), hh = String(d.getHours() % 12 || 12).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0");
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.font = "700 96px 'IBM Plex Mono', ui-monospace, monospace";
          ctx.fillText(hh, W / 2, 92); ctx.fillText(mm, W / 2, 190);
          // sync: two arrows chasing round
          const a = E.reduceMotion ? 0 : T * 2.5;
          ctx.lineWidth = 12;
          [0, Math.PI].forEach(o => {
            ctx.beginPath(); ctx.arc(W / 2, 315, 42, a + o, a + o + 2.2); ctx.stroke();
            const e = a + o + 2.2, x = W / 2 + 42 * Math.cos(e), y = 315 + 42 * Math.sin(e);
            ctx.beginPath(); ctx.moveTo(x + 18 * Math.cos(e - 0.4), y + 18 * Math.sin(e - 0.4)); ctx.lineTo(x - 14 * Math.sin(e), y + 14 * Math.cos(e)); ctx.lineTo(x - 18 * Math.cos(e + 0.4), y - 18 * Math.sin(e + 0.4)); ctx.fill();
          });
          // battery
          ctx.lineWidth = 8; rr(ctx, W / 2 - 60, 410, 108, 54, 8); ctx.stroke(); ctx.fillRect(W / 2 + 52, 425, 12, 24);
          ctx.fillRect(W / 2 - 48, 422, 58, 30);
        },
      });
      const sp = n => (E.spinners[n] || [])[0];
      const FWD = new THREE.Vector3(0, 0, -1), UP = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0);
      let tilt = 0, press = 0, rum = 0, rumA = 0, t = 0;
      return {
        mats: [screen.mat, status.mat],
        tick(now, dt) {
          if (!E.reduceMotion) t += dt;
          screen.tick(now); status.tick(now);
          const on = screen.isOn() && !E.reduceMotion, k = Math.min(1, dt * 14);
          tilt += ((on ? state.tilt : 0) - tilt) * k;
          press += ((on ? state.press : 0) - press) * Math.min(1, dt * 25);
          rum = Math.max(0, rum - dt * 3); if (on && state.rumble) { rum = 1; state.rumble = 0; }
          rumA += rum * 60 * dt;
          const d = sp("dpad"); if (d) d.quaternion.setFromAxisAngle(FWD, -tilt * 0.12);
          const s = sp("start"); if (s) s.position.y = -1.1 * press;
          const r = sp("rumble"); if (r) r.quaternion.setFromAxisAngle(X, rumA);
          const di = sp("dial"); if (di) di.quaternion.setFromAxisAngle(UP, Math.sin(t * 0.5) * 0.6);
        },
        recolor(fg, bg) { screen.recolor(fg, bg); status.recolor(fg, bg); },
      };
    },
  };
})();
