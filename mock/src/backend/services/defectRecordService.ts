import type { DefectRecord, DefectRecordSearch } from "@/types/defectRecord";
import { DefectRecordRepository } from "../repositories/defectRecordRepository";
import { VehicleMasterRepository } from "../repositories/vehicleMasterRepository";
import {
  validateText,
  validateRecordExists,
  ValidationRange,
} from "mzfw_backend/validations";
import type { ValidationError } from "mzfw_backend/validations";
import { TransactionType } from "mzfw";

/**
 * DefectRecordService - 不具合記録のビジネスロジック
 *
 * Java移行時: このクラスを Java Service に再実装する。IndexedDB 操作は JPA に置き換える。
 */
export class DefectRecordService {
  private repo = new DefectRecordRepository();
  private vehicleRepo = new VehicleMasterRepository();

  // ───────────────────────────────────────
  // 取得
  // ───────────────────────────────────────

  /**
   * 条件検索（createdAt 降順）+ 車種名・車両コードを名称解決して返す
   */
  async findByConditions(search: DefectRecordSearch): Promise<DefectRecord[]> {
    // vehicleCode → vehicleId に変換
    let vehicleId: number | undefined;
    if (search.vehicleCode) {
      const vehicle = await this.vehicleRepo.findByCode(search.vehicleCode);
      if (!vehicle) return []; // 該当車両なし → 0件
      vehicleId = vehicle.id;
    }

    const records = await this.repo.findByConditions({ ...search, vehicleId });

    // 車両マスタを Map でキャッシュして名称解決
    const vehicleMap = new Map<number, { vehicleCode: string; vehicleTypeName: string }>();
    const allVehicles = await this.vehicleRepo.findAll();
    allVehicles.forEach((v) => {
      if (v.id !== undefined) vehicleMap.set(v.id, { vehicleCode: v.vehicleCode, vehicleTypeName: v.vehicleTypeName });
    });

    return records.map((r) => ({
      ...r,
      vehicleCode: vehicleMap.get(r.vehicleId)?.vehicleCode ?? "",
      vehicleTypeName: vehicleMap.get(r.vehicleId)?.vehicleTypeName ?? "",
    }));
  }

  async findById(id: number): Promise<DefectRecord | null> {
    const record = await this.repo.findById(id);
    if (!record) return null;
    const vehicle = await this.vehicleRepo.findById(record.vehicleId);
    return {
      ...record,
      vehicleCode: vehicle?.vehicleCode ?? "",
      vehicleTypeName: vehicle?.vehicleTypeName ?? "",
    };
  }

  /**
   * 車両コードから vehicleId を解決して返す（バーコードスキャン後の呼び出し用）
   */
  async resolveVehicleByCode(vehicleCode: string): Promise<{ id: number; vehicleTypeName: string } | null> {
    const vehicle = await this.vehicleRepo.findByCode(vehicleCode);
    if (!vehicle || vehicle.id === undefined) return null;
    return { id: vehicle.id, vehicleTypeName: vehicle.vehicleTypeName };
  }

  // ───────────────────────────────────────
  // CRUD
  // ───────────────────────────────────────

  async create(data: DefectRecord): Promise<DefectRecord> {
    const errors = await this.validate(data, TransactionType.ADD);
    if (errors.length > 0) throw { validationErrors: errors };
    return this.repo.create(data);
  }

  async update(id: number, data: DefectRecord): Promise<DefectRecord> {
    const errors = await this.validate({ ...data, id }, TransactionType.UPDATE);
    if (errors.length > 0) throw { validationErrors: errors };
    return this.repo.update(id, data);
  }

  async delete(id: number, version: number): Promise<void> {
    const errors = await this.validate({ id, version } as unknown as DefectRecord, TransactionType.DELETE);
    if (errors.length > 0) throw { validationErrors: errors };
    await this.repo.delete(id);
  }

  // ───────────────────────────────────────
  // private validate
  // ───────────────────────────────────────

  private async validate(data: DefectRecord, transactionType: TransactionType): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (transactionType === TransactionType.DELETE || transactionType === TransactionType.UPDATE) {
      const existing = await this.repo.findById(data.id!);
      const existMsg = validateRecordExists({ record: existing, expectedVersion: data.version });
      if (existMsg) { errors.push({ field: "id", message: existMsg }); return errors; }
    }

    if (transactionType === TransactionType.ADD || transactionType === TransactionType.UPDATE) {
      // vehicleId: 車両マスタ参照チェック
      if (!data.vehicleId) {
        errors.push({ field: "vehicleId", message: "入力必須です" });
      } else {
        const vehicle = await this.vehicleRepo.findById(data.vehicleId);
        if (!vehicle) errors.push({ field: "vehicleId", message: "該当する車両が見つかりません" });
      }

      // annotatedImage: 写真必須
      if (!data.annotatedImage) {
        errors.push({ field: "annotatedImage", message: "写真を撮影してください" });
      }

      // defectDescription: 最大256文字
      if (data.defectDescription !== undefined) {
        const descMsg = validateText({
          value: data.defectDescription,
          required: false,
          validationRangeId: ValidationRange.Max,
          maxLength: 256,
        });
        if (descMsg) errors.push({ field: "defectDescription", message: descMsg });
      }
    }

    return errors;
  }
}
