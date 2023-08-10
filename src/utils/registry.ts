import fetch from "node-fetch";
import { to } from ".";

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

export type Components = Component[];

export async function getRegistry(): Promise<Components | null> {
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

    console.log(component);
    

    return component;
  });

  return components;
}
