import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("release consumers reject changed bytes and source before any publishing command", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "release-artifact-"));
  const source = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
  const gitDirectory = spawnSync("git", ["rev-parse", "--absolute-git-dir"], { encoding: "utf8" }).stdout.trim();
  const script = path.resolve("scripts/release-artifact.mjs");
  try {
    await writeFile(path.join(directory, "package.json"), JSON.stringify({ name: "fixture", publisher: "fixture", displayName: "Fixture", version: "0.1.0" }));
    await writeFile(path.join(directory, "fixture.vsix"), "verified bytes");
    const environment = { ...process.env, GIT_DIR: gitDirectory, GITHUB_REPOSITORY: "fixture/fixture", GITHUB_SHA: source, GITHUB_OUTPUT: path.join(directory, "output") };
    const run = (action: string, override: Record<string, string> = {}) => spawnSync(process.execPath, [script, action], { cwd: directory, env: { ...environment, ...override }, encoding: "utf8", timeout: 15_000 });
    const recorded = run("record");
    assert.equal(recorded.status, 0, recorded.stderr);
    const metadata = JSON.parse(await readFile(path.join(directory, "release-artifact.json"), "utf8"));
    const expected = { RELEASE_SOURCE: source, RELEASE_SHA256: metadata.sha256, RELEASE_VSIX: "fixture.vsix" };
    assert.equal(run("verify", expected).status, 0);
    assert.notEqual(run("verify", { ...expected, RELEASE_SOURCE: "0".repeat(40) }).status, 0);
    await writeFile(path.join(directory, "fixture.vsix"), "modified bytes");
    assert.notEqual(run("publish-github", expected).status, 0);
    await writeFile(path.join(directory, "fixture.vsix"), "verified bytes");
    await writeFile(path.join(directory, "other.vsix"), "extra package");
    assert.notEqual(run("record").status, 0, "More than one VSIX was accepted.");
  } finally { await rm(directory, { force: true, recursive: true }); }
});
