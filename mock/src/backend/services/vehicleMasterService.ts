import type { VehicleMaster } from "@/types/vehicleMaster";
import { VehicleMasterRepository } from "../repositories/vehicleMasterRepository";
import { DefectRecordRepository } from "../repositories/defectRecordRepository";
import {
  validateText,
  validateExists,
  validateRecordExists,
  validateLinkedRecord,
  ValidationRange,
  ValidationCharType,
} from "mzfw_backend/validations";
import type { ValidationError } from "mzfw_backend/validations";
import type { SelectOption } from "mzfw";
import { TransactionType } from "mzfw";

/**
 * VehicleMasterService - 車両マスタのビジネスロジック
 *
 * Java移行時: このクラスを Java Service に再実装する。IndexedDB 操作は JPA に置き換える。
 */
export class VehicleMasterService {
  private repo = new VehicleMasterRepository();
  private defectRepo = new DefectRecordRepository();

  // ───────────────────────────────────────
  // 取得
  // ───────────────────────────────────────

  async findAll(): Promise<VehicleMaster[]> {
    return this.repo.findAll();
  }

  async findById(id: number): Promise<VehicleMaster | null> {
    return this.repo.findById(id);
  }

  async findByCode(vehicleCode: string): Promise<VehicleMaster | null> {
    return this.repo.findByCode(vehicleCode);
  }

  // ───────────────────────────────────────
  // 選択肢
  // ───────────────────────────────────────

  /** プルダウン用選択肢（vehicleCode + vehicleTypeName） */
  async getVehicleOptions(): Promise<SelectOption[]> {
    const items = await this.repo.findAll();
    return items.map((v) => ({
      value: v.id as number,
      label: `${v.vehicleCode} ${v.vehicleTypeName}`,
    }));
  }

  // ───────────────────────────────────────
  // CRUD
  // ───────────────────────────────────────

  async create(data: VehicleMaster): Promise<VehicleMaster> {
    const errors = await this.validate(data, TransactionType.ADD);
    if (errors.length > 0) throw { validationErrors: errors };
    return this.repo.create(data);
  }

  async update(id: number, data: VehicleMaster): Promise<VehicleMaster> {
    const errors = await this.validate({ ...data, id }, TransactionType.UPDATE);
    if (errors.length > 0) throw { validationErrors: errors };
    return this.repo.update(id, data);
  }

  async delete(id: number, version: number): Promise<void> {
    const errors = await this.validate({ id, version } as unknown as VehicleMaster, TransactionType.DELETE);
    if (errors.length > 0) throw { validationErrors: errors };
    await this.repo.delete(id);
  }

  // ───────────────────────────────────────
  // 初期データ
  // ───────────────────────────────────────

  async setupInitialData(): Promise<void> {
    // 車両マスタは定義データとして毎回リセットする（デモ用）
    await this.repo.clearAll();
    const initialData = [
      { vehicleCode: "0123456789", vehicleTypeName: "CX-5",   remarks: undefined, version: 0 },
      { vehicleCode: "0000000000", vehicleTypeName: "CX-30",  remarks: undefined, version: 0 },
    ];
    for (const d of initialData) {
      await this.repo.create(d as any);
    }
  }

  // ───────────────────────────────────────
  // private validate
  // ───────────────────────────────────────

  private async validate(data: VehicleMaster, transactionType: TransactionType): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (transactionType === TransactionType.DELETE) {
      const existing = await this.repo.findById(data.id!);
      const existMsg = validateRecordExists({ record: existing, expectedVersion: data.version });
      if (existMsg) { errors.push({ field: "id", message: existMsg }); return errors; }

      const linked = await this.defectRepo.findByVehicleId(data.id!);
      const linkedMsg = validateLinkedRecord({ records: linked });
      if (linkedMsg) errors.push({ field: "id", message: linkedMsg });
      return errors;
    }

    if (transactionType === TransactionType.UPDATE) {
      const existing = await this.repo.findById(data.id!);
      const existMsg = validateRecordExists({ record: existing, expectedVersion: data.version });
      if (existMsg) { errors.push({ field: "id", message: existMsg }); return errors; }
    }

    // vehicleCode: 必須・半角数字・10桁固定
    const codeMsg = validateText({
      value: data.vehicleCode,
      required: true,
      validationRangeId: ValidationRange.Between,
      minLength: 10,
      maxLength: 10,
      validationCharType: ValidationCharType.AsciiDigitsOnly,
    });
    if (codeMsg) errors.push({ field: "vehicleCode", message: codeMsg });

    if (!codeMsg && transactionType === TransactionType.ADD) {
      const dup = await this.repo.findByCode(data.vehicleCode);
      const dupMsg = validateExists({ record: dup });
      if (dupMsg) errors.push({ field: "vehicleCode", message: dupMsg });
    }

    // vehicleTypeName: 必須・最夯100文字
    const nameMsg = validateText({
      value: data.vehicleTypeName,
      required: true,
      validationRangeId: ValidationRange.Max,
      maxLength: 100,
    });
    if (nameMsg) errors.push({ field: "vehicleTypeName", message: nameMsg });

    // remarks: 最夯256文字
    if (data.remarks !== undefined) {
      const remarksMsg = validateText({
        value: data.remarks,
        required: false,
        validationRangeId: ValidationRange.Max,
        maxLength: 256,
      });
      if (remarksMsg) errors.push({ field: "remarks", message: remarksMsg });
    }

    return errors;
  }
}
