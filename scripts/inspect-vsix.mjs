import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

const archivePath = process.argv[2] ? path.resolve(process.argv[2]) : await newestVsix();
const archive = await readFile(archivePath);
const sourceManifest = JSON.parse(await readFile("package.json", "utf8"));
const entries = readCentralDirectory(archive);
const normalizedNames = new Set(entries.map((entry) => entry.name.toLowerCase()));

const required = [
  "extension/package.json",
  "extension/dist/extension.js",
  "extension/dist/panel.js",
  "extension/dist/panel.css",
  "extension/media/icon.png",
  "extension/media/preview.png",
  "extension/media/preview-settings.png",
  "extension/readme.md",
  "extension/changelog.md",
  "extension/license.txt",
  "extension/context.md",
];
for (const file of required) {
  if (!normalizedNames.has(file)) {
    throw new Error(`VSIX is missing ${file}`);
  }
}

const forbidden = entries
  .map((entry) => entry.name)
  .filter((name) =>
    /(^|\/)(src|scripts|test|docs|node_modules|\.github|\.scratch|\.vscode-test)(\/|$)|\/media\/source\/|\.code-workspace$|\.(ts|map)$/.test(
      name,
    ),
  );
if (forbidden.length > 0) {
  throw new Error(`VSIX contains repository-only files: ${forbidden.join(", ")}`);
}

const packageEntry = entries.find((entry) => entry.name === "extension/package.json");
const manifest = JSON.parse(extractEntry(archive, packageEntry).toString("utf8"));
if (manifest.version !== sourceManifest.version || manifest.main !== sourceManifest.main) {
  throw new Error(`Unexpected packaged manifest version or main entry: ${manifest.version}`);
}
if (archive.length > 5 * 1024 * 1024) {
  throw new Error(`VSIX is unexpectedly large: ${archive.length} bytes`);
}

for (const name of ["extension/media/preview.png", "extension/media/preview-settings.png"]) {
  const entry = entries.find((candidate) => candidate.name === name);
  const preview = pngMetadata(extractEntry(archive, entry), name);
  if (preview.width !== 1200 || preview.height !== 800 || ![4, 6].includes(preview.colorType)) {
    throw new Error(`${name} must be a 1200x800 PNG with alpha.`);
  }
}

console.log(
  `Verified ${path.basename(archivePath)}: ${entries.length} entries, ${archive.length} bytes, runtime and panel assets present.`,
);

async function newestVsix() {
  const candidates = (await readdir(process.cwd()))
    .filter((name) => name.endsWith(".vsix"))
    .map(async (name) => ({ name, info: await stat(name) }));
  const resolved = await Promise.all(candidates);
  resolved.sort((left, right) => right.info.mtimeMs - left.info.mtimeMs);
  if (!resolved[0]) {
    throw new Error("No VSIX found. Run pnpm vsix first.");
  }
  return path.resolve(resolved[0].name);
}

function readCentralDirectory(buffer) {
  const endSignature = 0x06054b50;
  let end = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset--) {
    if (buffer.readUInt32LE(offset) === endSignature) {
      end = offset;
      break;
    }
  }
  if (end < 0) {
    throw new Error("Invalid ZIP: end-of-central-directory record not found");
  }
  const total = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const entries = [];
  for (let index = 0; index < total; index++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory at entry ${index}`);
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    entries.push({ name, method, compressedSize, uncompressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function extractEntry(buffer, entry) {
  if (!entry || buffer.readUInt32LE(entry.localOffset) !== 0x04034b50) {
    throw new Error("Invalid ZIP local entry");
  }
  const nameLength = buffer.readUInt16LE(entry.localOffset + 26);
  const extraLength = buffer.readUInt16LE(entry.localOffset + 28);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(start, start + entry.compressedSize);
  const value = entry.method === 0 ? compressed : entry.method === 8 ? inflateRawSync(compressed) : undefined;
  if (!value || value.length !== entry.uncompressedSize) {
    throw new Error(`Could not extract ${entry.name}`);
  }
  return value;
}

function pngMetadata(buffer, label) {
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error(`${label} must be PNG.`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25),
  };
}
