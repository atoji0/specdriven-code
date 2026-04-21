<!--
  ============================================================
  一括更新画面サンプル（画面区分: 入力（一括））
  ファイル名: input-bulk/BulkEdit.vue
  対応するUI仕様書: UI仕様書_＜画面ベース名＞_入力.md（画面区分: 入力（一括））
  ============================================================

  検索 → インライン編集 → 一括保存 フロー:
    1. 検索: BasicList.vue と同じ条件でデータ取得
    2. 編集: テーブルセルを直接編集 → transactionType = "U" を自動付与
    3. 行追加: 空行を追加 → transactionType = "A"
    4. 行削除: 行をグレーアウト → transactionType = "D"（一括保存時に処理）
    5. 一括保存: transactionType が設定された行のみ referenceApi.saveAll() に送信

  実業務への置き換えポイント:
    各 xxxValue → 業務フィールド名
    MainData / MainDataSearch → 実際の型名
    referenceApi → 実際の API オブジェクト名
  ============================================================
-->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { ElLoading, ElMessage } from "element-plus";
import { formatNumber, handleBulkBusinessError, confirmMessageBox, TransactionType, Pagination } from "mzfw";
import type { MainData, MainDataSearch } from "@/types/mainData";
import { referenceApi } from "@/api/referenceApi";
import type { SelectOption } from "mzfw";

// ─── 拡張型: 編集中の行管理用 ───────────────────
type EditRow = MainData & {
  transactionType: TransactionType;
  _errors?: Record<string, string>; // フィールド名 → エラーメッセージ
};

// ─── データ・状態 ─────────────────────────────
// editRows: 検索結果を editRow 型に変換したもの（transactionType で変更追跡）
const editRows = ref<EditRow[]>([]);
// pagedEditRows: Pagination コンポーネントが「現在ページに表示する行」を書き込む ref
// （editRows を直接 v-for に使わず、この ref を経由することでページング動作する）
const pagedEditRows = ref<EditRow[]>([]);
const searchDto = ref<MainDataSearch>({});

// ─── 選択肢（バックエンドから取得） ──────────────
const selectOptions = ref<SelectOption[]>([]);
const masterOptions = ref<SelectOption[]>([]);
// 行ごとの連動マスタ選択肢（masterValue をキーにキャッシュ）
const linkedOptionsMap = ref<Record<string, SelectOption[]>>({});

// ─── 初期表示 ──────────────────────────────────
onMounted(async () => {
  await loadOptions();
  await search();
});

// ─── 検索条件: masterValue 変更 → linkedValue リセット ─
watch(
  () => searchDto.value.masterValue,
  (newMasterCode) => {
    searchDto.value.linkedValue = undefined;
    if (newMasterCode) loadLinkedOptionsFor(newMasterCode);
  },
);

// ─── 選択肢取得 ─────────────────────────────────
const loadOptions = async () => {
  const loading = ElLoading.service();
  try {
    selectOptions.value = referenceApi.getSelectOptions();
    masterOptions.value = await referenceApi.getMasterOptions();
  } finally {
    loading.close();
  }
};

/** masterCode に対応する連動マスタ選択肢をキャッシュつきで取得 */
const loadLinkedOptionsFor = async (masterCode: string) => {
  if (linkedOptionsMap.value[masterCode]) return;
  const opts = await referenceApi.getLinkedOptions(masterCode);
  linkedOptionsMap.value[masterCode] = opts;
};

// ─── 検索 ───────────────────────────────────────
const search = async () => {
  const loading = ElLoading.service();
  try {
    const items = await referenceApi.list(searchDto.value);
    // 検索結果を editRows に変換（transactionType は空：未変更）
    editRows.value = items.map((item) => ({ ...item, transactionType: TransactionType.NONE }));
    // 取得行の masterValue に対応する連動選択肢を事前ロード
    const masterCodes = [...new Set(items.map((i) => i.masterValue).filter(Boolean))];
    await Promise.all(masterCodes.map(loadLinkedOptionsFor));
  } finally {
    loading.close();
  }
};

