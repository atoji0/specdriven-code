import { DefectRecordService } from "../backend/services/defectRecordService";
import { VehicleMasterService } from "../backend/services/vehicleMasterService";
import { BusinessError } from "mzfw/errors";
import type { DefectRecord, DefectRecordSearch } from "@/types/defectRecord";
import type { SelectOption } from "mzfw";

const defectService = new DefectRecordService();
const vehicleService = new VehicleMasterService();

/**
 * defectRecordApi - 不具合記録 API
 *
 * Java/REST移行時は、このファイル内の Service 呼び出しを
 * REST API（axios 等）呼び出しに置き換える。Vue 側は一切変更不要。
 */
export const defectRecordApi = {
  // ─── 取得 ────────────────────────────────────────────────────────

  /** 一覧取得（createdAt 降順・最大50件） / Java移行時: GET /api/defect-records?... */
  list: async (search?: DefectRecordSearch): Promise<DefectRecord[]> => {
    const records = await defectService.findByConditions(search ?? {});
    return records.slice(0, 50);
  },

  /** 単件取得 / Java移行時: GET /api/defect-records/:id */
  get: async (id: number): Promise<DefectRecord> => {
    const result = await defectService.findById(id);
    if (!result) throw new Error("データが見つかりません");
    return result;
  },

  // ─── 車両コード解決 ──────────────────────────────────────────────

  /** バーコードスキャン後の車両解決 / Java移行時: GET /api/vehicles/by-code/:code */
  resolveVehicle: async (vehicleCode: string): Promise<{ id: number; vehicleTypeName: string } | null> => {
    return defectService.resolveVehicleByCode(vehicleCode);
  },

  // ─── 選択肢 ──────────────────────────────────────────────────────

  /** 車両選択肢取得 / Java移行時: GET /api/vehicles/options */
  getVehicleOptions: async (): Promise<SelectOption[]> => {
    return vehicleService.getVehicleOptions();
  },

  // ─── CRUD ────────────────────────────────────────────────────────

  /** 新規作成 / Java移行時: POST /api/defect-records */
  create: async (input: DefectRecord): Promise<DefectRecord> => {
    try {
      return await defectService.create(input);
    } catch (error: any) {
      if (error?.validationErrors) throw new BusinessError(error.validationErrors);
      throw error;
    }
  },

  /** 更新 / Java移行時: PUT /api/defect-records/:id */
  update: async (id: number, input: DefectRecord): Promise<DefectRecord> => {
    try {
      return await defectService.update(id, input);
    } catch (error: any) {
      if (error?.validationErrors) throw new BusinessError(error.validationErrors);
      throw error;
    }
  },

  /** 削除 / Java移行時: DELETE /api/defect-records/:id */
  remove: async (id: number, version: number): Promise<void> => {
    try {
      await defectService.delete(id, version);
    } catch (error: any) {
      if (error?.validationErrors) throw new BusinessError(error.validationErrors);
      throw error;
    }
  },
};
