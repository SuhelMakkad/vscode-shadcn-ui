import fetch from "node-fetch";
import { detectPackageManager, to } from ".";

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
      detail: `dependencies: ${
        c.dependencies ? c.dependencies.join(" ") : "no dependency"
      }`,
    };

    return component;
  });

  return components;
};

export const getInstallCmd = (components: string[]) => {
  const packageManager = detectPackageManager();
  const componentStr = components.join(" ");

  if (packageManager === "pnpm") {
    return `pnpm dlx shadcn-ui@latest add ${componentStr}`;
  }

  return `npx shadcn-ui@latest add ${componentStr}`;
};
