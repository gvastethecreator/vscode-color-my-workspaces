# PDR — Color My Workspaces

Repo: `X:\\vscode-extensions\\vscode-color-my-workspaces`
Remote: `gvastethecreator/vscode-color-my-workspaces`
Extension id: `gvastethecreator.color-my-workspaces`

## Status

0.1.0 release candidate · Priority P0

## Product summary

Color My Workspaces gives each VS Code workspace a stable visual identity. It colors selected window-chrome surfaces and keeps one accessible Status Bar control for changing or clearing that identity.

The product is deliberately local-first. It has no telemetry, account, cloud service, workspace scan, document parser, or command execution.

## User jobs

1. Distinguish similar VS Code windows quickly.
2. Derive a stable color from a local, remote, virtual, single-folder, multi-root, or saved-workspace URI.
3. Pick a color, label, icon, and chrome surfaces.
4. Restore pre-existing color customizations safely.
5. Keep third-party or manual color changes instead of overwriting them silently.

## 0.1.0 scope

- automatic first application and reapplication by default, with a per-workspace override;
- title bar, activity bar, Status Bar, and command center color groups;
- deterministic folder/workspace color and bounded palette;
- one Status Bar item with Quick Pick or full-panel click behavior;
- secured settings webview with keyboard paths and text equivalents;
- versioned local ownership, baseline, identity, and legacy 0.0.x migration state;
- conflict detection with keep, reapply, and stop-managing choices;
- reversible Clear and Reset commands;
- high-contrast suspension;
- explicit, reversible handling of VS Code's experimental Modern UI setting;
- Marketplace and Open VSX release automation.

## Lifecycle contract

### First activation

Activation registers commands, derives the stable workspace identity, and applies its color when `workspaceColor.autoApply` has no `false` override. The first managed write captures existing `workbench.colorCustomizations` values before changing them. Clear keeps that workspace disabled until another explicit color action.

### Application

Automatic application, a palette choice, folder color, or Surprise Me may write workspace configuration. VS Code can store that configuration in `.vscode/settings.json` or a `.code-workspace` file, so it may appear in source control.

Before writing a managed color key, the extension captures whether the workspace value was absent or records its exact string value.

### Refresh and conflicts

The extension serializes writes, reads the latest configuration before every plan, skips identical writes, and verifies a written value. If a previously owned key differs from the last extension value, it is an external change.

The user can:

- keep the external value and block automatic writes to that key;
- reapply and use the external value as the new restore baseline;
- stop managing every affected surface.

### Clear and Reset

Clear restores intact baselines and removes the saved color. It preserves unmanaged and externally changed keys.

Reset to Inherited Settings removes explicit preference values in the chosen scope. Use Clear Color to restore owned workbench colors.

Apply Factory Defaults writes preference values in one chosen scope. Color, label, and identity stay local.

## Commands

- `workspaceColor.applyFromFolder`
- `workspaceColor.pick`
- `workspaceColor.quickActions`
- `workspaceColor.surprise`
- `workspaceColor.reset`
- `workspaceColor.resetSettings`
- `workspaceColor.setDefaults`
- `workspaceColor.reapply`
- `workspaceColor.openPanel`

Command ids are public integration points and remain stable.

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `workspaceColor.color` | empty | Saved hex color; empty uses the stable derived color |
| `workspaceColor.autoApply` | `true` | Apply and reapply on workspace open unless overridden |
| `workspaceColor.identity` | empty | Stable identity override for color derivation |
| `workspaceColor.label` | empty | Status Bar name; empty uses the workspace or folder name |
| `workspaceColor.showStatusBarLabel` | `true` | Show the workspace name |
| `workspaceColor.icon` | empty | Status Bar Codicon id |
| `workspaceColor.showStatusBarIcon` | `false` | Show the selected or default icon |
| `workspaceColor.statusBarClick` | `quick` | Open Quick settings or Full settings |
| `workspaceColor.stepped` | `true` | Use a different tone on each surface |
| `workspaceColor.titleBar` | `true` | Color the title bar and window shell |
| `workspaceColor.activityBar` | `true` | Color the activity bar; without an override, disable top/bottom under Modern UI and enable side/classic layouts |
| `workspaceColor.statusBar` | `true` | Color the Status Bar |
| `workspaceColor.commandCenter` | `true` | Color the command center |

All extension settings use workspace-window scope.

## Compatibility

| Environment | Support |
| --- | --- |
| Desktop Node extension host | Full; VS Code 1.134 or newer |
| Web extension host / vscode.dev | No; there is no `browser` entry |
| Virtual Workspaces | Supported through URI identity and configuration APIs |
| Untrusted Workspaces | Supported; no workspace code is read or executed |
| Remote Development | Supported as a UI extension; remote URI authority/path remain part of identity |
| Empty window | Commands explain that a folder or saved workspace is required; no color is applied |
| Windows, macOS, Linux | Supported; CI runs current stable on all three |
| High Contrast / High Contrast Light | Chrome painting is suspended; text/icon identity remains |
| Experimental Modern UI | Best effort, separately detected and documented; never toggled automatically |

