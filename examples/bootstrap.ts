import { join } from "node:path";
import { createApp, type App } from "@brevity/core";
import { CachePlugin } from "@brevity/plugin-cache";
import { ViewerPlugin } from "@brevity/plugin-viewer";
import { DebugPlugin } from "@brevity/plugin-debug";
import { ValidationPlugin } from "@brevity/plugin-validation";
import { AppProvider } from "./providers/app-provider.js";
import { registerErrorHandler } from "./middleware/error-handler.js";
import { registerRequestLogger } from "./middleware/request-logger.js";
import { registerRequestCounter } from "./middleware/request-counter.js";
import { registerAuth } from "./middleware/auth.js";
import { registerHomeRoutes } from "./routes/home-routes.js";
import { registerUserRoutes } from "./routes/user-routes.js";
import { registerNoteRoutes } from "./routes/note-routes.js";
import { registerSystemRoutes } from "./routes/system-routes.js";

export function createExampleApp(): App {
  const app = createApp({
    plugins: [
      new CachePlugin({ defaultTtl: 120 }),
      new ViewerPlugin({ baseDir: join(process.cwd(), "examples/views") }),
      new DebugPlugin({ enabled: process.env.NODE_ENV !== "production" }),
      new ValidationPlugin(),
    ],
  });

  app.container.registerProvider(AppProvider);

  // Middleware — order matters: error handler wraps all others
  registerErrorHandler(app);
  registerRequestLogger(app);
  registerRequestCounter(app);
  registerAuth(app);

  // Routes
  registerHomeRoutes(app);
  registerUserRoutes(app);
  registerNoteRoutes(app);
  registerSystemRoutes(app);

  // 404 fallback
  app.router.get("/{*:path}", (req, res, container) => {
    const viewer = container?.get("viewer") as { render(t: string, d: object): string } | undefined;
    const html = viewer?.render("404.html", { path: req.path });
    res.status(404).header("content-type", "text/html; charset=utf-8").send(html ?? "404 Not Found");
  });

  return app;
}
