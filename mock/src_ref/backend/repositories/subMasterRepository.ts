import type { SubMaster } from "@/types/subMaster";
import type { SubMasterEntity } from "@/backend/entities";
import { BaseRepository } from "mzfw_backend/baseRepository";

/**
 * SubMasterRepository - 連動マスタ参照用リポジトリ
 *
 * 役割: linkedValue（連動マスタ参照フィールド）の選択肢データを管理する。
 *       masterCode（親マスタコード）で絞り込むことで連動絞り込みを実現する。
 *
 * Java移行時:
 *   このクラスを削除し、referenceService の getLinkedOptions() を
 *   外部REST APIへのGETリクエストに置き換える。
 *   GET /api/sample-sub-masters?masterCode=xxx
 */
export class SubMasterRepository extends BaseRepository<SubMasterEntity> {
  protected storeName = "sub_masters";

  /**
   * 全件取得（存在チェック用）
   */
  async findAll(): Promise<SubMaster[]> {
    return this.findMany(() => true);
  }

  /**
   * 親マスタコードで絞り込み取得（code 昇順）
   * linkedValue の選択肢取得に使用
   */
  async findByMasterCode(masterCode: string): Promise<SubMaster[]> {
    const items = await this.findMany(
      (item: SubMasterEntity) => item.masterCode === masterCode,
    );
    return this.sortItems(items, [{ field: "code", order: "asc" }]);
  }

  /**
   * コードで1件取得（参照整合性チェック用）
   */
  async findByCode(code: string): Promise<SubMaster | null> {
    return this.findOne((item: SubMasterEntity) => item.code === code);
  }
}
