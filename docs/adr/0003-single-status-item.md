# ADR 0003: One Status Bar item

Status: Accepted
Date: 2026-09-02

## Context

The 0.0.x implementation used two Status Bar items. The 0.1.0 controller consolidates them into one item, but the workspace identity still needs to remain at the far left where users expect it.

## Decision

- Create one item with id `workspaceColor.status`.
- Use left alignment and `Number.MAX_VALUE`, the maximum finite priority.
- Keep the item instance for the extension lifetime; update or hide it without recreation.
- Show the configured icon/name, or a textual Codicon fallback when both are hidden.
- Keep workspace name and hex in the tooltip.
- Route clicks to Quick settings or Full settings.
- Set one accessible button label.
- Hide the item in an empty window.

## Consequences

The old separate colored chip is removed. The unified identity stays before ordinary finite-priority left-side items; VS Code-owned infinite-priority items can still precede it. Workspace color remains visible in painted chrome and in the full panel preview; text/icon/tooltip remain usable in high contrast.
