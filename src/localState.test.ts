import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createWorkspaceLocalState,
  migrateLegacyWorkspaceState,
  parseWorkspaceLocalState,
  rebindWorkspaceLocalState,
} from "./localState.ts";

describe("workspace local-state migrations", () => {
  it("creates an unmanaged first-run state", () => {
    const state = createWorkspaceLocalState("v2:folders:file:///work/shop", "work/shop");
    assert.equal(state.disabled, false);
    assert.equal(state.onboardingCompleted, false);
    assert.equal(state.legacyAutoApply, false);
    assert.equal(state.ownership.managed, false);
  });

  it("recognizes only exact 0.0.x generated values as legacy ownership", () => {
    const state = migrateLegacyWorkspaceState({
      workspaceIdentity: "v2:folders:file:///work/shop",
      legacyIdentity: "work/shop",
      disabled: false,
      current: {
        "titleBar.activeBackground": "#112233",
        "statusBar.background": "#external",
      },
      expectedLegacyColors: {
        "titleBar.activeBackground": "#112233",
        "statusBar.background": "#445566",
      },
      capturedAt: "2026-09-02T00:00:00.000Z",
      legacyColor: "#112233",
    });
    assert.equal(state.ownership.managed, true);
    assert.deepEqual(Object.keys(state.ownership.records), ["titleBar.activeBackground"]);
    assert.equal(state.legacyAutoApply, true);
    assert.equal(state.migratedColor, "#112233");
  });

  it("migrates a stored legacy identity without changing ownership", () => {
    const legacy = createWorkspaceLocalState("work/shop");
    const migrated = parseWorkspaceLocalState(
      legacy,
      "v2:folders:file:///work/shop",
      "work/shop",
    );
    assert.ok(migrated);
    assert.equal(migrated.workspaceIdentity, "v2:folders:file:///work/shop");
    assert.equal(migrated.legacyIdentity, "work/shop");
    assert.equal(migrated.ownership.workspaceIdentity, "v2:folders:file:///work/shop");
  });

  it("rejects local state from a different logical workspace", () => {
    const state = createWorkspaceLocalState("v2:folders:file:///work/one");
    assert.equal(
      parseWorkspaceLocalState(state, "v2:folders:file:///work/two", "work/two"),
      undefined,
    );
  });

  it("rebinds valid local ownership when the identity override changes", () => {
    const state = createWorkspaceLocalState("workspace-a");
    state.ownership.managed = true;
    const rebound = rebindWorkspaceLocalState(state, "workspace-b");
    assert.equal(rebound?.workspaceIdentity, "workspace-b");
    assert.equal(rebound?.ownership.workspaceIdentity, "workspace-b");
    assert.equal(rebound?.ownership.managed, true);
  });
});
