/**
 * backend/constants.ts - バックエンド共有定数
 *
 * 定義ルール:
 *   - 定数名は UPPER_SNAKE_CASE
 *   - 各要素は { value, label } を必ず持つ
 *   - as const で型安全を保証
 *
 * Java移行時: 各定数を Java Enum や DB マスタに変換する。
 * フロントから直接参照してはいけない。API 経由で取得すること。
 */

/** サンプル固定値選択肢（selectValue） */
export const SELECT_OPTIONS = [
  { value: "A", label: "有効" },
  { value: "B", label: "保留" },
  { value: "C", label: "終了" },
] as const;

/** 子マスタ区分 */
export const SUB_MASTER_SELECT_OPTIONS = [
  { value: "1", label: "区分A" },
  { value: "2", label: "区分B" },
  { value: "3", label: "区分C" },
] as const;
