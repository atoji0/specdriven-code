<!--
  ============================================================
  入力画面サンプル（画面区分: 入力（マスタ選択ダイアログ版））
  ファイル名: select/EditDialog.vue
  ============================================================

  【このサンプルのポイント】
  プルダウンでは選択肢が多すぎるマスタを「選択ダイアログ」で選ぶパターン。

  単一選択（MasterSelectDialog）:
    - 親フォームの「マスタ参照」フィールドで使用
    - [選択] ボタン → ダイアログで検索 → 行クリックで即確定
    - @selected="(item: Master) => ..." で受け取り form.masterValue にセット

  複数選択（MasterMultiSelectDialog）:
    - 紐付けマスタの選択で使用
    - [追加] ボタン → ダイアログで検索・チェック → [選択して閉じる] で確定
    - @selected="(items: Master[]) => ..." で受け取り selectedMasters に追加
    - el-tag で選択済み一覧を表示 / × ボタンで個別削除

  データ設計:
    input-parent-child-select と同じ IndexedDB スキーマを共用。
    data ↔ master を surrogate key（id）で結合する中間テーブル（subData）使用。

  実業務への置き換えポイント:
    - Master / subDataApi / referenceApi → 実際の型名・API オブジェクト名
    - selectedMasterLabel の復元は masterApi.getById() 等で実装する
  ============================================================
-->
<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import { handleBusinessError, confirmMessageBox, formatNumber } from "mzfw";
import type { MainData } from "@/types/mainData";
import type { Master } from "@/types/master";
import { referenceApi } from "@/api/referenceApi";
import type { SelectOption } from "mzfw";
import { subDataApi } from "@/api/subDataApi";
import MasterSelectDialog from "../components/MasterSelectDialog.vue";
import MasterMultiSelectDialog from "../components/MasterMultiSelectDialog.vue";

// ─── Emits ───────────────────────────────────
const emit = defineEmits<{ (e: "saved"): void }>();

// ─── 内部状態 ────────────────────────────────
const visible = ref(false);
const editId  = ref<number | null>(null);

// ─── モード判定 ──────────────────────────────
const isEditMode  = computed(() => editId.value !== null);
const dialogTitle = computed(() =>
  isEditMode.value ? "データ編集（選択ダイアログ版）" : "データ新規登録（選択ダイアログ版）",
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
  flagValue:    0,
  memoValue:    "",
  version:      0,
});

const form   = ref<MainData>(emptyForm());
const errors = ref<Record<string, string>>({});

// ─── 選択肢 ──────────────────────────────────
const selectOptions = ref<SelectOption[]>([]);
const linkedOptions = ref<SelectOption[]>([]);

// ─── 単一選択: masterValue ────────────────────
// ダイアログで選択したマスタの表示テキスト（"コード　名称" 形式）
const selectedMasterLabel = ref("");

const masterSelectDialogRef = ref<InstanceType<typeof MasterSelectDialog> | null>(null);

// 単一選択ダイアログから呼ばれる
const onMasterSelected = (item: Master) => {
  form.value.masterValue    = item.code;
  selectedMasterLabel.value = `${item.code}　${item.name}`;
  // masterValue が変わったら連動先をリセット
  form.value.linkedValue = "";
};

const clearMaster = () => {
  form.value.masterValue    = "";
  selectedMasterLabel.value = "";
  form.value.linkedValue    = "";
  linkedOptions.value       = [];
};

// masterValue の変化に連動して linkedOptions を取得
watch(
  () => form.value.masterValue,
  async (val) => {
    linkedOptions.value = val ? await referenceApi.getLinkedOptions(val) : [];
  },
);

// ─── 複数選択: 紐付けマスタ ───────────────────
// 選択済みマスタ一覧（el-tag で表示・× で削除）
const selectedMasters = ref<Master[]>([]);

const masterMultiSelectDialogRef = ref<InstanceType<typeof MasterMultiSelectDialog> | null>(null);

// 複数選択ダイアログから呼ばれる
const onMultiMasterSelected = (items: Master[]) => {
  // 既存に含まれない id のみ追加（重複排除）
  const existingIds = new Set(selectedMasters.value.map((m) => m.id!));
  for (const item of items) {
    if (!existingIds.has(item.id!)) {
      selectedMasters.value.push(item);
    }
  }
};

const removeMaster = (master: Master) => {
  selectedMasters.value = selectedMasters.value.filter((m) => m.id !== master.id);
};

