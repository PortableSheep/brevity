# @brevity/islands

Optional native islands. Zero direct runtime dependencies; web is the only
peer. The Svelte 5 adapter lives in the separate `@brevity/islands-svelte`.

```ts
import { createIslands, islandManifest } from "@brevity/islands";
const island = createIslands({ manifest: "/assets/islands.json", loader: "/assets/loader.js" });
// Inside a file view's helpers: island("counter", { count: 0 }, { hydrate: "visible", fallback })
app.router.get("/assets/islands.json", (_req, res) =>
  res.json(islandManifest({ counter: "/assets/counter.js" })),
);
```

Serve `@brevity/islands/loader.js` and your bundled modules with web's explicit
`staticAssets` map. Props use `serializeJson` plus HTML attribute escaping.
Fallback is a trusted HtmlFragment: provide usable no-JS content.
Hydrate strategies: load, visible, idle, interaction. Interaction does not cancel
or replay the initiating event. Failed islands log and emit `brevity:island-error`.

```ts
import { defineIsland } from "@brevity/islands/client";
export default defineIsland<{ count: number }>((el, props, ctx) => {
  el.textContent = String(props.count);
  return () => {};
});
```

`ctx.signal` supports abortable listeners. `startIslands(root)` returns a disposer
for application-owned client navigation. There is no automatic DOM observer.
`enhanceForm` in `/forms` fetches native same-origin POST forms, restores pending
controls, retains server-rendered 422/409 feedback, focuses errors and handles
redirects. Give it a stable containing target ID present in returned HTML.
Handle `brevity:form-error` visibly; validation/auth/CSRF remain application-owned.
When the loader is present, islands inside a replaced target are disposed and
restarted automatically (`brevity:before-replace` / `brevity:replaced`).

Forms-only pages can skip the loader: `createEnhance({ script })` returns
`enhanced(id, html)`, which wraps markup in `data-brevity-enhance` and loads
`@brevity/islands/enhance.js` to call `enhanceForm` automatically.

`svelteIsland(Component)` in `@brevity/islands-svelte` adapts Svelte 5. Native
loader has no framework runtime. Vite is optional application build tooling.
Use same-origin script/connect CSP; no inline executable script is generated.
Nonce support is explicit; dynamic module CSP and asset hashing stay app-owned.

Loader measurement: 1,998 bytes minified / 941 bytes default gzip; standalone
form directive `enhance.js`: 2,943 / 1,332,
esbuild 0.28.1, ES2022. Excludes components, forms helper, Svelte and page props.
Reproduce with the repository's `scripts/build-islands.mjs`.
See `docs/guide/islands.md` for checked examples and limitations.
