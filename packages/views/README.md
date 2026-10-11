# @brevity/views

Optional file views for Brevity. Eta **3.5.0** is pinned exactly (one runtime
dependency; Eta has zero runtime dependencies). Requires core/web peers.

```ts
import { createViews } from "@brevity/views";
const views = createViews({ root: "/app/views", layout: "layout" });
app.router.get("/", (_req, res) => views.render(res, "home", { title: "Hello" }));
```

`views/home.html`: `<h1><%= it.title %></h1>`

`views/layout.html`: `<!doctype html><main><%= it.body %></main>`

`<%= await it.partial("shared/field", { value: it.value }) %>` uses the same
resolver. Await all renders/partials. `renderToString` returns an HtmlFragment;
`{ status: 422, layout: false }` overrides response/layout options.
`createFormState` is a built-in template helper; inject configured islands with
`helpers: { island }`. Ordinary values escape; Brevity fragments preserve markup.
Raw Eta interpolation (`<%~ ... %>`) is trusted-only.

Production caches compiled templates; dev rereads each render. Override `cache`
or use `clearCache()`. Copy views into deployments; tsc does not copy HTML.
Traversal, absolute paths, encoded aliases, and escaping symlinks are rejected.
Templates execute JavaScript: never accept user-authored templates.
Use `it.partial`, not Eta's native filesystem include.

`ViewEngine.compile(source, filename)` returns a sync/async renderer over
`ViewData`; custom engines own escaping. Core is unchanged.
See the repository's `docs/guide/views.md` for checked examples.
