# Web API

Import from `@brevity/web` for HTML fragments, form feedback, and static assets.
For examples, see [HTML helpers](/guide/web).

## Escaped fragments

| Function                                    | Contract                                                      |
| ------------------------------------------- | ------------------------------------------------------------- |
| `html` tagged template                      | Escape interpolated text; compose nested fragments and arrays |
| `escapeHtml(value: string): string`         | Escape `&`, `<`, `>`, `"`, and `'`                            |
| `trustedHtml(markup: string): HtmlFragment` | Mark already-trusted markup for unescaped composition         |

`HtmlValue` permits strings, numbers, bigint, booleans, null/undefined, fragments,
and readonly nested arrays. Nullish values render empty text; unsupported objects
throw `TypeError`. Fragment `.toString()` returns the markup.

Use quoted attributes, application-owned element/attribute names, and separate
URL validation. HTML escaping is not sanitization of arbitrary trusted markup,
CSRF protection, or authorization. Never trust request input as a fragment.
Do not use ordinary interpolation in executable script/style contexts.

## `renderPage(res, template, data, options = {})`

`Template<Data>` is `(data) => HtmlFragment`.
`Layout<Data>` is `(body, data) => HtmlFragment`.
`PageOptions<Data>` accepts `layout` and `status` (default 200).
Templates/layouts must be synchronous fragment-returning callbacks; await data
before rendering. Returning a string or another value throws `TypeError`.

Sets HTML UTF-8 Content-Type and `X-Content-Type-Options: nosniff`, then sends.
Layouts receive the original data. It does not add a doctype, CSP, cookies,
CSRF, or global app layout automatically.

## Form feedback

`createFormState(options?: FormOptions): FormState` snapshots:

| Option     | Default/meaning                                               |
| ---------- | ------------------------------------------------------------- |
| `values`   | String/undefined values by field name                         |
| `errors`   | Readonly message arrays by field name                         |
| `labels`   | Summary display labels by field name                          |
| `idPrefix` | `"form"`; letter followed by letters/digits/underscore/hyphen |

An invalid prefix throws `TypeError`. IDs combine the prefix with a deterministic
UTF-16LE hex encoding of the field name; do not infer IDs yourself.
Use distinct prefixes if more than one form shares a page.

| Method                               | Result                                                               |
| ------------------------------------ | -------------------------------------------------------------------- |
| `value(name)`                        | Retained string, default `""`                                        |
| `field(name, { describedBy? } = {})` | `FormField` with id, name, value, invalid, describedBy               |
| `fieldErrors(name)`                  | Escaped list with its ID, or empty fragment                          |
| `errorSummary()`                     | Linked messages, alert role, heading and tabindex, or empty fragment |

`field().describedBy` combines your hint ID with the error list ID only when
invalid. Apply it, the label association, and aria-invalid to your own control.
No input controls, validation rules, DOM focusing, transport, or error class
conventions are automatically supplied.

<<< @/samples/tutorial/views/form.html

## JSON state

`serializeJson(data: unknown): string` uses JSON.stringify and escapes `<`, `>`,
`&`, U+2028 and U+2029. Undefined top-level values throw `TypeError`;
other normal JSON limitations (cycles, bigint) remain.

`jsonScript(id, data): HtmlFragment` returns an inert application/json script
with escaped ID and safely serialized data. Parse its textContent in the
browser; validate the resulting unknown data. It is not executable code.

<<< @/samples/island/server.ts

## Static assets

`staticAssets(assets: Readonly<Record<string, StaticAsset>>)` returns core-compatible
middleware. A `StaticAsset` has `file`, optional `contentType`, and optional
`cacheControl` (default `"no-cache"`).

Each key must be a canonical, unencoded absolute URL path. Invalid paths/header
values and unknown file extensions without an explicit content type throw during
setup. Common web extensions have built-in MIME types.

Only exact raw path matches are served (query strings allowed); encoded or
normalized aliases do not expand the allowlist. GET reads the file, HEAD sends
its size without a body, and other methods on a mapped path receive 405 with
Allow. Unmapped paths continue middleware.

The helper reads regular files on demand and sets Content-Type, nosniff,
Cache-Control, and Content-Length. Missing/unreadable/non-regular files fail
through core's error handling, not a fabricated successful response.
It is not a directory traversal mapper, range/ETag server, or frontend compiler.
Build browser assets separately and supply an explicit manifest for production.

::: details Exports and types
Runtime exports: `HtmlFragment`, `html`, `escapeHtml`, `trustedHtml`, `serializeJson`, `jsonScript`,
`renderPage`, `createFormState`, and `staticAssets`.
Type exports: `HtmlFragment`, `HtmlValue`, `Template`, `Layout`, `PageOptions`,
`FormOptions`, `FormField`, `FormState`, and `StaticAsset`.
`HtmlFragment` is also a runtime class export so optional template integrations
can recognize trusted fragments with `instanceof`. Its constructor, like
`trustedHtml`, accepts already-trusted markup; prefer `html` for escaped content.

:::
