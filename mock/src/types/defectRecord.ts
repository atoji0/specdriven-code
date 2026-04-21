// src/types/defectRecord.ts
export interface DefectRecord {
  id?: number;                    // autoIncrement（主キー）
  vehicleId: number;              // 車両マスタID（必須・VehicleMaster.id 外部キー）
  vehicleTypeName?: string;       // 車種名（表示用・サーバーサイドで解決）
  vehicleCode?: string;           // 車両コード（表示用・サーバーサイドで解決）
  defectDescription?: string;     // 不具合内容（任意・最大256文字）
  annotatedImage: string;         // 手書き込み済み画像（必須・DataURL）
  thumbnailImage: string;         // サムネイル画像（必須・DataURL）
  recordedAt: Date;               // 記録日時（必須・端末ローカル時刻）
  version: number;                // 楽観的ロック用バージョン
}

export interface DefectRecordSearch {
  vehicleCode?: string;
  createdAtFrom?: Date;
  createdAtTo?: Date;
}
