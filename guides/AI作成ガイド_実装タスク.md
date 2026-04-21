# AI作成ガイド 実装タスク書生成

## 1. 目的

本書は、プロジェクトの設計書群（業務仕様書・データ仕様書・UI仕様書群）を読み込み、  
Vue アプリケーション実装に必要な情報を網羅した「**実装タスク書**」を生成するルールを定義する。

### 実装タスク書の要件

- 元の設計書を再参照せずに実装を完結できる
- 各実装タスク書は `npm run build` が通る独立した追加単位となる
- 依存関係のない単純な画面から段階的に追加実装できる構成にする

> 実装タスク書を使って実装するときは、`guides/impl/` 配下の各実装ガイドも合わせて参照すること。  
> 実装タスク書は「**何を**作るか」を定義し、実装ガイドは「**どう**作るか」を定義する。  
> ガイドとサンプルファイルの対応は「**3. 実装ガイド × サンプルファイル 参照マップ**」を参照。

---

## 2. 入力・出力

| 入力 | 説明 |
|------|------|
| `{業務名}_業務要件.md` | サンプルデータ取得 |
| `{業務名}_業務仕様書.md` | 画面一覧・入力方式・エンティティ概要 |
| `{業務名}_データ仕様書.md` | エンティティ定義・フィールド仕様 |
| `UI仕様書_{画面名}_一覧.md` × N | 検索条件・表示列・ソート順 |
| `UI仕様書_{画面名}_入力.md` × N | フォーム項目・バリデーション・状態切替 |

| 出力 | 説明 |
|------|------|
| `{業務名}_実装タスク_01.md` | Batch 01 実装タスク書（データモデル全体 + 独立マスタ） |
| `{業務名}_実装タスク_02.md` | Batch 02 実装タスク書（従属マスタ、Batch 01 の後） |
| `{業務名}_実装タスク_{N:02}.md` | Batch N 実装タスク書（親子型・複合型） |

出力先：プロジェクトフォルダ（設計書と同じフォルダ）

---

## 3. 実装ガイド × サンプルファイル 参照マップ

実装タスク書の各セクションを生成・実装するときに**必ず参照すべきガイドとサンプルファイル**の対応表。  
実装タスク書を生成する際は、各セクションに `> **参照ガイド:**` と `> **開くサンプル:**` を転記して、  
実装担当 AI が元のガイドを調べ直さずに作業できるようにする。

### 3-1. バックエンド実装

> **`mock/src/backend/_mzfw/` のライブラリファイルは、先頭のモジュールヘッダーコメントに関数仕様が記載されている。**  
> バックエンド実装前に下記の3ファイルのヘッダーを読むこと（本文コードは読まなくてよい）。
>
> | ファイル | 記載内容 |
> |---------|----------|
> | `mock/src/backend/_mzfw/baseRepository.ts` | BaseRepository 全メソッド一覧・引数・TX パターン |
> | `mock/src/backend/_mzfw/validations.ts` | バリデーション関数一覧・引数・enum 有効値（⚠️ 独自実装禁止） |
> | `mock/src/backend/_mzfw/message.ts` | getMessage キー書式・Locale 切替 |

| 実装対象 | 読む実装ガイド | 開くサンプルファイル |
|---------|-------------|-------------------|
| 型定義・Entity 拡張・dbConfig | `guides/impl/AI作成ガイド_実装_データモデル.md` | （ガイド内コード例を参照） |
| Repository: パターン A（業務データ） | `guides/impl/AI作成ガイド_実装_Repository.md` | `mock/src_ref/backend/repositories/dataRepository.ts` |
| Repository: パターン B（マスタ） | 同上 | `mock/src_ref/backend/repositories/masterRepository.ts` |
| Repository: パターン C（連動マスタ） | 同上 | `mock/src_ref/backend/repositories/subMasterRepository.ts` |
| Repository: パターン D（中間エンティティ） | 同上 | `mock/src_ref/backend/repositories/subDataRepository.ts` |
| Service: パターン A（単体エンティティ） | `guides/impl/AI作成ガイド_実装_Service.md` | `mock/src_ref/backend/services/referenceService.ts` |
| Service: パターン B（親子・コード連携） | 同上 | `mock/src_ref/backend/services/masterService.ts` |
| Service: パターン C（1:N サロゲートキー） | 同上 | `mock/src_ref/backend/services/subDataService.ts` |
| API 層 | `guides/impl/AI作成ガイド_実装_API.md` | `mock/src_ref/api/referenceApi.ts` |
| ルーティング・メニュー追記 | `guides/impl/AI作成ガイド_実装_ルーティング.md` | `mock/src/router/index.ts`（追記位置確認）<br>`mock/src/config/app.ts`（追記位置確認） |

