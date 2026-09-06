import assert from "node:assert/strict";
import * as vscode from "vscode";

declare function suite(name: string, callback: () => void): void;
declare function test(name: string, callback: () => void | Promise<void>): void;

const EXTENSION_ID = "gvastethecreator.color-my-workspaces";

suite("Color My Workspaces extension host", () => {
  test("automatically applies a derived color on first activation", async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `${EXTENSION_ID} is installed in the test host`);
    const activationStarted = performance.now();
    await extension.activate();
    const activationMilliseconds = performance.now() - activationStarted;
    console.log(`[performance] activation=${activationMilliseconds.toFixed(2)}ms`);
    assert.ok(activationMilliseconds < 2_000);

    const colors = vscode.workspace
      .getConfiguration("workbench")
      .inspect<Record<string, unknown>>("colorCustomizations")?.workspaceValue;
    assert.ok(colors);
    assert.match(String(colors["titleBar.activeBackground"]), /^#[0-9a-f]{6}$/);
    assert.equal(
      vscode.workspace.getConfiguration("workspaceColor").inspect("color")?.workspaceValue,
      undefined,
    );
  });

  test("registers every public command", async () => {
    const commands = await vscode.commands.getCommands(true);
    for (const command of [
      "workspaceColor.applyFromFolder",
      "workspaceColor.pick",
      "workspaceColor.quickActions",
      "workspaceColor.openPanel",
      "workspaceColor.surprise",
      "workspaceColor.reset",
      "workspaceColor.resetSettings",
      "workspaceColor.setDefaults",
      "workspaceColor.reapply",
    ]) {
      assert.ok(commands.includes(command), command);
    }
  });

  test("applies a derived color while preserving unrelated and baseline values", async () => {
    const workbench = vscode.workspace.getConfiguration("workbench");
    await withWarningChoice("Clear workspace color", () =>
      vscode.commands.executeCommand("workspaceColor.reset"),
    );
    await workbench.update(
      "colorCustomizations",
      {
        "editor.background": "#101010",
        "titleBar.activeBackground": "#aa0000",
      },
      vscode.ConfigurationTarget.Workspace,
    );

    await vscode.commands.executeCommand("workspaceColor.applyFromFolder");

    const colors = workbench.inspect<Record<string, string>>("colorCustomizations")?.workspaceValue;
    assert.ok(colors);
    assert.equal(colors["editor.background"], "#101010");
    assert.notEqual(colors["titleBar.activeBackground"], "#aa0000");
    assert.match(
      vscode.workspace.getConfiguration("workspaceColor").get<string>("color", ""),
      /^#[0-9a-f]{6}$/,
    );
  });

  test("preserves an external managed-key change", async () => {
    const workbench = vscode.workspace.getConfiguration("workbench");
    await withWarningChoice("Keep external values", async () => {
      const current = {
        ...(workbench.inspect<Record<string, string>>("colorCustomizations")?.workspaceValue ?? {}),
        "statusBar.background": "#ff00ff",
      };
      await workbench.update(
        "colorCustomizations",
        current,
        vscode.ConfigurationTarget.Workspace,
      );
      await delay(250);
    });

    const colors = workbench.inspect<Record<string, string>>("colorCustomizations")?.workspaceValue;
    assert.equal(colors?.["statusBar.background"], "#ff00ff");
  });

  test("clear restores captured values and keeps unmanaged or external values", async () => {
    await withWarningChoice("Clear workspace color", () =>
      vscode.commands.executeCommand("workspaceColor.reset"),
    );

    const colors = vscode.workspace
      .getConfiguration("workbench")
      .inspect<Record<string, string>>("colorCustomizations")?.workspaceValue;
    assert.equal(colors?.["editor.background"], "#101010");
    assert.equal(colors?.["titleBar.activeBackground"], "#aa0000");
    assert.equal(colors?.["statusBar.background"], "#ff00ff");
    assert.equal(
      vscode.workspace.getConfiguration("workspaceColor").inspect("color")?.workspaceValue,
      undefined,
    );
  });

  test("reset restores colors and removes extension workspace settings", async () => {
    await vscode.commands.executeCommand("workspaceColor.applyFromFolder");
    await vscode.workspace
      .getConfiguration("workspaceColor")
      .update("label", "Integration fixture", vscode.ConfigurationTarget.Workspace);

    await withWarningChoice("Reset settings", () =>
      vscode.commands.executeCommand("workspaceColor.resetSettings"),
    );

    const configuration = vscode.workspace.getConfiguration("workspaceColor");
    assert.equal(configuration.inspect("color")?.workspaceValue, undefined);
    assert.equal(configuration.inspect("label")?.workspaceValue, undefined);
    const colors = vscode.workspace
      .getConfiguration("workbench")
      .inspect<Record<string, string>>("colorCustomizations")?.workspaceValue;
    assert.equal(colors?.["titleBar.activeBackground"], "#aa0000");
    assert.equal(colors?.["statusBar.background"], "#ff00ff");
  });

  test("opens and disposes the secured settings panel", async () => {
    const started = performance.now();
    for (let cycle = 0; cycle < 3; cycle++) {
      await vscode.commands.executeCommand("workspaceColor.openPanel");
      await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    }
    const panelMilliseconds = performance.now() - started;
    console.log(`[performance] panel-open-dispose-3x=${panelMilliseconds.toFixed(2)}ms`);
    assert.ok(panelMilliseconds < 3_000);
  });
});

async function withWarningChoice<T>(choice: string, action: () => Promise<T>): Promise<T> {
  const windowApi = vscode.window as typeof vscode.window & {
    showWarningMessage: (...args: unknown[]) => Promise<string | undefined>;
  };
  const original = windowApi.showWarningMessage;
  windowApi.showWarningMessage = async () => choice;
  try {
    return await action();
  } finally {
    windowApi.showWarningMessage = original;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
