# 実装ガイド Service

UI仕様書・データ定義書を入力として、ビジネスロジック層（Service）を生成するルールを定義する。

**本ガイドの対象**: Service クラス（バリデーション・取得・CRUD・トランザクション制御）  
**対象外**: Repository / API層 / UI実装（それぞれ専用ガイドを参照）

---

## ⚠️ 必須参照ファイル（作業開始前に必ず読むこと）

**このガイドはルールのみを記載している。コード例はサンプルファイルが正とする。**  
実装パターンを選択したら、対応するサンプルファイルを**開いて読んでから**実装を開始すること。

| パターン | 必ず読むファイル | 主な実装内容 |
|---------|---------------|------------|
| **A: 単体エンティティ** | `mock/src_ref/backend/services/referenceService.ts` | 取得・名称解決・選択肢・CRUD・saveAll・validate |
| **B: 親子エンティティ（コード連携）** | `mock/src_ref/backend/services/masterService.ts` | deleteParent・saveAll・saveWithChildren・全削除ガード・validateParent/Child |
| **C: 1:N サロゲートキー** | `mock/src_ref/backend/services/subDataService.ts` | 1トランザクション save/delete・マスタ検索 |
| バリデーション関数の仕様 | `mock/src_ref/backend/_mzfw/validations.ts` | 全バリデーション関数のパラメータ定義 |

---

## 1. 責務分担ルール

| 処理 | Service | Repository |
|------|---------|-----------|
| バリデーション（単項目・相関） | ✅ | — |
| コード重複チェック | ✅（Repository.findBy〇〇 を呼ぶ） | — |
| 参照整合性チェック（削除前の使用確認） | ✅ | — |
| 名称解決（JOIN相当） | ✅（複数 Repository を組み合わせる） | — |
| 選択肢取得（定数／マスタ変換） | ✅ | — |
| 親子まとめ保存・差分反映 | ✅ | — |
| トランザクション制御 | ✅（`getDbPublic()` で DB 取得） | — |
| 1ストアへの単純 CRUD | — | ✅ |

**判断基準**: 1ストアなら Repository。複数ストアや業務判定が絡む場合は Service。

---

## 2. 命名規則

### メソッド名

| 種別 | メソッド名 | 備考 |
|------|-----------|------|
| 一覧検索 | `findByConditions(query: {Entity}Search)` | |
| 1件取得 | `findById(id: number)` | |
| 全件取得（マスタ用） | `findAll()` | |
| 子込み全件取得 | `findAllWithChildren()` | |
| 子込み1件取得 | `findByIdWithChildren(id: number)` | |
| 選択肢取得（固定値・同期） | `get{Xxx}Options(): SelectOption[]` | |
| 選択肢取得（マスタ参照・非同期） | `get{Xxx}Options(): Promise<SelectOption[]>` | |
| 新規作成 | `create(data: {Entity})` | |
| 更新 | `update(id: number, data: {Entity})` | |
| 削除 | `delete(id: number, version: number)` | |
| 1:N トランザクション保存 | `save(data: {Entity}, childIds: number[])` | 新規・更新を統合 |
| 一括保存 | `saveAll(rows: ({Entity} & { transactionType: TransactionType })[])` | |
| バリデーション（private） | `private async validate(data: {Entity}, transactionType: TransactionType)` | |
| 親子構成のバリデーション（private） | `private async validateParent(data, transactionType)` / `private async validateChild(data, transactionType)` | |

### currentUser について

Service メソッドには `currentUser` 引数を**追加しない**こと。  
`BaseRepository` が `create` / `update` 内部で自動的にログインユーザーを取得・設定する。  
既存コードに `currentUser` 引数が残っている場合は削除して揃えること。

### エラーのスロー規則

バリデーションエラーは必ず `{ validationErrors: ValidationError[] }` 形式でスローする。  
API 層・Vue 層はこの形式を前提にエラーを受け取る。

```typescript
throw { validationErrors: [{ field: "code", message: "コードは必須です" }] };
```

---

