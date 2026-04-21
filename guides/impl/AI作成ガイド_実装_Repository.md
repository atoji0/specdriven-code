# 実装ガイド Repository

データ定義書・UI仕様書を入力として、IndexedDB のデータアクセス層（Repository）を生成するルールを定義する。

**本ガイドの対象**: Repository クラス（1ストア単位）  
**対象外**: Service / API層 / UI実装（それぞれ専用ガイドを参照）

---

## ⚠️ 作業前に必ず読むこと

- `BaseRepository<{Entity}Entity>` を継承し、**業務固有メソッドのみ**追加する
- `import` は3行: ①ドメイン型（+ 検索条件型）、②Entity型、③`BaseRepository`
- `storeName` は `dbConfig.ts` で定義したストア名と**完全一致**させる
- **BaseRepository のメソッド一覧・引数・TX パターンは `mock/src/backend/_mzfw/baseRepository.ts` のモジュールヘッダーを参照**
- 実装パターンを選んだら、下表のサンプルファイルを**開いて読んでから**実装を開始すること

---

## 1. パターン選択と追加メソッド

**判断基準**: 1ストアの操作は Repository、複数ストアをまたぐ操作・バリデーションは Service。

| パターン | 対象 | サンプルファイル | 追加するメソッド |
|---------|------|----------------|---------------|
| **A: 業務データ** | メインデータ | `mock/src_ref/backend/repositories/dataRepository.ts` | `findByConditions` + `findBy{CodeField}` ＋ 参照整合チェック用 `findBy{FK}` （必要な場合） |
| **B: マスタ** | 参照用・選択肢取得 | `mock/src_ref/backend/repositories/masterRepository.ts` | `findAll()`（code 昇順）+ `findByCode()` |
| **C: 連動マスタ** | 親コードで絞り込む子マスタ | `mock/src_ref/backend/repositories/subMasterRepository.ts` | `findByMasterCode(masterCode)` + `findByCode()` |
| **D: 中間エンティティ** | サロゲートキーで親子紐づけ | `mock/src_ref/backend/repositories/subDataRepository.ts` | `findByDataId(parentId)` + `findAll()` ※差分保存は Service の責務 |

---

## 2. findByConditions の一致方式

UI仕様書の検索条件をそのまま実装する。検索条件型（`{Entity}Search`）は UI仕様書参照時に実装する。  
ソートは `findMany` の第2引数に配列で渡す。UI仕様書のデフォルトソート順に従う。

| 検索項目の種別 | 一致方式 | 実装イメージ |
|-------------|---------|------------|
| テキスト（名称・説明） | 部分一致 | `!item.name.includes(cond.name)` |
| コード（半角英数字） | 部分一致・大文字小文字無視 | `!item.code.toLowerCase().includes(cond.code.toLowerCase())` |
| 選択（固定値・マスタ参照） | 完全一致 | `item.type !== cond.type` |
| 外部キー（ID参照） | 完全一致 | `item.siteId !== cond.siteId` |
| 数値・金額（範囲） | FromTo（片側省略可） | `numericValue` のパターンを参照 |
| 日付（範囲） | FromTo（片側省略可・`toISOString().slice(0,10)` 文字列比較） | `dateValue` のパターンを参照 |
| フラグ | 完全一致（`undefined` = 全件） | `cond.isActive !== undefined && item.isActive !== cond.isActive` |

> コード例: `mock/src_ref/backend/repositories/dataRepository.ts` の `findByConditions` を参照
