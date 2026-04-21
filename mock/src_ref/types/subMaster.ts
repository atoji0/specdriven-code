/**
 * SubMaster - 「連動マスタ参照」フィールドの選択肢マスタ
 * masterCode に紐づき、masterValue の選択が変わると選択肢が絞り込まれる。
 * 実業務例: 大分類→小分類、都道府県→市区町村、工場→ライン など
 */
export interface SubMaster {
  id?: number;
  masterCode: string;  // 親マスタ（Master.code）
  code: string;        // 選択値として使うコード
  name: string;        // 表示名
  selectValue: string; // 区分（SUB_MASTER_SELECT_OPTIONS のキー）
  version: number | undefined;
}
