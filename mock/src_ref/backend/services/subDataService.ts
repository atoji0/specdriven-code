import type { MainData, DataWithSubData } from "@/types/mainData";
import type { Master, MasterSearch } from "@/types/master";
import { DataRepository } from "../repositories/dataRepository";
import { MasterRepository } from "../repositories/masterRepository";
import { SubDataRepository } from "../repositories/subDataRepository";
import type { ValidationError } from "mzfw_backend/validations";
import {
  ValidationRange,
  ValidationCharType,
  validateText,
  validateRecordExists,
} from "mzfw_backend/validations";
import { TransactionType } from "mzfw";

/**
 * SubDataService - data ↔ master（1:N・サロゲートキー結合）のビジネスロジック
 *
 * Java移行時:
 *   - このクラスを Java Service に再実装する
 *   - IndexedDB 操作は JPA/JDBC に置き換える
 */
export class SubDataService {
  private dataRepo    = new DataRepository();
  private masterRepo  = new MasterRepository();
  private subDataRepo = new SubDataRepository();

  // ───────────────────────────────────────
  // データ取得
  // ───────────────────────────────────────

  /** 全件取得（紐付きマスタ解決済み） */
  async findAllWithChildren(): Promise<DataWithSubData[]> {
    const [dataList, allSubData, allMasters] = await Promise.all([
      this.dataRepo.findByConditions({}),
      this.subDataRepo.findAll(),
      this.masterRepo.findAll(),
    ]);
    const masterMap = new Map(allMasters.map((m) => [m.id!, m]));

    return dataList.map((data) => {
      const related = allSubData.filter((s) => s.dataId === data.id!);
      return {
        ...data,
        linkedMasters: related
          .map((s) => masterMap.get(s.masterId))
          .filter((m): m is Master => !!m),
      };
    });
  }

  /** ID で1件取得（紐付きマスタ解決済み） */
  async findByIdWithChildren(id: number): Promise<DataWithSubData | null> {
    const data = await this.dataRepo.findById(id);
    if (!data) return null;

    const subDataList = await this.subDataRepo.findByDataId(id);
    const masters = await Promise.all(
      subDataList.map((s) => this.masterRepo.findById(s.masterId)),
    );
    return {
      ...data,
      linkedMasters: masters.filter((m) => m != null).map((m) => m as Master),
    };
  }

  // ───────────────────────────────────────
  // マスタ検索（子選択パネル用）
  // ───────────────────────────────────────

  /** マスタを条件で全件取得（クライアントフィルタ） */
  async searchMasters(conditions: MasterSearch): Promise<Master[]> {
    const all = await this.masterRepo.findAll();
    return all.filter((m) => {
      if (conditions.code && !m.code.toLowerCase().includes(conditions.code.toLowerCase())) return false;
      if (conditions.name && !m.name.includes(conditions.name)) return false;
      return true;
    });
  }

  // ───────────────────────────────────────
  // CRUD
  // ───────────────────────────────────────

  /**
   * data の新規作成 or 更新 と subData の一括置換を 1トランザクションで実行する。
   * @param data       保存する MainData（id なし=新規）
   * @param relatedIds 紐付けるマスタの id 一覧（全置換）
   */
  async save(data: MainData, relatedIds: number[]): Promise<void> {
    const transactionType = data.id ? TransactionType.UPDATE : TransactionType.ADD;
    const errors = await this.validate(data, transactionType);
    if (errors.length > 0) throw { validationErrors: errors };

    const db = await this.dataRepo.getDbPublic();
    const tx = db.transaction(["data", "sub_data"], "readwrite");

    // ── data 新規/更新
    let dataId: number;
    if (!data.id) {
      const saved = await this.dataRepo.createInTx(tx, data);
      dataId = saved.id!;
    } else {
      await this.dataRepo.updateInTx(tx, data.id, data);
      dataId = data.id;
    }

    // ── subData 全置換（既存を全削除 → 再登録）
    const allSubs: any[] = await tx.objectStore("sub_data").getAll();
    for (const sub of allSubs.filter((s: any) => s.dataId === dataId)) {
      await this.subDataRepo.deleteInTx(tx, sub.id);
    }
    for (const relatedId of relatedIds) {
      await this.subDataRepo.createInTx(tx, { dataId, masterId: relatedId } as any);
    }

    await tx.done;
  }

  /** data と紐付き subData をトランザクションで一括削除する */
  async delete(id: number, version: number): Promise<void> {
    const errors = await this.validate({ id, version } as unknown as MainData, TransactionType.DELETE);
    if (errors.length > 0) throw { validationErrors: errors };

    const db = await this.dataRepo.getDbPublic();
    const tx = db.transaction(["data", "sub_data"], "readwrite");

    await this.dataRepo.deleteInTx(tx, id);
    const allSubs: any[] = await tx.objectStore("sub_data").getAll();
    for (const sub of allSubs.filter((s: any) => s.dataId === id)) {
      await this.subDataRepo.deleteInTx(tx, sub.id);
    }

    await tx.done;
  }

  // ───────────────────────────────────────
  // バリデーション
  // ───────────────────────────────────────

  private async validate(data: MainData, transactionType: TransactionType): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // UPDATE, DELETE: 存在確認＋楽観的ロック（フィールドバリデーション前に実施）
    if (transactionType === TransactionType.DELETE || transactionType === TransactionType.UPDATE) {
      const existing = await this.dataRepo.findById(data.id!);
      const recordMsg = validateRecordExists({ record: existing, expectedVersion: data.version });
      if (recordMsg) { errors.push({ field: "codeValue", message: recordMsg }); return errors; }
      if (transactionType === TransactionType.DELETE) return errors; // 参照整合性チェック不要のため存在確認のみ
    }

    const codeErr = validateText({
      value: data.codeValue,
      required: true,
      validationRangeId: ValidationRange.Between,
      minLength: 1,
      maxLength: 10,
      validationCharType: ValidationCharType.AsciiAlphanumeric,
    });
    if (codeErr) errors.push({ field: "codeValue", message: codeErr });

    const nameErr = validateText({
      value: data.nameValue,
      required: true,
      validationRangeId: ValidationRange.Max,
      maxLength: 50,
    });
    if (nameErr) errors.push({ field: "nameValue", message: nameErr });

    return errors;
  }
}
