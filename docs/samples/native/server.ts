import { fileURLToPath } from "node:url";
import type { App, Response } from "@brevity/core";
import { createViews } from "@brevity/views";
import { createEnhance, createIslands, islandManifest } from "@brevity/islands";
import { createFormState, html, staticAssets } from "@brevity/web";

const island = createIslands({ manifest: "/native/manifest.json", loader: "/assets/loader.js" });
// #region enhance-setup
const enhanced = createEnhance({ script: "/native/enhance.js" });
// #endregion enhance-setup
const views = createViews({
  root: fileURLToPath(new URL("./views", import.meta.url)),
  helpers: { island },
  layout: "layout",
});

export function nativeRoutes(app: App) {
  app.use((req, res, next) => {
    res.header("content-security-policy", "script-src 'self'; object-src 'none'; base-uri 'none'");
    return next(req, res);
  });
  app.use(
    staticAssets({
      "/native/counter.js": { file: fileURLToPath(new URL("./dist/counter.js", import.meta.url)) },
      "/native/form.js": { file: fileURLToPath(new URL("./dist/form.js", import.meta.url)) },
      "/native/client.js": { file: fileURLToPath(import.meta.resolve("@brevity/islands/client")) },
      "/native/enhance.js": {
        file: fileURLToPath(import.meta.resolve("@brevity/islands/enhance.js")),
      },
    }),
  );
  app.router.get("/native/manifest.json", (_req, res) =>
    res.json(
      islandManifest({
        counter: "/native/counter.js",
        form: "/native/form.js",
        broken: "/native/missing.js",
      }),
    ),
  );
  app.router.get("/native", (_req, res) => views.render(res, "strategies"));
  const renderForm = async (res: Response, value = "", status = 200) => {
    const form = createFormState({
      values: { text: value },
      labels: { text: "Note" },
      errors:
        status === 422
          ? { text: ["Write a note."] }
          : status === 409
            ? { text: ["Conflict: review your note."] }
            : {},
    });
    const fallback = await views.renderToString(
      "form",
      { form, saved: status === 200 && !!value },
      { layout: false },
    );
    await views.render(res, "page", { content: island("form", {}, { fallback }) }, { status });
  };
  app.router.get("/native/form", (_req, res) => renderForm(res));
  app.router.post("/native/form", async (req, res) => {
    const value = req.form?.get("text") ?? "";
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (value === "redirect") {
      res.redirect("/native/form", 303);
      return;
    }
    await renderForm(res, value, !value.trim() ? 422 : value === "conflict" ? 409 : 200);
  });
  // Directive only: no manifest or island module. A nested counter island restarts after replacement.
  // #region enhance-route
  const renderEnhanced = async (res: Response, value = "", status = 200) => {
    const form = createFormState({
      values: { text: value },
      labels: { text: "Note" },
      errors: status === 422 ? { text: ["Write a note."] } : {},
    });
    const content = await views.renderToString(
      "enhanced",
      { form, saved: status === 200 && !!value },
      { layout: false },
    );
    await views.render(res, "page", { content: enhanced("enhanced-note", content) }, { status });
  };
  app.router.get("/native/enhanced", (_req, res) => renderEnhanced(res));
  app.router.post("/native/enhanced", async (req, res) => {
    const value = req.form?.get("text") ?? "";
    await renderEnhanced(res, value, value.trim() ? 200 : 422);
  });
  // #endregion enhance-route
  app.router.get("/native/hostile", (_req, res) =>
    views.render(res, "page", {
      content: island(
        "counter",
        { text: '</script><img src=x onerror="window.pwned=true">' },
        {
          fallback: html`<p>Safe fallback</p>`,
        },
      ),
    }),
  );
}
