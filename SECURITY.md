# Security policy

## Supported version

Security fixes target the latest published Color My Workspaces version.

## Report privately

Use a [private GitHub security advisory](https://github.com/gvastethecreator/vscode-color-my-workspaces/security/advisories/new). Do not publish exploit details in a public issue.

Include the affected version, VS Code version, reproduction, impact, and any workspace/settings preconditions. Do not include real secrets or private workspace contents.

## Product boundary

Color My Workspaces:

- has no telemetry, account, cloud service, or product network request;
- does not read document contents or scan workspace files;
- does not execute workspace code, binaries, tasks, or shell commands;
- never logs configuration values, paths, environment values, secrets, or clipboard bytes;
- writes only workspace configuration selected by the user and local VS Code workspace state;
- writes one clipboard hex value only after the explicit Copy color action;
- opens only the allowlisted HTTPS repository support URL.

The settings panel uses exact runtime message validation, a cryptographic nonce, a default-deny CSP, bundled local assets, and no command URIs.

Restricted Mode is supported because no workspace code is read or executed.

## Dependency policy

The extension runtime has no production dependencies. Development dependencies are locked with pnpm. CI runs a production dependency audit, package inspection, and an isolated installed-VSIX smoke test.

See [security review](docs/security-review.md) for the current threat model and evidence.
