import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_STATUS_ICON, parseCodiconId, STATUS_ICONS } from "./icons.ts";
import { STATUS_ICON_SVG } from "./statusIconSvg.ts";

describe("parseCodiconId", () => {
  it("accepts a codicon id", () => {
    assert.equal(parseCodiconId("folder"), "folder");
    assert.equal(parseCodiconId("$(rocket)"), "rocket");
  });

  it("rejects garbage", () => {
    assert.equal(parseCodiconId(""), undefined);
    assert.equal(parseCodiconId("folder filled"), undefined);
    assert.equal(parseCodiconId("$(not an icon)"), undefined);
  });
});

describe("STATUS_ICONS", () => {
  it("includes the default icon and unique ids", () => {
    assert.equal(STATUS_ICONS.includes(DEFAULT_STATUS_ICON), true);
    assert.equal(new Set(STATUS_ICONS).size, STATUS_ICONS.length);
  });

  it("has an svg for every picker id", () => {
    for (const id of STATUS_ICONS) {
      assert.equal(typeof STATUS_ICON_SVG[id], "string", id);
      assert.equal(STATUS_ICON_SVG[id]!.includes("<svg"), true, id);
      assert.equal(
        STATUS_ICON_SVG[id]!.includes('xmlns="http://www.w3.org/2000/svg"'),
        true,
        id,
      );
    }
  });
});
