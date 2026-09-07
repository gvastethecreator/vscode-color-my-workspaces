# Code map: vscode-color-my-workspaces

Generated: 2026-09-07T03:20:40Z | Commit: `251632d4b182` | Schema: 2
Generation: `696d4e6b4f7955f9627f54d93b4f9ed3a8e38ad112f61f9407d61c52d517b957`
Scope: . | Inventory: working-tree
Nodes: 70 | Edges: 244 | Flows: 0

## Coverage

- Analysis: **partial**; 54 analyzed of 55 included files.
- Configuration files: 1; omitted untracked files: 0.
- Unresolved references and analysis limits: 368.
- Static references and call paths do not prove runtime execution or test coverage.

## Modules

- `.vscode-test.mjs` | module | Repository | callers: none | callees: external:javascript:@vscode/test-cli, external:javascript:@vscode/test-cli, external:javascript:node:fs, external:javascript:node:fs | tests: 0 | entry: none
- `esbuild.js` | module | Repository | callers: none | callees: external:javascript:esbuild, external:javascript:esbuild | tests: 0 | entry: none
- `external:javascript:@vscode/test-cli` | external | External | callers: .vscode-test.mjs, .vscode-test.mjs | callees: none | tests: 0 | entry: none
- `external:javascript:@vscode/test-electron` | external | External | callers: scripts/test-vsix.mjs, scripts/test-vsix.mjs | callees: none | tests: 0 | entry: none
- `external:javascript:esbuild` | external | External | callers: esbuild.js, esbuild.js, scripts/build-integration.mjs, scripts/build-integration.mjs | callees: none | tests: 0 | entry: none
- `external:javascript:node:assert` | external | External | callers: scripts/check-media.mjs, scripts/check-release.mjs, scripts/measure-performance.mjs, scripts/release-artifact.mjs | callees: none | tests: 18 | entry: none
- `external:javascript:node:child_process` | external | External | callers: scripts/check-media.mjs, scripts/check-media.mjs, scripts/release-artifact.mjs, scripts/release-artifact.mjs | callees: none | tests: 1 | entry: none
- `external:javascript:node:crypto` | external | External | callers: scripts/check-media.mjs, scripts/check-media.mjs, scripts/release-artifact.mjs, scripts/release-artifact.mjs | callees: none | tests: 0 | entry: none
- `external:javascript:node:fs` | external | External | callers: .vscode-test.mjs, .vscode-test.mjs, scripts/check-media.mjs, scripts/check-media.mjs | callees: none | tests: 3 | entry: none
- `external:javascript:node:os` | external | External | callers: .vscode-test.mjs, .vscode-test.mjs, scripts/test-vsix.mjs, scripts/test-vsix.mjs | callees: none | tests: 2 | entry: none
- `external:javascript:node:path` | external | External | callers: .vscode-test.mjs, scripts/inspect-vsix.mjs, scripts/render-icons.mjs, scripts/test-vsix.mjs | callees: none | tests: 2 | entry: none
- `external:javascript:node:perf_hooks` | external | External | callers: scripts/measure-performance.mjs | callees: none | tests: 0 | entry: none
- `external:javascript:node:test` | external | External | callers: src/chrome.test.ts, src/chrome.test.ts, src/color.test.ts, src/color.test.ts | callees: none | tests: 16 | entry: none
- `external:javascript:node:url` | external | External | callers: scripts/render-icons.mjs, scripts/render-icons.mjs | callees: none | tests: 0 | entry: none
- `external:javascript:node:zlib` | external | External | callers: scripts/inspect-vsix.mjs, scripts/inspect-vsix.mjs | callees: none | tests: 0 | entry: none
- `external:javascript:sharp` | external | External | callers: scripts/check-media.mjs, scripts/check-media.mjs, scripts/render-icons.mjs, scripts/render-icons.mjs | callees: none | tests: 0 | entry: none
- `external:javascript:vscode` | external | External | callers: src/extension.ts, src/panel.ts, src/quickActions.ts, src/settingsActions.ts | callees: none | tests: 2 | entry: none
- `package.json` | module | Repository | callers: none | callees: none | tests: 0 | entry: none
- `scripts/build-integration.mjs` | module | Repository | callers: none | callees: external:javascript:esbuild, external:javascript:esbuild | tests: 0 | entry: none
- `scripts/check-media.mjs` | module | Repository | callers: none | callees: external:javascript:node:assert, external:javascript:node:child_process, external:javascript:node:child_process, external:javascript:node:crypto | tests: 0 | entry: none
- Showing 20 of 70 nodes. Query `impact --module <path>` or open the HTML hierarchy for the rest.

## Edges

