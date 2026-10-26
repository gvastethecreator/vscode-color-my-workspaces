import {
  contrastForeground,
  hexWithAlpha,
  mixHex,
  shiftHue,
  adjustLightness,
} from "./color.ts";
import {
  ALL_CHROME_ELEMENTS,
  MANAGED_CHROME_KEYS,
  type ChromeElement,
} from "./managedKeys.ts";

export { ALL_CHROME_ELEMENTS, MANAGED_CHROME_KEYS } from "./managedKeys.ts";
export type { ChromeElement } from "./managedKeys.ts";

export type ChromeFlags = Record<ChromeElement, boolean>;

export type ChromeStyle = {
  stepped?: boolean;
  modernUi?: boolean;
};

const STEP_MIX: Record<ChromeElement, { black: number; white: number }> = {
  titleBar: { black: 0.18, white: 0 },
  commandCenter: { black: 0.08, white: 0 },
  activityBar: { black: 0, white: 0 },
  statusBar: { black: 0, white: 0.12 },
};

export function flagsToElements(flags: ChromeFlags): ChromeElement[] {
  return ALL_CHROME_ELEMENTS.filter((element) => flags[element]);
}

export function elementBackground(baseHex: string, element: ChromeElement, stepped: boolean): string {
  if (!stepped) {
    return baseHex;
  }
  const mix = STEP_MIX[element];
  let next = baseHex;
  if (mix.black > 0) {
    next = mixHex(next, "#000000", mix.black);
  }
  if (mix.white > 0) {
    next = mixHex(next, "#ffffff", mix.white);
  }
  return next;
}

export function buildChromeColors(
  baseHex: string,
  elements: readonly ChromeElement[],
  style: ChromeStyle = {},
): Record<string, string> {
  const stepped = style.stepped === true;
  const modernUi = style.modernUi === true;
  const selected = new Set(elements);
  const colors: Record<string, string> = {};

  const titleBg = elementBackground(baseHex, "titleBar", stepped);
  const activityBg = elementBackground(baseHex, "activityBar", stepped);
  const statusBg = elementBackground(baseHex, "statusBar", stepped);
  const commandBg = elementBackground(baseHex, "commandCenter", stepped);

  const titleFg = contrastForeground(titleBg);
  const activityFg = contrastForeground(activityBg);
  const statusFg = contrastForeground(statusBg);
  const commandFg = contrastForeground(commandBg);

  const usesDarkTitleForeground = titleFg === "#161616" || titleFg === "#000000";
  const inactiveBg = mixHex(titleBg, usesDarkTitleForeground ? "#ffffff" : "#000000", 0.18);
  const inactiveFg = contrastForeground(inactiveBg);
  const usesDarkStatusForeground = statusFg === "#161616" || statusFg === "#000000";
  const statusInteractionTarget = usesDarkStatusForeground ? "#ffffff" : "#000000";
  const hover = mixHex(statusBg, statusInteractionTarget, 0.12);
  const active = mixHex(statusBg, statusInteractionTarget, 0.2);
  const badge = adjustLightness(shiftHue(activityBg, 28), 14);
  const badgeFg = contrastForeground(badge);
  const debugBg = adjustLightness(shiftHue(statusBg, 18), -8);
  const debugFg = contrastForeground(debugBg);
  const commandActiveBg = mixHex(commandBg, commandFg, 0.16);
  const commandInactiveBg = mixHex(commandBg, commandFg, 0.06);

  if (selected.has("titleBar")) {
    colors["titleBar.activeBackground"] = titleBg;
    colors["titleBar.activeForeground"] = titleFg;
    colors["titleBar.inactiveBackground"] = inactiveBg;
    colors["titleBar.inactiveForeground"] = inactiveFg;
    if (!modernUi) {
      colors["titleBar.border"] = hexWithAlpha(titleFg, 0.18);
    }
    colors["sash.hoverBorder"] = titleBg;
  }

  if (selected.has("activityBar")) {
    colors["activityBar.background"] = activityBg;
    colors["activityBar.foreground"] = activityFg;
    colors["activityBar.inactiveForeground"] = hexWithAlpha(activityFg, 0.7);
    colors["activityBar.activeBackground"] = mixHex(activityBg, activityFg, 0.12);
    colors["activityBar.activeBorder"] = badge;
    colors["activityBarBadge.background"] = badge;
    colors["activityBarBadge.foreground"] = badgeFg;
    colors["activityBarTop.background"] = activityBg;
    colors["activityBarTop.foreground"] = activityFg;
    colors["activityBarTop.inactiveForeground"] = hexWithAlpha(activityFg, 0.7);
    colors["activityBarTop.activeBorder"] = badge;
    colors["activityBarTop.activeBackground"] = mixHex(activityBg, activityFg, 0.12);
    if (!modernUi) {
      colors["activityBar.border"] = hexWithAlpha(activityFg, 0.18);
    }
  }

  if (selected.has("statusBar")) {
    colors["statusBar.background"] = statusBg;
    colors["statusBar.foreground"] = statusFg;
    colors["statusBarItem.hoverBackground"] = hover;
    colors["statusBarItem.activeBackground"] = active;
    colors["statusBar.debuggingBackground"] = debugBg;
    colors["statusBar.debuggingForeground"] = debugFg;
    colors["statusBarItem.remoteBackground"] = statusBg;
    colors["statusBarItem.remoteForeground"] = statusFg;
    if (!modernUi) {
      colors["statusBar.border"] = hexWithAlpha(statusFg, 0.18);
    }
  }

  if (selected.has("commandCenter")) {
    colors["commandCenter.background"] = commandBg;
    colors["commandCenter.foreground"] = commandFg;
    colors["commandCenter.border"] = hexWithAlpha(commandFg, 0.22);
    colors["commandCenter.activeBackground"] = commandActiveBg;
    colors["commandCenter.activeForeground"] = contrastForeground(commandActiveBg);
    colors["commandCenter.activeBorder"] = hexWithAlpha(commandFg, 0.3);
    colors["commandCenter.inactiveForeground"] = contrastForeground(commandInactiveBg);
    colors["commandCenter.inactiveBorder"] = hexWithAlpha(commandFg, 0.12);
    colors["commandCenter.inactiveBackground"] = commandInactiveBg;
  }

  return colors;
}
