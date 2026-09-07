import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { ALL_CHROME_ELEMENTS, type ChromeElement } from "./managedKeys.ts";
import { STATUS_ICONS } from "./icons.ts";
import { PALETTE } from "./palette.ts";
import { parsePanelMessage, SUPPORT_URL, type PanelMessage } from "./panelMessages.ts";
import { escapeHtml, type PanelState } from "./panelState.ts";

let panel: vscode.WebviewPanel | undefined;

export function openColorPanel(
  context: vscode.ExtensionContext,
  getState: () => PanelState,
  onMessage: (message: PanelMessage) => Promise<void>,
): void {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside);
    postPanelState(getState());
    return;
  }

  const current = vscode.window.createWebviewPanel(
    "workspaceColor.settings",
    "Color My Workspaces",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "dist")],
    },
  );
  panel = current;
  current.webview.html = renderHtml(context, current.webview);

  const messageDisposable = current.webview.onDidReceiveMessage((unknownMessage: unknown) => {
    const message = parsePanelMessage(unknownMessage);
    if (!message) {
      return;
    }
    void onMessage(message).catch(() => {
      void vscode.window.showErrorMessage("Color My Workspaces could not complete that panel action.");
    });
  });
  current.onDidDispose(() => {
    messageDisposable.dispose();
    if (panel === current) {
      panel = undefined;
    }
  });
  context.subscriptions.push(current);
}

export function postPanelState(state: PanelState): void {
  void panel?.webview.postMessage({ type: "state", state });
}

function renderHtml(context: vscode.ExtensionContext, webview: vscode.Webview): string {
  const nonce = randomBytes(24).toString("base64url");
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "dist", "panel.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "dist", "panel.css"));
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} data:`,
    `style-src ${webview.cspSource}`,
    `script-src 'nonce-${nonce}'`,
  ].join("; ");

  const surfaces = ALL_CHROME_ELEMENTS.map((element) => {
    return `<label class="option" title="${escapeHtml(FLAG_TIPS[element])}">
      <input type="checkbox" data-flag="${element}" />
      <span class="surface-swatch" data-tone="${element}" aria-hidden="true"></span>
      <span>${escapeHtml(FLAG_LABELS[element])}</span>
    </label>`;
  }).join("");

  const swatches = PALETTE.map(
    (item) =>
      `<button type="button" class="palette-chip" data-color="${escapeHtml(item.color)}" title="${escapeHtml(`${item.label} ${item.color}`)}" aria-label="${escapeHtml(`${item.label} ${item.color}`)}" aria-pressed="false"><span>${escapeHtml(item.color)}</span></button>`,
  ).join("");

  const icons = STATUS_ICONS.map((id) => {
    const safe = escapeHtml(id);
    return `<button type="button" class="icon-option" role="option" data-icon="${safe}" title="${safe}" aria-label="${safe}" aria-selected="false"></button>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>Color My Workspaces</title>
