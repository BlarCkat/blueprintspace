/*!
 * blueprintspace __VERSION__: interactive 3D blueprint illustrations as a <blueprint-model> web component.
 *
 *   <script type="module" src="https://cdn.jsdelivr.net/npm/blueprintspace@__VERSION__/index.js"></script>
 *   <blueprint-model model="gameboy" theme="amber" render="photo"></blueprint-model>
 *
 *   el.animation = true; el.transparent = true; el.xray = false; el.exploded = true; el.autorotate = 20;
 *
 * Each model runs in its own sandboxed iframe (so its scripts and styles can't touch your page) and is loaded
 * from the CDN by default; set `base` (or BlueprintModel.base) to serve the package's models/ folder yourself.
 */
const VERSION = "__VERSION__";
export const models = /*MODELS*/[];
const CDN = `https://cdn.jsdelivr.net/npm/blueprintspace@${VERSION}/`;

// where models/ and thumbs/ live: next to this file when it's loaded from a CDN, the CDN otherwise (a bundler
// copies this file but not the folders beside it)
const here = (() => { try { return new URL(".", import.meta.url).href; } catch (e) { return CDN; } })();
const defaultBase = /(^https?:\/\/(cdn\.jsdelivr\.net|unpkg\.com|esm\.sh))/.test(here) ? here : CDN;

// options that change live in the running model, and those that need it reloaded
const LIVE = ["theme", "render", "transparent", "controls", "labels", "xray", "exploded", "animation", "autorotate", "interactive"];
const RELOAD = ["motion", "background"];
const BOOLEAN = ["transparent", "controls", "labels", "xray", "animation", "interactive", "motion"];
// a boolean attribute: present (or "true"/"1"/"on") is on, "false"/"0"/"off" is off, absent is the default
const parse = v => v === null ? null : !/^(false|0|off|no)$/i.test(v);
const STYLE = `
  :host { display: block; position: relative; aspect-ratio: 4 / 3; min-height: 120px; contain: content; }
  :host([hidden]) { display: none; }
  iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; display: block; background: transparent; color-scheme: normal; }
`;

/** A thumbnail URL for a model: its line drawing as a white-on-transparent WebP, usable as an image or a CSS mask. */
export function thumbnail(id, base) {
  return new URL("thumbs/" + id + ".webp", base || BlueprintModel.base || defaultBase).href;
}

