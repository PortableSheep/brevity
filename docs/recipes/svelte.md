# A Svelte island, not a second app

**Tested:** Svelte 5.57.2, Vite 6.4.4, @sveltejs/vite-plugin-svelte 5.1.1,
Node.js 22. The browser compiler remains application tooling.

Start with the tutorial's native HTML form. Add a character counter that observes
its textarea; it does not replace submission, validation, or error rendering.

## Server: safe state and an exact asset map

<<< @/samples/island/server.ts

`jsonScript` creates an inert `application/json` element. It serializes `<`,
`>`, `&`, and line separators safely, including a retained value containing
`</script>`. Never put state into executable inline JS or use raw JSON as HTML.
`staticAssets` serves only explicitly mapped paths; it is not a directory server.

## Browser: mount one component

<<< @/samples/island/client/main.ts

Validate parsed state before passing it to the component. Mount after the form
exists, using a module script.

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
