import type { Master } from "@/types/master";
import type { MasterEntity } from "@/backend/entities";
import { BaseRepository } from "mzfw_backend/baseRepository";

/**
 * MasterRepository - マスタ参照用リポジトリ
 *
 * 役割: masterValue（マスタ参照フィールド）の選択肢データを管理する。
 *
 * Java移行時:
 *   このクラスを削除し、referenceService の getMasterOptions() を
 *   外部REST APIへのGETリクエストに置き換える。
 *   GET /api/sample-masters
 */
export class MasterRepository extends BaseRepository<MasterEntity> {
  protected storeName = "masters";

  /**
   * 全件取得（code 昇順）
   */
  async findAll(): Promise<Master[]> {
    return this.sortItems(
      await this.findMany(() => true),
      [{ field: "code", order: "asc" }],
    );
  }

  /**
   * コードで1件取得（参照整合性チェック用）
   */
  async findByCode(code: string): Promise<Master | null> {
    return this.findOne((item: MasterEntity) => item.code === code);
  }
}
