# ADR 0001: Automatic apply by default

Status: Accepted
Date: 2026-09-03

## Context

Color application writes workspace configuration. VS Code may persist it in `.vscode/settings.json` or a `.code-workspace` file, so automatic application can create a source-control change. Color My Workspaces is primarily installed to make every workspace recognizable without a setup step, and Clear already provides a reversible local stop state.

## Decision

- `autoApply` defaults to `true` and is scoped to the workspace window.
- A fresh workspace derives and applies its stable color during activation.
- An explicit `autoApply: false` override requires manual application.
- Clear restores captured values and keeps that workspace disabled until the user applies another color.
- Every first managed write captures the prior value, and later external changes keep the existing conflict flow.
- The README warns that applying can modify a tracked workspace file.
- Onboarding is shown once and never opens promotional content.

## Consequences

Every new workspace receives its visual identity without an extra action. Users who do not want automatic writes can disable `workspaceColor.autoApply`, and Clear remains reversible. Existing 0.0.x ownership still migrates without inventing a baseline that the old release never stored.
