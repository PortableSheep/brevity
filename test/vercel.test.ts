import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const example = new URL("../examples/vercel/", import.meta.url);
const output = new URL(".vercel/output/", example);

test("Vercel output bundles the handler, views, static assets, and explicit raw-body configuration", async (t) => {
  await execute(process.execPath, [fileURLToPath(new URL("build.mjs", example))]);
  const config = JSON.parse(await readFile(new URL("config.json", output), "utf8"));
  assert.deepEqual(config, {
    version: 3,
    routes: [{ handle: "filesystem" }, { src: "/(.*)", dest: "/index" }],
  });
  const fn = new URL("functions/index.func/", output);
  const runtime = JSON.parse(await readFile(new URL(".vc-config.json", fn), "utf8"));
  assert.equal(runtime.runtime, "nodejs22.x");
  assert.equal(runtime.launcherType, "Nodejs");
  assert.equal(runtime.shouldAddHelpers, false);
  assert.equal(runtime.supportsResponseStreaming, true);
  assert.equal(runtime.maxDuration, 10);
  const { default: handler } = await import(new URL(runtime.handler, fn).href);
  const css = await readFile(new URL("static/style.css", output));
  let protectHealth = false;
  const server = createServer((req, res) => {
    if (protectHealth && req.url === "/health") {
      res.writeHead(302, { location: "/sign-in" });
      res.end();
      return;
    }
    if (req.url === "/style.css") {
      res.setHeader("content-type", "text/css");
      res.end(css);
      return;
    }
    void handler(req, res);
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const { stdout } = await execute(
    process.execPath,
    [fileURLToPath(new URL("check.mjs", example)), `http://127.0.0.1:${address.port}`],
    { timeout: 30_000 },
  );
  assert.match(stdout, /HTTP contracts passed/);
  protectHealth = true;
  await assert.rejects(
    execute(
      process.execPath,
      [fileURLToPath(new URL("check.mjs", example)), `http://127.0.0.1:${address.port}`],
      { timeout: 30_000 },
    ),
    /Health must be directly accessible/,
  );
});
