import type { DefectRecord, DefectRecordSearch } from "@/types/defectRecord";
import type { DefectRecordEntity } from "@/backend/entities";
import { BaseRepository } from "mzfw_backend/baseRepository";

/**
 * DefectRecordRepository - 不具合記録のデータアクセス
 *
 * Java移行時: このクラスごと削除し、API レイヤーを REST 呼び出しに変更する。
 *   GET /api/defect-records
 */
export class DefectRecordRepository extends BaseRepository<DefectRecordEntity> {
  protected storeName = "DEFECT_RECORD";

  /**
   * 条件付き検索（createdAt 降順固定）
   * - vehicleId: 完全一致（vehicleCode → vehicleId 変換は Service 層で行う）
   * - createdAtFrom / createdAtTo: 日付範囲
   */
  async findByConditions(conditions: DefectRecordSearch & { vehicleId?: number }): Promise<DefectRecord[]> {
    return this.sortItems(
      await this.findMany((item: DefectRecordEntity) => {
        if (conditions.vehicleId !== undefined && item.vehicleId !== conditions.vehicleId) return false;

        if (conditions.createdAtFrom) {
          const from = new Date(conditions.createdAtFrom).toISOString().slice(0, 10);
          const itemDate = new Date((item as any).createdAt ?? item.recordedAt).toISOString().slice(0, 10);
          if (itemDate < from) return false;
        }
        if (conditions.createdAtTo) {
          const to = new Date(conditions.createdAtTo).toISOString().slice(0, 10);
          const itemDate2 = new Date((item as any).createdAt ?? item.recordedAt).toISOString().slice(0, 10);
          if (itemDate2 > to) return false;
        }

        return true;
      }),
      [{ field: "recordedAt", order: "desc" }],
    );
  }

  /**
   * 車両マスタIDで検索（削除前の参照整合性チェック用）
   */
  async findByVehicleId(vehicleId: number): Promise<DefectRecord[]> {
    return this.findMany((item: DefectRecordEntity) => item.vehicleId === vehicleId);
  }
}
