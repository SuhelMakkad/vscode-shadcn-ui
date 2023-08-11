import * as vscode from "vscode";

export const executeCommand = (cmd: string, createNew = true) => {
  let terminal = vscode.window.activeTerminal;
  if (createNew || !terminal) {
    terminal = vscode.window.createTerminal();
  }

  terminal.show();
  terminal.sendText(cmd);
};
