import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hexToHsl } from "./color.ts";
import { PALETTE, PALETTE_COLUMNS, QUICK_PICK_COLOR_COUNT } from "./palette.ts";

describe("PALETTE", () => {
  it("has 18 swatches for two even rows", () => {
    assert.equal(PALETTE.length, 18);
    assert.equal(PALETTE.length % PALETTE_COLUMNS, 0);
    assert.equal(PALETTE_COLUMNS, 9);
  });

  it("shows the first 8 colors in the command bar", () => {
    assert.equal(QUICK_PICK_COLOR_COUNT, 8);
    assert.equal(PALETTE.slice(0, QUICK_PICK_COLOR_COUNT).length, 8);
  });

  it("keeps unique labels and hex colors", () => {
    const labels = new Set(PALETTE.map((item) => item.label));
    const colors = new Set(PALETTE.map((item) => item.color));
    assert.equal(labels.size, PALETTE.length);
    assert.equal(colors.size, PALETTE.length);
  });

  it("orders swatches by hue for a spectrum layout", () => {
    const hues = PALETTE.map((item) => {
      const hsl = hexToHsl(item.color);
      assert.ok(hsl);
      return hsl!.h;
    });
    for (let i = 1; i < hues.length; i++) {
      assert.ok(hues[i]! >= hues[i - 1]!, `${PALETTE[i]!.label} should follow ${PALETTE[i - 1]!.label}`);
    }
  });
});
