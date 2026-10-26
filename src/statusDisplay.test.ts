import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStatusPresentation,
  formatStatusBarItem,
  formatStatusBarText,
  STATUS_CHIP_TEXT,
  STATUS_CLICK_HINT,
  STATUS_ITEM_ID,
  STATUS_ITEM_PRIORITY,
  statusBarTooltip,
  statusChipColor,
} from "./statusDisplay.ts";

describe("formatStatusBarText", () => {
  it("returns the truncated name without an icon", () => {
    assert.equal(formatStatusBarText("shop"), "shop");
  });

  it("clips long names", () => {
    const text = formatStatusBarText("abcdefghijklmnopqrstuvwxyz0123");
    assert.equal(text.endsWith("…"), true);
    assert.equal(text.includes("$("), false);
  });
});

describe("formatStatusBarItem", () => {
  it("joins a codicon and the name", () => {
    assert.equal(formatStatusBarItem({ icon: "rocket", name: "shop" }), "$(rocket) shop");
    assert.equal(formatStatusBarItem({ icon: "folder" }), "$(folder)");
    assert.equal(formatStatusBarItem({ name: "shop" }), "shop");
  });
});

describe("statusBarTooltip", () => {
  it("includes the name, hex, and click hint", () => {
    assert.equal(
      statusBarTooltip({ name: "shop", color: "#3d4c5c" }),
      `shop · #3d4c5c · ${STATUS_CLICK_HINT}`,
    );
  });

  it("keeps the click hint when there is no color", () => {
    assert.equal(statusBarTooltip({ name: "shop" }), `shop · ${STATUS_CLICK_HINT}`);
  });
});

describe("statusChipColor", () => {
  it("uses the workspace color when the status bar is not the same", () => {
    assert.equal(statusChipColor("#1f4b6e", "#546170"), "#1f4b6e");
    assert.equal(statusChipColor("#1f4b6e"), "#1f4b6e");
  });

  it("moves the chip away from the bar color when it would vanish", () => {
    const chip = statusChipColor("#1f4b6e", "#1f4b6e");
    assert.notEqual(chip, "#1f4b6e");
    assert.equal(chip.startsWith("#"), true);
    assert.notEqual(statusChipColor("#000000", "#000000"), "#000000");
  });
});

describe("STATUS_CHIP_TEXT", () => {
  it("is a filled circle", () => {
    assert.equal(STATUS_CHIP_TEXT, "$(circle-filled)");
  });
});

describe("unified status presentation", () => {
  it("uses one stable maximum-priority item contract", () => {
    assert.equal(STATUS_ITEM_ID, "workspaceColor.status");
    assert.equal(STATUS_ITEM_PRIORITY, Number.MAX_VALUE);
  });

  it("keeps a textual or icon identity when custom label and icon are hidden", () => {
    const presentation = buildStatusPresentation({
      hasWorkspace: true,
      name: "shop",
      color: "#336699",
      showName: false,
      showIcon: false,
      clickTarget: "quick",
    });
    assert.equal(presentation.text, "$(symbol-color)");
    assert.equal(presentation.accessibilityLabel, "Change workspace color for shop");
    assert.equal(presentation.command, "workspaceColor.quickActions");
  });

  it("hides the item in an empty window and routes full-panel clicks", () => {
    const presentation = buildStatusPresentation({
      hasWorkspace: false,
      name: "Workspace",
      showName: true,
      showIcon: false,
      clickTarget: "full",
    });
    assert.equal(presentation.visible, false);
    assert.equal(presentation.command, "workspaceColor.openPanel");
  });
});