// ─── 初期化 ──────────────────────────────────
watch(visible, async (val) => {
  if (!val) return;
  errors.value       = {};
  selectOptions.value = await referenceApi.getSelectOptions();

  if (isEditMode.value) {
    const data = await subDataApi.get(editId.value!).catch(() => null);
    if (!data) {
      ElMessage.error("データが見つかりません");
      visible.value = false;
      return;
    }
    const { linkedMasters, ...dataFields } = data;
    form.value            = { ...dataFields };
    selectedMasters.value = [...linkedMasters];

    // masterValue に対応する表示ラベルを復元
    if (data.masterValue) {
      const allMasters = await subDataApi.searchMasters({});
      const found = allMasters.find((m) => m.code === data.masterValue);
      selectedMasterLabel.value = found
        ? `${found.code}　${found.name}`
        : data.masterValue;
    } else {
      selectedMasterLabel.value = "";
    }
  } else {
    form.value             = emptyForm();
    selectedMasters.value  = [];
    selectedMasterLabel.value = "";
    linkedOptions.value    = [];
  }
});

// ─── 閉じる ──────────────────────────────────
const close = () => (visible.value = false);

// ─── 新規作成 ────────────────────────────────
const create = async () => {
  errors.value = {};
  try {
    const masterIds = selectedMasters.value.map((m) => m.id!);
    await subDataApi.save({ ...form.value }, masterIds);
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
    const masterIds = selectedMasters.value.map((m) => m.id!);
    await subDataApi.save({ ...form.value }, masterIds);
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
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="900px"
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

      <!-- 行3: 固定値選択 / マスタ参照（★単一選択ダイアログ） -->
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
          <!--
            ★ 単一選択ダイアログパターン
            el-select の代わりに「選択ダイアログ（MasterSelectDialog）」で選ぶ。
            選択肢が多い・自由検索が必要なマスタに使用する。
          -->
          <el-form-item label="マスタ参照 *">
            <el-tooltip :content="errors['masterValue']" :disabled="!errors['masterValue']" placement="top" popper-class="tooltip-error">
              <div
                class="flex gap-1 w-full"
                :class="{ 'cell-error': errors['masterValue'] }">
                <el-input
                  :model-value="selectedMasterLabel"
                  readonly
                  clearable
                  placeholder="（未選択）"
                  class="cell-required flex-1"
                  @clear="clearMaster" />
                <el-button icon="Search" @click="masterSelectDialogRef?.open()">選択</el-button>
              </div>
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

      <!-- ▼ 紐付けマスタ選択（★複数選択ダイアログ） ─ -->
      <el-divider content-position="left"><b>紐付けマスタ選択</b></el-divider>

      <!--
        ★ 複数選択ダイアログパターン
        検索フォーム＋チェックボックステーブルの代わりに MasterMultiSelectDialog を使用。
        [追加] ボタン → ダイアログ → チェック → [選択して閉じる]
        選択済み一覧は el-tag で表示 / × ボタンで個別削除。
        複数回 [追加] しても重複は自動排除。
      -->
      <div class="flex items-center gap-3 mb-3">
        <span class="text-sm text-gray-500">
          {{ selectedMasters.length ? `${selectedMasters.length} 件選択中` : "（未選択）" }}
        </span>
        <el-button
          size="small"
          icon="Plus"
          type="primary"
          @click="masterMultiSelectDialogRef?.open()">
          追加
        </el-button>
      </div>

      <!-- 選択済みマスタ一覧 -->
      <div v-if="selectedMasters.length" class="flex flex-wrap gap-2 mb-4">
        <el-tag
          v-for="m in selectedMasters"
          :key="m.id"
          closable
          type="primary"
          @close="removeMaster(m)">
          {{ m.code }}　{{ m.name }}
        </el-tag>
      </div>
      <p v-else class="text-sm text-gray-400 mb-4">
        「追加」ボタンを押してマスタを選択してください。
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
  </el-dialog>

  <!-- ▼ 選択ダイアログ ─────────────────────── -->

  <!-- 単一選択: マスタ参照フィールド用 -->
  <MasterSelectDialog
    ref="masterSelectDialogRef"
    @selected="onMasterSelected" />

  <!-- 複数選択: 紐付けマスタ用 -->
  <MasterMultiSelectDialog
    ref="masterMultiSelectDialogRef"
    @selected="onMultiMasterSelected" />
</template>
