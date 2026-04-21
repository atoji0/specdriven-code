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

// 業務固有の定数をここに追加する。
// 例:
//   export const MY_OPTIONS = [
//     { value: "1", label: "選択肢A" },
//   ] as const;

