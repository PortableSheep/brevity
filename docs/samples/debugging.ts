import { createApp, HttpError } from "@brevity/core";
import { DebugPlugin, type DebugService } from "@brevity/plugin-debug";

export function debugApp(enabled = process.env.NODE_ENV !== "production") {
  let debug: DebugService;
  const app = createApp({
    onError(error, req, res) {
      if (enabled && error instanceof Error && !(error instanceof HttpError)) {
        debug.renderErrorResponse(res, error, { method: req?.method, path: req?.path });
      }
      // Returning without a response uses core's safe default handler.
    },
    plugins: [new DebugPlugin({ enabled, verbose: true })],
  });
  debug = app.container.get<DebugService>("debug");
  app.use(async (req, res, next) => {
    debug.info(`${req.method} ${req.path}`);
    return next(req, res);
  });
  if (enabled) {
    app.router.get("/debug", (_req, res) => res.json({ logs: debug.getLogs() }));
  }
  app.router.get("/", (_req, res) => res.json({ ok: true }));
  return app;
}
