# 実装ガイド 画面共通ルール

**スコープ: Vue ファイル（`*.vue`）のみ。**  
一覧・入力・選択ダイアログ・一括編集のすべての画面タイプで共通するルールをまとめる。  
バックエンド（Service・Repository・API層・型定義）は `AI作成ガイド_実装_API.md`・`AI作成ガイド_実装_Service.md`・`AI作成ガイド_実装_Repository.md` を参照すること。

---

## 技術スタック

| 分類 | 技術 |
|------|------|
| UI フレームワーク | Vue 3（Composition API / `<script setup lang="ts">`） |
| UI コンポーネント | ElementPlus |
| 言語 | TypeScript |

---

## 禁止事項

- `axios` の直接 import（REST API 呼び出しは行わない）
- ElementPlus アイコンの個別 import（グローバル登録済みのため不要）
- `useI18n()` の使用（テキストは日本語で直書き）
- `el-form` の `:rules` 設定（クライアントバリデーションは行わない。全バリデーションは IndexedDB の Service 層で実施）
- `null` の使用（「値なし」は `undefined` で表現する）
- `el-input-number` の使用（数値入力は `el-input` + `:formatter` / `:parser` で実装する）

---

## mzfw 利用可能なもの一覧

`import { ... } from "mzfw"` で利用する。必要なものだけ import すること。

| 名前 | 種別 | 用途 |
|------|------|------|
| `Pagination` | コンポーネント | ページネーション |
| `handleBusinessError` | 関数 | バリデーションエラーをフォームフィールドにマップ（単一フォーム用） |
| `handleBulkBusinessError` | 関数 | バリデーションエラーを一括テーブルの各行にマップ（一括・子テーブル用） |
| `confirmMessageBox` | 関数 | 確認ダイアログ（`Promise<boolean>` を返す） |
| `TransactionType` | 定数 | `NONE / ADD / UPDATE / DELETE`（一括・親子編集用） |
| `formatDate` | 関数 | 日付を `YYYY/MM/DD` 形式で表示 |
| `formatNumber` | 関数 | 数値をカンマ区切りで表示 |
| `getLabel` | 関数 | 選択肢配列からラベル文字列を取得 |
| `getUserId` | 関数 | セッションからログインユーザーIDを取得 |
| `Excel` | オブジェクト | Excel ダウンロード/アップロード（Excel対応画面のみ） |

---

## CSS クラスルール

| クラス | 適用箇所 | 用途 |
|--------|----------|------|
| `screen-title` | `el-col` | 画面タイトル |
| `max-w-{X}px` | 最外 `div` | コンテナ幅制限（値は各画面ガイドを参照） |
| `numeric-input` | 数値 `el-input` | 右揃え |
| `icon-col` | `el-table-column` の `class-name` | テーブル先頭アイコン列の上下中央寄せ |
| `cell-required` | 必須フィールドの入力コンポーネント | 必須マーク表示 |
| `cell-error` | エラー発生時の入力コンポーネント | 赤枠表示 |
| `row-added` | 追加行の `el-table` 行 | 緑背景（一括・親子用） |
| `row-updated` | 更新行の `el-table` 行 | 黄背景（一括・親子用） |
| `row-deleted` | 削除行の `el-table` 行 | 赤背景（一括・親子用） |

---

## ElementPlus アイコンルール

アイコンはグローバル登録済みのため個別 import 不要。テンプレートで直接使用する。

| ボタン | アイコン名 |
|--------|-----------|
| 新規作成 | `DocumentAdd` |
| 変更（確定） | `DocumentChecked` |
| 一括保存 | `DocumentChecked` |
| 削除 | `Delete`（`type="danger"`） |
| 検索 | `Search` |
| クリア | `RefreshLeft` |
| キャンセル / 閉じる | `Close` |
| 編集（テーブルアイコン） | `Edit` |
| 詳細（テーブルアイコン） | `ZoomIn` |
| 行追加 | `Plus` |
| Excel ダウンロード | `Download` |
| Excel アップロード | `Upload` |

---

## ファイルコメントヘッダー形式

各 `.vue` ファイルの先頭（`<script setup>` の前）に以下のコメントブロックを入れる。

```vue
<!--
  ============================================================
  {画面の説明}（{画面区分}）
  ファイル名: {ディレクトリ/ファイル名}.vue
  対応するUI仕様書: UI仕様書_{画面ベース名}_{種別}.md
  ============================================================

  {画面構成・操作フローの説明（箇条書き）}

  実業務への置き換えポイント:
    {型名} → 実際の型名
    {apiName} → 実際の API オブジェクト名
  ============================================================
-->
```

`<script setup>` 内のセクション区切りは以下の形式を使う：

```typescript
// ─── セクション名 ──────────────────────────────
```

---

## テンプレート構造の共通パターン

### タイトル行

**すべての画面に共通。** `el-row` で左右2カラム構成。左は画面タイトル、右はボタン群。

```vue
<el-row>
  <el-col :xs="24" :sm="12" class="screen-title">
    {UI仕様書「画面タイトル」の値}
  </el-col>
  <el-col :xs="24" :sm="12" class="flex justify-end items-center gap-2">
    <!-- ボタン類 -->
  </el-col>
</el-row>
```

