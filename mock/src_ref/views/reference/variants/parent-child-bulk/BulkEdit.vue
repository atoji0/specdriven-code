<!--
  ============================================================
  親子マスタメンテ画面（画面区分: 入力（一括））
  ファイル名: variants/parent-child-bulk/BulkEdit.vue
  対応するUI仕様書: UI仕様書_＜画面ベース名＞_入力.md（画面区分: 入力（親子一括））
  ============================================================

  親マスタ（Master）と子マスタ（SubMaster）を一括で編集する画面。

  操作フロー:
    1. 画面ロード → 親マスタ一覧を表示
    2. 親マスタをインライン編集 → 「一括保存」で保存
    3. 親マスタ行の「子マスタ」ボタンをクリック → 子マスタ一覧を表示
    4. 子マスタをインライン編集（コード・名称・区分）→「一括保存」で保存

  実業務への置き換えポイント:
    Master / SubMaster → 実際の親子エンティティ名
    masterApi → 実際の API オブジェクト名
    SubMasterSelectOptions の定義をバックエンド側で差し替え
  ============================================================
-->
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElLoading, ElMessage } from "element-plus";
import { handleBulkBusinessError, confirmMessageBox, TransactionType, Pagination } from "mzfw";
import type { Master } from "@/types/master";
import type { SubMaster } from "@/types/subMaster";
import { masterApi } from "@/api/masterApi";
import type { SelectOption } from "mzfw";

// ─── 拡張型 ──────────────────────────────────
type MasterEditRow = Master & {
  transactionType: TransactionType;
  _errors?: Record<string, string | undefined>;
};
type SubMasterEditRow = SubMaster & {
  transactionType: TransactionType;
  _errors?: Record<string, string | undefined>;
};

// ─── 親マスタ状態 ─────────────────────────────
const masterRows = ref<MasterEditRow[]>([]);const pagedMasterRows = ref<MasterEditRow[]>([]);const selectedMaster = ref<MasterEditRow | null>(null);
// ─── 親マスタ 検索条件 ─────────────────────────
const searchCode = ref("");
const searchName = ref("");

const filteredMasterRows = computed(() =>
  masterRows.value.filter((m) => {
    const codeMatch = !searchCode.value || m.code.includes(searchCode.value);
    const nameMatch = !searchName.value || m.name.includes(searchName.value);
    return codeMatch && nameMatch;
  }),
);

const clearMasterSearch = async () => {
  if (hasMasterDirty.value || hasSubDirty.value) {
    const ok = await confirmMessageBox("未保存の変更があります。変更を破棄してクリアしますか？");
    if (!ok) return;
  }
  searchCode.value = "";
  searchName.value = "";
  selectedMaster.value = null;
  subMasterRows.value = [];
  await loadMasters();
};
// ─── 子マスタ状態 ─────────────────────────────
const subMasterRows = ref<SubMasterEditRow[]>([]);
const subSelectOptions = ref<SelectOption[]>([]);

// ─── dirty 判定 ──────────────────────────────
const hasMasterDirty = computed(() =>
  masterRows.value.some((r) => r.transactionType !== TransactionType.NONE),
);
const hasSubDirty = computed(() =>
  subMasterRows.value.some((r) => r.transactionType !== TransactionType.NONE),
);

// ─── 変更行サマリ ────────────────────────────
const masterSummary = computed(() => buildSummary(masterRows.value));
const subSummary = computed(() => buildSummary(subMasterRows.value));

const buildSummary = (rows: { transactionType: TransactionType }[]) => {
  const a = rows.filter((r) => r.transactionType === TransactionType.ADD).length;
  const u = rows.filter((r) => r.transactionType === TransactionType.UPDATE).length;
  const d = rows.filter((r) => r.transactionType === TransactionType.DELETE).length;
  return [a ? `追加:${a}件` : "", u ? `更新:${u}件` : "", d ? `削除:${d}件` : ""]
    .filter(Boolean)
    .join(" / ");
};

// ─── 初期表示 ────────────────────────────────
onMounted(async () => {
  subSelectOptions.value = masterApi.getSubMasterOptions();
  await loadMasters();
});

// ─── 親マスタ: 読み込み ───────────────────────
const loadMasters = async () => {
  const loading = ElLoading.service();
  try {
    const items = await masterApi.list();
    masterRows.value = items.map((m) => ({ ...m, transactionType: TransactionType.NONE }));
    // 選択中の親マスタを維持する（保存後リフレッシュ）
    if (selectedMaster.value) {
      const refreshed = masterRows.value.find((r) => r.code === selectedMaster.value!.code);
      selectedMaster.value = refreshed ?? null;
      if (!refreshed) subMasterRows.value = [];
    }
  } finally {
    loading.close();
  }
};

