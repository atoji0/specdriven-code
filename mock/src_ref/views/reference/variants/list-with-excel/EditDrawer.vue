<!--
  ============================================================
  入力画面サンプル（Drawer版）- 右スライド 60%
  ファイル名: variants/list-with-excel/EditDrawer.vue
  対応するUI仕様書: UI仕様書_＜画面ベース名＞_入力.md（画面区分: 入力（基本）・ドロワー亜種）

  BasicListWithExcel.vue から呼び出すドロワー編集コンポーネント。
  BasicEditDialog.vue と同一のロジック・フォーム内容を
  el-drawer（右スライド 60%）に差し替えたもの。
  ============================================================
-->
<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import { handleBusinessError, confirmMessageBox } from "mzfw";
import { formatNumber } from "mzfw";
import type { MainData } from "@/types/mainData";
import { referenceApi } from "@/api/referenceApi";
import type { SelectOption } from "mzfw";

// ─── Emits ──────────────────────────────────────
const emit = defineEmits<{
  (e: "saved"): void;
}>();

// ─── 内部状態 ────────────────────────────────────
const visible = ref(false);
const editId = ref<number | null>(null);

// ─── モード判定 ─────────────────────────────────
const isEditMode = computed(() => editId.value !== null);
const drawerTitle = computed(() => (isEditMode.value ? "入力画面タイトル（変更）" : "入力画面タイトル（新規）"));

// ─── 外部から呼ぶ open() ─────────────────────────
const open = (id: number | null = null) => {
  editId.value = id;
  visible.value = true;
};
defineExpose({ open });

// ─── フォームデータ ─────────────────────────────
const emptyForm = (): MainData => ({
  codeValue: "",
  nameValue: "",
  numericValue: undefined,
  dateValue: new Date(),
  selectValue: "",
  masterValue: "",
  linkedValue: "",
  flagValue: 1,
  memoValue: undefined,
  version: 0,
});

const form = ref<MainData>(emptyForm());

// バックエンドバリデーションエラー
const errors = ref<Record<string, string>>({});

// ─── 選択肢（バックエンドから取得） ────────────────
const selectOptions = ref<SelectOption[]>([]);
const masterOptions = ref<SelectOption[]>([]);
const linkedOptions = ref<SelectOption[]>([]);

// ─── masterValue 変更 → linkedValue の選択肢を再取得 ─
watch(
  () => form.value.masterValue,
  async (newMasterCode) => {
    if (!newMasterCode) {
      linkedOptions.value = [];
      form.value.linkedValue = "";
      return;
    }
    linkedOptions.value = await referenceApi.getLinkedOptions(newMasterCode);
    if (!linkedOptions.value.some((o) => o.value === form.value.linkedValue)) {
      form.value.linkedValue = "";
    }
  },
);

// ─── Drawer が開く時にフォームを初期化 ─────────────
watch(visible, async (newVal) => {
  if (!newVal) return;
  errors.value = {};
  selectOptions.value = referenceApi.getSelectOptions();
  masterOptions.value = await referenceApi.getMasterOptions();

  if (isEditMode.value) {
    const data = await referenceApi.get(editId.value!).catch(() => null);
    if (!data) {
      ElMessage.error("データが見つかりません");
      visible.value = false;
      return;
    }
    form.value = { ...data };
    if (data.masterValue) {
      linkedOptions.value = await referenceApi.getLinkedOptions(data.masterValue);
    }
  } else {
    form.value = emptyForm();
    linkedOptions.value = [];
  }
});

// ─── 閉じる ─────────────────────────────────────
const close = () => (visible.value = false);

// ─── 新規作成 ────────────────────────────────────
const create = async () => {
  errors.value = {};
  try {
    await referenceApi.create(form.value);
    ElMessage.success("登録しました");
    emit("saved");
    close();
  } catch (error) {
    handleBusinessError(error, errors.value);
  }
};

// ─── 変更 ────────────────────────────────────────
const update = async () => {
  errors.value = {};
  try {
    await referenceApi.update(form.value.id!, form.value);
    ElMessage.success("更新しました");
    emit("saved");
    close();
  } catch (error) {
    handleBusinessError(error, errors.value);
  }
};

// ─── 削除 ────────────────────────────────────────
const remove = async () => {
  if (!(await confirmMessageBox("削除します。よろしいですか？"))) return;
  errors.value = {};
  try {
    await referenceApi.remove(form.value.id!, form.value.version);
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
    :title="drawerTitle"
    direction="rtl"
    size="60%"
    :close-on-click-modal="false">

    <!-- ▼ 入力フォーム ─────────────────────────── -->
    <el-form :model="form" label-width="140px">
      <!-- コード: 更新モードは読み取り専用 -->
      <el-form-item label="コード *">
        <el-tooltip :content="errors['codeValue']" :disabled="!errors['codeValue']" placement="top" popper-class="tooltip-error">
          <el-input
            v-model="form.codeValue"
            placeholder="コードを入力（半角英数字・10文字以内）"
            maxlength="10"
            :disabled="isEditMode"
            clearable
            class="cell-required"
            :class="{ 'cell-error': errors['codeValue'] }" />
        </el-tooltip>
      </el-form-item>

      <!-- 名称 -->
      <el-form-item label="名称 *">
        <el-tooltip :content="errors['nameValue']" :disabled="!errors['nameValue']" placement="top" popper-class="tooltip-error">
          <el-input
            v-model="form.nameValue"
            placeholder="名称を入力（50文字以内）"
            maxlength="50"
            clearable
            class="cell-required"
            :class="{ 'cell-error': errors['nameValue'] }" />
        </el-tooltip>
      </el-form-item>

      <!-- 数値: 3桁カンマ表示 -->
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

      <!-- 日付: YYYY/MM/DD 表示 -->
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

      <!-- 固定値選択 -->
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

      <!-- マスタ参照 -->
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

      <!-- 連動マスタ参照 -->
      <el-form-item label="連動マスタ参照 *">
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

      <!-- フラグ: 0=OFF / 1=ON -->
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

      <!-- テキストエリア: 備考 -->
      <el-form-item label="備考">
        <el-tooltip :content="errors['memoValue']" :disabled="!errors['memoValue']" placement="top" popper-class="tooltip-error">
          <el-input
            v-model="form.memoValue"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="備考を入力（500文字以内）"
            :class="{ 'cell-error': errors['memoValue'] }" />
        </el-tooltip>
      </el-form-item>
    </el-form>

    <!-- ▼ フッターボタン ────────────────────────── -->
    <template #footer>
      <div class="flex gap-2">
        <el-button v-if="!isEditMode" type="primary" icon="DocumentAdd" @click="create"> 新規作成 </el-button>
        <el-button v-if="isEditMode" type="primary" icon="DocumentChecked" @click="update"> 変更 </el-button>
        <el-button v-if="isEditMode" icon="Delete" type="danger" @click="remove"> 削除 </el-button>
        <el-button icon="Close" @click="close"> キャンセル </el-button>
      </div>
    </template>
  </el-drawer>
</template>
