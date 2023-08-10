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

      const selectedComponent = await vscode.window.showQuickPick(
        registryData,
        {
          matchOnDescription: true,
        }
      );

      if (!selectedComponent) {
        return;
      }

      console.log({ selectedComponent });
    }),
    vscode.commands.registerCommand(commands.reloadComponentList, async () => {
      const newRegistryData = await getRegistry();
      console.log(newRegistryData);

      if (!newRegistryData) {
        vscode.window.showErrorMessage("Can not get the component list");
        return;
      }

      registryData = newRegistryData;

      vscode.window.showInformationMessage("shadcn/ui: Reloaded components");
    }),
  ];

  context.subscriptions.push(...disposables);
}

// This method is called when your extension is deactivated
export function deactivate() {}
