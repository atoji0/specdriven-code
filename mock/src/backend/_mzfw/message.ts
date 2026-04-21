/**
 * MODULE: message — 国際化対応メッセージ取得
 * messages.ja.json / messages.en.json からキーを引いてプレースホルダー置換する。
 *
 * Types:
 *   Locale   "ja" | "en"
 *
 * Functions:
 * setLocale(locale)  → void
 *   現在のロケールを切り替える。デフォルトは "ja"。
 *
 * getLocale()  → Locale
 *   現在のロケールを返す。
 *
 * getMessage(key, arg1?, arg2?, arg3?)  → string
 *   ドット区切りキー（例: "validation.required" / "charType.AsciiAlphanumeric"）でメッセージを取得。
 *   {arg1}/{arg2}/{arg3} プレースホルダーを引数で置換する。キーが見つからない場合はキー文字列をそのまま返す。
 */

import messagesJa from './messages/messages.ja.json';
import messagesEn from './messages/messages.en.json';

export type Locale = 'ja' | 'en';

type Messages = typeof messagesJa;

const messages: Record<Locale, Messages> = {
  ja: messagesJa,
  en: messagesEn,
};

let currentLocale: Locale = 'ja';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function getMessage(
  key: string,
  arg1?: string | number,
  arg2?: string | number,
  arg3?: string | number
): string {
  const keys = key.split('.');
  let message: any = messages[currentLocale];

  // ネストされたキーを辿る
  for (const k of keys) {
    if (message && typeof message === 'object') {
      message = message[k];
    } else {
      return key; // キーが見つからない場合はキーをそのまま返す
    }
  }

  if (typeof message !== 'string') {
    return key;
  }

  return message
    .replace('{arg1}', arg1 !== undefined ? String(arg1) : '')
    .replace('{arg2}', arg2 !== undefined ? String(arg2) : '')
    .replace('{arg3}', arg3 !== undefined ? String(arg3) : '');
}
