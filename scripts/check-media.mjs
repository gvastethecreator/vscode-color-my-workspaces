import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const deterministicOutputs = [
  ["media/icon.png", 256, 256],
  ["media/icon-512.png", 512, 512],
  ["media/social-preview.png", 1280, 420],
];
const previews = [
  ["media/preview.png", "Workspace preview"],
  ["media/preview-settings.png", "Settings preview"],
];

const before = new Map();
for (const [file, width, height] of deterministicOutputs) {
  const bytes = await readFile(file);
  before.set(file, digest(bytes));
  const metadata = await sharp(bytes).metadata();
  if ((width && metadata.width !== width) || (height && metadata.height !== height)) {
    throw new Error(`${file} has ${metadata.width}x${metadata.height}; expected ${width}x${height}`);
  }
  if (metadata.hasAlpha !== true) {
    throw new Error(`${file} must preserve alpha transparency`);
  }
}

const rendered = spawnSync(process.execPath, ["scripts/render-icons.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "pipe",
});
if (rendered.status !== 0) {
  process.stderr.write(rendered.stderr);
  throw new Error("Media rendering failed");
}

for (const [file] of deterministicOutputs) {
  const after = digest(await readFile(file));
  if (after !== before.get(file)) {
    throw new Error(`${file} is stale or its rendering is not deterministic`);
  }
}

for (const [file, label] of previews) {
  await verifyAlphaPng(file, 1200, 800, label);
}

console.log(`Verified ${deterministicOutputs.length} deterministic media files and ${previews.length} installed-extension previews.`);

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function verifyAlphaPng(filename, width, height, label) {
  const image = sharp(filename);
  const metadata = await image.metadata();
  assert.equal(metadata.format, "png", `${label} must be PNG.`);
  assert.equal(metadata.width, width, `${label} width changed.`);
  assert.equal(metadata.height, height, `${label} height changed.`);
  assert.equal(metadata.channels, 4, `${label} must carry native alpha.`);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = info.channels - 1;
  const corners = [
    alpha,
    (info.width - 1) * info.channels + alpha,
    (info.height - 1) * info.width * info.channels + alpha,
    (info.width * info.height - 1) * info.channels + alpha,
  ];
  assert.ok(corners.every((offset) => data[offset] === 0), `${label} corners must be transparent.`);
}
