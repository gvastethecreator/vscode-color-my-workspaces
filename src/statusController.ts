import * as vscode from "vscode";
import {
  STATUS_ITEM_ID,
  STATUS_ITEM_PRIORITY,
  type StatusPresentation,
} from "./statusDisplay.ts";

export class StatusController implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      STATUS_ITEM_ID,
      vscode.StatusBarAlignment.Left,
      STATUS_ITEM_PRIORITY,
    );
    this.item.name = "Color My Workspaces";
  }

  update(presentation: StatusPresentation): void {
    if (!presentation.visible) {
      this.item.hide();
      return;
    }
    this.item.text = presentation.text;
    this.item.tooltip = presentation.tooltip;
    this.item.command = presentation.command;
    this.item.color = undefined;
    this.item.backgroundColor = undefined;
    this.item.accessibilityInformation = {
      label: presentation.accessibilityLabel,
      role: "button",
    };
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
