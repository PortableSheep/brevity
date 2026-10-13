import { build, version } from "esbuild";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
for (const [name, label] of [
  ["loader", "Native islands loader"],
  ["enhance", "Form enhance directive"],
]) {
  await build({
    absWorkingDir: root,
    entryPoints: [`packages/islands/src/${name}.ts`],
    outfile: `packages/islands/dist/${name}.js`,
    bundle: true,
    minify: true,
    format: "esm",
    target: "es2022",
  });
  const bytes = readFileSync(new URL(`../packages/islands/dist/${name}.js`, import.meta.url));
  console.log(
    `${label}: ${bytes.length} bytes minified, ${gzipSync(bytes).length} bytes gzip (esbuild ${version}; gzip default).`,
  );
}