### 3-2. UI 実装

| 画面区分 | 読む実装ガイド | 開くサンプルファイル |
|---------|-------------|-------------------|
| ❗ **全画面共通（必須）** | `guides/impl/AI作成ガイド_実装_画面共通.md` | なし |
| 一覧（通常） | `guides/impl/AI作成ガイド_実装_一覧.md` | `mock/src_ref/views/reference/list-normal/List.vue` |
| 一覧（参照） | 同上 | `mock/src_ref/views/reference/list-ref/List.vue`<br>`mock/src_ref/views/reference/list-ref/DetailDialog.vue` |
| 一覧（コンテキスト） | 同上 | `mock/src_ref/views/reference/list-context/ListParent.vue`<br>`mock/src_ref/views/reference/list-context/ListChild.vue`<br>`mock/src_ref/views/reference/list-context/EditDialog.vue` |
| 入力（基本） | `guides/impl/AI作成ガイド_実装_入力.md` | `mock/src_ref/views/reference/list-normal/EditDialog.vue` |
| 入力（親子） | 同上 | `mock/src_ref/views/reference/input-parent-child/EditDialog.vue` |
| 入力（親子一括） | 同上 | `mock/src_ref/views/reference/variants/parent-child-bulk/BulkEdit.vue` |
| 入力（親子選択） | 同上 | `mock/src_ref/views/reference/input-parent-child-select/EditDialog.vue` |
| 選択ダイアログ（単一選択） | `guides/impl/AI作成ガイド_実装_選択.md` | `mock/src_ref/views/reference/select/EditDialog.vue`<br>`mock/src_ref/views/reference/components/MasterSelectDialog.vue` |
| 選択ダイアログ（複数選択） | 同上 | `mock/src_ref/views/reference/select/EditDialog.vue`<br>`mock/src_ref/views/reference/components/MasterMultiSelectDialog.vue` |
| 一括編集画面 | `guides/impl/AI作成ガイド_実装_入力(一括).md` | `mock/src_ref/views/reference/input-bulk/BulkEdit.vue` |
| Excel対応（ダウンロード/アップロード） | `guides/impl/AI作成ガイド_実装_Excel対応.md` | `mock/src_ref/views/reference/variants/list-with-excel/List.vue`<br>`mock/src_ref/views/reference/variants/list-with-excel/EditDrawer.vue` |
| Tabulator（列数が多い一覧） | `guides/impl/AI作成ガイド_実装_Tabulator.md` | `mock/src_ref/views/reference/variants/list-ref-tabulator/List.vue` |
| Tabulator（Excelライク一括編集） | 同上 | `mock/src_ref/views/reference/variants/bulk-tabulator/BulkEdit.vue` |

---

## 4. バッチ分割ルール

### 4-1. 画面の 4 カテゴリ分類

業務仕様書の「画面一覧」を以下のカテゴリに分類する。

| カテゴリ | 判断基準 | 典型例 |
|---------|---------|-------|
| **A: 独立マスタ** | 入力方式＝基本 かつ 本プロジェクト内エンティティへの FK がない | 本部・車種・部品・領域 |
| **B: 従属マスタ** | 入力方式＝基本 かつ 本プロジェクト内の別エンティティを FK で参照する | 部門（本部FK）・課（部門FK） |
| **C: 基本親子型** | 入力方式＝親子 で 子テーブルが 1〜2 種類 | ステーション管理（設備子テーブル） |
| **D: 複合親子型** | 入力方式＝親子 で 子テーブルが 3 種類以上、または複数の中間テーブルを含む | 職場管理（ステーション＋車種関連＋部品関連＋領域関連） |

### 4-2. バッチ構成ルール

