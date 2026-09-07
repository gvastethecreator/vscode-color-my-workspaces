import { STATUS_ICON_SVG } from "./statusIconSvg.ts";
import { SUPPORT_URL, type PanelMessage } from "./panelMessages.ts";
import type { PanelState } from "./panelState.ts";
import "./panel.css";

declare function acquireVsCodeApi<T = unknown>(): {
  postMessage(message: PanelMessage): void;
  getState(): T | undefined;
  setState(state: T): void;
};

const vscode = acquireVsCodeApi<{ lastColor?: string }>();

const picker = element<HTMLInputElement>("picker");
const hex = element<HTMLInputElement>("hex");
const hexError = element<HTMLElement>("hexError");
const copyHex = element<HTMLButtonElement>("copyHex");
const clearColor = element<HTMLButtonElement>("clearColor");
const resetSettings = element<HTMLButtonElement>("resetSettings");
const label = element<HTMLInputElement>("label");
const showLabel = element<HTMLInputElement>("showLabel");
const showIcon = element<HTMLInputElement>("showIcon");
const statusBarClick = element<HTMLSelectElement>("statusBarClick");
const pickIcon = element<HTMLButtonElement>("pickIcon");
const pickIconGlyph = element<HTMLElement>("pickIconGlyph");
const pickIconId = element<HTMLElement>("pickIconId");
const iconMenu = element<HTMLElement>("iconMenu");
const stepped = element<HTMLInputElement>("stepped");
const separateBars = element<HTMLInputElement>("separateBars");
const autoApply = element<HTMLInputElement>("autoApply");
const statusLine = element<HTMLElement>("statusLine");
const conflictNotice = element<HTMLElement>("conflictNotice");
const chromeNote = element<HTMLElement>("chromeNote");
const statusPreviewChip = element<HTMLElement>("statusPreviewChip");
const statusPreviewIcon = element<HTMLElement>("statusPreviewIcon");
const statusPreviewLabel = element<HTMLElement>("statusPreviewLabel");
const hue = element<HTMLInputElement>("hue");
const saturation = element<HTMLInputElement>("saturation");
const brightness = element<HTMLInputElement>("brightness");
const contrast = element<HTMLInputElement>("contrast");
const hueValue = element<HTMLOutputElement>("hueValue");
const saturationValue = element<HTMLOutputElement>("saturationValue");
const brightnessValue = element<HTMLOutputElement>("brightnessValue");
const contrastValue = element<HTMLOutputElement>("contrastValue");

let colorTimer: number | undefined;
let labelTimer: number | undefined;
let hasWorkspace = false;
let baseHsl = { h: 0, s: 0, l: 0 };

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) {
    throw new Error(`Missing panel element: ${id}`);
  }
  return value as T;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function validHex(value: string): boolean {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function normalizeHex(value: string): string {
  const raw = value.trim().replace("#", "");
  const expanded = raw.length === 3 ? raw.split("").map((character) => character + character).join("") : raw;
  return `#${expanded.toLowerCase()}`;
}

function rgbToHsl(red: number, green: number, blue: number): { h: number; s: number; l: number } {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l: lightness * 100 };
  }
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === r) {
    hue = (g - b) / delta + (g < b ? 6 : 0);
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }
  return { h: hue * 60, s: saturation * 100, l: lightness * 100 };
}

