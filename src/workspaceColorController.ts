import * as vscode from "vscode";
import {
  ALL_CHROME_ELEMENTS,
  buildChromeColors,
  flagsToElements,
  type ChromeFlags,
} from "./chrome.ts";
import { colorFromIdentity, contrastForeground, normalizeHex, randomWorkspaceColor } from "./color.ts";
import {
  describeChromeCompatibility,
  detectChromeCompatibility,
  resolveActivityBarFlag,
} from "./compatibility.ts";
import { DEFAULT_STATUS_ICON, parseCodiconId } from "./icons.ts";
import {
  legacyWorkspaceIdentity,
  projectDisplayName,
  workspaceIdentity,
  type WorkspaceUri,
} from "./identity.ts";
import {
  createWorkspaceLocalState,
  migrateLegacyWorkspaceState,
  parseWorkspaceLocalState,
  rebindWorkspaceLocalState,
  type WorkspaceLocalState,
} from "./localState.ts";
import {
  keepExternalConflictValues,
  planManagedColorApply,
  planManagedColorClear,
  sameColorCustomizations,
  unblockManagedGroups,
  type ColorCustomizations,
  type ManagedColors,
  type OwnershipConflict,
  type OwnershipPlan,
} from "./ownership.ts";
import { PALETTE } from "./palette.ts";
import { openColorPanel, postPanelState } from "./panel.ts";
import { SUPPORT_URL, type PanelMessage } from "./panelMessages.ts";
import {
  chromeTones,
  parseStatusBarClick,
  type PanelState,
  type StatusBarClick,
} from "./panelState.ts";
import { pickCodicon, pickPaletteColor, pickStatusAction } from "./quickActions.ts";
import { StatusController } from "./statusController.ts";
import {
  buildStatusPresentation,
  formatStatusBarText,
  statusChipColor,
} from "./statusDisplay.ts";
import { SerializedWriteQueue } from "./writeQueue.ts";

const LOCAL_STATE_KEY = "workspaceColor.localState";
const LEGACY_DISABLED_KEY = "workspaceColor.disabled";
const LEGACY_PREVIOUS_COLOR_KEY = "workspaceColor.previousColor";
const WELCOME_KEY = "workspaceColor.didShowWelcome";
const MODERN_UI_SETTING = "experimental.modernUI";
const TARGET = vscode.ConfigurationTarget.Workspace;
const WORKSPACE_COLOR_SETTING_KEYS = [
  "color",
  "label",
  "showStatusBarLabel",
  "icon",
  "showStatusBarIcon",
  "statusBarClick",
  "autoApply",
  "identity",
  "stepped",
  "titleBar",
  "activityBar",
  "statusBar",
  "commandCenter",
] as const;

const DEFAULT_SETTING_KEYS = WORKSPACE_COLOR_SETTING_KEYS.filter(
  (key) => key !== "color" && key !== "label" && key !== "identity",
);

type ConflictChoice = "keep" | "reapply" | "stop";

