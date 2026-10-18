# HTML helpers

`@portablesheep/brevity-web` provides escaped HTML fragments, form feedback, and static assets.
Use [file views](./views) for full pages; use these helpers for smaller pieces.
The package has no external runtime dependencies.

## Compose HTML safely

```ts
import { html } from "@portablesheep/brevity-web";

const greeting = (name: string) => html`<p>Hello, ${name}!</p>`;
const page = html`<main>${greeting("<reader>")}</main>`;
```

Text values are escaped. Nested fragments and arrays keep their markup;
`null` and `undefined` render nothing. Use quoted attributes and validate URLs
separately. Don't interpolate untrusted values into script or style code, or
pass them to `trustedHtml`.

## Show form errors

`createFormState` keeps submitted values and connects labels, hints, and errors
to fields. It doesn't validate input or create controls for you.

On invalid input, render the form with status **422** and retained values.
After a successful save, redirect with **303**. Keep passwords out of retained
values, and use a distinct `idPrefix` for each form on a page.

::: details Complete contact form example

```ts
import { createApp } from "@portablesheep/brevity";
import {
  html,
  renderPage,
  createFormState,
  type FormState,
  type HtmlFragment,
} from "@portablesheep/brevity-web";

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

:::

Run the repository example:

```sh
npm run build
node --import tsx examples/web-app.ts
```

Visit **http://127.0.0.1:3000/contact** and try both an empty and a valid name.
For a form that saves to a database, follow the [notebook tutorial](./tutorial).

## Serve static assets

Map public URLs to files explicitly:

```ts
import { resolve } from "node:path";
import { staticAssets } from "@portablesheep/brevity-web";

app.use(
  staticAssets({
    "/assets/style.css": { file: resolve("public/style.css") },
  }),
);
```

Only mapped paths are served. GET and HEAD work; other methods on an asset
return 405. Cache defaults to `no-cache`. Set immutable caching only for
content-hashed filenames. Don't map secrets or untrusted executable uploads.

## Pass data to the browser

`jsonScript(id, data)` emits an inert JSON script block with safe escaping.
Parse its `textContent` in an external script. `serializeJson` provides the same
escaping for integrations. Neither is for executable code or secret data.

For mounted browser components, see [islands](./islands). For signatures and
edge cases, see the [web reference](/api/web).
