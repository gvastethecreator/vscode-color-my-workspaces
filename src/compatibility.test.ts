import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeChromeCompatibility,
  detectChromeCompatibility,
  resolveActivityBarFlag,
} from "./compatibility.ts";

describe("chrome compatibility", () => {
  it("reports Modern UI limitations structurally", () => {
    const compatibility = detectChromeCompatibility({ modernUi: true });
    assert.equal(compatibility.mode, "modern");
    assert.ok(compatibility.limitations.some((item) => item.includes("transparent")));
  });

  it("reports activityBarTop for top or bottom locations", () => {
    const compatibility = detectChromeCompatibility({
      modernUi: false,
      activityBarLocation: "top",
    });
    assert.equal(compatibility.mode, "classic");
    assert.ok(describeChromeCompatibility(compatibility).includes("activityBarTop"));
  });

  it("does not assume a missing experimental setting is classic", () => {
    assert.equal(detectChromeCompatibility({ modernUi: undefined }).mode, "unknown");
  });
});

describe("resolveActivityBarFlag", () => {
  it("disables an unset top or bottom bar only under Modern UI", () => {
    assert.equal(
      resolveActivityBarFlag({ override: undefined, modernUi: true, activityBarLocation: "top" }),
      false,
    );
    assert.equal(
      resolveActivityBarFlag({ override: undefined, modernUi: true, activityBarLocation: "bottom" }),
      false,
    );
    assert.equal(
      resolveActivityBarFlag({ override: undefined, modernUi: false, activityBarLocation: "top" }),
      true,
    );
  });

  it("enables an unset side bar and always honors an override", () => {
    assert.equal(
      resolveActivityBarFlag({ override: undefined, modernUi: true, activityBarLocation: "default" }),
      true,
    );
    assert.equal(
      resolveActivityBarFlag({ override: undefined, modernUi: true, activityBarLocation: undefined }),
      true,
    );
    assert.equal(
      resolveActivityBarFlag({ override: true, modernUi: true, activityBarLocation: "top" }),
      true,
    );
    assert.equal(
      resolveActivityBarFlag({ override: false, modernUi: false, activityBarLocation: "default" }),
      false,
    );
  });
});
