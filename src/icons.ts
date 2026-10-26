export const DEFAULT_STATUS_ICON = "folder";

const ICON_ID = /^[a-z0-9][a-z0-9-]{0,46}$/;

export const STATUS_ICONS: readonly string[] = [
  "folder",
  "folder-opened",
  "repo",
  "git-branch",
  "package",
  "archive",
  "file-code",
  "file-directory",
  "symbol-class",
  "symbol-method",
  "code",
  "terminal",
  "server",
  "cloud",
  "database",
  "globe",
  "home",
  "rocket",
  "beaker",
  "tools",
  "gear",
  "wrench",
  "paintcan",
  "symbol-color",
  "sparkle",
  "star",
  "heart",
  "flame",
  "zap",
  "lightbulb",
  "bug",
  "shield",
  "lock",
  "key",
  "broadcast",
  "radio-tower",
  "organization",
  "person",
  "comment-discussion",
  "book",
  "notebook",
  "briefcase",
  "project",
  "window",
  "extensions",
  "source-control",
  "github",
  "play",
  "debug-alt",
  "pulse",
  "tag",
  "music",
  "device-camera",
  "vm",
  "circuit-board",
];

export function parseCodiconId(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  const id = raw.trim().toLowerCase().replace(/^\$\(|\)$/g, "");
  if (!ICON_ID.test(id)) {
    return undefined;
  }
  return id;
}