| バッチ | 含むカテゴリ | データモデル生成 |
|--------|-----------|----------------|
| **Batch 01** | 全エンティティのデータモデル ＋ カテゴリ A・B の全画面（A を先、B は依存の浅い順） | ✅ 全エンティティ分をここで完結させる |
| **Batch 02** | カテゴリ C | — |
| **Batch 03** | カテゴリ D | — |

**補足：**
- A と B は常に同一バッチにまとめる。順番だけを守ること（A→B、B は依存の浅い順）
- C・D の合計が 2 画面以下なら 1 バッチにまとめてよい
- **データモデル（型定義・DB 設定・Entity 拡張）は Batch 01 に全エンティティ分を生成する**（後のバッチで追加しない）

### 4-3. 小規模統合ルール（優先適用）

**全画面数が 4 以下**の場合は 1 バッチにまとめてよい（A→B→C/D の依存順に画面を並べること）。

### 4-4. 分割例

```
【小規模：全画面 4 以下】
Batch 01: データモデル（全エンティティ） + A → B → C/D の順（すべて 1 バッチ）

【標準規模：全画面 5 以上】
Batch 01: データモデル（全エンティティ） + A・B（A を先、B は依存の浅い順）
Batch 02: カテゴリ C
Batch 03: カテゴリ D
```

---

## 5. 実装タスク書のテンプレート構造

各バッチの実装タスク書は以下のセクションで構成する。

```
# {業務名} 実装タスク書 Batch {N:02}

## 0. 実装スコープ
## 1. 確認事項・追加依頼
## 2. 対象ファイル一覧
## 3. エンティティ定義　※ Batch 01 のみ
## 4. 初期データ投入  　※ Batch 01 のみ
## 5. バックエンド実装仕様
## 6. ルーティング定義
## 7. UI 実装仕様
```

---

## 6. 各セクションの記載ルール

### 6-1. セクション 0「実装スコープ」

本バッチ対象の画面名（業務仕様書の「画面一覧」から転記）を箇条書きで列挙する。

```markdown
- {画面名}
```

### 6-2. セクション 1「確認事項・追加依頼」

全仕様書の整合性をチェックし、不整合があれば箇条書きで記載する。TBD が存在しない場合は「特になし」と記載する。
また、追加依頼が記載された場合、対象ソースを修正後、タスク内の該当箇所に追記し、「特になし」と記載する。

### 6-3. セクション 2「対象ファイル一覧」

先頭に `### 利用ガイド` を置き、本バッチで使用するパターン・画面区分に対応したガイドを展開する。次いで生成・追記するファイルを**パスと用途のみ**リストアップする。内容は書かない。

```markdown
### 参照ファイル
| ファイル / ガイド | 用途 |
|-----------------|------|
| `mock/src/backend/_mzfw/baseRepository.ts` | ⚠️ **先頭ヘッダーを読む** — BaseRepository メソッド一覧・TX パターン |
| `mock/src/backend/_mzfw/validations.ts` | ⚠️ **先頭ヘッダーを読む** — バリデーション関数一覧・enum 有効値（独自実装禁止） |
| `guides/impl/AI作成ガイド_実装_画面共通.md` | 全 Vue 共通ルール（**必読**） |
| `guides/impl/AI作成ガイド_実装_データモデル.md` | 型定義・Entity・dbConfig（Batch 01 のみ） |
...

### 新規作成（create_file）
- `mock/src/types/{entity}.ts` — {エンティティ名}型定義
- `mock/src/backend/repositories/{entity}Repository.ts` — {エンティティ名}Repository
- `mock/src/backend/services/{entity}Service.ts` — {エンティティ名}Service
- `mock/src/api/{entity}Api.ts` — {エンティティ名}API
- `mock/src/views/{entity}/{Entity}List.vue` — {画面名}一覧
- `mock/src/views/{entity}/{Entity}EditDialog.vue` — {画面名}入力ダイアログ

### 追記（replace_string_in_file）
- `mock/src/backend/entities.ts` — {Entity}Entity 追記
- `mock/src/backend/dbConfig.ts` — {STORE_NAME} ストア追記・バージョン更新
- `mock/src/backend/services/setupService.ts` — setupXxx() 追記
- `mock/src/router/index.ts` — {画面名}ルート追記
- `mock/src/config/app.ts` — {画面名}メニュー追記
```

### 6-4. セクション 3「エンティティ定義」（Batch 01 のみ）

