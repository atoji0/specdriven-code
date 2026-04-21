# 実装ガイド API

UI レイヤー（Vue）とバックエンド（Service）を橋渡しする API 層の実装ルールを定義する。

**本ガイドの対象**: API オブジェクト（`src/api/{xxx}Api.ts`）  
**生成ファイル**: `mock/src/api/{entity}Api.ts`  
**対象外**: Service / Repository / Vue 実装（それぞれ専用ガイドを参照）

---

## 1. 役割と責務

API 層は以下の責務**だけ**を持つ。バリデーション・トランザクション制御は Service に委ねる。

| 責務 | API | Service |
|------|-----|---------|
| Service 呼び出し | ✅ | — |
| `validationErrors` → `BusinessError` 変換 | ✅ | — |
| 型の re-export（複合型） | ✅ | — |
| バリデーション・参照整合性チェック | — | ✅ |
| トランザクション制御 | — | ✅ |

---

## 2. ファイル命名・配置

```
src/api/{entity}Api.ts
```

- エンティティ名は UpperCamelCase + `Api` サフィックス
- 例: `referenceApi.ts`、`masterApi.ts`、`projectPlanApi.ts`
- 複数エンティティを扱う場合は**主となるエンティティ名**を使う（例: `masterApi.ts` が親マスタ・子マスタ両方を担当）

---

## 3. 基本構造・コメント規則

- `import` 順: Service → BusinessError → 型 → SelectOption → TransactionType
- 各メソッドの JSDoc に `Java移行時: GET/POST/... /api/{パス}` を必ず記載する

```typescript
/** 一覧取得 / Java移行時: GET /api/project-plans?planCode=xxx&... */
list: async (query?: ProjectPlanSearch): Promise<ProjectPlan[]> => {
  return service.findByConditions(query ?? {});
},

/** 単件取得 / Java移行時: GET /api/project-plans/:id */
get: async (id: number): Promise<ProjectPlan> => {
  const result = await service.findById(id);
  if (!result) throw new Error("データが見つかりません");
  return result;
},

/** 新規作成 / Java移行時: POST /api/project-plans */
create: async (data: ProjectPlan): Promise<ProjectPlan> => {
  try {
    return await service.create(data);
  } catch (error: any) {
    if (error?.validationErrors) throw new BusinessError(error.validationErrors);
    throw error;
  }
},
```

→ 完全な構造は `mock/src_ref/api/referenceApi.ts` を参照。

---

## 4. 命名規則

API オブジェクト内のメソッド名は以下のルールで統一する。

**基本原則**:
- エンティティ名は含めない。変数名 `projectPlanApi.xxx` がコンテキストを持つため。
- 親子・複数エンティティを扱うメソッドは対象が分かる語を付与する。

### 標準 CRUD

| 操作 | メソッド名 | シグネチャ例 |
|------|-----------|------------|
| 一覧取得（検索付き） | `list` | `list(query?: {Entity}Search): Promise<{Entity}[]>` |
| 単件取得 | `get` | `get(id: number): Promise<{Entity}>` |
| 新規作成 | `create` | `create(data: {Entity}): Promise<{Entity}>` |
| 更新 | `update` | `update(id: number, data: {Entity}): Promise<{Entity}>` |
| 削除 | `remove` | `remove(id: number, version: number): Promise<void>` |
| 一括保存 | `saveAll` | `saveAll(rows: ({Entity} & { transactionType: TransactionType })[]): Promise<void>` |

### 親子構成・複数エンティティ

| 操作 | メソッド名 | 説明 |
|------|-----------|------|
| 子込み全件取得 | `listWithChildren` | 子を埋め込んで返す |
| 子一覧取得 | `listChildren` | `listChildren(parentCode: string)` |
| 親削除（子を cascade） | `remove` | エンティティ名を付けない |
| 親一括保存 | `saveAll` | |
| 親子 1 トランザクション保存 | `saveWithChildren` | `saveWithChildren(parent, childRows)` |

### 1:N サロゲートキー

| 操作 | メソッド名 | 説明 |
|------|-----------|------|
| 一覧取得（JOIN済み） | `list` | |
| 単件取得（JOIN済み） | `get` | |
| 参照先マスタ検索 | `search{Ref}` | 例: `searchMasters` |
| 新規/更新一元保存 | `save` | 新規・更新を区別しない |
| 削除 | `remove` | |

### 選択肢

| 操作 | メソッド名 |
|------|-----------|
| 固定値選択肢（同期） | `get{Xxx}Options` |
| マスタ参照選択肢（非同期） | `get{Xxx}Options` |
| 連動マスタ選択肢（非同期・引数あり） | `get{Xxx}Options` |

> 同期か非同期かは戻り値の型（`SelectOption[]` vs `Promise<SelectOption[]>`）で判別し、メソッド名は統一する。

---

## 5. BusinessError ラッピング

バリデーションエラーを返しうるすべての書き込み操作で以下のパターンを使う。

```typescript
try {
  await service.someOperation(...);
} catch (error: any) {
  if (error?.validationErrors) throw new BusinessError(error.validationErrors);
  throw error;
}
```

**try-catch が不要なケース**（Service が `validationErrors` を throw しない）:

- 取得系: `list` / `get` / `listWithChildren` / `listChildren`
- 選択肢: `get{Xxx}Options`
- 参照先マスタ検索: `search{Ref}`

---

## 6. 型の re-export

API ファイルで定義した複合型は API ファイルから re-export する。  
Vue 側は API ファイルから型をインポートすることで、Service / Repository の内部変更の影響を受けない。

```typescript
// masterApi.ts
export type MasterWithSubs = Master & { subMasters: SubMaster[] };

// Vue 側
import type { MasterWithSubs } from "@/api/masterApi";
```


