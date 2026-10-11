import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";

const root = resolve(import.meta.dirname, "..");
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
function pages(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? pages(path) : path.endsWith(".md") ? [path] : [];
  });
}
// Tutorial and recipes import executable source; reject unverified inline code.
for (const path of [
  resolve(root, "docs/guide/tutorial.md"),
  resolve(root, "docs/guide/views.md"),
  resolve(root, "docs/guide/islands.md"),
  ...pages(resolve(root, "docs/recipes")),
]) {
  const source = readFileSync(path, "utf8");
  if (/^```(?:ts|typescript|js|javascript|svelte|prisma|html)\b/m.test(source)) {
    throw new Error(`Use a checked snippet import instead of inline code in ${relative(root, path)}`);
  }
  for (const match of source.matchAll(/^<<<\s+(\S+)/gm)) {
    const target = match[1].replace(/[#{}].*$/, "");
    const file = target.startsWith("@/") ? resolve(root, "docs", target.slice(2))
      : resolve(root, "docs", target);
    if (!file.startsWith(resolve(root, "docs/samples") + "/")) {
      throw new Error(`Snippet must come from docs/samples: ${match[1]}`);
    }
    readFileSync(file);
  }
}
run("npx", ["prisma", "generate", "--schema", "docs/samples/prisma/schema.prisma"]);
run("npx", ["tsc", "-p", "docs/samples/tsconfig.json"]);
run("npx", ["svelte-check", "--tsconfig", "docs/samples/island/client/tsconfig.json"]);
run("npx", ["vite", "build", "--config", "docs/samples/island/vite.config.ts"]);
run(process.execPath, ["docs/samples/native/build.mjs"]);
const loader = readFileSync(resolve(root, "packages/islands/dist/loader.js"));
const { gzipSync } = await import("node:zlib");
const measured = `**${loader.length.toLocaleString("en-US")} minified bytes / ${gzipSync(loader).length} gzip bytes**`;
if (!readFileSync(resolve(root, "docs/guide/islands.md"), "utf8").includes(measured)) {
  throw new Error(`Update islands guide loader measurement: ${measured}`);
}
run(process.execPath, ["--import", "tsx", "--test", "docs/samples/sample.test.ts"]);
