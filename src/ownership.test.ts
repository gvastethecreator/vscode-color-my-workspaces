import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createOwnershipState,
  keepExternalConflictValues,
  parseOwnershipState,
  planManagedColorApply,
  planManagedColorClear,
} from "./ownership.ts";

const capturedAt = "2026-09-02T00:00:00.000Z";

describe("managed color ownership", () => {
  it("captures and restores a pre-existing managed value", () => {
    const applied = planManagedColorApply({
      current: {
        "titleBar.activeBackground": "#aa0000",
        "editor.background": "#111111",
      },
      desired: { "titleBar.activeBackground": "#003366" },
      state: createOwnershipState("v2:folders:file:///work/shop"),
      capturedAt,
    });
    assert.equal(applied.state.records["titleBar.activeBackground"]?.baseline, "#aa0000");
    assert.equal(applied.value?.["editor.background"], "#111111");

    const cleared = planManagedColorClear({ current: applied.value, state: applied.state });
    assert.deepEqual(cleared.value, {
      "titleBar.activeBackground": "#aa0000",
      "editor.background": "#111111",
    });
    assert.equal(cleared.state.managed, false);
  });

  it("restores an absent baseline by removing only the owned key", () => {
    const applied = planManagedColorApply({
      current: { "editor.background": "#111111" },
      desired: { "statusBar.background": "#003366" },
      state: createOwnershipState("workspace"),
      capturedAt,
    });
    const cleared = planManagedColorClear({ current: applied.value, state: applied.state });
    assert.deepEqual(cleared.value, { "editor.background": "#111111" });
  });

  it("preserves an external managed-key change instead of overwriting it", () => {
    const applied = planManagedColorApply({
      current: undefined,
      desired: { "statusBar.background": "#003366" },
      state: createOwnershipState("workspace"),
      capturedAt,
    });
    const conflicted = planManagedColorApply({
      current: { "statusBar.background": "#ff00ff" },
      desired: { "statusBar.background": "#224466" },
      state: applied.state,
      capturedAt,
    });
    assert.equal(conflicted.value?.["statusBar.background"], "#ff00ff");
    assert.equal(conflicted.conflicts.length, 1);
    assert.equal(conflicted.conflicts[0]?.operation, "apply");
  });

  it("uses the external value as the new baseline after an explicit reapply", () => {
    const applied = planManagedColorApply({
      current: undefined,
      desired: { "statusBar.background": "#003366" },
      state: createOwnershipState("workspace"),
      capturedAt,
    });
    const reapplied = planManagedColorApply({
      current: { "statusBar.background": "#ff00ff" },
      desired: { "statusBar.background": "#224466" },
      state: applied.state,
      capturedAt: "2026-09-02T00:05:00.000Z",
      forceConflicts: true,
    });
    assert.equal(
      reapplied.state.records["statusBar.background"]?.capturedAt,
      "2026-09-02T00:05:00.000Z",
    );
    const cleared = planManagedColorClear({ current: reapplied.value, state: reapplied.state });
    assert.equal(cleared.value?.["statusBar.background"], "#ff00ff");
  });

  it("blocks a kept external value from later automatic writes", () => {
    const applied = planManagedColorApply({
      current: undefined,
      desired: { "statusBar.background": "#003366" },
      state: createOwnershipState("workspace"),
      capturedAt,
    });
    const conflicted = planManagedColorApply({
      current: { "statusBar.background": "#ff00ff" },
      desired: { "statusBar.background": "#224466" },
      state: applied.state,
      capturedAt,
    });
    const kept = keepExternalConflictValues(conflicted.state, conflicted.conflicts);
    const next = planManagedColorApply({
      current: { "statusBar.background": "#ff00ff" },
      desired: { "statusBar.background": "#335577" },
      state: kept,
      capturedAt,
    });
    assert.equal(next.value?.["statusBar.background"], "#ff00ff");
    assert.deepEqual(next.state.blockedKeys, ["statusBar.background"]);
  });

  it("keeps a matching refresh as a no-op", () => {
    const applied = planManagedColorApply({
      current: undefined,
      desired: { "statusBar.background": "#003366" },
      state: createOwnershipState("workspace"),
      capturedAt,
    });
    const refreshed = planManagedColorApply({
      current: applied.value,
      desired: { "statusBar.background": "#003366" },
      state: applied.state,
      capturedAt: "2026-09-02T00:01:00.000Z",
    });
    assert.equal(refreshed.changed, false);
    assert.equal(refreshed.state.generation, applied.state.generation);
    assert.deepEqual(refreshed.state, applied.state);
  });

  it("keeps the exact configuration snapshot used to build the plan", () => {
    const current = {
      "editor.background": "#101010",
      "titleBar.activeBackground": "#aa0000",
      "[Night Theme]": { "editor.foreground": "#eeeeee" },
    };
    const plan = planManagedColorApply({
      current,
      desired: { "titleBar.activeBackground": "#003366" },
      state: createOwnershipState("workspace"),
      capturedAt,
    });
    current["titleBar.activeBackground"] = "#ff00ff";
    current["[Night Theme]"]["editor.foreground"] = "#ff00ff";
    assert.equal(plan.basis?.["titleBar.activeBackground"], "#aa0000");
    assert.deepEqual(plan.basis?.["[Night Theme]"], { "editor.foreground": "#eeeeee" });
  });

  it("rejects state from a different workspace identity", () => {
    const state = createOwnershipState("workspace-a");
    assert.deepEqual(parseOwnershipState(state, "workspace-a"), state);
    assert.equal(parseOwnershipState(state, "workspace-b"), undefined);
  });
});