export class BlueprintModel extends HTMLElement {
  static get observedAttributes() { return ["model", "base", ...LIVE, ...RELOAD]; }
  /** Where the package's files are served from (the folder holding models/ and thumbs/). */
  static base = "";
  static models = models;
  static version = VERSION;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLE}</style><iframe part="frame" loading="lazy" allow="fullscreen"></iframe>`;
    this._frame = root.querySelector("iframe");
    this._ready = false;
    this._queue = [];
    this._onMessage = e => {
      if (e.source !== this._frame.contentWindow || !e.data || e.data.type !== "blueprint") return;
      if (e.data.event === "ready") {
        this._ready = true;
        // bring the model up to date with options set while it was loading, then anything queued
        LIVE.forEach(k => { if (this.hasAttribute(k)) this._post({ type: "blueprint", action: "set", key: k, value: this._value(k) }); });
        this._queue.splice(0).forEach(m => this._post(m));
        this.dispatchEvent(new CustomEvent("ready", { detail: { model: this.model, title: e.data.title } }));
      }
    };
  }
  connectedCallback() { addEventListener("message", this._onMessage); this._load(); }
  disconnectedCallback() { removeEventListener("message", this._onMessage); }
  attributeChangedCallback(name, before, after) {
    if (!this.isConnected || before === after) return;
    if (LIVE.includes(name)) {
      // a live option goes straight to the running model; before it's ready, the address carries it
      if (this._ready) this._send("set", this._value(name), name);
      return;
    }
    this._load();
  }

  // ---------- properties: each mirrors its attribute ----------
  /** The model's id, e.g. "ps5". */
  get model() { return this.getAttribute("model") || ""; }
  set model(v) { this.setAttribute("model", v); }
  /** The model's entry in the manifest: { id, label, kind, category, tags }. */
  get info() { return models.find(m => m.id === this.model) || null; }
  /** "dark" | "light" | "amber" | "navy" | "lime", with ":inv" to swap background and lines. */
  get theme() { return this.getAttribute("theme") || "dark"; }
  set theme(v) { this.setAttribute("theme", v); }
  /** "lines" | "shaded" | "photo". */
  get render() { return this.getAttribute("render") || "lines"; }
  set render(v) { this.setAttribute("render", v); }
  /** Show your page behind the model instead of the theme's background. */
  get transparent() { return parse(this.getAttribute("transparent")) === true; }
  set transparent(v) { this._bool("transparent", v); }
  /** Show the model page's own buttons, title and hints. */
  get controls() { return parse(this.getAttribute("controls")) === true; }
  set controls(v) { this._bool("controls", v); }
  /** Show the callout labels on the parts. */
  get labels() { return parse(this.getAttribute("labels")) === true; }
  set labels(v) { this._bool("labels", v); }
  /** X-ray: hidden edges faintly visible through the parts (on by default). */
  get xray() { return parse(this.getAttribute("xray")) !== false; }
  set xray(v) { this._bool("xray", v); }
  /** true: taken apart; false: assembled; null (no attribute): it comes apart while hovered. */
  get exploded() { return parse(this.getAttribute("exploded")); }
  set exploded(v) { if (v === null || v === undefined || v === "hover") this.removeAttribute("exploded"); else this.setAttribute("exploded", v ? "true" : "false"); }
  /** The model's own animation: a screen, a game, an LED pattern (models without one ignore it). */
  get animation() { return parse(this.getAttribute("animation")) === true; }
  set animation(v) { this._bool("animation", v); }
  /** Turn the model slowly: true, or a speed in degrees a second. 0 or false stops it. */
  get autorotate() { const v = this.getAttribute("autorotate"); return v === null || /^(false|0|off|no)$/i.test(v) ? 0 : parseFloat(v) || 12; }
  set autorotate(v) { if (!v) this.removeAttribute("autorotate"); else this.setAttribute("autorotate", v === true ? "" : String(v)); }
  /** Let people turn, zoom and take the model apart with the pointer (on by default). */
  get interactive() { return parse(this.getAttribute("interactive")) !== false; }
  set interactive(v) { this._bool("interactive", v); }
  /** Moving parts (fans, reels, cranks) and camera easing; off keeps everything still. On by default. */
  get motion() { return parse(this.getAttribute("motion")) !== false; }
  set motion(v) { this._bool("motion", v); }

  // ---------- one-off actions ----------
  /** Take the model apart, or put it back together. */
  explode() { this._send("explode"); }
  /** Start or stop the model's own animation. */
  toggleAnimation() { this.animation = !this.animation; }
  /** Play the "how it works" tour. */
  tour() { this._send("tour"); }
  /** Back to the starting view. */
  reset() { this._send("reset"); }
  setTheme(t) { this.theme = t; }
  setRender(r) { this.render = r; }

  _bool(name, v) { this.setAttribute(name, v ? "true" : "false"); }
  // what an attribute means for the running model
  _value(name) {
    const v = this.getAttribute(name);
    if (name === "theme" || name === "render") return v;
    if (name === "exploded") return v === null ? "hover" : parse(v);
    if (name === "autorotate") return this.autorotate || false;
    if (name === "xray" || name === "interactive") return parse(v) !== false;
    return parse(v) === true;
  }
  _url() {
    const base = this.getAttribute("base") || BlueprintModel.base || defaultBase;
    const q = new URLSearchParams();
    [...LIVE, ...RELOAD].forEach(k => {
      if (!this.hasAttribute(k)) return;
      const v = this._value(k);
      q.set(k, v === true ? "1" : v === false ? "0" : String(v));
    });
    return new URL("models/" + encodeURIComponent(this.model) + ".html", new URL(base, location.href)).href + "#embed" + (q.toString() ? "&" + q : "");
  }
  _load() {
    if (!this.model) return;
    if (!models.some(m => m.id === this.model)) console.warn(`<blueprint-model>: no model "${this.model}". Models: ${models.map(m => m.id).join(", ")}`);
    this._ready = false;
    this._queue = [];
    this._frame.title = (this.info && this.info.label) || this.model;
    this._frame.src = this._url();
  }
  _send(action, value, key) {
    const msg = { type: "blueprint", action, key, value };
    if (this._ready) this._post(msg); else if (action !== "set") this._queue.push(msg);
  }
  _post(msg) { try { this._frame.contentWindow.postMessage(msg, "*"); } catch (e) {} }
}

if (typeof customElements !== "undefined" && !customElements.get("blueprint-model")) customElements.define("blueprint-model", BlueprintModel);
export default BlueprintModel;