</head>
<body>
  <main class="page">
    <header>
      <h1>Color My Workspaces</h1>
      <p class="muted" id="statusLine" role="status" aria-live="polite">Loading workspace state…</p>
      <p class="notice" id="conflictNotice" role="status" hidden></p>
    </header>

    <div class="split">
      <section class="preview-pane" aria-labelledby="previewTitle">
        <h2 id="previewTitle">Preview</h2>
        <div class="preview" aria-hidden="true">
          <div class="preview-title" data-tone="titleBar"></div>
          <div class="preview-activity-top" data-tone="activityBar"></div>
          <div class="preview-middle">
            <div class="preview-activity" data-tone="activityBar"></div>
            <div class="preview-editor">
              <span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
          <div class="preview-status" data-tone="statusBar">
            <span id="statusPreviewChip" class="preview-chip" aria-hidden="true"></span>
            <span id="statusPreviewIcon" class="preview-icon" aria-hidden="true"></span>
            <span id="statusPreviewLabel"></span>
          </div>
        </div>
      </section>

      <section aria-labelledby="colorTitle">
        <h2 id="colorTitle">Workspace color</h2>
        <div class="color-row">
          <input id="picker" type="color" aria-label="Workspace color" />
          <input id="hex" type="text" spellcheck="false" maxlength="7" aria-label="Hex color" aria-invalid="false" aria-describedby="hexError" />
          <button type="button" class="button secondary" id="copyHex">Copy</button>
        </div>
        <p id="hexError" class="error" hidden role="status">Enter a color like #3b3b8f.</p>
        <div class="palette" aria-label="Color palette">${swatches}</div>
        <div class="sliders">
          <label class="slider"><span>Hue</span><input id="hue" type="range" min="0" max="360" /><output id="hueValue" for="hue">0</output></label>
          <label class="slider"><span>Saturation</span><input id="saturation" type="range" min="0" max="100" /><output id="saturationValue" for="saturation">0</output></label>
          <label class="slider"><span>Brightness</span><input id="brightness" type="range" min="0" max="100" /><output id="brightnessValue" for="brightness">0</output></label>
          <label class="slider"><span>Contrast</span><input id="contrast" type="range" min="0" max="100" value="50" /><output id="contrastValue" for="contrast">50</output></label>
        </div>
        <div class="actions">
          <button type="button" class="button" data-action="applyFromFolder">Use folder color</button>
          <button type="button" class="button secondary" data-action="surprise">Surprise me</button>
          <button type="button" class="button secondary" data-action="reset" id="clearColor">Clear color</button>
        </div>
      </section>
    </div>

    <section aria-labelledby="surfacesTitle" aria-describedby="chromeNote">
      <h2 id="surfacesTitle">Surfaces</h2>
      <p class="sr-only" id="chromeNote"></p>
      <div class="option-grid">${surfaces}</div>
      <div class="option-grid compact">
        <label class="option" title="Use a slightly different tone on each enabled surface."><input id="stepped" type="checkbox" /><span>Stepped tones</span></label>
        <label class="option" title="This changes an experimental VS Code setting and requires a reload."><input id="separateBars" type="checkbox" /><span>Disable Modern UI</span></label>
        <label class="option" title="Apply the derived or saved color whenever this workspace opens."><input id="autoApply" type="checkbox" /><span>Auto-apply on open</span></label>
      </div>
    </section>

    <section aria-labelledby="statusTitle">
      <h2 id="statusTitle">Status bar</h2>
      <div class="form-row">
        <label class="option inline"><input id="showLabel" type="checkbox" /><span>Show name</span></label>
        <input id="label" type="text" maxlength="80" aria-label="Workspace name" />
      </div>
      <div class="form-row">
        <label class="option inline"><input id="showIcon" type="checkbox" /><span>Show icon</span></label>
        <div class="icon-picker">
          <button type="button" class="button secondary icon-trigger" id="pickIcon" aria-haspopup="listbox" aria-expanded="false" aria-controls="iconMenu"><span id="pickIconGlyph" aria-hidden="true"></span><span id="pickIconId"></span></button>
          <div class="icon-menu" id="iconMenu" hidden role="listbox" aria-label="Status bar icons">${icons}</div>
        </div>
      </div>
      <div class="form-row">
        <label for="statusBarClick">On click</label>
        <select id="statusBarClick" aria-label="Status bar click action"><option value="quick">Quick settings</option><option value="full">Full settings panel</option></select>
      </div>
    </section>

    <footer>
      <div class="footer-actions">
        <button type="button" class="button secondary" data-action="resetSettings" id="resetSettings">Reset to inheritance...</button>
        <button type="button" class="button secondary" data-action="setDefaults" id="setDefaults">Apply factory defaults...</button>
      </div>
      <p class="support">
        <a href="${SUPPORT_URL}" id="supportLink">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          Support this project, give a star
        </a>
      </p>
    </footer>
  </main>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

const FLAG_LABELS: Record<ChromeElement, string> = {
  titleBar: "Window shell",
  activityBar: "Activity bar",
  statusBar: "Status bar",
  commandCenter: "Command center",
};

const FLAG_TIPS: Record<ChromeElement, string> = {
  titleBar: "Colors the title bar and window shell.",
  activityBar: "Colors the side rail and the top or bottom activity bar.",
  statusBar: "Colors the status bar and its remote and debugging states.",
  commandCenter: "Colors the command center in the title bar.",
};
