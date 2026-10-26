# Compatibility and QA

Evidence date: 2026-09-03
Release candidate: 0.1.0
Minimum VS Code: 1.134.0

## Supported environments

| Environment | Declaration | Reason |
| --- | --- | --- |
| Desktop Node extension host | Supported | Bundled CommonJS `main`; VS Code configuration, window, webview, and status APIs |
| Web extension host | Unsupported | No `browser` entry; Node crypto is used by the panel host |
| Virtual Workspaces | Supported | Identity uses URI scheme/authority/path; no direct workspace filesystem access |
| Untrusted Workspaces | Supported | No workspace code, files, tasks, binaries, or shells are read/executed |
| Remote Development | Supported | `extensionKind: ["ui"]`; remote URI identity remains distinct |
| Empty window | Limited by design | Status item hidden; commands explain that a workspace is required |
| Windows/macOS/Linux | Supported | No platform-specific runtime dependency |
| High Contrast | Supported | Chrome values are restored/suspended; text/icon controls remain |
| Modern UI | Best effort | Experimental upstream setting, detected separately from engine support |

## Automated release matrix

| Lane | Coverage | Current evidence |
| --- | --- | --- |
| Windows stable 1.136.1 | Activation, commands, apply, conflict, Clear, Reset, panel lifecycle | Local pass: 7 tests |
| Windows minimum 1.134.0 | Same Extension Host suite | Local pass: 7 tests; CI lane configured |
| Ubuntu stable | Same Extension Host suite under Xvfb | CI lane configured |
| macOS stable | Same Extension Host suite | CI lane configured |
| Ubuntu Insiders | Same Extension Host suite | CI lane configured |
| Unit tests | Identity, ownership, conflict, queue, colors, compatibility, panel parser, status, manifest | Local pass: 100 tests |
| Installed VSIX | Isolated install, automatic activation apply, command registration, explicit reapply | Local pass on stable 1.136.1; CI package gate configured |
| Media | Dimensions, alpha, deterministic rerender | Local pass: four files; release gate configured |
| Performance | Hot paths, coalescing, bundle size, activation, three panel cycles | Local/CI budgets |

CI source: `.github/workflows/ci.yml`.

## Local rendered evidence

- Dark Modern: full panel rendered in a VS Code 1.135.0 Extension Development Host.
- Dark Modern UI on VS Code 1.136.1: all 55 icon-picker SVGs and the selected preview render at 16×16; Enter opens the picker and Escape closes it with focus restored.
- Default High Contrast: suspension notice shown and chrome tones dimmed; controls remain readable.
- Accessibility tree: 97 controls have names and no interactive node is unnamed.
- Strict CSP: default deny, external bundled CSS/JavaScript, one cryptographic script nonce, no inline event handlers.
- Approximately 200% zoom: 207 px panel viewport, `scrollWidth` equals viewport width, and the complete footer remains reachable without horizontal scrolling.
- `media/preview.png` and `media/preview-settings.png` were captured from Color My Workspaces 0.1.0 installed in stable VS Code 1.136.1 against a synthetic TypeScript workspace, then placed on transparent 1200×800 canvases.

Light, High Contrast Light, full keyboard traversal, remote/virtual providers, platform rendering, Modern UI permutations, and Peacock coexistence remain release-matrix gates.

## Shell matrix

| Surface/state | Contract |
| --- | --- |
| Activity Bar left/right/top/bottom | Both key families are generated when enabled; without an override, Modern UI top/bottom defaults off and side/classic layouts default on |
| Command center enabled/hidden | Keys remain safe when the UI is hidden; no command-center assumption |
| Native/custom title bar | VS Code decides which declared title keys are visible |
| Modern UI on | Title/activity/status borders omitted; limitations shown |
| Modern UI off | Each selected surface receives its own keys |
| Modern UI setting absent | Detector reports unknown; no automatic setting write |
| Light/dark theme | Generated foreground uses measured contrast |
| High Contrast/High Contrast Light | Desired chrome set is empty; intact baselines restored until normal theme returns |

## Identity matrix

Automated tests cover:

- saved workspace URI precedence;
- sorted multi-root URI order;
- equal basenames in different paths;
- Windows file drive/path case;
- remote scheme, authority, and case-sensitive path;
- length-prefixed folder identities;
- explicit identity override;
- empty/untitled windows;
- 0.0.x legacy folder/workspace identity;
- stored identity rebinding without ownership loss.

## Manual release checks

Before public 0.1.0 publication, record:

- panel at normal width and narrow width;
- 200% zoom;
- full keyboard path and icon-grid arrows/Home/End/Escape;
- screen-reader names/status text;
- Dark, Light, High Contrast, and High Contrast Light;
- Activity Bar side/top/bottom;
- Modern UI on/off/unavailable where possible;
- one WSL/SSH/Codespaces window;
- one virtual workspace provider;
- coexistence with Peacock or equivalent manual overlapping keys;
- Marketplace and Open VSX clean installs.

A platform CI pass proves Extension Host behavior, not rendered UI or remote-provider behavior.
