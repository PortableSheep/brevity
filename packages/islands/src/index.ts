import { html, serializeJson, type HtmlFragment } from "@brevity/web";

export type Hydration = "load" | "visible" | "idle" | "interaction";
export type IslandOptions = { hydrate?: Hydration; fallback?: HtmlFragment };
export type IslandManifest = Readonly<Record<string, string>>;
export type IslandConfig = { manifest: string; loader: string; nonce?: string };

function assetUrl(url: string): string {
  if (!url.startsWith("/") || url.startsWith("//") || !/^[\x21-\x7e]+$/.test(url) || /[\\%?#\s]/.test(url)
    || new URL(url, "https://localhost").pathname !== url) {
    throw new TypeError(`Island asset must be a canonical same-origin path: ${url}`);
  }
  return url;
}

/** Validate the explicit module URL map before serving it as application/json. */
export function islandManifest(entries: IslandManifest): IslandManifest {
  return Object.fromEntries(Object.entries(entries).map(([name, url]) => {
    if (!name) throw new TypeError("Island name cannot be empty");
    return [name, assetUrl(url)];
  }));
}

export type EnhanceConfig = { script: string; nonce?: string };

/**
 * Wrap server-rendered form markup in a stable target that `enhance.js` upgrades with `enhanceForm`.
 * The same `id` must wrap the form in 422/409 responses. No manifest, loader, or island module needed.
 */
export function createEnhance(config: EnhanceConfig) {
  const script = assetUrl(config.script);
  return function enhanced(id: string, content: HtmlFragment): HtmlFragment {
    if (!/^[A-Za-z][\w-]*$/.test(id)) throw new TypeError(`Enhanced form target needs a simple ID: ${id}`);
    return html`<div id="${id}" data-brevity-enhance>${content}</div><script type="module" src="${script}"${config.nonce ? html` nonce="${config.nonce}"` : html``}></script>`;
  };
}

export function createIslands(config: IslandConfig) {
  const manifest = assetUrl(config.manifest);
  const loader = assetUrl(config.loader);
  return function island<Props>(name: string, props: Props, options: IslandOptions = {}): HtmlFragment {
    if (!name) throw new TypeError("Island name cannot be empty");
    const hydrate = options.hydrate ?? "load";
    if (!["load", "visible", "idle", "interaction"].includes(hydrate)) {
      throw new TypeError(`Unknown hydration strategy: ${hydrate}`);
    }
    return html`<div data-brevity-island="${name}" data-hydrate="${hydrate}" data-manifest="${manifest}" data-props="${serializeJson(props)}">${options.fallback}</div><script type="module" src="${loader}"${config.nonce ? html` nonce="${config.nonce}"` : html``}></script>`;
  };
}
