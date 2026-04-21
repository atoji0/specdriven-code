# 実装ガイド Tabulator

`el-table` の代わりに `Tabulator` を使う拡張パターンの実装ルールを定義する。

**前提**: 基本の一覧・一括ガイドを参照済みであること。

---

## ⚠️ 必須参照ファイル（実装前に必ず開くこと）

| ファイル | 用途 |
|---------|-----|
| `mock/src_ref/views/reference/variants/list-ref-tabulator/List.vue` | 参照一覧 + Tabulator の正解コード |
| `mock/src_ref/views/reference/variants/bulk-tabulator/BulkEdit.vue` | 一括編集 + Tabulator の正解コード |

---

## Tabulator を選ぶ判断基準

| 状況 | 推奨コンポーネント |
|------|-----------------|
| 通常の一覧・一括（列数が少ない・固定幅で十分） | `el-table`（標準） |
| **列数が多い・列幅をドラッグ調整したい** | **Tabulator（参照版）** |
| **大量行をExcelライクにインライン編集したい** | **Tabulator（一括編集版）** |
| Excel アップロードによる一括編集 | el-table + Excel対応（`AI作成ガイド_実装_Excel対応.md` 参照） |

---

## 対応する画面区分

| 用途 | 画面区分 |
|------|---------|
| 編集なし・高速スクロール・列幅調整 | `一覧（参照）` の Tabulator 版 |
| インライン一括編集（transactionType 管理） | `入力（一括）` の Tabulator 版 |

---

## el-table との主な違い

| 項目 | el-table 版 | Tabulator 版 |
|------|------------|-------------|
| テーブル定義 | `<el-table-column>` タグ | `columns: ColumnDefinition[]` オブジェクト配列 |
| セル編集 | `<el-input>` 等のコンポーネントを埋め込む | Tabulator の `editor` プロパティ（`"input"` / `"list"` / `"date"` 等） |
| 行スタイル | `:row-class-name` | `rowFormatter` で `row.getElement().classList` を操作 |
| ページング | `<Pagination>` コンポーネント | **なし（Tabulator の `height` 固定でスクロール）** |
| エラー表示 | `:class="{ 'cell-error': ... }"` | `data-error` 属性で CSS が自動適用 |

---

## インポート

```typescript
import { TabulatorFull as Tabulator } from "tabulator-tables";
import type { ColumnDefinition, CellComponent } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";
```

---

## テーブル初期化パターン

- `<div ref="tableRef" />` をテンプレートに置く
- `onUnmounted` で必ず `tabulator?.destroy()` を呼ぶ
- **必須オプション:**
  - `layout: "fitDataFill"` — 列内容に合わせて幅調整
  - `height: "400px"` — 固定高さでスクロール（Pagination 不要）
  - `keybindings: { navNext: false, navPrev: false }` — Tabキーによる未レンダリングセルクラッシュ防止
  - `rowFormatter: applyRowClass` — transactionType に応じた行クラス
- 検索後 is `initTabulator()` で再初期化する（`data` を引数に渡さぺ、`editRows.value` を参照させる）

---

## 列定義パターン

### テキスト（編集あり）
```typescript
{ title: "名称", field: "nameValue", editor: "input", minWidth: 160 }
```

### 固定値選択（編集あり）
```typescript
{
  title: "区分", field: "selectValue", editor: "list",
  editorParams: { values: toValues(selectOptions.value), clearable: true },
  formatter: "lookup",
  formatterParams: toValues(selectOptions.value),
  width: 120,
}
// toValues: Option[] → { "value": "label" } に変換するヘルパー
const toValues = (opts: Option[]) =>
  Object.fromEntries(opts.map((o) => [String(o.value), o.label]));
```

### 数値（右揃え・編集あり）
```typescript
{ title: "数値", field: "numericValue", editor: "number", hozAlign: "right", width: 110 }
```

### 日付（編集あり）
```typescript
{ title: "日付", field: "dateValue", editor: "date",
  editorParams: { format: "YYYY-MM-DD" }, width: 120 }
```

### ボタン列（編集なし）
```typescript
{
  title: "", field: "", width: 60, hozAlign: "center", headerSort: false, editable: false,
  formatter: () => `<el-button>詳細</el-button>`,
  cellClick: (_e, cell) => openDialog((cell.getData() as ReferenceData).id!),
}
```

---

## 行の状態管理（一括編集版）

- `rowFormatter: applyRowClass` で `transactionType` に応じた行 CSSクラス（`row-added` / `row-updated` / `row-deleted`）を付与する
- `cellEdited` コールバックで、`transactionType === NONE` の行を `UPDATE` に変更し、`cell.getRow().reformat()` で行色を式に反映する
- `editRows.value` への参照更新も `cellEdited` 内で同時に行う（Tabulator の `data` と Vue の ref を同期する）

---

## 連動マスタの選択肢（一括編集版）

行ごとに異なるマスタを選択するため、`linkedOptionsMap` で各 masterValue の選択肢をキャッシュする。

- `loadLinkedOptionsFor(masterCode)` でキャッシュ済みならスキップ、未取得なら API で取得
- 検索後に `Promise.all` で一括プリフェッチする
- 列定義の `editorParams` を関数座席にする（`() => toValues(linkedOptionsMap.value[cell.getData().masterValue] ?? [])`）

---

## エラー表示

Tabulator では `data-error` 属性で CSS が自動適用される（mzfw の CSS 定義による）。

- `el-table` と異なり `handleBulkBusinessError` は **Tabulator 行に直接適用できない**ため、手動でエラーを展開する
- `error.errors` をループして `err.line` が `null` でない行を `dirtyTabulatorRows[err.line - 1]` でマッピング  
- 各行の `data._errors` にセットしたあと `setRowErrors(row, ...)` で Tabulator の `data-error` 属性を付与
- ループ後に `ElMessage.error("N 件の入力エラーがあります")` でトースト通知
- `err.line == null` のグローバルエラーも同様に `ElMessage.error(msg)` で表示する

---

## 注意事項

- `onUnmounted` で必ず `tabulator?.destroy()` を呼ぶ
- Tabulator の `data` には `editRows.value`（ref の中身）を渡す。検索後は `initTabulator()` で再初期化する
- `keybindings: { navNext: false, navPrev: false }` を必ず設定する（未レンダリングセルへの Tab 移動でクラッシュするため）
- ページング（`<Pagination>`）は使わない。`height` 固定でスクロール
- Tab キーの代わりに Enter キーやマウスでセルを移動するようユーザーに案内する

---

## サンプル参照

| ファイル | 参照先 |
|---------|--------|
| 参照一覧 + Tabulator | `mock/src_ref/views/reference/variants/list-ref-tabulator/List.vue` |
| 一括編集 + Tabulator | `mock/src_ref/views/reference/variants/bulk-tabulator/BulkEdit.vue` |
