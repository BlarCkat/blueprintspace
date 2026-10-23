// Playdate: the model script for the blueprint engine, which playdate/build.js inlines after the generated geometry
// (and lib/screen-runtime.js). The crank turns all the time (not with reduced motion). "/" (or the Animate button)
// turns on the screen: a 1-bit runner in a hamster wheel that the crank drives, the D-pad rocking now and then.
// In the Photo style the screen takes the Memory LCD's silver and near-black.
(function () {
  "use strict";
  const G = window.PD_GEOMETRY;
  const DETAIL = {
    "Front Shell": ["Front shell", "Bright yellow, almost square, holding the screen and the buttons."],
    "Back Shell": ["Back shell", "Plain and flat, in the same yellow."],
    "Screws": ["Screws", "Four exposed screws in the corners of the face."],
    "Ports and Lock": ["Ports and lock", "Headphones, USB-C and the microphone underneath, the lock button on top, and the crank's dock in the right side."],
    "Screen Glass": ["Screen", "Cover glass over the screen, in a black surround."],
    "Memory LCD": ["Memory LCD", "A 400 x 240 Sharp Memory LCD: black and white with no greys, no backlight, crisp in sunlight, and refreshing up to 50 times a second."],
    "Menu Button": ["Menu button", "Opens the system menu from any game."],
    "Speaker Grille": ["Speaker grille", "A slot of mesh beside the screen."],
    "A and B": ["A and B", "Two yellow buttons with their letters, on the right."],
    "D-pad": ["D-pad", "A cross that rocks on its pivot."],
    "Crank": ["Crank", "Folds out of the right side and turns all the way round, freely. A magnet in its hub tells the board exactly where it points."],
    "Main Board": ["Main board", "The processor, memory, wireless chip, crank sensor and button contacts."],
    "Chips": ["Chips", "An STM32 microcontroller with 16 MB of RAM, Wi-Fi and Bluetooth, and the magnetic sensor that reads the crank."],
    "Speaker": ["Speaker", "A small mono speaker behind the grille."],
    "Battery": ["Battery", "A flat lithium-ion cell behind the board."],
  };

  window.BLUEPRINT_MODEL = {
    screenPart: "Screen Glass",
    screenGlass: [],
    screenAnimation: true,
    geometry: G,
    themeKey: "pd-theme",
    touchHint: "Tap the Playdate to take it apart",
    view: { az: 30, el: 16, fit: 0.85 },
    spoolOf: o => o.spool || null,
    occluders: ["Front Shell", "Back Shell", "Screen Glass", "Main Board", "Battery"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/Front Shell|Back Shell|A and B|D-pad|Menu Button/, ["plastic", { color: 0xffc41f, roughness: 0.5 }]],
      [/Screen Glass/, ["glass", { color: 0x0c0c0d }]], [/Memory LCD/, "glass"], [/Screws/, "steel"], [/Crank/, ["alu", { color: 0xb7b9bc, roughness: 0.3 }]],
      [/Speaker Grille/, ["darkAlu", { color: 0x3b3b3b }]], [/Ports/, ["plastic", { color: 0xe0ab12 }]],
      [/Main Board/, "pcb"], [/Chips/, "chip"], [/Speaker$/, "plastic"], [/Battery/, "battery"],
    ],

    setup(E) {
      const photo = () => window.__bpGetStyle && window.__bpGetStyle() === "photo";
      const state = { crank: 0, speed: 1.8, tilt: 0 };
      const screen = window.BP_screenAnimation(E, {
        screen: G.screen, part: "Screen Glass", width: 800, height: 480, still: 2,
        draw(ctx, T, { W, H, fg, bg }) {
          const [ink, paper] = photo() ? ["#2b2a26", "#b9b6ad"] : [fg, bg];
          ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = ctx.strokeStyle = ink; ctx.lineCap = "round"; ctx.lineJoin = "round";
          const a = state.crank, dist = Math.floor(a / (Math.PI * 2) * 3.2 * 10) / 10;
          // hills scrolling by as the wheel turns
          ctx.lineWidth = 4;
          for (let k = 0; k < 2; k++) {
            ctx.beginPath();
            for (let x = 0; x <= W; x += 10) { const y = 390 - k * 40 + Math.sin((x + a * 60 * (k + 1)) / (120 + k * 60)) * (22 + k * 10); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
            ctx.stroke();
          }
          // the hamster wheel, turned by the crank
          const cx = 330, cy = 240, R = 150;
          ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R - 18, 0, Math.PI * 2); ctx.stroke();
          for (let k = 0; k < 12; k++) { const t = a + k * Math.PI / 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (R - 18) * Math.cos(t), cy + (R - 18) * Math.sin(t)); ctx.stroke(); }
          ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 60, H); ctx.moveTo(cx, cy); ctx.lineTo(cx + 60, H); ctx.stroke();
          // the runner at the bottom of the wheel, legs going
          const rx = cx, ry = cy + R - 70, ph = a * 4;
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(rx, ry - 34, 14, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(rx, ry - 20); ctx.lineTo(rx - 4, ry + 10);
          ctx.lineTo(rx - 4 + 18 * Math.sin(ph), ry + 40); ctx.moveTo(rx - 4, ry + 10); ctx.lineTo(rx - 4 - 18 * Math.sin(ph), ry + 40);
          ctx.moveTo(rx - 1, ry - 10); ctx.lineTo(rx + 16 * Math.cos(ph), ry + 4); ctx.moveTo(rx - 1, ry - 10); ctx.lineTo(rx - 16 * Math.cos(ph), ry + 4);
          ctx.stroke();
          // the readout and a crank indicator
          ctx.font = "700 40px 'IBM Plex Mono', ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
          ctx.fillText(dist.toFixed(1) + " m", 540, 40);
          ctx.font = "400 24px 'IBM Plex Mono', ui-monospace, monospace"; ctx.fillText("KEEP CRANKING", 540, 92);
          ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(680, 220, 52, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(680, 220); ctx.lineTo(680 + 46 * Math.cos(a), 220 + 46 * Math.sin(a)); ctx.stroke();
          ctx.beginPath(); ctx.arc(680 + 46 * Math.cos(a), 220 + 46 * Math.sin(a), 8, 0, Math.PI * 2); ctx.fill();
        },
      });
      const sp = n => (E.spinners[n] || [])[0], X = new THREE.Vector3(1, 0, 0), FWD = new THREE.Vector3(0, 1, 0);
      let tilt = 0;
      return {
        mats: [screen.mat],
        tick(now, dt) {
          if (!E.reduceMotion) { state.speed = 1.6 + 0.9 * Math.sin(now / 2300); state.crank += state.speed * dt; }
          const c = sp("crank"); if (c) c.quaternion.setFromAxisAngle(X, -state.crank);
          screen.tick(now);
          const on = screen.isOn() && !E.reduceMotion;
          const want = on && Math.floor(now / 1700) % 3 === 0 ? 1 : 0;
          tilt += (want - tilt) * Math.min(1, dt * 12);
          const d = sp("dpad"); if (d) d.quaternion.setFromAxisAngle(FWD, tilt * 0.12);
        },
        recolor(fg, bg) { screen.recolor(fg, bg); },
      };
    },
  };
})();
