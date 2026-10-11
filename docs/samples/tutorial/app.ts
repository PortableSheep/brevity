import { createApp, HttpError } from "@brevity/core";
import { createFormState, type FormState, type HtmlFragment } from "@brevity/web";
import { views, emptyForm } from "./page.js";
import type { NoteStore } from "./store.js";

export function createNotebook(store: NoteStore, enhance?: (form: FormState) => HtmlFragment) {
  const app = createApp({ maxBodyBytes: 4096 });
  app.use(async (req, res, next) => {
    res.header("referrer-policy", "same-origin");
    // Native same-origin forms send Origin. Reject cross-site writes before mutation.
    if (req.method === "POST" && req.headers.origin !== `http://${req.headers.host}`) {
      throw new HttpError(403, "Submit the form from this site");
    }
    return next(req, res);
  });
  app.router.get("/", async (_req, res) => {
    const form = emptyForm();
    await views.render(res, "notes", { notes: await store.list(), form, enhancement: enhance?.(form) });
  });
  app.router.head("/", (_req, res) => res.send(""));
  app.router.post("/notes", async (req, res) => {
    if (!req.form || req.form.getAll("text").length !== 1) {
      throw new HttpError(400, "Send exactly one note using the HTML form");
    }
    const text = req.form.get("text") ?? "";
    if (!text.trim() || text.length > 200) {
      const form = createFormState({
        values: { text }, labels: { text: "Note" },
        errors: { text: ["Write between 1 and 200 characters."] },
      });
      await views.render(res, "notes", {
        notes: await store.list(), form, enhancement: enhance?.(form),
      }, { status: 422 });
      return;
    }
    await store.add(text.trim());
    res.redirect("/", 303);
  });
  return app;
}
