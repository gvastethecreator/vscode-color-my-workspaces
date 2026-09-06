# Publishing and rollback

Extension id: `gvastethecreator.color-my-workspaces`.

Publishing is an operator action. Building or verifying a VSIX does not authorize tagging, pushing, publishing, deprecating, or unpublishing.

The **Release** workflow starts from **Actions → Release → Run workflow**. Default input `artifact-only` does not publish. A tag push does not publish.

## Release candidate

1. Set `package.json` to the intended SemVer.
2. Replace `[version] - Unreleased` in `CHANGELOG.md` with the release date.
3. Update the PDR, compatibility matrix, security review, performance evidence, and screenshot.
4. Run:

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run check-types
pnpm run check:release
pnpm run check:media
pnpm run check:performance
pnpm run test:integration
pnpm run test:vsix
```

5. Run the minimum and Insiders Extension Host lanes locally when available:

```powershell
$env:VSCODE_TEST_VERSION = "1.134.0"
pnpm run test:integration
$env:VSCODE_TEST_VERSION = "insiders"
pnpm run test:integration
Remove-Item Env:VSCODE_TEST_VERSION
```

6. Review `git diff`, the VSIX file list, and the launch checklist.
7. Obtain explicit commit/push/merge/tag/publication approval.

## GitHub Actions

1. Run **Release** with `artifact-only` from `main`.
2. Confirm the uploaded VSIX hash.
3. After approval, run one of `github-release`, `vscode-marketplace`, or `open-vsx`.
4. Run one registry at a time.

Environments, limited to `main`:

- `github-release` uses `GITHUB_TOKEN`.
- `vscode-marketplace` uses `VSCE_PAT`.
- `open-vsx` uses `OVSX_PAT`.

Do not store those tokens until the owner asks to publish. A registry failure must not republish to the other registry.

`pnpm run check:release -- --release` runs only when the input is not `artifact-only`. That mode requires a dated changelog entry.

## Manual fallback

Package without a token:

```powershell
pnpm run vsix
pnpm run inspect:vsix
```

Marketplace: upload the exact verified VSIX at [Marketplace management](https://marketplace.visualstudio.com/manage).

Open VSX:

```powershell
pnpm exec ovsx publish .\color-my-workspaces-<version>.vsix -p $env:OVSX_PAT
```

Never place a PAT in a command committed to Git, an issue, a log, or documentation.

## Post-publish verification

From each registry:

1. confirm version, README, icon, license, and repository links;
2. install into a clean profile;
3. open a fixture workspace and confirm activation does not write;
4. apply a folder color;
5. simulate an external managed-key change;
6. Clear and verify baseline/external/unmanaged values;
7. upgrade a 0.0.x fixture and verify color migration;
8. record Windows stable plus required platform/remote evidence;
9. retain the verified VSIX and checksum.

## Rollback

Prefer a forward patch release.

1. Pause both publication environments.
2. Preserve the failing VSIX, logs, version, affected VS Code versions, and reproduction.
3. Restore the previous retained VSIX in a clean profile to confirm the boundary.
4. Add the smallest regression test.
5. Publish a higher patch version with the fix.
6. Deprecate or unpublish only after reviewing registry consequences and obtaining explicit approval.

Never rewrite a public tag or replace bytes under an existing version. Open VSX and Marketplace actions remain independent.
