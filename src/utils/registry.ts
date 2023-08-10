import fetch from "node-fetch";
import { to } from ".";

type Component = {
  name: string;
  dependencies: string[];
  files: string[];
  type: "components:ui";
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

  return data as Components;
}
