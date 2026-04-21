# 実装ガイド 入力画面

---

## ⚠️ 必須参照ファイル（実装前に必ず開くこと）

| 画面区分 | 開くべきサンプルファイル |
|---------|----------------------|
| 入力（基本） | `mock/src_ref/views/reference/list-normal/EditDialog.vue` |
| 入力（親子） | `mock/src_ref/views/reference/input-parent-child/EditDialog.vue` |
| 入力（親子一括） | `mock/src_ref/views/reference/variants/parent-child-bulk/BulkEdit.vue` |
| 入力（親子選択） | `mock/src_ref/views/reference/input-parent-child-select/EditDialog.vue` |

---

## 1. 画面区分の選び方

| 画面区分 | 判断基準 |
|---------|---------|
| 入力（基本） | 単一エンティティをフォームで新規/変更/削除する標準パターン |
| 入力（親子） | 親エンティティと子明細を1つのダイアログで一括保存する |
| 入力（親子一括） | 親マスタ一括インライン編集 + 親行選択で子マスタが切り替わる2テーブル構成 |
| 入力（親子選択） | データ自体は単一だが、関連付けるマスタを検索テーブルで選択する（N:M中間テーブル） |

---

## 2. 共通ルール（全入力画面）

### フォームルール（ダイアログ固有）

> エラー表示パターン（`el-tooltip` + `cell-error`）・`null` 禁止・バリデーション禁止は画面共通ガイドを参照。

- `watch(visible)` 内で毎回 `errors.value = {}` をリセットする
- `el-dialog` には `:close-on-click-modal="false"` を付ける
- `emit` のイベント名は `"saved"` で統一する

### emptyForm の初期値

| 入力方式 | emptyForm の初期値 |
|---|---|
| テキスト / 固定値選択 / マスタ参照 / 連動マスタ | `{field}: ""` |
| 数値 / テキストエリア | `{field}: undefined` |
| 日付 | `{field}: new Date()` |
| フラグ | `{field}: 0`（または `1`） |
| version | `version: 0` |

### 選択肢取得のタイミング

| 画面区分 | 取得タイミング | 理由 |
|---------|-------------|------|
| 入力（基本） | `watch(visible)` | open() は id のみ受け取り、データ取得が非同期のため |
| 入力（親子） | `open()` の先頭 | 一覧がデータを保持しており open() 引数として渡す。非同期取得不要 |
| 入力（親子一括） | `onMounted` | ページロード時に全データを取得 |
| 入力（親子選択） | `watch(visible)` | 入力（基本）と同様 |

### CRUD 基本パターン

- `create` / `update` は `try/catch` で囲み、`catch` は後述のパターンでエラーを処理する
- `remove` は `confirmMessageBox("削除します。よろしいですか？")` で確認後に実行
- 成功時: `ElMessage.success(...)` → `emit("saved")` → `close()`

#### エラーハンドリング

**入力（基本）・入力（親子選択）**: 親エラーのみのため `handleBusinessError` を使う。

```typescript
} catch (err) {
  handleBusinessError(err, errors.value);
}
```

**入力（親子）**: 親エラー（`line` なし）と子エラー（`line` あり）が同時に発生しうるため、`handleBulkBusinessError` に `parentErrors` を渡して **1 呼び出しで両方を処理**する。

```typescript
import { handleBulkBusinessError } from "mzfw";

// ── 親フォームのエラー格納（事前に既知フィールドをキーとして宣言しておく） ──
// キーに一致する line なしエラー → 赤枠インライン表示
// キーに含まれない line なしエラー → `ElMessage.error` でトースト表示
const parentErrors = ref<Record<string, string | undefined>>({ code: undefined, name: undefined });

} catch (err) {
  const dirtySubRows = subRows.value.filter((r) => r.transactionType !== TransactionType.NONE);
  handleBulkBusinessError(
    err,
    [{ dirtyRows: dirtySubRows, allRows: subRows.value }],
    parentErrors.value,
  );
}
```

