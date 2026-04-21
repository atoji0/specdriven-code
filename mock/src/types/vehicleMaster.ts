// src/types/vehicleMaster.ts
export interface VehicleMaster {
  id?: number;              // autoIncrement（主キー）
  vehicleCode: string;      // 車両コード（必須・半角数字10桁固定・重複不可）
  vehicleTypeName: string;  // 車種名（必須）
  remarks?: string;         // 備考（任意）
  version: number;          // 楽観的ロック用バージョン
}

export interface VehicleMasterSearch {
  vehicleCode?: string;
}
