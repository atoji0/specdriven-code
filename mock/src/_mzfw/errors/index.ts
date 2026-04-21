/**
 * アプリケーションで利用する共通エラークラスおよびエラーハンドラを提供します。
 * ビジネスエラー、アプリケーションエラー、接続エラー、システムエラー、認可エラーを定義し、
 * グローバルエラーハンドラの登録関数も提供します。
 */

import type { Translate, ValidationError } from "../fw-types";
import { getCurrentDate } from "../utils/common";
import type { App } from "vue";
import { alertMessageBox } from "../utils/messageBox";
import { mzfwApi } from "../api/mzfwApi";

/**
 * ビジネスロジック上のエラーを表す例外クラスです。
 * 主にバリデーションエラーなど、業務的なエラーを表現します。
 */
export class BusinessError extends Error {
  public errors: ValidationError[];
  /**
   * @param errors バリデーションエラーの配列
   */
  constructor(errors: ValidationError[]) {
    super();
    this.errors = errors;
    this.name = new.target.name;
  }
}

/**
 * アプリケーション固有のエラーを表す例外クラスです。
 * 業務ロジック以外のアプリケーションレベルのエラーに利用します。
 */
export class ApplicationError extends Error {
  /**
   * @param message エラーメッセージ
   */
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * サーバとの接続エラーを表す例外クラスです。
 * 通信断やタイムアウトなど、ネットワーク関連のエラーに利用します。
 */
export class ConnectionError extends Error {
  constructor() {
    super();
    this.name = new.target.name;
    if (typeof (Error as any).captureStackTrace === "function") {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * システムエラー（予期しない例外）を表す例外クラスです。
 * 例外発生時のリクエストログIDなどを保持できます。
 */
export class SystemError extends Error {
  public requestLogId: string;
  /**
   * @param message エラーメッセージ
   * @param requestLogId リクエストログID
   */
  constructor(message: string, requestLogId: string) {
    super(message);
    this.name = new.target.name;
    this.requestLogId = requestLogId;
    if (typeof (Error as any).captureStackTrace === "function") {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 認可エラー（認証・認可失敗）を表す例外クラスです。
 * 認証・認可に失敗した場合に利用します。
 */
export class AuthorizationError extends Error {
  constructor() {
    super("");
    this.name = new.target.name;
  }
}

/**
 * グローバルエラーハンドラをVueアプリケーションに登録します。
 * アプリケーション全体のエラーを一元的に処理できます。
 *
 * @param t i18nの翻訳関数
 * @param app Vueアプリケーションインスタンス
 * @param onRoute 画面遷移を行う関数
 */
export const registerGlobalErrorHandlers = (t: Translate, app: App, onRoute: (route: { name: string; query?: Record<string, string> }) => void) => {
  app.config.errorHandler = (err: any) => {
    handleError(t, err, onRoute);
  };

  window.addEventListener("error", (event) => {
    handleError(t, event.error?.st ?? event.error, onRoute);
  });

  window.addEventListener("unhandledrejection", (event) => {
    handleError(t, event.reason, onRoute);
  });
};

/**
 * 共通エラーハンドラ
 * 各種エラークラスに応じて適切な処理・画面遷移を行います。
 *
 * @param t i18nの翻訳関数
 * @param err 発生したエラー
 * @param onRoute 画面遷移を行う関数
 */
const handleError = (t: Translate, err: any, onRoute: (route: { name: string; query?: Record<string, string> }) => void) => {
  if (err instanceof ApplicationError) {
    // アプリケーションエラーはアラートで表示
    alertMessageBox(err.message);
  } else if (err instanceof AuthorizationError) {
    // 認可エラーはアクセスエラー画面へ遷移
    onRoute({ name: "AccessError" });
  } else if (err instanceof SystemError) {
    sessionStorage.setItem("errorTimeStamp", getCurrentDate());
    sessionStorage.setItem("errorMessage", err.message);
    sessionStorage.setItem("requestLogId", err.requestLogId);
    // システムエラーはシステムエラー画面へ遷移
    onRoute({ name: "SystemError" });
  } else if (err instanceof ConnectionError) {
    sessionStorage.setItem("errorTimeStamp", getCurrentDate());
    sessionStorage.setItem("errorMessage", t("z9b.message.error.systemClosed"));
    sessionStorage.setItem("requestLogId", "");
    // 接続エラーはシステムエラー画面へ遷移
    onRoute({ name: "SystemError" });
  } else {
    sessionStorage.setItem("errorTimeStamp", getCurrentDate());
    sessionStorage.setItem("errorMessage", err?.message + "\n" + err.stack);
    sessionStorage.setItem("requestLogId", "");
    // その他のエラーはシステムエラー画面へ遷移
    mzfwApi.postTraceLog("error", err.message + "\n" + err.stack || "");
    onRoute({ name: "SystemError" });
  }
};
