import type { Master } from "@/types/master";
import type { SubMaster } from "@/types/subMaster";
import { MasterRepository } from "../repositories/masterRepository";
import { SubMasterRepository } from "../repositories/subMasterRepository";
import { DataRepository } from "../repositories/dataRepository";
import { validateText, validateExists, validateRecordExists, validateOption, validateLinkedRecord } from "mzfw_backend/validations";
import { ValidationRange } from "mzfw_backend/validations";
import type { ValidationError } from "mzfw_backend/validations";
import { SUB_MASTER_SELECT_OPTIONS } from "../constants";
import type { SelectOption } from "mzfw";
import { TransactionType } from "mzfw";

/**
 * MasterService - 親マスタ・子マスタのビジネスロジック
 *
 * Java移行時:
 *   - このクラスを Java Service に再実装する
 *   - IndexedDB 操作は JPA/JDBC に置き換える
 */
export class MasterService {
  private masterRepo = new MasterRepository();
  private subMasterRepo = new SubMasterRepository();
  private dataRepo = new DataRepository();

  // ───────────────────────────────────────
  // 固定値選択肢
  // ───────────────────────────────────────

  getSubMasterSelectOptions(): SelectOption[] {
    return [...SUB_MASTER_SELECT_OPTIONS];
  }

  // ───────────────────────────────────────
  // 親マスタ取得
  // ───────────────────────────────────────

  async findAll(): Promise<Master[]> {
    return this.masterRepo.findAll();
  }

  // ───────────────────────────────────────
  // 子マスタ取得
  // ───────────────────────────────────────

  async findChildrenByParentCode(masterCode: string): Promise<SubMaster[]> {
    return this.subMasterRepo.findByMasterCode(masterCode);
  }

  /** 親マスタ全件 + 各々の子マスタを埋め込んで返す */
  async findAllWithChildren(): Promise<(Master & { subMasters: SubMaster[] })[]> {
    const masters = await this.masterRepo.findAll();
    return Promise.all(
      masters.map(async (m) => ({
        ...m,
        subMasters: await this.subMasterRepo.findByMasterCode(m.code),
      })),
    );
  }

  // ───────────────────────────────────────
  // 親マスタ CRUD
  // ───────────────────────────────────────

  async deleteParent(id: number, version: number): Promise<void> {
    const errors = await this.validateParent({ id, version } as unknown as Master, TransactionType.DELETE);
    if (errors.length > 0) throw { validationErrors: errors };
    await this.masterRepo.delete(id);
  }

  async saveAll(
    rows: (Master & { transactionType: TransactionType })[],
  ): Promise<void> {
    // ── Phase 1: 全行バリデーション（書き込みなし）─────────────────
    const collectedErrors: ValidationError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const { transactionType, ...data } = rows[i]!;
      const lineNo = i + 1;
      const errors = await this.validateParent(data, transactionType);
      errors.forEach((e) => {
        collectedErrors.push({ ...e, line: lineNo });
      });
    }

    if (collectedErrors.length > 0) throw { validationErrors: collectedErrors };

