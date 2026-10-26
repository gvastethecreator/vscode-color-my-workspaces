# Color My Workspaces context

## Purpose

Color My Workspaces assigns a stable, reversible visual identity to one VS Code workspace window.

## Domain terms

- **Workspace identity**: versioned string derived from an explicit override, a saved workspace URI, or sorted folder URIs.
- **Derived color**: deterministic hex color calculated from the workspace identity.
- **Managed color key**: a `workbench.colorCustomizations` key listed in the versioned registry.
- **Surface**: one managed group: title bar, activity bar, Status Bar, or command center.
- **Baseline**: the exact workspace value present before the extension first owns a key; absence is recorded explicitly.
- **Ownership record**: baseline, last written value, surface, capture time, and generation for one key.
- **External change**: a managed key whose current value differs from the extension's last written value.
- **Blocked key**: an external value the user chose to keep; automatic refresh cannot write it.
- **Clear**: stop color management and restore intact baselines while keeping external and unmanaged values.
- **Reset**: Clear plus removal of all extension workspace settings and restoration of an owned Modern UI change.
- **Modern UI**: VS Code's experimental `workbench.experimental.modernUI` setting and its changing shell behavior.
- **Chrome painting**: writing the selected managed color keys. It is suspended in high-contrast themes.

## Invariants

1. Activation alone never writes workspace configuration.
2. Every configuration write is serialized and planned from the latest workspace value.
3. Unmanaged keys are copied through unchanged.
4. A managed key is updated or restored only while its current value matches the last extension write, unless the user explicitly chooses reapply.
5. Clear never treats an external value as extension-owned.
6. No automatic path changes Modern UI or global configuration.
7. Empty windows have no workspace identity and receive no color.
8. High-contrast themes retain text/icon identity and do not receive chrome painting.
9. URI identity preserves non-file scheme, authority, and path semantics; Windows file identity normalizes drive/path case.
10. No document contents, workspace files, environment values, or secrets enter product state or logs.

## State

`workspaceState["workspaceColor.localState"]` uses schema version 2. It contains:

- identity version and current/legacy identity;
- onboarding, disabled, and legacy auto-apply flags;
- migrated and previous colors;
- managed-key ownership state;
- an optional reversible Modern UI change record.

`workspaceColor.color` is the user-visible workspace setting. It can be committed by VS Code when workspace settings are stored in source control. Ownership baselines remain local workspace state.

## Main flows

### Explicit apply

Command or panel → normalize color → save workspace color → build compatible surface colors → plan ownership against latest configuration → resolve conflicts → write only if changed → verify → persist ownership → refresh one Status Bar item and panel.

### Automatic refresh

Configuration/theme/workspace event → 40 ms debounce → serialized/coalesced refresh → no-op when disabled or not yet managed/opted in → rebuild from latest values → skip identical writes.

### Clear

Confirmation → plan restoration → restore only intact records → preserve conflicts/unmanaged values → clear saved color → disable automatic painting → refresh presentation.

### Modern UI

Panel toggle → exact workspace-scope confirmation → write workspace value and record prior value. Only if workspace scope is rejected does a second modal identify all VS Code windows and offer global scope. Restoration proceeds only while the recorded value still matches.

## Public seams

- command ids declared in `package.json`;
- `workspaceColor.*` settings;
- the extension id `gvastethecreator.color-my-workspaces`;
- the documented behavior in `docs/PDR.md` and ADRs.

Internal local-state keys and ownership schemas are migration surfaces, not external APIs.