function hexToHsl(value: string): { h: number; s: number; l: number } {
  const normalized = normalizeHex(value).slice(1);
  return rgbToHsl(
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  );
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = clamp(saturation, 0, 100) / 100;
  const l = clamp(lightness, 0, 100) / 100;
  const h = ((hue % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const secondary = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const offset = l - chroma / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = chroma; g = secondary;
  } else if (h < 120) {
    r = secondary; g = chroma;
  } else if (h < 180) {
    g = chroma; b = secondary;
  } else if (h < 240) {
    g = secondary; b = chroma;
  } else if (h < 300) {
    r = secondary; b = chroma;
  } else {
    r = chroma; b = secondary;
  }
  const channel = (value: number) =>
    Math.round(clamp((value + offset) * 255, 0, 255)).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function colorFromSliders(): string {
  const amount = Number(contrast.value) / 50;
  const s = clamp(baseHsl.s * (0.35 + amount * 0.65), 0, 100);
  const l = clamp(50 + (baseHsl.l - 50) * amount, 0, 100);
  return hslToHex(baseHsl.h, s, l);
}

function sliderFocused(): boolean {
  return [hue, saturation, brightness, contrast].includes(document.activeElement as HTMLInputElement);
}

function setSliderOutputs(): void {
  hueValue.textContent = String(Math.round(Number(hue.value)));
  saturationValue.textContent = String(Math.round(Number(saturation.value)));
  brightnessValue.textContent = String(Math.round(Number(brightness.value)));
  contrastValue.textContent = String(Math.round(Number(contrast.value)));
}

function setBaseFromHex(value: string): void {
  if (!validHex(value)) {
    return;
  }
  baseHsl = hexToHsl(value);
  hue.value = String(Math.round(baseHsl.h));
  saturation.value = String(Math.round(baseHsl.s));
  brightness.value = String(Math.round(baseHsl.l));
  contrast.value = "50";
  setSliderOutputs();
}

function setHexError(invalid: boolean): void {
  hexError.hidden = !invalid;
  hex.setAttribute("aria-invalid", invalid ? "true" : "false");
}

function renderIcon(target: HTMLElement, id: string): void {
  target.replaceChildren();
  const markup = STATUS_ICON_SVG[id] ?? STATUS_ICON_SVG.folder;
  if (!markup) {
    return;
  }
  const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
  if (parsed.documentElement.nodeName.toLowerCase() !== "svg") {
    return;
  }
  const svg = document.importNode(parsed.documentElement, true);
  svg.classList.add("status-icon");
  target.append(svg);
}

function setIconPreview(id: string, show: boolean): void {
  renderIcon(pickIconGlyph, id);
  renderIcon(statusPreviewIcon, id);
  pickIconId.textContent = id;
  statusPreviewIcon.hidden = !show;
  for (const option of iconMenu.querySelectorAll<HTMLButtonElement>(".icon-option")) {
    option.setAttribute("aria-selected", option.dataset.icon === id ? "true" : "false");
  }
}

function applyStatusPreview(showName: boolean, showIconValue: boolean): void {
  label.disabled = !showName;
  pickIcon.disabled = !hasWorkspace;
  statusPreviewChip.hidden = (showName && Boolean(statusPreviewLabel.textContent)) || showIconValue;
  statusPreviewLabel.hidden = !showName;
  statusPreviewIcon.hidden = !showIconValue;
}

function applyState(state: PanelState): void {
  statusLine.textContent = !state.hasWorkspace
    ? "Open a folder or saved workspace to color this window."
    : state.highContrast
      ? "Chrome painting is suspended while a high-contrast theme is active."
      : state.applied
        ? "This workspace color is applied and can be restored safely."
        : "No workspace color has been applied yet.";
  conflictNotice.hidden = state.conflictCount === 0;
  conflictNotice.textContent =
    state.conflictCount === 0
      ? ""
      : `${state.conflictCount} external color ${state.conflictCount === 1 ? "change is" : "changes are"} being preserved.`;
  chromeNote.textContent = state.chromeNote;
  separateBars.checked = !state.modernUi;
  autoApply.checked = state.autoApply;
  hasWorkspace = state.hasWorkspace;
  document.body.classList.toggle("high-contrast-suspended", state.highContrast);

  statusPreviewChip.style.backgroundColor = state.chipColor;
  statusPreviewLabel.textContent = state.statusPreviewText;
  statusPreviewLabel.style.color = state.statusForeground;
  statusPreviewIcon.style.color = state.statusForeground;
  setIconPreview(state.statusIcon, state.showStatusBarIcon);

  if (document.activeElement !== picker) {
    picker.value = state.color;
  }
  if (document.activeElement !== hex) {
    hex.value = state.color;
    setHexError(false);
  }
  if (!sliderFocused()) {
    setBaseFromHex(state.color);
  }
  if (document.activeElement !== label) {
    label.value = state.projectName;
    label.placeholder = state.derivedName || "Workspace";
  }
  showLabel.checked = state.showStatusBarLabel;
  showIcon.checked = state.showStatusBarIcon;
  if (document.activeElement !== statusBarClick) {
    statusBarClick.value = state.statusBarClick;
  }
  stepped.checked = state.stepped;
  applyStatusPreview(state.showStatusBarLabel, state.showStatusBarIcon);

  clearColor.disabled = !state.applied;
  resetSettings.disabled = false;
  copyHex.disabled = !state.hasWorkspace || !validHex(state.color);
  autoApply.disabled = !state.hasWorkspace;
  separateBars.disabled = !state.hasWorkspace;
  label.disabled = !state.hasWorkspace || !state.showStatusBarLabel;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-action='applyFromFolder'], [data-action='surprise']")) {
    button.disabled = !state.hasWorkspace;
  }
  for (const input of document.querySelectorAll<HTMLInputElement>("[data-flag]")) {
    const key = input.dataset.flag as keyof PanelState["flags"];
    input.checked = Boolean(state.flags[key]);
    input.disabled = !state.hasWorkspace;
  }
  for (const chip of document.querySelectorAll<HTMLButtonElement>(".palette-chip")) {
    const chipColor = chip.dataset.color ?? "";
    chip.style.setProperty("--chip-color", chipColor);
    const current = chipColor.toLowerCase() === state.color.toLowerCase();
    chip.classList.toggle("current", current);
    chip.setAttribute("aria-pressed", current ? "true" : "false");
    chip.disabled = !state.hasWorkspace;
  }
  for (const node of document.querySelectorAll<HTMLElement>("[data-tone]")) {
    const key = node.dataset.tone as keyof PanelState["tones"];
    node.style.backgroundColor = state.tones[key] ?? "transparent";
    node.classList.toggle("off", state.flags[key] === false || state.highContrast);
  }
  vscode.setState({ lastColor: state.color });
}

