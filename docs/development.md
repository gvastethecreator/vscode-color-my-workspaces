# Development

Use pnpm 12.1. Do not switch package managers.

## Commands

| Command | Evidence |
| --- | --- |
| `pnpm install --frozen-lockfile` | Exact locked dependencies |
| `pnpm test` | Pure Node unit tests |
| `pnpm run check-types` | Strict TypeScript |
| `pnpm run compile` | Development extension and panel bundles |
| `pnpm run package` | Minified production bundles |
| `pnpm run check:performance` | Pure hot-path and bundle budgets |
| `pnpm run check:media` | Dimensions, alpha, and deterministic rerender |
| `pnpm run test:integration` | Extension Host activation/configuration/panel tests |
| `pnpm run vsix` | Production VSIX |
| `pnpm run inspect:vsix` | Required/forbidden archive entries and manifest consistency |
| `pnpm run test:vsix` | Package, inspect, install into isolated directories, activate, and apply |
| `pnpm run check:release` | Manifest, changelog, README, PDR, command, and setting consistency |

## Architecture

`extension.ts` only composes the Status Bar and workspace controller, registers commands, and forwards lifecycle events.

Pure modules:

- `managedKeys.ts`: versioned surface/key registry;
- `ownership.ts`: plans apply/clear and resolves ownership conflicts;
- `identity.ts`: canonical URI identity;
- `localState.ts`: versioned local migration state;
- `color.ts` and `chrome.ts`: color math and generated VS Code keys;
- `compatibility.ts`: classic/modern/unknown shell result;
- `statusDisplay.ts`: Status Bar presentation;
- `panelMessages.ts`: exact runtime parser;
- `writeQueue.ts`: serialized/coalesced work.

VS Code boundaries:

- `workspaceColorController.ts`;
- `statusController.ts`;
- `panel.ts`;
- `quickActions.ts`.

The browser bundle starts at `panelClient.ts`; it cannot import `vscode`.

## Ownership rules

Read `CONTEXT.md` and the ADRs before editing color persistence. The non-negotiable rule is:

> update or restore an owned key only while the current value matches the last extension write, unless the user explicitly chooses reapply.

Use `MANAGED_COLOR_GROUPS` for every generated, restored, documented, or tested key. Do not introduce a second key list.

## Extension Host tests

`.vscode-test.mjs` creates a temporary workspace and runs the selected version:

```powershell
$env:VSCODE_TEST_VERSION = "1.134.0"
pnpm run test:integration
```

Use `stable` or `insiders` for the other release lanes. The test profile lives under `.vscode-test` and is isolated from the normal VS Code profile.

The integration suite proves:

- activation without configuration mutation;
- public command registration;
- explicit application and baseline capture;
- external-value preservation;
- Clear restoration;
- Reset restoration/settings removal;
- repeated panel open/dispose.

## Panel security

- incoming messages are `unknown` until `parsePanelMessage` accepts exact keys/types;
- the script nonce comes from `node:crypto`;
- CSP is `default-src 'none'`;
- `localResourceRoots` contains only `dist`;
- CSS and JavaScript are bundled local resources;
- dynamic values use DOM properties and `textContent`;
- only `SUPPORT_URL` can open externally;
- `retainContextWhenHidden` stays off.

## Theme keys

The registry covers:

- `titleBar.*` and `sash.hoverBorder`;
- `activityBar.*`, `activityBarBadge.*`, and `activityBarTop.*`;
- `statusBar.*`, `statusBarItem.*`, and remote/debugging keys;
- `commandCenter.*`.

Modern UI omits title/activity/status borders. High-contrast themes supply an empty desired set, which restores baselines until a normal theme returns.

## Generated artifacts

- `dist/`, `dist-test/`, `.vscode-test/`, and `*.vsix` are ignored.
- `media/source/color-my-workspaces-approved.png` is the accepted icon source asset.
- The approved icon remains raster throughout the pipeline; do not recreate an SVG interpretation.
- `pnpm run icons` regenerates the committed icon and social PNGs. README previews come from the portfolio's installed-extension capture harness.
- The VSIX excludes source, tests, scripts, docs, source maps, scratch data, and high-resolution/source media.

## Code map

When `docs/codemap/codemap.lock` is stale, rebuild all four code-map artifacts before product code changes and again after module-boundary changes. Validate and run its browser smoke check.