## 3. 基本構造

- `import` 順序: 型 → Repository → `ValidationError` → バリデーション関数 → 定数 → `SelectOption` → `TransactionType`
- メソッドのグループ順: 取得 → 選択肢取得 → CRUD → `private validate`

> コード例: `mock/src_ref/backend/services/referenceService.ts` のクラス宣言・import 構造を参照

---

## 4. パターン A: 単体エンティティ

1～2 Repository のみを使う標準パターン。

**実装するメソッド**:
- `findByConditions` — 名称解決（`Map` で JOIN相当）は **このメソッドのみ** で行う。`findById` は名称解決不要。
- `get{Xxx}Options` — 固定値は同期、マスタ参照は非同期
- `create / update / delete` — `validate(data, TransactionType.xxx)` を呼ぶだけ。存在確認・重複チェックのロジックを個別に書かない
- `saveAll` — Phase1: 全行バリデーション（書き込みなし）→ Phase2: `repo.beginTx()` + `applyAllInTx` で1トランザクション書き込み

> サンプル: `mock/src_ref/backend/services/referenceService.ts`

---

## 5. パターン B: 親子エンティティ（コード連携）

親テーブルと子テーブルを**コード**で紐づけるパターン（`masterCode` 等）。  
親と子の CRUD は**別メソッド**で管理する。削除は参照整合性を必ず確認する。

**実装するメソッド**:
- `findAllWithChildren` — 親一覧 + 子を `findByMasterCode` で取得してまとめる
- `deleteParent` — 子レコードの存在チェック（参照整合性）を `validateParent` で確認してから削除
- `saveAll` — 親のみの一括保存（パターン A の `saveAll` と同じ2フェーズ構成。`validateParent` を使用）
- `saveWithChildren` — 親・子を **1トランザクション** で保存。全削除ガード（子が1件も残らない場合はエラー）を `Phase1` に含める
  - `db.transaction(["store_a", "store_b"], "readwrite")` のストア名は `dbConfig.ts` と完全一致させること

> サンプル: `mock/src_ref/backend/services/masterService.ts`

---

## 6. パターン C: 1:N サロゲートキー（1トランザクション保存）

親テーブルと中間テーブルを**サロゲートキー（id）**で紐づけるパターン。  
コード変更で参照データが壊れないため、変化の多い業務に向いている。

**ルール**:
- 親の新規/更新 + 中間テーブルの全置換を **1つの IndexedDB トランザクション** で行う
- `db.transaction(["store_a", "store_b"], "readwrite")` のストア名は `dbConfig.ts` の `stores[].name` と**完全一致**させる
- `getDbPublic()` は Repository インスタンスを通じて取得する（直接 `getDb()` を呼ばない）
- 中間テーブルの更新は「既存を全削除 → 再登録」のパターン（差分管理しない）
- `save` の楽観的ロック（`version` 不一致）は `dataStore.get` + 手動チェックで行う（`validateRecordExists` は使わない）

> サンプル: `mock/src_ref/backend/services/subDataService.ts`

---

## 7. バリデーション（`validate` private メソッド）

バリデーション関数は **「単項目チェック（7-A）」** と **「レコードチェック（7-B）」** の2種類に分かれる。
`validate` が DELETE / UPDATE / ADD の全パターンを包括する。
CRUD 各メソッドは `validate` を呼ぶだけでよく、個別に存在確認・重複チェックのロジックを書かない。

### ⚠️ バリデーションの大原則（必ず守ること）

**1. 単一項目のエラーはメッセージに項目名を入れない**

単項目のエラーはその項目の入力欄に直接表示される。メッセージが「どの項目か」を説明する必要はない。  
**複数項目にまたがるエラー**（複合キー重複など）はメッセージに項目名を含めてよい。

