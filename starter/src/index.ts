import { createApp } from "@brevity/core";
import { CachePlugin } from "@brevity/plugin-cache";
import { ViewerPlugin } from "@brevity/plugin-viewer";
import { DebugPlugin } from "@brevity/plugin-debug";
import { ValidationPlugin } from "@brevity/plugin-validation";

const app = createApp({
  plugins: [
    new CachePlugin({ defaultTtl: 120 }),
    new ViewerPlugin({ baseDir: import.meta.dirname + "/views" }),
    new DebugPlugin({ enabled: process.env.NODE_ENV !== "production" }),
    new ValidationPlugin(),
  ],
});

// Home route
app.router.get("/", (_req, res, container) => {
  const viewer = container?.get("viewer");
  const html = viewer?.render("index.html", {
    title: "My Brevity App",
  });
  res.send(html ?? "Welcome to Brevity!");
});

// Health check
app.router.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Start server
app.listen(3000);
console.log("🚀 App running: http://127.0.0.1:3000");
console.log(`🐛 Debug mode: ${process.env.NODE_ENV !== "production" ? "ON" : "OFF"}`);
if (process.env.NODE_ENV !== "production") {
  console.log("📊 View logs: http://127.0.0.1:3000/debug");
}
