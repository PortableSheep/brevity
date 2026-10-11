import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);
const json = path => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const lock = json("package-lock.json");
const loader = readFileSync(new URL("packages/islands/dist/loader.js", root));
const packages = {};
for (const name of ["core", "web", "views", "islands"]) {
  const pkg = json(`packages/${name}/package.json`);
  const graph = new Set();
  function visit(dependency, parent = "") {
    const key = `${parent}node_modules/${dependency}`;
    const entry = lock.packages[key] ?? lock.packages[`node_modules/${dependency}`];
    if (!entry) throw new Error(`Missing installed dependency: ${dependency}`);
    const pair = `${dependency}@${entry.version}`;
    if (graph.has(pair)) return;
    graph.add(pair);
    for (const child of Object.keys(entry.dependencies ?? {})) visit(child, `${key}/`);
  }
  for (const dependency of Object.keys(pkg.dependencies ?? {})) visit(dependency);
  packages[pkg.name] = {
    directRuntimeDependencies: Object.keys(pkg.dependencies ?? {}).length,
    externalRuntimeGraph: [...graph].sort(),
    requiredPeers: Object.keys(pkg.peerDependencies ?? {}).filter(peer => !pkg.peerDependenciesMeta?.[peer]?.optional),
    optionalPeers: Object.keys(pkg.peerDependenciesMeta ?? {}).filter(peer => pkg.peerDependenciesMeta[peer].optional),
  };
}
console.log(JSON.stringify({
  loader: { minifiedBytes: loader.length, gzipBytes: gzipSync(loader).length, includes: "loader only; excludes components, forms helper, adapters, page props" },
  tooling: { esbuild: json("node_modules/esbuild/package.json").version, node: process.version, gzip: "node:zlib default options" },
  packages,
}, null, 2));
