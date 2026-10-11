# Native islands

An **island** is a small browser component mounted into a server-rendered page.
The surrounding page and forms remain ordinary HTML. You do not need a client
router or a second application. `@brevity/islands` is optional and has **zero
direct runtime dependencies**; its required peer is `@brevity/web` (which peers
on core). It has no Svelte peer: the Svelte 5 adapter is the separate
`@brevity/islands-svelte` package, so native-only apps never resolve Svelte.

## Server markup

Configure `createIslands({ manifest, loader, nonce? })` once. Its returned
`island(name, props, { hydrate, fallback })` emits a wrapper and an external
module script. Props reuse web's `serializeJson` escaping and are encoded into
a data attribute; there is no executable inline script or JSON script block.
Fallback must be an application-owned `HtmlFragment`, not raw untrusted text.

<<< @/samples/native/server.ts

<<< @/samples/native/views/strategies.html

The loader runs once as an ES module even if multiple islands emit its script
tag. It fetches each manifest once per start and lazily imports named modules.
Unknown components, bad JSON, failed imports, and mount errors are logged and
emit a bubbling `brevity:island-error`; another island still mounts. Native
components should preserve fallback until ready, and avoid partial mutations
before throwing. Islands are not SSR or automatic framework hydration.

| Strategy | Mount begins |
|---|---|
| `load` (default) | When the external module runs |
| `visible` | When IntersectionObserver sees the wrapper; immediate if unsupported |
| `idle` | requestIdleCallback, or a 200 ms timer if unsupported |
| `interaction` | First pointerdown, focusin, or keydown inside the wrapper |

Interaction scheduling **does not cancel or replay the triggering event**.
A first click on a native link/form still works before enhancement finishes.
Use `load` when the first interaction must already be enhanced.

## Plain TypeScript components

<<< @/samples/native/counter.ts

`defineIsland<Props>((el, props, ctx) => cleanup?)` is an identity helper with
strict component types. A module exports it as `default`. Async mounts may
return a promise of cleanup. `ctx.signal` supports abortable listeners.
Treat props as application data; validate untrusted shapes where necessary.

`startIslands(root?)` from `@brevity/islands/client` scans once, skips already
started elements, and returns a disposer. For custom client navigation call
the disposer **before** removing a page, then start on the new content.
There is no client router, global mutation observer, or automatic rehydration.
The standalone loader is intended for ordinary full-page navigation.

## Enhanced native forms

<<< @/samples/native/form.ts

<<< @/samples/native/views/form.html

`enhanceForm(form, { target, signal?, onResponse? })` intercepts same-origin POST
forms only. The target must contain the form and have a stable ID also present
in the server response. Fetch uses the form's native encoding, cookies, and
submitter, with `Accept: text/html`. Keep server validation, CSRF/origin policy,
and authorization in the application.

Pending disables submit buttons and sets `aria-busy`, restoring their original
states on failure. **422 and 409** HTML replace the target with server-rendered
retained values/errors and focus its alert or invalid field. The replacement
form is rebound. Successful nonredirect HTML can update the same target; a
redirect navigates to the same-origin final URL. `onResponse` receives a clone
for application acknowledgement hooks. Returned scripts do not execute; keep
the enhancement outside the replacement target.

Unsupported methods/targets, cross-origin actions, submitter method/action/
encoding overrides, and unsupported file encoding use native submission.
Network/protocol errors log and emit `brevity:form-error`, retaining the input
and restoring controls; handle that event with a visible application error.
Completed HTML replacements emit `brevity:form-response` with `{ status }`.
Dispose aborts in-flight work. Do not replace the target or navigate while
keeping old listeners alive.

Form controls named `action`, `method`, `target`, or `enctype` (for example
`<button name="action" value="publish">`) are safe: submission attributes are
read from the form's HTML attributes, not its shadowable DOM properties.

### Nested islands restart after replacement

Around each replacement, `enhanceForm` dispatches `brevity:before-replace` and
`brevity:replaced` on the target. When the islands loader is on the page, it
disposes islands inside the old markup and starts islands in the new markup,
so an island inside a re-rendered 422 form keeps working without app glue.
Include the loader in the initial page if replacements can contain islands;
scripts inside replaced HTML do not execute.

## Form enhancement directive

When a page only needs a progressively enhanced form, skip the loader,
manifest, and island module. `createEnhance` wraps server-rendered markup in a
stable target marked `data-brevity-enhance`, plus the standalone
`@brevity/islands/enhance.js` script that calls `enhanceForm` on its first form:

