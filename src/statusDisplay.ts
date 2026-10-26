import { mixHex, normalizeHex, parseHex, relativeLuminance } from "./color.ts";
import { truncateLabel } from "./identity.ts";

export const STATUS_CLICK_HINT = "Click to change color";
export const STATUS_CHIP_TEXT = "$(circle-filled)";
export const STATUS_ITEM_ID = "workspaceColor.status";
export const STATUS_ITEM_PRIORITY = Number.MAX_VALUE;

export type StatusPresentation = {
  visible: boolean;
  text: string;
  tooltip: string;
  accessibilityLabel: string;
  command: "workspaceColor.quickActions" | "workspaceColor.openPanel";
};

export function formatStatusBarText(name: string): string {
  return truncateLabel(name);
}

export function formatStatusBarItem(input: { icon?: string; name?: string }): string {
  const parts: string[] = [];
  if (input.icon) {
    parts.push(`$(${input.icon})`);
  }
  if (input.name) {
    parts.push(formatStatusBarText(input.name));
  }
  return parts.join(" ");
}

export function statusBarTooltip(input: { name: string; color?: string }): string {
  if (input.color) {
    return `${input.name} · ${input.color} · ${STATUS_CLICK_HINT}`;
  }
  return `${input.name} · ${STATUS_CLICK_HINT}`;
}

export function statusChipColor(baseHex: string, statusBarBackground?: string): string {
  const base = normalizeHex(baseHex) ?? baseHex;
  const bar = statusBarBackground ? normalizeHex(statusBarBackground) : undefined;
  if (!bar || bar !== base) {
    return base;
  }
  const parsed = parseHex(base);
  const target = parsed && relativeLuminance(parsed) < 0.3 ? "#ffffff" : "#000000";
  return mixHex(base, target, 0.28);
}

export function buildStatusPresentation(input: {
  hasWorkspace: boolean;
  name: string;
  color?: string;
  icon?: string;
  showName: boolean;
  showIcon: boolean;
  clickTarget: "quick" | "full";
}): StatusPresentation {
  const text = formatStatusBarItem({
    icon: input.showIcon ? input.icon : undefined,
    name: input.showName ? input.name : undefined,
  });
  return {
    visible: input.hasWorkspace,
    text: text || "$(symbol-color)",
    tooltip: statusBarTooltip({ name: input.name, color: input.color }),
    accessibilityLabel: `Change workspace color for ${input.name}`,
    command:
      input.clickTarget === "full" ? "workspaceColor.openPanel" : "workspaceColor.quickActions",
  };
}
