import { openStore } from "../tutorial/store.js";
import { islandApp } from "./server.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = await mkdtemp(join(tmpdir(), "brevity-island-"));
const store = await openStore(`file:${join(directory, "notes.db")}`);
const server = islandApp(store).listen(3107);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(error => {
      store.close();
      if (error) { console.error(error); process.exitCode = 1; }
      void rm(directory, { recursive: true, force: true }).catch(cleanupError => {
        console.error(cleanupError);
        process.exitCode = 1;
      });
    });
    server.closeAllConnections();
  });
}
