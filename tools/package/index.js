/*!
 * blueprintspace __VERSION__: interactive 3D blueprint illustrations as a <blueprint-model> web component.
 *
 *   <script type="module" src="https://cdn.jsdelivr.net/npm/blueprintspace@__VERSION__/index.js"></script>
 *   <blueprint-model model="gameboy" theme="amber" render="photo"></blueprint-model>
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

const OPTIONS = ["theme", "render", "background", "controls", "labels", "interactive"];
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
  static get observedAttributes() { return ["model", "base", ...OPTIONS]; }
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
        this._queue.splice(0).forEach(m => this._post(m));
        this.dispatchEvent(new CustomEvent("ready", { detail: { model: this.model, title: e.data.title } }));
      }
    };
  }
  connectedCallback() { addEventListener("message", this._onMessage); this._load(); }
  disconnectedCallback() { removeEventListener("message", this._onMessage); }
  attributeChangedCallback(name, before, after) {
    if (!this.isConnected || before === after) return;
    // the theme and render style change live; anything else reloads the model
    if ((name === "theme" || name === "render") && this._ready) return this._send(name, after);
    this._load();
  }

  /** The model's id, e.g. "ps5". */
  get model() { return this.getAttribute("model") || ""; }
  set model(v) { this.setAttribute("model", v); }
  /** The model's entry in the manifest: { id, label, kind, category, tags }. */
  get info() { return models.find(m => m.id === this.model) || null; }

  /** Take the model apart, or put it back together. */
  explode() { this._send("explode"); }
  /** Start or stop the model's own animation (a screen, a game). */
  animate() { this._send("animate"); }
  /** Play the "how it works" tour. */
  tour() { this._send("tour"); }
  /** Back to the starting view. */
  reset() { this._send("reset"); }
  /** Show or hide the labels (also needs the labels attribute). */
  toggleLabels() { this._send("labels"); }
  /** X-ray: hidden edges faintly visible through the parts. */
  xray() { this._send("xray"); }
  setTheme(t) { this.setAttribute("theme", t); }
  setRender(r) { this.setAttribute("render", r); }

  _url() {
    const base = this.getAttribute("base") || BlueprintModel.base || defaultBase;
    const q = new URLSearchParams();
    OPTIONS.forEach(k => { if (this.hasAttribute(k)) q.set(k, this.getAttribute(k) || "1"); });
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
  _send(action, value) {
    const msg = { type: "blueprint", action, value };
    if (this._ready) this._post(msg); else this._queue.push(msg);
  }
  _post(msg) { try { this._frame.contentWindow.postMessage(msg, "*"); } catch (e) {} }
}

if (typeof customElements !== "undefined" && !customElements.get("blueprint-model")) customElements.define("blueprint-model", BlueprintModel);
export default BlueprintModel;
