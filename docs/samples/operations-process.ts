import { setTimeout } from "node:timers/promises";
import { startService } from "./operations.js";

const service = startService({
  port: 0,
  drainTimeoutMs: Number(process.env.DRAIN_TIMEOUT_MS ?? 5_000),
  async work() {
    console.log("Work started");
    await setTimeout(Number(process.env.WORK_DELAY_MS ?? 100));
    return "Work finished";
  },
  async closeResources() {
    console.log("Resources closed");
  },
});
service.server.on("listening", () => {
  const address = service.server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP listener");
  console.log(`Listening: http://127.0.0.1:${address.port}`);
});
service.server.on("error", error => {
  console.error(error);
  process.exitCode = 1;
});
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    void service.stop().catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
  });
}
