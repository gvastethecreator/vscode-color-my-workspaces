import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePanelMessage, SUPPORT_URL } from "./panelMessages.ts";

describe("parsePanelMessage", () => {
  it("normalizes an exact color payload", () => {
    assert.deepEqual(parsePanelMessage({ type: "setColor", color: "#ABC" }), {
      type: "setColor",
      color: "#aabbcc",
    });
  });

  it("rejects unknown fields, types, and oversized strings", () => {
    assert.deepEqual(parsePanelMessage({ type: "setDefaults" }), { type: "setDefaults" });
    assert.equal(parsePanelMessage({ type: "ready", admin: true }), undefined);
    assert.equal(parsePanelMessage({ type: "setStepped", enabled: "true" }), undefined);
    assert.equal(parsePanelMessage({ type: "setLabel", label: "x".repeat(81) }), undefined);
    assert.equal(parsePanelMessage({ type: "setColor", color: "red" }), undefined);
  });

  it("allowlists chrome elements, icons, click targets, and the support URL", () => {
    assert.deepEqual(parsePanelMessage({ type: "setFlag", element: "statusBar", enabled: true }), {
      type: "setFlag",
      element: "statusBar",
      enabled: true,
    });
    assert.equal(parsePanelMessage({ type: "setFlag", element: "editor", enabled: true }), undefined);
    assert.equal(parsePanelMessage({ type: "setIcon", icon: "not-a-real-icon" }), undefined);
    assert.equal(parsePanelMessage({ type: "setStatusBarClick", target: "other" }), undefined);
    assert.deepEqual(parsePanelMessage({ type: "openUrl", url: SUPPORT_URL }), {
      type: "openUrl",
      url: SUPPORT_URL,
    });
    assert.equal(parsePanelMessage({ type: "openUrl", url: "https://example.com" }), undefined);
  });

  it("rejects arrays and prototype-bearing class instances", () => {
    class Hostile {
      type = "ready";
    }
    assert.equal(parsePanelMessage([]), undefined);
    assert.equal(parsePanelMessage(new Hostile()), undefined);
  });
});
