/**
 * アプリケーション固有のEntity型定義
 * IndexedDB 格納用（EntityBase を継承）
 *
 * 業務を追加するたびにここに Entity を追加する。
 * 例:
 *   import type { EntityBase } from "mzfw_backend/entity";
 *   import type { MyEntity } from "@/types/myEntity";
 *   export interface MyEntityRecord extends MyEntity, EntityBase {}
 */

import type { EntityBase } from "mzfw_backend/entity";
import type { VehicleMaster } from "@/types/vehicleMaster";
import type { DefectRecord } from "@/types/defectRecord";

export interface VehicleMasterEntity extends VehicleMaster, EntityBase {}
export interface DefectRecordEntity extends DefectRecord, EntityBase {}

