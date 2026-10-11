# @brevity/web

Optional server-rendered HTML, accessible form state, and explicit static assets for
`@brevity/core`. No runtime dependencies, template parser, frontend runtime, or compiler.
Importing core does not load this package. Requires Node 20+.

```sh
npm install @brevity/core @brevity/web
```

## Pages and partials

Prefer `@brevity/views` for complete HTML files with layouts/partials; inline
`html` remains available for small pages and fragments. `@brevity/islands`
optionally provides deferred native mounts and progressive-form transport.

```ts
import { createApp } from "@brevity/core";
import { html, renderPage, type HtmlFragment } from "@brevity/web";

const app = createApp();
const greeting = (name: string) => html`<p>Hello ${name}</p>`;
const page = (data: { name: string }) => html`<h1>Welcome</h1>${greeting(data.name)}`;
const layout = (body: HtmlFragment, data: { name: string }) => html`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${data.name}</title></head>
<body><main>${body}</main></body></html>`;

app.router.get("/", (req, res) => {
  renderPage(res, page, { name: req.query.name ?? "friend" }, { layout });
});
```

`html` escapes `& < > " '` in every ordinary interpolation. Strings, numbers,
bigints, and booleans render as escaped text; null/undefined render nothing.
Arrays (including nested arrays) compose text and fragments without separators.
Objects are rejected. Only fragments produced by `html`, `trustedHtml`, or the
package helpers render as markup. Callbacks and layouts must return `HtmlFragment`,
not strings. Layout receives `(body, data)`; partials are ordinary functions.
`renderPage(res, template, data, { layout?, status? })` sends UTF-8 HTML with
`X-Content-Type-Options: nosniff` and status 200 by default.

**Context matters:** use interpolations only for HTML text or **quoted attribute
values**. Escaping is not URL validation, CSS/JavaScript serialization, or HTML
sanitization. Do not interpolate tag/attribute names, unquoted attributes, executable
script bodies, style bodies, event handlers, or unvalidated URL attributes.
Keep destinations application-owned or validate their schemes. Literal template
markup is application-owned and trusted.

`trustedHtml(markup)` is an explicit escape hatch for application-owned or
independently sanitized HTML. Never call it on request input, error messages,
database text, or arbitrary template-engine output. An application may use its
own template engine, but must own its escaping policy before marking output trusted.
`escapeHtml(text): string` is available for integrations that need escaped text.
The existing `HtmlFragment` class is exported at runtime for integrations'
`instanceof` checks. Constructing it directly trusts markup just like
`trustedHtml`; do not construct it from untrusted text.

## Forms: explicit errors and retained values

`createFormState({ values?, errors?, labels?, idPrefix? })` takes only application
supplied strings and field-error arrays. It does not parse requests, validate
domain rules, authorize users, or persist data.

```ts
import { createFormState, html, renderPage, type FormState } from "@brevity/web";

const formPage = (form: FormState) => {
  const name = form.field("name", { describedBy: "name-help" });
  return html`<h1>Contact</h1>${form.errorSummary()}
<form method="post" action="/contact">
  <label for="${name.id}">Name</label>
  <p id="name-help">Your display name.</p>
  <input id="${name.id}" name="${name.name}" value="${name.value}"
    aria-invalid="${name.invalid}" aria-describedby="${name.describedBy}" autocomplete="name">
  ${form.fieldErrors("name")}
  <button type="submit">Submit</button>
</form>`;
};

app.router.get("/contact", (_req, res) => {
  renderPage(res, formPage, createFormState({ labels: { name: "Name" } }));
});
app.router.post("/contact", (req, res) => {
  const input = req.get("name");
  const name = typeof input === "string" ? input : "";
  if (!name.trim()) {
    renderPage(res, formPage, createFormState({
      values: { name }, errors: { name: ["Enter your name."] }, labels: { name: "Name" },
    }), { status: 422 });
    return;
  }
  // Verify CSRF/authorization and save domain data here in a real application.
  res.redirect("/thanks", 303);
});
app.router.get("/thanks", (_req, res) => {
  renderPage(res, () => html`<h1>Thank you</h1>`, undefined);
});
```

