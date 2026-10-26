import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALL_CHROME_ELEMENTS,
  buildChromeColors,
  elementBackground,
  flagsToElements,
  MANAGED_CHROME_KEYS,
} from "./chrome.ts";
import { colorFromIdentity, contrastRatio, parseHex } from "./color.ts";

describe("buildChromeColors", () => {
  it("paints only the requested chrome", () => {
    const colors = buildChromeColors("#1f4b6e", ["titleBar"]);
    assert.equal(colors["titleBar.activeBackground"], "#1f4b6e");
    assert.equal(colors["statusBar.background"], undefined);
    assert.equal(colors["activityBar.background"], undefined);
    assert.equal(colors["activityBarTop.background"], undefined);
    assert.equal(colors["commandCenter.background"], undefined);
  });

  it("covers every managed key when all elements are on", () => {
    const colors = buildChromeColors("#1f4b6e", ALL_CHROME_ELEMENTS, { stepped: true });
    for (const key of MANAGED_CHROME_KEYS) {
      assert.equal(typeof colors[key], "string", key);
    }
    assert.deepEqual(Object.keys(colors).sort(), [...MANAGED_CHROME_KEYS].sort());
  });

  it("sets a contrasting title foreground", () => {
    const dark = buildChromeColors("#1f4b6e", ["titleBar"]);
    const light = buildChromeColors("#e8e4d9", ["titleBar"]);
    assert.equal(dark["titleBar.activeForeground"], "#f4f4f4");
    assert.equal(light["titleBar.activeForeground"], "#161616");
  });

  it("uses the same base on every bar when stepped is off", () => {
    const colors = buildChromeColors("#1f4b6e", ALL_CHROME_ELEMENTS, { stepped: false });
    assert.equal(colors["titleBar.activeBackground"], "#1f4b6e");
    assert.equal(colors["activityBar.background"], "#1f4b6e");
    assert.equal(colors["statusBar.background"], "#1f4b6e");
    assert.equal(colors["commandCenter.background"], "#1f4b6e");
  });

  it("uses different tones when stepped is on", () => {
    const colors = buildChromeColors("#1f4b6e", ALL_CHROME_ELEMENTS, { stepped: true });
    assert.notEqual(colors["titleBar.activeBackground"], colors["statusBar.background"]);
    assert.notEqual(colors["titleBar.activeBackground"], "#1f4b6e");
    assert.equal(colors["activityBar.background"], "#1f4b6e");
  });

  it("sets borders so bars read as separate", () => {
    const colors = buildChromeColors("#1f4b6e", ALL_CHROME_ELEMENTS);
    assert.equal(typeof colors["titleBar.border"], "string");
    assert.equal(typeof colors["statusBar.border"], "string");
    assert.equal(typeof colors["activityBar.border"], "string");
    assert.equal(typeof colors["commandCenter.inactiveBackground"], "string");
  });

  it("omits shell bar borders in Modern UI", () => {
    const colors = buildChromeColors("#1f4b6e", ALL_CHROME_ELEMENTS, { modernUi: true });
    assert.equal(colors["titleBar.border"], undefined);
    assert.equal(colors["activityBar.border"], undefined);
    assert.equal(colors["statusBar.border"], undefined);
    assert.equal(typeof colors["titleBar.activeBackground"], "string");
    assert.equal(typeof colors["commandCenter.border"], "string");
    assert.equal(MANAGED_CHROME_KEYS.includes("titleBar.border"), true);
    assert.equal(MANAGED_CHROME_KEYS.includes("activityBar.border"), true);
    assert.equal(MANAGED_CHROME_KEYS.includes("statusBar.border"), true);
  });

  it("keeps generated text pairs at 4.5:1 or better", () => {
    const pairs = [
      ["titleBar.activeBackground", "titleBar.activeForeground"],
      ["titleBar.inactiveBackground", "titleBar.inactiveForeground"],
      ["activityBar.background", "activityBar.foreground"],
      ["activityBarBadge.background", "activityBarBadge.foreground"],
      ["statusBar.background", "statusBar.foreground"],
      ["statusBarItem.hoverBackground", "statusBar.foreground"],
      ["statusBarItem.activeBackground", "statusBar.foreground"],
      ["statusBar.debuggingBackground", "statusBar.debuggingForeground"],
      ["statusBarItem.remoteBackground", "statusBarItem.remoteForeground"],
      ["commandCenter.background", "commandCenter.foreground"],
      ["commandCenter.activeBackground", "commandCenter.activeForeground"],
      ["commandCenter.inactiveBackground", "commandCenter.inactiveForeground"],
    ] as const;

    for (let index = 0; index < 2_048; index++) {
      const colors = buildChromeColors(
        colorFromIdentity(`v2:folders:contrast-${index}`),
        ALL_CHROME_ELEMENTS,
        { stepped: true },
      );
      for (const [background, foreground] of pairs) {
        assert.ok(
          contrastRatio(colors[background], colors[foreground]) >= 4.5,
          `${background} / ${foreground} failed for sample ${index}`,
        );
      }
    }
  });

  it("keeps inactive activity icons at 3:1 or better", () => {
    for (let index = 0; index < 2_048; index++) {
      const colors = buildChromeColors(
        colorFromIdentity(`v2:folders:icon-contrast-${index}`),
        ["activityBar"],
        { stepped: true },
      );
      const background = parseHex(colors["activityBar.background"]);
      const foreground = parseHex(colors["activityBar.inactiveForeground"]);
      const alpha = Number.parseInt(colors["activityBar.inactiveForeground"].slice(7, 9), 16) / 255;
      assert.ok(background && foreground);
      const composited = {
        r: foreground.r * alpha + background.r * (1 - alpha),
        g: foreground.g * alpha + background.g * (1 - alpha),
        b: foreground.b * alpha + background.b * (1 - alpha),
      };
      assert.ok(
        contrastRatio(background, composited) >= 3,
        `activityBar.inactiveForeground failed for sample ${index}`,
      );
    }
  });
});

describe("flagsToElements", () => {
  it("keeps only the bars that are on", () => {
    assert.deepEqual(
      flagsToElements({
        titleBar: true,
        activityBar: false,
        statusBar: true,
        commandCenter: false,
      }),
      ["titleBar", "statusBar"],
    );
  });
});

describe("elementBackground", () => {
  it("returns the base color when stepped is off", () => {
    assert.equal(elementBackground("#336699", "titleBar", false), "#336699");
    assert.equal(elementBackground("#336699", "statusBar", false), "#336699");
  });

  it("darkens the title and lightens the status when stepped is on", () => {
    const title = elementBackground("#336699", "titleBar", true);
    const status = elementBackground("#336699", "statusBar", true);
    assert.notEqual(title, "#336699");
    assert.notEqual(status, "#336699");
    assert.notEqual(title, status);
  });
});
