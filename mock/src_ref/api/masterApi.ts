import { MasterService } from "../backend/services/masterService";
import { BusinessError } from "mzfw/errors";
import type { Master } from "@/types/master";
import type { SubMaster } from "@/types/subMaster";
import { TransactionType } from "mzfw";

export type MasterWithSubs = Master & { subMasters: SubMaster[] };

const masterService = new MasterService();

/**
 * MasterAPI - 親マスタ・子マスタの CRUD
 *
 * Java/REST移行時は、このファイル内の Service 呼び出しを
 * REST API（axios 等）呼び出しに置き換える。
 * Vue側（views/）のコードは一切変更不要。
 */
export const masterApi = {
  // ─── 選択肢 ────────────────────────────────

  /** 子マスタ区分選択肢 */
  getSubMasterOptions: () => masterService.getSubMasterSelectOptions(),

  // ─── 親マスタ ────────────────────────────

  /** 親マスタ全件取得 */
  list: async (): Promise<Master[]> => {
    return masterService.findAll();
  },

  /** 親マスタ全件 + 子マスタ埋め込みで取得 */
  listWithChildren: async (): Promise<MasterWithSubs[]> => {
    return masterService.findAllWithChildren();
  },

  /** 親マスタ一括保存 */
  saveAll: async (rows: (Master & { transactionType: TransactionType })[]): Promise<void> => {
    try {
      await masterService.saveAll(rows);
    } catch (error: any) {
      if (error?.validationErrors) throw new BusinessError(error.validationErrors);
      throw error;
    }
  },

  // ─── 子マスタ ─────────────────────────────

  /** 子マスタ取得（親マスタコードで絞り込み） */
  listChildren: async (masterCode: string): Promise<SubMaster[]> => {
    return masterService.findChildrenByParentCode(masterCode);
  },

  /** 親マスタ削除（子マスタは cascade 削除） */
  remove: async (id: number, version: number): Promise<void> => {
    try {
      await masterService.deleteParent(id, version);
    } catch (error: any) {
      if (error?.validationErrors) throw new BusinessError(error.validationErrors);
      throw error;
    }
  },

  /** 親マスタ + 子マスタを 1トランザクションで保存 */
  saveWithChildren: async (
    parent: Master & { transactionType: TransactionType },
    childRows: (SubMaster & { transactionType: TransactionType })[],
  ): Promise<Master> => {
    try {
      return await masterService.saveWithChildren(parent, childRows);
    } catch (error: any) {
      if (error?.validationErrors) throw new BusinessError(error.validationErrors);
      throw error;
    }
  },
};
