/** blueprintspace 1.0.0: interactive 3D blueprint illustrations as a <blueprint-model> web component. */

export type ModelId = "macintosh" | "typewriter" | "spectre" | "macbookpro" | "gamingpc" | "framework" | "iphone17" | "walkman" | "gameboy" | "playdate" | "gbconcept" | "playstation" | "ps3" | "ps4" | "ps5" | "xbox" | "switch" | "psp" | "morph" | "steam" | "cpu" | "egpu" | "turbofan" | "v8" | "hover" | "cybertruck" | "spaceship" | "rubiks" | "ledcube";
export type Theme = "dark" | "light" | "amber" | "navy" | "lime" | "dark:inv" | "light:inv" | "amber:inv" | "navy:inv" | "lime:inv";
export type Render = "lines" | "shaded" | "photo";
/** A boolean attribute: present or "true" is on, "false" is off. */
export type Flag = boolean | "" | "true" | "false";

export interface ModelInfo { id: ModelId; label: string; kind: string; category: string; tags: string; }

/** Every model in the package. */
export declare const models: ModelInfo[];
/** A thumbnail URL for a model: its line drawing as a white-on-transparent WebP. */
export declare function thumbnail(id: ModelId, base?: string): string;

export declare class BlueprintModel extends HTMLElement {
  /** Where the package's files are served from (the folder holding models/ and thumbs/); the CDN by default. */
  static base: string;
  static readonly models: ModelInfo[];
  static readonly version: string;
  /** The model's id. Changing it loads another model. */
  model: ModelId;
  readonly info: ModelInfo | null;
  theme: Theme;
  render: Render;
  /** Show your page behind the model. */
  transparent: boolean;
  /** Show the model page's own buttons, title and hints. */
  controls: boolean;
  /** Show the callout labels. */
  labels: boolean;
  /** Hidden edges faintly through the parts (default true). */
  xray: boolean;
  /** true: apart; false: assembled; null: comes apart while hovered (default). */
  exploded: boolean | null;
  /** The model's own animation (a screen, a game, an LED pattern). */
  animation: boolean;
  /** Slow turn: true, or degrees a second; 0/false stops it. */
  autorotate: number | boolean;
  /** Pointer turns, zooms and takes it apart (default true). */
  interactive: boolean;
  /** Moving parts and camera easing (default true); false keeps everything still. Reloads the model. */
  motion: boolean;
  explode(): void;
  toggleAnimation(): void;
  tour(): void;
  reset(): void;
  setTheme(theme: Theme): void;
  setRender(render: Render): void;
}
export default BlueprintModel;

declare global {
  interface HTMLElementTagNameMap { "blueprint-model": BlueprintModel; }
  namespace JSX {
    interface IntrinsicElements {
      "blueprint-model": {
        model: ModelId; theme?: Theme; render?: Render; base?: string;
        transparent?: Flag; controls?: Flag; labels?: Flag; xray?: Flag; exploded?: Flag | "hover"; animation?: Flag;
        autorotate?: Flag | number; interactive?: Flag; motion?: Flag;
        class?: string; className?: string; style?: unknown; id?: string; ref?: unknown;
      };
    }
  }
}
