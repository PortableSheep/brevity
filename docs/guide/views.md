# HTML views

Keep page markup in HTML files with `@portablesheep/brevity-views`. It uses
[Eta](https://eta.js.org/) for templates, layouts, and partials.

## Set up the renderer

Install `@portablesheep/brevity`, `@portablesheep/brevity-web`, and `@portablesheep/brevity-views` using
[local packages while npm publication is pending](https://github.com/PortableSheep/brevity/blob/main/QUICK_START.md).
Configure the template directory once:

<<< @/samples/tutorial/page.ts

Then call `await views.render(res, name, data)` from a route:

<<< @/samples/tutorial/app.ts

Use `renderToString()` when you need a fragment instead of a response.

## Layouts and partials

A layout wraps the page using `it.body`:

<<< @/samples/tutorial/views/layout.html

Include a partial with `await it.partial(name, locals?)`. It inherits the page's
data and can receive its own values:

<<< @/samples/tutorial/views/notes.html

Pass `{ layout: false }` to a render call to skip the layout. Use `it.partial`
rather than Eta's filesystem `include` so all templates use the same path checks.

## Values and helpers

`<%= expression %>` escapes text. `<% ... %>` runs template JavaScript.
Brevity fragments, such as partials and form errors, retain their markup:

<<< @/samples/tutorial/views/form.html

::: warning Raw markup
Eta's `<%~ ... %>` outputs raw HTML. Don't use it for user input. Templates can
execute JavaScript, so only trusted application code should create or edit them.
:::

`createFormState` is available as `it.createFormState`. Add your own helpers
through `createViews({ helpers })`; they're available on `it` too. Page data can
override a helper with the same name.

## Files and caching

Template names are relative to `root`: `notes`, `notes.html`, or `shared/field`.
Don't take a template name straight from a request. Absolute paths, dot segments,
and symlinks outside the root are rejected.

Production caches compiled templates; development reloads them on each render.
Deploy `views/` beside your server output: TypeScript doesn't copy HTML files.
Restart or call `clearCache()` after changing cached templates.

::: details Options and custom engines
`createViews({ root, extension: ".html", layout, cache, engine, helpers })` returns
`render`, `renderToString`, and `clearCache`. Render options accept `status` and
`layout`. Cache defaults to `NODE_ENV === "production"`; failed compilations
aren't cached. Cyclic or overly deep partials fail explicitly.

For another engine, implement `ViewEngine.compile(source, filename)`, returning
`(data: ViewData) => string | Promise<string>`. Keep escaping and trusted fragments
safe in that implementation. Eta 3.5.0 is the only built-in engine and the
package's one external runtime dependency.
:::
