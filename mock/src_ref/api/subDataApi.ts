import { SubDataService } from "../backend/services/subDataService";
import { BusinessError } from "mzfw/errors";
import type { MainData, DataWithSubData } from "@/types/mainData";
import type { Master, MasterSearch } from "@/types/master";

const subDataService = new SubDataService();

/**
 * SubDataAPI - data ↔ master（1:N・サロゲートキー）の CRUD
 *
 * Java/REST 移行時は、このファイル内の Service 呼び出しを
 * REST API（axios 等）呼び出しに置き換える。
 * Vue 側（views/）のコードは一切変更不要。
 *
 * 移行パターン例：
 *   listDataWithSubData: async () => (await axios.get("/api/data-with-sub-data")).data,
 */
export const subDataApi = {

  // ─── 取得 ──────────────────────────────────────

  /** 一覧取得（紐付きマスタ解決済み） */
  list: async (): Promise<DataWithSubData[]> => {
    return subDataService.findAllWithChildren();
  },

  /** 単件取得（紐付きマスタ解決済み） */
  get: async (id: number): Promise<DataWithSubData | null> => {
    return subDataService.findByIdWithChildren(id);
  },

  // ─── マスタ検索（子選択パネル） ──────────────────

  /** マスタを条件検索 */
  searchMasters: async (conditions: MasterSearch): Promise<Master[]> => {
    return subDataService.searchMasters(conditions);
  },

  // ─── 保存（トランザクション） ─────────────────────

  /** data + subData をトランザクションで保存
   * @param data             保存する MainData（id なし=新規）
   * @param selectedMasterIds 紐付けるマスタの id 一覧（サロゲートキー）
   */
  save: async (
    data: MainData,
    selectedMasterIds: number[],
  ): Promise<void> => {
    try {
      await subDataService.save(data, selectedMasterIds);
    } catch (error: any) {
      if (error?.validationErrors) throw new BusinessError(error.validationErrors);
      throw error;
    }
  },

  // ─── 削除（トランザクション） ─────────────────────

  /** data + 紐付き subData をトランザクションで一括削除 */
  remove: async (id: number, version: number): Promise<void> => {
    try {
      await subDataService.delete(id, version);
    } catch (error: any) {
      if (error?.validationErrors) throw new BusinessError(error.validationErrors);
      throw error;
    }
  },
};
