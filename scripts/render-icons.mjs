import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const media = path.join(root, "media");
const iconSourcePath = path.join(media, "source", "color-my-workspaces-approved.png");
const marketplaceIconPath = path.join(media, "icon.png");
const hiresIconPath = path.join(media, "icon-512.png");
const socialOutPath = path.join(media, "social-preview.png");

async function roundCorners(input, radius) {
  // Fresh sharp pipelines only — reusing one after metadata() can corrupt bounds.
  const { width, height } = await sharp(input).metadata();
  if (!width || !height) {
    throw new Error("Could not read image dimensions for rounded corners");
  }
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#fff"/>
    </svg>`,
  );
  return sharp(input)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function renderSquareIcons() {
  const base = sharp(iconSourcePath).ensureAlpha();

  await base.clone().resize(512, 512, { fit: "fill" }).composite([{ input: cornerCutout(512), blend: "dest-out" }]).png().toFile(hiresIconPath);
  await base.clone().resize(256, 256, { fit: "fill" }).composite([{ input: cornerCutout(256), blend: "dest-out" }]).png().toFile(marketplaceIconPath);

  const meta256 = await sharp(marketplaceIconPath).metadata();
  const meta512 = await sharp(hiresIconPath).metadata();
  console.log(`icon.png ${meta256.width}x${meta256.height}`);
  console.log(`icon-512.png ${meta512.width}x${meta512.height}`);
}

function cornerCutout(size) {
  return Buffer.from(`<svg width="${size}" height="${size}"><rect width="1" height="1" fill="white"/><rect x="${size - 1}" width="1" height="1" fill="white"/><rect y="${size - 1}" width="1" height="1" fill="white"/><rect x="${size - 1}" y="${size - 1}" width="1" height="1" fill="white"/></svg>`);
}

async function composeSocialPreview() {
  await mkdir(media, { recursive: true });

  const width = 1280;
  const height = 420;
  const padY = 36;
  const iconSize = height - padY * 2;
  const iconLeft = 72;
  const iconTop = padY;
  const textLeft = iconLeft + iconSize + 56;
  const titleY = Math.round(height / 2) - 8;
  const taglineY = titleY + 48;

  const iconBuffer = await sharp(hiresIconPath)
    .resize(iconSize, iconSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const textOverlay = Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="${textLeft}" y="${titleY}" fill="#f4f4f5" font-family="Segoe UI, system-ui, sans-serif" font-size="50" font-weight="650">Color My Workspaces</text>
  <text x="${textLeft}" y="${taglineY}" fill="#a1a1aa" font-family="Segoe UI, system-ui, sans-serif" font-size="26">Customize your projects with different colors</text>
</svg>`);

  const flat = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#0a0a0a",
    },
  })
    .composite([
      { input: iconBuffer, left: iconLeft, top: iconTop },
      { input: textOverlay, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();

  await sharp(await roundCorners(flat, 24)).png().toFile(socialOutPath);
  console.log(`social-preview.png ${width}x${height} (rx=24)`);
}

await renderSquareIcons();
await composeSocialPreview();
