import type { MainData, MainDataSearch } from "@/types/mainData";
import type { Master } from "@/types/master";
import type { SubMaster } from "@/types/subMaster";
import { DataRepository } from "../repositories/dataRepository";
import { MasterRepository } from "../repositories/masterRepository";
import { SubMasterRepository } from "../repositories/subMasterRepository";
import type { ValidationError } from "mzfw_backend/validations";
import {
  ValidationRange,
  ValidationCharType,
  validateText,
  validateRecordExists,
  validateExists,
  validateReferenceExists,
  validateIntegerRange,
  validateDateRange,
  validateOption
} from "mzfw_backend/validations";
import { SELECT_OPTIONS } from "../constants";
import type { SelectOption } from "mzfw";
import { TransactionType } from "mzfw";

/**
 * ReferenceService - サンプルマスタのビジネスロジック
 *
 * バリデーション・重複チェック・選択肢取得・参照整合性チェックをここに集約する。
 *
 * Java移行時:
 *   - このクラスの処理を Java Service に再実装する
 *   - IndexedDB 操作は JPA/JDBC に置き換える
 */
export class ReferenceService {
  private repo = new DataRepository();
  private masterRepo = new MasterRepository();
  private subMasterRepo = new SubMasterRepository();

  // ───────────────────────────────────────
  // データ取得
  // ───────────────────────────────────────

  /** 検索条件に基づくデータ取得（名称解決込み） */
  async findByConditions(query: MainDataSearch): Promise<MainData[]> {
    const items = await this.repo.findByConditions(query);

    // master / subMaster を全件取得して Map化（JOIN相当）
    const masters = await this.masterRepo.findAll();
    const subMasters = await this.subMasterRepo.findAll();
    const masterMap = new Map(masters.map((m) => [m.code, m.name]));
    const subMasterMap = new Map(subMasters.map((s) => [s.code, s.name]));

    return items.map((item) => ({
      ...item,
      masterName: masterMap.get(item.masterValue),
      linkedName: subMasterMap.get(item.linkedValue),
    }));
  }

  /** ID で1件取得 */
  async findById(id: number): Promise<MainData | null> {
    return this.repo.findById(id);
  }

  // ───────────────────────────────────────
  // 選択肢取得
  // ───────────────────────────────────────

  /** 固定値選択肢（selectValue） */
  getSelectOptions(): SelectOption[] {
    return [...SELECT_OPTIONS];
  }

  /** マスタ参照選択肢（masterValue） */
  async getMasterOptions(): Promise<SelectOption[]> {
    const masters = await this.masterRepo.findAll();
    return masters.map((m: Master) => ({
      label: m.name,
      value: m.code,
    }));
  }

  /** 連動マスタ参照選択肢（linkedValue）。masterValue 変更時に呼び直す */
  async getLinkedOptions(masterCode: string): Promise<SelectOption[]> {
    const subMasters = await this.subMasterRepo.findByMasterCode(masterCode);
    return subMasters.map((s: SubMaster) => ({
      label: s.name,
      value: s.code,
    }));
  }

  // ───────────────────────────────────────
  // CRUD
  // ───────────────────────────────────────

  async create(data: MainData): Promise<MainData> {
    const errors = await this.validate(data, TransactionType.ADD);
    if (errors.length > 0) throw { validationErrors: errors };
    return this.repo.create({ ...data, version: 1 }) as Promise<MainData>;
  }

  async update(id: number, data: MainData): Promise<MainData> {
    const errors = await this.validate(data, TransactionType.UPDATE);
    if (errors.length > 0) throw { validationErrors: errors };
    return this.repo.update(id, {...data, version: data.version + 1 }) as Promise<MainData>;
  }

  async delete(id: number, version: number): Promise<void> {
    const errors = await this.validate({ id, version } as unknown as MainData, TransactionType.DELETE);
    if (errors.length > 0) throw { validationErrors: errors };
    await this.repo.delete(id);
  }

  /**
   * 一括登録・更新・削除（Excel アップロード用）
   *
   * 2フェーズで処理する:
   *   Phase 1: 全行のバリデーション → エラーがあれば行番号付きでまとめて throw（書き込みゼロ）
   *   Phase 2: エラーなし確認後、1トランザクションで全行を一括書き込み
   *
   */
  async saveAll(
    rows: (MainData & { transactionType: TransactionType })[],
  ): Promise<void> {
    // ── Phase 1: 全行バリデーション（書き込みなし）─────────────────
    const collectedErrors: (ValidationError & { line?: number })[] = [];

    for (let i = 0; i < rows.length; i++) {
      const { transactionType, ...data } = rows[i]!;
      const lineNo = i + 1;
      const errors = await this.validate(data, transactionType);
      errors.forEach((e) => {
        collectedErrors.push({ ...e, line: lineNo });
      });
    }

    if (collectedErrors.length > 0) throw { validationErrors: collectedErrors };

    // ── Phase 2: 1トランザクションで全行一括書き込み ───────────────
    const tx = await this.repo.beginTx();
    await this.repo.applyAllInTx(tx, rows);
    await tx.done;
  }

