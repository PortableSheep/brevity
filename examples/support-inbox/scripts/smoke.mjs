import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = await mkdtemp(join(tmpdir(), "support-inbox-smoke-"));
async function launch(name, file) {
  const child = spawn(process.execPath, [`dist/${name}.js`], { cwd: root,
    env: { ...process.env, PORT: "0", SUPPORT_DATA: file }, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  let errors = "";
  child.stderr.on("data", bytes => { errors += bytes.toString(); });
  try {
    const port = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Server readiness timed out: ${errors}`)), 10000);
      child.once("error", error => { clearTimeout(timeout); reject(error); });
      child.once("exit", code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${errors}`)); });
      child.stdout.on("data", bytes => {
        output += bytes.toString();
        const match = output.match(/port: (\d+)/);
        if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
      });
    });
    return { child, base: `http://127.0.0.1:${port}` };
  } catch (error) {
    await stop(child);
    throw error;
  }
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Server did not stop after SIGTERM"));
    }, 5000);
    child.once("exit", () => { clearTimeout(timeout); resolve(); });
    child.kill("SIGTERM");
  });
}
try {
  for (const name of ["brevity", "express"]) {
    const file = join(directory, `${name}.json`);
    let instance = await launch(name, file);
    try {
      const response = await fetch(instance.base + "/requests/new");
      assert.equal(response.status, 200);
      const page = await response.text();
      const token = page.match(/name="_token" value="([^"]+)"/)?.[1];
      assert(token);
      const created = await fetch(instance.base + "/requests", { method: "POST", redirect: "manual",
        body: new URLSearchParams({ _token: token, name: "Smoke Demo", email: "demo@example.test",
          subject: "Compiled app smoke", details: "Fictional request" }) });
      assert.equal(created.status, 303);
      const location = created.headers.get("location");
      assert(location);
      assert.match(await (await fetch(instance.base + location)).text(), /Compiled app smoke/);
      const asset = await fetch(instance.base + "/assets/app.js");
      assert.equal(asset.status, 200);
      assert.equal(asset.headers.get("content-encoding"), null);
      assert.match(await asset.text(), /addEventListener/);
      await stop(instance.child);
      instance = await launch(name, file);
      assert.match(await (await fetch(instance.base + location)).text(), /Compiled app smoke/);
      console.log(`${name}: compiled HTTP create/detail/static/process-restart smoke passed`);
    } finally { await stop(instance.child); }
  }
} finally { await rm(directory, { recursive: true }); }
