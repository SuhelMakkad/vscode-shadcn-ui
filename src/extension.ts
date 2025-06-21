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

class GetShadcnComponentListTool implements vscode.LanguageModelTool<{}> {
  private static registryCache: { data: any; timestamp: number } | null = null;
  private static readonly cacheTtl = 5 * 60 * 1000; // 5 minutes

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<{}>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    
      try {
        if (token.isCancellationRequested) {
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart("Operation was cancelled"),
          ]);
        }

        const now = Date.now();
        if (GetShadcnComponentListTool.registryCache && 
            (now - GetShadcnComponentListTool.registryCache.timestamp) < GetShadcnComponentListTool.cacheTtl) {
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify(GetShadcnComponentListTool.registryCache.data)),
          ]);
        }

        const components = await getRegistry();

        if (token.isCancellationRequested) {
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart("Operation was cancelled"),
          ]);
        }

        if (!components) {
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(
              "Failed to fetch component list from shadcn/ui registry"
            ),
          ]);
        }

        // cache the components
        GetShadcnComponentListTool.registryCache = {
          data: components,
          timestamp: Date.now()
        };

        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(JSON.stringify(components)),
        ]);
      } catch (error) {
        if (token.isCancellationRequested) {
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart("Operation was cancelled"),
          ]);
        }
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(`Error fetching components: ${error}`),
        ]);
      }
    };
  }

interface InstallComponentInput {
  id: string[];
}

class InstallShadcnComponentTool
  implements vscode.LanguageModelTool<InstallComponentInput>
{
  // regex patterns to clean up the output from install commands
  private static readonly ansiRegex = /([\u001B\u009B][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]|\u001B|\u0007)/gu;
  private static readonly spinnerRegex = /^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]\s/g;
  private static readonly vscodeShellRegex = /]633;C|/g;
  private static readonly newTerminal = true;

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<InstallComponentInput>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
      try {
      // check if we've been cancelled
      if (token.isCancellationRequested) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart("Operation was cancelled"),
        ]);
      }

      const { id } = options.input;

      if (!id || !Array.isArray(id) || id.length === 0) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            "No component names provided. Please specify component name(s) to install."
          ),
        ]);
      }

      const installCmd = await getInstallCmd(id);

      const [terminal, execution, stream] = await executeCommand(
        installCmd,
        InstallShadcnComponentTool.newTerminal
      );
      if (!execution || !stream) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            "Failed to execute the installation command."
          ),
        ]);
      }
      await logCmd(installCmd);
      const output: string[] = [];
      const componentList = id.join(", ");
      let duplicateCount = 0;
      let lastLine = "";

      try {
        for await (let line of stream) {
          if (token.isCancellationRequested) {
            break;
          }

          // clean up the line before pushing it to the output
          line = line
            // first regex to remove ANSI escape codes/bash colors
            .replace(
              InstallShadcnComponentTool.ansiRegex,
              ""
            )
            // second regex to remove the spinners
            .replace(InstallShadcnComponentTool.spinnerRegex, "")
            // third regex to remove VSCode shell integration stuff
            .replace(InstallShadcnComponentTool.vscodeShellRegex, "")
            .trim();
          if (line === "") {
            continue;
          }
          if (line === output[output.length - 1]) {
            duplicateCount++;
            lastLine = line;
            continue; // skip duplicate lines
          }
          // add indication for duplicate
          if (duplicateCount > 0) {
            const lastOutputIndex = output.length - 1;
            output[lastOutputIndex] = `${lastLine} [x${duplicateCount + 1}]`;
            duplicateCount = 0;
          }
          output.push(line);
        }
      } finally {
        if (terminal && InstallShadcnComponentTool.newTerminal) {
          // close the terminal if it was created for us
          terminal.dispose();
        }
      }
      if (duplicateCount > 0) {
        const lastOutputIndex = output.length - 1;
        output[lastOutputIndex] = `${lastLine} [x${duplicateCount + 1}]`;
      }

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          JSON.stringify({
            output: output.join("\n"),
            command: installCmd,
            componentList,
          })
        ),
      ]);
    } catch (error) {
      if (token.isCancellationRequested) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart("Operation was cancelled"),
        ]);
      }
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Error installing components: ${error}`
        ),
      ]);
    }
    };
  }

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

  const toolDisposables = [
    vscode.lm.registerTool(
      "get_shadcnComponentList",
      new GetShadcnComponentListTool()
    ),
    vscode.lm.registerTool(
      "install_shadcnComponent",
      new InstallShadcnComponentTool()
    ),
  ];

  const disposables: vscode.Disposable[] = [
    vscode.commands.registerCommand(commands.initCli, async () => {
      const intCmd = await getInitCmd();

      executeCommand(intCmd);
      await logCmd(intCmd);
    }),

    vscode.commands.registerCommand(commands.addNewComponent, async () => {
      await checkRegistryData();

      const selectedComponent = await vscode.window.showQuickPick(
        registryData,
        {
          matchOnDescription: true,
        }
      );

      if (!selectedComponent) {
        return;
      }

      const installCmd = await getInstallCmd([selectedComponent.label]);

      executeCommand(installCmd);
      await logCmd(installCmd);
    }),

    vscode.commands.registerCommand(
      commands.addMultipleComponents,
      async () => {
        await checkRegistryData();

        const selectedComponents = await vscode.window.showQuickPick(
          registryData,
          {
            matchOnDescription: true,
            canPickMany: true,
          }
        );

        if (!selectedComponents) {
          return;
        }

        const selectedComponent = selectedComponents.map(
          (component: { label: string }) => component.label
        );
        const installCmd = await getInstallCmd(selectedComponent);

        executeCommand(installCmd);
        await logCmd(installCmd);
      }
    ),

    vscode.commands.registerCommand(commands.gotoComponentDoc, async () => {
      await checkRegistryData();

      const selectedComponent = await vscode.window.showQuickPick(
        registryData,
        {
          matchOnDescription: true,
        }
      );

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

  context.subscriptions.push(...disposables, ...toolDisposables);
}

// This method is called when your extension is deactivated
export function deactivate() {}
