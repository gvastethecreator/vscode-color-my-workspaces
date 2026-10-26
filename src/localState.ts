import { WORKSPACE_IDENTITY_VERSION } from "./identity.ts";
import { MANAGED_COLOR_REGISTRY_VERSION, managedGroupForKey } from "./managedKeys.ts";
import {
  createOwnershipState,
  parseOwnershipState,
  type ColorCustomizations,
  type ManagedColors,
  type OwnershipState,
} from "./ownership.ts";

export const LOCAL_STATE_SCHEMA_VERSION = 2;

export interface ModernUiChangeRecord {
  target: "workspace" | "global";
  previousValue: boolean | null;
  lastWritten: boolean;
}

export interface WorkspaceLocalState {
  schemaVersion: 2;
  identityVersion: number;
  workspaceIdentity: string;
  legacyIdentity?: string;
  disabled: boolean;
  onboardingCompleted: boolean;
  legacyAutoApply: boolean;
  previousColor?: string;
  migratedColor?: string;
  ownership: OwnershipState;
  modernUiChange?: ModernUiChangeRecord;
}

export function createWorkspaceLocalState(
  workspaceIdentity: string,
  legacyIdentity?: string,
): WorkspaceLocalState {
  return {
    schemaVersion: LOCAL_STATE_SCHEMA_VERSION,
    identityVersion: WORKSPACE_IDENTITY_VERSION,
    workspaceIdentity,
    legacyIdentity,
    disabled: false,
    onboardingCompleted: false,
    legacyAutoApply: false,
    ownership: createOwnershipState(workspaceIdentity),
  };
}

export function parseWorkspaceLocalState(
  value: unknown,
  workspaceIdentity: string,
  legacyIdentity?: string,
): WorkspaceLocalState | undefined {
  if (!isPlainObject(value) || value.schemaVersion !== LOCAL_STATE_SCHEMA_VERSION) {
    return undefined;
  }
  const storedIdentity = typeof value.workspaceIdentity === "string" ? value.workspaceIdentity : "";
  const identityMatches = storedIdentity === workspaceIdentity;
  const legacyMatches = Boolean(legacyIdentity && storedIdentity === legacyIdentity);
  if (!identityMatches && !legacyMatches) {
    return undefined;
  }
  if (
    typeof value.disabled !== "boolean" ||
    typeof value.onboardingCompleted !== "boolean" ||
    typeof value.legacyAutoApply !== "boolean" ||
    (value.previousColor !== undefined && typeof value.previousColor !== "string") ||
    (value.migratedColor !== undefined && typeof value.migratedColor !== "string")
  ) {
    return undefined;
  }
  const ownership = parseOwnershipState(value.ownership, storedIdentity);
  if (!ownership) {
    return undefined;
  }
  const modernUiChange = parseModernUiChange(value.modernUiChange);
  if (value.modernUiChange !== undefined && !modernUiChange) {
    return undefined;
  }

  return {
    schemaVersion: LOCAL_STATE_SCHEMA_VERSION,
    identityVersion: WORKSPACE_IDENTITY_VERSION,
    workspaceIdentity,
    legacyIdentity:
      typeof value.legacyIdentity === "string"
        ? value.legacyIdentity
        : legacyMatches
          ? storedIdentity
          : legacyIdentity,
    disabled: value.disabled,
    onboardingCompleted: value.onboardingCompleted,
    legacyAutoApply: value.legacyAutoApply,
    previousColor: value.previousColor,
    migratedColor: value.migratedColor,
    ownership: { ...ownership, workspaceIdentity },
    modernUiChange,
  };
}

export function rebindWorkspaceLocalState(
  value: unknown,
  workspaceIdentity: string,
  legacyIdentity?: string,
): WorkspaceLocalState | undefined {
  if (!isPlainObject(value) || typeof value.workspaceIdentity !== "string") {
    return undefined;
  }
  const storedLegacyIdentity =
    typeof value.legacyIdentity === "string" ? value.legacyIdentity : undefined;
  const parsed = parseWorkspaceLocalState(
    value,
    value.workspaceIdentity,
    storedLegacyIdentity,
  );
  if (!parsed) {
    return undefined;
  }
  return {
    ...parsed,
    workspaceIdentity,
    legacyIdentity: storedLegacyIdentity ?? legacyIdentity,
    ownership: {
      ...parsed.ownership,
      workspaceIdentity,
    },
  };
}

export function migrateLegacyWorkspaceState(input: {
  workspaceIdentity: string;
  legacyIdentity?: string;
  disabled: boolean;
  previousColor?: string;
  legacyColor?: string;
  current: ColorCustomizations | undefined;
  expectedLegacyColors: ManagedColors | undefined;
  capturedAt: string;
}): WorkspaceLocalState {
  const state = createWorkspaceLocalState(input.workspaceIdentity, input.legacyIdentity);
  const records: OwnershipState["records"] = {};
  for (const [key, expected] of Object.entries(input.expectedLegacyColors ?? {})) {
    const group = managedGroupForKey(key);
    if (!group || input.current?.[key] !== expected) {
      continue;
    }
    records[key] = {
      key,
      group,
      baseline: null,
      baselineScope: "workspace",
      capturedAt: input.capturedAt,
      lastWritten: expected,
      generation: 0,
    };
  }
  const legacyManaged = !input.disabled && Object.keys(records).length > 0;
  return {
    ...state,
    disabled: input.disabled,
    onboardingCompleted: legacyManaged || input.disabled,
    legacyAutoApply: legacyManaged,
    previousColor: input.previousColor,
    migratedColor: legacyManaged ? input.legacyColor : undefined,
    ownership: {
      ...state.ownership,
      registryVersion: MANAGED_COLOR_REGISTRY_VERSION,
      managed: legacyManaged,
      records,
    },
  };
}

function parseModernUiChange(value: unknown): ModernUiChangeRecord | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    !isPlainObject(value) ||
    (value.target !== "workspace" && value.target !== "global") ||
    (value.previousValue !== null && typeof value.previousValue !== "boolean") ||
    typeof value.lastWritten !== "boolean"
  ) {
    return undefined;
  }
  return {
    target: value.target,
    previousValue: value.previousValue,
    lastWritten: value.lastWritten,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
