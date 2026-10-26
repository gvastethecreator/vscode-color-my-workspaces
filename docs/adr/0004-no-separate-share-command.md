# ADR 0004: No separate share-color command in 0.1.0

Status: Accepted
Date: 2026-09-02

## Context

A proposed `Share this workspace color` command would intentionally write portable workspace configuration. Normal color application already writes `workspaceColor.color` and managed chrome values at workspace scope, which VS Code can persist in a tracked settings or workspace file.

## Decision

Do not add a second sharing command in 0.1.0. Document the source-control effect of normal application. Keep ownership baselines local and never create commits automatically.

Reconsider named/importable team profiles only after 0.1.0 usage data and under a separate PDR.

## Consequences

There is one clear write path. Users control sharing through their existing workspace file and source-control review.
