# Performance checks

Run `pnpm run check:performance` after building the extension. The check uses `scripts/measure-performance.mjs` and fails when a budget is exceeded.

- Generate colors and chrome values 10,000 times in less than 2,000 ms.
- Plan 10,000 unchanged ownership updates in less than 2,000 ms.
- Coalesce 1,000 queued refreshes in less than 1,000 ms.
- Keep extension and panel JavaScript below 250,000 bytes each, and panel CSS below 100,000 bytes.

These are bounded local checks. They do not measure VS Code startup, renderer latency, or filesystem performance. Favorites read at most 24 entries on demand and serialize writes across windows. Runtime evidence for this change is recorded at portfolio verification closeout.
