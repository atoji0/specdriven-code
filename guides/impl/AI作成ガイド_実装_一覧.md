# 実装ガイド 一覧画面

---

## ⚠️ 必須参照ファイル（実装前に必ず開くこと）

| 画面区分 | 開くべきサンプルファイル |
|---------|----------------------|
| 一覧（通常） | `mock/src_ref/views/reference/list-normal/List.vue` |
| 一覧（参照） | `mock/src_ref/views/reference/list-ref/List.vue`<br>`mock/src_ref/views/reference/list-ref/DetailDialog.vue` |
| 一覧（コンテキスト） | `mock/src_ref/views/reference/list-context/ListParent.vue`<br>`mock/src_ref/views/reference/list-context/ListChild.vue`<br>`mock/src_ref/views/reference/list-context/EditDialog.vue` |

---

## 1. 画面区分の選び方

| 画面区分 | 判断基準 |
|---------|---------|
| 一覧（通常） | **CRUD操作あり**。EditDialog とセットで使う標準パターン |
| 一覧（参照） | **参照専用**。新規作成・変更・削除は提供しない |
| 一覧（コンテキスト） | **区分を先に選んでからデータを表示する2画面構成**。区分ごとにデータが分離している場合 |

---

## 2. 共通ルール（全一覧画面）

実装の詳細ルール・コンポーネント対応表は `AI作成ガイド_実装_画面共通.md` を参照。  
以下は一覧画面に固有の補足ルール。

### 検索フォームのルール

- `searchDto` のフィールド型は `AI作成ガイド_実装_画面共通.md`「入力方式 → Vue コンポーネント対応表」の `searchDto フィールド型` を参照
- `label-width` の目安: 4文字=80px / 6文字=110px / 8文字=130px
- `el-form :model="searchDto" label-width="{X}px"` で囲む
- 数値・日付の From-To は `<div class="flex gap-2 items-center">` でラップし `<span>-</span>` を挟む
- 日付は `class="flex-1"` `style="width: auto"` を付ける

### 一覧テーブルのルール

- `el-table` の `:data` には `pagedItems` を渡す（`items` ではない）
- `Pagination` はテーブルより前に配置し `@update:pagedItems="pagedItems = $event"` で受け取る
- `el-collapse` には `model-value="search"` / `model-value="result"` を付けて常時展開にする
- 編集アイコン列は先頭（左端）に `label="" width="35" class-name="icon-col"` で配置する（`label="操作"` の右固定列は不可）
- `getLabel(options, value)` でラベル表示する（`options.find(...)` 独自関数は不可）
- `@saved="search"` で直接つなぐ（`reload` 中継関数は不要）

---

## 3. 一覧（参照）固有ルール

| 機能 | 一覧（通常）と異なる点 |
|------|---------------------|
| ボタン | 新規作成ボタンなし。タイトル右カラムは省略可 |
| 先頭列 | 編集アイコン（`Edit`）の代わりに `[詳細]` ボタン（`size="small"`、`width="60"`） |
| ダイアログ | `EditDialog` の代わりに `DetailDialog`（全項目 `:disabled="true"`、フッターは `[閉じる]` のみ） |
| 基盤層 | 既存の API を流用することが多い（Service/Repository 新規作成は不要な場合あり） |

`DetailDialog.vue` の open() シグネチャ: `open(id: number)` → `watch(visible)` でデータ取得。

---

## 4. 一覧（コンテキスト）固有ルール

### 2画面の役割分担

```
ListParent.vue ─ [一覧表示] ─→ ListChild.vue ─ [行アイコン] ─→ EditDialog.vue
（区分選択: el-select）        （一覧 + 検索）               （入力(基本)と同一）
```

### ListParent のポイント

- 固定値選択肢を `api.getSelectOptions()` で同期取得
- `[一覧表示]` ボタン押下で `router.push({ path: "/{entity}/list", query: { {contextField}: selectedValue } })`
- 未選択時は `[一覧表示]` ボタンを `:disabled="!selectedValue"` で非活性

### ListChild のポイント

- `useRoute().query.{contextField}` でコンテキスト値を受け取る。`String()` でキャストすること
- 検索時はコンテキスト値を必ず適用する（`api.list({ {contextField}: {contextField}.value })`）
- 新規作成ダイアログを開く際はコンテキスト値をフォームの初期値として渡す

### ルーティング

ListParent と ListChild は別ルートで定義する（入れ子にしない）。

| 画面 | パス |
|------|------|
| ListParent（区分選択） | `/{entity}` |
| ListChild（データ一覧） | `/{entity}/list` |

---

## 注意事項

- `clear()` では `searchDto.value = {}` と連動マスタの選択肢 (`linkedOptions.value = []`) を同時にリセットする
- 検索ボタンは `type="primary" icon="Search"`、クリアボタンは `icon="RefreshLeft"` を必ず付ける
- `el-divider class="my-0"` で検索条件エリアと結果エリアの間に区切り線を入れる
- `el-collapse-item` の `title` は `<template #title><b>...</b></template>` で記述する（Bold が効かないため）
- ローディングは `ElLoading.service()` のみ使用する（`v-loading` や `ref(false)` の局所変数は不可）
