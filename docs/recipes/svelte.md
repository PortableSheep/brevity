# A Svelte island, not a second app

Add a Svelte character counter to the notebook's native form. Submission and
validation still work without it. This recipe uses Svelte 5.57.2 and Vite 6.4.4.

## Connect the server

<<< @/samples/island/server.ts

`createIslands` emits safely serialized props in an escaped data attribute,
an external loader, and a no-JS fallback. It reuses web's JSON escaping,
including retained values containing `</script>`. The JSON manifest maps
component names to module URLs. Never put state into executable inline JS.
`staticAssets` serves only explicitly mapped paths; it is not a directory server.

## Mount the component

<<< @/samples/island/client/main.ts

Export a `defineIsland` default mount, validate state, and delegate to the
Svelte 5 adapter from `@portablesheep/brevity-islands-svelte`. The native loader imports it after the form exists.

<<< @/samples/island/client/NoteCounter.svelte

The component has no credentials or application state store. It observes the
native field and removes its listener when unmounted. With JavaScript disabled
or the bundle unavailable, the same form still submits and retains 422 errors.

## Build independently

<<< @/samples/island/vite.config.ts

```sh
npm run docs:check
npm run docs:e2e
```

The first command builds `docs/samples/island/dist/counter.js`; the server maps
that precise asset. `no-cache` is appropriate for this fixed filename; for a
production app, generate hashed assets and an explicit manifest/map before
using immutable cache headers. Vite bundles the Svelte runtime; Brevity does not
compile `.svelte` files.

For a local preview, use the checked example entry point:

<<< @/samples/island/start.ts

It listens on `http://127.0.0.1:3107` with a temporary SQLite file. The
[Playwright recipe](./playwright.md) runs it automatically.

See [native islands](/guide/islands) for deferred hydration, plain TypeScript
components, enhanced forms, and CSP/asset contracts.
