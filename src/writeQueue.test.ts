import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SerializedWriteQueue } from "./writeQueue.ts";

describe("SerializedWriteQueue", () => {
  it("runs writes serially with increasing generations", async () => {
    const queue = new SerializedWriteQueue();
    const seen: number[] = [];
    const first = queue.enqueue(async (generation) => {
      seen.push(generation);
      await Promise.resolve();
      return "first";
    });
    const second = queue.enqueue((generation) => {
      seen.push(generation);
      return "second";
    });
    assert.deepEqual(await Promise.all([first, second]), ["first", "second"]);
    assert.deepEqual(seen, [1, 2]);
  });

  it("coalesces queued refreshes to the latest operation", async () => {
    const queue = new SerializedWriteQueue();
    const seen: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = queue.enqueue(async () => {
      seen.push("first");
      await gate;
      return "first";
    });
    const second = queue.enqueue(
      () => {
        seen.push("second");
        return "second";
      },
      { coalesceKey: "paint" },
    );
    const third = queue.enqueue(
      () => {
        seen.push("third");
        return "third";
      },
      { coalesceKey: "paint" },
    );
    release();
    assert.equal(await first, "first");
    assert.equal(await second, "third");
    assert.equal(await third, "third");
    await queue.idle();
    assert.deepEqual(seen, ["first", "third"]);
  });
});
