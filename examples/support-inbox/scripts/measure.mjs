import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));
const groups = {
  brevityGlue: ["src/brevity.ts", "src/brevity-views.ts"],
  expressGlue: ["src/express.ts", "src/express-views.ts"],
  sharedBusiness: ["src/domain.ts"],
  sharedBrowser: ["public/app.css", "public/app.js"],
  sharedRuntimeConfig: ["src/config.ts"],
  buildConfig: ["package.json", "tsconfig.json", "tsconfig.test.json", ".npmrc", ".gitignore"],
  acceptanceTests: ["test/acceptance.test.ts", "test/domain.test.ts", "test/browser.test.ts"],
  measurementTooling: ["scripts/measure.mjs", "scripts/smoke.mjs"],
};
function counts(bytes) {
  const text = bytes.toString("utf8");
  const lines = text.length ? text.replace(/\r\n/g, "\n").split("\n") : [];
  if (text.endsWith("\n")) lines.pop();
  return {
    physical: lines.length,
    nonblank: lines.filter((line) => line.trim()).length,
    bytes: bytes.length,
  };
}
const sum = (values) =>
  values.reduce(
    (total, item) => ({
      physical: total.physical + item.physical,
      nonblank: total.nonblank + item.nonblank,
      bytes: total.bytes + item.bytes,
    }),
    { physical: 0, nonblank: 0, bytes: 0 },
  );
async function filesAt(directory, prefix = "") {
  const files = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name, "en"),
  )) {
    if (entry.name === "node_modules") continue;
    const name = prefix + entry.name;
    if (entry.isDirectory())
      files.push(...(await filesAt(join(directory, entry.name), name + "/")));
    else if (entry.isFile()) files.push(name);
  }
  return files;
}
const expected = Object.values(groups).flat().sort();
const actual = [
  ...(await filesAt(join(root, "src"))).map((file) => "src/" + file),
  ...(await filesAt(join(root, "public"))).map((file) => "public/" + file),
  ...(await filesAt(join(root, "test"))).map((file) => "test/" + file),
  ...(await filesAt(join(root, "scripts"))).map((file) => "scripts/" + file),
  "package.json",
  "tsconfig.json",
  "tsconfig.test.json",
  ".npmrc",
  ".gitignore",
].sort();
if (JSON.stringify(expected) !== JSON.stringify(actual))
  throw new Error("Update metric classification for added/removed source files");
const fileCounts = {};
const categories = {};
for (const [category, paths] of Object.entries(groups)) {
  for (const path of paths) fileCounts[path] = counts(await readFile(join(root, path)));
  categories[category] = sum(paths.map((path) => fileCounts[path]));
}
const runnable = {};
for (const name of ["brevity", "express"]) {
  const keys = [name + "Glue", "sharedBusiness", "sharedBrowser", "sharedRuntimeConfig"];
  runnable[name] = { includedCategories: keys, ...sum(keys.map((key) => categories[key])) };
}

