import { fileURLToPath } from "node:url";
import { html, jsonScript, staticAssets } from "@brevity/web";
import { createNotebook } from "../tutorial/app.js";
import type { NoteStore } from "../tutorial/store.js";

export function islandApp(store: NoteStore) {
  const app = createNotebook(store, form => html`
    <div id="note-counter"></div>
    ${jsonScript("note-state", { initialText: form.value("text") })}
    <script type="module" src="/assets/counter.js"></script>`);
  app.use(staticAssets({
    "/assets/counter.js": {
      file: fileURLToPath(new URL("./dist/counter.js", import.meta.url)),
    },
  }));
  return app;
}