    // ── Phase 2: 1トランザクションで全行一括書き込み ───────────────
    const tx = await this.masterRepo.beginTx();
    await this.masterRepo.applyAllInTx(tx, rows);
    await tx.done;
  }

  // ───────────────────────────────────────
  // 親子一括保存（1トランザクション）
  // ───────────────────────────────────────

  /**
   * 親マスタ と 子マスタの差分行を 1トランザクションで保存する。
   *
   * @param parent    保存対象の親マスタ（transactionType: 'A'=新規 | 'U'=更新 | 'NONE'=変更なし）
   * @param childRows 子行の差分（transactionType: 'A'/'U'/'D'）
   * @returns 保存後の親マスタ（id / version 確定済み）
   *
   * Java移行時:
   *   POST /api/masters/save-with-children
   *   @Transactional を付与するだけでよい。
   */
  async saveWithChildren(
    parent: Master & { transactionType: TransactionType },
    childRows: (SubMaster & { transactionType: TransactionType })[],
  ): Promise<Master> {
    const saveParent = parent.transactionType === TransactionType.ADD || parent.transactionType === TransactionType.UPDATE;

    if (!saveParent && childRows.length === 0) return parent;

    // ── Phase 1: 全バリデーション（書き込みなし）────────────────────
    const allErrors: ValidationError[] = [];

    if (saveParent) {
      const parentErrors = await this.validateParent(parent, parent.transactionType);
      allErrors.push(...parentErrors);
    }
    for (let i = 0; i < childRows.length; i++) {
      const row = childRows[i]!;
      (await this.validateChild(row, row.transactionType)).forEach((e) => allErrors.push({ ...e, line: i + 1 }));
    }

    if (allErrors.length > 0) throw { validationErrors: allErrors };

    // ── 全削除ガード ────────────────────────────────────────────────
    if (childRows.length > 0) {
      const existingCount = (await this.subMasterRepo.findByMasterCode(parent.code)).length;
      if (existingCount > 0) {
        const addCount    = childRows.filter((r) => r.transactionType === TransactionType.ADD).length;
        const deleteCount = childRows.filter((r) => r.transactionType === TransactionType.DELETE).length;
        if (existingCount + addCount - deleteCount <= 0) {
          throw { validationErrors: [{ field: "subMaster", message: "子マスタを全て削除することはできません。最低1件は残してください。" }] };
        }
      }
    }

    // ── Phase 2: 1トランザクションで全行一括書き込み ─────────────────
    const db = await this.masterRepo.getDbPublic();
    const tx = db.transaction(["masters", "sub_masters"], "readwrite");

    // 親の保存（ADD/UPDATE のみ。resultParent に確定後の id/version を反映）
    let resultParent: Master = { ...parent };
    const { transactionType: _pt, ...parentData } = parent;
    if (parent.transactionType === TransactionType.ADD) {
      resultParent = await this.masterRepo.createInTx(tx, parentData);
    } else if (parent.transactionType === TransactionType.UPDATE) {
      resultParent = await this.masterRepo.updateInTx(tx, parentData.id!, parentData);
    }

    // 子の保存（ADD は masterCode を付加）
    for (const row of childRows) {
      const { transactionType, ...data } = row;
      const childData = transactionType === TransactionType.ADD
        ? { ...data, masterCode: parent.code }
        : data;
      await this.subMasterRepo.applyInTx(tx, childData, transactionType);
    }

    await tx.done;
    return resultParent;
  }

  private async validateParent(data: Master, transactionType: TransactionType): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // UPDATE, DELETE: 存在確認＋楽観的ロック（フィールドバリデーション前に実施）
    if (transactionType === TransactionType.DELETE || transactionType === TransactionType.UPDATE) {
      const existing = await this.masterRepo.findById(data.id!);
      const recordMsg = validateRecordExists({ record: existing, expectedVersion: data.version });
      if (recordMsg) {
        errors.push({ field: "code", message: recordMsg });
        return errors;
      }

      // DELETE: 参照整合性チェック（データで使用中の場合は削除不可）
      if (transactionType === TransactionType.DELETE) {
        const linked = await this.dataRepo.findByMasterCode(existing!.code);
        const linkedMsg = validateLinkedRecord({ records: linked });
        if (linkedMsg) errors.push({ field: "code", message: linkedMsg });
        return errors;
      }
    }

    const codeMsg = validateText({
      value: data.code,
      required: true,
      validationRangeId: ValidationRange.Max,
      maxLength: 10,
    });
    if (codeMsg) errors.push({ field: "code", message: codeMsg });

    const nameMsg = validateText({
      value: data.name,
      required: true,
      validationRangeId: ValidationRange.Max,
      maxLength: 50,
    });
    if (nameMsg) errors.push({ field: "name", message: nameMsg });

    // ADD: コード重複チェック（code フィールドが正常な場合のみ）
    if (transactionType === TransactionType.ADD && !errors.some((e) => e.field === "code")) {
      const existing = await this.masterRepo.findByCode(data.code);
      const dupMsg = validateExists({ record: existing });
      if (dupMsg) errors.push({ field: "code", message: dupMsg });
    }

    return errors;
  }

  private async validateChild(data: SubMaster, transactionType: TransactionType): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // UPDATE, DELETE: 存在確認＋楽観的ロック（フィールドバリデーション前に実施）
    if (transactionType === TransactionType.DELETE || transactionType === TransactionType.UPDATE) {
      const existing = await this.subMasterRepo.findById(data.id!);
      const recordMsg = validateRecordExists({ record: existing, expectedVersion: data.version });
      if (recordMsg) { errors.push({ field: "code", message: recordMsg }); return errors; }
      if (transactionType === TransactionType.DELETE) return errors; // 参照整合性チェック不要のため存在確認のみ
    }

    const codeMsg = validateText({
      value: data.code,
      required: true,
      validationRangeId: ValidationRange.Max,
      maxLength: 10,
    });
    if (codeMsg) errors.push({ field: "code", message: codeMsg });

    const nameMsg = validateText({
      value: data.name,
      required: true,
      validationRangeId: ValidationRange.Max,
      maxLength: 50,
    });
    if (nameMsg) errors.push({ field: "name", message: nameMsg });

    const selectMsg = validateOption({
      value: data.selectValue,
      required: true,
      selectOptions: SUB_MASTER_SELECT_OPTIONS.map(o => String(o.value)),
    });
    if (selectMsg) errors.push({ field: "selectValue", message: selectMsg });

    // ADD: 親マスタ存在チェック
    if (transactionType === TransactionType.ADD) {
      const master = await this.masterRepo.findByCode(data.masterCode);
      if (!master) errors.push({ field: "masterCode", message: "親マスタが存在しません" });
    }

    return errors;
  }
}
