/**
 * アプリケーション全体の状態管理を行うPiniaストアモジュールです。
 * ユーザIDや環境情報、サイドメニュー状態などを管理します。
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";
import type { EnvJson } from "../fw-types";

/**
 * フレームワーク共通ストア（ユーザID・ロール・環境情報・サイドメニュー状態を管理）
 */
export const useMzfwStore = defineStore("mzfw", () => {
  const userId = ref<string>(sessionStorage.getItem("userId") || "");
  const roles = ref<string[]>(JSON.parse(sessionStorage.getItem("roles") || "[]"));
  const isSideMenuOpen = ref<boolean>(true);
  const env = ref<EnvJson>({
    frontendUrl: "",
    backendUrl: "",
    envName: "",
    useDummyAuth: true,
    wssoUserKey: "ssouser",
  });

  /**
   * サイドメニューの開閉状態をトグルします。
   */
  const changeSideMenu = () => {
    isSideMenuOpen.value = !isSideMenuOpen.value;
  };

  /**
   * ユーザIDをセットし、sessionStorageにも保存します。
   * @param newUserId 新しいユーザID
   */
  const setUserId = (newUserId: string) => {
    userId.value = newUserId;
    if (newUserId === "") {
      sessionStorage.removeItem("userId");
    } else {
      sessionStorage.setItem("userId", newUserId);
    }
  };

  /**
   * ユーザIDをセットし、sessionStorageにも保存します。
   * @param newUserId 新しいユーザID
   */
  const setRoles = (newRoles: string[]) => {
    roles.value = newRoles;
    sessionStorage.setItem("roles", JSON.stringify(newRoles));
  };

  /**
   * 指定パスのenv.jsonから環境情報を取得し、ストアに反映します。
   * @param envJsonPath env.jsonのパス
   */
  const fetchEnv = async (envJsonPath: string) => {
    try {
      const response = await axios.get<EnvJson[]>(envJsonPath);
      const currentUrl = window.location.protocol + "//" + window.location.host;
      if (Array.isArray(response.data)) {
        // 配列の場合のみ find を使用
        const foundEnv = response.data.find((item) => item.frontendUrl === currentUrl);
        if (foundEnv) {
          env.value.backendUrl = foundEnv.backendUrl;
          env.value.envName = foundEnv.envName;
          if (foundEnv.useDummyAuth !== undefined) env.value.useDummyAuth = foundEnv.useDummyAuth;
          if (foundEnv.wssoUserKey !== undefined) env.value.wssoUserKey = foundEnv.wssoUserKey;
        }
      }
    } catch {
      // file:// で直接開いた場合など env.json が取得できないケースは無視して続行
    }
  };
  return { userId, roles, isSideMenuOpen, env, setUserId, setRoles, changeSideMenu, fetchEnv };
});