| ❌ 禁止（単一項目なのに名称を入れた独自メッセージ） | ✅ 正しい（関数の戻り値をそのまま使う） |
|--------------------------------------------------|--------------------------------------|
| `"〇〇は必須です"` | `validateReferenceExists(...)` の戻り値 |
| `"この〇〇コードはすでに使用されています"` | `validateExists(...)` の戻り値 |
| `"指定された〇〇情報が存在しません"` | `validateReferenceExists(...)` の戻り値 |
| `"この〇〇は使用されているため削除できません"` | `validateLinkedRecord(...)` の戻り値 |
| ✅ 許可（複数項目にまたがる場合） | `validateExistsComposite({ ..., keys: ["年度", "部門コード"] })` の戻り値 |

**2. 共通関数が存在する処理は必ず共通関数を使う**

下表のチェックに対応する共通関数が存在する。これらを `if` 文で手書きしてはいけない。  
共通関数でカバーされない業務固有チェックは `if` 文で書いてよい。

| ❌ 禁止（共通関数があるのに手書き） | ✅ 正しい（共通関数を使う） |
|----------------------------------|--------------------------|
| `if (!record) errors.push({ ..., message: "..." })` | `validateReferenceExists({ record })` |
| `if (records.length > 0) errors.push({ ..., message: "..." })` | `validateLinkedRecord({ records })` |
| `if (data.xxx === null) errors.push({ ..., message: "..." })` | `validateText({ ..., required: true })` |

**全関数共通の呼び出しパターン:**

```typescript
const xxxMsg = validateXxx({ ... });
if (xxxMsg) errors.push({ field: "fieldName", message: xxxMsg });
```

---

### 7-A. 単項目チェック（制約 → 関数 変換表）

#### ⚠️ enum の有効値（この値以外は使用禁止。存在しない値は TypeScript エラーになる）

| enum | 有効な値 |
|------|---------|
| `ValidationRange` | `None` / `Between` / `Min` / `Max` |
| `ValidationCharType` | `AsciiDigitsOnly` / `AsciiSignedDigits` / `AsciiUppercaseLetters` / `AsciiUppercaseAlphanumeric` / `AsciiLetters` / `AsciiAlphanumeric` / `AsciiAlphanumericSpace` / `AsciiAlphanumericHyphen` / `AsciiAlphanumericUnderscore` / `AsciiAlphanumericHyphenUnderscore` / `AsciiPrintable` / `AsciiAlphanumericHalfKana` / `AsciiOrHalfKana` / `FullWidthOnly` / `Hiragana` / `Katakana` / `HiraganaOrKatakana` |

> 固定桁（例: 2桁ちょうど）は `ValidationRange.Between` + `minLength=maxLength=N` で表現する。`Fixed` は存在しない。

UI仕様書「入力項目定義」の制約から使用する関数を選ぶ。呼び出しは上記の共通パターンで統一。

| UI仕様書の制約 | 使用する関数 | パラメータのポイント | 生成されるメッセージ（ja） |
|-------------|------------|-----------------|------------------------|
| テキスト・必須 | `validateText` | `required: true` | 「入力必須です」 |
| テキスト・固定N桁 | `validateText` | `ValidationRange.Between`, `minLength=maxLength=N` | 「N文字で入力してください」 |
| テキスト・N桁以上M桁以下 | `validateText` | `ValidationRange.Between`, `minLength=N`, `maxLength=M` | 「N文字以上M文字以下で入力してください」 |
| テキスト・最大N桁 | `validateText` | `ValidationRange.Max`, `maxLength=N` | 「N文字以内で入力してください」 |
| テキスト・文字種 | `validateText` | `validationCharType: ValidationCharType.Xxx` | 「半角英数字で入力してください」等（enum値に対応） |
| 整数値・範囲 | `validateIntegerRange` | `ValidationRange.Between/Min/Max`, `minValue`, `maxValue` | 「N以上M以下の値を入力してください」等 |
| 整数値・桁数チェック（Text型） | `validateInteger` | `required`, `maxDigit` | 「整数で入力してください」／「N文字以内で入力してください」 |
| 小数値・範囲 | `validateDecimalRange` | `minValue`, `maxValue`, `integerDigit`, `decimalDigit` | 「N以上M以下の値を入力してください」／「整数部N桁・小数部M桁以内で入力してください」 |
| 日付・必須/任意 | `validateDateRange` | `required`, `validationRangeId`, `minValue?`, `maxValue?` | 「入力必須です」／「N以降の日付を入力してください」等 |
| 日付・相関チェック（開始 ≤ 終了） | `validateDateConsistency` | `fromDate`, `toDate`, `fromDateColumn?` | 「〔fromDateColumn〕以降の日付を入力してください」 |
| 時刻（HH:MM:SS） | `validateTime` | `value`, `required` | 「時刻はHH:MM:SS形式で入力してください」 |
| 時刻（HH:MM） | `validateTimeHM` | `value`, `required` | 「時刻はHH:MM形式で入力してください」 |
| 選択・固定値 | `validateOption` | `selectOptions: OPTIONS.map(o => String(o.value))` | 「入力必須です」／「選択肢から選択してください」 |
| カスタム正規表現 | `validateRegularExpression` | `customRegularExp`, `customMessage` | customMessage の値がそのまま表示される |
---

