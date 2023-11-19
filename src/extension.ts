import * as vscode from "vscode";

import {
  getInitCmd,
  getInstallCmd,
  getComponentDocLink,
  getRegistry,
  shadCnDocUrl,
} from "./utils/registry";
import { executeCommand } from "./utils/vscode";
import { logCmd } from "./utils/logs";
import type { Components } from "./utils/registry";

const commands = {
  initCli: "shadcn-ui.initCli",
  addNewComponent: "shadcn-ui.addNewComponent",
  addMultipleComponents: "shadcn-ui.addMultipleComponents",
  gotoComponentDoc: "shadcn-ui.gotoComponentDoc",
  reloadComponentList: "shadcn-ui.reloadComponentList",
  gotoDoc: "shadcn-ui.gotoDoc",
} as const;

export function activate(context: vscode.ExtensionContext) {
  let registryData: Components;

  const checkRegistryData = async () => {
    if (registryData) {
      return true;
    }

    const newRegistryData = await getRegistry();
    if (!newRegistryData) {
      vscode.window.showErrorMessage("Can not get the component list");
      return false;
    }

    registryData = newRegistryData;
    return true;
  };

  const disposables: vscode.Disposable[] = [
    vscode.commands.registerCommand(commands.initCli, async () => {
      const intCmd = await getInitCmd();

      executeCommand(intCmd);
      await logCmd(intCmd);
    }),

    vscode.commands.registerCommand(commands.addNewComponent, async () => {
      await checkRegistryData();

      const selectedComponent = await vscode.window.showQuickPick(registryData, {
        matchOnDescription: true,
      });

      if (!selectedComponent) {
        return;
      }

      const installCmd = await getInstallCmd([selectedComponent.label]);

      executeCommand(installCmd);
      await logCmd(installCmd);
    }),

    vscode.commands.registerCommand(commands.addMultipleComponents, async () => {
      await checkRegistryData();

      const selectedComponents = await vscode.window.showQuickPick(registryData, {
        matchOnDescription: true,
        canPickMany: true,
      });

      if (!selectedComponents) {
        return;
      }

      const selectedComponent = selectedComponents.map((component) => component.label);
      const installCmd = await getInstallCmd(selectedComponent);

      executeCommand(installCmd);
      await logCmd(installCmd);
    }),

    vscode.commands.registerCommand(commands.gotoComponentDoc, async () => {
      await checkRegistryData();

      const selectedComponent = await vscode.window.showQuickPick(registryData, {
        matchOnDescription: true,
      });

      if (!selectedComponent) {
        return;
      }

      const componentDocLink = getComponentDocLink(selectedComponent.label);

      vscode.env.openExternal(vscode.Uri.parse(componentDocLink));
      await logCmd(componentDocLink);
    }),
    vscode.commands.registerCommand(commands.reloadComponentList, async () => {
      await checkRegistryData();

      vscode.window.showInformationMessage("shadcn/ui: Reloaded components");
      await logCmd("reload registry data");
    }),
    vscode.commands.registerCommand(commands.gotoDoc, async () => {
      vscode.env.openExternal(vscode.Uri.parse(shadCnDocUrl));
      await logCmd(shadCnDocUrl);
    }),
  ];

  context.subscriptions.push(...disposables);
}

// This method is called when your extension is deactivated
export function deactivate() {}
