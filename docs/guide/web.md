# Optional web layer

`@brevity/web` adds server-rendered pages without changing core or the legacy viewer.
It has no runtime dependencies or frontend compiler and uses core Request/Response
and middleware contracts.

```sh
npm install @brevity/core @brevity/web
```

Use [file views](./views.md) as the primary full-page format. Inline `html`
callback templates remain useful for small cases and escaped fragment
composition, `createFormState` for explicit retained values and accessible errors,
`staticAssets` for exact URL-to-file mappings, and `jsonScript` for optional
application-compiled island data. Validation rules, CSRF, authorization, persistence,
and frontend compilation remain application-owned.

The optional [native islands package](./islands.md) adds deferred browser mounts
and enhanced-form transport without a client framework or any core change.

The package's `README.md` contains API signatures, safety boundaries, and island
data examples. The runnable repository example is `examples/web-app.ts`:

```sh
npm run build
node --import tsx examples/web-app.ts
```

Visit `/contact`, submit an empty name for a retained-value 422 page, or a valid name
for a 303 redirect to `/thanks`. `/assets/web.css` serves only its explicitly mapped
file; unknown API requests still get core's JSON 404.

## Page and form flow

```ts
import { createApp } from "@brevity/core";
import { html, renderPage, createFormState, type FormState, type HtmlFragment } from "@brevity/web";

const app = createApp();
const layout = (body: HtmlFragment) =>
  html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Contact</title>
      </head>
      <body>
        <main>${body}</main>
      </body>
    </html>`;
const page = (form: FormState) => {
  const name = form.field("name");
  return html`<h1>Contact</h1>
    ${form.errorSummary()}
    <form method="post" action="/contact">
      <label for="${name.id}">Name</label>
      <input
        id="${name.id}"
        name="${name.name}"
        value="${name.value}"
        aria-invalid="${name.invalid}"
        aria-describedby="${name.describedBy}"
      />
      ${form.fieldErrors("name")}<button type="submit">Submit</button>
    </form>`;
};
app.router.get("/contact", (_req, res) => {
  renderPage(res, page, createFormState(), { layout });
});
app.router.post("/contact", (req, res) => {
  const input = req.get("name");
  const name = typeof input === "string" ? input : "";
  if (!name.trim()) {
    renderPage(
      res,
      page,
      createFormState({
        values: { name },
        errors: { name: ["Enter your name."] },
      }),
      { layout, status: 422 },
    );
    return;
  }
  // A real app verifies CSRF/authorization and saves data before redirecting.
  res.redirect("/thanks", 303);
});
app.router.get("/thanks", (_req, res) => {
  renderPage(res, () => html`<h1>Thank you</h1>`, undefined, { layout });
});
```

Partials are ordinary callbacks returning `HtmlFragment`, composed through `html`.
Only application-owned literal markup and explicit fragments render as markup.
Plain interpolations are escaped, arrays compose fragments, and null/undefined
render nothing. Use interpolations only in HTML text or quoted attribute values:
escaping does **not** validate URL schemes or make JavaScript/CSS safe.
`trustedHtml` is only for app-owned or independently sanitized output.
Give each form on a page a unique `idPrefix`; explicitly retain only permitted
fields, never passwords.

## Assets and island data

```ts
import { resolve } from "node:path";
import { staticAssets, jsonScript } from "@brevity/web";

app.use(
  staticAssets({
    "/assets/questions.js": {
      file: resolve("public/questions.js"),
      cacheControl: "public, max-age=60",
    },
  }),
);
const island = (data: unknown) =>
  html`<div id="questions"></div>
    ${jsonScript("questions-state", data)}
    <script type="module" src="/assets/questions.js"></script>`;
```

`staticAssets` uses an exact canonical ASCII URL allowlist, never a request-derived
filesystem path. GET/HEAD provide MIME, length, cache, and nosniff headers; mapped
URLs reject other methods with 405. Unknown paths pass through. Unknown file
extensions need `contentType`; cache defaults to `no-cache` without conditional
requests. Missing/unreadable files raise errors through core. Files and symlinks
are trusted configuration; do not expose secrets or user-uploaded executable files.

`jsonScript` safely serializes non-executable JSON data and escapes script-closing
characters. Read its `textContent` with `JSON.parse` from the external island bundle.
`serializeJson` exposes the same JSON escaping for app integrations. Neither helper
allows secrets in browser state or makes data safe for executable scripts.
The application owns the frontend compiler, runtime, and mount code.
