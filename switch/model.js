// Nintendo Switch (OLED model): the model script for the blueprint engine, which switch/build.js inlines after the
// generated geometry (and lib/screen-runtime.js). The fan turns all the time (not with reduced motion). "/" (or
// the Animate button) turns on the screen: the home menu picks a game and plays it, and the sticks move with it.
(function () {
  "use strict";
  const G = window.NSW_GEOMETRY;
  const DETAIL = {
    "Display Glass": ["Cover glass", "Toughened glass over the whole front, with a thin black border round the picture."],
    "OLED Display": ["7-inch OLED screen", "1280 x 720. Each pixel makes its own light, so blacks are truly black and colours stay vivid at an angle."],
    "Front Frame": ["Front frame", "The front half of the tablet's shell, holding the screen. The rails for the Joy-Cons run down its sides."],
    "Top Buttons": ["Top edge", "Power and volume on the left, the headphone jack and the flap over the game card slot on the right."],
    "USB-C and Speakers": ["Bottom edge", "The USB-C port that docks and charges it, with the speaker grilles either side."],
    "Midframe": ["Midframe", "A stiff metal plate behind the screen that everything inside is screwed to, and that spreads heat."],
    "Speakers": ["Speakers", "Two small stereo speakers firing out of the bottom edge."],
    "Battery": ["Battery", "A flat 4310 mAh lithium-ion pack behind the lower half of the screen: about 4.5 to 9 hours of play."],
    "Main Board": ["Main board", "Carries the processor, its memory and storage, Wi-Fi and Bluetooth, power management and the game card reader."],
    "NVIDIA Tegra": ["NVIDIA Tegra processor", "A custom chip with four ARM Cortex-A57 cores and a 256-core Maxwell GPU. It runs slower in your hands and faster in the dock."],
    "Memory and Storage": ["Memory and storage", "4 GB of LPDDR4X shared by CPU and GPU, 64 GB of eMMC storage, the wireless chip and the power controller."],
    "Game Card Reader": ["Game card reader", "Game cards slot in from the top edge and are read directly, like a fast memory card."],
    "Heat Shield": ["Heat shield", "A metal plate over the board that spreads heat and blocks interference."],
    "Heat Pipe": ["Heat pipe", "A sealed copper pipe carrying the processor's heat to the fins under the top vent."],
    "Heatsink Fins": ["Heatsink fins", "Thin fins where the heat pipe ends; the fan blows air through them."],
    "Fan Housing": ["Fan housing", "A scroll that turns the fan's air up and out through the fins and the top vent."],
    "Fan": ["Blower fan", "A small centrifugal fan. It barely turns in handheld mode and speeds up in the dock."],
    "Back Cover": ["Back cover", "The back half of the shell, with the intake vent near the top."],
    "Vents": ["Vents", "Air is drawn in through the back and blown out through the slots along the top edge."],
    "Kickstand": ["Kickstand", "Runs almost the full width and holds any angle for tabletop play. The microSD slot is under it."],
    "Left Joy-Con": ["Joy-Con (L)", "A controller on its own: a stick, four direction buttons, minus, capture, L and ZL, with motion sensors and HD rumble inside."],
    "Right Joy-Con": ["Joy-Con (R)", "A B X Y, a stick, plus, home, R and ZR, with an NFC reader for amiibo and an IR camera in its base."],
    "Left Buttons": ["Left buttons", "Four direction buttons, minus and capture on the face; L and ZL round the top corner."],
    "Right Buttons": ["Right buttons", "A B X Y, plus and home on the face; R and ZR round the top corner."],
    "Left Rail": ["Rail", "The Joy-Con slides down it and locks. Contacts inside charge it and carry its signals; SL and SR sit on it for sideways play."],
    "Right Rail": ["Rail", "The Joy-Con slides down it and locks. Contacts inside charge it and carry its signals; SL and SR sit on it for sideways play."],
    "Left Stick": ["Analog stick", "Tilts in any direction and clicks in. Magnets and sensors under it read how far it leans."],
    "Right Stick": ["Analog stick", "Tilts in any direction and clicks in. Magnets and sensors under it read how far it leans."],
  };

  window.BLUEPRINT_MODEL = {
    screenPart: "OLED Display",
    screenGlass: ["Display Glass"],
    screenAnimation: true,
    geometry: G,
    themeKey: "nsw-theme",
    touchHint: "Tap the console to take it apart",
    view: { az: 35, el: 18, fit: 0.82 },
    spoolOf: o => o.spool || null,
    occluders: ["Display Glass", "Front Frame", "Back Cover", "Left Joy-Con", "Right Joy-Con", "Midframe", "Kickstand"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    // shaded and photo styles: neon blue and red Joy-Cons on a black tablet
    materials: [
      [/Left Joy-Con|Left Buttons|Left Stick/, ["plastic", { color: 0x0ab9e6, roughness: 0.5 }]],
      [/Right Joy-Con|Right Buttons|Right Stick/, ["plastic", { color: 0xff4d4a, roughness: 0.5 }]],
      [/Front Frame|Back Cover|Top Buttons|USB-C|Rail|Vents/, ["plastic", { color: 0x232427, roughness: 0.55 }]],
      [/Kickstand/, ["plastic", { color: 0x2b2c30, roughness: 0.4 }]],
      [/Display Glass/, "clearGlass"], [/OLED Display/, "glass"],
      [/Midframe|Heat Shield|Heatsink Fins/, "alu"], [/Heat Pipe/, "copper"], [/Battery/, "battery"],
      [/Main Board/, "pcb"], [/NVIDIA|Memory|Game Card/, "chip"], [/Fan|Speakers/, "plastic"],
    ],

    setup(E) {
      const rr = window.BP_rr;
      const GAMES = ["Mountain Climb", "Star Racer", "Ball League", "Sword Quest", "Kart Rally", "Block Builder"];
      const glyph = (ctx, k, x, y, s) => {
        ctx.lineWidth = s * 0.04; ctx.beginPath();
        if (k === 0) { ctx.moveTo(x - s * 0.35, y + s * 0.25); ctx.lineTo(x - s * 0.08, y - s * 0.22); ctx.lineTo(x + s * 0.08, y); ctx.lineTo(x + s * 0.18, y - s * 0.12); ctx.lineTo(x + s * 0.35, y + s * 0.25); ctx.closePath(); }
        if (k === 1) for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.14 : s * 0.33; ctx[i ? "lineTo" : "moveTo"](x + r * Math.cos(a), y + r * Math.sin(a)); }
        if (k === 2) { ctx.arc(x, y, s * 0.3, 0, Math.PI * 2); ctx.moveTo(x - s * 0.3, y); ctx.quadraticCurveTo(x, y - s * 0.2, x + s * 0.3, y); }
        if (k === 3) { ctx.moveTo(x - s * 0.28, y + s * 0.28); ctx.lineTo(x + s * 0.25, y - s * 0.25); ctx.moveTo(x - s * 0.12, y + s * 0.02); ctx.lineTo(x - s * 0.02, y + s * 0.12); }
        if (k === 4) { rr(ctx, x - s * 0.3, y - s * 0.1, s * 0.6, s * 0.2, s * 0.06); ctx.moveTo(x - s * 0.1, y + s * 0.2); ctx.arc(x - s * 0.18, y + s * 0.18, s * 0.07, 0, Math.PI * 2); ctx.moveTo(x + s * 0.25, y + s * 0.18); ctx.arc(x + s * 0.18, y + s * 0.18, s * 0.07, 0, Math.PI * 2); }
        if (k === 5) { ctx.rect(x - s * 0.28, y - s * 0.02, s * 0.26, s * 0.26); ctx.rect(x + s * 0.02, y - s * 0.02, s * 0.26, s * 0.26); ctx.rect(x - s * 0.13, y - s * 0.3, s * 0.26, s * 0.26); }
        ctx.stroke();
      };
      const LOOP = 17, sticks = { x: 0, y: 0, rx: 0, ry: 0 };
      function home(ctx, t, W, H, sel, a) {
        ctx.globalAlpha = a;
        ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(80, 70, 30, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(80, 62, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.font = "500 38px 'IBM Plex Mono', ui-monospace, monospace"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText("10:42", W - 140, 70);
        rr(ctx, W - 118, 56, 62, 28, 5); ctx.stroke(); ctx.fillRect(W - 112, 62, 40, 16); ctx.fillRect(W - 54, 64, 5, 12);
        const TS = 250, GAP = 22, scroll = Math.max(0, sel - 3) * (TS + GAP);
        for (let i = 0; i < 6; i++) {
          const x = 70 + i * (TS + GAP) - scroll, y = 160, on = i === sel;
          if (x > W) continue;
          ctx.lineWidth = on ? 9 : 3;
          rr(ctx, x - (on ? 8 : 0), y - (on ? 8 : 0), TS + (on ? 16 : 0), TS + (on ? 16 : 0), 10); ctx.stroke();
          glyph(ctx, i, x + TS / 2, y + TS / 2, TS);
        }
        ctx.textAlign = "left"; ctx.font = "500 34px 'IBM Plex Sans', system-ui, sans-serif";
        ctx.fillText(GAMES[sel], 70, 470);
        for (let i = 0; i < 7; i++) { ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(W / 2 + (i - 3) * 104, 570, 36, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = a * 0.6; ctx.beginPath(); ctx.moveTo(40, 640); ctx.lineTo(W - 40, 640); ctx.stroke();
        ctx.font = "400 28px 'IBM Plex Sans', system-ui, sans-serif"; ctx.textAlign = "right";
        ctx.fillText("Ⓑ Back    Ⓐ Start", W - 60, 680);
        ctx.globalAlpha = 1;
      }
      function game(ctx, t, W, H, sel) {
        const GY = 560, speed = 380, w = t * speed;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(W, GY); ctx.stroke();
        for (let k = 0; k < 40; k++) { const x = ((k * 97 - w * 0.5) % W + W) % W; ctx.beginPath(); ctx.moveTo(x, GY + 30); ctx.lineTo(x + 30, GY + 30); ctx.stroke(); }   // the ground scrolling
        for (let k = 0; k < 6; k++) { const x = ((k * 260 - w * 0.2) % (W + 200) + W + 200) % (W + 200) - 100; ctx.beginPath(); ctx.arc(x, 150 + (k % 3) * 40, 34, Math.PI, 0); ctx.arc(x + 46, 150 + (k % 3) * 40, 26, Math.PI, 0); ctx.stroke(); }   // clouds
        let jump = 0;
        for (let k = 0; k < 30; k++) {
          const x = 700 + 420 * k - w;
          if (x > -60 && x < W + 60) { ctx.strokeRect(x - 28, GY - 56, 56, 56); }
          const d = x - 300;
          if (d > -110 && d < 150) jump = Math.max(jump, Math.sin(Math.PI * (150 - d) / 260));
          const cx = x + 210;
          if (cx > -20 && cx < W + 20) { ctx.beginPath(); ctx.arc(cx, GY - 200, 16, 0, Math.PI * 2); ctx.stroke(); }
        }
        const y = GY - 70 - jump * 190;
        rr(ctx, 266, y, 68, 70, 14); ctx.stroke();
        ctx.fillRect(310, y + 18, 10, 12);
        ctx.font = "500 36px 'IBM Plex Mono', ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(GAMES[sel].toUpperCase(), 50, 60);
        ctx.textAlign = "right"; ctx.fillText("SCORE " + String(Math.floor(w / 10)).padStart(5, "0"), W - 50, 60);
        sticks.x = 0.8; sticks.y = 0; sticks.ry = jump > 0.05 ? 0.25 : 0;
      }
      const anim = window.BP_screenAnimation(E, {
        screen: G.screen, part: "OLED Display", width: 1280, height: 720, still: 3.2,
        toggle: on => { if (!on) Object.assign(sticks, { x: 0, y: 0, ry: 0 }); },
        draw(ctx, T, { W, H, fg, bg }) {
          const t = T % LOOP, sel = 1 + Math.min(4, Math.floor(t / 1.1)) % 5;
          sticks.x = sticks.y = sticks.ry = 0;
          if (t < 6.2) { home(ctx, t, W, H, sel, 1); if (t % 1.1 < 0.25) sticks.x = 0.9; }
          else if (t < 6.8) {   // the tile grows to fill the screen
            const k = (t - 6.2) / 0.6;
            home(ctx, t, W, H, sel, 1 - k);
            ctx.lineWidth = 6; rr(ctx, 400 * (1 - k), 160 * (1 - k), 250 + (W - 250) * k, 250 + (H - 250) * k, 10); ctx.stroke();
          } else if (t < 16.2) game(ctx, t - 6.8, W, H, sel);
          else { ctx.globalAlpha = 1 - (t - 16.2) / 0.8; game(ctx, t - 6.8, W, H, sel); ctx.globalAlpha = 1; }
          ctx.fillStyle = fg;
        },
      });
      const q = new THREE.Quaternion(), eu = new THREE.Euler(), sp = n => (E.spinners[n] || [])[0];
      const cur = { x: 0, y: 0, ry: 0 };
      let t = 0;
      return {
        mats: [anim.mat],
        tick(now, dt) {
          if (!E.reduceMotion) t += dt;
          (E.spinners.fan || []).forEach(g => g.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), 9 * t));
          anim.tick(now);
          const k = Math.min(1, dt * 10);
          ["x", "y", "ry"].forEach(c => { cur[c] += ((anim.isOn() ? sticks[c] : 0) - cur[c]) * k; });
          const L = sp("stickL"), R = sp("stickR");
          if (L) L.quaternion.setFromEuler(eu.set(-cur.y * 0.3, cur.x * 0.3, 0));
          if (R) R.quaternion.setFromEuler(eu.set(-cur.ry * 0.3, 0, 0));
        },
        recolor(fg, bg) { anim.recolor(fg, bg); },
      };
    },
  };
})();
