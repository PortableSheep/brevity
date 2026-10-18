import type { App } from "@portablesheep/brevity";
import { DebugService } from "@portablesheep/brevity-plugin-debug";

export function registerErrorHandler(app: App): void {
  app.use(async (req, res, next) => {
    try {
      await next(req, res);
    } catch (err) {
      const debug = app.container.get<DebugService>("debug");
      debug?.error("Unhandled error", {
        path: req.path,
        method: req.method,
        message: (err as Error).message,
      });

      if (debug && process.env.NODE_ENV !== "production") {
        debug.renderErrorResponse(res, err as Error, { path: req.path, method: req.method });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });
}
