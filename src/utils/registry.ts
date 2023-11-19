import fetch from "node-fetch";

import { to } from ".";
import { detectPackageManager } from "./vscode";

type OgComponent = {
  type: "components:ui";
  name: string;
  files: string[];
  dependencies?: string[];
  registryDependencies?: string[];
};

type Component = {
  label: string;
  detail?: string;
};

export const shadCnDocUrl = "https://ui.shadcn.com/docs";

export type Components = Component[];

export const getRegistry = async (): Promise<Components | null> => {
  const reqUrl = "https://ui.shadcn.com/registry/index.json";
  const [res, err] = await to(fetch(reqUrl));

  if (err || !res) {
    console.log("can not get the data");
    return null;
  }

  const [data] = await to(res.json());

  if (!data) {
    return null;
  }

  const components: Components = (data as OgComponent[]).map((c) => {
    const component: Component = {
      label: c.name,
      detail: `dependencies: ${c.dependencies ? c.dependencies.join(" ") : "no dependency"}`,
    };

    return component;
  });

  return components;
};

export const getInstallCmd = async (components: string[]) => {
  const packageManager = await detectPackageManager();
  const componentStr = components.join(" ");

  if (packageManager === "bun") {
    return `bunx shadcn-ui add ${componentStr}`;
  }

  if (packageManager === "pnpm") {
    return `pnpm dlx shadcn-ui@latest add ${componentStr}`;
  }

  return `npx shadcn-ui@latest add ${componentStr}`;
};

export const getInitCmd = async () => {
  const packageManager = await detectPackageManager();

  if (packageManager === "bun") {
    return "bunx shadcn-ui init";
  }

  if (packageManager === "pnpm") {
    return "pnpm dlx shadcn-ui@latest init";
  }

  return "npx shadcn-ui@latest init";
};

export const getComponentDocLink = (component: string) => {
  return `${shadCnDocUrl}/components/${component}`;
};
