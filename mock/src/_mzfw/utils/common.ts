/**
 * ロケールや日時、環境情報などの共通ユーティリティ関数群を提供するモジュールです。
 */

import dayjs from "dayjs";
import { useMzfwStore } from "../store";

/**
 * ユーザIDを取得します。
 * @param withPrefix WSS-プレフィックスを付与するか
 * @returns ユーザID文字列
 */
export const getUserId = (withPrefix = false) => {
  const id = useMzfwStore().userId;
  return id ? (withPrefix ? "UserID : " + id : id) : "";
};

/**
 * 環境情報を取得しストアに反映します。
 * @param envJsonPath env.jsonのパス
 */
export const fetchEnv = async (envJsonPath: string) => {
  await useMzfwStore().fetchEnv(envJsonPath);
};

/**
 * 現在日時（日本時間）を取得します。
 * @returns フォーマット済み日時文字列
 */
export const getCurrentDate = () => dayjs().tz("Asia/Tokyo").format("YYYY-MM-DD HH:mm:ss(JST)");

/**
 * 現在の環境名を取得します。
 * @returns 環境名
 */
export const getEnvName = (): string => useMzfwStore().env?.envName || "local";

/**
 * 現在のロケールを取得します。
 * @returns ロケール文字列
 */
export const getLocale = (): string => {
  if (sessionStorage.getItem("locale") != null) {
    return sessionStorage.getItem("locale") || "ja";
  } else {
    const nav = window.navigator as Navigator;
    const lang = (nav.languages && nav.languages[0]) || nav.language || "ja";
    return lang.split("-")[0] || "ja";
  }
};

/**
 * ロケールを設定します。
 * @param locale ロケール文字列
 */
export const setLocale = (locale: string) => sessionStorage.setItem("locale", locale);

/**
 * 指定したセルの値を、Boolean型に変換します。0/1以外は、undefinedを返します。
 * @param v 変換対象の値
 * @returns 数値またはundefined
 */
export const celltoBoolean = (v: any): boolean | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const num = Number(v);
  return num === 0 || num === 1 ? num === 1 : undefined;
};

/**
 * 指定したセルの値を、日付型に変換します。
 *  日付型以外、1900年の場合 ... 異常値(1900-01-01)
 *  空文字、null、undefinedの場合 ... undefined
 * @param v 変換対象の値
 * @returns Dateオブジェクトまたはundefined
 */
export const celltoDate = (v: any): Date | undefined => {
  const INVALID_DATE = new Date("1900-01-01");
  if (v === null || v === undefined || v === "") {
    return undefined;
  }
  if (!(v instanceof Date)) {
    return INVALID_DATE;
  }
  return v.getFullYear() === 1900 ? INVALID_DATE : v;
};