### 7-B. レコードチェック（DB照会結果を検証・タイミング厳守）

> ⚠️ **メッセージを自分で書いてはいけない。**  
> 下表の関数は戻り値として標準メッセージを返す。`errors.push({ field: "...", message: xxxMsg })` の `message` は**必ず関数の戻り値**を使うこと。  
> `"この〇〇はすでに使用されています"` のような独自文言を直書きすることは**禁止**。

| チェック内容 | 使用する関数 | タイミング | 生成されるメッセージ（ja） |
|------------|------------|----------|------------------------|
| 存在確認 ＋ 楽観ロック | `validateRecordExists` | UPDATE / DELETE の**冒頭**で必ず実施 | 「対象のデータが見つかりません」／「他のユーザーによって更新されています。最新データを確認してください」 |
| 参照整合性チェック（削除不可） | `validateLinkedRecord` | DELETE 時、`validateRecordExists` 通過後に実施 | 「既に使用されているため、削除できません」 |
| 入力値の参照先存在チェック | `validateReferenceExists` | ADD/UPDATE 時、単項目チェック通過後に実施（外部キー入力欄の値がマスタに存在するか確認） | 「指定されたデータが存在しません」 |
| コード重複チェック（単一キー） | `validateExists` | ADD 時、単項目チェックが通った後に実施 | 「すでに登録されています」 |
| コード重複チェック（複合キー） | `validateExistsComposite` | 同上（`keys` に項目名を必須で渡す） | 「〇〇、△△の組み合わせはすでに登録されています」 |

```typescript
// UPDATE/DELETE 冒頭
const recordMsg = validateRecordExists({ record: existing, expectedVersion: data.version });
if (recordMsg) { errors.push({ field: "codeField", message: recordMsg }); return errors; }

// DELETE 時の参照整合性
const linked = await this.otherRepo.findByXxx(existing!.code);
const linkedMsg = validateLinkedRecord({ records: linked });
if (linkedMsg) errors.push({ field: "codeField", message: linkedMsg });

// ADD 時の重複チェック（単一キー）
const dup = await this.repo.findByCode(data.code);
const dupMsg = validateExists({ record: dup });
if (dupMsg) errors.push({ field: "code", message: dupMsg });

// ADD 時の重複チェック（複合キー）
const dup = await this.repo.findByYearAndDept(data.fiscalYear, data.deptCode);
const dupMsg = validateExistsComposite({ record: dup, keys: ["年度", "部門コード"] });
if (dupMsg) errors.push({ field: "fiscalYear", message: dupMsg });

// ADD/UPDATE 時の参照先存在チェック（外部キー入力欄の値がマスタに存在するか）
const ref = await this.masterRepo.findByCode(data.masterCode);
const refMsg = validateReferenceExists({ record: ref });
if (refMsg) errors.push({ field: "masterCode", message: refMsg });
// ※ 相関チェック（親子一致確認など業務固有の条件）はカスタムメッセージのままでよい
```