ボタンが不要な参照専用画面は `:sm="24"` にするか右カラムを省略する。

---

## ローディング制御

**すべての非同期処理で共通。** `ElLoading.service()` は `try` の直前で呼び、`finally` で必ず閉じる。

```typescript
import { ElLoading } from "element-plus";

const search = async () => {
  const loading = ElLoading.service();
  try {
    items.value = await someApi.list(searchDto.value);
  } finally {
    loading.close();
  }
};
```

- `try/catch` は不要（エラーは後述の `handleBusinessError` か上位に伝播させる）
- 複数の API 呼び出しをまとめる場合も `loading` は 1 つにまとめる

---

## メッセージ・確認ダイアログ

### ElMessage

| 用途 | 呼び方 |
|------|--------|
| 登録成功 | `ElMessage.success("登録しました")` |
| 更新成功 | `ElMessage.success("更新しました")` |
| 削除成功 | `ElMessage.success("削除しました")` |
| 保存成功（件数付き） | `ElMessage.success(\`${n} 件を保存しました\`)` |
| データ未発見 | `ElMessage.error("データが見つかりません")` |
| 未選択で確定 | `ElMessage.warning("1件以上を選択してください")` |
| 変更なし | `ElMessage.info("変更がありません")` |

### confirmMessageBox

`mzfw` からimport。`await` で `boolean` を受け取り、`false` なら早期リターン。

```typescript
import { confirmMessageBox } from "mzfw";

// 削除確認（全 EditDialog 共通）
if (!(await confirmMessageBox("削除します。よろしいですか？"))) return;

// 一括保存確認
if (!(await confirmMessageBox(`${dirtyRows.length} 件を保存します。よろしいですか？`))) return;

// 未保存ガード
const ok = await confirmMessageBox("未保存の変更があります。閉じますか？");
if (!ok) return;
```

---

## エラー表示パターン

**全入力フォームおよび一括テーブルで統一する。** `el-form-item :error` は使わず、以下のパターンに揃える。

```vue
<!-- テキスト・選择系: el-tooltip で直接ラップ -->
<el-tooltip :content="errors['{field}']" placement="top" :disabled="!errors['{field}']">
  <el-input v-model="form.{field}" :class="{ 'cell-error': errors['{field}'] }" />
</el-tooltip>

<!-- 日付: el-date-picker は el-tooltip を直接受け取れないため div でラップ -->
<el-tooltip :content="errors['{field}']" placement="top" :disabled="!errors['{field}']">
  <div :class="{ 'cell-error': errors['{field}'] }" style="width: 100%">
    <el-date-picker v-model="form.{field}" format="YYYY/MM/DD" style="width: 130px" />
  </div>
</el-tooltip>
```

- `errors` の型: `ref<Record<string, string | undefined>>({})`
- `handleBusinessError(error, errors.value)` がフィールド名をキーにエラーを自動セットし `ElMessage.error` でトースト表示する（入力ダイアログ用）
- `handleBulkBusinessError(error, dirtyRows, allRows)` が各行の `_errors` にエラーをセットし `ElMessage.error` でトースト表示する（一括・親子テーブル用）
- 入力ダイアログでは `watch(visible)` の先頭で毎回 `errors.value = {}` をリセットする
- **確認で処理を止める場合のみ `confirmMessageBox`（ダイアログ）を使う。エラー通知は常に `ElMessage.error`（トースト）で表示する**

---

## 入力方式 → Vue コンポーネント対応表

UI仕様書 › 入力項目定義に記載された「入力方式」ごとの使用コンポーネント。  
検索フォーム・編集フォーム・一括テーブルセルで共通。差分は下表の「備考」を参照。

| 入力方式 | コンポーネント | 必須 props |
|----------|--------------|-----------|
| テキスト | `el-input` | — |
| 数値 | `el-input` | `:formatter="formatNumber"` `:parser="(v: string) => v.replace(/[^0-9]/g, '').slice(0, 10)"` `class="numeric-input"` `style="width: 130px"` |
| 日付 | `el-date-picker` | `format="YYYY/MM/DD"` `style="width: 130px"` |
| 固定値選択 | `el-select` + `el-option` ループ | `style="width: 100%"` |
| マスタ参照選択 | `el-select` + `el-option` ループ | `style="width: 100%"` |
| 連動マスタ選択 | 同上 + `:disabled="!{親フィールド}"` | `style="width: 100%"` |
| フラグ | `el-checkbox` | `:model-value="form.{field} === 1"` `@update:model-value="(v: boolean) => (form.{field} = v ? 1 : 0)"` |
| テキストエリア | `el-input type="textarea"` | `:rows="4"` `show-word-limit` |

### フォーム種別ごとの差分

