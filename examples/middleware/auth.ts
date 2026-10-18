import type { App } from "@portablesheep/brevity";

// Simple API key auth — demonstrates how to protect routes.
// In real apps, replace with JWT verification or session lookup.
const VALID_API_KEYS = new Set(["dev-key-123", "test-key-456"]);

export function registerAuth(app: App): void {
  // Apply only to /admin/* paths
  app.use(async (req, res, next) => {
    if (!req.path.startsWith("/admin")) return next(req, res);

    const key = req.headers["x-api-key"] ?? req.query?.["api_key"];
    if (!key || !VALID_API_KEYS.has(String(key))) {
      return res.status(401).json({ error: "Unauthorized", hint: "Pass x-api-key: dev-key-123" });
    }

    await next(req, res);
  });
}