// ─── 親マスタ: セル編集 ───────────────────────
const markMasterUpdated = (row: MasterEditRow) => {
  if (row.transactionType === TransactionType.NONE) row.transactionType = TransactionType.UPDATE;
  row._errors = undefined;
};

// ─── 親マスタ: 行追加 ─────────────────────────
const addMasterRow = () => {
  masterRows.value.push({ transactionType: TransactionType.ADD, code: "", name: "", version: 0 });
};

// ─── 親マスタ: 行削除 ─────────────────────────
const deleteMasterRow = (row: MasterEditRow) => {
  if (row.transactionType === TransactionType.ADD) {
    masterRows.value = masterRows.value.filter((r) => r !== row);
  } else if (row.transactionType === TransactionType.DELETE) {
    row.transactionType = row.id ? TransactionType.NONE : TransactionType.ADD;
    row._errors = undefined;
  } else {
    row.transactionType = TransactionType.DELETE;
  }
};

// ─── 親マスタ: 一括保存 ───────────────────────
const saveMasters = async () => {
  const dirtyRows = masterRows.value.filter((r) => r.transactionType !== TransactionType.NONE);
  if (dirtyRows.length === 0) {
    ElMessage.info("変更がありません");
    return;
  }

  if (!(await confirmMessageBox(`親マスタ ${dirtyRows.length} 件を保存します。よろしいですか？`))) return;

  const loading = ElLoading.service();
  try {
    await masterApi.saveAll(dirtyRows as (Master & { transactionType: TransactionType })[]);
    ElMessage.success(`${dirtyRows.length} 件を保存しました`);
    await loadMasters();
  } catch (error: any) {
    handleBulkBusinessError(error, dirtyRows, masterRows.value);
  } finally {
    loading.close();
  }
};

// ─── 親マスタ: 行クラス ───────────────────────
const masterRowClass = ({ row }: { row: MasterEditRow }) => {
  if (row.transactionType === TransactionType.DELETE) return "row-deleted";
  if (row.transactionType === TransactionType.ADD) return "row-added";
  if (row.transactionType === TransactionType.UPDATE) return "row-updated";
  return "";
};

// ─── 子マスタ: 読み込み ───────────────────────
const loadSubMasters = async (master: MasterEditRow) => {
  if (hasSubDirty.value) {
    const ok = await confirmMessageBox("子マスタに未保存の変更があります。破棄して切り替えますか？");
    if (!ok) return;
  }
  selectedMaster.value = master;
  const loading = ElLoading.service();
  try {
    const items = await masterApi.listChildren(master.code);
    subMasterRows.value = items.map((s) => ({ ...s, transactionType: TransactionType.NONE }));
  } finally {
    loading.close();
  }
};

// ─── 子マスタ: セル編集 ───────────────────────
const markSubUpdated = (row: SubMasterEditRow) => {
  if (row.transactionType === TransactionType.NONE) row.transactionType = TransactionType.UPDATE;
  row._errors = undefined;
};

// ─── 子マスタ: 行追加 ─────────────────────────
const addSubMasterRow = () => {
  subMasterRows.value.push({
    transactionType: TransactionType.ADD,
    masterCode: selectedMaster.value!.code,
    code: "",
    name: "",
    selectValue: "",
    version: 0,
  });
};

// ─── 子マスタ: 行削除 ─────────────────────────
const deleteSubRow = (row: SubMasterEditRow) => {
  if (row.transactionType === TransactionType.ADD) {
    subMasterRows.value = subMasterRows.value.filter((r) => r !== row);
  } else if (row.transactionType === TransactionType.DELETE) {
    row.transactionType = row.id ? TransactionType.NONE : TransactionType.ADD;
    row._errors = undefined;
  } else {
    row.transactionType = TransactionType.DELETE;
  }
};

// ─── 子マスタ: 一括保存（親マスタと 1トランザクション）───────
const saveSubMasters = async () => {
  const dirtySubRows = subMasterRows.value.filter((r) => r.transactionType !== TransactionType.NONE);
  const parentDirty = selectedMaster.value?.transactionType !== TransactionType.NONE;

  if (dirtySubRows.length === 0 && !parentDirty) {
    ElMessage.info("変更がありません");
    return;
  }

  if (!(await confirmMessageBox("保存します。よろしいですか？"))) return;

  const loading = ElLoading.service();
  try {
    // 選択中の親マスタと子マスタを 1トランザクションで保存
    const savedParent = await masterApi.saveWithChildren(
      selectedMaster.value! as Master & { transactionType: TransactionType },
      dirtySubRows as (SubMaster & { transactionType: TransactionType })[],
    );
    ElMessage.success("保存しました");

    // 親リスト・子リストをリフレッシュ（保存済み親の transactionType も NONE にリセット）
    await loadMasters();
    const items = await masterApi.listChildren(savedParent.code);
    subMasterRows.value = items.map((s) => ({ ...s, transactionType: TransactionType.NONE }));
  } catch (err: any) {
    // selectedMaster（親行）に既知フィールドを事前宣言して parentErrors として渡す
    // → line なし & 宣言フィールド = 赤セルインライン、それ以外 = トースト表示
    if (selectedMaster.value) {
      selectedMaster.value._errors = { code: undefined, name: undefined };
    }
    handleBulkBusinessError(
      err,
      [{ dirtyRows: dirtySubRows, allRows: subMasterRows.value }],
      selectedMaster.value?._errors,
    );
  } finally {
    loading.close();
  }
};

