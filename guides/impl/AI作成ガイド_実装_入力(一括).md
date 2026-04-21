# 実装ガイド 入力画面（一括）

「入力（一括）」画面区分に対応する実装ルールを定義する。  
検索フォームと一括編集テーブルを **1つのファイル** に実装する。

---

## ⚠️ 必須参照ファイル（実装前に必ず開くこと）

| ファイル | 用途 |
|---------|-----|
| `mock/src_ref/views/reference/input-bulk/BulkEdit.vue` | 一括編集画面の正解コード |
| `mock/src_ref/backend/services/referenceService.ts` | saveAll パターンのサービス実装 |
| `mock/src_ref/api/referenceApi.ts` | saveAll の API 層実装 |

---

## 対応する UI 仕様書の画面区分

`画面区分: 入力（一括）`

---

## 作成ファイル

| ファイル | 内容 |
|---------|------|
| `mock/src/views/{entity}/{Entity}BulkEdit.vue` | 検索フォーム + 一括編集テーブルをもつ単一ファイル |
| `mock/src/backend/services/{entity}Service.ts` | 一括保存サービス（`saveAll` パターン → `AI作成ガイド_実装_Service.md` 参照） |
| `mock/src/api/{entity}Api.ts` | API 層（`AI作成ガイド_実装_API.md` 参照） |

> 一覧 + 入力の分割は**しない**。ルートも1つのみ（`path: "/{entity}/bulk"`）。

---

## 行状態管理の仕組み

各行に `transactionType` を付与し、一括保存時に変更行のみ送信する。  
拡張型 `EditRow = {Entity} & { transactionType: TransactionType; _errors?: Record<string, string> }` を定義する（サンプル参照）。

| `transactionType` | 意味 |
|-----------------|------|
| `TransactionType.NONE` | 変更なし（保存スキップ） |
| `TransactionType.ADD` | 追加行（新規作成） |
| `TransactionType.UPDATE` | 更新行（セル編集時に自動付与） |
| `TransactionType.DELETE` | 削除予定行（赤背景表示、一括保存時に削除） |

---

## 基本フロー

```
1. 初期表示   : onMounted → 選択肢取得 → 検索
2. 検索       : searchDto を API に渡して editRows を取得（transactionType = NONE）
3. インライン編集: セルを直接編集 → markUpdated(row) で transactionType = UPDATE を付与
4. 行追加     : [行追加] ボタン → 空行を push（transactionType = ADD）
5. 行削除     : [行削除] ボタン → トグル式（後述）
6. 一括保存   : transactionType !== NONE の行のみ api.saveAll() に送信
```

---

## UI仕様書 → 実装の対応表

### 「入力項目定義（検索条件）」→ 検索フォーム

一覧画面（`AI作成ガイド_実装_一覧.md`）の検索フォームと同じ実装方法を使う。  
選択肢の取得は `AI作成ガイド_実装_画面共通.md`「選択肢取得パターン - 一覧画面（onMounted パターン）」を参照。

---

### 「入力項目定義（一覧編集）」→ テーブル列

入力コンポーネントの選び方は `AI作成ガイド_実装_画面共通.md`「入力方式 → Vue コンポーネント対応表」を参照。  
一括テーブルは **差分列「一括テーブルセル」** のルールを適用する（`size="small"` + `@change="markUpdated(row)"`）。

**エラー表示は `el-tooltip` + `cell-error` クラスで統一する（`el-form-item :error` は使わない）。`el-tooltip` のテンプレート実装はサンプルを参照すること。**

**入力方式別の特記事項：**

| 入力方式 | 特記事項 |
|---------|---------|
| 日付（`el-date-picker`） | `el-tooltip` が直接受け取れないため `<div style="width: 100%">` でラップする |
| フラグ（`el-checkbox`） | `@change` は使えないため `@update:model-value="(v: boolean) => { row.{field} = v ? 1 : 0; markUpdated(row); }"` を使う |
| 連動マスタ選択 | 親列の `@change` に `onMasterChange(row)` を使い、`linkedOptionsMap[row.{parentField}]` から選択肢を取得する（後述） |

---

### 行操作

```typescript
// セル編集マーク（NONE → UPDATE に昇格）
const markUpdated = (row: EditRow) => {
  if (row.transactionType === TransactionType.NONE)
    row.transactionType = TransactionType.UPDATE;
  row._errors = undefined;  // 編集したらエラー表示をクリア
};

// 行追加
const addRow = () => {
  editRows.value.push({
    transactionType: TransactionType.ADD,
    {field1}: "",
    {field2}: undefined,
    version: 0,
    // UI仕様書「入力項目定義（一覧編集）」の全フィールドを列挙
  });
};

// 行削除トグル（ADD行は即時除去、それ以外は DELETE ↔ NONE の切替）
const deleteRow = (row: EditRow) => {
  if (row.transactionType === TransactionType.ADD) {
    editRows.value = editRows.value.filter((r) => r !== row);
  } else if (row.transactionType === TransactionType.DELETE) {
    row.transactionType = row.id ? TransactionType.NONE : TransactionType.ADD;
    row._errors = undefined;
  } else {
    row.transactionType = TransactionType.DELETE;
  }
};
```

