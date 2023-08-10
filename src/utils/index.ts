import { existsSync } from "fs";

export const to = async <T>(promise: Promise<T>) => {
  try {
    const res = await promise;
    return [res, null] as const;
  } catch (error) {
    console.error(error);
    return [null, error] as const;
  }
};

export const detectPackageManager = () => {
  const basePath = "../../";
  const yarnLockExists = existsSync(`${basePath}yarn.lock`);
  const pnpmLockExists = existsSync(`${basePath}pnpm-lock.yaml`);

  if (pnpmLockExists) {
    return "pnpm";
  }

  if (yarnLockExists) {
    return "yarn";
  }

  return "npm";
};
