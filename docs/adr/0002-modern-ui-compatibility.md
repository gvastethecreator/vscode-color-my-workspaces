# ADR 0002: Experimental Modern UI compatibility

Status: Accepted
Date: 2026-09-02

## Context

`workbench.experimental.modernUI` can blend or make shell surfaces transparent. It is not a stable extension API and can change independently of the minimum VS Code engine.

## Decision

- Detect classic, modern, and unknown states separately from engine compatibility.
- Do not toggle Modern UI automatically.
- Explain current limitations in the panel and compatibility table.
- The panel control names the experimental setting and reload requirement.
- Confirm workspace scope before writing.
- If workspace scope is rejected, require a second modal that explicitly says all VS Code windows before offering Global.
- Record target scope, previous value, and last written value.
- Restore only when the current value still matches the extension write; otherwise preserve the external change.
- Omit shell borders in detected Modern UI because they split a blended surface.
- Treat unknown state conservatively and remove or redesign the control if VS Code removes or renames the setting.

## Consequences

Separate bars may still be impossible in some builds. Modern UI is best effort and never part of the `engines.vscode` promise.
