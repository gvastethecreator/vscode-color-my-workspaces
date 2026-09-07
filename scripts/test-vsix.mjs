import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  downloadAndUnzipVSCode,
  runTests,
  runVSCodeCommand,
} from "@vscode/test-electron";

const version = process.env.VSCODE_TEST_VERSION ?? "stable";
const vsix = await newestVsix();
const expectedVersion = JSON.parse(await readFile("package.json", "utf8")).version;
const root = await mkdtemp(path.join(tmpdir(), "color-my-workspaces-vsix-"));
const workspace = path.join(root, "workspace");
const userData = path.join(root, "user-data");
const extensions = path.join(root, "extensions");
await Promise.all([
  mkdir(workspace, { recursive: true }),
  mkdir(userData, { recursive: true }),
  mkdir(extensions, { recursive: true }),
]);
await writeFile(path.join(workspace, "README.md"), "# Packaged smoke fixture\n", "utf8");
try {
  await runVSCodeCommand(
    [
      `--user-data-dir=${userData}`,
      `--extensions-dir=${extensions}`,
      "--install-extension",
      vsix,
      "--force",
    ],
    { version },
  );
  const executable = await downloadAndUnzipVSCode(version);
  await runTests({
    vscodeExecutablePath: executable,
    extensionDevelopmentPath: path.resolve("test/vsix-harness"),
    extensionTestsPath: path.resolve("test/vsix-harness/runner.cjs"),
    extensionTestsEnv: { EXPECTED_EXTENSION_VERSION: expectedVersion },
    launchArgs: [
      `--user-data-dir=${userData}`,
      `--extensions-dir=${extensions}`,
      workspace,
    ],
  });
} finally {
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

async function newestVsix() {
  const files = (await readdir(process.cwd())).filter((name) => name.endsWith(".vsix")).sort();
  if (!files.at(-1)) {
    throw new Error("No VSIX found. Run pnpm vsix first.");
  }
  return path.resolve(files.at(-1));
}
