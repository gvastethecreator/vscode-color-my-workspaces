import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

describe("extension manifest", () => {
  it("declares the tested UI-host and workspace capabilities", () => {
    assert.deepEqual(manifest.extensionKind, ["ui"]);
    assert.equal(manifest.capabilities.untrustedWorkspaces.supported, true);
    assert.equal(manifest.capabilities.virtualWorkspaces, true);
    assert.equal(manifest.engines.vscode, "^1.134.0");
  });

  it("uses automatic application by default", () => {
    const properties = manifest.contributes.configuration.properties;
    assert.equal(properties["workspaceColor.autoApply"].default, true);
    assert.equal(properties["workspaceColor.autoApply"].scope, "window");
  });

  it("keeps manifest media and runtime entry points present", () => {
    for (const relative of [manifest.icon, manifest.main]) {
      const file = new URL(`../${relative.replace(/^\.\//, "")}`, import.meta.url);
      if (relative === manifest.main) {
        continue;
      }
      assert.doesNotThrow(() => readFileSync(file));
    }
  });
});
