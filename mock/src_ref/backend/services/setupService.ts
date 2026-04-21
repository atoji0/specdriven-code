import { DataRepository } from "../repositories/dataRepository";
import { MasterRepository } from "../repositories/masterRepository";
import { SubMasterRepository } from "../repositories/subMasterRepository";
import { SubDataRepository } from "../repositories/subDataRepository";

/**
 * SetupService - 初期データ投入の一元管理
 *
 * 役割:
 *   IndexedDB の ObjectStore に初回起動時のサンプルデータを投入する。
 *   各 Repository は「データアクセスのみ」に責務を限定し、
 *   サンプルデータ投入はこのサービスに集約する。
 *
 * 呼び出し元:
 *   main.ts でアプリ起動時に1度だけ呼ぶ（await setupDb()）。
 *
 * Java移行時:
 *   このファイルごと削除する。データはサーバー側 DB に存在するため不要。
 *
 * 業務追加時:
 *   新しいマスタの投入データをここに追加する。
 */
class SetupService {
  private readonly dataRepo     = new DataRepository();
  private readonly masterRepo    = new MasterRepository();
  private readonly subMasterRepo = new SubMasterRepository();
  private readonly subDataRepo   = new SubDataRepository();

  /**
   * 全マスタのサンプルデータを投入する（冪等：既にデータがある場合はスキップ）。
   */
  async setup(): Promise<void> {
    // ── サンプル: 業務データ（25件・ページング確認用） ──────────────────
    const existingBasics = await this.dataRepo.findByConditions({});
    if (existingBasics.length === 0) {
      await this.dataRepo.setupInitialData([
        { codeValue: "B001", nameValue: "テストデータ 001", numericValue: 12500,  dateValue: new Date("2024-01-15"), selectValue: "A", masterValue: "M01", linkedValue: "S01-1", flagValue: 1, memoValue: "備考1行目\n備考2行目", version: 1 },
        { codeValue: "B002", nameValue: "テストデータ 002",                       dateValue: new Date("2024-02-20"), selectValue: "B", masterValue: "M02", linkedValue: "S02-1", flagValue: 0,                              version: 1 },
        { codeValue: "B003", nameValue: "テストデータ 003", numericValue: 3800,   dateValue: new Date("2024-03-10"), selectValue: "C", masterValue: "M03", linkedValue: "S03-1", flagValue: 1,                              version: 1 },
        { codeValue: "B004", nameValue: "テストデータ 004", numericValue: 21000,  dateValue: new Date("2024-04-05"), selectValue: "A", masterValue: "M01", linkedValue: "S01-2", flagValue: 0, memoValue: "備考", version: 1 },
        { codeValue: "B005", nameValue: "テストデータ 005",                       dateValue: new Date("2024-05-18"), selectValue: "B", masterValue: "M02", linkedValue: "S02-2", flagValue: 1,                              version: 1 },
        { codeValue: "B006", nameValue: "テストデータ 006", numericValue: 9200,   dateValue: new Date("2024-06-25"), selectValue: "C", masterValue: "M03", linkedValue: "S03-2", flagValue: 0,                              version: 1 },
        { codeValue: "B007", nameValue: "テストデータ 007", numericValue: 150000, dateValue: new Date("2024-07-07"), selectValue: "A", masterValue: "M01", linkedValue: "S01-3", flagValue: 1, memoValue: "備考", version: 1 },
        { codeValue: "B008", nameValue: "テストデータ 008",                       dateValue: new Date("2024-08-14"), selectValue: "B", masterValue: "M02", linkedValue: "S02-1", flagValue: 0,                              version: 1 },
        { codeValue: "B009", nameValue: "テストデータ 009", numericValue: 75400,  dateValue: new Date("2024-09-22"), selectValue: "C", masterValue: "M03", linkedValue: "S03-1", flagValue: 1,                              version: 1 },
        { codeValue: "B010", nameValue: "テストデータ 010", numericValue: 4300,   dateValue: new Date("2024-10-31"), selectValue: "A", masterValue: "M01", linkedValue: "S01-1", flagValue: 0,                              version: 1 },
        { codeValue: "B011", nameValue: "テストデータ 011",                       dateValue: new Date("2024-11-05"), selectValue: "B", masterValue: "M02", linkedValue: "S02-2", flagValue: 1, memoValue: "備考", version: 1 },
        { codeValue: "B012", nameValue: "テストデータ 012", numericValue: 1200,   dateValue: new Date("2024-12-20"), selectValue: "C", masterValue: "M03", linkedValue: "S03-2", flagValue: 0,                              version: 1 },
      ]);
    }
    // ── サンプル: マスタ参照用 ──────────────────
    const existingMasters = await this.masterRepo.findAll();
    if (existingMasters.length === 0) {
      await this.masterRepo.setupInitialData([
        { code: "M01", name: "マスタA", version: 1 },
        { code: "M02", name: "マスタB", version: 1 },
        { code: "M03", name: "マスタC", version: 1 },
      ]);
    }

    // ── サンプル: 連動マスタ参照用 ─────────────
    const existingSubs = await this.subMasterRepo.findAll();
    if (existingSubs.length === 0) {
      await this.subMasterRepo.setupInitialData([
        // マスタA 配下
        { masterCode: "M01", code: "S01-1", name: "サブA-1", selectValue: "1", version: 1 },
        { masterCode: "M01", code: "S01-2", name: "サブA-2", selectValue: "2", version: 1 },
        { masterCode: "M01", code: "S01-3", name: "サブA-3", selectValue: "3", version: 1 },
        // マスタB 配下
        { masterCode: "M02", code: "S02-1", name: "サブB-1", selectValue: "1", version: 1 },
        { masterCode: "M02", code: "S02-2", name: "サブB-2", selectValue: "2", version: 1 },
        // マスタC 配下
        { masterCode: "M03", code: "S03-1", name: "サブC-1", selectValue: "1", version: 1 },
        { masterCode: "M03", code: "S03-2", name: "サブC-2", selectValue: "3", version: 1 },
      ]);
    }

    // ── 業務追加時はここに追記 (1) clearAll → clearAndResetAllData() も忘れずに ──

    // ── サンプル: subData（data ↔ master 中間テーブル）───────────────
    // data.id ・master.id のサロゲートキーで結合（コード連携不使用）
    const existingSubData = await this.subDataRepo.findAll();
    if (existingSubData.length === 0) {
      // data ・ master をコードで逆引きして id を取得
      const [d1, d2, d3, d4, d5, m1, m2, m3] = await Promise.all([
        this.dataRepo.findByCodeValue("B001"),
        this.dataRepo.findByCodeValue("B002"),
        this.dataRepo.findByCodeValue("B003"),
        this.dataRepo.findByCodeValue("B004"),
        this.dataRepo.findByCodeValue("B005"),
        this.masterRepo.findByCode("M01"),
        this.masterRepo.findByCode("M02"),
        this.masterRepo.findByCode("M03"),
      ]);

      // B001 → M01, M02
      if (d1?.id && m1?.id) await this.subDataRepo.create({ dataId: d1.id, masterId: m1.id, version: 1 });
      if (d1?.id && m2?.id) await this.subDataRepo.create({ dataId: d1.id, masterId: m2.id, version: 1 });
      // B002 → M02
      if (d2?.id && m2?.id) await this.subDataRepo.create({ dataId: d2.id, masterId: m2.id, version: 1 });
      // B003 → M01, M03
      if (d3?.id && m1?.id) await this.subDataRepo.create({ dataId: d3.id, masterId: m1.id, version: 1 });
      if (d3?.id && m3?.id) await this.subDataRepo.create({ dataId: d3.id, masterId: m3.id, version: 1 });
      // B004 → M01
      if (d4?.id && m1?.id) await this.subDataRepo.create({ dataId: d4.id, masterId: m1.id, version: 1 });
      // B005 → M02, M03
      if (d5?.id && m2?.id) await this.subDataRepo.create({ dataId: d5.id, masterId: m2.id, version: 1 });
      if (d5?.id && m3?.id) await this.subDataRepo.create({ dataId: d5.id, masterId: m3.id, version: 1 });
    }
  }

  /**
   * 全データを削除して初期サンプルデータを再投入する（開発・デモ用）
   */
  async clearAndResetAllData(): Promise<void> {
    await this.dataRepo.clearAll();
    await this.masterRepo.clearAll();
    await this.subMasterRepo.clearAll();
    await this.subDataRepo.clearAll();
    // ── 業務追加時はここに追記 (2) ──────────────
    await this.setup();
  }
}

export const setupService = new SetupService();