export class WorkspaceColorController implements vscode.Disposable {
  private readonly writes = new SerializedWriteQueue();
  private localState: WorkspaceLocalState | undefined;
  private localStateIdentity: string | undefined;
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;
  private welcomeQueued = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly status: StatusController,
  ) {}

  async initialize(): Promise<void> {
    await this.ensureLocalState();
    await this.writes.enqueue(() => this.refreshNow(), { coalesceKey: "refresh" });
  }

  dispose(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      void this.writes
        .enqueue(() => this.refreshNow(), { coalesceKey: "refresh" })
        .catch(() => this.showWriteError());
    }, 40);
  }

  async openPanel(): Promise<void> {
    await this.ensureLocalState();
    openColorPanel(
      this.context,
      () => this.panelState(),
      (message) => this.handlePanelMessage(message),
    );
  }

  async runQuickActions(): Promise<void> {
    if (!this.requireWorkspace()) {
      return;
    }
    const state = await this.ensureLocalState();
    const action = await pickStatusAction({
      palette: PALETTE,
      currentColor: this.currentColor(state),
      showStatusBarLabel: this.showStatusBarLabel(),
      showStatusBarIcon: this.showStatusBarIcon(),
      applied: Boolean(state?.ownership.managed && !state.disabled),
      conflictCount: state?.ownership.blockedKeys.length ?? 0,
    });
    if (!action) {
      return;
    }
    switch (action.type) {
      case "color":
        await this.applySelectedColor(action.color);
        return;
      case "surprise":
        await this.runSurprise();
        return;
      case "folder":
        await this.runApplyFromFolder();
        return;
      case "copy":
        await this.copyColor(this.currentColor(state));
        return;
      case "settings":
        await this.openPanel();
        return;
      case "toggleLabel":
        await this.updateSetting("showStatusBarLabel", !this.showStatusBarLabel());
        return;
      case "toggleIcon":
        await this.setStatusBarIconVisible(!this.showStatusBarIcon());
        return;
      case "pickIcon":
        await this.runPickIcon();
        return;
      case "reapply":
        await this.runReapply();
        return;
      case "reset":
        await this.runClear();
        return;
    }
  }

  async runPick(): Promise<void> {
    if (!this.requireWorkspace()) {
      return;
    }
    const state = await this.ensureLocalState();
    const color = await pickPaletteColor(PALETTE, this.currentColor(state));
    if (color) {
      await this.applySelectedColor(color);
    }
  }

  async runApplyFromFolder(): Promise<void> {
    if (!this.requireWorkspace()) {
      return;
    }
    const identity = this.currentWorkspaceIdentity();
    if (!identity) {
      await vscode.window.showWarningMessage("Open a folder or saved workspace first.");
      return;
    }
    await this.applySelectedColor(colorFromIdentity(identity));
  }

  async runSurprise(): Promise<void> {
    if (!this.requireWorkspace()) {
      return;
    }
    const state = await this.ensureLocalState();
    const previous = this.currentColor(state);
    const next = randomWorkspaceColor();
    await this.writes.enqueue(async () => {
      const latest = await this.ensureLocalState();
      if (latest) {
        latest.previousColor = previous;
        await this.saveLocalState(latest);
      }
      await this.applySelectedColorNow(next);
    });
    const undo = "Undo";
    const choice = await vscode.window.showInformationMessage(`Color set to ${next}`, undo);
    if (choice === undo && previous) {
      await this.applySelectedColor(previous);
    }
  }

  async runClear(): Promise<void> {
    if (!this.requireWorkspace()) {
      return;
    }
    const state = await this.ensureLocalState();
    if (!state?.ownership.managed && !state?.disabled) {
      return;
    }
    const restoreCount = Object.keys(state.ownership.records).length;
    const confirm = "Clear workspace color";
    const choice = await vscode.window.showWarningMessage(
      restoreCount > 0
        ? `Clear this workspace color and restore ${restoreCount} captured color ${restoreCount === 1 ? "value" : "values"}? External changes will be kept.`
        : "Clear this workspace color? External color settings will be kept.",
      { modal: true },
      confirm,
    );
    if (choice !== confirm) {
      return;
    }
    await this.writes.enqueue(() => this.clearNow());
  }

  async runResetSettings(): Promise<void> {
    if (!this.requireWorkspace()) {
      return;
    }
    const confirm = "Reset settings";
    const choice = await vscode.window.showWarningMessage(
      "Reset Color My Workspaces settings for this workspace, restore captured colors, and keep unrelated or externally changed workbench colors?",
      { modal: true },
      confirm,
    );
    if (choice !== confirm) {
      return;
    }
    await this.writes.enqueue(async () => {
      const cleared = await this.clearNow(false);
      if (!cleared) {
        return;
      }
      await this.restoreModernUiChange(false);
      const configuration = vscode.workspace.getConfiguration("workspaceColor");
      for (const key of WORKSPACE_COLOR_SETTING_KEYS) {
        await configuration.update(key, undefined, TARGET);
      }
      const identity = this.currentWorkspaceIdentity();
      if (identity) {
        const reset = createWorkspaceLocalState(identity, this.currentLegacyIdentity());
        reset.disabled = true;
        reset.onboardingCompleted = true;
        await this.saveLocalState(reset);
      }
      await this.refreshPresentation();
    });
  }

  async runSetDefaults(): Promise<void> {
    const confirm = "Set defaults";
    const choice = await vscode.window.showWarningMessage(
      "Set Color My Workspaces defaults for all workspaces? This workspace color is not changed.",
      { modal: true },
      confirm,
    );
    if (choice !== confirm) {
      return;
    }
    await this.writes.enqueue(async () => {
      const configuration = vscode.workspace.getConfiguration("workspaceColor");
      const targets: vscode.ConfigurationTarget[] = [vscode.ConfigurationTarget.Global];
      if (this.hasWorkspace()) {
        targets.push(vscode.ConfigurationTarget.Workspace);
      }
      for (const key of DEFAULT_SETTING_KEYS) {
        const value = configuration.inspect(key)?.defaultValue;
        for (const target of targets) {
          await configuration.update(key, value, target);
        }
      }
      await this.refreshNow();
    });
  }

  async runReapply(): Promise<void> {
    if (!this.requireWorkspace()) {
      return;
    }
    const state = await this.ensureLocalState();
    const color = this.currentColor(state);
    if (!state || !color) {
      return;
    }
    const count = state.ownership.blockedKeys.length;
    const confirm = "Reapply workspace color";
    const choice = await vscode.window.showWarningMessage(
      count > 0
        ? `Reapply this workspace color to ${count} externally changed ${count === 1 ? "key" : "keys"}? Their current values will become the new restore baseline.`
        : "Reapply this workspace color and take ownership of its enabled surfaces?",
      { modal: true },
      confirm,
    );
    if (choice !== confirm) {
      return;
    }
    await this.writes.enqueue(async () => {
      const latest = await this.ensureLocalState();
      if (!latest) {
        return;
      }
      latest.ownership = unblockManagedGroups(latest.ownership, ALL_CHROME_ELEMENTS);
      latest.disabled = false;
      latest.onboardingCompleted = true;
      await this.saveLocalState(latest);
      await this.paintNow(color, { forceConflicts: true, explicit: true });
    });
  }

  async handlePanelMessage(message: PanelMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        postPanelState(this.panelState());
        return;
      case "setColor":
        await this.applySelectedColor(message.color);
        return;
      case "setLabel":
        await this.updateSetting("label", normalizeLabel(message.label) || undefined);
        return;
      case "setShowStatusBarLabel":
        await this.updateSetting("showStatusBarLabel", message.enabled);
        return;
      case "setShowStatusBarIcon":
        await this.setStatusBarIconVisible(message.enabled);
        return;
      case "setStatusBarClick":
        await this.updateSetting("statusBarClick", message.target);
        return;
      case "setIcon":
        await this.setStatusBarIcon(message.icon);
        return;
      case "setFlag":
        await this.updateSetting(message.element, message.enabled);
        return;
      case "setStepped":
        await this.updateSetting("stepped", message.enabled);
        return;
      case "setAutoApply":
        await this.updateAutoApply(message.enabled);
        return;
      case "applyFromFolder":
        await this.runApplyFromFolder();
        return;
      case "surprise":
        await this.runSurprise();
        return;
      case "reset":
        await this.runClear();
        return;
      case "resetSettings":
        await this.runResetSettings();
        return;
      case "setDefaults":
        await this.runSetDefaults();
        return;
      case "copyHex":
        await this.copyColor(message.color);
        return;
      case "setSeparateBars":
        await this.setSeparateBars(message.enabled);
        return;
      case "openUrl":
        await vscode.env.openExternal(vscode.Uri.parse(SUPPORT_URL));
        return;
    }
  }

  private async refreshNow(): Promise<void> {
    const state = await this.ensureLocalState();
    await this.refreshPresentation();
    if (
      !state ||
      state.disabled ||
      (!state.ownership.managed && !this.shouldAutoApply())
    ) {
      return;
    }
    const color = this.currentColor(state);
    if (color) {
      await this.paintNow(color, { explicit: false });
    }
  }

  private async applySelectedColor(color: string): Promise<void> {
    await this.writes.enqueue(() => this.applySelectedColorNow(color));
  }

  private async applySelectedColorNow(color: string): Promise<void> {
    const normalized = normalizeHex(color);
    const state = await this.ensureLocalState();
    if (!normalized || !state) {
      return;
    }
    state.disabled = false;
    state.onboardingCompleted = true;
    state.legacyAutoApply = false;
    state.migratedColor = undefined;
    state.ownership = unblockManagedGroups(state.ownership, ALL_CHROME_ELEMENTS);
    await vscode.workspace.getConfiguration("workspaceColor").update("color", normalized, TARGET);
    await this.saveLocalState(state);
    const painted = await this.paintNow(normalized, { explicit: true });
    if (painted) {
      await this.maybeShowWelcome();
    }
  }

  private async paintNow(
    color: string,
    options: { explicit: boolean; forceConflicts?: boolean },
  ): Promise<boolean> {
    const state = await this.ensureLocalState();
    if (!state) {
      return false;
    }
    const stateBefore = JSON.stringify(state);
    const desired = this.isHighContrast() ? {} : this.buildCurrentChrome(color);
    const originalOwnership = state.ownership;
    let plan = planManagedColorApply({
      current: this.readColorCustomizations(),
      desired,
      state: originalOwnership,
      capturedAt: new Date().toISOString(),
      forceConflicts: options.forceConflicts,
    });

    if (plan.conflicts.length > 0 && !options.forceConflicts) {
      const choice = await this.chooseConflictResolution(plan.conflicts);
      if (choice === "reapply") {
        plan = planManagedColorApply({
          current: this.readColorCustomizations(),
          desired,
          state: originalOwnership,
          capturedAt: new Date().toISOString(),
          forceConflicts: true,
        });
      } else if (choice === "stop") {
        const groups = [...new Set(plan.conflicts.map((conflict) => conflict.group))];
        const kept = keepExternalConflictValues(originalOwnership, plan.conflicts);
        state.ownership = kept;
        const configuration = vscode.workspace.getConfiguration("workspaceColor");
        for (const group of groups) {
          await configuration.update(group, false, TARGET);
        }
        plan = planManagedColorApply({
          current: this.readColorCustomizations(),
          desired: this.isHighContrast() ? {} : this.buildCurrentChrome(color),
          state: state.ownership,
          capturedAt: new Date().toISOString(),
        });
        if (plan.conflicts.length > 0) {
          plan = { ...plan, state: keepExternalConflictValues(plan.state, plan.conflicts) };
        }
      } else {
        plan = { ...plan, state: keepExternalConflictValues(plan.state, plan.conflicts) };
      }
    }

    const applied = await this.applyOwnershipPlan(state, plan, options.explicit);
    if (applied) {
      state.disabled = false;
      state.onboardingCompleted = state.onboardingCompleted || options.explicit;
      if (JSON.stringify(state) !== stateBefore) {
        await this.saveLocalState(state);
      }
      await this.refreshPresentation();
    }
    return applied;
  }

  private async applyOwnershipPlan(
    state: WorkspaceLocalState,
    plan: OwnershipPlan,
    notifyIfStale: boolean,
  ): Promise<boolean> {
    if (!sameColorCustomizations(this.readColorCustomizations(), plan.basis)) {
      if (notifyIfStale) {
        await vscode.window.showWarningMessage(
          "Workspace color settings changed while this action was open. Nothing was overwritten; try again.",
        );
      }
      this.scheduleRefresh();
      return false;
    }
    if (plan.changed) {
      try {
        await vscode.workspace
          .getConfiguration("workbench")
          .update("colorCustomizations", plan.value, TARGET);
      } catch {
        await this.showWriteError();
        return false;
      }
      const verified = this.readColorCustomizations();
      if (!sameColorCustomizations(verified, plan.value)) {
        await vscode.window.showErrorMessage(
          "Color My Workspaces could not verify the final workspace color settings.",
        );
        return false;
      }
    }
    state.ownership = plan.state;
    return true;
  }

  private async clearNow(clearColorSetting = true): Promise<boolean> {
    const state = await this.ensureLocalState();
    if (!state) {
      return false;
    }
    const plan = planManagedColorClear({
      current: this.readColorCustomizations(),
      state: state.ownership,
    });
    const applied = await this.applyOwnershipPlan(state, plan, true);
    if (!applied) {
      return false;
    }
    state.disabled = true;
    state.legacyAutoApply = false;
    state.migratedColor = undefined;
    state.onboardingCompleted = true;
    if (clearColorSetting) {
      await vscode.workspace.getConfiguration("workspaceColor").update("color", undefined, TARGET);
    }
    await this.saveLocalState(state);
    if (plan.conflicts.length > 0) {
      void vscode.window.showInformationMessage(
        `${plan.conflicts.length} external color ${plan.conflicts.length === 1 ? "change was" : "changes were"} preserved while clearing.`,
      );
    }
    await this.refreshPresentation();
    return true;
  }

  private async chooseConflictResolution(
    conflicts: readonly OwnershipConflict[],
  ): Promise<ConflictChoice> {
    const groups = [...new Set(conflicts.map((conflict) => conflict.group))];
    const message = `${conflicts.length} externally changed color ${conflicts.length === 1 ? "key affects" : "keys affect"} ${groups.join(", ")}.`;
    const keep = "Keep external values";
    const reapply = "Reapply workspace color";
    const stop = "Stop managing affected surfaces";
    const choice = await vscode.window.showWarningMessage(message, keep, reapply, stop);
    if (choice === reapply) {
      return "reapply";
    }
    if (choice === stop) {
      return "stop";
    }
    return "keep";
  }

  private async updateSetting(key: string, value: unknown): Promise<void> {
    if (!this.requireWorkspace()) {
      return;
    }
    await this.writes.enqueue(async () => {
      await vscode.workspace.getConfiguration("workspaceColor").update(key, value, TARGET);
      await this.refreshNow();
    });
  }

  private async updateAutoApply(enabled: boolean): Promise<void> {
    await this.writes.enqueue(async () => {
      const state = await this.ensureLocalState();
      if (!state) {
        return;
      }
      state.legacyAutoApply = false;
      await vscode.workspace.getConfiguration("workspaceColor").update("autoApply", enabled, TARGET);
      await this.saveLocalState(state);
      await this.refreshNow();
    });
  }

  private async setStatusBarIconVisible(enabled: boolean): Promise<void> {
    await this.writes.enqueue(async () => {
      const configuration = vscode.workspace.getConfiguration("workspaceColor");
      await configuration.update("showStatusBarIcon", enabled, TARGET);
      if (enabled && !this.currentStatusIcon()) {
        await configuration.update("icon", DEFAULT_STATUS_ICON, TARGET);
      }
      await this.refreshNow();
    });
  }

  private async setStatusBarIcon(raw: string): Promise<void> {
    const icon = parseCodiconId(raw);
    if (!icon || !this.requireWorkspace()) {
      return;
    }
    await this.writes.enqueue(async () => {
      const configuration = vscode.workspace.getConfiguration("workspaceColor");
      await configuration.update("icon", icon, TARGET);
      await configuration.update("showStatusBarIcon", true, TARGET);
      await this.refreshNow();
    });
  }

  private async runPickIcon(): Promise<void> {
    if (!this.requireWorkspace()) {
      return;
    }
    const icon = await pickCodicon(this.currentStatusIcon() ?? DEFAULT_STATUS_ICON);
    if (icon) {
      await this.setStatusBarIcon(icon);
    }
  }

  private async setSeparateBars(separate: boolean): Promise<void> {
    if (!this.requireWorkspace()) {
      return;
    }
    await this.writes.enqueue(async () => {
      const state = await this.ensureLocalState();
      if (!state) {
        return;
      }
      if (!separate && state.modernUiChange) {
        await this.restoreModernUiChange(true);
        await this.refreshNow();
        return;
      }
      const desiredModernUi = !separate;
      if (this.modernUiValue() === desiredModernUi) {
        await this.refreshPresentation();
        return;
      }
      const exactScope = "this workspace";
      const confirm = desiredModernUi ? "Enable for this workspace" : "Disable for this workspace";
      const choice = await vscode.window.showWarningMessage(
        `${desiredModernUi ? "Enable" : "Disable"} the experimental VS Code Modern UI setting for ${exactScope}? VS Code must reload before all shell changes are visible.`,
        { modal: true },
        confirm,
      );
      if (choice !== confirm) {
        await this.refreshPresentation();
        return;
      }
      const written = await this.writeModernUiSetting(desiredModernUi, state);
      if (!written) {
        await this.refreshPresentation();
        return;
      }
      const reload = "Reload Window";
      const reloadChoice = await vscode.window.showInformationMessage(
        "Modern UI changed. Reload the window to apply the shell layout.",
        reload,
      );
      if (reloadChoice === reload) {
        await vscode.commands.executeCommand("workbench.action.reloadWindow");
      }
      await this.refreshNow();
    });
  }

  private async writeModernUiSetting(
    enabled: boolean,
    state: WorkspaceLocalState,
  ): Promise<boolean> {
    const configuration = vscode.workspace.getConfiguration("workbench");
    const inspected = configuration.inspect<boolean>(MODERN_UI_SETTING);
    const workspacePrevious = inspected?.workspaceValue ?? null;
    try {
      await configuration.update(MODERN_UI_SETTING, enabled, TARGET);
      state.modernUiChange = {
        target: "workspace",
        previousValue: workspacePrevious,
        lastWritten: enabled,
      };
      await this.saveLocalState(state);
      return true;
    } catch {
      const confirm = "Change all VS Code windows";
      const choice = await vscode.window.showWarningMessage(
        `VS Code rejected workspace scope. Change the experimental Modern UI setting for all VS Code windows instead?`,
        { modal: true },
        confirm,
      );
      if (choice !== confirm) {
        return false;
      }
      const globalPrevious = inspected?.globalValue ?? null;
      try {
        await configuration.update(MODERN_UI_SETTING, enabled, vscode.ConfigurationTarget.Global);
        state.modernUiChange = {
          target: "global",
          previousValue: globalPrevious,
          lastWritten: enabled,
        };
        await this.saveLocalState(state);
        return true;
      } catch {
        await vscode.window.showErrorMessage("Could not change the experimental Modern UI setting.");
        return false;
      }
    }
  }

  private async restoreModernUiChange(confirm: boolean): Promise<boolean> {
    const state = await this.ensureLocalState();
    const record = state?.modernUiChange;
    if (!state || !record) {
      return true;
    }
    const configuration = vscode.workspace.getConfiguration("workbench");
    const inspected = configuration.inspect<boolean>(MODERN_UI_SETTING);
    const current = record.target === "workspace" ? inspected?.workspaceValue : inspected?.globalValue;
    if (current !== record.lastWritten) {
      await vscode.window.showWarningMessage(
        "Modern UI changed outside Color My Workspaces. Its current value was preserved.",
      );
      state.modernUiChange = undefined;
      await this.saveLocalState(state);
      return false;
    }
    if (confirm) {
      const action = "Restore previous value";
      const choice = await vscode.window.showWarningMessage(
        `Restore the previous experimental Modern UI value at ${record.target} scope?`,
        { modal: true },
        action,
      );
      if (choice !== action) {
        return false;
      }
    }
    const target =
      record.target === "workspace"
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;
    await configuration.update(
      MODERN_UI_SETTING,
      record.previousValue === null ? undefined : record.previousValue,
      target,
    );
    state.modernUiChange = undefined;
    await this.saveLocalState(state);
    return true;
  }

  private async copyColor(color: string | undefined): Promise<void> {
    if (!color) {
      await vscode.window.showWarningMessage("No workspace color to copy.");
      return;
    }
    await vscode.env.clipboard.writeText(color);
    vscode.window.setStatusBarMessage(`Copied ${color}`, 2500);
  }

  private async ensureLocalState(): Promise<WorkspaceLocalState | undefined> {
    const identity = this.currentWorkspaceIdentity();
    if (!identity) {
      this.localState = undefined;
      this.localStateIdentity = undefined;
      return undefined;
    }
    if (this.localState && this.localStateIdentity === identity) {
      return this.localState;
    }

    const legacyIdentity = this.currentLegacyIdentity();
    const stored = this.context.workspaceState.get<unknown>(LOCAL_STATE_KEY);
    const parsed = parseWorkspaceLocalState(stored, identity, legacyIdentity);
    if (parsed) {
      this.localState = parsed;
      this.localStateIdentity = identity;
      if (parsed.workspaceIdentity !== (stored as { workspaceIdentity?: string })?.workspaceIdentity) {
        await this.saveLocalState(parsed);
      }
      return parsed;
    }

    const rebound = rebindWorkspaceLocalState(stored, identity, legacyIdentity);
    if (rebound) {
      this.localState = rebound;
      this.localStateIdentity = identity;
      await this.saveLocalState(rebound);
      return rebound;
    }

    const savedColor = this.currentSavedColor();
    const legacyColor = savedColor ?? (legacyIdentity ? colorFromIdentity(legacyIdentity) : undefined);
    const migrated = migrateLegacyWorkspaceState({
      workspaceIdentity: identity,
      legacyIdentity,
      disabled: this.context.workspaceState.get<boolean>(LEGACY_DISABLED_KEY) === true,
      previousColor: this.context.workspaceState.get<string>(LEGACY_PREVIOUS_COLOR_KEY),
      legacyColor,
      current: this.readColorCustomizations(),
      expectedLegacyColors: legacyColor ? this.buildCurrentChrome(legacyColor) : undefined,
      capturedAt: new Date().toISOString(),
    });
    this.localState = migrated;
    this.localStateIdentity = identity;
    await this.saveLocalState(migrated);
    await Promise.all([
      this.context.workspaceState.update(LEGACY_DISABLED_KEY, undefined),
      this.context.workspaceState.update(LEGACY_PREVIOUS_COLOR_KEY, undefined),
    ]);
    return migrated;
  }

  private async saveLocalState(state: WorkspaceLocalState): Promise<void> {
    this.localState = state;
    this.localStateIdentity = state.workspaceIdentity;
    await this.context.workspaceState.update(LOCAL_STATE_KEY, state);
  }

  private readColorCustomizations(): ColorCustomizations | undefined {
    const inspected = vscode.workspace
      .getConfiguration("workbench")
      .inspect<ColorCustomizations>("colorCustomizations");
    const workspaceValue = inspected?.workspaceValue;
    return workspaceValue && typeof workspaceValue === "object" && !Array.isArray(workspaceValue)
      ? { ...workspaceValue }
      : undefined;
  }

  private buildCurrentChrome(color: string): ManagedColors {
    const compatibility = this.chromeCompatibility();
    return buildChromeColors(color, flagsToElements(this.readFlags()), {
      stepped: vscode.workspace.getConfiguration("workspaceColor").get("stepped", true),
      modernUi: compatibility.mode === "modern",
    });
  }

  private readFlags(): ChromeFlags {
    const configuration = vscode.workspace.getConfiguration("workspaceColor");
    const activityBarLocation = vscode.workspace
      .getConfiguration("workbench")
      .get<string>("activityBar.location");
    return {
      titleBar: configuration.get("titleBar", true),
      activityBar: resolveActivityBarFlag({
        override: this.explicitBooleanSetting("activityBar"),
        modernUi: this.modernUiValue(),
        activityBarLocation,
      }),
      statusBar: configuration.get("statusBar", true),
      commandCenter: configuration.get("commandCenter", true),
    };
  }

  private explicitBooleanSetting(key: string): boolean | undefined {
    const inspected = vscode.workspace.getConfiguration("workspaceColor").inspect<boolean>(key);
    return inspected?.workspaceFolderValue ?? inspected?.workspaceValue ?? inspected?.globalValue;
  }

  private shouldAutoApply(): boolean {
    return this.explicitBooleanSetting("autoApply") ?? true;
  }

  private currentSavedColor(): string | undefined {
    const raw = vscode.workspace.getConfiguration("workspaceColor").get<string>("color", "");
    return raw ? normalizeHex(raw) : undefined;
  }

  private currentColor(state = this.localState): string | undefined {
    const saved = this.currentSavedColor();
    if (saved) {
      return saved;
    }
    if (state?.migratedColor) {
      return normalizeHex(state.migratedColor);
    }
    const identity = this.currentWorkspaceIdentity();
    return identity ? colorFromIdentity(identity) : undefined;
  }

  private currentWorkspaceIdentity(): string | undefined {
    const override = vscode.workspace.getConfiguration("workspaceColor").get<string>("identity", "");
    return workspaceIdentity({
      workspaceFile: vscode.workspace.workspaceFile
        ? uriInput(vscode.workspace.workspaceFile)
        : undefined,
      folders: (vscode.workspace.workspaceFolders ?? []).map((folder) => uriInput(folder.uri)),
      override,
      platform: process.platform === "win32" ? "win32" : "posix",
    });
  }

  private currentLegacyIdentity(): string | undefined {
    return legacyWorkspaceIdentity({
      workspaceFile: vscode.workspace.workspaceFile?.fsPath,
      folders: (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath),
    });
  }

  private currentProjectName(): string | undefined {
    return projectDisplayName({
      customLabel: this.customLabel(),
      workspaceName: vscode.workspace.name,
      folders: (vscode.workspace.workspaceFolders ?? []).map((folder) => uriInput(folder.uri)),
    });
  }

  private derivedProjectName(): string | undefined {
    return projectDisplayName({
      workspaceName: vscode.workspace.name,
      folders: (vscode.workspace.workspaceFolders ?? []).map((folder) => uriInput(folder.uri)),
    });
  }

  private customLabel(): string | undefined {
    const value = vscode.workspace.getConfiguration("workspaceColor").get<string>("label", "");
    return normalizeLabel(value) || undefined;
  }

  private showStatusBarLabel(): boolean {
    return vscode.workspace.getConfiguration("workspaceColor").get("showStatusBarLabel", true);
  }

  private showStatusBarIcon(): boolean {
    return vscode.workspace.getConfiguration("workspaceColor").get("showStatusBarIcon", false);
  }

  private currentStatusIcon(): string | undefined {
    return parseCodiconId(vscode.workspace.getConfiguration("workspaceColor").get<string>("icon"));
  }

  private statusBarClickTarget(): StatusBarClick {
    return parseStatusBarClick(
      vscode.workspace.getConfiguration("workspaceColor").get("statusBarClick"),
    );
  }

  private modernUiValue(): boolean | undefined {
    return vscode.workspace.getConfiguration("workbench").get<boolean>(MODERN_UI_SETTING);
  }

  private chromeCompatibility() {
    return detectChromeCompatibility({
      modernUi: this.modernUiValue(),
      activityBarLocation: vscode.workspace
        .getConfiguration("workbench")
        .get<string>("activityBar.location"),
    });
  }

  private isHighContrast(): boolean {
    return (
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast ||
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrastLight
    );
  }

  private panelState(): PanelState {
    const state = this.localState;
    const color = this.currentColor(state) ?? "#3b3b8f";
    const stepped = vscode.workspace.getConfiguration("workspaceColor").get("stepped", true);
    const flags = this.readFlags();
    const compatibility = this.chromeCompatibility();
    const tones = chromeTones(color, stepped);
    const name = this.currentProjectName() ?? "Workspace";
    const hasWorkspace = this.hasWorkspace();
    const applied = Boolean(state?.ownership.managed && !state.disabled && hasWorkspace);
    const highContrast = this.isHighContrast();
    return {
      projectName: name,
      derivedName: this.derivedProjectName() ?? "Workspace",
      color,
      stepped,
      applied,
      hasWorkspace,
      autoApply: this.shouldAutoApply(),
      highContrast,
      conflictCount: state?.ownership.blockedKeys.length ?? 0,
      modernUi: compatibility.mode === "modern",
      chromeNote: describeChromeCompatibility(compatibility),
      flags,
      tones,
      statusPreviewText: formatStatusBarText(name),
      statusForeground: contrastForeground(tones.statusBar),
      chipColor: statusChipColor(color, flags.statusBar && applied ? tones.statusBar : undefined),
      showStatusBarLabel: this.showStatusBarLabel(),
      showStatusBarIcon: this.showStatusBarIcon(),
      statusIcon: this.currentStatusIcon() ?? DEFAULT_STATUS_ICON,
      statusBarClick: this.statusBarClickTarget(),
    };
  }

  private async refreshPresentation(): Promise<void> {
    const state = this.localState;
    const name = this.currentProjectName() ?? "Workspace";
    this.status.update(
      buildStatusPresentation({
        hasWorkspace: this.hasWorkspace(),
        name,
        color: this.currentColor(state),
        icon: this.currentStatusIcon() ?? DEFAULT_STATUS_ICON,
        showName: this.showStatusBarLabel(),
        showIcon: this.showStatusBarIcon(),
        clickTarget: this.statusBarClickTarget(),
      }),
    );
    postPanelState(this.panelState());
  }

  private hasWorkspace(): boolean {
    return Boolean(vscode.workspace.workspaceFile || (vscode.workspace.workspaceFolders?.length ?? 0) > 0);
  }

  private requireWorkspace(): boolean {
    if (this.hasWorkspace()) {
      return true;
    }
    void vscode.window.showWarningMessage("Open a folder or saved workspace first.");
    return false;
  }

  private async maybeShowWelcome(): Promise<void> {
    if (this.welcomeQueued || this.context.globalState.get<boolean>(WELCOME_KEY) === true) {
      return;
    }
    this.welcomeQueued = true;
    await this.context.globalState.update(WELCOME_KEY, true);
    const open = "Open Color My Workspaces Settings";
    void vscode.window
      .showInformationMessage(
        "This workspace is colored. Clear restores the color settings captured before the first apply.",
        open,
      )
      .then((choice) => {
        if (choice === open) {
          void this.openPanel();
        }
      });
  }

  private async showWriteError(): Promise<void> {
    await vscode.window.showErrorMessage("Could not write workspace color settings.");
  }
}

function uriInput(uri: vscode.Uri): WorkspaceUri {
  return { scheme: uri.scheme, authority: uri.authority, path: uri.path };
}

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}
