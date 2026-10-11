import { build, version } from "esbuild";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ["packages/islands/src/loader.ts"],
  outfile: "packages/islands/dist/loader.js",
  bundle: true, minify: true, format: "esm", target: "es2022",
});
const bytes = readFileSync(new URL("../packages/islands/dist/loader.js", import.meta.url));
console.log(`Native islands loader: ${bytes.length} bytes minified, ${gzipSync(bytes).length} bytes gzip (esbuild ${version}; gzip default).`);
