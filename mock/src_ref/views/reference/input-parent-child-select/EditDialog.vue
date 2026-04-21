<!--
  ============================================================
  入力画面サンプル（画面区分: 入力（親子選択））
  ファイル名: input-parent-child-select/EditDialog.vue
  ============================================================

  List.vue から dialogRef.value?.open(id) で呼び出す。
    open(null) → 新規登録モード
    open(id)   → 変更モード（id に対応するデータを取得）

  画面構成:
    ① 親データ入力フォーム（list-normal の EditDialog と同一構成）
    ② 紐付けマスタ選択パネル
       - 検索条件（コード・名称）+ [検索][クリア]
       - 検索結果テーブル（チェックボックスで選択）

  データ設計:
    data ↔ master を surrogate key（id）で結合する 1:N 中間テーブル（subData）を使用。
    保存時は data と subData を 1 つの IndexedDB トランザクションで一括更新。
  ============================================================
-->
<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import { handleBusinessError, confirmMessageBox } from "mzfw";
import { formatNumber } from "mzfw";
import type { MainData } from "@/types/mainData";
import type { Master, MasterSearch } from "@/types/master";
import { referenceApi } from "@/api/referenceApi";
import type { SelectOption } from "mzfw";
import { subDataApi } from "@/api/subDataApi";

// ─── Emits ───────────────────────────────────
const emit = defineEmits<{ (e: "saved"): void }>();

// ─── 内部状態 ────────────────────────────────
const visible = ref(false);
const editId  = ref<number | null>(null);

// ─── モード判定 ──────────────────────────────
const isEditMode  = computed(() => editId.value !== null);
const dialogTitle = computed(() =>
  isEditMode.value ? "データ編集（親子選択）" : "データ新規登録（親子選択）",
);

// ─── 外部から呼ぶ open() ─────────────────────
const open = (id: number | null = null) => {
  editId.value  = id;
  visible.value = true;
};
defineExpose({ open });

