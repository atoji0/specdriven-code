import type { VehicleMaster } from "@/types/vehicleMaster";
import type { VehicleMasterEntity } from "@/backend/entities";
import { BaseRepository } from "mzfw_backend/baseRepository";

/**
 * VehicleMasterRepository - 車両マスタのデータアクセス
 *
 * Java移行時: このクラスごと削除し、API レイヤーを REST 呼び出しに変更する。
 *   GET /api/vehicle-masters
 */
export class VehicleMasterRepository extends BaseRepository<VehicleMasterEntity> {
  protected storeName = "VEHICLE_MASTER";

  /**
   * 全件取得（vehicleCode 昇順）
   */
  async findAll(): Promise<VehicleMaster[]> {
    return this.sortItems(
      await this.findMany(() => true),
      [{ field: "vehicleCode", order: "asc" }],
    );
  }

  /**
   * 車両コードで1件取得（重複チェック・参照解決用）
   */
  async findByCode(vehicleCode: string): Promise<VehicleMaster | null> {
    return this.findOne((item: VehicleMasterEntity) => item.vehicleCode === vehicleCode);
  }
}
