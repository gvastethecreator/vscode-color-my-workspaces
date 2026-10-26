export type ChromeCompatibility =
  | { mode: "classic"; limitations: readonly string[] }
  | { mode: "modern"; limitations: readonly string[] }
  | { mode: "unknown"; limitations: readonly string[] };

export function detectChromeCompatibility(input: {
  modernUi: boolean | undefined;
  activityBarLocation?: string;
}): ChromeCompatibility {
  const activityBarLimitation =
    input.activityBarLocation === "top" || input.activityBarLocation === "bottom"
      ? "The top or bottom activity bar uses the activityBarTop theme keys."
      : undefined;

  if (input.modernUi === true) {
    return {
      mode: "modern",
      limitations: [
        "Modern UI can blend the title bar color across the window chrome.",
        "Activity bar and command center backgrounds can remain transparent.",
        "Use Disable experimental Modern UI only when you want separate bars; it changes this workspace setting and requires a reload.",
        ...(activityBarLimitation ? [activityBarLimitation] : []),
      ],
    };
  }
  if (input.modernUi === false) {
    return {
      mode: "classic",
      limitations: activityBarLimitation ? [activityBarLimitation] : [],
    };
  }
  return {
    mode: "unknown",
    limitations: [
      "This VS Code build does not expose a stable Modern UI value.",
      ...(activityBarLimitation ? [activityBarLimitation] : []),
    ],
  };
}

export function describeChromeCompatibility(compatibility: ChromeCompatibility): string {
  if (compatibility.mode === "classic" && compatibility.limitations.length === 0) {
    return "Each enabled VS Code chrome surface uses its own theme color keys.";
  }
  return compatibility.limitations.join(" ");
}

export function resolveActivityBarFlag(input: {
  override: boolean | undefined;
  modernUi: boolean | undefined;
  activityBarLocation: string | undefined;
}): boolean {
  if (input.override !== undefined) {
    return input.override;
  }
  const topOrBottom =
    input.activityBarLocation === "top" || input.activityBarLocation === "bottom";
  return !(input.modernUi === true && topOrBottom);
}