> **N 子テーブル対応**: rowGroups に複数要素を渡せば子テーブルを N 個扱える。
> その場合、サーバーは `column = "0"` / `"1"` でどのグループの行エラーかを示す。

---

## 3. 入力（基本）固有ルール

### モード判定

```
open(null) → 新規モード（isEditMode = false）
open(id)   → 変更モード（isEditMode = true）
```

- `const isEditMode = computed(() => editId.value !== null)`
- 更新モードでコード項目を読み取り専用にする場合: `:disabled="isEditMode"`
- ダイアログ幅は原則 `600px`。項目数が多い場合は `1200px` まで

---

## 4. 入力（親子）固有ルール

### 入力（基本）との違い

| 比較項目 | 入力（基本） | 入力（親子） |
|---------|------------|------------|
| open() 引数 | `id: number \| null` | `master: ParentWithChildren \| null` |
| モード判定 | `isEditMode = editId !== null` | `isNew = !dialogForm.value.id` |
| データ取得 | `watch(visible)` 内で非同期取得 | `open()` 引数として渡される |
| 選択肢取得 | `watch(visible)` | `open()` の先頭で同期取得 |

### 子テーブルの拡張型

```typescript
type {Child}EditRow = {Child} & {
  transactionType: TransactionType;   // NONE / ADD / UPDATE / DELETE の enum
  _errors?: Record<string, string>;   // handleBulkBusinessError が自動セット
};
```

### parentErrors の事前宣言

宣言済みキー → `handleBulkBusinessError` がフォーム項目と認識して赤枚表示。  
未宣言キー → `ElMessage.error` でトースト表示される。  
UI仕様書「入力項目定義」の全フィールドを `{ {field}: undefined }` で列挙すること。

### 子テーブルの rowClass

`trasactionType` に応じて `row-added` / `row-updated` / `row-deleted` クラスを付与する。  
`:row-class-name` に関数を渡して制御する（サンプル参照）。

---

## 5. 入力（親子一括）固有ルール

### 入力（親子）との違い

| 比較項目 | 入力（親子） | 入力（親子一括） |
|---------|------------|----------------|
| 親の編集方式 | ダイアログ内フォーム | **インライン一括編集テーブル** |
| 子の編集方式 | ダイアログ内明細 | **親行選択 → 子テーブルが切り替わる** |
| 保存タイミング | ダイアログごとに保存 | **[一括保存] で変更行をまとめて保存** |

### 親行選択 → 子テーブル切替

```
selectMaster(row) → hasSubDirty ならば confirmMessageBox → loadSubMasters(row.id)
```

未保存の変更がある場合は確認ダイアログを表示してから切り替える。

### 親・子は独立した [一括保存] ボタン

親の保存と子の保存は**別ボタン**として実装する。同時保存しない。

---

## 6. 入力（親子選択）固有ルール

### データ構造

```
DataEntity  ←── SubData (dataId, masterId)  ──→  MasterEntity
```

- メインエンティティ（Data）: 直接編集対象のレコード
- 選択先マスタ（Master）: 検索して選択する既存マスタ。変更しない
- 中間テーブル（SubData）: Data と Master を結びつける N:M の中間テーブル

### 検索テーブルと selectedIds

- 検索条件フォームは `searchDto` として管理し、[検索] ボタンで `api.search{Masters}` を呼ぶ
- 選択列は先頭列に `el-checkbox` を配置し、`v-model="selectedIds"` に配列を渡して複数選択管理
- 保存時は `selectedIds` の配列をそのまま API に渡す（中間テーブルの一括置換）
- `watch(visible)` で毎回 `errors.value = {}` と `searchResults.value = []` をリセットする

---

## 注意事項

- `version` フィールドがある型では `emptyForm()` に `version: 0` を含めること
- Service・API 層の実装は `AI作成ガイド_実装_Service.md`・`AI作成ガイド_実装_API.md` を参照
- `入力（親子一括）` の Service は `saveAll` パターンを使う（`AI作成ガイド_実装_Service.md` 参照）
- `入力（親子選択）` の IndexedDB トランザクションは `tx.done` で完了を待つこと
