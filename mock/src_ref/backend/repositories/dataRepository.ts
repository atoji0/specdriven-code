import type { MainData, MainDataSearch } from "@/types/mainData";
import type { MainDataEntity } from "@/backend/entities";
import { BaseRepository } from "mzfw_backend/baseRepository";

/**
 * DataRepository - サンプルマスタのデータアクセス
 *
 * BaseRepository を継承することで create/update/delete/findById が使える。
 * 業務固有の追加クエリ（条件検索・コード重複チェック）をここに実装する。
 *
 * Java移行時: このクラスごと削除し、API レイヤーを REST 呼び出しに変更する。
 */
export class DataRepository extends BaseRepository<MainDataEntity> {
  protected storeName = "data";

  /**
   * 条件付き検索（codeValue 昇順固定）
   *
   * 各条件:
   *   テキスト系    → 部分一致（大文字小文字無視）
   *   数値系        → FromTo 範囲（片側省略可）
   *   日付系        → FromTo 範囲（片側省略可）
   *   選択系        → 完全一致
   *   フラグ系      → 完全一致（undefined = 全件）
   */
  async findByConditions(conditions: MainDataSearch): Promise<MainData[]> {
    return this.findMany(
      (item: MainDataEntity) => {
        // テキスト系：部分一致
        if (conditions.codeValue && !item.codeValue.toLowerCase().includes(conditions.codeValue.toLowerCase())) return false;
        if (conditions.nameValue && !item.nameValue.includes(conditions.nameValue)) return false;

        // 数値系：FromTo 範囲
        if (conditions.numericValueFrom !== undefined && (item.numericValue ?? 0) < conditions.numericValueFrom) return false;
        if (conditions.numericValueTo !== undefined && (item.numericValue ?? 0) > conditions.numericValueTo) return false;

        // 日付系：FromTo 範囲（日付を YYYY-MM-DD 文字列で比較）
        const itemDate: string = new Date(item.dateValue).toISOString().slice(0, 10);
        if (conditions.dateValueFrom) {
          const from: string = new Date(conditions.dateValueFrom).toISOString().slice(0, 10);
          if (itemDate < from) return false;
        }
        if (conditions.dateValueTo) {
          const to: string = new Date(conditions.dateValueTo).toISOString().slice(0, 10);
          if (itemDate > to) return false;
        }

        // 選択系・マスタ参照系：完全一致
        if (conditions.selectValue && item.selectValue !== conditions.selectValue) return false;
        if (conditions.masterValue && item.masterValue !== conditions.masterValue) return false;
        if (conditions.linkedValue && item.linkedValue !== conditions.linkedValue) return false;

        // フラグ系：完全一致（undefined の場合は全件）
        if (conditions.flagValue !== undefined && item.flagValue !== conditions.flagValue) return false;

        return true;
      },
      [{ field: "codeValue", order: "asc" }],
    );
  }

  /**
   * コード値で1件検索（重複チェック用）
   */
  async findByCodeValue(codeValue: string): Promise<MainData | null> {
    return this.findOne((item: MainDataEntity) => item.codeValue === codeValue);
  }

  /**
   * 親マスタコードで検索（参照先利用チェック用）
   */
  async findByMasterCode(masterCode: string): Promise<MainData[]> {
    return this.findMany((item: MainDataEntity) => item.masterValue === masterCode);
  }
}

