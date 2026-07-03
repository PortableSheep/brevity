import type { App, Viewer } from "@brevity/core";
import { CacheManager } from "@brevity/plugin-cache";
import { DebugService } from "@brevity/plugin-debug";
import { renderDebugLogEntries } from "../support/debug-view.js";

export function registerSystemRoutes(app: App): void {
  app.router.get("/health", (_req, res) => {
    res.json({ ok: true, uptime: Math.round(process.uptime()), version: process.env.npm_package_version ?? "0.1.0" });
  });

  app.router.get("/stats", (_req, res, container) => {
    const cache = container?.get<CacheManager>("cache");
    res.json({
      data: {
        requests: cache?.get<number>("stats:requests") ?? 0,
        uptime_s: Math.round(process.uptime()),
        cache_enabled: !!cache,
        node_version: process.version,
        env: process.env.NODE_ENV ?? "development",
      },
    });
  });

  // Protected admin route — needs x-api-key header (see auth middleware)
  app.router.get("/admin/status", (_req, res) => {
    res.json({ admin: true, message: "You're authenticated!" });
  });

  app.router.get("/test-error", () => {
    throw new Error("Test error — check the styled error page in dev mode.");
  });

  app.router.get("/debug", (_req, res, container) => {
    const debug = container?.get<DebugService>("debug");
    const viewer = container?.get<Viewer>("viewer");
    if (!debug || !viewer) return res.status(503).json({ error: "Debug not enabled" });

    const logs = debug.getLogs();
    const html = viewer.render("debug.html", {
      title: "Debug Logs",
      total: logs.length,
      infoCount: logs.filter((l) => l.level === "info").length,
      warnCount: logs.filter((l) => l.level === "warn").length,
      errorCount: logs.filter((l) => l.level === "error").length,
      logsHtml: renderDebugLogEntries(logs),
    });
    res.header("content-type", "text/html; charset=utf-8").send(html);
  });
}
