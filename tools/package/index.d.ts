/** blueprintspace __VERSION__: interactive 3D blueprint illustrations as a <blueprint-model> web component. */

export type ModelId = /*IDS*/string;
export type Theme = "dark" | "light" | "amber" | "navy" | "lime" | "dark:inv" | "light:inv" | "amber:inv" | "navy:inv" | "lime:inv";
export type Render = "lines" | "shaded" | "photo";

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
  model: ModelId;
  readonly info: ModelInfo | null;
  explode(): void;
  animate(): void;
  tour(): void;
  reset(): void;
  toggleLabels(): void;
  xray(): void;
  setTheme(theme: Theme): void;
  setRender(render: Render): void;
}
export default BlueprintModel;

declare global {
  interface HTMLElementTagNameMap { "blueprint-model": BlueprintModel; }
  namespace JSX {
    interface IntrinsicElements {
      "blueprint-model": {
        model: ModelId; theme?: Theme; render?: Render; background?: "transparent" | "theme";
        controls?: boolean | "" | "1" | "0"; labels?: boolean | "" | "1" | "0"; interactive?: "1" | "0"; base?: string;
        class?: string; className?: string; style?: unknown; id?: string; ref?: unknown;
      };
    }
  }
}
