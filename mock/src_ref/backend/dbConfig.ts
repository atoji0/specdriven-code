import type { DbConfig } from "mzfw_backend/dbRuntime";

/**
 * サンプル（src_ref）固有の IndexedDB 設定
 *
 * ⚠️ ストアを追加するたびに dbVersion を +1 し、stores に追記すること
 *    （IndexedDB の upgrade トランザクションは累積定義が必要）
 *
 * 呼び出し元:
 *   main.ts で configureDb(APP_DB_CONFIG) として登録する
 *
 * Java/OutSystems 移行時:
 *   このファイルごと削除する。DB 接続は Spring Boot 側で管理する。
 */
export const APP_DB_CONFIG: DbConfig = {
  dbName: "app-db",
  dbVersion: 3,
  stores: [
    { name: "data" },         // サンプル：メインエンティティ
    { name: "masters" },      // サンプル：マスタ参照用
    { name: "sub_masters" },  // サンプル：連動マスタ参照用（親マスタに連動）
    { name: "sub_data" },     // サンプル：data ↔ master 中間テーブル（1:N サロゲートキー連携）
    // ── 業務を追加するたびにここに追記する ──
  ],
};