<<< @/samples/native/views/enhanced.html

<<< @/samples/native/server.ts#enhance-setup

<<< @/samples/native/server.ts#enhance-route

Render with the same target ID for GET, 422 and 409 responses.

Serve `enhance.js` with `staticAssets` like the loader. With JavaScript
disabled the form submits natively. This example also nests a counter island
that the loader restarts after each replacement.

## Assets: no Vite required

<<< @/samples/native/build.mjs

This example uses esbuild as application tooling to bundle each native module,
including the small form helper only where needed. Serve the exported
`@brevity/islands/loader.js` via `staticAssets`, and serve `islandManifest(...)`
as JSON. Manifest names map to explicit canonical same-origin module URLs;
loader, module and chunk assets all need explicit static maps.
Plain JavaScript modules need no bundler; TypeScript must be compiled and its
browser imports resolved. The loader itself has no bare package imports.

`islandManifest` validates a URL map; it is not a compiler or filesystem scanner.
Its URLs may point to application-bundled hashed modules. Use `no-cache` for
fixed names; use immutable caching only for content-hashed assets. Native import
paths are resolved relative to the manifest URL.

## Svelte and Vite

<<< @/samples/island/server.ts

<<< @/samples/island/client/main.ts

<<< @/samples/island/vite.config.ts

`svelteIsland(Component)` from `@brevity/islands-svelte` mounts Svelte 5 with props and unmounts on disposal.
It replaces the fallback only after mounting into a new container. There is
no Svelte runtime in the native loader. The application installs/compiles
Svelte. A Preact adapter is not included; any framework can implement the same
mount/cleanup function.

With Vite, map your island names to built entry URLs (from your own build
manifest or fixed library entry as here), and explicitly serve every emitted
chunk/CSS asset.

::: warning Multiple island entries
Library mode (above) keeps each entry's exports. If you instead build several
islands as app entries via `build.rollupOptions.input`, set
`build.rollupOptions.preserveEntrySignatures: "strict"`. Otherwise Rollup may
tree-shake the entry's `default` export and the loader finds no island.
:::

Vite's manifest is not the islands URL map: convert selected
entries to `islandManifest({ name: "/assets/entry-hash.js" })` and map its
referenced assets too. Brevity neither compiles nor rewrites Vite output.

## CSP and no JavaScript

The checked browser fixture uses `script-src 'self'; object-src 'none';
base-uri 'none'`, with no inline executable scripts. Allow same-origin manifest
fetches in `connect-src`, and external modules in `script-src`. Nonce-based
policies can pass `nonce` to `createIslands`; include the same nonce in the CSP
and permit trusted dynamic imports via your policy (for example strict-dynamic).
Static hashes/SRI require deployment-owned policy/asset handling; this package
does not inject hashes or relax CSP. Never interpolate untrusted URLs into
script tags or bypass the asset map.

With JavaScript disabled, failed assets, or deferred hydration, the fallback
is already on the page. **Put usable controls and content in it**, not merely a
spinner. The notebook and native-form browser tests submit real native forms
with JS disabled.

## Measured payload

Run `node scripts/build-islands.mjs` after install/build, then
`node scripts/measure-islands.mjs` for loader and dependency-graph reporting.
The loader is **1,998 minified bytes / 941 gzip bytes** (esbuild 0.28.1, ES2022,
Node 22.21.1, Node zlib's
default gzip). This includes scheduling, manifest fetch, dynamic import, errors
and disposal; it excludes components, the separate form helper, Svelte and
props/page HTML. The standalone form directive `enhance.js` (which bundles
`enhanceForm` and needs no loader) is **2,943 minified bytes / 1,332 gzip
bytes**. Gzip here is measured compression, not a server setting.
There is no throughput, startup-time, or productivity claim.

| Package | Direct runtime dependencies | External runtime graph (excluding peers) |
|---|---:|---|
| core | 0 | none |
| web | 0 | none (required core peer) |
| views | 1 | Eta 3.5.0 only (required core/web peers) |
| islands | 0 | none (required web peer) |
| islands-svelte | 0 | none (required islands + Svelte 5 peers) |

With required Brevity peers included, views needs four production package
entries including itself (views, Eta, web, core); native islands needs three
(islands, web, core). Optional application tools/frameworks are not in those
counts. Installing both packages together needs five entries total.

Keep the Svelte adapter out of `@brevity/islands`: an optional peer still
makes npm treat an installed `svelte` as part of the production graph. If your
islands are prebuilt, `@brevity/islands-svelte` and `svelte` can stay in
`devDependencies`.
