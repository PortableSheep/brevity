import { build } from "esbuild";
import { fileURLToPath } from "node:url";

await build({
  absWorkingDir: fileURLToPath(new URL("./", import.meta.url)),
  entryPoints: ["counter.ts", "form.ts"], outdir: "dist",
  bundle: true, format: "esm", target: "es2022", minify: true,
});
