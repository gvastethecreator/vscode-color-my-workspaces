import * as vscode from "vscode";
import { STATUS_ICONS } from "./icons.ts";
import { QUICK_PICK_COLOR_COUNT, type PaletteSwatch } from "./palette.ts";

export type StatusAction =
  | { type: "color"; color: string }
  | { type: "surprise" }
  | { type: "folder" }
  | { type: "copy" }
  | { type: "settings" }
  | { type: "favorites" }
  | { type: "saveFavorite" }
  | { type: "toggleLabel" }
  | { type: "toggleIcon" }
  | { type: "pickIcon" }
  | { type: "reapply" }
  | { type: "reset" };

type PaletteItem = vscode.QuickPickItem & { color: string };
type ActionItem = vscode.QuickPickItem & { action?: StatusAction };
type IconItem = vscode.QuickPickItem & { iconId: string };

export function colorSwatchIcon(hex: string): vscode.Uri {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="4" y="1" width="8" height="14" rx="4" fill="${hex}"/></svg>`;
  return vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
}

function paletteItems(palette: readonly PaletteSwatch[], currentColor?: string): PaletteItem[] {
  return palette.map((item) => {
    const icon = colorSwatchIcon(item.color);
    return {
      label: item.label,
      description: item.color,
      picked: currentColor === item.color,
      color: item.color,
      iconPath: { light: icon, dark: icon },
    };
  });
}

export async function pickPaletteColor(
  palette: readonly PaletteSwatch[],
  currentColor?: string,
): Promise<string | undefined> {
  const picked = await vscode.window.showQuickPick(paletteItems(palette, currentColor), {
    title: "Color My Workspaces",
    placeHolder: "Pick a color",
    matchOnDescription: true,
  });
  return picked?.color;
}

export function statusActionItems(input: {
  palette: readonly PaletteSwatch[];
  currentColor?: string;
  showStatusBarLabel: boolean;
  showStatusBarIcon?: boolean;
  applied?: boolean;
  conflictCount?: number;
}): ActionItem[] {
  const items: ActionItem[] = [
    { label: "$(star-full) Favorite Colors...", action: { type: "favorites" } },
    { label: "$(gear) Color My Workspaces Settings", action: { type: "settings" } },
    {
      label: input.showStatusBarLabel ? "$(eye-closed) Hide status bar name" : "$(eye) Show status bar name",
      action: { type: "toggleLabel" },
    },
    {
      label: input.showStatusBarIcon ? "$(eye-closed) Hide status bar icon" : "$(eye) Show status bar icon",
      action: { type: "toggleIcon" },
    },
    { label: "$(symbol-misc) Pick status bar icon", action: { type: "pickIcon" } },
    { label: "$(symbol-color) Surprise me", action: { type: "surprise" } },
    { label: "$(folder) Use folder color", action: { type: "folder" } },
  ];
  if (input.currentColor) {
    items.push({ label: "$(star-add) Save Current Color as Favorite...", action: { type: "saveFavorite" } });
    items.push({
      label: "$(copy) Copy color",
      description: input.currentColor,
      action: { type: "copy" },
    });
  }
  if ((input.conflictCount ?? 0) > 0) {
    items.push({
      label: "$(sync) Reapply and take ownership",
      description: `${input.conflictCount} external change${input.conflictCount === 1 ? "" : "s"}`,
      action: { type: "reapply" },
    });
  }
  if (input.applied) {
    items.push({ label: "$(trash) Clear color", action: { type: "reset" } });
  }
  items.push(
    { kind: vscode.QuickPickItemKind.Separator, label: "Colors" },
    ...paletteItems(input.palette.slice(0, QUICK_PICK_COLOR_COUNT), input.currentColor).map((item) => ({
      ...item,
      action: { type: "color" as const, color: item.color },
    })),
  );
  return items;
}

export async function pickCodicon(current?: string): Promise<string | undefined> {
  const items: IconItem[] = STATUS_ICONS.map((id) => ({
    label: `$(${id}) ${id}`,
    picked: current === id,
    iconId: id,
  }));
  const picked = await vscode.window.showQuickPick(items, {
    title: "Status bar icon",
    placeHolder: "Pick a Codicon for this workspace",
  });
  return picked?.iconId;
}

export async function pickStatusAction(input: {
  palette: readonly PaletteSwatch[];
  currentColor?: string;
  showStatusBarLabel: boolean;
  showStatusBarIcon?: boolean;
  applied?: boolean;
  conflictCount?: number;
}): Promise<StatusAction | undefined> {
  const picked = await vscode.window.showQuickPick(statusActionItems(input), {
    title: "Color My Workspaces",
    placeHolder: "Change this workspace color",
    matchOnDescription: true,
  });
  return picked?.action;
}
