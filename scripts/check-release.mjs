import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("package.json", "utf8"));
const readme = await readFile("README.md", "utf8");
const changelog = await readFile("CHANGELOG.md", "utf8");
const pdr = await readFile("docs/PDR.md", "utf8");
const security = await readFile("docs/security-review.md", "utf8");
const publishing = await readFile("docs/publishing.md", "utf8");
const vscodeIgnore = await readFile(".vscodeignore", "utf8");
const panelHost = await readFile("src/panel.ts", "utf8");

assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(manifest.main, "./dist/extension.js");
assert.deepEqual(manifest.extensionKind, ["ui"]);
assert.equal(manifest.capabilities?.untrustedWorkspaces?.supported, true);
assert.equal(manifest.capabilities?.virtualWorkspaces, true);
assert.equal(manifest.dependencies, undefined);
assert.equal(manifest.contributes?.configuration?.properties?.["workspaceColor.autoApply"]?.default, true);
assert.ok(changelog.includes(`## [${manifest.version}] - `));
assert.ok(pdr.includes(`${manifest.version} release candidate`));
assert.ok(security.includes(`Release candidate: ${manifest.version}`));
assert.ok(publishing.includes("Rollback"));
assert.ok(vscodeIgnore.includes("src/**"));
assert.ok(!panelHost.includes("retainContextWhenHidden"));
assert.ok(readme.includes("(docs/PDR.md)"), "README must link to the product contract");

for (const command of manifest.contributes.commands) {
  assert.ok(pdr.includes(`\`${command.command}\``), `PDR is missing ${command.command}`);
}
for (const setting of Object.keys(manifest.contributes.configuration.properties)) {
  assert.ok(pdr.includes(`\`${setting}\``), `PDR is missing ${setting}`);
}
for (const file of [
  manifest.icon,
  "media/preview.png",
  "LICENSE",
  "SECURITY.md",
  "CONTEXT.md",
  "docs/PDR.md",
  "docs/compatibility.md",
  "docs/performance.md",
  "docs/security-review.md",
]) {
  await access(file);
}

if (process.argv.includes("--release")) {
  const escapedVersion = manifest.version.replaceAll(".", "\\.");
  assert.match(
    changelog,
    new RegExp(`^## \\[${escapedVersion}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m"),
    "Release mode requires a dated changelog entry",
  );
}

console.log(
  `Verified release metadata for ${manifest.publisher}.${manifest.name} ${manifest.version}: ${manifest.contributes.commands.length} commands, ${Object.keys(manifest.contributes.configuration.properties).length} settings.`,
);
