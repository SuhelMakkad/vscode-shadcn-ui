import * as vscode from "vscode";

import { getRegistry } from "./utils/registry";
import type { Components } from "./utils/registry";

const commands = {
  addNewComponent: "shadcn-ui.addNewComponent",
  reloadComponentList: "shadcn-ui.reloadComponentList",
} as const;

export function activate(context: vscode.ExtensionContext) {
  let registryData: Components;

  let disposables: vscode.Disposable[] = [
    vscode.commands.registerCommand(commands.addNewComponent, async () => {
      if (!registryData) {
        const newRegistryData = await getRegistry();

        if (!newRegistryData) {
          vscode.window.showErrorMessage("Can not get the component list");
          return;
        }

        registryData = newRegistryData;
      }

      vscode.window.showInformationMessage("!!! Hello World from shadcn/ui!");
    }),
    vscode.commands.registerCommand(commands.reloadComponentList, async () => {
      const newRegistryData = await getRegistry();

      if (!newRegistryData) {
        vscode.window.showErrorMessage("Can not get the component list");
        return;
      }

      registryData = newRegistryData;

      vscode.window.showInformationMessage("Reloaded shadcn/ui components");
    }),
  ];

  context.subscriptions.push(...disposables);
}

// This method is called when your extension is deactivated
export function deactivate() {}
