import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ColorFavorites } from "./favorites.ts";

test("favorites serialize windows, reject stale edits and enforce capacity", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "color-favorites-"));
  try {
    const first = new ColorFavorites(directory);
    const second = new ColorFavorites(directory);
    await first.save("First", "#123456");
    const original = (await second.read())[0]!;
    await first.update(original, "Renamed");
    await assert.rejects(second.update(original), /changed in another window/);
    assert.equal((await first.read())[0]!.name, "Renamed");
    const races = await Promise.allSettled([first.save("One", "#111111"), second.save("Two", "#222222")]);
    assert.ok(races.some((result) => result.status === "fulfilled"));
    const saved = await first.read();
    assert.equal(saved.length, 1 + races.filter((result) => result.status === "fulfilled").length);
    for (let count = saved.length; count < 24; count++) await first.save(`Color ${count}`, "#123456");
    await assert.rejects(second.save("Overflow", "#ffffff"), /up to 24/);
    assert.equal((await first.read()).length, 24);
    await second.update((await second.read())[0]!);
    assert.equal((await first.read()).length, 23);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
