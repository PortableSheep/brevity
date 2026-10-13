import { createApp } from "@brevity/core";
import {
  createFormState,
  html,
  renderPage,
  staticAssets,
  type FormState,
  type HtmlFragment,
} from "@brevity/web";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const layout = (body: HtmlFragment) =>
  html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Brevity web example</title>
        <link rel="stylesheet" href="/assets/web.css" />
      </head>
      <body>
        <main>${body}</main>
      </body>
    </html>`;

const nameField = (form: FormState) => {
  const field = form.field("name", { describedBy: "name-hint" });
  return html`<label for="${field.id}">Name</label>
    <p id="name-hint">Enter the name you would like displayed.</p>
    <input
      id="${field.id}"
      name="${field.name}"
      value="${field.value}"
      aria-invalid="${String(field.invalid)}"
      aria-describedby="${field.describedBy}"
      autocomplete="name"
    />
    ${form.fieldErrors("name")}`;
};

const contactPage = (form: FormState) =>
  html`<h1>Say hello</h1>
    ${form.errorSummary()}
    <form method="post" action="/contact">
      ${nameField(form)}<button type="submit">Submit</button>
    </form>`;

export function createWebExampleApp() {
  const app = createApp();
  app.use(
    staticAssets({
      "/assets/web.css": {
        file: resolve("examples/assets/web.css"),
        cacheControl: "public, max-age=60",
      },
    }),
  );
  app.router.get("/contact", (_req, res) => {
    renderPage(res, contactPage, createFormState({ labels: { name: "Name" } }), { layout });
  });
  app.router.post("/contact", (req, res) => {
    const input = req.get("name");
    const name = typeof input === "string" ? input : "";
    const errors: Record<string, string[]> = name.trim() ? {} : { name: ["Enter your name."] };
    if (!name.trim()) {
      renderPage(
        res,
        contactPage,
        createFormState({ values: { name }, errors, labels: { name: "Name" } }),
        {
          layout,
          status: 422,
        },
      );
      return;
    }
    // A real application verifies CSRF and persists domain data before redirecting.
    res.redirect("/thanks", 303);
  });
  app.router.get("/thanks", (_req, res) => {
    renderPage(
      res,
      () =>
        html`<h1>Thank you</h1>
          <p>Your form was accepted.</p>`,
      undefined,
      { layout },
    );
  });
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  createWebExampleApp().listen(3000);
  console.log("Web example: http://127.0.0.1:3000/contact");
}