- `.vscode-test.mjs` -> `external:javascript:@vscode/test-cli` | calls
- `.vscode-test.mjs` -> `external:javascript:@vscode/test-cli` | imports
- `.vscode-test.mjs` -> `external:javascript:node:fs` | calls
- `.vscode-test.mjs` -> `external:javascript:node:fs` | imports
- `.vscode-test.mjs` -> `external:javascript:node:os` | calls
- `.vscode-test.mjs` -> `external:javascript:node:os` | imports
- `.vscode-test.mjs` -> `external:javascript:node:path` | imports
- `esbuild.js` -> `external:javascript:esbuild` | calls
- `esbuild.js` -> `external:javascript:esbuild` | imports
- `scripts/build-integration.mjs` -> `external:javascript:esbuild` | calls
- `scripts/build-integration.mjs` -> `external:javascript:esbuild` | imports
- `scripts/check-media.mjs` -> `external:javascript:node:assert` | imports
- `scripts/check-media.mjs` -> `external:javascript:node:child_process` | calls
- `scripts/check-media.mjs` -> `external:javascript:node:child_process` | imports
- `scripts/check-media.mjs` -> `external:javascript:node:crypto` | calls
- `scripts/check-media.mjs` -> `external:javascript:node:crypto` | imports
- `scripts/check-media.mjs` -> `external:javascript:node:fs` | calls
- `scripts/check-media.mjs` -> `external:javascript:node:fs` | imports
- `scripts/check-media.mjs` -> `external:javascript:sharp` | calls
- `scripts/check-media.mjs` -> `external:javascript:sharp` | imports
- `scripts/check-release.mjs` -> `external:javascript:node:assert` | imports
- `scripts/check-release.mjs` -> `external:javascript:node:fs` | calls
- `scripts/check-release.mjs` -> `external:javascript:node:fs` | imports
- `scripts/inspect-vsix.mjs` -> `external:javascript:node:fs` | calls
- `scripts/inspect-vsix.mjs` -> `external:javascript:node:fs` | imports
- `scripts/inspect-vsix.mjs` -> `external:javascript:node:path` | imports
- `scripts/inspect-vsix.mjs` -> `external:javascript:node:zlib` | calls
- `scripts/inspect-vsix.mjs` -> `external:javascript:node:zlib` | imports
- `scripts/measure-performance.mjs` -> `external:javascript:node:assert` | imports
- `scripts/measure-performance.mjs` -> `external:javascript:node:fs` | calls
- `scripts/measure-performance.mjs` -> `external:javascript:node:fs` | imports
- `scripts/measure-performance.mjs` -> `external:javascript:node:perf_hooks` | imports
- `scripts/measure-performance.mjs` -> `src/chrome.ts` | calls
- `scripts/measure-performance.mjs` -> `src/chrome.ts` | imports
- `scripts/measure-performance.mjs` -> `src/color.ts` | calls
- `scripts/measure-performance.mjs` -> `src/color.ts` | imports
- `scripts/measure-performance.mjs` -> `src/ownership.ts` | calls
- `scripts/measure-performance.mjs` -> `src/ownership.ts` | imports
- `scripts/measure-performance.mjs` -> `src/writeQueue.ts` | imports
- `scripts/release-artifact.mjs` -> `external:javascript:node:assert` | imports
- `scripts/release-artifact.mjs` -> `external:javascript:node:child_process` | calls
- `scripts/release-artifact.mjs` -> `external:javascript:node:child_process` | imports
- `scripts/release-artifact.mjs` -> `external:javascript:node:crypto` | calls
- `scripts/release-artifact.mjs` -> `external:javascript:node:crypto` | imports
- `scripts/release-artifact.mjs` -> `external:javascript:node:fs` | calls
- `scripts/release-artifact.mjs` -> `external:javascript:node:fs` | imports
- `scripts/render-icons.mjs` -> `external:javascript:node:fs` | calls
- `scripts/render-icons.mjs` -> `external:javascript:node:fs` | imports
- `scripts/render-icons.mjs` -> `external:javascript:node:path` | imports
- `scripts/render-icons.mjs` -> `external:javascript:node:url` | calls
- Showing 50 of 244 edges; JSON contains every edge and its evidence.

## Unknown

- `.vscode-test.mjs:6`: object-member-call-not-resolved (path)
- `.vscode-test.mjs:7`: object-member-call-not-resolved (path)
- `.vscode-test.mjs:8`: object-member-call-not-resolved (path)
- `package.json:1`: unresolved-local-import (./dist/extension.js)
- `scripts/check-media.mjs:60`: object-member-call-not-resolved (assert)
- `scripts/check-media.mjs:61`: object-member-call-not-resolved (assert)
- `scripts/check-media.mjs:62`: object-member-call-not-resolved (assert)
- `scripts/check-media.mjs:63`: object-member-call-not-resolved (assert)
- `scripts/check-media.mjs:72`: object-member-call-not-resolved (assert)
- `scripts/check-release.mjs:13`: object-member-call-not-resolved (assert)
- `scripts/check-release.mjs:14`: object-member-call-not-resolved (assert)
- `scripts/check-release.mjs:15`: object-member-call-not-resolved (assert)

## Flows

- no source-backed call path from a recognized trigger

## Architecture changes

- Nodes: +5 / -0; edges: +36 / -23.
- Boundary changes: 0; new cycles: 0.

## Read next

- Use `status` before relying on this generation.
- Use `impact --changed` for possible impact and related test evidence.
- Use `diff --before <model> --after <model>` for architecture changes.
