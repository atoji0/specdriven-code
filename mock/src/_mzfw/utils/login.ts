/**
 * ダミーログイン機能のためのユーティリティモジュールです。
 * ダミーログインのリダイレクト・検証・実行処理を提供します。
 */

import { useMzfwStore } from "../store";
import { AuthorizationError } from "../errors";
import type { Translate } from "../fw-types";
import { mzfwApi } from "../api/mzfwApi";
import { alertMessageBox } from "./messageBox";

/**
 * ダミーログインが必要な場合、ダミーログイン画面へリダイレクトします。
 */
/**
 * ダミーログインのリダイレクトや認可チェックを行うナビゲーションガードです。
 */
export const dummyLoginNavigationGuard = async (to: any, from: any, next: (location?: any) => void) => {
  console.log("🟢 Navigation guard - from:", from.path, "to:", to.path);
  const store = useMzfwStore();
  const isLoggedIn = sessionStorage.getItem("userId") != null;
  const isDummyLoginPage = to.name === "DummyLogin";
  const useDummyAuth = store.env.useDummyAuth;

  console.log("🟢 isLoggedIn:", isLoggedIn, "isDummyLoginPage:", isDummyLoginPage, "useDummyAuth:", useDummyAuth);

  // アクセスエラーの時は、そのまま次の処理へ進む
  if (to.name === "AccessError") {
    console.log("🟢 Access to AccessError page - allowing");
    next();
    return;
  }

  if (!isLoggedIn) {
    // ログインしていない場合、ダミーログインが有効かどうかを確認
    if (useDummyAuth) {
      if (!isDummyLoginPage) {
        console.log("🟢 Not logged in - redirecting to DummyLogin");
        next({ name: "DummyLogin", query: { redirect: to.fullPath } });
        return;
      }
    } else {
      console.log("🟢 DummyAuth disabled - redirecting to AccessError");
      next({ name: "AccessError" });
      return;
    }
  } else if (to.meta && Array.isArray(to.meta.roles) && to.meta.roles.length > 0) {
    // アクセス制限があるかチェックする
    const userRoles = store.roles;
    console.log("🟢 Checking roles - required:", to.meta.roles, "user has:", userRoles);
    if (!userRoles.some((role: string) => to.meta.roles.includes(role))) {
      console.log("🟢 Insufficient roles - redirecting to AccessError");
      next({ name: "AccessError" });
      return;
    }
  }

  console.log("🟢 Navigation allowed - proceeding to:", to.path);
  next();
  return;
};

/**
 * ダミーログインが有効かどうかを検証します。
 * 無効な場合はAuthorizationErrorをthrowします。
 */
export const validateDummyLoginAvailable = async () => {
  if (!useMzfwStore().env.useDummyAuth) {
    throw new AuthorizationError();
  }
};

/**
 * ダミーログイン処理を行います。
 * userIdが未入力の場合はBusinessErrorをthrowします。
 */
export const dummyLogin = async (userId: string, t: Translate): Promise<boolean> => {
  console.log("🟡 dummyLogin called with userId:", userId);
  useMzfwStore().setUserId(userId);
  try {
    console.log("🟡 Getting roles for userId:", userId);
    const roles = await mzfwApi.getRoles();
    console.log("🟡 Roles received:", roles);
    useMzfwStore().setRoles(roles);
    console.log("🟡 Login successful");
  } catch (e) {
    console.error("❌ Error during login:", e);
    if (e instanceof AuthorizationError) {
      alertMessageBox(t("z9b.message.error.dummyAuthFailed"));
      return false;
    } else {
      throw e;
    }
  }
  return true;
};
