/*
Renders a thumbnail of every model in index.html for the home page's grid: the line drawing at the model's default
view, page chrome hidden, saved as a PNG of white lines on the dark theme. tools/thumbs.py then turns each into a
WebP whose alpha is the lines (the fills that hide the back edges drop out), so the home page can colour them with
any theme by using them as a CSS mask.

    NODE_PATH=<dir with playwright-core> node tools/thumbs.js <out dir> [id ...]
    python3 tools/thumbs.py <out dir> thumbs

Needs playwright-core and a Chromium (CHROMIUM=path, default /opt/pw-browsers/chromium-1194/chrome-linux/chrome), and
three.js r128 from node_modules/three (THREE_JS=path) since the pages load it from a CDN.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const REPO = path.join(__dirname, "..");
const [, , OUT, ...only] = process.argv;
if (!OUT) { console.error("usage: node tools/thumbs.js <out dir> [id ...]"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const gallery = fs.readFileSync(path.join(REPO, "index.html"), "utf8");
const models = JSON.parse(gallery.match(/\n  const MODELS = (\[.*\]);\n/)[1]);
const three = process.env.THREE_JS || require.resolve("three/build/three.min.js");
const HIDE = `.page, .hint, .dwg, #hotspots, .sheet, .viewbar, .panpad, .flow, .exportbar, .tour, .detail, #tip, .bp-controls { display: none !important; }
  html, body { background: #000 !important; }`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.route("**/*", r => {
    const u = r.request().url();
    if (u.includes("three.min.js")) return r.fulfill({ body: fs.readFileSync(three), contentType: "application/javascript" });
    return u.startsWith("file:") || u.startsWith("data:") ? r.continue() : r.abort();
  });
  const tmp = path.join(OUT, "page.html");
  for (const m of models) {
    if (only.length && !only.includes(m.id)) continue;
    fs.writeFileSync(tmp, m.html);
    // the dark theme, the line drawing, nothing animating on a screen
    await p.addInitScript(k => { try { localStorage.setItem(k, "dark"); } catch (e) {} }, m.key);
    await p.goto("file://" + tmp);
    await p.addStyleTag({ content: HIDE });
    await p.waitForTimeout(m.id === "turbofan" ? 4500 : 2600);
    // pages that frame a part set well apart (the PS5's controller) zoom in on the main one
    const zoom = { ps5: [1190, 20, 2] }[m.id];
    if (zoom) { await p.mouse.move(zoom[0], zoom[1]); for (let i = 0; i < zoom[2]; i++) { await p.mouse.wheel(0, -200); await p.waitForTimeout(60); } await p.waitForTimeout(1200); }
    await p.mouse.move(1199, 899);   // keep the pointer off the model so it stays closed
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(OUT, m.id + ".png") });
    console.log("rendered", m.id);
  }
  fs.unlinkSync(tmp);
  await b.close();
})();
