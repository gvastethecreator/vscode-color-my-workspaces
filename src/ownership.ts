import {
  MANAGED_COLOR_REGISTRY_VERSION,
  managedGroupForKey,
  type ChromeElement,
} from "./managedKeys.ts";

export type ColorCustomizations = Record<string, unknown>;
export type ManagedColors = Record<string, string>;

export interface ManagedColorRecord {
  key: string;
  group: ChromeElement;
  baseline: string | null;
  baselineScope: "workspace";
  capturedAt: string;
  lastWritten: string;
  generation: number;
}

export interface OwnershipState {
  schemaVersion: 1;
  registryVersion: number;
  workspaceIdentity: string;
  generation: number;
  managed: boolean;
  records: Record<string, ManagedColorRecord>;
  blockedKeys: string[];
}

export interface OwnershipConflict {
  key: string;
  group: ChromeElement;
  expected: string;
  actual: string | null;
  operation: "apply" | "restore";
}

export interface OwnershipPlan {
  basis: ColorCustomizations | undefined;
  value: ColorCustomizations | undefined;
  state: OwnershipState;
  conflicts: OwnershipConflict[];
  changed: boolean;
}

export function createOwnershipState(workspaceIdentity: string): OwnershipState {
  return {
    schemaVersion: 1,
    registryVersion: MANAGED_COLOR_REGISTRY_VERSION,
    workspaceIdentity,
    generation: 0,
    managed: false,
    records: {},
    blockedKeys: [],
  };
}

export function parseOwnershipState(
  value: unknown,
  workspaceIdentity: string,
): OwnershipState | undefined {
  if (!isPlainObject(value) || value.schemaVersion !== 1) {
    return undefined;
  }
  if (
    value.registryVersion !== MANAGED_COLOR_REGISTRY_VERSION ||
    value.workspaceIdentity !== workspaceIdentity ||
    typeof value.generation !== "number" ||
    !Number.isSafeInteger(value.generation) ||
    typeof value.managed !== "boolean" ||
    !isPlainObject(value.records) ||
    !Array.isArray(value.blockedKeys) ||
    !value.blockedKeys.every((key) => typeof key === "string" && managedGroupForKey(key))
  ) {
    return undefined;
  }

  const records: Record<string, ManagedColorRecord> = {};
  for (const [key, raw] of Object.entries(value.records)) {
    const group = managedGroupForKey(key);
    if (!group || !isManagedColorRecord(raw, key, group)) {
      return undefined;
    }
    records[key] = raw;
  }

  return {
    schemaVersion: 1,
    registryVersion: MANAGED_COLOR_REGISTRY_VERSION,
    workspaceIdentity,
    generation: value.generation,
    managed: value.managed,
    records,
    blockedKeys: [...new Set(value.blockedKeys)],
  };
}

export function planManagedColorApply(input: {
  current: ColorCustomizations | undefined;
  desired: ManagedColors;
  state: OwnershipState;
  capturedAt: string;
  forceConflicts?: boolean;
}): OwnershipPlan {
  const current = cloneColorCustomizations(input.current);
  const next = { ...current };
  const records = cloneRecords(input.state.records);
  const blocked = new Set(input.state.blockedKeys);
  const desiredKeys = new Set(Object.keys(input.desired));
  const conflicts: OwnershipConflict[] = [];
  const generation = input.state.generation + 1;
  let ownershipChanged = !input.state.managed;

  for (const [key, record] of Object.entries(records)) {
    if (desiredKeys.has(key)) {
      continue;
    }
    const actual = ownValue(current, key);
    if (actual === record.lastWritten) {
      restoreBaseline(next, record);
    } else {
      conflicts.push({
        key,
        group: record.group,
        expected: record.lastWritten,
        actual: actual ?? null,
        operation: "restore",
      });
    }
    delete records[key];
    blocked.delete(key);
    ownershipChanged = true;
  }

  for (const [key, desiredValue] of Object.entries(input.desired)) {
    const group = managedGroupForKey(key);
    if (!group) {
      continue;
    }
    if (blocked.has(key) && !input.forceConflicts) {
      continue;
    }

    const record = records[key];
    const actual = ownValue(current, key);
    if (actual === undefined) {
      conflicts.push({
        key,
        group,
        expected: record?.lastWritten ?? desiredValue,
        actual: null,
        operation: "apply",
      });
      continue;
    }
    if (record && actual !== record.lastWritten && !input.forceConflicts) {
      conflicts.push({
        key,
        group,
        expected: record.lastWritten,
        actual: actual ?? null,
        operation: "apply",
      });
      continue;
    }

    if (record && actual === record.lastWritten && record.lastWritten === desiredValue) {
      if (blocked.delete(key)) {
        ownershipChanged = true;
      }
      continue;
    }

    const keepsCapturedBaseline = Boolean(record && actual === record.lastWritten);
    const baseline = keepsCapturedBaseline ? record!.baseline : actual;
    next[key] = desiredValue;
    records[key] = {
      key,
      group,
      baseline,
      baselineScope: "workspace",
      capturedAt: keepsCapturedBaseline ? record!.capturedAt : input.capturedAt,
      lastWritten: desiredValue,
      generation,
    };
    blocked.delete(key);
    ownershipChanged = true;
  }

  const value = compact(next);
  return {
    basis: compact(cloneColorCustomizations(current)),
    value,
    state: {
      ...input.state,
      generation: ownershipChanged ? generation : input.state.generation,
      managed: true,
      records,
      blockedKeys: [...blocked].sort(),
    },
    conflicts,
    changed: !sameColorCustomizations(input.current, value),
  };
}