`value(name)` retains a string (missing values become `""`). `field(name)` returns
`{ id, name, value, invalid, describedBy }`; its deterministic ID is shared by labels,
error-summary links, and inline-error IDs. `fieldErrors(name)` returns an escaped
error list or an empty fragment. `errorSummary()` returns an escaped alert with
links to affected inputs, or an empty fragment. Set a unique `idPrefix` for each
form on the same page (letters/numbers/underscore/hyphen, starting with a letter).
`describedBy` combines supplied hint IDs with the generated error ID. For checkboxes,
selects, and repeated fields, derive selected/checked state explicitly in your own
partials; the helper does not invent a schema or silently normalize request data.
Only retain explicitly allowed fields; never echo passwords or sensitive fields.

## Static assets

```ts
import { resolve } from "node:path";
import { staticAssets } from "@brevity/web";

app.use(staticAssets({
  "/assets/app.css": { file: resolve("public/app.css"), cacheControl: "public, max-age=60" },
  "/assets/app.js": { file: resolve("public/app.js"), cacheControl: "public, max-age=60" },
}));
```

The keys are an exact URL allowlist, not a directory mount. URL keys must be
canonical unencoded ASCII absolute paths without query strings/fragments. Query strings
on incoming requests are allowed; encoded or dot-segment aliases are not. No
request input is joined to a filesystem path. Only mapped URLs are reserved;
unmapped requests call the next middleware, including API 404s.
GET and HEAD serve mapped files; other methods return 405 with `Allow: GET, HEAD`.
HEAD has the same MIME/length/cache headers as GET and no body. Binary bytes are
not converted to text. MIME is inferred for CSS, JS/MJS, JSON, text, common images,
fonts, and WASM; unknown extensions require explicit `contentType`.
`X-Content-Type-Options: nosniff` is sent. Cache defaults to `no-cache` (no ETag or
conditional-request implementation); use immutable caching only for versioned URLs.
Missing/unreadable/non-file mapped assets raise errors to core's error boundary,
not a fallback page. Invalid URLs, unknown MIME types and header injection fail
at middleware setup. File paths are trusted application configuration, resolved
relative to cwd unless absolute; explicitly mapped symlinks are permitted. Never
map secrets or user-uploaded executable content.

## Optional interactive islands

`jsonScript(id, data)` returns a fragment containing a non-executable
`<script type="application/json" id="...">` data block. `serializeJson(data): string`
escapes `< > & U+2028 U+2029` as JSON Unicode escapes, preventing `</script>` breakout
while preserving a `JSON.parse` round trip. Nonserializable input (cycles, bigint,
undefined at the top level) throws; usual `JSON.stringify` property semantics apply.

```ts
import { html, jsonScript } from "@brevity/web";

const island = (initial: unknown) => html`<div id="questions"></div>
${jsonScript("questions-state", initial)}
<script type="module" src="/assets/questions.js"></script>`;
```

Compile and mount React/Svelte/etc. in the application, serve its emitted assets
through the allowlist, and read the block's `textContent` with `JSON.parse`.
No frontend compiler/runtime is brought into Brevity core or this package.
Do not serialize secrets. `serializeJson` is for JSON data-block text, not HTML
attributes or executable scripts; `jsonScript` handles the trusted-fragment boundary.

## Complete example

From the repository root:

```sh
npm run build
node --import tsx examples/web-app.ts
# GET /contact, POST /contact, GET /thanks, GET/HEAD /assets/web.css
```

See `examples/web-app.ts` for layout + partial composition, retained validation
errors, and post/redirect/get. Validation, CSRF, authentication, persistence,
domain-specific conditional questions, and frontend builds remain application logic.
