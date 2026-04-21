import { getUserId } from "../utils/common";

// MazdaFW APIサービス
export const mzfwApi = {
  getRoles: (): Promise<string[]> => {
    let userId = getUserId();
    if (userId === "admin") {
      return Promise.resolve(["ADMIN"]);
    } else {
      return Promise.resolve(["USER"]);
    }
  },
  postTraceLog: (logLevel: string, logMessage: string): Promise<void> => {
    logLevel;
    logMessage;
    return Promise.resolve();
  },
};
