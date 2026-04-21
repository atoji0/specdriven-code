import type { Master } from "@/types/master";

/**
 * MainData - UI・Service で共通利用するビジネスオブジェクト
 * Java移行時はこの型を DTO / Entity に変換する
 */
export interface MainData {
  id?: number;            // IndexedDB autoIncrement（Java移行時: DB PK）
  codeValue: string;      // コード（必須・ユニーク・半角英数字）
  nameValue: string;      // 名称（必須）
  numericValue?: number;  // 数値（任意・0以上）
  dateValue: Date;        // 日付（必須）
  selectValue: string;    // 固定値選択（必須・SELECT_OPTIONS のキー）
  masterValue: string;    // マスタ参照（必須・Master.code）
  masterName?: string;    // マスタ名称（表示用・サーバーサイドで解決）
  linkedValue: string;    // 連動マスタ参照（必須・SubMaster.code・masterValue に連動）
  linkedName?: string;    // 連動マスタ名称（表示用・サーバーサイドで解決）
  flagValue: number;      // フラグ（0=無効 / 1=有効）
  memoValue?: string;     // 備考（任意・最大500文字）
  version: number;        // 楽観的ロック用バージョン
}

/**
 * MainDataSearch - 一覧検索条件
 */
export interface MainDataSearch {
  codeValue?: string;
  nameValue?: string;
  numericValueFrom?: number;
  numericValueTo?: number;
  dateValueFrom?: Date;
  dateValueTo?: Date;
  selectValue?: string;
  masterValue?: string;
  linkedValue?: string;
  flagValue?: number;       // undefined=全件 / 0=無効のみ / 1=有効のみ
}

/**
 * DataWithSubData - 取得時に linkedMasters を解決済みのビジネスオブジェクト
 * Java移行時は DTO のネスト構造に変換する。
 */
export interface DataWithSubData extends MainData {
  linkedMasters: Master[];
}
