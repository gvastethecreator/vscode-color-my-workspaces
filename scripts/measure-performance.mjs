import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { ALL_CHROME_ELEMENTS, buildChromeColors } from "../src/chrome.ts";
import { colorFromIdentity } from "../src/color.ts";
import {
  createOwnershipState,
  planManagedColorApply,
} from "../src/ownership.ts";
import { SerializedWriteQueue } from "../src/writeQueue.ts";

const iterations = 10_000;
const colorStart = performance.now();
let desired = {};
for (let index = 0; index < iterations; index++) {
  desired = buildChromeColors(
    colorFromIdentity(`v2:folders:fixture-${index % 257}`),
    ALL_CHROME_ELEMENTS,
    { stepped: true },
  );
}
const colorMilliseconds = performance.now() - colorStart;

const initial = planManagedColorApply({
  current: undefined,
  desired,
  state: createOwnershipState("performance-fixture"),
  capturedAt: "2026-09-02T00:00:00.000Z",
});
const planStart = performance.now();
let lastPlan = initial;
for (let index = 0; index < iterations; index++) {
  lastPlan = planManagedColorApply({
    current: initial.value,
    desired,
    state: initial.state,
    capturedAt: "2026-09-02T00:00:00.000Z",
  });
}
const planMilliseconds = performance.now() - planStart;
assert.equal(lastPlan.changed, false);

const queue = new SerializedWriteQueue();
let release;
const gate = new Promise((resolve) => {
  release = resolve;
});
const first = queue.enqueue(() => gate);
const queueStart = performance.now();
const refreshes = Array.from({ length: 1_000 }, (_, index) =>
  queue.enqueue(() => index, { coalesceKey: "refresh" }),
);
release();
await first;
await Promise.all(refreshes);
const queueMilliseconds = performance.now() - queueStart;

const extensionBytes = (await stat("dist/extension.js")).size;
const panelBytes = (await stat("dist/panel.js")).size;
const panelCssBytes = (await stat("dist/panel.css")).size;

assert.ok(colorMilliseconds < 2_000, `color generation exceeded budget: ${colorMilliseconds}ms`);
assert.ok(planMilliseconds < 2_000, `ownership planning exceeded budget: ${planMilliseconds}ms`);
assert.ok(queueMilliseconds < 1_000, `refresh coalescing exceeded budget: ${queueMilliseconds}ms`);
assert.ok(extensionBytes < 250_000, `extension bundle is too large: ${extensionBytes}`);
assert.ok(panelBytes < 250_000, `panel bundle is too large: ${panelBytes}`);
assert.ok(panelCssBytes < 100_000, `panel CSS is too large: ${panelCssBytes}`);

console.log(
  JSON.stringify(
    {
      iterations,
      colorMilliseconds: round(colorMilliseconds),
      ownershipPlanMilliseconds: round(planMilliseconds),
      coalescedRefreshMilliseconds: round(queueMilliseconds),
      extensionBytes,
      panelBytes,
      panelCssBytes,
    },
    null,
    2,
  ),
);

function round(value) {
  return Math.round(value * 100) / 100;
}
