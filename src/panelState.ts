import type { ChromeElement, ChromeFlags } from "./chrome.ts";
import { ALL_CHROME_ELEMENTS, elementBackground } from "./chrome.ts";
import {
  describeChromeCompatibility,
  detectChromeCompatibility,
} from "./compatibility.ts";

export type StatusBarClick = "quick" | "full";

export type PanelState = {
  projectName: string;
  derivedName: string;
  color: string;
  stepped: boolean;
  applied: boolean;
  hasWorkspace: boolean;
  autoApply: boolean;
  highContrast: boolean;
  conflictCount: number;
  modernUi: boolean;
  chromeNote: string;
  flags: ChromeFlags;
  tones: Record<ChromeElement, string>;
  statusPreviewText: string;
  statusForeground: string;
  chipColor: string;
  showStatusBarLabel: boolean;
  showStatusBarIcon: boolean;
  statusIcon: string;
  statusBarClick: StatusBarClick;
};

export function parseStatusBarClick(raw: unknown): StatusBarClick {
  return raw === "full" ? "full" : "quick";
}

export function chromeCompatibilityNote(input: {
  modernUi: boolean | undefined;
  activityBarLocation?: string;
}): string {
  return describeChromeCompatibility(detectChromeCompatibility(input));
}

export function chromeTones(color: string, stepped: boolean): Record<ChromeElement, string> {
  return Object.fromEntries(
    ALL_CHROME_ELEMENTS.map((element) => [element, elementBackground(color, element, stepped)]),
  ) as Record<ChromeElement, string>;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