// ─── 子マスタ: 行クラス ─────────────────────
// ─── 子マスタ: クリア（変更破棄・再読込） ─────────
const clearSubMasters = async () => {
  if (!selectedMaster.value) return;
  if (hasSubDirty.value) {
    const ok = await confirmMessageBox("未保存の変更があります。変更を破棄してクリアしますか？");
    if (!ok) return;
  }
  const items = await masterApi.listChildren(selectedMaster.value.code);
  subMasterRows.value = items.map((s) => ({ ...s, transactionType: TransactionType.NONE }));
};

// ─── 子マスタ: 行クラス ───────────────────────
const subRowClass = ({ row }: { row: SubMasterEditRow }) => {
  if (row.transactionType === TransactionType.DELETE) return "row-deleted";
  if (row.transactionType === TransactionType.ADD) return "row-added";
  if (row.transactionType === TransactionType.UPDATE) return "row-updated";
  return "";
};
</script>

<template>
  <div class="max-w-800px">

    <!-- ▼ タイトル行 ──────────────────────────── -->
    <el-row>
      <el-col :xs="24" :sm="12" class="screen-title">親子マスタメンテ</el-col>
      <el-col :xs="24" :sm="12" class="flex justify-end items-center gap-2">
        <span v-if="masterSummary" class="text-sm text-orange-500 font-bold">{{ masterSummary }}</span>
        <el-button type="primary" icon="DocumentChecked" :disabled="!hasMasterDirty" @click="saveMasters"> 一括保存 </el-button>
      </el-col>
    </el-row>

    <!-- ▼ 検索条件エリア ──────────────────────── -->
    <el-collapse model-value="search">
      <el-collapse-item name="search">
        <template #title><b>検索条件</b></template>
        <el-form label-width="80px">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="コード">
                <el-input v-model="searchCode" placeholder="コードを入力" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="名称">
                <el-input v-model="searchName" placeholder="名称を入力" clearable />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="24">
              <div class="flex gap-2 mt-4">
                <el-button type="primary" icon="Search"> 検索 </el-button>
                <el-button icon="RefreshLeft" @click="clearMasterSearch">クリア</el-button>
              </div>
            </el-col>
          </el-row>
        </el-form>
      </el-collapse-item>
    </el-collapse>
    <el-divider class="my-0" />
    <!-- ▼ 一覧編集エリア ──────────────────────── -->
    <el-collapse model-value="edit">
      <el-collapse-item name="edit">
        <template #title><b>一覧編集</b></template>

        <Pagination :items="filteredMasterRows" @update:pagedItems="pagedMasterRows = $event" />

        <el-table
          :data="pagedMasterRows"
          :row-class-name="masterRowClass"
          border
          size="small"
          class="mt-4">

        <!-- 状態 -->
        <el-table-column label="状態" width="58" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.transactionType === TransactionType.ADD"    type="success" size="small">追加</el-tag>
            <el-tag v-else-if="row.transactionType === TransactionType.UPDATE" type="warning" size="small">更新</el-tag>
            <el-tag v-else-if="row.transactionType === TransactionType.DELETE" type="danger"  size="small">削除</el-tag>
          </template>
        </el-table-column>

        <!-- コード -->
        <el-table-column label="コード *" width="140">
          <template #default="{ row }">
            <el-tooltip :content="row._errors?.code" :disabled="!row._errors?.code" placement="top" popper-class="tooltip-error">
              <el-input
                v-model="row.code"
                size="small"
                :disabled="!!row.id || row.transactionType === TransactionType.DELETE"
                clearable
                class="cell-required"
                :class="{ 'cell-error': row._errors?.code }"
                @change="markMasterUpdated(row)" />
            </el-tooltip>
          </template>
        </el-table-column>

        <!-- 名称 -->
        <el-table-column label="名称 *" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="row._errors?.name" :disabled="!row._errors?.name" placement="top" popper-class="tooltip-error">
              <el-input
                v-model="row.name"
                size="small"
                :disabled="row.transactionType === TransactionType.DELETE"
                clearable
                class="cell-required"
                :class="{ 'cell-error': row._errors?.name }"
                @change="markMasterUpdated(row)" />
            </el-tooltip>
          </template>
        </el-table-column>

        <!-- 子マスタ表示ボタン -->
        <el-table-column label="子マスタ" width="90" align="center">
          <template #default="{ row }">
            <el-button
              size="small"
              :type="selectedMaster?.code === row.code ? 'primary' : 'default'"
              :disabled="!row.id"
              @click="loadSubMasters(row)">
              {{ selectedMaster?.code === row.code ? '選択中' : '表示' }}
            </el-button>
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="" width="72" align="center">
          <template #default="{ row }">
            <el-button
              :type="row.transactionType === TransactionType.DELETE ? 'default' : 'danger'"
              :icon="row.transactionType === TransactionType.DELETE ? 'RefreshLeft' : 'Delete'"
              size="small"
              circle
              @click="deleteMasterRow(row)" />
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-2">
        <el-button icon="Plus" @click="addMasterRow"> 行追加 </el-button>
      </div>
      </el-collapse-item>
    </el-collapse>

    <!-- ▼ 子マスタセクション（カード型） ────────── -->
    <el-card v-if="selectedMaster">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="font-bold">
            子マスタ
            <el-tag type="info" class="ml-2">{{ selectedMaster.name }}</el-tag>
          </span>
          <div class="flex items-center gap-3">
            <span v-if="subSummary" class="text-sm text-orange-500 font-bold">
              {{ subSummary }}
            </span>
            <el-button icon="RefreshLeft" :disabled="!hasSubDirty" @click="clearSubMasters"> クリア </el-button>
            <el-button
              type="primary"
              icon="DocumentChecked"
              :disabled="!hasSubDirty && selectedMaster?.transactionType === TransactionType.NONE"
              @click="saveSubMasters">
              一括保存
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="subMasterRows"
        :row-class-name="subRowClass"
        border
        size="small">

        <!-- 状態 -->
        <el-table-column label="状態" width="58" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.transactionType === TransactionType.ADD"    type="success" size="small">追加</el-tag>
            <el-tag v-else-if="row.transactionType === TransactionType.UPDATE" type="warning" size="small">更新</el-tag>
            <el-tag v-else-if="row.transactionType === TransactionType.DELETE" type="danger"  size="small">削除</el-tag>
          </template>
        </el-table-column>

        <!-- コード -->
        <el-table-column label="コード *" width="140">
          <template #default="{ row }">
            <el-tooltip :content="row._errors?.code" :disabled="!row._errors?.code" placement="top" popper-class="tooltip-error">
              <el-input
                v-model="row.code"
                size="small"
                :disabled="!!row.id || row.transactionType === TransactionType.DELETE"
                clearable
                class="cell-required"
                :class="{ 'cell-error': row._errors?.code }"
                @change="markSubUpdated(row)" />
            </el-tooltip>
          </template>
        </el-table-column>

        <!-- 名称 -->
        <el-table-column label="名称 *" min-width="180">
          <template #default="{ row }">
            <el-tooltip :content="row._errors?.name" :disabled="!row._errors?.name" placement="top" popper-class="tooltip-error">
              <el-input
                v-model="row.name"
                size="small"
                :disabled="row.transactionType === TransactionType.DELETE"
                clearable
                class="cell-required"
                :class="{ 'cell-error': row._errors?.name }"
                @change="markSubUpdated(row)" />
            </el-tooltip>
          </template>
        </el-table-column>

        <!-- 区分（定数＋ドロップダウン） -->
        <el-table-column label="区分 *" width="140">
          <template #default="{ row }">
            <el-tooltip :content="row._errors?.selectValue" :disabled="!row._errors?.selectValue" placement="top" popper-class="tooltip-error">
              <el-select
                v-model="row.selectValue"
                size="small"
                style="width: 100%"
                :disabled="row.transactionType === TransactionType.DELETE"
                class="cell-required"
                :class="{ 'cell-error': row._errors?.selectValue }"
                @change="markSubUpdated(row)">
                <el-option
                  v-for="opt in subSelectOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value" />
              </el-select>
            </el-tooltip>
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="" width="72" align="center">
          <template #default="{ row }">
            <el-button
              :type="row.transactionType === TransactionType.DELETE ? 'default' : 'danger'"
              :icon="row.transactionType === TransactionType.DELETE ? 'RefreshLeft' : 'Delete'"
              size="small"
              circle
              @click="deleteSubRow(row)" />
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-2">
        <el-button icon="Plus" @click="addSubMasterRow"> 行追加 </el-button>
      </div>
    </el-card>

    <!-- 子マスタ非表示時のガイド -->
    <el-empty v-else description="一覧の行の「表示」ボタンをクリックすると子マスタを編集できます" :image-size="80" />
  </div>
</template>
