/*!
 * blueprintspace 1.0.0: interactive 3D blueprint illustrations as a <blueprint-model> web component.
 *
 *   <script type="module" src="https://cdn.jsdelivr.net/npm/blueprintspace@1.0.0/index.js"></script>
 *   <blueprint-model model="gameboy" theme="amber" render="photo"></blueprint-model>
 *
 * Each model runs in its own sandboxed iframe (so its scripts and styles can't touch your page) and is loaded
 * from the CDN by default; set `base` (or BlueprintModel.base) to serve the package's models/ folder yourself.
 */
const VERSION = "1.0.0";
export const models = [{"id":"macintosh","label":"Macintosh 128K","kind":"desktop","category":"Computers","tags":"desktop apple mac 1984 computer"},{"id":"typewriter","label":"Vintage Typewriter","kind":"machine","category":"Computers","tags":"typewriter vintage retro office keys type mechanical animated"},{"id":"spectre","label":"Spectre x360 14","kind":"laptop","category":"Computers","tags":"laptop hp convertible notebook 2-in-1"},{"id":"macbookpro","label":"MacBook Pro 14 (M5)","kind":"laptop","category":"Computers","tags":"laptop apple macbook pro m5 notebook 2025"},{"id":"gamingpc","label":"Custom Gaming PC","kind":"desktop","category":"Computers","tags":"pc gaming custom build tower desktop rgb gpu cpu aio liquid cooling fans animated"},{"id":"framework","label":"Framework Laptop 13","kind":"laptop","category":"Computers","tags":"framework laptop 13 repairable modular expansion cards notebook linux"},{"id":"iphone17","label":"iPhone 17","kind":"phone","category":"Phones","tags":"phone apple smartphone mobile"},{"id":"walkman","label":"Sony Walkman","kind":"player","category":"Audio","tags":"walkman sony tps-l2 cassette tape player music 1979 retro portable animated"},{"id":"gameboy","label":"Game Boy","kind":"console","category":"Consoles","tags":"game boy gameboy nintendo dmg handheld 1989 retro tetris cartridge"},{"id":"playdate","label":"Playdate","kind":"console","category":"Consoles","tags":"playdate panic handheld crank yellow 1-bit games"},{"id":"gbconcept","label":"Game Boy Concept","kind":"console","category":"Consoles","tags":"game boy concept translucent smoke redesign handheld modern purple"},{"id":"playstation","label":"PlayStation","kind":"console","category":"Consoles","tags":"console sony ps1 psx playstation 1 dualshock controller 1994 games"},{"id":"ps3","label":"PlayStation 3","kind":"console","category":"Consoles","tags":"console sony ps3 cell dualshock 3 sixaxis 2006 games blu-ray"},{"id":"ps4","label":"PlayStation 4","kind":"console","category":"Consoles","tags":"console sony ps4 dualshock 4 2013 games"},{"id":"ps5","label":"PlayStation 5","kind":"console","category":"Consoles","tags":"console sony ps5 dualsense 2020 games"},{"id":"xbox","label":"Xbox Series X","kind":"console","category":"Consoles","tags":"xbox series x microsoft console games 2020 fan"},{"id":"switch","label":"Nintendo Switch (OLED)","kind":"console","category":"Consoles","tags":"nintendo switch oled handheld console joy-con games portable"},{"id":"psp","label":"PlayStation Portable","kind":"console","category":"Consoles","tags":"psp playstation portable sony handheld umd 2004 games"},{"id":"morph","label":"Morph Handheld","kind":"console","category":"Consoles","tags":"morph handheld console concept retro controller screen orange cream design"},{"id":"steam","label":"Steam Machine","kind":"console","category":"Consoles","tags":"steam machine valve console pc gaming steamos fan led"},{"id":"cpu","label":"X9 Processor","kind":"chip","category":"Components","tags":"chip cpu desktop socket lga"},{"id":"egpu","label":"EG-1 eGPU","kind":"egpu","category":"Components","tags":"egpu external gpu graphics card enclosure thunderbolt fans pcie"},{"id":"turbofan","label":"TF-9 Turbofan","kind":"engine","category":"Engines","tags":"engine jet turbine aircraft"},{"id":"v8","label":"V8 Engine","kind":"engine","category":"Engines","tags":"v8 engine motor car pushrod small block pistons crankshaft animated"},{"id":"hover","label":"HV-9 Hover Hauler","kind":"vehicle","category":"Vehicles","tags":"vehicle hover hovercraft futuristic sci-fi spaceship ship hauler"},{"id":"cybertruck","label":"Cybertruck","kind":"truck","category":"Vehicles","tags":"cybertruck tesla truck pickup electric ev vehicle car"},{"id":"spaceship","label":"SX-7 Starhopper","kind":"spaceship","category":"Vehicles","tags":"spaceship starship space ship sci-fi shuttle rocket starhopper spacecraft"},{"id":"rubiks","label":"Rubik's Cube","kind":"puzzle","category":"Toys","tags":"rubiks rubik cube puzzle toy 3x3 speedcube animated"},{"id":"ledcube","label":"LED Cube","kind":"gadget","category":"Gadgets","tags":"led cube volumetric display voxel light lamp gadget animated red"}];
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
