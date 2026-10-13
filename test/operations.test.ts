import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { startService } from "../docs/samples/operations.js";

test("operational recipe drains active requests before closing resources, once", async (t) => {
  let release!: () => void;
  let started!: () => void;
  const workStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  const pendingWork = new Promise<void>((resolve) => {
    release = resolve;
  });
  let closed = 0;
  const service = startService({
    port: 0,
    async work() {
      started();
      await pendingWork;
      return "finished";
    },
    async closeResources() {
      closed++;
    },
  });
  t.after(async () => {
    release();
    await service.stop();
  });
  await once(service.server, "listening");
  const address = service.server.address();
  assert(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  assert.deepEqual(await (await fetch(`${origin}/health/live`)).json(), { live: true });
  assert.deepEqual(await (await fetch(`${origin}/health/ready`)).json(), { ready: true });
  const response = fetch(`${origin}/work`).then((res) => res.text());
  await workStarted;
  const stopping = service.stop();
  assert.equal(service.stop(), stopping);
  assert.equal(closed, 0);
  release();
  assert.equal(await response, "finished");
  await stopping;
  assert.equal(closed, 1);
  await assert.rejects(fetch(`${origin}/health/live`));
});

test("operational cleanup failures reject shutdown rather than report success", async () => {
  const service = startService({
    port: 0,
    async work() {
      return "finished";
    },
    async closeResources() {
      throw new Error("Database cleanup failed");
    },
  });
  await once(service.server, "listening");
  await assert.rejects(service.stop(), { message: "Database cleanup failed" });
  assert.equal(service.server.listening, false);
});

for (const forced of [false, true]) {
  test(
    `operational process handles SIGTERM (${forced ? "deadline failure" : "graceful drain"})`,
    { timeout: 10_000 },
    async (t) => {
      const child = spawn(
        process.execPath,
        ["--import", "tsx", "docs/samples/operations-process.ts"],
        {
          env: {
            ...process.env,
            WORK_DELAY_MS: forced ? "800" : "150",
            DRAIN_TIMEOUT_MS: forced ? "50" : "2000",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      const exited = once(child, "exit");
      let output = "";
      let errors = "";
      child.stdout.setEncoding("utf8").on("data", (chunk) => {
        output += chunk;
      });
      child.stderr.setEncoding("utf8").on("data", (chunk) => {
        errors += chunk;
      });
      t.after(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      });
      async function waitFor(pattern: RegExp) {
        for (let attempt = 0; attempt < 300; attempt++) {
          if (pattern.test(output)) return;
          if (child.exitCode !== null) throw new Error(`Process exited: ${errors}`);
          await setTimeout(10);
        }
        throw new Error(`Timed out waiting for ${pattern}: ${output}\n${errors}`);
      }
      await waitFor(/Listening: (http:\/\/\S+)/);
      const origin = /Listening: (http:\/\/\S+)/.exec(output)![1];
      assert.equal((await fetch(`${origin}/health/ready`)).status, 200);
      const response = fetch(`${origin}/work`).then(
        async (res) => ({ body: await res.text(), failed: false }),
        () => ({ body: "", failed: true }),
      );
      await waitFor(/Work started/);
      child.kill("SIGTERM");
      const result = await response;
      const [code, signal] = await exited;
      assert.equal(signal, null);
      assert.equal(code, forced ? 1 : 0, errors);
      assert.equal(result.failed, forced);
      if (!forced) assert.equal(result.body, "Work finished");
      assert.equal(output.match(/Resources closed/g)?.length, 1);
      assert.equal(errors.includes("drain deadline exceeded"), forced);
    },
  );
}
