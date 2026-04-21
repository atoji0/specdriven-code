import { ReferenceService } from "../backend/services/referenceService";
import { BusinessError } from "mzfw/errors";
import type { MainData, MainDataSearch } from "@/types/mainData";
import type { SelectOption } from "mzfw";
import { TransactionType } from "mzfw";

const referenceService = new ReferenceService();

/**
 * MainData API
 *
 * Java/REST移行時は、このファイル内の Service 呼び出しを
 * REST API（axios 等）呼び出しに置き換える。
 * Vue側（views/）のコードは一切変更不要。
 *
 * 移行パターン例:
 *   list: async (search?) => (await axios.get("/api/sample-basics", { params: search })).data,
 */
export const referenceApi = {
  // ─── データ取得 ────────────────────────────────

  /**
   * 一覧取得
   * Java移行時: GET /api/sample-basics?codeValue=xxx&...
   */
  list: async (search?: MainDataSearch): Promise<MainData[]> => {
    return await referenceService.findByConditions(search ?? {});
  },

  /**
   * 単一取得
   * Java移行時: GET /api/sample-basics/:id
   */
  get: async (id: number): Promise<MainData> => {
    const result = await referenceService.findById(id);
    if (!result) throw new Error("データが見つかりません");
    return result;
  },

  // ─── CRUD ─────────────────────────────────────

  /**
   * 新規作成
   * Java移行時: POST /api/sample-basics
   */
  create: async (input: MainData): Promise<MainData> => {
    try {
      return await referenceService.create(input);
    } catch (error: any) {
      if (error?.validationErrors) throw new BusinessError(error.validationErrors);
      throw error;
    }
  },

  /**
   * 更新
   * Java移行時: PUT /api/sample-basics/:id
   */
  update: async (id: number, input: MainData): Promise<MainData> => {
    try {
      return await referenceService.update(id, input);
    } catch (error: any) {
      if (error?.validationErrors) throw new BusinessError(error.validationErrors);
      throw error;
    }
  },

  /**
   * 削除
   * Java移行時: DELETE /api/sample-basics/:id
   */
  remove: async (id: number, version: number): Promise<void> => {
    try {
      await referenceService.delete(id, version);
    } catch (error: any) {
      if (error?.validationErrors) throw new BusinessError(error.validationErrors);
      throw error;
    }
  },

  // ─── 一括操作（Excel アップロード用） ──────────────

  /**
   * 一括登録・更新・削除
   * Java移行時: POST /api/sample-basics/bulk
   */
  saveAll: async (rows: (MainData & { transactionType: TransactionType })[]): Promise<void> => {
    try {
      await referenceService.saveAll(rows);
    } catch (error: any) {
      if (error?.validationErrors) throw new BusinessError(error.validationErrors);
      throw error;
    }
  },

  // ─── 選択肢取得（画面ロード時に呼ぶ）──────────────

  /**
   * 固定値選択肢（selectValue）
   * SELECT_OPTIONS の as const から生成するため同期。
   * Java移行時: GET /api/sample-basics/options/select → Enum 定義から生成
   */
  getSelectOptions: (): SelectOption[] => {
    return referenceService.getSelectOptions();
  },

  /**
   * マスタ参照選択肢（masterValue）
   * Java移行時: GET /api/sample-masters
   */
  getMasterOptions: async (): Promise<SelectOption[]> => {
    return await referenceService.getMasterOptions();
  },

  /**
   * 連動マスタ参照選択肢（linkedValue）
   * masterValue 変更時に呼び直す。
   * Java移行時: GET /api/sample-sub-masters?masterCode=xxx
   */
  getLinkedOptions: async (masterCode: string): Promise<SelectOption[]> => {
    return await referenceService.getLinkedOptions(masterCode);
  },
};

