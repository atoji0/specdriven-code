import type { DbConfig } from "mzfw_backend/dbRuntime";

/**
 * アプリ固有の IndexedDB 設定
 *
 * ⚠️ ストアを追加するたびに dbVersion を +1 し、stores に追記すること
 *    （IndexedDB の upgrade トランザクションは累積定義が必要）
 *
 * 呼び出し元:
 *   main.ts で configureDb(APP_DB_CONFIG) として登録する
 *
 * Java 移行時:
 *   このファイルごと削除する。DB 接続は Spring Boot 側で管理する。
 */
export const APP_DB_CONFIG: DbConfig = {
  dbName: "app-db",
  dbVersion: 2,
  stores: [
    // ── 業務を追加するたびにここに追記し dbVersion を +1 する ──
    { name: "VEHICLE_MASTER" },
    { name: "DEFECT_RECORD" },
  ],
};
