import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildChromeColors } from "./chrome.ts";
import {
  MANAGED_CHROME_KEYS,
  MANAGED_COLOR_GROUPS,
  MANAGED_COLOR_REGISTRY_VERSION,
  managedGroupForKey,
  managedKeysForElements,
} from "./managedKeys.ts";

describe("managed color registry", () => {
  it("is versioned, grouped, and free of duplicate keys", () => {
    assert.equal(MANAGED_COLOR_REGISTRY_VERSION, 1);
    assert.equal(MANAGED_COLOR_GROUPS.length, 4);
    assert.equal(new Set(MANAGED_CHROME_KEYS).size, MANAGED_CHROME_KEYS.length);
  });

  it("covers every key generated for all chrome surfaces", () => {
    const generated = buildChromeColors(
      "#336699",
      ["titleBar", "activityBar", "statusBar", "commandCenter"],
      { stepped: true },
    );
    assert.deepEqual(Object.keys(generated).sort(), [...MANAGED_CHROME_KEYS].sort());
  });

  it("returns only keys for selected groups", () => {
    const keys = managedKeysForElements(["statusBar"]);
    assert.ok(keys.includes("statusBar.background"));
    assert.equal(keys.includes("titleBar.activeBackground"), false);
    assert.equal(managedGroupForKey("statusBar.background"), "statusBar");
    assert.equal(managedGroupForKey("editor.background"), undefined);
  });
});
