import { normalizeHex } from "./color.ts";
import { parseCodiconId, STATUS_ICONS } from "./icons.ts";
import { ALL_CHROME_ELEMENTS, type ChromeElement } from "./managedKeys.ts";
import type { StatusBarClick } from "./panelState.ts";

export const SUPPORT_URL = "https://github.com/gvastethecreator/vscode-color-my-workspaces";

export type PanelMessage =
  | { type: "ready" }
  | { type: "setColor"; color: string }
  | { type: "setLabel"; label: string }
  | { type: "setShowStatusBarLabel"; enabled: boolean }
  | { type: "setShowStatusBarIcon"; enabled: boolean }
  | { type: "setStatusBarClick"; target: StatusBarClick }
  | { type: "setIcon"; icon: string }
  | { type: "setFlag"; element: ChromeElement; enabled: boolean }
  | { type: "setStepped"; enabled: boolean }
  | { type: "setAutoApply"; enabled: boolean }
  | { type: "applyFromFolder" }
  | { type: "surprise" }
  | { type: "reset" }
  | { type: "resetSettings" }
  | { type: "setDefaults" }
  | { type: "copyHex"; color: string }
  | { type: "setSeparateBars"; enabled: boolean }
  | { type: "openUrl"; url: typeof SUPPORT_URL };

export function parsePanelMessage(value: unknown): PanelMessage | undefined {
  if (!isPlainObject(value) || typeof value.type !== "string") {
    return undefined;
  }
  switch (value.type) {
    case "ready":
    case "applyFromFolder":
    case "surprise":
    case "reset":
    case "resetSettings":
    case "setDefaults":
      return exactKeys(value, ["type"]) ? { type: value.type } : undefined;
    case "setColor":
    case "copyHex": {
      if (!exactKeys(value, ["type", "color"]) || typeof value.color !== "string" || value.color.length > 9) {
        return undefined;
      }
      const color = normalizeHex(value.color);
      return color ? { type: value.type, color } : undefined;
    }
    case "setLabel":
      return exactKeys(value, ["type", "label"]) && typeof value.label === "string" && value.label.length <= 80
        ? { type: "setLabel", label: value.label }
        : undefined;
    case "setShowStatusBarLabel":
    case "setShowStatusBarIcon":
    case "setStepped":
    case "setAutoApply":
    case "setSeparateBars":
      return exactKeys(value, ["type", "enabled"]) && typeof value.enabled === "boolean"
        ? { type: value.type, enabled: value.enabled }
        : undefined;
    case "setStatusBarClick":
      return exactKeys(value, ["type", "target"]) &&
        (value.target === "quick" || value.target === "full")
        ? { type: "setStatusBarClick", target: value.target }
        : undefined;
    case "setIcon": {
      if (!exactKeys(value, ["type", "icon"]) || typeof value.icon !== "string" || value.icon.length > 40) {
        return undefined;
      }
      const icon = parseCodiconId(value.icon);
      return icon && STATUS_ICONS.includes(icon) ? { type: "setIcon", icon } : undefined;
    }
    case "setFlag":
      return exactKeys(value, ["type", "element", "enabled"]) &&
        typeof value.element === "string" &&
        ALL_CHROME_ELEMENTS.includes(value.element as ChromeElement) &&
        typeof value.enabled === "boolean"
        ? { type: "setFlag", element: value.element as ChromeElement, enabled: value.enabled }
        : undefined;
    case "openUrl":
      return exactKeys(value, ["type", "url"]) && value.url === SUPPORT_URL
        ? { type: "openUrl", url: SUPPORT_URL }
        : undefined;
    default:
      return undefined;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}
