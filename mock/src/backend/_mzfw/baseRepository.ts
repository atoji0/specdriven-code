/**
 * MODULE: baseRepository — IndexedDB CRUD 基底クラス (PoC/Mock 用)
 * 各 Repository は BaseRepository<T> を継承し、storeName を実装する。
 * Java 移行時は JPA Repository に置き換え、このファイルごと削除する。
 *
 * ─── TX の使い方 ──────────────────────────────────────────────────────────────
 * [単一ストア一括保存 (saveAll Phase2)]
 *   const tx = await this.repo.beginTx();
 *   await this.repo.applyAllInTx(tx, rows);  // rows: (Partial<T> & {transactionType})[]
 *   await tx.done;
 *
 * [複数ストアをまたぐ保存 (saveWithChildren 等)]
 *   const db = await this.parentRepo.getDbPublic();
 *   const tx = db.transaction(["store_a", "store_b"], "readwrite");  // dbConfig.ts と完全一致
 *   await this.parentRepo.createInTx(tx, parentData);
 *   await this.childRepo.applyInTx(tx, childData, transactionType);
 *   await tx.done;
 *
 * Types:
 *   SortOrder       "asc" | "desc"
 *   SortCondition   { field: keyof T, order: SortOrder }
 *
 * BaseRepository<T extends { id?, version }> methods:
 *   [TX操作]
 *     beginTx()                                    → TX (single-store readwrite)
 *     createInTx(tx,data)                          → T    (createdBy/At/version 自動設定)
 *     updateInTx(tx,id,data)                       → T    (version++ / updatedBy/At 自動設定)
 *     deleteInTx(tx,id)                            → void
 *     applyInTx(tx,data,transactionType)           → void (ADD/UPDATE/DELETE を振り分け)
 *     applyAllInTx(tx,rows[{...transactionType}])  → void (一括適用)
 *   [単独CRUD (自動コミット)]
 *     findById(id)                                 → T|null
 *     create(data)                                 → T
 *     update(id,data)                              → T
 *     delete(id)                                   → void
 *   [検索 — protected: Service から直接呼び出し不可。サブクラスで public にラップして公開する]
 *     findOne(predicate)                           → T|null
 *     findMany(predicate,sort?)                    → T[]
 *     sortItems(items,sort[])                      → T[]
 *   [初期データ]
 *     setupInitialData(initialData[])              → void (DB空の場合のみ投入)
 *     clearAll()                                   → void
 *     getDbPublic()                                → Promise<IDBPDatabase> (複数ストアTX用・Service層のみ)
 */

import type { IDBPDatabase, IDBPTransaction } from "idb";
import { getDb } from "./dbRuntime";
import { TransactionType } from "mzfw";

export type SortOrder = "asc" | "desc";
export interface SortCondition<T> {
  field: keyof T;
  order: SortOrder;
}

function getUserId(): string {
  return sessionStorage.getItem("userId") || "system";
}

export abstract class BaseRepository<T extends { id?: number; version: number | undefined }> {

  protected abstract storeName: string;

  protected async getDb(): Promise<IDBPDatabase> {
    return getDb();
  }

  // ── トランザクション ─────────────────────────────────────────────

  async beginTx(): Promise<IDBPTransaction<any, [string], "readwrite">> {
    const db = await this.getDb();
    return db.transaction([this.storeName], "readwrite");
  }

  async createInTx(tx: IDBPTransaction<any, any, "readwrite">, data: Partial<T>): Promise<T> {
    const version = (typeof data.version === "number" && !isNaN(data.version)) ? data.version : 1;
    const now = new Date().toISOString();
    const userId = getUserId();
    const entity = {
      ...data,
      version,
      createdBy: (data as any).createdBy ?? userId,
      updatedBy: (data as any).updatedBy ?? userId,
      createdAt: (data as any).createdAt ?? now,
      updatedAt: (data as any).updatedAt ?? now,
    } as unknown as T;
    const id = await tx.objectStore(this.storeName).add(entity);
    return { ...entity, id: id as number } as T;
  }

  async updateInTx(tx: IDBPTransaction<any, any, "readwrite">, id: number, data: Partial<T>): Promise<T> {
    const store = tx.objectStore(this.storeName);
    const current = await store.get(id);
    if (!current) throw new Error("データが存在しません");
    const nextVersion = (typeof current.version === "number" && !isNaN(current.version)) ? current.version + 1 : 1;
    const entity = {
      ...current,
      ...data,
      version: nextVersion,
      updatedBy: getUserId(),
      updatedAt: new Date().toISOString(),
    } as unknown as T;
    await store.put(entity);
    return entity as T;
  }

  async deleteInTx(tx: IDBPTransaction<any, any, "readwrite">, id: number): Promise<void> {
    await tx.objectStore(this.storeName).delete(id);
  }

  async applyInTx(tx: IDBPTransaction<any, any, "readwrite">, data: Partial<T>, transactionType: TransactionType): Promise<void> {
    if (transactionType === TransactionType.ADD) {
      await this.createInTx(tx, data);
    } else if (transactionType === TransactionType.UPDATE) {
      await this.updateInTx(tx, (data as any).id!, data);
    } else if (transactionType === TransactionType.DELETE) {
      await this.deleteInTx(tx, (data as any).id!);
    }
  }

  async applyAllInTx(
    tx: IDBPTransaction<any, any, "readwrite">,
    rows: (Partial<T> & { transactionType: TransactionType })[],
  ): Promise<void> {
    for (const row of rows) {
      const { transactionType, ...data } = row;
      await this.applyInTx(tx, data as unknown as Partial<T>, transactionType);
    }
  }

  // ── 単独 CRUD（自動コミット） ─────────────────────────────────────

  async findById(id: number): Promise<T | null> {
    const db = await this.getDb();
    return (await db.get(this.storeName, id)) ?? null;
  }

  async create(data: Partial<T>): Promise<T> {
    const tx = await this.beginTx();
    const result = await this.createInTx(tx, data);
    await tx.done;
    return result;
  }

  async update(id: number, data: Partial<T>): Promise<T> {
    const tx = await this.beginTx();
    const result = await this.updateInTx(tx, id, data);
    await tx.done;
    return result;
  }

  async delete(id: number): Promise<void> {
    const tx = await this.beginTx();
    await this.deleteInTx(tx, id);
    await tx.done;
  }

  protected async findOne(predicate: (item: T) => boolean): Promise<T | null> {
    const db = await this.getDb();
    const all = await db.getAll(this.storeName);
    return all.find(predicate) ?? null;
  }

  protected async findMany(predicate: (item: T) => boolean, sort?: SortCondition<T>[]): Promise<T[]> {
    const db = await this.getDb();
    const all = await db.getAll(this.storeName);
    const filtered = all.filter(predicate);
    return sort ? this.sortItems(filtered, sort) : filtered;
  }

  protected sortItems(items: T[], sort: SortCondition<T>[]): T[] {
    return items.slice().sort((a, b) => {
      for (const cond of sort) {
        const av = a[cond.field];
        const bv = b[cond.field];
        if (av === bv) continue;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return cond.order === "asc" ? -1 : 1;
        if (av > bv) return cond.order === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  async setupInitialData(initialData: Partial<Omit<T, "id">>[]) {
    const all = await this.getDb().then(db => db.getAll(this.storeName));
    if (!all || all.length === 0) {
      for (const data of initialData) {
        await this.create(data as any);
      }
    }
  }

  async clearAll(): Promise<void> {
    const db = await this.getDb();
    await db.clear(this.storeName);
  }

  async getDbPublic(): Promise<IDBPDatabase> {
    return this.getDb();
  }
}
