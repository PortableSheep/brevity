# File views

`@brevity/views` is optional. Keep page markup in `views/**/*.html`, not in
route strings. Core has no template hooks or runtime changes.

Install `@brevity/core`, `@brevity/web`, and `@brevity/views`. The default engine
is **Eta 3.5.0**, pinned exactly: one direct runtime dependency, with no runtime
dependencies of its own. Required Brevity peers are core/web. Eta is a trusted
JavaScript template engine, not a Brevity language or an application compiler.

## Configure once; render explicitly

<<< @/samples/tutorial/page.ts

`createViews({ root, extension: ".html", layout, cache, engine, helpers })`
returns `render(res, name, data, { status, layout })`, `renderToString(...)`
(an `HtmlFragment`), and `clearCache()`. Await rendering; failures propagate to
core's normal error handler. No response augmentation or implicit route return.

<<< @/samples/tutorial/app.ts

The root is application-owned. Names are relative to it, with an optional
extension: `notes`, `notes.html`, `shared/field`. Absolute paths, dot segments,
backslashes, encoded aliases, and symlinks escaping the root are rejected.
Never accept an arbitrary request value as a template name; use a fixed
application allowlist. Templates can execute JavaScript and must not be uploaded
or written by untrusted users.

## Layouts and partials

<<< @/samples/tutorial/views/layout.html

<<< @/samples/tutorial/views/notes.html

`it.partial(name, locals?)` is async, inherits current data, and uses the same
safe resolver/cache as pages. Await it; do not use Eta's filesystem `include`
API. Cyclic/overly deep partials fail explicitly. A layout receives `it.body`;
per-render `layout: false` disables the configured layout.

## Escaping and helpers

<<< @/samples/tutorial/views/form.html

Eta's `<%= expression %>` escapes ordinary values, including quotes in
attributes. Brevity `HtmlFragment`s (partials, layout body, form feedback,
islands) retain markup. `<% ... %>` runs trusted template JavaScript.
Eta's `<%~ ... %>` deliberately emits raw markup: never use it on user data.
Escaping does not validate URLs, authorize users, or prevent CSRF.

`it.createFormState` is built in. Pass form state from a controller, as above,
or create it in a template. Add `helpers: { island }` using a configured
`createIslands` function to expose `it.island` without coupling views to a
browser package:

<<< @/samples/native/server.ts

<<< @/samples/native/views/strategies.html

Helpers and render data are explicit records; data can override helper names.
Eta expressions are JavaScript, not typechecked TypeScript. Strictly typed
controllers and runtime HTTP/browser tests cover the checked templates.

## Cache and engine contract

`cache` defaults to `NODE_ENV === "production"`. Production reads/compiles each
requested file once, shares concurrent compilation, and keeps the compiled
function (not rendered user data). Restart or clear the cache on deploy.
Failed reads/compiles are not cached. In development each render reloads and
recompiles, including partials and layouts. This is a reload policy, not a
development watcher. Deploy templates alongside your compiled application;
TypeScript does not copy `.html` files.

For another engine, implement `ViewEngine.compile(source, filename)`, returning
a function `(data: ViewData) => string | Promise<string>`. The package still
owns file resolution/cache/layout composition; the engine owns its syntax and
escaping contract. A custom engine must preserve escaping and handle trusted
fragments deliberately. Eta is the only first-party engine.

Use inline `html` for small fragments and small cases; the
[notebook tutorial](./tutorial.md) makes files the default for complete pages.
