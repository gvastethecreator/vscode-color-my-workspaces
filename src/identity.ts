export const WORKSPACE_IDENTITY_VERSION = 2;

export type WorkspaceUri = {
  scheme: string;
  authority?: string;
  path: string;
};

export type WorkspaceUriInput = WorkspaceUri | string;

export function canonicalizeWorkspaceUri(
  input: WorkspaceUriInput,
  platform: "win32" | "posix" = "posix",
): string | undefined {
  const uri = typeof input === "string" ? parseUriInput(input) : input;
  if (!uri || !uri.scheme || !uri.path || uri.scheme.toLowerCase() === "untitled") {
    return undefined;
  }

  const scheme = uri.scheme.toLowerCase();
  let authority = uri.authority ?? "";
  let path = normalizeUriPath(uri.path);
  if (scheme === "file" && (platform === "win32" || /^\/[a-zA-Z]:\//.test(path))) {
    authority = authority.toLowerCase();
    path = path.toLowerCase();
  }
  return `${scheme}://${authority}${path}`;
}

export function workspaceIdentity(input: {
  workspaceFile?: WorkspaceUriInput;
  folders: readonly WorkspaceUriInput[];
  override?: string;
  platform?: "win32" | "posix";
}): string | undefined {
  const override = input.override?.trim();
  if (override) {
    return `v${WORKSPACE_IDENTITY_VERSION}:override:${override}`;
  }

  const platform = input.platform ?? "posix";
  const workspaceFile = input.workspaceFile
    ? canonicalizeWorkspaceUri(input.workspaceFile, platform)
    : undefined;
  if (workspaceFile) {
    return `v${WORKSPACE_IDENTITY_VERSION}:workspace:${workspaceFile}`;
  }

  const folders = input.folders
    .map((folder) => canonicalizeWorkspaceUri(folder, platform))
    .filter((folder): folder is string => Boolean(folder))
    .sort((left, right) => left.localeCompare(right));
  if (folders.length === 0) {
    return undefined;
  }
  const encodedFolders = folders.map((folder) => `${folder.length}:${folder}`).join("");
  return `v${WORKSPACE_IDENTITY_VERSION}:folders:${encodedFolders}`;
}

/** Legacy 0.0.x identity retained only to migrate an existing derived color. */
export function legacyFolderIdentity(fsPath: string): string {
  const parts = fsPath.split(/[\\/]/).filter((part) => part.length > 0 && !/^[a-zA-Z]:$/.test(part));
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }
  return parts[parts.length - 1] ?? fsPath;
}

/** Legacy 0.0.x identity retained only to migrate an existing derived color. */
export function legacyWorkspaceIdentity(input: {
  workspaceFile?: string;
  folders: readonly string[];
}): string | undefined {
  if (input.workspaceFile) {
    const base = input.workspaceFile.split(/[\\/]/).filter((part) => part.length > 0).pop() ?? "";
    const name = base.replace(/\.code-workspace$/i, "");
    return name || undefined;
  }
  if (input.folders.length === 0) {
    return undefined;
  }
  return input.folders.map(legacyFolderIdentity).join("|");
}

export function projectDisplayName(input: {
  customLabel?: string;
  workspaceName?: string;
  folders: readonly WorkspaceUriInput[];
}): string | undefined {
  const custom = input.customLabel?.trim();
  if (custom) {
    return custom;
  }
  const named = input.workspaceName?.trim();
  if (named) {
    return named;
  }
  const first = input.folders[0];
  if (!first) {
    return undefined;
  }
  const path = typeof first === "string" ? (parseUriInput(first)?.path ?? first) : first.path;
  const parts = normalizeUriPath(path).split("/").filter(Boolean);
  return safeDecode(parts[parts.length - 1] ?? "") || undefined;
}

export function truncateLabel(label: string, max = 28): string {
  if (label.length <= max) {
    return label;
  }
  return `${label.slice(0, Math.max(1, max - 1))}…`;
}

function parseUriInput(input: string): WorkspaceUri | undefined {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    const windowsPath = /^[a-zA-Z]:[\\/]/.test(trimmed);
    const normalized = trimmed.replaceAll("\\", "/");
    return {
      scheme: "file",
      path: windowsPath && !normalized.startsWith("/") ? `/${normalized}` : normalized,
    };
  }
  try {
    const url = new URL(trimmed);
    return {
      scheme: url.protocol.slice(0, -1),
      authority: url.host,
      path: safeDecode(url.pathname),
    };
  } catch {
    return undefined;
  }
}

function normalizeUriPath(path: string): string {
  let normalized = path.replaceAll("\\", "/").replace(/\/{2,}/g, "/");
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  if (normalized.length > 1) {
    normalized = normalized.replace(/\/$/, "");
  }
  return normalized;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
