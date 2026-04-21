/**
 * SubData - data レコードに紐付くマスタ参照（サロゲートキーで連携）
 * data.id ↔ master.id のリレーションを保持する中間エンティティ。
 * code 連携ではなく surrogate key で結合することで、
 * コード変更時の整合性破壊を防ぐ。
 */
export interface SubData {
  id?: number;
  dataId: number;    // FK → MainData.id（サロゲートキー）
  masterId: number;  // FK → Master.id（サロゲートキー）
  version: number;
}
