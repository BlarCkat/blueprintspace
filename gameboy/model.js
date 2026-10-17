// Game Boy (DMG-01): the model script for the blueprint engine, which gameboy/build.js inlines after the generated
// geometry (and lib/screen-runtime.js). "/" (or the Animate button) switches it on: the logo scrolls down, then a
// game of falling blocks plays itself, the D-pad rocking as pieces slide and the A button pressing as they turn.
// In the Photo style the screen takes the original's four shades of green.
(function () {
  "use strict";
  const G = window.GB_GEOMETRY;
  const DETAIL = {
    "Front Shell": ["Front shell", "Light grey ABS with the famous rounded bottom-right corner, holding the screen, the buttons and the speaker."],
    "Back Shell": ["Back shell", "Carries the cartridge slot along the top and the battery compartment's hump below."],
    "Battery Cover": ["Battery cover", "Slides off the hump on the back to reach the four AA cells; ridges give your fingers something to hold."],
    "Switches and Jacks": ["Switches and jacks", "The OFF/ON slider on top (it also locks the cartridge in), volume on the right, contrast and the link port on the left, headphones underneath."],
    "Screen Lens": ["Screen lens", "Dark grey plastic over the screen, printed DOT MATRIX WITH STEREO SOUND, with the red battery light."],
    "LCD": ["LCD", "A reflective, unlit dot-matrix LCD, 160 x 144 pixels in four shades of green-grey."],
    "Logo": ["Logo", "Nintendo GAME BOY, moulded under the screen."],
    "Buttons": ["Select and start", "Rubber pills, angled for your thumb; the six speaker slots follow the same angle."],
    "D-pad": ["D-pad", "Nintendo's cross: one piece that rocks on a pivot, so it can't press opposite directions at once."],
    "D-pad Well": ["D-pad well", "The round recess the D-pad sits in."],
    "A Button": ["A button", "Burgundy and convex, set a little higher than B for your thumb."],
    "B Button": ["B button", "Burgundy and convex, a little lower than A."],
    "CPU Board": ["CPU board", "The main board: the CPU, RAM and amplifier on one side, the button contacts on the other."],
    "Chips": ["Chips", "The Sharp LR35902 CPU at 4.19 MHz, 8 KB of work RAM, 8 KB of video RAM and the audio amplifier."],
    "LCD Board": ["LCD board", "Drives the LCD's rows and columns from the CPU's picture."],
    "Speaker": ["Speaker", "A small mono speaker behind the slots; the headphone jack gives you stereo."],
    "AA Batteries": ["Batteries", "Four AA cells: about 15 hours of play."],
    "Game Pak": ["Game Pak", "The cartridge: grey plastic with the game's label, slotted in from the top."],
    "Cartridge Board": ["Cartridge board", "The game's ROM chip on a small board, its gold edge connector pressing into the slot."],
  };

  window.BLUEPRINT_MODEL = {
    screenPart: "Screen Lens",
    screenGlass: [],
    screenAnimation: true,
    geometry: G,
    themeKey: "gb-theme",
    touchHint: "Tap the Game Boy to take it apart",
    view: { az: 30, el: 16, fit: 0.9 },
    spoolOf: o => o.spool || null,
    occluders: ["Front Shell", "Back Shell", "Battery Cover", "Screen Lens", "Game Pak", "CPU Board"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/Front Shell|Back Shell|Battery Cover|Game Pak/, ["plastic", { color: 0xc9c6bf, roughness: 0.55 }]],
      [/Screen Lens/, ["plastic", { color: 0x4f5059, roughness: 0.25, clearcoat: 0.6 }]], [/^LCD$/, ["glass", { color: 0x8c9a3a, metalness: 0 }]],
      [/A Button|B Button/, ["plastic", { color: 0x9b1d4a, roughness: 0.35, clearcoat: 0.4 }]], [/^Buttons$/, ["rubber", { color: 0x7d7c78 }]],
      [/D-pad$/, ["plastic", { color: 0x26262a, roughness: 0.45 }]], [/D-pad Well|Logo|Switches/, ["plastic", { color: 0x8a8781 }]],
      [/Board/, "pcb"], [/Chips/, "chip"], [/Speaker/, "plastic"], [/Batteries/, "battery"],
    ],

    setup(E) {
      const photo = () => window.__bpGetStyle && window.__bpGetStyle() === "photo";
      const mix = (a, b, k) => {
        const h = c => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : null; };
        const A = h(a), B = h(b);
        return A && B ? "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(",") + ")" : a;
      };
      // ---------- a tiny falling-blocks game that plays itself ----------
      const CW = 10, CH = 18;
      const SHAPES = [
        [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]],
        [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]],
      ];
      const rot = (cells, r) => { let c = cells; for (let i = 0; i < r; i++) c = c.map(([x, y]) => [y, -x]); const mx = Math.min(...c.map(p => p[0])), my = Math.min(...c.map(p => p[1])); return c.map(([x, y]) => [x - mx, y - my]); };
      let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      let g = null;
      const fits = (grid, cells, x, y) => cells.every(([cx, cy]) => { const X = x + cx, Y = y + cy; return X >= 0 && X < CW && Y < CH && (Y < 0 || !grid[Y][X]); });
      const drop = (grid, cells, x) => { let y = -2; while (fits(grid, cells, x, y + 1)) y++; return y; };
      function best(grid, k) {
        let pick = null;
        for (let r = 0; r < 4; r++) {
          const cells = rot(SHAPES[k], r), w = Math.max(...cells.map(p => p[0])) + 1;
          for (let x = 0; x + w <= CW; x++) {
            const y = drop(grid, cells, x);
            if (y < 0) continue;
            const t = grid.map(row => row.slice()); cells.forEach(([cx, cy]) => { t[y + cy][x + cx] = 1; });
            const lines = t.filter(row => row.every(Boolean)).length;
            const hs = Array.from({ length: CW }, (_, c) => { for (let rr = 0; rr < CH; rr++) if (t[rr][c]) return CH - rr; return 0; });
            let holes = 0; for (let c = 0; c < CW; c++) { let seen = false; for (let rr = 0; rr < CH; rr++) { if (t[rr][c]) seen = true; else if (seen) holes++; } }
            const score = -0.51 * hs.reduce((a, b) => a + b, 0) - 0.36 * holes - 0.18 * hs.slice(1).reduce((a, h, i) => a + Math.abs(h - hs[i]), 0) + 0.76 * lines;
            if (!pick || score > pick.score) pick = { r, x, cells, score };
          }
        }
        return pick;
      }
      function newGame() { seed = 7; return { grid: Array.from({ length: CH }, () => Array(CW).fill(0)), piece: null, next: Math.floor(rnd() * 7), lines: 0, score: 0, clock: 0, flash: 0 }; }
      const state = { tilt: 0, press: 0 };
      function step(dt) {
        g.clock += dt;
        if (g.flash > 0) { g.flash -= dt; if (g.flash <= 0) { g.grid = g.grid.filter(row => !row.every(Boolean)); while (g.grid.length < CH) g.grid.unshift(Array(CW).fill(0)); } return; }
        if (!g.piece) {
          const k = g.next; g.next = Math.floor(rnd() * 7);
          const b = best(g.grid, k);
          if (!b) { g = newGame(); return; }
          g.piece = { k, cells: b.cells, x: b.x, y: -2, from: 3, r: b.r, t: 0 };
          state.tilt = Math.sign(b.x - 3); state.press = b.r ? 1 : 0;
          return;
        }
        const p = g.piece; p.t += dt;
        if (p.t > 0.25) { state.tilt = 0; state.press = 0; }
        if (g.clock > 0.06) {
          g.clock = 0;
          if (fits(g.grid, p.cells, p.x, p.y + 1)) p.y++;
          else {
            p.cells.forEach(([cx, cy]) => { if (p.y + cy >= 0) g.grid[p.y + cy][p.x + cx] = 1; });
            g.piece = null; g.score += 10;
            const full = g.grid.filter(row => row.every(Boolean)).length;
            if (full) { g.lines += full; g.score += [0, 40, 100, 300, 1200][full]; g.flash = 0.3; }
            if (g.grid[1].some(Boolean)) g = newGame();
          }
        }
      }
      let lastT = 0;
      const screen = window.BP_screenAnimation(E, {
        screen: G.screen, part: "Screen Lens", width: 640, height: 576, still: 3,
        toggle: on => { g = null; lastT = 0; if (!on) Object.assign(state, { tilt: 0, press: 0 }); },
        draw(ctx, T, { W, H, fg, bg }) {
          // four shades, lightest to darkest
          const S = photo() ? ["#9bbc0f", "#8bac0f", "#306230", "#0f380f"] : [bg, mix(bg, fg, 0.33), mix(bg, fg, 0.66), fg];
          ctx.fillStyle = S[0]; ctx.fillRect(0, 0, W, H);
          const px = W / 160;
          const t = T % 60, dt = Math.max(0, Math.min(0.1, T - lastT)); lastT = T;
          if (t < 3.6) {   // the logo slides down and stops, then the console chimes
            g = null;
            const y = Math.min(64, -16 + t / 2.4 * 80);
            ctx.fillStyle = S[3]; ctx.font = "700 " + 15 * px + "px 'Archivo', 'Helvetica Neue', Arial, sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("Nintendo", W / 2, y * px);
            ctx.font = "700 " + 5 * px + "px Arial, sans-serif"; ctx.fillText("®", W / 2 + 37 * px, (y - 5) * px);
            return;
          }
          if (!g) g = newGame();
          step(dt);
          const C = 7.2, X0 = 16, Y0 = 6;
          ctx.fillStyle = S[1]; ctx.fillRect(0, 0, (X0 - 2) * px, H); ctx.fillRect((X0 + CW * C + 2) * px, 0, 6 * px, H);   // the walls
          const cell = (x, y, shade) => {
            ctx.fillStyle = S[shade]; ctx.fillRect((X0 + x * C) * px, (Y0 + y * C) * px, (C - 0.6) * px, (C - 0.6) * px);
            ctx.fillStyle = S[1]; ctx.fillRect((X0 + x * C + 1.6) * px, (Y0 + y * C + 1.6) * px, (C - 3.8) * px, (C - 3.8) * px);
          };
          g.grid.forEach((row, y) => row.forEach((v, x) => { if (v) cell(x, y, g.flash > 0 && row.every(Boolean) ? 1 : 3); }));
          if (g.piece) g.piece.cells.forEach(([cx, cy]) => { if (g.piece.y + cy >= 0) cell(g.piece.x + cx, g.piece.y + cy, 2); });
          // the panel on the right: score, level, lines and the next piece
          ctx.fillStyle = S[3]; ctx.font = "700 " + 7 * px + "px 'IBM Plex Mono', monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
          const PX = (X0 + CW * C + 12) * px;
          ctx.fillText("SCORE", PX, 8 * px); ctx.fillText(String(g.score).padStart(6, " "), PX, 18 * px);
          ctx.fillText("LEVEL", PX, 38 * px); ctx.fillText(String(1 + Math.floor(g.lines / 10)), PX + 10 * px, 48 * px);
          ctx.fillText("LINES", PX, 66 * px); ctx.fillText(String(g.lines), PX + 10 * px, 76 * px);
          ctx.strokeStyle = S[3]; ctx.lineWidth = px; ctx.strokeRect(PX - 2 * px, 96 * px, 40 * px, 34 * px);
          SHAPES[g.next].forEach(([cx, cy]) => { ctx.fillStyle = S[3]; ctx.fillRect(PX + (6 + cx * 7) * px, (104 + cy * 7) * px, 6.4 * px, 6.4 * px); });
        },
      });
      const sp = n => (E.spinners[n] || [])[0], FWD = new THREE.Vector3(0, 0, 1);
      let tilt = 0, press = 0;
      return {
        mats: [screen.mat],
        tick(now, dt) {
          screen.tick(now);
          const on = screen.isOn() && !E.reduceMotion, k = Math.min(1, dt * 18);
          tilt += ((on ? state.tilt : 0) - tilt) * k; press += ((on ? state.press : 0) - press) * k;
          const d = sp("dpad"); if (d) d.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tilt * 0.12);
          const a = sp("abtn"); if (a) a.position.z = -1.2 * press;   // three's +z is towards the back
        },
        recolor(fg, bg) { screen.recolor(fg, bg); },
      };
    },
  };
})();