> 参照ガイド: `guides/impl/AI作成ガイド_実装_データモデル.md`

**全エンティティ分を記載する。** データ仕様書の各テーブルをそのまま転記し、Entity 名・ストア名を付与する。

```markdown
### {エンティティ論理名}（Entity 名: {Entity} / ストア名: {STORE_NAME}）

| 論理名 | 物理名 | 型 | 桁数 | 必須 | 説明 |
|--------|--------|-----|------|:----:|------|
| （データ仕様書からそのまま転記） |
```

---

### 6-5. セクション 4「初期データ投入」（Batch 01 のみ）

> 参照ガイド: `guides/impl/AI作成ガイド_実装_データモデル.md` § 5

`{*}_業務要件.md` またはデータ定義書にサンプルデータが記載されている場合はテーブル形式でそのまま転記する。記載がない場合は「サンプルデータ: なし（AI 生成）」と記載する。

```markdown
### {エンティティ論理名} サンプルデータ（{N}件）

| {フィールド1} | {フィールド2} | … |
|-------------|-------------|---|
| …           | …           |   |
```

---

### 6-6. セクション 5「バックエンド実装仕様」

エンティティごとに使用するパターン・バリデーション要件・削除制約を設計書から転記する。**コードは書かない。**

セクション先頭に「**パターン参照マップ**」を置く。本バッチで使用するパターンのみを記載し、開くべきサンプルファイルを一覧にまとめる。実装手順はそのファイルと各実装ガイドを参照すること。使用しないパターンの行は削除すること。

```markdown
### パターン参照マップ

| 区分 | パターン | 説明 | 開くサンプルファイル |
|-----|---------|-----|---------------------|
| Repository | A | 業務データ（ID管理なし） | `mock/src_ref/backend/repositories/dataRepository.ts` |
| Repository | B | 独立マスタ（FK なし） | `mock/src_ref/backend/repositories/masterRepository.ts` |
| Repository | C | 連動マスタ（FK あり） | `mock/src_ref/backend/repositories/subMasterRepository.ts` |
| Repository | D | 子データ・中間テーブル | `mock/src_ref/backend/repositories/subDataRepository.ts` |
| Service | A | 単体 CRUD（外部参照なし） | `mock/src_ref/backend/services/referenceService.ts` |
| Service | B | FK 参照・Options 取得あり | `mock/src_ref/backend/services/masterService.ts` |
| Service | C | 1:N 親子・saveWithChildren | `mock/src_ref/backend/services/subDataService.ts` |
| バリデーション | — | ⚠️ 独自実装禁止・使用可能関数一覧 | `mock/src/backend/_mzfw/validations.ts` |
| API | — | 全エンティティ共通 | `mock/src_ref/api/referenceApi.ts` |
```

エンティティ記載フォーマット:

```markdown
### {エンティティ名}

**Repository**
- パターン: {A/B/C/D}（{パターン説明}）
- findByConditions の検索フィールド（UI仕様書「入力項目定義（検索条件）」から転記）:

  | 項目名 | フィールド名（キャメルケース） | 一致方式 |
  |--------|------------------------------|---------|
  | {論理名} | {camelCase} | {部分一致 / 完全一致} |

- ソート順（UI仕様書「検索仕様ルール」から転記）: ...

**Service**
- パターン: {A/B/C}（{パターン説明}）
- バリデーション要件（UI仕様書「入力項目定義」から転記）:

  | 項目名 | フィールド名 | 必須 | 制約 |
  |--------|-------------|:----:|------|
  | {論理名} | {camelCase} | {Y/—} | {最大N文字 等} |

- 削除制約（UI仕様書「削除操作」から転記）: {制約内容 / なし}
- Options メソッド: {取得元マスタ名 / なし}

**API**
- メソッド: list / get / create / update / remove
  （親子構成の場合: saveWithChildren 等を追加）
```

### 6-7. セクション 6「ルーティング定義」

```markdown
| 画面名 | path | name | meta.title（UI仕様書の画面タイトルと完全一致） |
|--------|------|------|----------------------------------------------|
| {画面名} | /{path} | {Name}List | {タイトル} |

メニューグループ名: {業務仕様書のグループ名または業務名}
```

### 6-8. セクション 7「UI 実装指示」

