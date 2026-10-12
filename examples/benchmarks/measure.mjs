import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { once } from "node:events";
import { request, Agent } from "node:http";
import { cpus, platform, arch, release } from "node:os";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const frameworks = ["brevity", "express", "fastify", "nest"];
function positive(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}
const concurrency = positive("CONCURRENCY", 16);
const durationMs = positive("DURATION_MS", 2000);
const repeats = positive("REPEATS", 3);
const warmupMs = positive("WARMUP_MS", 500);
const body = JSON.stringify({ message: "Hello, Brevity" });
const expected = JSON.parse(body);
const results = [];
function message(child, type) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error(`Timed out waiting for ${type}`)), 30_000);
    function finish(error, value) {
      clearTimeout(timeout);
      child.off("message", received);
      child.off("exit", exited);
      child.off("error", failed);
      error ? reject(error) : resolve(value);
    }
    function received(value) { if (value.type === type) finish(null, value); }
    function exited(code) { finish(new Error(`Server exited (${code}) before ${type}`)); }
    function failed(error) { finish(error); }
    child.on("message", received).once("exit", exited).once("error", failed);
  });
}
async function load(port, method, milliseconds, record, status) {
  const agent = new Agent({ keepAlive: true, maxSockets: concurrency });
  const latencies = [];
  let failures = 0;
  const started = performance.now();
  const deadline = started + milliseconds;
  async function worker() {
    while (performance.now() < deadline) {
      const start = performance.now();
      try {
        await new Promise((resolve, reject) => {
          const req = request({
            host: "127.0.0.1", port, path: method === "GET" ? "/json" : "/echo",
            method, agent, headers: method === "POST"
              ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : {},
          }, res => {
            let data = "";
            res.setEncoding("utf8");
            res.on("data", chunk => { data += chunk; });
            res.on("error", reject);
            res.on("end", () => {
              try {
                assert.equal(res.statusCode, status);
                assert.deepEqual(JSON.parse(data), expected);
                resolve();
              } catch (error) { reject(error); }
            });
          });
          req.setTimeout(5000, () => req.destroy(new Error("Request timeout")));
          req.on("error", reject);
          req.end(method === "POST" ? body : undefined);
        });
        if (record) latencies.push(performance.now() - start);
      } catch (error) {
        failures++;
        if (failures === 1) console.error(`Request failed: ${error.message}`);
      }
    }
  }
  try { await Promise.all(Array.from({ length: concurrency }, worker)); }
  finally { agent.destroy(); }
  const elapsedMs = performance.now() - started;
  if (failures) throw new Error(`${failures} failed requests; refusing a success-shaped benchmark`);
  latencies.sort((a, b) => a - b);
  const percentile = p => latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * p) - 1)];
  return { requests: latencies.length, elapsedMs, requestsPerSecond: latencies.length * 1000 / elapsedMs,
    p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99) };
}
for (let run = 0; run < repeats; run++) {
  const order = [...frameworks.slice(run % frameworks.length), ...frameworks.slice(0, run % frameworks.length)];
  for (const framework of order) {
    for (const method of ["GET", "POST"]) {
      const start = performance.now();
      const child = fork(new URL("./server.mjs", import.meta.url), [framework],
        { stdio: ["ignore", "ignore", "inherit", "ipc"] });
      const exited = once(child, "exit");
      try {
        const ready = await message(child, "ready");
        const processToReadyMs = performance.now() - start;
        const status = framework === "nest" && method === "POST" ? 201 : 200;
        await load(ready.port, method, warmupMs, false, status);
        const measured = await load(ready.port, method, durationMs, true, status);
        const statsPromise = message(child, "stats");
        child.send("stats");
        const { type: _type, ...stats } = await statsPromise;
        results.push({ framework, method, run: run + 1, processToReadyMs, ...stats, ...measured });
        console.error(`${framework} ${method} run ${run + 1}: ${Math.round(measured.requestsPerSecond)} req/s`);
      } finally {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
        const deadline = setTimeout(() => child.kill("SIGKILL"), 5000);
        const [code, signal] = await exited;
        clearTimeout(deadline);
        if (code !== 0 || signal) throw new Error(`Benchmark server failed to stop: ${code}/${signal}`);
      }
    }
  }
}
const lock = JSON.parse(await readFile(new URL("./package-lock.json", import.meta.url), "utf8"));
const core = JSON.parse(await readFile(new URL("./node_modules/@brevity/core/package.json", import.meta.url), "utf8"));
const coreFiles = ["index", "request", "response", "router", "container", "validation"];
const coreDigests = Object.fromEntries(await Promise.all(coreFiles.map(async name => [
  `${name}.js`, createHash("sha256").update(await readFile(
    new URL(`./node_modules/@brevity/core/dist/${name}.js`, import.meta.url))).digest("hex"),
])));
console.log(JSON.stringify({
  recordedAt: new Date().toISOString(), node: process.version,
  system: { platform: platform(), arch: arch(), release: release(), cpu: cpus()[0].model,
    logicalCpus: cpus().length },
  configuration: { concurrency, durationMs, warmupMs, repeats,
    loadGenerator: "Node HTTP, same machine, closed-loop, keep-alive, response JSON verified",
    limitations: "Synthetic routes; no database/auth/templates; co-located client; not a capacity or soak claim" },
  brevity: { version: core.version, compiledFileSha256: coreDigests },
  versions: Object.fromEntries(Object.entries(lock.packages)
    .filter(([path]) => ["node_modules/express", "node_modules/fastify",
      "node_modules/@nestjs/core", "node_modules/@nestjs/platform-express"].includes(path))
    .map(([path, value]) => [path.slice("node_modules/".length), value.version])),
  results,
}, null, 2));
