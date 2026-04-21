/**
 * ロケール選択肢の型
 */
export interface LocaleItem {
  name: string;
  locale: string;
  font: string;
}

/**
 * プルダウン選択肢の型
 */
export interface SelectOption {
  /** 選択肢の値 */
  value: string | number;
  /** 表示ラベル */
  label: string;
}

/**
 * アプリケーション全体の設定型
 */
export interface AppConfig {
  /** アプリケーション名 */
  name: string;
  /** バージョン */
  version: string;
  /** デフォルトロケール */
  defaultLocale: string;
  /** ロケール選択肢（表示名・アイコン含む） */
  localeItems: LocaleItem[];
  /** ロゴを表示するか */
  showLogo: boolean;
}
/**
 * フレームワークで利用する型定義をまとめたモジュールです。
 */

/**
 * i18n用の翻訳関数型
 * @param key 翻訳キー
 * @param params パラメータ
 * @returns 翻訳後の文字列
 */
export type Translate = (key: string, params?: Record<string, any>) => string;

/**
 * トランザクション種別（追加・更新・削除）
 */
export enum TransactionType {
  /** 未変更（初期状態） */
  NONE = "",
  /** 追加 */
  ADD = "A",
  /** 更新 */
  UPDATE = "U",
  /** 削除 */
  DELETE = "D",
}

/**
 * 環境情報（各種URLや環境名など）
 */
export type EnvJson = {
  /** フロントエンドURL */
  frontendUrl: string;
  /** バックエンドURL */
  backendUrl: string;
  /** 環境名 */
  envName: string;
  /** ダミー認証利用有無 */
  useDummyAuth: boolean;
  /** WSSOユーザーキー */
  wssoUserKey: string;
};

/**
 * バリデーションエラー情報
 */
export type ValidationError = {
  /** エラー項目名 */
  field: string;
  /** エラーメッセージ */
  message: string;
  /** カラム名（Excelアップロード時のエラー表示用） */
  column?: string;
  /** 行番号（Excelアップロード時のエラー表示用） */
  line?: number | null;
};

/**
 * フレームワーク共通ヘッダー
 */
export type FwHeader = {
  /** ユーザーID */
  user: string;
  /** 言語 */
  language: string;
  /** 呼び出し元プロセスログID */
  callerProcessLogId: string;
};

/**
 * サブメニューアイテム
 */
export interface MenuSubItem {
  /** サブメニューID */
  id: string;
  /** サブメニューインデックス */
  index: string;
  /** サブメニューラベル */
  label: string;
  /** 遷移先パス */
  path: string;
  /** 表示を許可するロール */
  roles?: string[];
}

/**
 * メニューアイテム
 */
export interface MenuItem {
  /** メニューID */
  id: string;
  /** メニューインデックス */
  index: string;
  /** メニューラベル */
  label: string;
  /** デフォルトで開くかどうか */
  opened?: boolean;
  /** サブメニューリスト */
  subitems: MenuSubItem[];
  /** 表示を許可するロール */
  roles?: string[];
}

/**
 * Excelの列定義
 * @template T データ型
 */
export type ExcelColumnDefinition<T> = {
  /** 列のキー */
  key: keyof T;
  /** 列のラベル */
  label?: string;
  /** 列のフォーマット */
  hidden?: boolean;
  /** 列の幅（デフォルト:10px） */
  width?: number;
};
