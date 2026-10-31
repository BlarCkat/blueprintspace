# blueprintspace

Interactive 3D blueprint illustrations — consoles, computers, engines, vehicles and gadgets — that you can drop into any website or app as a `<blueprint-model>` element. Each one can be turned and zoomed, taken apart into an exploded view, toured, animated, and shown as a line drawing, shaded, or as a photoshoot-style render.

## Use it from a CDN

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/blueprintspace@__VERSION__/index.js"></script>

<blueprint-model model="gameboy" theme="amber" render="photo"></blueprint-model>
```

## Use it from npm

```sh
npm install blueprintspace
```

```js
import "blueprintspace";                       // registers <blueprint-model>
import { models, thumbnail } from "blueprintspace";
```

```jsx
// React 19+, Vue, Svelte, Angular and plain HTML all take custom elements as they are
<blueprint-model model="ps5" render="shaded" style={{ width: "100%" }} />
```

By default the models load from the jsDelivr CDN, matching the installed version. To serve them yourself, copy `node_modules/blueprintspace/models` and `thumbs` into your public folder and point the element at them:

```js
import { BlueprintModel } from "blueprintspace";
BlueprintModel.base = "/blueprintspace/";      // the folder that holds models/ and thumbs/
```

or per element: `<blueprint-model base="/blueprintspace/" model="v8">`.

## Attributes and properties

Every option is both an HTML attribute and a JavaScript property on the element. Boolean attributes are on when present (or `"true"`), off with `"false"`.

| Attribute / property | Values | Default | |
|---|---|---|---|
| `model` | a model id (below) | — | reloads |
| `theme` | `dark` `light` `amber` `navy` `lime`, or any with `:inv` to swap background and lines | `dark` | live |
| `render` | `lines` `shaded` `photo` | `lines` | live |
| `transparent` | boolean: show your page behind the model | off | live |
| `animation` | boolean: the model's own animation — a screen, a game, an LED pattern | off | live |
| `xray` | boolean: hidden edges faintly through the parts | on | live |
| `exploded` | `true` taken apart, `false` assembled; absent: comes apart while hovered | hover | live |
| `labels` | boolean: callout labels on the parts | off | live |
| `controls` | boolean: the model page's own buttons, title and hints | off | live |
| `autorotate` | boolean, or degrees a second (`autorotate="20"`) | off | live |
| `interactive` | boolean: turn, zoom and take it apart with the pointer | on | live |
| `motion` | boolean: moving parts and camera easing; `false` keeps it all still | on | reloads |
| `base` | where `models/` and `thumbs/` are served from | the CDN | reloads |

```html
<blueprint-model model="playdate" render="photo" theme="amber" animation autorotate="15" xray="false"></blueprint-model>
```

```js
const el = document.querySelector("blueprint-model");
el.animation = true;     // start its animation
el.transparent = true;   // let the page show through
el.xray = false;         // no hidden edges
el.exploded = true;      // take it apart (false: put it together, null: hover again)
el.autorotate = 20;      // turn at 20 degrees a second (0 stops)
el.interactive = false;  // a still picture that ignores the pointer
el.theme = "navy:inv";
el.render = "shaded";
```

The element sizes like an image: it fills its width at 4:3 unless you give it a height.

## Methods and events

```js
el.explode();            // toggle apart / together
el.toggleAnimation();
el.tour();               // play the "how it works" tour
el.reset();              // back to the starting view
el.addEventListener("ready", e => console.log(e.detail.title));
```

In React, set the boolean options as attributes (`animation="true"`, `xray="false"`) or through a ref (`ref.current.animation = true`).

## Thumbnails

`thumbnail(id)` gives the URL of a model's line drawing as a white-on-transparent WebP — use it as an `<img>`, or as a CSS mask to colour it:

```css
.icon { background: currentColor; mask: url(https://cdn.jsdelivr.net/npm/blueprintspace@__VERSION__/thumbs/v8.webp) center / contain no-repeat; }
```

## Models

| id | Model | Category |
|---|---|---|
<!--MODELS-->

`models.json` lists them with their tags.

## Notes

- Each model runs in a sandboxed iframe, so its scripts and styles never touch your page. Pages load three.js from cdnjs and fonts from Google Fonts.
- Some models depict real products; they're illustrations, not affiliated with or endorsed by their makers.