// ─── クリア ─────────────────────────────────────
const clear = () => {
  searchDto.value = {};
  search();
};

// ─── セル編集時: 既存行を "U" にマーク ─────────
const markUpdated = (row: EditRow) => {
  if (row.transactionType === TransactionType.NONE) row.transactionType = TransactionType.UPDATE;
  row._errors = undefined; // 編集したらエラー表示をクリア
};

/** masterValue が変わったとき連動マスタ選択肢をロード・linkedValue をリセット */
const onMasterChange = async (row: EditRow) => {
  markUpdated(row);
  row.linkedValue = "";
  if (row.masterValue) await loadLinkedOptionsFor(row.masterValue);
};

// ─── 行追加 ─────────────────────────────────────
const addRow = () => {
  editRows.value.push({
    transactionType: TransactionType.ADD,
    codeValue:    "",
    nameValue:    "",
    numericValue: undefined,
    dateValue:    new Date(),
    selectValue:  "",
    masterValue:  "",
    linkedValue:  "",
    flagValue:    1,
    memoValue:    undefined,
    version:      0,
  });
};

// ─── 行削除 ─────────────────────────────────────
const deleteRow = (row: EditRow) => {
  if (row.transactionType === TransactionType.ADD) {
    // 未保存の追加行はリストから除去
    editRows.value = editRows.value.filter((r) => r !== row);
  } else if (row.transactionType === TransactionType.DELETE) {
    // 削除マーク解除 → 既存行は未変更、追加行は ADD に戻す
    row.transactionType = row.id ? TransactionType.NONE : TransactionType.ADD;
    row._errors = undefined;
  } else {
    row.transactionType = TransactionType.DELETE;
  }
};

// ─── 一括保存 ────────────────────────────────────
const saveAll = async () => {
  const dirtyRows = editRows.value.filter((r) => r.transactionType !== TransactionType.NONE);
  if (!(await confirmMessageBox(`${dirtyRows.length} 件を保存します。よろしいですか？`))) return;

  const loading = ElLoading.service();
  try {
    await referenceApi.saveAll(dirtyRows as (MainData & { transactionType: TransactionType })[]);
    ElMessage.success(`${dirtyRows.length} 件を保存しました`);
    await search();
  } catch (error: any) {
    handleBulkBusinessError(error, dirtyRows, editRows.value);
  } finally {
    loading.close();
  }
};

// ─── 行スタイル ──────────────────────────────────
const rowClassName = ({ row }: { row: EditRow }) => {
  if (row.transactionType === TransactionType.DELETE) return "row-deleted";
  if (row.transactionType === TransactionType.ADD) return "row-added";
  if (row.transactionType === TransactionType.UPDATE) return "row-updated";
  return "";
};

// ─── 変更行サマリ ────────────────────────────────
const hasDirty = computed(() => editRows.value.some((r) => r.transactionType !== TransactionType.NONE));

const dirtySummary = () => {
  const rows = editRows.value;
  const a = rows.filter((r) => r.transactionType === TransactionType.ADD).length;
  const u = rows.filter((r) => r.transactionType === TransactionType.UPDATE).length;
  const d = rows.filter((r) => r.transactionType === TransactionType.DELETE).length;
  return [a ? `追加:${a}件` : "", u ? `更新:${u}件` : "", d ? `削除:${d}件` : ""]
    .filter(Boolean)
    .join(" / ");
};
</script>

