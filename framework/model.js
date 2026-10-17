// Framework Laptop 13: the model script for the blueprint engine, which framework/build.js inlines after the
// generated geometry (and lib/screen-runtime.js). The fan turns all the time (not with reduced motion). "/" (or the
// Animate button) turns on the screen: a terminal session on Fedora types itself out, each key lighting up on the
// keyboard as it's typed.
(function () {
  "use strict";
  const G = window.FW13_GEOMETRY;
  const DETAIL = {
    "Bottom Cover": ["Bottom cover", "The aluminium housing everything sits in, with the four expansion bays in its sides and air intakes underneath."],
    "Feet": ["Feet", "Long rubber strips that keep it steady and leave room for air underneath."],
    "Expansion Bays": ["Expansion bays", "Four recesses, two each side, each with a USB-C socket deep inside that a card plugs into."],
    "Mainboard": ["Mainboard", "Carries the processor and every socket. It swaps out whole, so the same laptop can take a newer generation."],
    "Processor": ["Processor", "An Intel Core Ultra or AMD Ryzen, under a heat spreader with two heat pipes."],
    "Board Components": ["Board components", "Power stages for the processor, the retimers for the expansion bays and the battery connector."],
    "Memory": ["Memory", "Two standard DDR5 SO-DIMM slots: buy your own sticks, up to 96 GB."],
    "SSD": ["SSD", "A standard M.2 2280 NVMe drive, held by one screw."],
    "Wi-Fi Card": ["Wi-Fi card", "A standard M.2 2230 card, Wi-Fi 6E or 7, with leads to the antennas in the lid."],
    "Heat Spreader": ["Heat spreader", "A copper plate on the processor."],
    "Heat Pipes": ["Heat pipes", "Two flattened copper pipes from the processor to the fins."],
    "Fin Stack": ["Fin stack", "Thin fins along the back edge that the fan blows through."],
    "Fan Housing": ["Fan housing", "Turns the fan's air towards the fins."],
    "Fan": ["Fan", "A blower that pulls air in underneath and pushes it out at the back."],
    "Battery": ["Battery", "61 Wh, held by screws rather than glue, with a pull tab: a replacement drops straight in."],
    "Speakers": ["Speakers", "Two side-firing speakers either side of the battery."],
    "Input Cover": ["Input cover", "The whole top deck with the keyboard and touchpad, held on by magnets. It comes off without tools, and can be replaced, or swapped for another layout."],
    "Touchpad": ["Touchpad", "A large glass-like pad with a mechanical click."],
    "Keyboard": ["Keyboard", "1.5 mm key travel, backlit, with the power button and fingerprint reader in the top-right key."],
    "Hinge": ["Hinge", "Holds the display at any angle and opens to 180 degrees."],
    "Display Lid": ["Display lid", "An aluminium lid, with the gear logo on the back."],
    "Display": ["Display", "13.5 inches at 3:2, 2880 x 1920 at up to 120 Hz: taller than most laptops, so more of a page fits."],
    "Bezel": ["Bezel", "Held on by magnets. Pop it off to reach the display, or swap it for another colour."],
    "Camera": ["Camera", "A 1080p webcam with two hardware switches beside it, one for the camera and one for the microphones."],
  };
  G.objects.forEach(o => {
    if (/^Expansion Card/.test(o.name)) DETAIL[o.name] = ["Expansion card", "A port on a removable card: USB-C, USB-A, HDMI, DisplayPort, Ethernet or storage. Press the latch underneath and it slides out."];
  });

  window.BLUEPRINT_MODEL = {
    screenPart: "Display",
    screenGlass: [],
    screenAnimation: true,
    geometry: G,
    themeKey: "fw13-theme",
    touchHint: "Tap the laptop to take it apart",
    view: { az: 40, el: 28 },
    spoolOf: o => o.spool || null,
    occluders: ["Bottom Cover", "Input Cover", "Display Lid", "Bezel", "Keyboard", "Battery", "Mainboard"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/Bottom Cover|Input Cover|Display Lid|Expansion Card/, ["alu", { color: 0xc8cacd, roughness: 0.36 }]],
      [/Bezel/, ["plastic", { color: 0x16171a, roughness: 0.4 }]], [/^Display$/, "glass"], [/Keyboard/, ["plastic", { color: 0x1b1c1f, roughness: 0.5 }]],
      [/Touchpad/, ["glass", { color: 0x9fa3a8, metalness: 0.4, roughness: 0.35 }]], [/Hinge/, ["darkAlu", { color: 0x55595e }]],
      [/Feet/, "rubber"], [/Mainboard/, "pcb"], [/Processor|Memory|SSD|Wi-Fi|Board Components/, "chip"],
      [/Heat|Fin Stack/, "copper"], [/Fan/, "plastic"], [/Battery/, "battery"], [/Speakers|Camera/, "plastic"], [/Expansion Bays/, "steel"],
    ],

    setup(E) {
      const keys = E.keyPresser({ keys: G.keys, top: G.keyTop, group: E.partGroups["Keyboard"], enter: "return" });
      const PROMPT = "[me@framework ~]$ ";
      const bar = (p, n) => "[" + "#".repeat(Math.round(p * n)) + ".".repeat(n - Math.round(p * n)) + "]";
      const SCRIPT = [
        ["cmd", "fastfetch --logo none"],
        ["out", "OS      Fedora Linux 43 (Workstation)", 60], ["out", "Host    Framework Laptop 13", 60],
        ["out", "Display 2880x1920 @ 120 Hz, 13.5\" 3:2", 60], ["out", "Memory  9.8 GiB / 64 GiB (DDR5 SO-DIMM x2)", 60],
        ["out", "Disk    1.2 TiB / 2 TiB (NVMe, M.2 2280)", 60], ["out", "Battery 61 Wh - 88% (discharging)", 400],
        ["cmd", "lsusb -t | grep -c 'Expansion Card'"], ["out", "4", 500],
        ["cmd", "sudo dnf upgrade -y"],
        ["bar", "downloading packages", 1800, "Complete!"], ["ok", "212 packages upgraded", 600],
        ["cmd", "fwupdmgr update"],
        ["bar", "updating BIOS", 2000, "Successfully installed firmware"], ["ok", "mainboard firmware is up to date", 700],
        ["cmd", "clear"], ["clear", 400],
      ];
      let lines = [], step = 0, typed = 0, t0 = 0, cur = null;
      const ROWS = 13;
      const push = (text, kind) => { lines.push({ text, kind }); if (lines.length > ROWS) lines.shift(); };
      const next = now => { step = (step + 1) % SCRIPT.length; typed = 0; t0 = now; cur = null; };
      function update(now) {
        const s = SCRIPT[step], dt = now - t0;
        if (s[0] === "cmd") {
          if (!cur) { push(PROMPT, "cmd"); cur = lines[lines.length - 1]; t0 = now + 350; }
          const n = Math.max(0, Math.min(s[1].length, Math.floor((now - t0) / 55)));
          if (n !== typed) { if (n > typed) keys.char(s[1][n - 1]); typed = n; cur.text = PROMPT + s[1].slice(0, n); }
          if (n === s[1].length && now - t0 > s[1].length * 55 + 260) { keys.press("return"); next(now); }
        } else if (s[0] === "out" || s[0] === "ok") {
          if (!cur) { cur = true; push((s[0] === "ok" ? "✓ " : "") + s[1], s[0]); }
          if (dt > s[2]) next(now);
        } else if (s[0] === "bar") {
          if (!cur) { push("", "bar"); cur = lines[lines.length - 1]; }
          const p = Math.min(1, dt / s[2]);
          cur.text = s[1].padEnd(22) + bar(p, 26) + String(Math.round(p * 100)).padStart(4) + "%";
          if (p >= 1) { cur.kind = "out"; push(s[3], "out"); next(now); }
        } else if (s[0] === "clear") {
          if (!cur) { cur = true; lines = []; }
          if (dt > s[1]) next(now);
        }
      }
      const term = window.BP_screenAnimation(E, {
        screen: G.screen, part: "Display", width: 1500, height: 1000, still: 2,
        toggle: on => { lines = []; step = 0; typed = 0; cur = null; t0 = performance.now(); if (!on) keys.clear(); },
        draw(ctx, T, { W, H }) {
          const now = performance.now();
          if (!E.reduceMotion) update(now);
          const BAR = 60, PAD = 50, FS = 42, LH = 64;
          ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, BAR); ctx.lineTo(W, BAR); ctx.stroke();
          ctx.font = "500 22px 'IBM Plex Mono', ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("me@framework: ~", W / 2, BAR / 2);
          [W - 40, W - 80, W - 120].forEach(x => { ctx.beginPath(); ctx.arc(x, BAR / 2, 8, 0, Math.PI * 2); ctx.stroke(); });
          ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
          ctx.font = "400 " + FS + "px 'IBM Plex Mono', ui-monospace, monospace";
          lines.forEach((l, i) => {
            const y = BAR + PAD + i * LH + FS * 0.4;
            if (l.kind === "cmd") { ctx.globalAlpha = 0.55; ctx.fillText(PROMPT, PAD, y); ctx.globalAlpha = 1; ctx.fillText(l.text.slice(PROMPT.length), PAD + ctx.measureText(PROMPT).width, y); }
            else { ctx.globalAlpha = l.kind === "out" ? 0.75 : 1; ctx.fillText(l.text, PAD, y); }
          });
          const last = lines[lines.length - 1];
          if (last && last.kind === "cmd" && Math.floor(now / 530) % 2 === 0) {
            ctx.globalAlpha = 0.9;
            ctx.fillRect(PAD + ctx.measureText(last.text).width + 3, BAR + PAD + (lines.length - 1) * LH + FS * 0.4 - FS * 0.82, FS * 0.6, FS * 1.02);
          }
          ctx.globalAlpha = 1;
        },
      });
      let t = 0;
      return {
        mats: [term.mat],
        tick(now, dt, e, fg) {
          if (!E.reduceMotion) t += dt;
          (E.spinners.fan || []).forEach(g => g.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 7 * t));
          term.tick(now); keys.tick(now, fg);
        },
        recolor(fg, bg) { term.recolor(fg, bg); },
      };
    },
  };
})();
