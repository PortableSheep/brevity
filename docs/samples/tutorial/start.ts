import { createNotebook } from "./app.js";
import { openStore } from "./store.js";

const store = await openStore(process.env.DATABASE_URL ?? "file:notebook.db");
const app = createNotebook(store);
const server = app.listen(Number(process.env.PORT ?? 3000));
server.on("listening", () => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP listener");
  console.log(`Notebook: http://127.0.0.1:${address.port}`);
});
server.on("error", error => {
  console.error(error);
  store.close();
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(error => {
      store.close();
      if (error) { console.error(error); process.exitCode = 1; }
    });
    server.closeIdleConnections();
  });
}
