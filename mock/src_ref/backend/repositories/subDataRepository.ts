import type { SubData } from "@/types/subData";
import type { SubDataEntity } from "@/backend/entities";
import { BaseRepository } from "mzfw_backend/baseRepository";

/**
 * SubDataRepository - data ↔ master 中間テーブルのデータアクセス
 *
 * data.id（サロゲートキー）と master.id（サロゲートキー）で結合するため
 * コード変更による参照整合性破壊が発生しない。
 *
 * Java移行時:
 *   このクラスを削除し、API レイヤーを REST 呼び出しに変更する。
 *   POST /api/sub-data/bulk  (transactional save は Service で制御)
 */
export class SubDataRepository extends BaseRepository<SubDataEntity> {
  protected storeName = "sub_data";

  /**
   * dataId に紐づく全件取得
   */
  async findByDataId(dataId: number): Promise<SubData[]> {
    return this.findMany((item: SubDataEntity) => item.dataId === dataId);
  }

  /**
   * 全件取得（JOIN 用）
   */
  async findAll(): Promise<SubData[]> {
    return this.findMany(() => true);
  }
}