export function planManagedColorClear(input: {
  current: ColorCustomizations | undefined;
  state: OwnershipState;
}): OwnershipPlan {
  const current = cloneColorCustomizations(input.current);
  const next = { ...current };
  const conflicts: OwnershipConflict[] = [];

  for (const record of Object.values(input.state.records)) {
    const actual = ownValue(current, record.key);
    if (actual === record.lastWritten) {
      restoreBaseline(next, record);
    } else {
      conflicts.push({
        key: record.key,
        group: record.group,
        expected: record.lastWritten,
        actual: actual ?? null,
        operation: "restore",
      });
    }
  }

  const value = compact(next);
  return {
    basis: compact(cloneColorCustomizations(current)),
    value,
    state: {
      ...input.state,
      generation: input.state.generation + 1,
      managed: false,
      records: {},
      blockedKeys: [],
    },
    conflicts,
    changed: !sameColorCustomizations(input.current, value),
  };
}

export function keepExternalConflictValues(
  state: OwnershipState,
  conflicts: readonly OwnershipConflict[],
): OwnershipState {
  const records = cloneRecords(state.records);
  const blocked = new Set(state.blockedKeys);
  for (const conflict of conflicts) {
    delete records[conflict.key];
    blocked.add(conflict.key);
  }
  return { ...state, records, blockedKeys: [...blocked].sort() };
}

export function unblockManagedGroups(
  state: OwnershipState,
  groups: readonly ChromeElement[],
): OwnershipState {
  const selected = new Set(groups);
  return {
    ...state,
    blockedKeys: state.blockedKeys.filter((key) => {
      const group = managedGroupForKey(key);
      return !group || !selected.has(group);
    }),
  };
}

export function sameColorCustomizations(
  left: ColorCustomizations | undefined,
  right: ColorCustomizations | undefined,
): boolean {
  const a = left ?? {};
  const b = right ?? {};
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  return (
    aKeys.length === bKeys.length &&
    aKeys.every(
      (key, index) => key === bKeys[index] && JSON.stringify(a[key]) === JSON.stringify(b[key]),
    )
  );
}

function isManagedColorRecord(
  value: unknown,
  key: string,
  group: ChromeElement,
): value is ManagedColorRecord {
  return (
    isPlainObject(value) &&
    value.key === key &&
    value.group === group &&
    (value.baseline === null || typeof value.baseline === "string") &&
    value.baselineScope === "workspace" &&
    typeof value.capturedAt === "string" &&
    typeof value.lastWritten === "string" &&
    Number.isSafeInteger(value.generation)
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneRecords(
  records: Record<string, ManagedColorRecord>,
): Record<string, ManagedColorRecord> {
  return Object.fromEntries(
    Object.entries(records).map(([key, record]) => [key, { ...record }]),
  );
}

function cloneColorCustomizations(
  value: ColorCustomizations | undefined,
): ColorCustomizations {
  return structuredClone(value ?? {});
}

function ownValue(value: ColorCustomizations, key: string): string | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(value, key)) {
    return null;
  }
  return typeof value[key] === "string" ? value[key] : undefined;
}

function restoreBaseline(value: ColorCustomizations, record: ManagedColorRecord): void {
  if (record.baseline === null) {
    delete value[record.key];
  } else {
    value[record.key] = record.baseline;
  }
}

function compact(value: ColorCustomizations): ColorCustomizations | undefined {
  return Object.keys(value).length > 0 ? value : undefined;
}
