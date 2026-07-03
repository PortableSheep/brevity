import type { App } from "@brevity/core";
import { DebugService } from "@brevity/plugin-debug";

export function registerRequestLogger(app: App): void {
  app.use(async (req, res, next) => {
    res.header("x-powered-by", "brevity");
    const startedAt = Date.now();

    await next(req, res);

    const duration = Date.now() - startedAt;
    const debug = app.container.get<DebugService>("debug");
    debug?.info(`${req.method} ${req.path}`, { duration_ms: duration });
    console.log(`  ${req.method} ${req.path} (${duration}ms)`);
  });
}
