import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { normalizeHex } from "./color.ts";

export interface FavoriteColor {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export function validFavoriteName(name: string): boolean {
  return name.trim().length > 0 && name.trim().length <= 64 && !/[\u0000-\u001f\u007f]/.test(name);
}

export class ColorFavorites {
  private readonly directory: string;
  constructor(directory: string) { this.directory = directory; }

  async read(): Promise<readonly FavoriteColor[]> {
    let source: string;
    try { source = await readFile(path.join(this.directory, "favorites.json"), "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const value: unknown = JSON.parse(source);
    if (!Array.isArray(value) || value.length > 24 || value.some((entry) =>
      !entry || typeof entry.id !== "string" || typeof entry.name !== "string" || !validFavoriteName(entry.name) ||
      typeof entry.color !== "string" || !normalizeHex(entry.color)) ||
      new Set(value.map((entry) => entry.id)).size !== value.length) {
      throw new Error("The favorites file is invalid. Review it before changing favorites.");
    }
    return value as FavoriteColor[];
  }

  async change(operation: (latest: readonly FavoriteColor[]) => readonly FavoriteColor[]): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const lockPath = path.join(this.directory, "favorites.lock");
    let lock;
    try { lock = await open(lockPath, "wx"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new Error("Favorites are locked by another update. Retry after it finishes. If a window crashed, close all VS Code windows before removing favorites.lock from extension storage.");
      }
      throw error;
    }
    const temporary = path.join(this.directory, `favorites-${randomUUID()}.tmp`);
    try {
      const latest = await this.read();
      const updated = operation(latest);
      if (updated.length > 24) throw new Error("You can save up to 24 favorite colors. Delete one first.");
      if (new Set(updated.map((entry) => entry.name.toLowerCase())).size !== updated.length) {
        throw new Error("A favorite with that name already exists. Choose another name.");
      }
      await writeFavorites(temporary, updated);
      await rename(temporary, path.join(this.directory, "favorites.json"));
    } finally {
      try {
        await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
      } finally {
        await lock.close();
        await unlink(lockPath);
      }
    }
  }

  async save(name: string, color: string): Promise<void> {
    const normalized = normalizeHex(color);
    if (!validFavoriteName(name) || !normalized) throw new Error("Enter a valid name and color.");
    await this.change((latest) => [...latest, { id: randomUUID(), name: name.trim(), color: normalized }]);
  }

  async update(expected: FavoriteColor, name?: string): Promise<void> {
    if (name !== undefined && !validFavoriteName(name)) throw new Error("Use a name between 1 and 64 characters.");
    await this.change((latest) => {
      const current = latest.find((entry) => entry.id === expected.id);
      if (!current || current.name !== expected.name || current.color !== expected.color) {
        throw new Error("This favorite changed in another window. Open Favorites again.");
      }
      return name === undefined ? latest.filter((entry) => entry.id !== expected.id)
        : latest.map((entry) => entry.id === expected.id ? { ...entry, name: name.trim() } : entry);
    });
  }
}

async function writeFavorites(file: string, favorites: readonly FavoriteColor[]): Promise<void> {
  const handle = await open(file, "wx");
  try {
    await handle.writeFile(JSON.stringify(favorites, null, 2) + "\n", "utf8");
    await handle.sync();
  } finally { await handle.close(); }
}
