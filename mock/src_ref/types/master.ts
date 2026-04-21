/**
 * Master - 「マスタ参照」フィールドの選択肢マスタ
 * 実業務例: 部門マスタ・工場マスタ・取引先マスタ など
 */
export interface Master {
  id?: number;
  code: string;   // 選択値として使うコード
  name: string;   // 表示名
  version: number | undefined;
}

/**
 * MasterSearch - 親子選択画面の子検索フォーム用条件
 */
export interface MasterSearch {
  code?: string;
  name?: string;
}