// ─── フォームデータ ──────────────────────────
const emptyForm = (): MainData => ({
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

const form   = ref<MainData>(emptyForm());
const errors = ref<Record<string, string>>({});

// ─── 選択肢 ──────────────────────────────────
const selectOptions = ref<SelectOption[]>([]);
const masterOptions = ref<SelectOption[]>([]);
const linkedOptions = ref<SelectOption[]>([]);

// ─── masterValue 変更 → linkedValue の選択肢を再取得 ─
watch(
  () => form.value.masterValue,
  async (newMasterCode) => {
    if (!newMasterCode) {
      linkedOptions.value   = [];
      form.value.linkedValue = "";
      return;
    }
    linkedOptions.value = await referenceApi.getLinkedOptions(newMasterCode);
    if (!linkedOptions.value.some((o) => o.value === form.value.linkedValue)) {
      form.value.linkedValue = "";
    }
  },
);

// ─── ダイアログが開く時にフォーム初期化 ─────────
watch(visible, async (newVal) => {
  if (!newVal) return;
  errors.value        = {};
  masterSearchDone.value = false;
  masterSearchResults.value = [];
  masterSearchConditions.value = { code: "", name: "" };

  selectOptions.value = referenceApi.getSelectOptions();
  masterOptions.value = await referenceApi.getMasterOptions();

  if (isEditMode.value) {
    const data = await subDataApi.get(editId.value!).catch(() => null);
    if (!data) {
      ElMessage.error("データが見つかりません");
      visible.value = false;
      return;
    }
    const { linkedMasters, ...dataFields } = data;
    form.value = { ...dataFields };
    selectedMasterIds.value = new Set(linkedMasters.map((m) => m.id!));
    if (data.masterValue) {
      linkedOptions.value = await referenceApi.getLinkedOptions(data.masterValue);
    }
  } else {
    form.value = emptyForm();
    linkedOptions.value   = [];
    selectedMasterIds.value = new Set();
  }

  // 初期表示は全件検索して選択状態を確認できるようにする
  await searchMasters();
});

// ─── 閉じる ──────────────────────────────────
const close = () => (visible.value = false);

// ─── マスタ検索パネル ─────────────────────────
const selectedMasterIds      = ref(new Set<number>());
const masterSearchConditions = ref<MasterSearch>({ code: "", name: "" });
const masterSearchResults    = ref<Master[]>([]);
const masterSearchDone       = ref(false);

const searchMasters = async () => {
  masterSearchResults.value = await subDataApi.searchMasters(masterSearchConditions.value);
  masterSearchDone.value    = true;
};

const clearMasterSearch = () => {
  masterSearchConditions.value = { code: "", name: "" };
  masterSearchResults.value    = [];
  masterSearchDone.value       = false;
};

// ─── チェックボックス操作 ─────────────────────
const toggleMaster = (master: Master) => {
  if (selectedMasterIds.value.has(master.id!)) {
    selectedMasterIds.value.delete(master.id!);
  } else {
    selectedMasterIds.value.add(master.id!);
  }
  selectedMasterIds.value = new Set(selectedMasterIds.value);
};

const isSelected     = (master: Master) => selectedMasterIds.value.has(master.id!);
const masterRowClass = ({ row }: { row: Master }) => (isSelected(row) ? "row-updated" : "");

// ─── 新規作成 ────────────────────────────────
const create = async () => {
  errors.value = {};
  try {
    await subDataApi.save({ ...form.value }, [...selectedMasterIds.value]);
    ElMessage.success("登録しました");
    emit("saved");
    close();
  } catch (error) {
    handleBusinessError(error, errors.value);
  }
};

// ─── 変更 ────────────────────────────────────
const update = async () => {
  errors.value = {};
  try {
    await subDataApi.save({ ...form.value }, [...selectedMasterIds.value]);
    ElMessage.success("更新しました");
    emit("saved");
    close();
  } catch (error) {
    handleBusinessError(error, errors.value);
  }
};

// ─── 削除 ────────────────────────────────────
const remove = async () => {
  if (!(await confirmMessageBox("削除します。よろしいですか？"))) return;
  errors.value = {};
  try {
    await subDataApi.remove(form.value.id!, form.value.version);
    ElMessage.success("削除しました");
    emit("saved");
    close();
  } catch (error) {
    handleBusinessError(error, errors.value);
  }
};
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="dialogTitle"
    direction="rtl"
    size="60%"
    :close-on-click-modal="false">

    <!-- ▼ 入力フォーム ──────────────────────── -->
    <el-form :model="form" label-width="110px">

      <!-- 行1: コード / 名称 -->
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="コード *">
            <el-tooltip :content="errors['codeValue']" :disabled="!errors['codeValue']" placement="top" popper-class="tooltip-error">
              <el-input
                v-model="form.codeValue"
                placeholder="半角英数字・10文字以内"
                maxlength="10"
                :disabled="isEditMode"
                clearable
                class="cell-required"
                :class="{ 'cell-error': errors['codeValue'] }" />
            </el-tooltip>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="名称 *">
            <el-tooltip :content="errors['nameValue']" :disabled="!errors['nameValue']" placement="top" popper-class="tooltip-error">
              <el-input
                v-model="form.nameValue"
                placeholder="50文字以内"
                maxlength="50"
                clearable
                class="cell-required"
                :class="{ 'cell-error': errors['nameValue'] }" />
            </el-tooltip>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 行2: 数値 / 日付 -->
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="数値">
            <el-tooltip :content="errors['numericValue']" :disabled="!errors['numericValue']" placement="top" popper-class="tooltip-error">
              <el-input
                v-model="form.numericValue"
                placeholder="数値を入力"
                clearable
                :formatter="formatNumber"
                :parser="(v: string) => v.replace(/[^0-9]/g, '').slice(0, 10)"
                class="numeric-input"
                style="width: 130px"
                :class="{ 'cell-error': errors['numericValue'] }" />
            </el-tooltip>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="日付 *">
            <el-tooltip :content="errors['dateValue']" :disabled="!errors['dateValue']" placement="top" popper-class="tooltip-error">
              <el-date-picker
                v-model="form.dateValue"
                type="date"
                placeholder="日付を選択"
                format="YYYY/MM/DD"
                clearable
                style="width: 130px"
                :class="{ 'cell-error': errors['dateValue'] }" />
            </el-tooltip>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 行3: 固定値選択 / マスタ参照 -->
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="固定値選択 *">
            <el-tooltip :content="errors['selectValue']" :disabled="!errors['selectValue']" placement="top" popper-class="tooltip-error">
              <el-select
                v-model="form.selectValue"
                placeholder="選択してください"
                style="width: 100%"
                class="cell-required"
                :class="{ 'cell-error': errors['selectValue'] }">
                <el-option v-for="opt in selectOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-tooltip>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="マスタ参照 *">
            <el-tooltip :content="errors['masterValue']" :disabled="!errors['masterValue']" placement="top" popper-class="tooltip-error">
              <el-select
                v-model="form.masterValue"
                placeholder="マスタを選択"
                style="width: 100%"
                class="cell-required"
                :class="{ 'cell-error': errors['masterValue'] }">
                <el-option v-for="opt in masterOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-tooltip>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 行4: 連動マスタ参照 / フラグ -->
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="連動マスタ *">
            <el-tooltip :content="errors['linkedValue']" :disabled="!errors['linkedValue']" placement="top" popper-class="tooltip-error">
              <el-select
                v-model="form.linkedValue"
                placeholder="連動マスタを選択"
                :disabled="!form.masterValue"
                style="width: 100%"
                class="cell-required"
                :class="{ 'cell-error': errors['linkedValue'] }">
                <el-option v-for="opt in linkedOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-tooltip>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="フラグ">
            <el-tooltip :content="errors['flagValue']" :disabled="!errors['flagValue']" placement="top" popper-class="tooltip-error">
              <el-checkbox
                :model-value="form.flagValue === 1"
                :class="{ 'cell-error': errors['flagValue'] }"
                @update:model-value="(val: boolean) => (form.flagValue = val ? 1 : 0)">
                有効
              </el-checkbox>
            </el-tooltip>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 備考（全幅） -->
      <el-form-item label="備考">
        <el-tooltip :content="errors['memoValue']" :disabled="!errors['memoValue']" placement="top" popper-class="tooltip-error">
          <el-input
            v-model="form.memoValue"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="備考を入力（500文字以内）"
            :class="{ 'cell-error': errors['memoValue'] }" />
        </el-tooltip>
      </el-form-item>

      <!-- ▼ 紐付けマスタ選択 ──────────────────── -->
      <el-divider content-position="left"><b>紐付けマスタ選択</b></el-divider>

      <!-- 検索条件 -->
      <el-row :gutter="16">
        <el-col :xs="24" :sm="10">
          <el-form-item label="コード" label-width="60px">
            <el-input
              v-model="masterSearchConditions.code"
              placeholder="コードを入力"
              clearable
              @keyup.enter="searchMasters" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="10">
          <el-form-item label="名称" label-width="60px">
            <el-input
              v-model="masterSearchConditions.name"
              placeholder="名称を入力"
              clearable
              @keyup.enter="searchMasters" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="4">
          <div class="flex gap-1 justify-end">
            <el-button size="small" type="primary" icon="Search" @click="searchMasters">検索</el-button>
            <el-button size="small" icon="RefreshLeft" @click="clearMasterSearch">クリア</el-button>
          </div>
        </el-col>
      </el-row>

      <!-- 検索結果テーブル -->
      <el-table
        v-if="masterSearchDone"
        :data="masterSearchResults"
        :row-class-name="masterRowClass"
        border
        size="small"
        max-height="240px">
        <el-table-column label="選択" width="58" align="center">
          <template #default="{ row }">
            <el-checkbox :model-value="isSelected(row)" @change="toggleMaster(row)" />
          </template>
        </el-table-column>
        <el-table-column prop="code" label="コード" width="120" />
        <el-table-column prop="name" label="名称"   min-width="160" />
      </el-table>
      <p v-else class="text-sm text-gray-400 mt-1">
        検索ボタンを押してマスタ一覧を表示してください。
      </p>

    </el-form>

    <!-- ▼ フッターボタン ──────────────────────── -->
    <template #footer>
      <div class="flex gap-2">
        <el-button v-if="!isEditMode" type="primary" icon="DocumentAdd"     @click="create">新規作成</el-button>
        <el-button v-if="isEditMode"  type="primary" icon="DocumentChecked" @click="update">変更</el-button>
        <el-button v-if="isEditMode"  type="danger"  icon="Delete"          @click="remove">削除</el-button>
        <el-button icon="Close" @click="close">キャンセル</el-button>
      </div>
    </template>
  </el-drawer>
</template>
