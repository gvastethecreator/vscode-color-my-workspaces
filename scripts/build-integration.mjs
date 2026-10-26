import { build } from "esbuild";

await build({
  entryPoints: ["test/integration/extension.test.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node22",
  outfile: "dist-test/extension.test.cjs",
  external: ["vscode"],
  sourcemap: false,
  logLevel: "info",
});
