export type ChromeElement = "titleBar" | "activityBar" | "statusBar" | "commandCenter";

export const ALL_CHROME_ELEMENTS: readonly ChromeElement[] = [
  "titleBar",
  "activityBar",
  "statusBar",
  "commandCenter",
];

export interface ManagedColorGroup {
  id: ChromeElement;
  keys: readonly string[];
}

export const MANAGED_COLOR_REGISTRY_VERSION = 1;

export const MANAGED_COLOR_GROUPS: readonly ManagedColorGroup[] = [
  {
    id: "titleBar",
    keys: [
      "titleBar.activeBackground",
      "titleBar.activeForeground",
      "titleBar.inactiveBackground",
      "titleBar.inactiveForeground",
      "titleBar.border",
      "sash.hoverBorder",
    ],
  },
  {
    id: "activityBar",
    keys: [
      "activityBar.background",
      "activityBar.foreground",
      "activityBar.inactiveForeground",
      "activityBar.activeBackground",
      "activityBar.activeBorder",
      "activityBar.border",
      "activityBarBadge.background",
      "activityBarBadge.foreground",
      "activityBarTop.background",
      "activityBarTop.foreground",
      "activityBarTop.inactiveForeground",
      "activityBarTop.activeBorder",
      "activityBarTop.activeBackground",
    ],
  },
  {
    id: "statusBar",
    keys: [
      "statusBar.background",
      "statusBar.foreground",
      "statusBar.border",
      "statusBarItem.hoverBackground",
      "statusBarItem.activeBackground",
      "statusBar.debuggingBackground",
      "statusBar.debuggingForeground",
      "statusBarItem.remoteBackground",
      "statusBarItem.remoteForeground",
    ],
  },
  {
    id: "commandCenter",
    keys: [
      "commandCenter.background",
      "commandCenter.foreground",
      "commandCenter.border",
      "commandCenter.activeBackground",
      "commandCenter.activeForeground",
      "commandCenter.activeBorder",
      "commandCenter.inactiveForeground",
      "commandCenter.inactiveBorder",
      "commandCenter.inactiveBackground",
    ],
  },
] as const;

export const MANAGED_CHROME_KEYS: readonly string[] = MANAGED_COLOR_GROUPS.flatMap(
  (group) => group.keys,
);

const GROUP_BY_KEY = new Map(
  MANAGED_COLOR_GROUPS.flatMap((group) => group.keys.map((key) => [key, group.id] as const)),
);

export function managedGroupForKey(key: string): ChromeElement | undefined {
  return GROUP_BY_KEY.get(key);
}

export function managedKeysForElements(elements: readonly ChromeElement[]): readonly string[] {
  const selected = new Set(elements);
  return MANAGED_COLOR_GROUPS.filter((group) => selected.has(group.id)).flatMap(
    (group) => group.keys,
  );
}