const tree = JSON.parse(
  execFileSync("npm", ["ls", "--all", "--omit=dev", "--json"], { cwd: root, encoding: "utf8" }),
);
if (tree.problems?.length) throw new Error(tree.problems.join("\n"));
async function packagePath(name, from) {
  let directory = from;
  while (true) {
    const path = join(directory, "node_modules", name);
    try {
      await readFile(join(path, "package.json"));
      return path;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`Cannot resolve installed ${name}`);
    directory = parent;
  }
}
const runtimeLibraries = {};
const dependencies = {};
for (const [name, direct] of Object.entries({
  brevity: ["@portablesheep/brevity", "@portablesheep/brevity-web"],
  express: ["express"],
})) {
  const installed = new Map();
  async function visit(packageName, node, from) {
    const key = `${packageName}@${node.version}`;
    if (installed.has(key)) return;
    const path = await packagePath(packageName, from);
    const manifest = JSON.parse(await readFile(join(path, "package.json"), "utf8"));
    if (manifest.version !== node.version) throw new Error(`Version mismatch: ${key}`);
    installed.set(key, path);
    for (const [child, childNode] of Object.entries(node.dependencies ?? {}).sort())
      await visit(child, childNode, path);
  }
  for (const packageName of direct) await visit(packageName, tree.dependencies[packageName], root);
  const packageCounts = {};
  for (const [key, path] of [...installed].sort(([a], [b]) => a.localeCompare(b, "en"))) {
    const files = (await filesAt(path)).filter((file) => /\.(?:js|cjs|mjs)$/.test(file));
    const buffers = await Promise.all(files.map((file) => readFile(join(path, file))));
    const hash = createHash("sha256");
    files.forEach((file, index) => {
      hash.update(file + "\0");
      hash.update(buffers[index]);
    });
    packageCounts[key] = {
      files: files.length,
      ...sum(buffers.map(counts)),
      sha256: hash.digest("hex"),
    };
  }
  dependencies[name] = {
    direct: direct.map((packageName) => `${packageName}@${tree.dependencies[packageName].version}`),
    transitive: [...installed.keys()]
      .filter((key) => !direct.some((packageName) => key.startsWith(packageName + "@")))
      .sort(),
    uniqueProductionPackages: installed.size,
  };
  runtimeLibraries[name] = { total: sum(Object.values(packageCounts)), packages: packageCounts };
}
const browser = {};
for (const path of groups.sharedBrowser) {
  const bytes = await readFile(join(root, path));
  browser[path] = { rawBytes: bytes.length, gzipBytes: gzipSync(bytes, { level: 9 }).length };
}
browser.total = {
  rawBytes: Object.values(browser).reduce((n, item) => n + item.rawBytes, 0),
  gzipBytes: Object.values(browser).reduce((n, item) => n + item.gzipBytes, 0),
};
const directory = await mkdtemp(join(tmpdir(), "support-inbox-measure-"));
const servedBrowser = {};
try {
  const file = join(directory, "requests.json");
  const id = "00000000-0000-4000-8000-000000000001";
  await writeFile(
    file,
    JSON.stringify([
      {
        id,
        name: "Demo Person",
        email: "demo@example.test",
        subject: "Local demo question",
        details: "Fictional support details.",
        status: "open",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]),
  );
  const token = createHash("sha256").update("deterministic measurement fixture").digest("hex");
  for (const name of ["brevity", "express"]) {
    const { start } = await import(new URL(`../dist/${name}.js`, import.meta.url));
    const server = await start({ file, token });
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing HTTP listener");
      const pages = {};
      for (const path of [
        "/requests/new",
        "/inbox",
        `/requests/${id}`,
        "/assets/app.css",
        "/assets/app.js",
      ]) {
        const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
        if (response.status !== 200 || response.headers.has("content-encoding"))
          throw new Error("Unexpected HTTP payload/compression");
        const bytes = Buffer.from(await response.arrayBuffer());
        if (
          path.startsWith("/assets/") &&
          !bytes.equals(await readFile(join(root, "public", path.split("/").at(-1))))
        ) {
          throw new Error("Served asset differs from source");
        }
        pages[path] = { rawBytes: bytes.length, gzipBytes: gzipSync(bytes, { level: 9 }).length };
      }
      servedBrowser[name] = {
        pages,
        firstFormWithAssets: {
          rawBytes: pages["/requests/new"].rawBytes + browser.total.rawBytes,
          gzipBytes: pages["/requests/new"].gzipBytes + browser.total.gzipBytes,
        },
      };
    } finally {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections();
      });
    }
  }
} finally {
  await rm(directory, { recursive: true });
}
const lock = await readFile(join(root, "package-lock.json"));
const frameworkRevision = execFileSync(
  "git",
  ["log", "-1", "--format=%H", "--", "packages/core", "packages/web"],
  { cwd: resolve(root, "../.."), encoding: "utf8" },
).trim();
const localFrameworkSource = {};
for (const name of ["core", "web"]) {
  const directory = resolve(root, "../../packages", name, "src");
  const paths = (await filesAt(directory)).filter((file) => file.endsWith(".ts"));
  localFrameworkSource[name] = sum(
    await Promise.all(paths.map(async (path) => counts(await readFile(join(directory, path))))),
  );
}
console.log(
  JSON.stringify(
    {
      rules:
        "Physical/nonblank lines and UTF-8 bytes; all application/template/browser/runtime config files included once per runnable app. Tests/build config/tooling separate. Installed runtime library JS counts all shipped JS, not only executed code. Gzip level 9 per asset, not HTTP compression.",
      frameworkRevision,
      node: process.version,
      lock: { bytes: lock.length, sha256: createHash("sha256").update(lock).digest("hex") },
      files: fileCounts,
      categories,
      runnable,
      dependencies,
      runtimeLibraries,
      localFrameworkSource,
      browser,
      servedBrowser,
    },
    null,
    2,
  ),
);
