// PlayStation Portable (PSP-1000): the model script for the blueprint engine, which psp/build.js inlines after the
// generated geometry (and lib/screen-runtime.js). "/" (or the Animate button) turns on the screen: the
// XrossMediaBar picks the game, the UMD spins up and a race plays, with the analog nub steering.
(function () {
  "use strict";
  const G = window.PSP_GEOMETRY;
  const DETAIL = {
    "Screen Glass": ["Screen cover", "A clear window over the screen with a black surround, set flush in the front shell."],
    "LCD": ["4.3-inch LCD", "480 x 272 in 16:9, lit from behind. It was the biggest, sharpest screen on a handheld in 2004."],
    "Front Shell": ["Front shell", "Glossy black plastic, rounded at both ends, holding the screen and the buttons."],
    "Back Shell": ["Back shell", "Carries the UMD door, the battery cover and the ports round the edges."],
    "Edge Ports": ["Edges", "Mini USB and the infrared port on top, headphones and DC in at the bottom, the Wi-Fi switch on the left and power and hold on the right."],
    "Memory Stick Slot": ["Memory Stick Duo slot", "Holds game saves, music, video and photos."],
    "Buttons": ["Buttons", "Four direction keys, triangle circle cross square, L and R round the top, and Home, volume, display, sound, Select and Start under the screen."],
    "Analog Nub": ["Analog nub", "A disc that slides a little in any direction rather than tilting, so it keeps the console thin."],
    "Nub Well": ["Nub well", "The recess the analog nub slides in."],
    "Main Board": ["Main board", "The processor, memory, flash, power and audio chips and the Wi-Fi module on one board behind the screen."],
    "CPU": ["CPU", "A MIPS R4000-based Allegrex core running at up to 333 MHz, with a Media Engine and graphics core alongside."],
    "Memory and Chips": ["Memory and chips", "32 MB of main memory, the firmware flash, the power controller and the audio codec."],
    "Wi-Fi Module": ["Wi-Fi", "802.11b for playing with friends nearby or going online."],
    "UMD Drive": ["UMD drive", "A spindle motor spins the disc and a laser on a sliding sled reads it."],
    "Battery": ["Battery", "An 1800 mAh lithium-ion pack under its own cover beside the drive."],
    "UMD Caddy": ["UMD caddy", "The plastic shell the disc lives in, so you never touch the disc itself."],
    "UMD Disc": ["UMD disc", "A 60 mm optical disc holding up to 1.8 GB on two layers."],
    "UMD Door": ["UMD door", "Swings open on the back when you slide the OPEN latch; the window shows the disc inside."],
    "Battery Cover": ["Battery cover", "Slides off the back to change the battery."],
  };

  window.BLUEPRINT_MODEL = {
    screenPart: "LCD",
    screenGlass: ["Screen Glass"],
    screenAnimation: true,
    geometry: G,
    themeKey: "psp-theme",
    touchHint: "Tap the PSP to take it apart",
    view: { az: 35, el: 18, fit: 0.85 },
    spoolOf: o => o.spool || null,
    occluders: ["Screen Glass", "Front Shell", "Back Shell", "UMD Door", "Main Board", "UMD Drive"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/Front Shell|Back Shell|UMD Door|Battery Cover|Edge Ports/, ["plastic", { color: 0x0e0f11, roughness: 0.22 }]],
      [/Buttons|Analog Nub|Nub Well/, ["plastic", { color: 0x2a2c30, roughness: 0.4 }]],
      [/Screen Glass/, "clearGlass"], [/^LCD$/, "glass"], [/Main Board/, "pcb"], [/CPU|Memory|Wi-Fi/, "chip"],
      [/UMD Drive/, ["darkAlu", { color: 0x55595f }]], [/UMD Caddy/, ["plastic", { color: 0xd8dade, roughness: 0.3 }]],
      [/UMD Disc/, ["nickel", { roughness: 0.1 }]], [/^Battery$/, "battery"], [/Memory Stick/, "plastic"],
    ],

    setup(E) {
      const rr = window.BP_rr;
      const CATS = ["Settings", "Photo", "Music", "Video", "Game", "Network"];
      const LOOP = 15.5, state = { spin: 0, nx: 0, nz: 0 };
      const icon = (ctx, k, x, y, s) => {
        ctx.lineWidth = 3; ctx.beginPath();
        if (k === 0) { ctx.arc(x, y, s * 0.3, 0, Math.PI * 2); ctx.moveTo(x + s * 0.12, y); ctx.arc(x, y, s * 0.12, 0, Math.PI * 2); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.moveTo(x + s * 0.3 * Math.cos(a), y + s * 0.3 * Math.sin(a)); ctx.lineTo(x + s * 0.42 * Math.cos(a), y + s * 0.42 * Math.sin(a)); } }
        if (k === 1) { ctx.rect(x - s * 0.4, y - s * 0.3, s * 0.8, s * 0.6); ctx.moveTo(x - s * 0.3, y + s * 0.2); ctx.lineTo(x - s * 0.05, y - s * 0.08); ctx.lineTo(x + s * 0.1, y + s * 0.08); ctx.lineTo(x + s * 0.3, y - s * 0.12); }
        if (k === 2) { ctx.moveTo(x - s * 0.15, y + s * 0.3); ctx.lineTo(x - s * 0.15, y - s * 0.3); ctx.lineTo(x + s * 0.3, y - s * 0.38); ctx.lineTo(x + s * 0.3, y + s * 0.22); ctx.moveTo(x - s * 0.1, y + s * 0.3); ctx.arc(x - s * 0.24, y + s * 0.3, s * 0.12, 0, Math.PI * 2); ctx.moveTo(x + s * 0.36, y + s * 0.22); ctx.arc(x + s * 0.22, y + s * 0.22, s * 0.12, 0, Math.PI * 2); }
        if (k === 3) { ctx.rect(x - s * 0.4, y - s * 0.28, s * 0.8, s * 0.56); ctx.moveTo(x - s * 0.1, y - s * 0.14); ctx.lineTo(x + s * 0.16, y); ctx.lineTo(x - s * 0.1, y + s * 0.14); ctx.closePath(); }
        if (k === 4) { rr(ctx, x - s * 0.42, y - s * 0.2, s * 0.84, s * 0.4, s * 0.2); ctx.moveTo(x - s * 0.22, y - s * 0.1); ctx.lineTo(x - s * 0.22, y + s * 0.1); ctx.moveTo(x - s * 0.32, y); ctx.lineTo(x - s * 0.12, y); ctx.moveTo(x + s * 0.3, y); ctx.arc(x + s * 0.24, y, s * 0.06, 0, Math.PI * 2); }
        if (k === 5) { ctx.arc(x, y, s * 0.36, 0, Math.PI * 2); ctx.ellipse(x, y, s * 0.15, s * 0.36, 0, 0, Math.PI * 2); ctx.moveTo(x - s * 0.36, y); ctx.lineTo(x + s * 0.36, y); }
        ctx.stroke();
      };
      function waves(ctx, t, W, H) {
        ctx.save(); ctx.globalAlpha = 0.35; ctx.lineWidth = 2;
        for (let k = 0; k < 6; k++) {
          ctx.beginPath();
          for (let x = 0; x <= W; x += 16) { const y = H * 0.62 + Math.sin(x / 150 + t * 0.6 + k * 0.5) * (30 + k * 8) + Math.sin(x / 70 - t * 0.4 + k) * 10; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          ctx.stroke();
        }
        ctx.restore();
      }
      function xmb(ctx, t, W, H, cat, item, a) {
        ctx.globalAlpha = a;
        waves(ctx, t, W, H);
        ctx.font = "400 22px 'IBM Plex Mono', ui-monospace, monospace"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText("10/16  12:04", W - 80, 36);
        rr(ctx, W - 64, 26, 34, 18, 3); ctx.lineWidth = 2; ctx.stroke(); ctx.fillRect(W - 60, 30, 22, 10);
        const X0 = 230, STEP = 130;
        CATS.forEach((c, i) => {
          const x = X0 + (i - cat) * STEP;
          if (x < -60 || x > W + 60) return;
          ctx.globalAlpha = a * (i === cat ? 1 : 0.55);
          icon(ctx, i, x, 140, i === cat ? 84 : 62);
          if (i === cat) { ctx.textAlign = "center"; ctx.font = "500 22px 'IBM Plex Sans', system-ui, sans-serif"; ctx.fillText(c, x, 200); }
        });
        if (cat === 4) {
          ["Saved Data Utility", "Memory Stick", "UMD  Racer GP"].forEach((s, i) => {
            const y = 270 + i * 70, on = i === item;
            ctx.globalAlpha = a * (on ? 1 : 0.6);
            ctx.lineWidth = 2; rr(ctx, X0 - 36, y - 26, 72, 52, 8); ctx.stroke();
            ctx.textAlign = "left"; ctx.font = (on ? "600 " : "400 ") + "26px 'IBM Plex Sans', system-ui, sans-serif"; ctx.fillText(s, X0 + 60, y);
          });
        }
        ctx.globalAlpha = 1;
      }
      function boot(ctx, t, W, H) {
        ctx.globalAlpha = Math.min(1, t * 2, (2 - t) * 2);
        ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(W / 2, H / 2, 110, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(W / 2, H / 2, 18, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(W / 2, H / 2, 70, t * 6, t * 6 + 1.6); ctx.stroke();
        ctx.font = "700 46px 'IBM Plex Sans', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("UMD", W / 2, H / 2 + 160);
        ctx.globalAlpha = 1;
      }
      function race(ctx, t, W, H) {
        const HZ = 200, steer = Math.sin(t * 0.9) * 0.6 + Math.sin(t * 2.3) * 0.2, curve = Math.sin(t * 0.45) * 160;
        state.nx = steer;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, HZ); ctx.lineTo(W, HZ); ctx.stroke();
        for (let k = 0; k < 5; k++) { const x = ((k * 230 - curve * 0.6) % (W + 200) + W + 200) % (W + 200) - 100; ctx.beginPath(); ctx.moveTo(x - 80, HZ); ctx.lineTo(x, HZ - 50 - (k % 2) * 30); ctx.lineTo(x + 90, HZ); ctx.stroke(); }
        const road = z => { const k = (z - HZ) / (H - HZ); return { c: W / 2 + curve * (1 - k) ** 2 - steer * 260 * k, w: 30 + k * 620 }; };
        ctx.beginPath();
        for (let y = HZ; y <= H; y += 8) { const r = road(y); y === HZ ? ctx.moveTo(r.c - r.w / 2, y) : ctx.lineTo(r.c - r.w / 2, y); }
        ctx.stroke(); ctx.beginPath();
        for (let y = HZ; y <= H; y += 8) { const r = road(y); y === HZ ? ctx.moveTo(r.c + r.w / 2, y) : ctx.lineTo(r.c + r.w / 2, y); }
        ctx.stroke();
        for (let i = 0; i < 12; i++) {   // centre line dashes rushing towards you
          const f = ((i / 12 + t * 0.9) % 1), y0 = HZ + (H - HZ) * f * f, y1 = HZ + (H - HZ) * Math.min(1, (f + 0.035) ** 2);
          const a = road(y0), b = road(y1);
          ctx.lineWidth = 2 + 6 * f; ctx.beginPath(); ctx.moveTo(a.c, y0); ctx.lineTo(b.c, y1); ctx.stroke();
        }
        const cx = W / 2, cy = H - 70;   // your car from behind
        ctx.lineWidth = 4; rr(ctx, cx - 80, cy - 30, 160, 56, 14); ctx.stroke();
        rr(ctx, cx - 54, cy - 62, 108, 36, 10); ctx.stroke();
        ctx.fillRect(cx - 70, cy - 12, 26, 10); ctx.fillRect(cx + 44, cy - 12, 26, 10);
        ctx.font = "500 26px 'IBM Plex Mono', ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText("LAP 2/3", 30, 40); ctx.textAlign = "right"; ctx.fillText(String(Math.floor(180 + Math.sin(t) * 20)) + " km/h", W - 30, 40);
      }
      const anim = window.BP_screenAnimation(E, {
        screen: G.screen, part: "LCD", width: 960, height: 544, still: 3.4,
        draw(ctx, T, { W, H }) {
          const t = T % LOOP;
          state.nx = state.nz = 0;
          if (t < 5) { const cat = Math.min(4, Math.floor(t)); xmb(ctx, T, W, H, cat, -1, 1); if (t % 1 < 0.2 && t < 4.2) state.nx = 1; state.spin = 0.3; }
          else if (t < 6.6) { const item = Math.min(2, Math.floor((t - 5) / 0.45)); xmb(ctx, T, W, H, 4, item, 1); if ((t - 5) % 0.45 < 0.15) state.nz = -1; state.spin = 0.3; }
          else if (t < 8.6) { boot(ctx, t - 6.6, W, H); state.spin = 1; }
          else if (t < 15) { race(ctx, t - 8.6, W, H); state.spin = 1; }
          else { ctx.globalAlpha = (LOOP - t) / 0.5; race(ctx, t - 8.6, W, H); ctx.globalAlpha = 1; state.spin = 0.4; }
        },
      });
      const sp = n => (E.spinners[n] || [])[0], AX = new THREE.Vector3(0, 0, 1);
      let ang = 0, speed = 0, nx = 0, nz = 0;
      return {
        mats: [anim.mat],
        tick(now, dt) {
          anim.tick(now);
          const on = anim.isOn() && !E.reduceMotion;
          speed += ((on ? state.spin * 30 : 0) - speed) * Math.min(1, dt * 1.5);   // the disc spins up and down
          ang += speed * dt;
          const d = sp("disc"); if (d) d.quaternion.setFromAxisAngle(AX, -ang);
          const k = Math.min(1, dt * 12);
          nx += ((on ? state.nx : 0) - nx) * k; nz += ((on ? state.nz : 0) - nz) * k;
          const n = sp("nub"); if (n) n.position.set(nx * 2.2, nz * 2.2, 0);
        },
        recolor(fg, bg) { anim.recolor(fg, bg); },
      };
    },
  };
})();