function sendColor(value: string): void {
  if (!validHex(value)) {
    return;
  }
  vscode.postMessage({ type: "setColor", color: normalizeHex(value) });
}

function sendLabel(): void {
  vscode.postMessage({ type: "setLabel", label: label.value });
}

function setIconMenuOpen(open: boolean): void {
  iconMenu.hidden = !open;
  pickIcon.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    (
      iconMenu.querySelector<HTMLElement>('[aria-selected="true"]') ??
      iconMenu.querySelector<HTMLElement>(".icon-option")
    )?.focus();
  }
}

function sendFromSliders(): void {
  setSliderOutputs();
  const next = colorFromSliders();
  picker.value = next;
  hex.value = next;
  setHexError(false);
  window.clearTimeout(colorTimer);
  colorTimer = window.setTimeout(() => sendColor(next), 120);
}

for (const option of iconMenu.querySelectorAll<HTMLButtonElement>(".icon-option")) {
  renderIcon(option, option.dataset.icon ?? "folder");
}

for (const chip of document.querySelectorAll<HTMLButtonElement>(".palette-chip")) {
  chip.style.setProperty("--chip-color", chip.dataset.color ?? "#333333");
}

picker.addEventListener("input", () => {
  hex.value = picker.value;
  setHexError(false);
  setBaseFromHex(picker.value);
  window.clearTimeout(colorTimer);
  colorTimer = window.setTimeout(() => sendColor(picker.value), 120);
});

hex.addEventListener("input", () => {
  const value = hex.value.trim();
  const valid = validHex(value);
  setHexError(value.length > 0 && !valid);
  if (valid) {
    setBaseFromHex(value);
    window.clearTimeout(colorTimer);
    colorTimer = window.setTimeout(() => sendColor(value), 120);
  }
});

hex.addEventListener("change", () => {
  if (!validHex(hex.value)) {
    setHexError(true);
    return;
  }
  sendColor(hex.value);
});

hex.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    if (validHex(hex.value)) {
      sendColor(hex.value);
    } else {
      setHexError(true);
    }
  }
});

copyHex.addEventListener("click", () => {
  if (validHex(hex.value)) {
    vscode.postMessage({ type: "copyHex", color: normalizeHex(hex.value) });
  } else {
    setHexError(true);
  }
});

label.addEventListener("input", () => {
  window.clearTimeout(labelTimer);
  labelTimer = window.setTimeout(sendLabel, 180);
});
label.addEventListener("change", sendLabel);

showLabel.addEventListener("change", () => {
  applyStatusPreview(showLabel.checked, showIcon.checked);
  vscode.postMessage({ type: "setShowStatusBarLabel", enabled: showLabel.checked });
});
showIcon.addEventListener("change", () => {
  applyStatusPreview(showLabel.checked, showIcon.checked);
  vscode.postMessage({ type: "setShowStatusBarIcon", enabled: showIcon.checked });
});
statusBarClick.addEventListener("change", () => {
  vscode.postMessage({
    type: "setStatusBarClick",
    target: statusBarClick.value === "full" ? "full" : "quick",
  });
});
stepped.addEventListener("change", () => {
  vscode.postMessage({ type: "setStepped", enabled: stepped.checked });
});
autoApply.addEventListener("change", () => {
  vscode.postMessage({ type: "setAutoApply", enabled: autoApply.checked });
});
separateBars.addEventListener("change", () => {
  vscode.postMessage({ type: "setSeparateBars", enabled: separateBars.checked });
});

