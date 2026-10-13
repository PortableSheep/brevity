import { monitorEventLoopDelay } from "node:perf_hooks";

const framework = process.argv[2];
const payload = { message: "Hello, Brevity" };
const start = performance.now();
let server;
let close;
if (framework === "brevity") {
  const { createApp } = await import("@brevity/core");
  const app = createApp({ maxBodyBytes: 1_048_576 });
  app.router.get("/json", (_req, res) => res.json(payload));
  app.router.post("/echo", (req, res) => res.json(req.body));
  server = app.listen(0);
  close = () =>
    new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeIdleConnections();
    });
} else if (framework === "express") {
  const { default: express } = await import("express");
  const app = express();
  app.use(express.json({ limit: 1_048_576 }));
  app.get("/json", (_req, res) => res.json(payload));
  app.post("/echo", (req, res) => res.json(req.body));
  server = app.listen(0, "127.0.0.1");
  close = () =>
    new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeIdleConnections();
    });
} else if (framework === "fastify") {
  const { default: fastify } = await import("fastify");
  const app = fastify({ logger: false, bodyLimit: 1_048_576 });
  app.get("/json", async () => payload);
  app.post("/echo", async (req) => req.body);
  await app.listen({ port: 0, host: "127.0.0.1" });
  server = app.server;
  close = () => app.close();
} else if (framework === "nest") {
  await import("reflect-metadata");
  const { Controller, Get, Post, Body, Module } = await import("@nestjs/common");
  const { NestFactory } = await import("@nestjs/core");
  class BenchmarkController {
    json() {
      return payload;
    }
    echo(body) {
      return body;
    }
  }
  Controller()(BenchmarkController);
  Get("/json")(
    BenchmarkController.prototype,
    "json",
    Object.getOwnPropertyDescriptor(BenchmarkController.prototype, "json"),
  );
  Post("/echo")(
    BenchmarkController.prototype,
    "echo",
    Object.getOwnPropertyDescriptor(BenchmarkController.prototype, "echo"),
  );
  Body()(BenchmarkController.prototype, "echo", 0);
  class BenchmarkModule {}
  Module({ controllers: [BenchmarkController] })(BenchmarkModule);
  const app = await NestFactory.create(BenchmarkModule, { logger: false, abortOnError: false });
  app
    .getHttpAdapter()
    .getInstance()
    .use((await import("express")).default.json({ limit: 1_048_576 }));
  await app.listen(0, "127.0.0.1");
  server = app.getHttpServer();
  close = () => app.close();
} else {
  throw new Error(`Unknown framework: ${framework}`);
}
if (!server.listening) {
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
}
const startupMs = performance.now() - start;
let peakRssBytes = process.memoryUsage().rss;
const delay = monitorEventLoopDelay({ resolution: 10 });
delay.enable();
const sampler = setInterval(() => {
  peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
}, 100);
sampler.unref();
process.on("message", (message) => {
  if (message !== "stats") return;
  peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
  process.send({
    type: "stats",
    startupMs,
    peakRssBytes,
    eventLoopP99Ms: delay.percentile(99) / 1e6,
  });
});
process.send({ type: "ready", port: server.address().port });
process.once("SIGTERM", () => {
  clearInterval(sampler);
  delay.disable();
  void close()
    .then(() => process.disconnect())
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
      process.disconnect();
    });
});