Minimum engine support and Modern UI shell behavior are separate contracts. Modern UI is experimental and can change independently of `engines.vscode`.

With no `workspaceColor.activityBar` override, the effective Activity Bar default is off only when Modern UI is enabled and the bar is at the top or bottom. Left, right, classic, and unknown layouts default to on. An explicit boolean always wins.

## Architecture

- `src/workspaceColorController.ts`: orchestration and VS Code configuration boundary;
- `src/ownership.ts`: pure baseline, conflict, apply, and restoration plans;
- `src/managedKeys.ts`: versioned key registry;
- `src/identity.ts`: canonical URI identity and legacy identity;
- `src/localState.ts`: versioned workspace-local migrations;
- `src/writeQueue.ts`: serialization and refresh coalescing;
- `src/compatibility.ts`: structured shell compatibility;
- `src/statusController.ts`: single Status Bar item lifecycle;
- `src/panel.ts`, `src/panelMessages.ts`, `src/panelClient.ts`: secured webview boundary and client.

The release runtime is bundled. There are no production dependencies.

## Security and privacy

- no telemetry or outbound product requests;
- no document contents, workspace files, environment values, secrets, or clipboard bytes are logged;
- clipboard access occurs only after the explicit Copy color action;
- the panel accepts exact runtime-validated messages;
- external URLs use one allowlisted HTTPS repository URL;
- CSP denies everything by default and allows only the bundled style and nonce-bound script;
- no command URIs, shell execution, workspace binary execution, or network fetches;
- Restricted Mode remains supported because the extension only uses configuration and UI APIs.

## Accessibility

- all panel features have keyboard controls and visible focus;
- controls use native labels, status text, validation, and text/hex equivalents;
- workspace identity is not encoded only by color;
- foreground selection targets at least WCAG 4.5:1, with black/white fallback;
- high-contrast themes retain Status Bar and panel identity while chrome overrides are suspended;
- the Status Bar item has a stable id, accessible label, tooltip, command, and the maximum finite left-side priority.

## Assets

`media/source/color-my-workspaces-approved.png` is the accepted native-alpha Imagegen source for the Tag Mate-aligned, vectorized semi-3D 3×3 folder grid. `media/icon-512.png` and `media/icon.png` are direct alpha-preserving 512×512 and 256×256 renders; no SVG reinterpretation remains. `media/preview.png` shows the extension applied to a synthetic TypeScript workspace, and `media/preview-settings.png` shows the minimal settings panel beside the same code. Both are native-alpha captures from Color My Workspaces 0.1.0 installed in stable VS Code.

## Explicit non-goals

- theme creation or broad theme management;
- coloring editor content;
- automatic repository commits;
- accounts, cloud sync, telemetry, or team service;
- automatic global setting changes;
- web-host support in 0.1.0;
- a separate “share color” command in 0.1.0. Workspace configuration is already portable when users choose to commit it; a second write path would be ambiguous.

## Acceptance criteria

- a fresh workspace receives its derived color automatically unless `workspaceColor.autoApply` is explicitly disabled;
- existing 0.0.x users keep their stored color when legacy ownership is recognized;
- managed baselines restore without deleting unrelated values;
- external values are not silently overwritten;
- local, remote, virtual, saved, and multi-root identities are deterministic;
- text-bearing generated colors meet the chosen contrast policy;
- Extension Host integration covers activation, commands, application, external conflict, Clear, Reset, and panel lifecycle;
- production VSIX is inspected, installed into isolated directories, activated, and exercised;
- current stable, minimum, and Insiders checks are in CI;
- version, changelog, media, docs, package, and rollback instructions agree before publication.

## Release boundary

Implementation may produce and verify the 0.1.0 VSIX without registry credentials. Tagging, publishing, merging, unpublishing, or deprecating remain explicit operator actions.

## Accepted PR implementation

Favorite Colors supports up to 24 named colors across projects in the current user's extension storage. Save does not apply a color. Apply uses the existing color ownership controller. Rename and Delete reject stale selections from another window. An exclusive storage lock and atomic file replacement prevent concurrent windows from overwriting changes. A crashed writer can leave a lock; close all VS Code windows before removing that lock from extension storage. Preferences exclude the current color, label and identity. Clear Color remains the operation that restores owned workbench colors.

The two settings actions first ask for one scope. Apply Factory Defaults writes manifest defaults only in that scope. Reset to Inherited Settings removes explicit values only there. Both preserve language overrides and settings in other scopes. User and Workspace are available; Folder is available only for resource settings in a workspace file. Cancelling either picker or confirmation makes no change. A failed write reports how many keys changed; it does not claim an atomic settings transaction.

Command identifiers:

- `workspaceColor.favorites`: Favorite Colors...
- `workspaceColor.saveFavorite`: Save Current Color as Favorite...
