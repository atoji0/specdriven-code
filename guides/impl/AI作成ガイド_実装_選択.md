# 実装ガイド 選択ダイアログ

入力フォーム内でプルダウンでは選択肢が多すぎるマスタを「ダイアログで検索・選択する」パターン。

---

## ⚠️ 必須参照ファイル（実装前に必ず開くこと）

| パターン | 開くべきサンプルファイル |
|---------|----------------------|
| 単一選択 / 複数選択（フォーム側） | `mock/src_ref/views/reference/select/EditDialog.vue` |
| 単一選択ダイアログ（コンポーネント本体） | `mock/src_ref/views/reference/components/MasterSelectDialog.vue` |
| 複数選択ダイアログ（コンポーネント本体） | `mock/src_ref/views/reference/components/MasterMultiSelectDialog.vue` |

---

## 1. パターンの選び方

| パターン | 判断基準 |
|---------|---------|
| 単一選択 | フォームの1フィールドに対して **1件** 選ぶ場合 |
| 複数選択 | フォームのセクションに対して **複数件** 選んで紐付ける場合 |

同一フォームに両方を混在させることができる（`select/EditDialog.vue` 参照）。

---

## 2. 単一選択（MasterSelectDialog）

### コンポーネント API

| 項目 | 内容 |
|------|------|
| `ref` 経由の `open()` | ダイアログを開く |
| `@selected="(item: Master) => ..."` | 行クリック時に発火。引数は選択した `Master` オブジェクト |
| 確定方法 | **行クリックで即確定**（確定ボタンなし） |
| フッター | [閉じる] のみ |

### 実装のポイント

| 項目 | ルール |
|------|-------|
| フォームへの保存値 | `form.{field}` には `item.code`（文字列）を保存する。`item.id`（サロゲートキー）は保存しない |
| 表示用テキスト | `selectedXxxLabel` ref に `"code　name"` 形式でセット |
| ラベル復元（編集モード） | `watch(visible)` 内で全件取得 or `getByCode()` API で code から name を検索し復元する |
| クリア処理 | `clearXxx()` で `form.{field}` と `selectedXxxLabel` を両方 `""` にリセットする |
| 連動フィールド | 選択変更時・クリア時に連動フィールドも必ずリセットする |
| エラー表示 | `cell-error` クラスは `el-input` 単体ではなく、外側の `div` ラッパーに付与する |
| `MasterSelectDialog` の配置 | `el-dialog` の**外側**（`<template>` 直下）に配置する |

---

## 3. 複数選択（MasterMultiSelectDialog）

### コンポーネント API

| 項目 | 内容 |
|------|------|
| `ref` 経由の `open()` | ダイアログを開く |
| `@selected="(items: Master[]) => ..."` | [選択して閉じる] 押下時に発火。引数は選択した `Master[]` |
| 確定方法 | チェックボックス選択 → **[選択して閉じる]** ボタン |
| フッター | [選択して閉じる]（バッジ付き）、[キャンセル] |
| 再選択 | ダイアログを開き直すと選択状態はリセットされる（追記型） |

### 実装のポイント

| 項目 | ルール |
|------|-------|
| 選択済みリスト | `selectedXxxItems` ref（`Master[]`）で管理する |
| 表示方式 | 選択済み一覧を `el-tag` で表示 → `closable` で個別削除 |
| 重複排除 | `@selected` ハンドラ内で `existingIds` Set を作り、同一 `id` の追加を防ぐ |
| 保存値 | `selectedXxxItems.value.map(m => m.id!)` で id 配列に変換して API に渡す |
| 初期化（編集モード） | `watch(visible)` の編集モードブランチで保存済み子データを `selectedXxxItems` に復元する |
| `MasterMultiSelectDialog` の配置 | `el-drawer` / `el-dialog` の**外側**（`<template>` 直下）に配置する |

---

## 4. 一覧テーブルでの表示

選択済みの子データを一覧列で表示する場合は `el-tag` でループ表示する。  
実装例は `select/EditDialog.vue` の List.vue 側を参照。

---

## 注意事項

| 項目 | ルール |
|------|-------|
| フォームへの保存値（単一） | `item.code` を保存する。`item.id` は保存しない |
| フォームへの保存値（複数） | `item.id` の配列を保存する（中間テーブルで結合するため） |
| バリデーション | 「1件以上選択必須」は `save()` 内でチェックし `errors['xxxItems']` にセットする |
