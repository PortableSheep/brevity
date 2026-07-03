import type { App } from "@brevity/core";
import { CacheManager } from "@brevity/plugin-cache";

export function registerRequestCounter(app: App): void {
  app.use(async (req, _res, next, container) => {
    const cache = container?.get<CacheManager>("cache");
    if (cache) {
      const count = cache.get<number>("stats:requests") ?? 0;
      cache.put("stats:requests", count + 1, 3600);
    }
    await next(req, _res);
  });
}