<template>
  <div class="max-w-1600px">
    <!-- ▼ タイトル行 ──────────────────────────── -->
    <el-row>
      <el-col :xs="24" :sm="12" class="screen-title">
        一括更新画面タイトル
      </el-col>
      <el-col :xs="24" :sm="12" class="flex justify-end items-center gap-2">
        <span v-if="dirtySummary()" class="text-sm text-orange-500 font-bold">
          {{ dirtySummary() }}
        </span>
        <el-button type="primary" icon="DocumentChecked" :disabled="!hasDirty" @click="saveAll"> 一括保存 </el-button>
      </el-col>
    </el-row>

    <!-- ▼ 検索条件エリア ──────────────────────── -->
    <el-collapse model-value="search">
      <el-collapse-item name="search">
        <template #title><b>検索条件</b></template>
        <el-form :model="searchDto" label-width="130px">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="コード">
                <el-input v-model="searchDto.codeValue" placeholder="コードを入力" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="名称">
                <el-input v-model="searchDto.nameValue" placeholder="名称を入力" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="固定値選択">
                <el-select v-model="searchDto.selectValue" placeholder="選択" clearable style="width: 100%">
                  <el-option v-for="opt in selectOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="フラグ">
                <el-checkbox v-model="searchDto.flagValue" :true-value="1" :false-value="undefined"> 有効のみ </el-checkbox>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="24">
              <div class="flex gap-2 mt-4">
                <el-button type="primary" icon="Search" @click="search">検索</el-button>
                <el-button icon="RefreshLeft" @click="clear">クリア</el-button>
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

        <Pagination :items="editRows" @update:pagedItems="pagedEditRows = $event" />

        <el-table
          :data="pagedEditRows"
          :row-class-name="rowClassName"
          border
          class="mt-4">

          <!-- 状態バッジ -->
          <el-table-column label="状態" width="58" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.transactionType === TransactionType.ADD" type="success" size="small">追加</el-tag>
              <el-tag v-else-if="row.transactionType === TransactionType.UPDATE" type="warning" size="small">更新</el-tag>
              <el-tag v-else-if="row.transactionType === TransactionType.DELETE" type="danger"  size="small">削除</el-tag>
            </template>
          </el-table-column>

          <!-- コード: 既存行は読み取り専用 -->
          <el-table-column label="コード *" width="130">
            <template #default="{ row }">
              <el-tooltip :content="row._errors?.codeValue" :disabled="!row._errors?.codeValue" placement="top" popper-class="tooltip-error">
                <el-input
                  v-model="row.codeValue"
                  size="small"
                  :disabled="!!row.id || row.transactionType === TransactionType.DELETE"
                  clearable
                  class="cell-required"
                  :class="{ 'cell-error': row._errors?.codeValue }"
                  @change="markUpdated(row)" />
              </el-tooltip>
            </template>
          </el-table-column>

          <!-- 名称 -->
          <el-table-column label="名称 *" min-width="160">
            <template #default="{ row }">
              <el-tooltip :content="row._errors?.nameValue" :disabled="!row._errors?.nameValue" placement="top" popper-class="tooltip-error">
                <el-input
                  v-model="row.nameValue"
                  size="small"
                  :disabled="row.transactionType === TransactionType.DELETE"
                  clearable
                  class="cell-required"
                  :class="{ 'cell-error': row._errors?.nameValue }"
                  @change="markUpdated(row)" />
              </el-tooltip>
            </template>
          </el-table-column>

          <!-- 数値 -->
          <el-table-column label="数値" width="120">
            <template #default="{ row }">
              <el-tooltip :content="row._errors?.numericValue" :disabled="!row._errors?.numericValue" placement="top" popper-class="tooltip-error">
                <el-input
                  v-model="row.numericValue"
                  size="small"
                  :disabled="row.transactionType === TransactionType.DELETE"
                  clearable
                  :formatter="formatNumber"
                  :parser="(v: string) => v.replace(/[^0-9]/g, '').slice(0, 10)"
                  :class="{ 'cell-error': row._errors?.numericValue, 'numeric-input': true }"
                  @change="markUpdated(row)" />
              </el-tooltip>
            </template>
          </el-table-column>

          <!-- 日付 -->
          <el-table-column label="日付 *" width="140">
            <template #default="{ row }">
              <el-tooltip :content="row._errors?.dateValue" :disabled="!row._errors?.dateValue" placement="top" popper-class="tooltip-error">
                <!-- el-date-picker は tooltip のトリガーを直接受け取れないため div で包む -->
                <div style="width: 100%">
                  <el-date-picker
                    v-model="row.dateValue"
                    type="date"
                    size="small"
                    format="YYYY/MM/DD"
                    style="width: 100%"
                    :disabled="row.transactionType === TransactionType.DELETE"
                    class="cell-required"
                    :class="{ 'cell-error': row._errors?.dateValue }"
                    @change="markUpdated(row)" />
                </div>
              </el-tooltip>
            </template>
          </el-table-column>

          <!-- 固定値選択 -->
          <el-table-column label="区分 *" width="130">
            <template #default="{ row }">
              <el-tooltip :content="row._errors?.selectValue" :disabled="!row._errors?.selectValue" placement="top" popper-class="tooltip-error">
                <el-select
                  v-model="row.selectValue"
                  size="small"
                  style="width: 100%"
                  :disabled="row.transactionType === TransactionType.DELETE"
                  class="cell-required"
                  :class="{ 'cell-error': row._errors?.selectValue }"
                  @change="markUpdated(row)">
                  <el-option v-for="opt in selectOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-tooltip>
            </template>
          </el-table-column>

          <!-- マスタ参照 -->
          <el-table-column label="マスタ参照 *" width="140">
            <template #default="{ row }">
              <el-tooltip :content="row._errors?.masterValue" :disabled="!row._errors?.masterValue" placement="top" popper-class="tooltip-error">
                <el-select
                  v-model="row.masterValue"
                  size="small"
                  style="width: 100%"
                  :disabled="row.transactionType === TransactionType.DELETE"
                  class="cell-required"
                  :class="{ 'cell-error': row._errors?.masterValue }"
                  @change="onMasterChange(row)">
                  <el-option v-for="opt in masterOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-tooltip>
            </template>
          </el-table-column>

          <!-- 連動マスタ -->
          <el-table-column label="連動マスタ *" width="140">
            <template #default="{ row }">
              <el-tooltip :content="row._errors?.linkedValue" :disabled="!row._errors?.linkedValue" placement="top" popper-class="tooltip-error">
                <el-select
                  v-model="row.linkedValue"
                  size="small"
                  :disabled="!row.masterValue || row.transactionType === TransactionType.DELETE"
                  style="width: 100%"
                  class="cell-required"
                  :class="{ 'cell-error': row._errors?.linkedValue }"
                  @change="markUpdated(row)">
                  <el-option
                    v-for="opt in linkedOptionsMap[row.masterValue] ?? []"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value" />
                </el-select>
              </el-tooltip>
            </template>
          </el-table-column>

          <!-- フラグ -->
          <el-table-column label="フラグ" width="70" align="center">
            <template #default="{ row }">
              <el-checkbox
                :model-value="row.flagValue === 1"
                :disabled="row.transactionType === TransactionType.DELETE"
                @update:model-value="(v: boolean) => { row.flagValue = v ? 1 : 0; markUpdated(row); }" />
            </template>
          </el-table-column>

          <!-- 備考 -->
          <el-table-column label="備考" min-width="200">
            <template #default="{ row }">
              <el-tooltip :content="row._errors?.memoValue" :disabled="!row._errors?.memoValue" placement="top" popper-class="tooltip-error">
                <el-input
                  v-model="row.memoValue"
                  type="textarea"
                  :autosize="{ minRows: 1, maxRows: 5 }"
                  size="small"
                  :disabled="row.transactionType === TransactionType.DELETE"
                  :class="{ 'cell-error': row._errors?.memoValue }"
                  @change="markUpdated(row)" />
              </el-tooltip>
            </template>
          </el-table-column>

          <!-- 操作: 行削除 / 取り消し -->
          <el-table-column label="" width="72" align="center">
            <template #default="{ row }">
              <el-button
                :type="row.transactionType === TransactionType.DELETE ? 'default' : 'danger'"
                :icon="row.transactionType === TransactionType.DELETE ? 'RefreshLeft' : 'Delete'"
                size="small"
                circle
                @click="deleteRow(row)" />
            </template>
          </el-table-column>
        </el-table>

        <!-- 行追加ボタン -->
        <div class="mt-2">
          <el-button icon="Plus" @click="addRow"> 行追加 </el-button>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

