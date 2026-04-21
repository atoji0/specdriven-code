/**
 * MODULE: entity — 共通エンティティ型定義
 *
 * Types:
 * EntityBase   { createdBy: string, createdAt: string, updatedBy: string, updatedAt: string }
 *   全エンティティが継承する共通フィールド。BaseRepository の create/update が自動設定するため
 *   各 Entity 型・初期データには含めない。entities.ts で `extends EntityBase` するだけでよい。
 */

export interface EntityBase {
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}