画面ごとに必要な情報を設計書からそのまま転記する。**コードは書かない。**
セクション先頭に「**パターン参照マップ**」を置く。本バッチで使用する画面区分の行のみを記載し、使用しないパターンの行は削除すること。
```markdown
### パターン参照マップ

| 区分 | パターン | 説明 | 開くサンプルファイル |
|-----|---------|-----|---------------------|
| 一覧 | 通常 | 検索 + 一覧テーブル | `mock/src_ref/views/reference/list-normal/List.vue` |
| 一覧 | 参照 | 参照専用一覧 | `mock/src_ref/views/reference/list-ref/List.vue` |
| 一覧 | コンテキスト | 親子連動一覧 | `mock/src_ref/views/reference/list-context/ListParent.vue` |
| 入力 | 基本 | シンプルダイアログ | `mock/src_ref/views/reference/list-normal/EditDialog.vue` |
| 入力 | 親子 | 子テーブル付きダイアログ | `mock/src_ref/views/reference/input-parent-child/EditDialog.vue` |
| 入力 | 親子一括 | 一括編集 | `mock/src_ref/views/reference/variants/parent-child-bulk/BulkEdit.vue` |
| 入力 | 親子選択 | 選択付き親子ダイアログ | `mock/src_ref/views/reference/input-parent-child-select/EditDialog.vue` |
| 選択 | 単一 | 単一選択ダイアログ | `mock/src_ref/views/reference/components/MasterSelectDialog.vue` |
| 選択 | 複数 | 複数選択ダイアログ | `mock/src_ref/views/reference/components/MasterMultiSelectDialog.vue` |
| 一括編集 | — | 全件編集 | `mock/src_ref/views/reference/input-bulk/BulkEdit.vue` |
```

#### 一覧画面

```markdown
**{画面名}一覧**
- 区分 / パターン: 一覧 / {通常|参照|コンテキスト}
- ファイル: `mock/src/views/{entity}/{Entity}List.vue`

選択項目の取得（UI仕様書「選択項目の取得」から転記）:
...

検索条件（UI仕様書「入力項目定義（検索条件）」から転記）:
| 項目名 | UI部品 | 必須 | 入力制約 |

表示列（UI仕様書「表示項目定義」から転記）:
| 項目名 | UI部品 | 表示仕様 |

ソート順（UI仕様書「検索仕様ルール」から転記）: ...
```

#### 入力画面

```markdown
**{画面名}入力**
- 区分 / パターン: 入力 / {基本|親子|親子一括|親子選択}
- ファイル: `mock/src/views/{entity}/{Entity}EditDialog.vue`

選択項目の取得（UI仕様書「選択項目の取得」から転記）:
...

入力フォーム（UI仕様書「入力項目定義」から転記）:
> 必須・ビジネスロジック制約はセクション 5 Service テーブルに集約済。ここには UI 部品に設定する制約（maxlength・type・min/max 等）のみ記載する

| 項目名 | UI部品 | UI制約（maxlength 等） |

UI 状態切替ルール（UI仕様書「UI状態切替ルール」から転記）:
...

子テーブル（親子型の場合、UI仕様書「入力項目定義（{子エンティティ名}）」から転記）:
| 項目名 | UI部品 | UI制約（maxlength 等） |
```

---

## 7. 生成手順

1. **設計書を読む**
   - 業務仕様書 → 画面一覧・入力方式・エンティティ関係
   - データ仕様書 → 全エンティティのフィールド定義
   - UI仕様書群 → 各画面の検索条件・表示列・フォーム項目・バリデーション

2. **バッチ分割する**
   - 「4. バッチ分割ルール」に従い画面を A〜D に分類
   - バッチ数とスコープを決定

3. **実装タスク書を生成する**
   - Batch 01 から順に `{業務名}_実装タスク_{N:02}.md` を生成
   - 各セクションの内容は設計書からの**転記のみ**。推測・補完・コード生成は禁止
   - TBD が生じた場合は `TBD: {理由}` と明記して停止しユーザーに確認する

4. **ビルドエラーを修正する**
   - 実装タスク書に従ってソース生成後、`cd mock; npm run build` を実行する
   - エラーが出た場合は原因を特定して修正し、エラーなしになるまで繰り返す
