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
