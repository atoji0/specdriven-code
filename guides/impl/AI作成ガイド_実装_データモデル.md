# 実装ガイド データモデル生成

データ定義書（Markdown）を入力として、TypeScript のデータモデル関連ファイルを生成するルールを定義する。

**本ガイドの対象**: 型定義 / Entity拡張 / バックエンド定数 / DB設定  
**対象外**: Repository / Service / API層 / UI実装（それぞれ専用ガイドを参照）

---

## 1. 型定義ファイル（`src/types/{entity}.ts`）

### ルール

- **エンティティ1つにつき1ファイル**。複数エンティティをまとめない。
- ファイル名はキャメルケース単数形（例: `projectPlan.ts`）。
- 本ガイドで生成するのは **`{Entity}`** 型のみ。検索条件型（`{Entity}Search`）は UI仕様書参照時に追加する。
- 外部キー参照エンティティ（マスタ・連動マスタ・中間エンティティ）も同じルールで生成する。

### フィールド変換ルール

データ定義書の「データ定義」章の各行を下表でそのまま変換する。

| データ定義書の型 | TypeScript の型 | 必須=Y | 必須=- |
|----------------|----------------|--------|--------|
| キー（主キー）  | `number`        | `id?: number`（常にオプション・autoIncrement） | — |
| キー（外部キー）| `number`        | `{field}: number` | `{field}?: number` |
| 文字列・コード  | `string`        | `{field}: string` | `{field}?: string` |
| 数値            | `number`        | `{field}: number` | `{field}?: number` |
| 日付            | `Date`          | `{field}: Date` | `{field}?: Date` |
| フラグ          | `number`        | `{field}: number`（`1=有効 / 0=無効` をコメントで明示） | — |

**補足ルール:**
- `version: number` はすべてのエンティティ末尾に必ず追加する（楽観ロック用）。
- 作成日時・更新日時・作成者・更新者は除外（`EntityBase` に委ねる）。
- 表示用の名称解決フィールド（例: `masterName`）は業務データではない。含める場合は `?: string` のオプションとし、コメントに「表示用・サーバーサイドで解決」と明記する。

### 構成例

```typescript
// src/types/projectPlan.ts
export interface ProjectPlan {
  id?: number;              // autoIncrement（主キー）
  planCode: string;         // 計画コード（必須・半角英数字）
  planName: string;         // 計画名称（必須）
  siteId: number;           // 職場（必須・WorkSite.id 外部キー）
  siteName?: string;        // 職場名称（表示用・サーバーサイドで解決）
  plannedDate: Date;        // 計画日（必須）
  amount?: number;          // 金額（任意）
  statusValue: string;      // ステータス（必須・PLAN_STATUS_OPTIONS のキー）
  isActive: number;         // 有効フラグ（1=有効 / 0=無効）
  note?: string;            // 備考（任意）
  version: number;          // 楽観的ロック用バージョン
}
```

---

## 2. Entity 拡張定義（`src/backend/entities.ts`）

### ルール

- プロジェクト内の全 Entity を **1ファイルにまとめる**。
- `export interface {Entity}Entity extends {Entity}, EntityBase {}` の**1行形式のみ**。ロジックは書かない。
- `EntityBase` は `mzfw_backend/entity` から import する。

### 構成例

```typescript
import type { EntityBase } from "mzfw_backend/entity";
import type { MainData } from "@/types/mainData";
import type { Master } from "@/types/master";

export interface MainDataEntity extends MainData, EntityBase {}
export interface MasterEntity extends Master, EntityBase {}
```

---

## 3. バックエンド定数（`src/backend/constants.ts`）

### ルール

- 定数名は **UPPER_SNAKE_CASE**。
- 各要素の形式：プロパティが **2つ（value・label）のみ**の場合は `{ value, label }`。**3つ以上**の場合はデータ定義書に提示されたレイアウトに合わせる。
- 必ず `as const` を末尾に付ける。
- コード値・表示名はデータ定義書の値を**一字一句変えずに**コピーする。
- フロントから直接 import 禁止。Service → API 経由で `SelectOption[]` として返す。

