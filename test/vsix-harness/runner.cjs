const assert = require("node:assert/strict");
const vscode = require("vscode");

exports.run = async function run() {
  const extension = vscode.extensions.getExtension("gvastethecreator.color-my-workspaces");
  assert.ok(extension, "the packaged extension is installed");
  assert.equal(extension.packageJSON.version, process.env.EXPECTED_EXTENSION_VERSION);
  await extension.activate();

  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes("workspaceColor.applyFromFolder"));
  assert.ok(commands.includes("workspaceColor.openPanel"));

  const automaticallyApplied = vscode.workspace
    .getConfiguration("workbench")
    .inspect("colorCustomizations")?.workspaceValue;
  assert.ok(
    automaticallyApplied && typeof automaticallyApplied["titleBar.activeBackground"] === "string",
    "packaged activation applies the derived workspace color by default",
  );

  await vscode.commands.executeCommand("workspaceColor.applyFromFolder");
  const after = vscode.workspace
    .getConfiguration("workbench")
    .inspect("colorCustomizations")?.workspaceValue;
  assert.ok(after && typeof after["titleBar.activeBackground"] === "string");
};
