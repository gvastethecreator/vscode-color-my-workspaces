import * as vscode from "vscode";
import { StatusController } from "./statusController.ts";
import { WorkspaceColorController } from "./workspaceColorController.ts";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const status = new StatusController();
  const controller = new WorkspaceColorController(context, status);
  context.subscriptions.push(status, controller);

  const register = (command: string, action: () => Promise<void>) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, async () => {
        try {
          await action();
        } catch {
          await vscode.window.showErrorMessage("Color My Workspaces could not complete that action.");
        }
      }),
    );
  };

  register("workspaceColor.applyFromFolder", () => controller.runApplyFromFolder());
  register("workspaceColor.pick", () => controller.runPick());
  register("workspaceColor.quickActions", () => controller.runQuickActions());
  register("workspaceColor.openPanel", () => controller.openPanel());
  register("workspaceColor.surprise", () => controller.runSurprise());
  register("workspaceColor.reset", () => controller.runClear());
  register("workspaceColor.resetSettings", () => controller.runResetSettings());
  register("workspaceColor.setDefaults", () => controller.runSetDefaults());
  register("workspaceColor.reapply", () => controller.runReapply());

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("workspaceColor") ||
        event.affectsConfiguration("workbench.colorCustomizations") ||
        event.affectsConfiguration("workbench.experimental.modernUI") ||
        event.affectsConfiguration("workbench.activityBar.location")
      ) {
        controller.scheduleRefresh();
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => controller.scheduleRefresh()),
    vscode.window.onDidChangeActiveColorTheme(() => controller.scheduleRefresh()),
  );

  await controller.initialize();
}

export function deactivate(): void {}
