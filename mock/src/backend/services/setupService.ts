import { VehicleMasterService } from "./vehicleMasterService";

const vehicleMasterService = new VehicleMasterService();

/**
 * SetupService - 初期データ投入の一元管理
 *
 * 役割:
 *   IndexedDB の ObjectStore に初回起動時のサンプルデータを投入する。
 *   各 Repository は「データアクセスのみ」に責務を限定し、
 *   サンプルデータ投入はこのサービスに集約する。
 *
 * 呼び出し元:
 *   main.ts でアプリ起動時に1度だけ呼ぶ（await setupService.setup()）。
 *
 * Java移行時:
 *   このファイルごと削除する。データはサーバー側 DB に存在するため不要。
 *
 * 業務追加時:
 *   新しいマスタの投入データをここに追加する。
 */

class SetupService {
  /**
   * 全マスタのサンプルデータを投入する（冪等：既にデータがある場合はスキップ）。
   */
  async setup(): Promise<void> {
    // ── 業務追加時はここに追記 (1) ────────────
    await vehicleMasterService.setupInitialData();
  }

  /**
   * 全データを削除して初期サンプルデータを再投入する（開発・デモ用）。
   */
  async clearAndResetAllData(): Promise<void> {
    // ── 業務追加時はここに追記 (2) ──────────────
    await this.setup();
  }
}

export const setupService = new SetupService();