削除/取消ボタン（テンプレート）：

```vue
<el-table-column label="" width="72" align="center">
  <template #default="{ row }">
    <el-button
      :type="row.transactionType === TransactionType.DELETE ? 'default' : 'danger'"
      :icon="row.transactionType === TransactionType.DELETE ? 'RefreshLeft' : 'Delete'"
      size="small" circle
      @click="deleteRow(row)" />
  </template>
</el-table-column>
```

---

### 連動マスタの行ごと選択肢管理

一覧画面の `watch(searchDto)` パターンとは異なり、行ごとに親フィールドが異なるため `linkedOptionsMap` でキャッシュする。

| ポイント | ルール |
|---------|-------|
| `linkedOptionsMap` | `Record<string, SelectOption[]>` 。親コードをキーにキャッシュする |
| `loadLinkedOptionsFor(parentCode)` | キャッシュ済みならスキップ。未取得なら API 呼び出してキャッシュ |
| 検索後 | 存在する `parentCode` を `Promise.all` で一括プリロードする |
| `onParentChange(row)` | `markUpdated(row)` → 子フィールドを空に → `loadLinkedOptionsFor` を呼び出す（サンプル参照） |

> 連動マスタがない場合はこのセクション全体を省略する。

---

### タイトル行と変更サマリ

- `hasDirty`: `editRows` に `transactionType !== NONE` の行が 1 件以上あれば `true`。[一括保存] ボタンの `:disabled="!hasDirty"` に使用する
- `dirtySummary`: 追加/更新/削除件数を `"追加:N件 / 更新:N件 / 削除:N件"` 形式で返す。タイトル行右に `text-orange-500` で表示（サンプル参照）

---

### 行スタイル

`el-table` の `:row-class-name` に関数を渡す。`transactionType` に応じて `row-deleted` / `row-added` / `row-updated` クラスを返す（サンプル参照）。

---

### 一括保存とエラーハンドリング

| ステップ | ルール |
|--------|-------|
| 確認 | `confirmMessageBox("N 件を保存します。よるしいですか？")` で確認する |
| `saveAll` 呈 | `transactionType !== NONE` の `dirtyRows` のみ投影する |
| 成功時 | `ElMessage.success("N 件を保存しました")` → `search()` で一覧を再取得 |
| エラー時 | `handleBulkBusinessError(error, dirtyRows, editRows.value)` で各行の `_errors` にセット。`ElMessage.error` でトースト表示される |

> **入力(親子)との違い**: 親子は `parentErrors` も渡して親フォームエラーをインライン表示できる。一括には親フォームがないため省略する。

---

### Pagination

- `el-table` の `:data` には `editRows`（全行）ではなく `pagedEditRows`（ページ済み）を渡す
- `Pagination :items="editRows" @update:pagedItems="pagedEditRows = $event"` で枥履き（テーブルより前に配置）

---

## ルーティング

一覧画面とは別の単独ルート。

```typescript
// mock/src/router/index.ts
{
  path: "/{entity}/bulk",
  name: "{Entity}BulkEdit",
  component: () => import("@/views/{entity}/{Entity}BulkEdit.vue"),
  meta: { title: "{画面タイトル}" },
},
```

---

## 注意事項

- `max-w-1600px` で全体を囲む（UI仕様書の指示を優先）
- `transactionType === NONE` の行は一括保存時にスキップする（`dirtyRows` に含めない）
- `Pagination` に渡すのは `editRows`（全件）。`pagedEditRows` は表示用のみ
- 削除行（DELETE）と新規行（ADD）のスタイルはそれぞれ `row-deleted` / `row-added` クラスで色付け
- フロントバリデーション（`:rules`）は設定しない。バリデーションはバックエンドのみ
- Service・API 層の実装（`saveAll` パターン等）は `AI作成ガイド_実装_Service.md`・`AI作成ガイド_実装_API.md` を参照すること

---

## サンプル参照

| ファイル | 参照先 |
|---------|--------|
| 画面コンポーネント | `mock/src_ref/views/reference/input-bulk/BulkEdit.vue` |
| Service | `mock/src_ref/backend/services/referenceService.ts` |
| Repository | `mock/src_ref/backend/repositories/dataRepository.ts` |
| API 層 | `mock/src_ref/api/referenceApi.ts` |
| 型定義 | `mock/src_ref/types/reference.ts` |
