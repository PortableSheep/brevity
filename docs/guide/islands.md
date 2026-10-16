# Browser islands

An island adds interaction to part of an HTML page: a counter, an editor, or an
enhanced form. The rest of the page stays ordinary HTML. No client router needed.

Use `@brevity/islands` for plain TypeScript components. Add
`@brevity/islands-svelte` only if you want Svelte.

## Write a component

An island module exports a mount function. It receives an element, props, and
an abort signal; it can return cleanup:

<<< @/samples/native/counter.ts

Keep a usable fallback on the page until the component is ready. If JavaScript
fails or is disabled, that content is what the reader gets.

## Render it on the server

Configure `createIslands({ manifest, loader })`, then call
`island(name, props, { hydrate, fallback })` from a template. Props are safely
serialized into an attribute, not executable inline JavaScript.

<<< @/samples/native/views/strategies.html

Choose when the component mounts:

| Strategy      | When it starts                             |
| ------------- | ------------------------------------------ |
| `load`        | As soon as the loader runs; the default    |
| `visible`     | When it scrolls into view                  |
| `idle`        | When the browser is idle                   |
| `interaction` | On pointer, focus, or keyboard interaction |

If visibility observation is unavailable, `visible` mounts immediately; `idle`
falls back to a 200 ms timer. The first interaction isn't cancelled or replayed. A native link or form can
still work before mounting finishes. Use `load` if the first click needs the
component already running.

::: details Server setup and asset map
<<< @/samples/native/server.ts

The server maps component names to module URLs with `islandManifest` and serves
explicit assets with `staticAssets`. Include every module/chunk in that map;
Brevity doesn't scan a directory or compile browser code.
:::

## Enhance a form without a component

For a form-only enhancement, `createEnhance` needs no island module or manifest:

<<< @/samples/native/server.ts#enhance-setup

<<< @/samples/native/views/enhanced.html

Render with the same target ID for GET and validation-error responses:

::: details Route example
<<< @/samples/native/server.ts#enhance-route
:::

Serve `@brevity/islands/enhance.js` at the configured script URL. The form still
submits normally without JavaScript. With JavaScript, it updates the target with
server-rendered HTML and keeps validation feedback on the page.

## Control form enhancement yourself

Use `enhanceForm` inside a component when you need custom behavior:

<<< @/samples/native/form.ts

The target must contain the form and have a stable ID in the response HTML.
Same-origin POSTs are enhanced; unsupported forms fall back to native submission.
Validation responses (422/409) replace the target and focus the error. A redirect
navigates to its same-origin destination. Server validation, CSRF checks, and
access control still belong in the app.

::: details Events, errors, and cleanup
Pending submission disables submit buttons and sets `aria-busy`; failures restore
them and retain input. Network/protocol failures log and emit `brevity:form-error`;
show a visible message for that event. Successful replacement emits
`brevity:form-response` with `{ status }`. `onResponse` receives a cloned response.

The helper emits `brevity:before-replace` and `brevity:replaced`. An initial-page
islands loader uses them to dispose and restart nested islands. Scripts in
replacement HTML don't execute, so keep enhancement code outside the target.

Submitter method/action/encoding overrides, cross-origin actions, unsupported
file encoding, and unsupported methods/targets use native submission. Controls
named `action`, `method`, `target`, or `enctype` don't break attribute handling.
Disposing aborts in-flight work.

A mount may be async and return cleanup when ready. Use `ctx.signal` for abortable
listeners, validate untrusted props, and avoid changing the fallback before a
mount can succeed. Islands mount components; they don't provide server rendering.

`startIslands(root?)` scans once and returns a disposer. For custom navigation,
dispose before removing old content and start on the new page. There's no global
mutation observer or automatic client routing. Mount errors log and emit a
bubbling `brevity:island-error` without stopping other islands.
:::

## Build and serve assets

Compile TypeScript and resolve browser imports with your build tool. This example
uses esbuild; plain JavaScript modules don't need a bundler:

::: details Native build script
<<< @/samples/native/build.mjs
:::

Manifest URLs are canonical same-origin paths. Imports resolve relative to the
manifest URL. Use `no-cache` for fixed filenames and immutable caching only for
content-hashed assets.

For Svelte, follow the [Svelte recipe](/recipes/svelte). With multiple Vite app
entries, set `build.rollupOptions.preserveEntrySignatures: "strict"` so Rollup
keeps each island's default export. Convert Vite's manifest into your island URL
map and serve its chunks/CSS too.

## Content security policy

The example uses external scripts with `script-src 'self'; object-src 'none';
base-uri 'none'`. Allow manifest fetches in `connect-src`. For nonce-based CSP,
pass the same nonce to `createIslands` and your policy; permit dynamic imports as
needed. Hashes/SRI are deployment-owned. Don't put secrets in props.

## Measured payload

The native loader is **1,998 minified bytes / 941 gzip bytes**. The standalone
form enhancement script is **2,943 minified bytes / 1,332 gzip bytes**. Those
numbers exclude components, props, and Svelte.

Measured with esbuild 0.28.1, target ES2022, Node 22.21.1, and Node's default gzip.
Run `node scripts/build-islands.mjs` and `node scripts/measure-islands.mjs` to
repeat. Core, web, and native islands have no external runtime dependencies;
views adds Eta. See [size and performance](./evaluating) for comparisons.
