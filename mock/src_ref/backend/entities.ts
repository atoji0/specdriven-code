/**
 * アプリケーション固有のEntity型定義
 * IndexedDB 格納用（EntityBase を継承）
 */
import type { EntityBase } from "mzfw_backend/entity";
import type { MainData } from "@/types/mainData";
import type { Master } from "@/types/master";
import type { SubMaster } from "@/types/subMaster";
import type { SubData } from "@/types/subData";

/** MainDataEntity - IndexedDB 格納用 */
export interface MainDataEntity extends MainData, EntityBase {}

/** MasterEntity - IndexedDB 格納用 */
export interface MasterEntity extends Master, EntityBase {}

/** SubMasterEntity - IndexedDB 格納用 */
export interface SubMasterEntity extends SubMaster, EntityBase {}

/** SubDataEntity - IndexedDB 格納用 */
export interface SubDataEntity extends SubData, EntityBase {}