### `SelectOption` 型

`{ value: string | number; label: string }` — `import type { SelectOption } from "mzfw"` で利用。Vue・API 層では必ず `mzfw` から直接 import する。

### 構成例

```typescript
// src/backend/constants.ts
// Java移行時: 各定数を Java Enum や DB マスタに変換する。

export const SELECT_OPTIONS = [
  { value: "A", label: "有効" },
  { value: "B", label: "保留" },
  { value: "C", label: "終了" },
] as const;
```

---

## 4. DB 設定（`src/backend/dbConfig.ts`）

### ルール

- ストアを追加するたびに `dbVersion` を **+1** する（バージョンを上げないと `upgrade` が実行されない）。
- ストア名の命名規則：**スネークケース複数形**（例: `project_plans`、`work_sites`）。
- コメントでエンティティの業務的な意味を1行記載する。

### 構成例

```typescript
import type { DbConfig } from "mzfw_backend/dbRuntime";

export const APP_DB_CONFIG: DbConfig = {
  dbName: "app-db",
  dbVersion: 0,  // ⚠️ 初回は0固定とし、entity構造に変更があれば、+1とする。
  stores: [
    { name: "data" },        // メインエンティティ
    { name: "masters" },     // マスタ参照用
    { name: "sub_masters" }, // 連動マスタ参照用
    { name: "sub_data" },    // 中間エンティティ（サロゲートキー連携）
  ],
};
```

---

## 5. 初期データ投入（SetupService）

初期データは `src/backend/services/setupService.ts` に集約する。

### ルール

#### データソースの優先順位

エンティティごとに独立して判断する（一部のエンティティにデータがあっても、他のエンティティには作成する）。

| 優先度 | 条件 | 対応 |
|--------|------|------|
| 1 | `{*}_業務要件.md` またはデータ定義書にサンプルデータが記載されている | そのデータを**一字一句変えずに**使用する（上限 20 件） |
| 2 | サンプルなし | AI がデータ定義を見て生成する |

#### AI生成時のサンプル件数ルール

| エンティティ種別 | 件数・方針 |
|----------------|-----------|
| メインデータ（業務データ） | 目安12件（サンプル提示ありの場合はそれに合わせる。上限20件）。数値・日付・選択値は変化をつける。必須項目はすべて埋める。任意項目は一部省略可。 |
| マスタ（参照用） | 選択肢として最低3パターン揃えば十分。それ以上は不要。 |
| 連動マスタ | 各親マスタに2〜3件。全パターンが一巡すれば可。 |
| 中間エンティティ | メインデータ数件に対して適切に関連付ける（全件必須ではない）。 |

#### 実装ルール

- `setup()` は**冪等**にする（各 private メソッド内で件数確認して 0 件のときだけ投入）。
- 一括投入は `setupInitialData()` を使う（FK 依存がない場合）。
- FK 依存がある場合（子が親の `id` を必要とする）は `create()` を 1 件ずつ呼び出し、戻り値の `id` を次の `create()` に渡す。
- `clearAndResetAllData()` に新エンティティの `clearAll()` を**子→親の順で**追記する。
- コメントに「業務追加時はここに追記 (1)(2)」の目印を残す（`src_ref` の規約に合わせる）。

#### setupService.ts への追記手順

1. import に新 Repository を追記
2. private フィールドに `new XxxRepository()` を追記
3. `setup()` の末尾（コメント目印の直前）に `await this.setupXxx();` を追記
4. `clearAndResetAllData()` の削除ブロック（コメント目印の直前）に `clearAll()` を**子→親の順**で追記
5. ファイル末尾の `}` の手前に `private async setupXxx(): Promise<void> { ... }` を追記


