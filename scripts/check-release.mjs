import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(tmpdir(), "brevity-release-"));
function run(command, args, cwd = temporary) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

try {
  const packages = [];
  for (const entry of await readdir(join(root, "packages"), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = join(root, "packages", entry.name);
    const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
    const [packed] = JSON.parse(
      run(
        "npm",
        ["pack", directory, "--ignore-scripts", "--json", "--pack-destination", temporary],
        root,
      ),
    );
    assert.equal(manifest.license, "MIT", `${manifest.name} must declare its license`);
    assert.equal(manifest.engines?.node, ">=20", `${manifest.name} must declare Node support`);
    assert.equal(manifest.repository?.url, "git+https://github.com/PortableSheep/brevity.git");
    assert.equal(manifest.repository?.directory, `packages/${entry.name}`);
    const files = new Set(packed.files.map(({ path }) => path));
    assert(files.has("LICENSE"), `${manifest.name} must ship its license`);
    assert.equal(
      await readFile(join(directory, "LICENSE"), "utf8"),
      await readFile(join(root, "LICENSE"), "utf8"),
    );
    const targets = (value) =>
      typeof value === "string" ? [value] : Object.values(value).flatMap(targets);
    for (const target of [manifest.main, manifest.types, ...targets(manifest.exports)]) {
      assert.equal(typeof target, "string", `${manifest.name} has a missing entry point`);
      assert(
        files.has(target.replace(/^\.\//, "")),
        `${manifest.name} is missing packed export ${target}`,
      );
    }
    const [repacked] = JSON.parse(
      run(
        "npm",
        ["pack", directory, "--ignore-scripts", "--json", "--pack-destination", temporary],
        root,
      ),
    );
    assert.equal(
      repacked.integrity,
      packed.integrity,
      `${manifest.name} must produce identical tarballs from unchanged build output`,
    );
    packages.push({ manifest, archive: join(temporary, packed.filename) });
  }

  const serverPackages = packages.filter(
    ({ manifest }) => manifest.name !== "@brevity/islands-svelte",
  );
  for (const { manifest } of packages.filter(({ manifest }) =>
    ["@brevity/core", "@brevity/web"].includes(manifest.name),
  )) {
    for (const category of ["dependencies", "optionalDependencies", "peerDependencies"]) {
      const external = Object.keys(manifest[category] ?? {}).filter(
        (name) => !(manifest.name === "@brevity/web" && name === "@brevity/core"),
      );
      assert.equal(
        external.length,
        0,
        `${manifest.name} must retain zero external runtime dependencies`,
      );
    }
  }
  await writeFile(
    join(temporary, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies: Object.fromEntries(
        serverPackages.map(({ manifest, archive }) => [manifest.name, `file:${archive}`]),
      ),
    }),
  );
  run("npm", ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"]);
  const lock = JSON.parse(await readFile(join(temporary, "package-lock.json"), "utf8"));
  assert(
    !Object.keys(lock.packages).some((name) => name.endsWith("/svelte")),
    "Server-only production installation must not include Svelte",
  );

  await writeFile(
    join(temporary, "smoke.mjs"),
    `
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";
import { createApp, Validator } from "@brevity/core";
import * as decorators from "@brevity/core/decorators";
import { html, HtmlFragment } from "@brevity/web";
import { createViews } from "@brevity/views";
import { createIslands, createEnhance } from "@brevity/islands";
import { defineIsland, startIslands, disposeIslands } from "@brevity/islands/client";
import { enhanceForm } from "@brevity/islands/forms";
import { CachePlugin } from "@brevity/plugin-cache";
import { DebugPlugin, DebugService } from "@brevity/plugin-debug";
import { ViewerPlugin } from "@brevity/plugin-viewer";
import { ValidationPlugin } from "@brevity/plugin-validation";
assert.equal(typeof decorators.registerControllers, "function");
for (const fn of [defineIsland, startIslands, disposeIslands, enhanceForm]) {
  assert.equal(typeof fn, "function");
}
assert.throws(() => new Validator().validate({}, { email: "emial" }), TypeError);
assert(!new DebugService().renderErrorPage(new Error("secret")).includes("secret"));
const island = createIslands({ manifest: "/manifest.json", loader: "/loader.js" });
assert(island("counter", {}).toString().includes("/manifest.json"));
assert(createEnhance({ script: "/enhance.js" })("form", html\`<form></form>\`)
  .toString().includes("data-brevity-enhance"));
await writeFile("page.html", "<h1><%= it.title %></h1>");
const views = createViews({ root: process.cwd() });
const page = await views.renderToString("page", { title: "<unsafe>" });
assert(page instanceof HtmlFragment);
assert(page.toString().includes("&lt;unsafe&gt;"));
const app = createApp({ plugins: [
  new CachePlugin(), new DebugPlugin({ enabled: false }),
  new ViewerPlugin({ baseDir: process.cwd() }), new ValidationPlugin(),
] });
app.router.get("/", (_req, res) => views.render(res, "page", { title: "Packed app" }));
const server = createServer(app.handler).listen(0, "127.0.0.1");
try {
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const response = await fetch("http://127.0.0.1:" + address.port);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<h1>Packed app</h1>");
} finally {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
`,
  );
  run(process.execPath, ["smoke.mjs"]);
  for (const entry of serverPackages) {
    for (const [subpath, target] of Object.entries(entry.manifest.exports)) {
      if (typeof target !== "string") continue;
      const installed = join(temporary, "node_modules", entry.manifest.name, target);
      assert((await readFile(installed)).length > 0, `Missing packed export ${subpath}`);
    }
  }
  const { devDependencies } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  run("npm", [
    "install",
    "--save-dev",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    `typescript@${devDependencies.typescript}`,
    `@types/node@${devDependencies["@types/node"]}`,
  ]);
  await writeFile(
    join(temporary, "consumer.ts"),
    `
import { createServer } from "node:http";
import { createApp, type Request, type Response } from "@brevity/core";
import { Controller, Get, registerControllers } from "@brevity/core/decorators";
import { html } from "@brevity/web";
import { createViews } from "@brevity/views";
import { createIslands } from "@brevity/islands";
@Controller("/readers")
class Readers {
  @Get("/:id")
  show(req: Request, res: Response): void {
    res.json({ id: req.param("id"), page: req.query.page });
  }
}
const app = createApp();
registerControllers(app.router, new Readers());
createServer(app.handler);
const views = createViews({ root: process.cwd() });
const island = createIslands({ manifest: "/manifest.json", loader: "/loader.js" });
app.router.get("/", (_req, res) => views.render(res, "page", {
  title: html\`Packed types\`, component: island("counter", {}),
}));
`,
  );
  run("npm", [
    "exec",
    "--",
    "tsc",
    "--noEmit",
    "--strict",
    "--module",
    "NodeNext",
    "--target",
    "ES2022",
    "consumer.ts",
  ]);
  const adapter = packages.find(({ manifest }) => manifest.name === "@brevity/islands-svelte");
  assert(adapter);
  run("npm", [
    "install",
    "--save-dev",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    adapter.archive,
    `svelte@${devDependencies.svelte}`,
  ]);
  run(process.execPath, [
    "--input-type=module",
    "-e",
    'import { svelteIsland } from "@brevity/islands-svelte"; if (typeof svelteIsland !== "function") throw new Error("Missing adapter");',
  ]);
  const starter = join(temporary, "starter");
  await cp(join(root, "starter"), starter, { recursive: true });
  const starterManifest = JSON.parse(await readFile(join(starter, "package.json"), "utf8"));
  starterManifest.dependencies = Object.fromEntries(
    Object.keys(starterManifest.dependencies).map((name) => {
      const packed = packages.find(({ manifest }) => manifest.name === name);
      assert(packed, `Starter depends on unpacked package ${name}`);
      return [name, `file:${packed.archive}`];
    }),
  );
  await writeFile(join(starter, "package.json"), JSON.stringify(starterManifest));
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], starter);
  run("npm", ["run", "lint"], starter);
  run("npm", ["run", "build"], starter);
  for (const args of [["--import", "tsx", "src/index.ts"], ["dist/index.js"]]) {
    const child = spawn(process.execPath, args, {
      cwd: starter,
      env: { ...process.env, PORT: "0", NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const exited = once(child, "exit");
    let output = "";
    let errors = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      errors += chunk;
    });
    try {
      for (let attempt = 0; attempt < 500 && !output.includes("App running:"); attempt++) {
        if (child.exitCode !== null) throw new Error(`Starter failed: ${errors}`);
        await setTimeout(10);
      }
      const origin = /App running: (http:\/\/\S+)/.exec(output)?.[1];
      assert(origin, `Starter did not become ready: ${errors}`);
      const response = await fetch(origin);
      assert.equal(response.status, 200);
      assert((await response.text()).includes("My Brevity App"));
      assert.equal((await (await fetch(`${origin}/health`)).json()).ok, true);
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
      const deadline = globalThis.setTimeout(() => child.kill("SIGKILL"), 5000);
      const [code, signal] = await exited;
      clearTimeout(deadline);
      assert.equal(signal, null, errors);
      assert.equal(code, 0, errors);
    }
  }
  console.log(
    `Packed consumer passed: ${packages.length} packages; server production graph ${
      Object.keys(lock.packages).length - 1
    } entries, no Svelte. License/metadata, all export targets, repeat-pack integrity, strict consumer types, optional adapter and starter dev/compiled HTTP passed.`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
