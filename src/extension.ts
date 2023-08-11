import * as vscode from "vscode";

import {
  getInitCmd,
  getInstallCmd,
  getRegistry,
  shadCnDocUrl,
} from "./utils/registry";
import type { Components } from "./utils/registry";
import { executeCommand } from "./utils/vscode";

const commands = {
  initCli: "shadcn-ui.initCli",
  addNewComponent: "shadcn-ui.addNewComponent",
  reloadComponentList: "shadcn-ui.reloadComponentList",
  gotoDoc: "shadcn-ui.gotoDoc",
} as const;

export function activate(context: vscode.ExtensionContext) {
  let registryData: Components;

  const disposables: vscode.Disposable[] = [
    vscode.commands.registerCommand(commands.initCli, async () => {
      const intCmd = getInitCmd();
      executeCommand(intCmd);
    }),
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

      const installCmd = getInstallCmd([selectedComponent.label]);
      executeCommand(installCmd);
    }),
    vscode.commands.registerCommand(commands.reloadComponentList, async () => {
      const newRegistryData = await getRegistry();

      if (!newRegistryData) {
        vscode.window.showErrorMessage("Can not get the component list");
        return;
      }

      registryData = newRegistryData;

      vscode.window.showInformationMessage("shadcn/ui: Reloaded components");
    }),
    vscode.commands.registerCommand(commands.gotoDoc, async () => {
      vscode.env.openExternal(vscode.Uri.parse(shadCnDocUrl));
    }),
  ];

  context.subscriptions.push(...disposables);
}

// This method is called when your extension is deactivated
export function deactivate() {}