| 入力方式 | 検索フォーム（searchDto） | 編集フォーム（form） | 一括テーブルセル（row） |
|----------|--------------------------|---------------------|------------------------|
| 共通 | `clearable` を付ける | `clearable` を付ける | `size="small"` を付ける、`@change="markUpdated(row)"` |
| 数値 From-To | `<div class="flex gap-2 items-center">` でラップ、`<span>-</span>` を挟む | — | — |
| 日付 | `value-format="YYYY-MM-DD"`（文字列型）| `value-format` 省略（Date型） | `value-format="YYYY-MM-DD"` |
| フラグ | `:false-value="undefined"`（絞り込みなし） | `:false-value="0"` | `:false-value="0"` |

---

## テーブル列 → データ型別表示（一覧系共通）

すべての一覧画面の `el-table` 列定義に共通するルール。

| データ型 | 表示方法 | 付与する props |
|----------|----------|--------------|
| テキスト | `<el-table-column prop="{field}">` で直接表示 | — |
| 数値 | `template` 内で `formatNumber(row.{field})` | `align="right"` |
| 日付 | `template` 内で `formatDate(row.{field})` | — |
| 固定値 | `template` 内で `getLabel(options, row.{field})` | — |
| マスタ参照 | `template` 内で `row.{field}Name`（名称フィールドがある場合）、なければ `getLabel(options, row.{field})` | — |
| フラグ | `v-if="row.{field} === 1"` で `✓` を表示 | `align="center"` |
| テキストエリア | `row.{field}?.substring(0, 50) + (row.{field}?.length > 50 ? '…' : '')` | `class="whitespace-pre-wrap"` |

先頭列（アイコン列）の定義：

```vue
<!-- 通常一覧・入力: 編集アイコン -->
<el-table-column label="" width="35" class-name="icon-col">
  <template #default="{ row }">
    <el-icon style="cursor: pointer" @click="openDialog(row)"><Edit /></el-icon>
  </template>
</el-table-column>

<!-- 参照一覧: 詳細ボタン（編集なし） -->
<el-table-column label="" width="60">
  <template #default="{ row }">
    <el-button size="small" @click="openDialog(row)">詳細</el-button>
  </template>
</el-table-column>
```

---

## 選択肢取得パターン

取得元によって実装が変わる。

| 取得元 | 実装 |
|--------|------|
| 固定値 | `api.get{Select}Options()` を同期で呼ぶ（`await` 不要、`ElLoading` 不要） |
| マスタ参照 | `await api.get{Master}Options()` を非同期で呼ぶ |
| 連動マスタ | 上位フィールドを `watch` で監視、変更時に子フィールドをリセットしてから再取得 |

### 一覧画面（onMounted パターン）

```typescript
onMounted(async () => {
  await loadOptions();
  await search();
});

const loadOptions = async () => {
  const loading = ElLoading.service();
  try {
    selectOptions.value = api.getSelectOptions();        // 固定値（同期）
    masterOptions.value = await api.getMasterOptions(); // マスタ参照（非同期）
  } finally {
    loading.close();
  }
};

// 連動マスタ（検索条件の親フィールドが変わったら子をリセット）
watch(
  () => searchDto.value.masterValue,
  async (newVal) => {
    searchDto.value.linkedValue = undefined;
    linkedOptions.value = [];
    if (newVal) linkedOptions.value = await api.getLinkedOptions(newVal);
  },
);
```

### EditDialog / DetailDialog（watch visible パターン）

```typescript
watch(visible, async (newVal) => {
  if (!newVal) return;        // 閉じる時は何もしない
  errors.value = {};

  selectOptions.value = api.getSelectOptions();
  masterOptions.value = await api.getMasterOptions();

  if (isEditMode.value) {
    const data = await api.get(editId.value!).catch(() => null);
    if (!data) { ElMessage.error("データが見つかりません"); visible.value = false; return; }
    form.value = { ...data };
    if (data.masterValue) {
      linkedOptions.value = await api.getLinkedOptions(data.masterValue);
    }
  } else {
    form.value = emptyForm();
    linkedOptions.value = [];
  }
});

// 連動マスタ（フォーム内の親フィールドが変わったら子をリセット）
watch(
  () => form.value.masterValue,
  async (newVal) => {
    if (!newVal) { linkedOptions.value = []; form.value.linkedValue = ""; return; }
    linkedOptions.value = await api.getLinkedOptions(newVal);
    if (!linkedOptions.value.some((o) => o.value === form.value.linkedValue)) {
      form.value.linkedValue = "";
    }
  },
);
```

---

## 検索フィルタルール（一覧系共通）

UI仕様書 › 検索仕様ルールの記載を API 層のフィルタに変換する。

| 仕様書の記載 | api 層のフィルタ実装 |
|-------------|-------------------|
| 部分一致 | `item.{field}.includes(dto.{field})` |
| 前方一致 | `item.{field}.startsWith(dto.{field})` |
| 完全一致 | `item.{field} === dto.{field}` |
| 数値範囲（From-To） | `>= dto.{field}From` / `<= dto.{field}To` で比較 |
| 日付範囲（From-To） | 文字列 `YYYY-MM-DD` のまま辞書順で比較（`>=` / `<=`） |
| フラグ | `dto.{field}` が指定されている場合のみ `item.{field} === dto.{field}` |
