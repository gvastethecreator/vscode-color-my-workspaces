# Color My Workspaces — additional quality and competitive review

Review date: 2026-09-06. Baseline: `251632d4b182be5299a3f1084503c5a780468dd3` (`main`).

## Status and evidence

This is a proposed acceptance contract and source review, not an implementation. Live work state belongs in the accompanying PR. Existing runtime behavior and product contract remain unchanged. Later behavior changes must synchronize the product and portfolio PDRs.

The current ref, AGENTS, complete Quick Pick implementation and release workflow were re-read, in addition to the previous ownership/controller review. The Quick Pick still uses a supplied fixed palette and does not expose named personal favorites. No build, Extension Host, VSIX or benchmark was executed: local checkout failed on DNS resolution and pnpm was unavailable.

Pinned evidence: [Quick Picks](https://github.com/gvastethecreator/vscode-color-my-workspaces/blob/251632d4b182be5299a3f1084503c5a780468dd3/src/quickActions.ts), [controller](https://github.com/gvastethecreator/vscode-color-my-workspaces/blob/251632d4b182be5299a3f1084503c5a780468dd3/src/workspaceColorController.ts), [release](https://github.com/gvastethecreator/vscode-color-my-workspaces/blob/251632d4b182be5299a3f1084503c5a780468dd3/.github/workflows/release.yml).

## Preserve reversibility before adding customization

The product's existing identity, contrast, enabled-surface and ownership mechanisms should remain authoritative. Favorites must route through the same apply/clear path, including external-change detection, serialized writes, High Contrast handling and restore baselines. Do not replace ownership with a simple overwrite of `workbench.colorCustomizations`.

[Peacock's own guide](https://github.com/johnpapa/vscode-peacock/blob/main/docs/guide/README.md), re-read on the review date, documents named favorite colors, saving the current color, preview/revert behavior and lighter/darker adjustments. This supports a focused favorites workflow; it does not justify copying Live Share integrations, numerous surface settings or an entire theme-management interface.

## Named favorites in the existing picker

Provide Save Current Color as Favorite, Choose Favorite, Rename and Remove actions. Keep a proposed maximum of 24 entries, each containing only a bounded display name and normalized supported hex value. Validate malformed persisted data, duplicate names, control characters and unsafe values before rendering a swatch. Favorite names are text, not markup or executable command references. Define a predictable duplicate/update policy instead of silently replacing an unrelated favorite.

Store the collection in user-local state or an explicitly chosen user configuration key. Saving, renaming or deleting a favorite must not write project settings or apply colors. Applying a favorite is a separate explicit action and may write workspace customization through the existing ownership controller; do not advertise it as a settings-free per-window API.

Keep the fixed palette as a useful default/empty-state fallback. Use a Favorites section in the current Quick Pick rather than another panel. Cancelling a picker changes nothing. Initially avoid live apply-on-highlight, because previewing colors through persistent workspace settings adds restore/write complexity. A future preview must demonstrate reliable cancellation and preservation of external changes first.

Primary touchpoints: `src/quickActions.ts`, a small validated favorites model/storage adapter, controller routing and existing unit/host tests. No new runtime dependency or synchronization service is needed. Do not force synchronous startup reads beyond the storage already used by the extension; load menu-only data when needed.

## Optional color adjustments

Consider a fixed lighten/darken action only after named favorites are useful and stable. Reuse existing color/contrast functions and ownership application, with an explicit undo/revert path. Do not expand into arbitrary color-space controls, animated colors or a preset editor. Automatic branch-based colors and background Git polling are outside the scope.

## Additional release findings

The workflow already has distinct deterministic-media and artifact-verification steps; preserve those, including the Windows media job and current release checks. The downstream GitHub Release job nevertheless invokes `gh release` with no checkout, explicit `GH_REPO` or `--repo`. It does not bind a newly created tag to the verified source SHA. Its release probe is not a tag-ref guard and does not separately handle permission/network errors. Shown publisher consumers do not explicitly verify downloaded SHA256 sidecars.

Require explicit repository identity, immutable source SHA from preparation, checksum verification before each publisher, and an existing-tag/ref policy that never moves a tag. A failed API lookup is not evidence of absence. Partial publication needs deliberate recovery. Retain protected environments, limited permissions and artifact-only defaults; do not publish to exercise tests. References: [CLI repository context](https://cli.github.com/manual/gh_help_environment), [release target behavior](https://cli.github.com/manual/gh_release_create).

## Acceptance and release evidence

| Scenario | Required outcome |
| --- | --- |
| Save/rename/remove a favorite | No project settings or chrome colors change. |
| Select a favorite | Existing ownership, contrast and conflict policy are used. |
| Cancel name/picker input | No write or color change. |
| Duplicate/malformed favorite and collection limit | Clear validation; bounded safe storage and rendering. |
| External customization changes between operations | External values remain protected; no blind overwrite. |
| Apply then Clear Color | Captured values restored according to ownership; unrelated values remain intact. |
| Light/dark/High Contrast and different activity-bar locations | Readable presentation with supported surfaces only. |
| Empty palette or corrupted saved entries | Fixed palette remains usable; no activation failure. |
| Wrong checksum or tag SHA | Publication aborts without overwriting a release/tag. |

Run the existing unit, type, media, performance, integration and installed-VSIX gates on the declared toolchain. Include workspace identity changes, multi-root workspaces, reloads, failed writes and interactions with other color customizations. Measure cold activation separately from opening the settings panel or favorites picker. Check package contents and executable bytes rather than treating development dependencies or screenshot size as runtime cost. No new compatibility or performance claim is made by this review.

## Exclusions

No Windows taskbar coloring promise, mandatory shared core extension, custom sync backend, theme engine, animated UI, Git polling, broad new surface matrix or replacement of accepted artwork. Keep user control, reversibility and one compact chooser as the product boundary.