pickIcon.addEventListener("click", (event) => {
  event.stopPropagation();
  if (!pickIcon.disabled) {
    setIconMenuOpen(iconMenu.hidden === true);
  }
});

iconMenu.addEventListener("click", (event) => {
  event.stopPropagation();
  const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-icon]") : null;
  const id = target?.dataset.icon;
  if (!id) {
    return;
  }
  showIcon.checked = true;
  setIconPreview(id, true);
  applyStatusPreview(showLabel.checked, true);
  setIconMenuOpen(false);
  vscode.postMessage({ type: "setIcon", icon: id });
});

iconMenu.addEventListener("keydown", (event) => {
  const options = [...iconMenu.querySelectorAll<HTMLButtonElement>(".icon-option")];
  const current = options.indexOf(document.activeElement as HTMLButtonElement);
  const columns = 8;
  let next = current;
  if (event.key === "ArrowRight") next = current + 1;
  if (event.key === "ArrowLeft") next = current - 1;
  if (event.key === "ArrowDown") next = current + columns;
  if (event.key === "ArrowUp") next = current - columns;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = options.length - 1;
  if (event.key === "Escape") {
    setIconMenuOpen(false);
    pickIcon.focus();
    return;
  }
  if (next !== current) {
    event.preventDefault();
    options[(next + options.length) % options.length]?.focus();
  }
});

document.addEventListener("click", () => setIconMenuOpen(false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setIconMenuOpen(false);
  }
});

for (const input of document.querySelectorAll<HTMLInputElement>("[data-flag]")) {
  input.addEventListener("change", () => {
    const element = input.dataset.flag;
    if (element === "titleBar" || element === "activityBar" || element === "statusBar" || element === "commandCenter") {
      vscode.postMessage({ type: "setFlag", element, enabled: input.checked });
    }
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-action]")) {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (
      action === "applyFromFolder" ||
      action === "surprise" ||
      action === "reset" ||
      action === "resetSettings" ||
      action === "setDefaults"
    ) {
      vscode.postMessage({ type: action });
    }
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>(".palette-chip")) {
  button.addEventListener("click", () => {
    const color = button.dataset.color;
    if (color) {
      setHexError(false);
      setBaseFromHex(color);
      sendColor(color);
    }
  });
}

element<HTMLAnchorElement>("supportLink").addEventListener("click", (event) => {
  event.preventDefault();
  vscode.postMessage({
    type: "openUrl",
    url: SUPPORT_URL,
  });
});

hue.addEventListener("input", () => {
  baseHsl.h = Number(hue.value);
  contrast.value = "50";
  sendFromSliders();
});
saturation.addEventListener("input", () => {
  baseHsl.s = Number(saturation.value);
  contrast.value = "50";
  sendFromSliders();
});
brightness.addEventListener("input", () => {
  baseHsl.l = Number(brightness.value);
  contrast.value = "50";
  sendFromSliders();
});
contrast.addEventListener("input", sendFromSliders);

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (isPanelStateMessage(event.data)) {
    applyState(event.data.state);
  }
});

function isPanelStateMessage(value: unknown): value is { type: "state"; state: PanelState } {
  if (!isRecord(value) || value.type !== "state" || !isRecord(value.state)) {
    return false;
  }
  const state = value.state;
  return (
    typeof state.projectName === "string" &&
    typeof state.derivedName === "string" &&
    typeof state.color === "string" &&
    validHex(state.color) &&
    typeof state.stepped === "boolean" &&
    typeof state.applied === "boolean" &&
    typeof state.hasWorkspace === "boolean" &&
    typeof state.autoApply === "boolean" &&
    typeof state.highContrast === "boolean" &&
    typeof state.conflictCount === "number" &&
    typeof state.modernUi === "boolean" &&
    typeof state.chromeNote === "string" &&
    isRecord(state.flags) &&
    isRecord(state.tones) &&
    typeof state.statusPreviewText === "string" &&
    typeof state.statusForeground === "string" &&
    typeof state.chipColor === "string" &&
    typeof state.showStatusBarLabel === "boolean" &&
    typeof state.showStatusBarIcon === "boolean" &&
    typeof state.statusIcon === "string" &&
    (state.statusBarClick === "quick" || state.statusBarClick === "full")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

vscode.postMessage({ type: "ready" });
