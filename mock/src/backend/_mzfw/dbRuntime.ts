/**
 * MODULE: dbRuntime — IndexedDB 接続管理 (PoC/Mock 用)
 * idb ライブラリのラッパー。シングルトン接続を管理する。
 * Java 移行時はこのファイルごと不要になる。
 *
 * Types:
 *   StoreDefinition   { name: string }
 *   DbConfig          { dbName, dbVersion, stores: StoreDefinition[] }
 *                     ストア追加時は dbVersion を +1 すること（upgrade が再実行されるため）。
 *
 * Functions:
 * configureDb(config)  → void
 *   DB名・バージョン・ストア一覧を登録。main.ts の createApp() より前に必ず呼ぶ。
 *
 * getDb()  → Promise<IDBPDatabase>
 *   シングルトン接続を返す。configureDb 未呼び出しの場合は Error をスロー。
 *   別タブのアップグレードや DevTools の Delete database に追従して自動クローズする。
 *   スキーマ不整合などで openDB が失敗した場合は DB を削除して再作成する（データはリセットされる）。
 *
 * getAppDb()  → Promise<IDBPDatabase>
 *   複数ストアをまたぐトランザクションを組む場合に Service 層から呼ぶ。
 *   Repository 層では呼ばず BaseRepository.getDbPublic() を経由する。
 */

import { openDB, deleteDB } from "idb";
import type { IDBPDatabase } from "idb";

// ─────────────────────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────────────────────

export interface StoreDefinition {
  name: string;
}

export interface DbConfig {
  dbName: string;
  dbVersion: number;
  stores: readonly StoreDefinition[] | StoreDefinition[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 内部状態
// ─────────────────────────────────────────────────────────────────────────────

let _config: DbConfig | null = null;

// シングルトン DB 接続キャッシュ
// 接続を使い回すことで、DevTools の「Delete database」がブロックされる問題を防ぐ
let _dbInstance: IDBPDatabase | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// 公開 API
// ─────────────────────────────────────────────────────────────────────────────

export function configureDb(config: DbConfig): void {
  _config = config;
}

/** openDB 本体（共通処理）。try/catch による再作成リトライから呼ばれる。 */
async function _openDb(): Promise<IDBPDatabase> {
  const { dbName, dbVersion, stores } = _config!;

  const db = await openDB(dbName, dbVersion, {
    upgrade(db) {
      // ⚠️ ストアを追加するたびに dbVersion を +1 し、ここに全ストアを累積定義すること
      stores.forEach((store) => {
        if (!db.objectStoreNames.contains(store.name)) {
          db.createObjectStore(store.name, { keyPath: "id", autoIncrement: true });
        }
      });
    },
    blocked() {
      // 古いタブが接続を保持している場合に呼ばれる
      console.warn("[IndexedDB] upgrade blocked by another connection. Please close other tabs.");
    },
    blocking() {
      // このタブが他の upgrade をブロックしている場合：接続を閉じて次のリクエストを通す
      _dbInstance?.close();
      _dbInstance = null;
    },
    terminated() {
      // ブラウザに強制終了された場合（例: DevTools Delete database）
      _dbInstance = null;
    },
  });

  // バージョン変更（別タブの upgrade / DevTools Delete database）時に自動クローズ
  db.addEventListener("versionchange", () => {
    _dbInstance?.close();
    _dbInstance = null;
  });

  return db;
}

export async function getDb(): Promise<IDBPDatabase> {
  if (_dbInstance) return _dbInstance;

  if (!_config) {
    throw new Error(
      "[dbRuntime] configureDb() が呼ばれていません。" +
      "main.ts で configureDb(APP_DB_CONFIG) をアプリ起動前に呼び出してください。"
    );
  }

  try {
    _dbInstance = await _openDb();
  } catch (err) {
    // スキーマ不整合・バージョン不一致など回復不能な場合は DB を削除して再作成する
    // ⚠️ モックデータはすべてリセットされる
    console.warn(
      "[dbRuntime] DB のオープンに失敗しました。スキーマ不整合の可能性があるため DB を再作成します。",
      err
    );
    await deleteDB(_config.dbName);
    _dbInstance = await _openDb();
  }

  return _dbInstance;
}

export async function getAppDb(): Promise<IDBPDatabase> {
  return getDb();
}