  // ───────────────────────────────────────
  // バリデーション
  // ───────────────────────────────────────

  /**
   * 入力値バリデーション（UI仕様書「入力項目定義」に準拠）
   * 実業務に合わせて各フィールドの制約を変更すること
   */
  private async validate(data: MainData, transactionType: TransactionType): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // UPDATE, DELETE: 存在確認＋楽観的ロック（フィールドバリデーション前に実施）
    if (transactionType === TransactionType.DELETE || transactionType === TransactionType.UPDATE) {
      const existing = await this.repo.findById(data.id!);
      const recordMsg = validateRecordExists({ record: existing, expectedVersion: data.version });
      if (recordMsg) { errors.push({ field: "codeValue", message: recordMsg }); return errors; }
      if (transactionType === TransactionType.DELETE) return errors; // 参照整合性チェック不要のため存在確認のみ
    }

    // codeValue: 必須・半角英数字・10桁以内
    const codeMsg = validateText({
      value: data.codeValue,
      required: true,
      validationRangeId: ValidationRange.Max,
      maxLength: 10,
      validationCharType: ValidationCharType.AsciiAlphanumeric,
    });
    if (codeMsg) errors.push({ field: "codeValue", message: codeMsg });

    // nameValue: 必須・50桁以内
    const nameMsg = validateText({
      value: data.nameValue,
      required: true,
      validationRangeId: ValidationRange.Max,
      maxLength: 50,
    });
    if (nameMsg) errors.push({ field: "nameValue", message: nameMsg });

    // numericValue: 任意・0以上
    const numMsg = validateIntegerRange({
      value: data.numericValue,
      validationRangeId: ValidationRange.None,
      minValue: 0,
      maxValue: 9999999,
    });
    if (numMsg) errors.push({ field: "numericValue", message: numMsg });

    // dateValue: 必須
    const dateMsg = validateDateRange({
      value: data.dateValue,
      required: true,
    });
    if (dateMsg) errors.push({ field: "dateValue", message: dateMsg });

    // selectValue: 必須・固定値のいずれか
    const selectMsg = validateOption({
      value: data.selectValue,
      required: true,
      selectOptions: SELECT_OPTIONS.map(o => String(o.value)),
    });
    if (selectMsg) errors.push({ field: "selectValue", message: selectMsg });

    // masterValue: 必須
    const masterTextMsg = validateText({
      value: data.masterValue,
      required: true,
      validationRangeId: ValidationRange.None,
    });
    if (masterTextMsg) {
      errors.push({ field: "masterValue", message: masterTextMsg });
    } else {
      // masterValue: 参照先存在チェック
      const master = await this.masterRepo.findByCode(data.masterValue);
      const masterRefMsg = validateReferenceExists({ record: master });
      if (masterRefMsg) errors.push({ field: "masterValue", message: masterRefMsg });
    }

    // linkedValue: 必須
    const linkedTextMsg = validateText({
      value: data.linkedValue,
      required: true,
      validationRangeId: ValidationRange.None,
    });
    if (linkedTextMsg) {
      errors.push({ field: "linkedValue", message: linkedTextMsg });
    } else {
      // linkedValue: 参照先存在チェック → 親マスタ一致チェック（相関・業務固有）
      const sub = await this.subMasterRepo.findByCode(data.linkedValue);
      const subRefMsg = validateReferenceExists({ record: sub });
      if (subRefMsg) errors.push({ field: "linkedValue", message: subRefMsg });
      else if (sub!.masterCode !== data.masterValue) {
        errors.push({ field: "linkedValue", message: "連動マスタの親マスタが一致しません" });
      }
    }

    // memoValue: 任意・500桁以内
    const memoMsg = validateText({
      value: data.memoValue,
      required: false,
      validationRangeId: ValidationRange.Max,
      maxLength: 500,
    });
    if (memoMsg) errors.push({ field: "memoValue", message: memoMsg });

    // ADD: コード重複チェック（codeValue フィールドが正常な場合のみ）
    if (transactionType === TransactionType.ADD && !errors.some((e) => e.field === "codeValue")) {
      const dup = await this.repo.findByCodeValue(data.codeValue);
      const dupMsg = validateExists({ record: dup });
      if (dupMsg) errors.push({ field: "codeValue", message: dupMsg });
    }

    return errors;
  }
}

