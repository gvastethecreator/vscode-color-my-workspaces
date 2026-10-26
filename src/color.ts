export type Rgb = {
  r: number;
  g: number;
  b: number;
};

const HEX_SHORT = /^#?([0-9a-fA-F]{3})$/;
const HEX_LONG = /^#?([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/;

export function parseHex(input: string): Rgb | undefined {
  const trimmed = input.trim();
  const short = HEX_SHORT.exec(trimmed);
  if (short) {
    const [r, g, b] = short[1].split("").map((ch) => parseInt(ch + ch, 16));
    return { r, g, b };
  }
  const long = HEX_LONG.exec(trimmed);
  if (!long) {
    return undefined;
  }
  const n = long[1];
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

export function isValidHex(input: string): boolean {
  return parseHex(input) !== undefined;
}

function channel(n: number): string {
  return Math.round(clamp(n, 0, 255))
    .toString(16)
    .padStart(2, "0");
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export function normalizeHex(input: string): string | undefined {
  const rgb = parseHex(input);
  return rgb ? rgbToHex(rgb) : undefined;
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return hex;
  }
  const a = Math.round(clamp(alpha, 0, 1) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${rgbToHex(rgb)}${a}`;
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = clamp(t, 0, 1);
  return {
    r: a.r + (b.r - a.r) * k,
    g: a.g + (b.g - a.g) * k,
    b: a.b + (b.b - a.b) * k,
  };
}

export function mixHex(a: string, b: string, t: number): string {
  const left = parseHex(a);
  const right = parseHex(b);
  if (!left || !right) {
    return a;
  }
  return rgbToHex(mix(left, right, t));
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  return rgbToHex(hslToRgb(h, s, l));
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | undefined {
  const rgb = parseHex(hex);
  return rgb ? rgbToHsl(rgb) : undefined;
}

export function applyHslContrast(
  h: number,
  s: number,
  l: number,
  contrast: number,
): { h: number; s: number; l: number } {
  const t = clamp(contrast, 0, 100) / 50;
  return {
    h,
    s: clamp(s * (0.35 + t * 0.65), 0, 100),
    l: clamp(50 + (l - 50) * t, 0, 100),
  };
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (n: number) => {
    const c = n / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(left: string | Rgb, right: string | Rgb): number {
  const leftRgb = typeof left === "string" ? parseHex(left) : left;
  const rightRgb = typeof right === "string" ? parseHex(right) : right;
  if (!leftRgb || !rightRgb) {
    return 1;
  }
  const brighter = Math.max(relativeLuminance(leftRgb), relativeLuminance(rightRgb));
  const darker = Math.min(relativeLuminance(leftRgb), relativeLuminance(rightRgb));
  return (brighter + 0.05) / (darker + 0.05);
}

export const DARK_FOREGROUND = "#161616";
export const LIGHT_FOREGROUND = "#f4f4f4";
const MIN_TEXT_CONTRAST = 4.5;

export function contrastForeground(background: string): string {
  const darkRatio = contrastRatio(background, DARK_FOREGROUND);
  const lightRatio = contrastRatio(background, LIGHT_FOREGROUND);
  const preferred = darkRatio >= lightRatio ? DARK_FOREGROUND : LIGHT_FOREGROUND;
  if (Math.max(darkRatio, lightRatio) >= MIN_TEXT_CONTRAST) {
    return preferred;
  }

  const blackRatio = contrastRatio(background, "#000000");
  const whiteRatio = contrastRatio(background, "#ffffff");
  return blackRatio >= whiteRatio ? "#000000" : "#ffffff";
}

export function fnv1a(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function colorFromIdentity(identity: string): string {
  const n = fnv1a(identity);
  const hue = n % 360;
  const sat = 46 + (n % 16);
  const light = 30 + ((n >>> 8) % 12);
  return hslToHex(hue, sat, light);
}

export function randomWorkspaceColor(random: () => number = Math.random): string {
  const hue = clamp(random(), 0, 1) * 360;
  const saturation = 38 + clamp(random(), 0, 1) * 42;
  const brightness = 26 + clamp(random(), 0, 1) * 30;
  const contrast = 25 + clamp(random(), 0, 1) * 65;
  const varied = applyHslContrast(hue, saturation, brightness, contrast);
  return hslToHex(varied.h, clamp(varied.s, 30, 90), clamp(varied.l, 18, 62));
}

export function shiftHue(hex: string, degrees: number): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return hex;
  }
  const { h, s, l } = rgbToHsl(rgb);
  return hslToHex(h + degrees, s, l);
}

export function adjustLightness(hex: string, delta: number): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return hex;
  }
  const { h, s, l } = rgbToHsl(rgb);
  return hslToHex(h, s, l + delta);
}

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rr) {
    h = (gg - bb) / d + (gg < bb ? 6 : 0);
  } else if (max === gg) {
    h = (bb - rr) / d + 2;
  } else {
    h = (rr - gg) / d + 4;
  }
  return { h: h * 60, s: s * 100, l: l * 100 };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
