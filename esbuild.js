const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/** @type {import('esbuild').Plugin} */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",
  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      for (const { text, location } of result.errors) {
        console.error(`✘ [ERROR] ${text}`);
        if (location) {
          console.error(`  ${location.file}:${location.line}:${location.column}:`);
        }
      }
      console.log("[watch] build finished");
    });
  },
};

async function createContext(options) {
  return esbuild.context({
    ...options,
    bundle: true,
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    logLevel: "silent",
    plugins: [esbuildProblemMatcherPlugin],
  });
}

async function main() {
  const extension = await createContext({
    entryPoints: ["src/extension.ts"],
    format: "cjs",
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
  });
  const panel = await createContext({
    entryPoints: ["src/panelClient.ts"],
    format: "iife",
    platform: "browser",
    outfile: "dist/panel.js",
  });
  if (watch) {
    await Promise.all([extension.watch(), panel.watch()]);
  } else {
    await Promise.all([extension.rebuild(), panel.rebuild()]);
    await Promise.all([extension.dispose(), panel.dispose()]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
