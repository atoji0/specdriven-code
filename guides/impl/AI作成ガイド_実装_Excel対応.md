# 実装ガイド Excel対応

一覧画面に Excel ダウンロード / アップロードを追加する拡張パターンの実装ルールを定義する。

**前提**: `AI作成ガイド_実装_画面共通.md`・`AI作成ガイド_実装_一覧.md` を参照済みであること。

---

## ⚠️ 必須参照ファイル（実装前に必ず開くこと）

| ファイル | 用途 |
|---------|-----|
| `mock/src_ref/views/reference/variants/list-with-excel/List.vue` | Excel対応一覧の正解コード |
| `mock/src_ref/views/reference/variants/list-with-excel/EditDrawer.vue` | Drawer版入力フォームの正解コード |

---

## Excel対応を選ぶ判断基準

UI仕様書の「操作」に以下の記載がある場合に適用する。

- Excelダウンロード（テンプレート出力・データ出力）
- Excelアップロード（一括登録・更新・削除）

インライン編集による一括更新が主目的の場合は、代わりに `AI作成ガイド_実装_入力(一括).md` または `AI作成ガイド_実装_Tabulator.md` を検討する。

---

## 対応する画面区分

`画面区分: 一覧（通常）` の亜種（検索フォーム + 一覧 + Excel操作をセットで実装する）

---

## 基本構成

```
一覧（通常）の構成  +  Excel ダウンロードボタン
                    +  Excel アップロードボタン（el-upload）
                    +  入力ダイアログ（EditDrawer または EditDialog）
```

入力ダイアログは `el-dialog` の代わりに `el-drawer`（右スライド60%）を使うことが多い。  
`EditDrawer.vue` は `EditDialog.vue` と同一ロジックで `el-dialog` を `el-drawer` に変えただけ（サンプル参照）。

---

## インポート

`import { Pagination, Excel, formatDate, formatNumber, getLabel } from "mzfw"` および `import type { ExcelColumnDefinition } from "mzfw"` を使用する。

---

## Excel 列定義

`ExcelColumnDefinition<{Entity}Excel>[]` で定義する。

| プロパティ | 説明 | 例 |
|----------|------|-----|
| `key` | エンティティのフィールド名 | `"codeValue"` |
| `label` | Excel ヘッダで表示する文字列 | `"コード"` |
| `width` | 列幅（半角文字数目安） | `15` |
| `hidden: true` | Excel 対象列だがユーザーには見せない | `id`、`version` に適用 |

**列順序の必須ルール:**

| 位置 | フィールド | 備考 |
|------|---------|-----|
| 先頭 | `transactionType` | `A=追加 / U=更新 / D=削除` |
| 2列目 | `id` | `hidden: true`（更新・削除時の識別用） |
| 3列目以降 | 業務フィールド | 仕様書の順に並べる |
| 最終列の前 | `version` | `hidden: true`（楽観ロック用） |

`errorMessage` は `generateExcelTemplate` が自動付与するため列定義に含めない。  
`ERROR_COL = excelColumns.filter(c => !c.hidden).length + 1`。

---

## Excel ダウンロード

1. `ElLoading.service()` でロード開始
2. `items.value` を一行当たり配列に変換する。列順序は `excelColumns` の定義に従う（1-based）
3. 日付は `formatDate()` で文字列変換する。数値はそのまま（Excel 側でカンマ表示）
4. `Excel.generateExcelTemplate(excelColumns, "{シート名}")` でテンプレート生成
5. `Excel.saveExcel(workbook, worksheet, rows, "{ファイル名}.xlsx")` でダウンロード

具体的な実装はサンプルを参照すること。

---

## Excel アップロード

1. `Excel.loadExcelFile(t, file)` で xlsx を解析し `{ workbook, rows }` を取得
2. `uploadKey.value++` で `el-upload` をリセット（同一ファイルの再選択を可能にする）
3. `rows` を `map` して型変換する。日付セルは ExcelJS が `Date` オブジェクトで返すので `new Date(row.getCell(N).value)` でキャスト（文字列で保持する場合は `formatDate()` で変換）。数値は `Number(row.getCell(N).value)`
4. `transactionType` が `""` の行は `filter` で除外（空行スキップ）
5. `api.saveAll(data)` で処理（バリデーションはバックエンドで実施）
6. エラー時: `Excel.exportExcelErrors(wb, ws, rows, error, ERROR_COL, "{ファイル名}_errors.xlsx")` でエラー付き xlsx をダウンロード

具体的な実装はサンプルを参照すること。

---

## テンプレートの el-upload

| プロパティ | 値 | 理由 |
|--------|-----|-----|
| `:key="uploadKey"` | `ref(0)` のインクリメント | 同一ファイルの再選択を可能にする |
| `:auto-upload="false"` | — | 自動送信無効（手動ハンドラで処理） |
| `:show-file-list="false"` | — | ファイルリストを非表示 |
| `accept=".xlsx"` | — | xlsx のみ受け付ける |

---

## mzfw Excel API

| 関数 | 説明 |
|------|------|
| `Excel.generateExcelTemplate(columns, sheetName)` | 列定義に従ってヘッダー付きテンプレートを生成。`{ workbook, worksheet }` を返す |
| `Excel.saveExcel(wb, ws, rows, filename)` | データ行を書き込んでファイルをダウンロード |
| `Excel.loadExcelFile(t, file)` | アップロードされた xlsx を解析。`{ workbook, rows }` を返す |
| `Excel.exportExcelErrors(wb, ws, rows, error, errorCol, filename)` | エラー内容を最終列に書き込んでダウンロード |
| `Excel.excelDateToISO(value)` | Excel の日付シリアル値を `YYYY-MM-DD` 文字列に変換 |

---

## アップロード処理方針

- `transactionType` が空の行はスキップ（`filter` で除外）
- バリデーションはすべてバックエンド（`api.saveAll()`）が行う
- エラーが発生したら `exportExcelErrors` でエラー列付き xlsx をダウンロードさせる（ロールバック）
- 正常終了後は `search()` で一覧を再取得する

---

## EditDrawer（入力サイドパネル）

Excel対応の一覧では `el-dialog` の代わりに `el-drawer`（右スライド60%）を使うことが多い。  
`EditDrawer.vue` は `EditDialog.vue` と同一ロジックで `el-dialog` を `el-drawer` に変えただけ。  
キー属性: `size="60%"` / `direction="rtl"` / `:close-on-click-modal="false"`（サンプル参照）。

---

## 注意事項

- `uploadKey` を `ref(0)` で管理し、アップロードのたびに `++` してリセットする（同一ファイルの再選択を可能にするため）
- Excel の日付セルは `Excel.excelDateToISO()` で ISO 文字列に変換する（直接 `String()` しない）
- `saveAll` は `入力（一括）` の Service と同じ実装を流用できる
- エラー出力する Excel は入力ファイルと同じ列構成にし、最終列にエラーメッセージを追記する

---

## サンプル参照

| ファイル | 参照先 |
|---------|--------|
| 一覧（Excel対応） | `mock/src_ref/views/reference/variants/list-with-excel/List.vue` |
| 入力（Drawer版） | `mock/src_ref/views/reference/variants/list-with-excel/EditDrawer.vue` |
