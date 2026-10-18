import { createApp } from "@portablesheep/brevity";

type ServiceOptions = {
  port?: number;
  host?: string;
  work: () => Promise<string>;
  closeResources: () => Promise<void>;
  drainTimeoutMs?: number;
};

export function startService(options: ServiceOptions) {
  let ready = true;
  let shutdown: Promise<void> | undefined;
  const app = createApp();
  app.router.get("/health/live", (_req, res) => res.json({ live: true }));
  app.router.get("/health/ready", (_req, res) => res.json({ ready }, ready ? 200 : 503));
  app.router.get("/work", async (_req, res) => res.send(await options.work()));
  const server = app.listen(options.port ?? 3000, options.host ?? "127.0.0.1");
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.on("request", (_req, res) => {
    res.once("finish", () => {
      if (!ready) setImmediate(() => server.closeIdleConnections());
    });
  });

  function stop(): Promise<void> {
    if (shutdown) return shutdown;
    ready = false;
    shutdown = (async () => {
      let deadlineExceeded = false;
      const deadline = setTimeout(() => {
        deadlineExceeded = true;
        console.error("[service] drain deadline exceeded; closing HTTP connections");
        server.closeAllConnections();
      }, options.drainTimeoutMs ?? 5_000);
      deadline.unref();
      try {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          server.closeIdleConnections();
        });
        await options.closeResources();
        if (deadlineExceeded) throw new Error("Service drain deadline exceeded");
      } finally {
        clearTimeout(deadline);
      }
    })();
    return shutdown;
  }

  return { app, server, stop };
}
