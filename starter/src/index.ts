import { fileURLToPath } from "node:url";
import { createApp, type Viewer } from "@brevity/core";
import { CachePlugin } from "@brevity/plugin-cache";
import { ViewerPlugin } from "@brevity/plugin-viewer";
import { DebugPlugin } from "@brevity/plugin-debug";
import { ValidationPlugin } from "@brevity/plugin-validation";

const app = createApp({
  plugins: [
    new CachePlugin({ defaultTtl: 120 }),
    new ViewerPlugin({ baseDir: fileURLToPath(new URL("../views", import.meta.url)) }),
    new DebugPlugin({ enabled: process.env.NODE_ENV !== "production" }),
    new ValidationPlugin(),
  ],
});
const viewer = app.container.get<Viewer>("viewer");

// Home route
app.router.get("/", (_req, res) => {
  const html = viewer.render("index.html", {
    title: "My Brevity App",
  });
  res.send(html);
});

// Health check
app.router.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Start server
const server = app.listen(Number(process.env.PORT ?? 3000));
server.on("listening", () => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP listener");
  console.log(`App running: http://127.0.0.1:${address.port}`);
});
server.on("error", error => {
  console.error(error);
  process.exitCode = 1;
});
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    server.close(error => {
      if (error) { console.error(error); process.exitCode = 1; }
    });
    server.closeIdleConnections();
  });
}
