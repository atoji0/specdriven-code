<!--
  ============================================================
  入力画面サンプル（画面区分: 一覧（コンテキスト）・入力ダイアログ）
  ファイル名: list-context/EditDialog.vue
  対応するUI仕様書: UI仕様書_＜画面ベース名＞_入力.md（画面区分: 入力（基本））
  ============================================================

  ListChild.vue から dialogRef.value?.open(id) で呼び出す。
    open(null) → 新規登録モード
    open(id)   → 変更モード（id に対応するデータを取得）

  実業務への置き換えポイント:
    各 xxxValue → 業務フィールド名
    MainData → 実際の型名
    referenceApi  → 実際の API オブジェクト名
    タイトル文字列 → UI仕様書「画面タイトル」に展開
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
const emit = defineEmits<{ (e: "saved"): void }>();

// ─── 内部状態 ────────────────────────────────────
const visible = ref(false);
const editId = ref<number | null>(null);

// ─── モード判定 ─────────────────────────────────
const isEditMode = computed(() => editId.value !== null);
const dialogTitle = computed(() =>
  isEditMode.value ? "入力画面タイトル（変更）" : "入力画面タイトル（新規登録）",
);

// ─── コンテキスト（親画面から引き継ぎ） ────────────
const contextSelectValue = ref("");

// ─── 外部から呼ぶ open() ─────────────────────────
// contextSelectValue: ListChild から渡すコンテキスト区分
const open = (id: number | null = null, ctxSelectValue: string = "") => {
  editId.value = id;
  contextSelectValue.value = ctxSelectValue;
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
const errors = ref<Record<string, string>>({});

// ─── 選択肢 ────────────────────────────────────
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

// ─── ダイアログが開く時にフォームを初期化 ──────────
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
    form.value = { ...emptyForm(), selectValue: contextSelectValue.value };
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
  <el-dialog v-model="visible" :title="dialogTitle" width="600px" :close-on-click-modal="false">
    <!-- ▼ 入力フォーム（UI仕様書「入力項目定義」の項目に対応） -->
    <el-form :model="form" label-width="140px">
      <!-- 区分: コンテキストで確定済み → 先頭に表示・入力不可 -->
      <el-form-item label="区分">
        <el-select
          v-model="form.selectValue"
          disabled
          style="width: 100%">
          <el-option v-for="opt in selectOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </el-form-item>

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

      <!-- 数値 -->
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

      <!-- 日付 -->
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

      <!-- 固定値選択（通常入力箇所は非表示 - 上部で読取専用表示済み） -->
      <!-- selectValue はコンテキストで確定済みのため編集不可 -->

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

      <!-- フラグ -->
      <el-form-item label="フラグ">
        <el-checkbox
          :model-value="form.flagValue === 1"
          @update:model-value="(val: boolean) => (form.flagValue = val ? 1 : 0)">
          有効
        </el-checkbox>
      </el-form-item>

      <!-- テキストエリア -->
      <el-form-item label="備考">
        <el-input
          v-model="form.memoValue"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="備考を入力（500文字以内）" />
      </el-form-item>
    </el-form>

    <!-- ▼ フッターボタン -->
    <template #footer>
      <div class="flex gap-2">
        <el-button v-if="!isEditMode" type="primary" icon="DocumentAdd" @click="create">新規作成</el-button>
        <el-button v-if="isEditMode" type="primary" icon="DocumentChecked" @click="update">変更</el-button>
        <el-button v-if="isEditMode" type="danger" icon="Delete" @click="remove">削除</el-button>
        <el-button icon="Close" @click="close">キャンセル</el-button>
      </div>
    </template>
  </el-dialog>
</template>
