# Security and privacy review

Review date: 2026-09-03
Release candidate: 0.1.0

## Data inventory

| Data | Source | Storage/use |
| --- | --- | --- |
| Workspace/folder URI | VS Code API | Canonical identity in local workspace state |
| Selected/derived hex color | User/identity hash | Workspace setting, generated chrome values, panel/status display |
| Label/icon/surface flags | Workspace settings | Panel/status/chrome behavior |
| Existing managed color values | Workspace configuration | Local baseline ownership records |
| Clipboard | Explicit Copy color action | Writes one normalized hex string |
| Document/workspace file contents | Not read | None |
| Environment values/secrets | Not read | None |
| Telemetry/account identifiers | Not collected | None |

## Threat boundaries

### Workspace configuration

Settings are untrusted and may be changed by users, Settings Sync, other windows, or extensions. The extension:

- applies a derived color by default on first activation, which can create a workspace-file change; `workspaceColor.autoApply: false` disables that automatic write;
- accepts only normalized hex colors and allowlisted surface/icon/enum values at UI boundaries;
- preserves all unmanaged configuration values;
- snapshots the exact configuration used by a plan;
- aborts when configuration changed before a write;
- verifies final written configuration;
- detects owned-key divergence and asks for an explicit conflict choice;
- serializes its own writes and skips no-ops.

VS Code has no compare-and-swap configuration API. A different process could still write in the tiny interval between the last snapshot check and the VS Code update. The subsequent configuration event/final verification is the available detection boundary.

### Webview

- `default-src 'none'`;
- only `webview.cspSource` images/styles and data images;
- script requires a 192-bit `node:crypto` nonce;
- local resource root is only `dist`;
- no inline event handlers, command URIs, remote scripts, or fetch;
- incoming messages start as `unknown` and require exact own-object keys/types/limits;
- color, icon, enum, element, boolean, label, and URL fields are allowlisted;
- dynamic state uses DOM properties and `textContent`;
- only the exact HTTPS support URL can open externally;
- hidden context is not retained.

### Workspace Trust and remote

The extension does not read/execute workspace files, tasks, terminals, binaries, or scripts. Restricted Mode is supported. `extensionKind: ["ui"]` keeps runtime in the local UI host for remote windows while URI identity includes the remote authority and path.

### Experimental setting

Modern UI never changes automatically. Workspace scope needs a modal confirmation. A rejected workspace update cannot silently fall back to Global; a second modal names all VS Code windows. Prior scope/value is restored only while ownership is intact.

## Dependency and package evidence

- production dependencies: none;
- `pnpm audit --prod --audit-level high`: no known vulnerabilities on 2026-09-02;
- production license list: empty;
- lockfile is committed;
- release bundle is minified without source maps;
- VSIX inspection rejects source, scripts, tests, docs, node_modules, CI, scratch, TypeScript, and source maps;
- installed-VSIX smoke uses temporary user-data and extensions directories.

Development dependency updates require lockfile review, unit/type/build/package gates, and a production audit. Native addons remain development-only and must not enter the VSIX.

## Network and logging review

Runtime search found no `fetch`, XMLHttpRequest, WebSocket, telemetry, output channel, or logger. Repository/Marketplace URLs are metadata. The only runtime URL is the exact support URL opened after a user click.

## Residual risks

- Experimental Modern UI may change or disappear upstream.
- Other configuration writers can race because VS Code offers no atomic compare-and-swap update.
- Old 0.0.x releases did not store original baselines, so migration can remove recognized legacy-owned keys but cannot reconstruct values overwritten before 0.1.0.
- Remote, virtual-provider, screen-reader, and rendered theme behavior still require release-matrix evidence in their real environments.

No unresolved P0 code-path security issue was found in this review.
