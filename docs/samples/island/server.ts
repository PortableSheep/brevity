import { fileURLToPath } from "node:url";
import { html, staticAssets } from "@portablesheep/brevity-web";
import { createIslands, islandManifest } from "@portablesheep/brevity-islands";
import { createNotebook } from "../tutorial/app.js";
import type { NoteStore } from "../tutorial/store.js";
import { nativeRoutes } from "../native/server.js";

export function islandApp(store: NoteStore) {
  const island = createIslands({ manifest: "/assets/islands.json", loader: "/assets/loader.js" });
  const app = createNotebook(store, (form) =>
    island(
      "counter",
      { initialText: form.value("text") },
      {
        fallback: html`<div id="note-counter">Character counter available with JavaScript.</div>`,
      },
    ),
  );
  app.router.get("/assets/islands.json", (_req, res) =>
    res.json(islandManifest({ counter: "/assets/counter.js" })),
  );
  app.use(
    staticAssets({
      "/assets/counter.js": {
        file: fileURLToPath(new URL("./dist/counter.js", import.meta.url)),
      },
      "/assets/loader.js": {
        file: fileURLToPath(import.meta.resolve("@portablesheep/brevity-islands/loader.js")),
      },
    }),
  );
  nativeRoutes(app);
  return app;
}
