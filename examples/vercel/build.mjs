import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = new URL("./", import.meta.url);
const output = new URL(".vercel/output/", root);
const fn = new URL("functions/index.func/", output);
await rm(output, { recursive: true, force: true });
await mkdir(fn, { recursive: true });
await build({
  entryPoints: [fileURLToPath(new URL("app.ts", root))],
  outfile: fileURLToPath(new URL("index.mjs", fn)),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
});
await cp(new URL("views/", root), new URL("views/", fn), { recursive: true });
await cp(new URL("public/", root), new URL("static/", output), { recursive: true });
await writeFile(
  new URL(".vc-config.json", fn),
  JSON.stringify({
    runtime: "nodejs22.x",
    handler: "index.mjs",
    launcherType: "Nodejs",
    shouldAddHelpers: false,
    supportsResponseStreaming: true,
    maxDuration: 10,
  }),
);
await writeFile(
  new URL("config.json", output),
  JSON.stringify({
    version: 3,
    routes: [{ handle: "filesystem" }, { src: "/(.*)", dest: "/index" }],
  }),
);
console.log(`Built Vercel Node function and static assets in ${fileURLToPath(output)}`);
