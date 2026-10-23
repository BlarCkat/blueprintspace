// Game Boy concept: the model script for the blueprint engine, which gbconcept/build.js inlines after the generated
// geometry (and lib/screen-runtime.js). The logo always shows on the screen, as in the render; "/" (or the Animate
// button) plays a little runner game over it. In the Shaded and Photo styles the shell is smoked and see-through.
(function () {
  "use strict";
  const G = window.GBC_GEOMETRY;
  const DETAIL = {
    "Base Shell": ["Base", "Smoked translucent plastic: the board, its traces and the battery show through."],
    "Cartridge Slot": ["Cartridge slot and grip", "A slot underneath and ridges at the bottom right for your thumb."],
    "Back Plate": ["Back plate", "A light grey plate behind the shell that stands out on the left, with notches down its edge."],
    "Screen Unit": ["Screen unit", "The top two thirds: a smoked frame around one big square screen."],
    "Screen": ["Screen", "A square, mirror-finished screen that shows the logo when it's resting."],
    "Slide Rails": ["Rails", "Two rails the screen unit sits on."],
    "Buttons": ["Buttons", "Four round direction keys on the left, X Y A B in a diamond on the right, all lavender with white glyphs, and select and start between."],
    "Status Display": ["Status display", "A tiny square screen between the pads for battery and connection."],
    "Main Board": ["Main board", "Visible through the shell, traces and all."],
    "Chips": ["Chips", "The processor with memory and wireless beside it."],
    "Battery": ["Battery", "A flat cell behind the screen."],
  };

  window.BLUEPRINT_MODEL = {
    screenPart: "Screen",
    screenGlass: [],
    screenAnimation: true,
    geometry: G,
    themeKey: "gbc-theme",
    touchHint: "Tap it to take it apart",
    view: { az: 25, el: 14, fit: 0.85 },
    occluders: ["Screen Unit", "Back Plate", "Screen"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/Base Shell|Screen Unit|Slide Rails/, ["clearGlass", { color: 0x2c2e33, opacity: 0.62, roughness: 0.18 }]],
      [/Back Plate|Cartridge/, ["plastic", { color: 0xc5c7cb, roughness: 0.45 }]],
      [/^Screen$/, ["glass", { color: 0xb4b8bf, metalness: 0.7, roughness: 0.12 }]],
      [/Buttons/, ["plastic", { color: 0x5d52c4, roughness: 0.3, clearcoat: 0.6 }]], [/Status Display/, "glass"],
      [/Main Board/, ["chip", { color: 0x2a2d33, roughness: 0.35 }]], [/Chips/, "chip"], [/Battery/, "battery"],
    ],

    setup(E) {
      const photo = () => window.__bpGetStyle && window.__bpGetStyle() !== "blueprint";
      const W0 = 660, H0 = 760;
      const logo = window.BP_screenAnimation(E, {
        screen: G.screen, part: "Screen", width: W0, height: H0, always: true, fps: 8,
        draw(ctx, T, { W, H, fg, bg }) {
          if (photo()) {
            const g = ctx.createLinearGradient(0, 0, W, H);
            g.addColorStop(0, "#d8dade"); g.addColorStop(0.5, "#b3b6bd"); g.addColorStop(1, "#9ea2aa");
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#7068c8";
          } else { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); ctx.fillStyle = fg; }
          ctx.font = "italic 900 86px 'Archivo', 'Helvetica Neue', Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("GAME BOY", W / 2, H * 0.38);
        },
      });
      const game = window.BP_screenAnimation(E, {
        screen: G.screen, part: "Screen", width: W0, height: H0, lift: 2.5, still: 3,
        draw(ctx, T, { W, H, fg, bg }) {
          const P = photo() ? ["#e6e3f6", "#a79fe0", "#6158b5", "#27234f"] : [bg, fg, fg, fg];
          ctx.fillStyle = P[0]; ctx.fillRect(0, 0, W, H);
          const GY = 600, w = T * 260;
          ctx.fillStyle = P[1];
          for (let k = 0; k < 4; k++) { const x = ((k * 230 - w * 0.3) % (W + 240) + W + 240) % (W + 240) - 120; ctx.beginPath(); ctx.arc(x, 200 + (k % 2) * 60, 40, Math.PI, 0); ctx.fill(); }
          ctx.fillStyle = P[2]; ctx.fillRect(0, GY, W, H - GY);
          ctx.fillStyle = P[0]; for (let k = 0; k < 12; k++) { const x = ((k * 70 - w) % W + W) % W; ctx.fillRect(x, GY + 20, 30, 8); }
          let jump = 0;
          ctx.fillStyle = P[3];
          for (let k = 0; k < 40; k++) {
            const x = 520 + 380 * k - w;
            if (x > -60 && x < W + 60) ctx.fillRect(x - 24, GY - 48, 48, 48);
            const d = x - 180; if (d > -90 && d < 130) jump = Math.max(jump, Math.sin(Math.PI * (130 - d) / 220));
          }
          const y = GY - 64 - jump * 170;
          ctx.fillRect(152, y, 56, 64); ctx.fillStyle = P[0]; ctx.fillRect(190, y + 14, 10, 12);
          ctx.fillStyle = P[3]; ctx.font = "700 34px 'IBM Plex Mono', monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
          ctx.fillText("SCORE " + String(Math.floor(w / 20)).padStart(5, "0"), 30, 30);
        },
      });
      return {
        mats: [logo.mat, game.mat],
        tick(now) { logo.tick(now); game.tick(now); },
        recolor(fg, bg) { logo.recolor(fg, bg); game.recolor(fg, bg); },
      };
    },
  };
})();
