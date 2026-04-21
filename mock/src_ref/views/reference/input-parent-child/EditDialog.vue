<!--
  ============================================================
  入力画面サンプル（画面区分: 入力（親子）・ダイアログ版）
  ファイル名: input-parent-child/EditDialog.vue
  対応するUI仕様書: UI仕様書_＜画面ベース名＞_入力.md（画面区分: 入力（親子））
  ============================================================

  List.vue から dialogRef.value?.open(row) で呼び出す。
    open(null) → 新規登録モード
    open(row)  → 変更モード（MasterWithSubs を渡す）

  画面構成:
    - 親マスタ入力（コード・名称）
    - 子マスタ一括編集テーブル（行追加・変更・削除）
    - 保存時に親・子を中間に一括投入

  実業務への置き換えポイント:
    Master / SubMaster / MasterWithSubs → 実際の型名
    masterApi → 実際の API オブジェクト名
    タイトル文字列 → UI仕様書「画面タイトル」に展開
  ============================================================
-->
<script setup lang="ts">
import { ref, computed } from "vue";
import { ElLoading, ElMessage } from "element-plus";
import { handleBulkBusinessError, handleBusinessError, confirmMessageBox, TransactionType } from "mzfw";
import type { Master } from "@/types/master";
import type { SubMaster } from "@/types/subMaster";
import { masterApi } from "@/api/masterApi";
import type { SelectOption } from "mzfw";
import type { MasterWithSubs } from "@/api/masterApi";

// ─── Emits ───────────────────────────────────
const emit = defineEmits<{ (e: "saved"): void }>();

// ─── 拡張型 ──────────────────────────────────
type SubMasterEditRow = SubMaster & {
  transactionType: TransactionType;
  _errors?: Record<string, string>;
};

// ─── 状態 ────────────────────────────────────
const visible   = ref(false);
const saving    = ref(false);
const isNew     = computed(() => !dialogForm.value.id);
const dialogTitle = computed(() => (isNew.value ? "親マスタ 新規登録" : "親マスタ 編集"));

// ─── 親フォーム ──────────────────────────────
const emptyParent = (): Master => ({ code: "", name: "", version: 0 });
const dialogForm  = ref<Master>(emptyParent());
// code・name を事前宣言 → handleBusinessError がフォーム項目と認識して赤枠表示
// id 等の未宣言フィールドはモーダルで表示される
const parentErrors = ref<Record<string, string | undefined>>({ code: undefined, name: undefined });

// ─── 子テーブル ──────────────────────────────
const subRows = ref<SubMasterEditRow[]>([]);
const subSelectOptions = ref<SelectOption[]>([]);

// ─── 変更検知 ─────────────────────────────────
/** ダイアログを開いた時点のスナップショット（未保存ガード用） */
let originalJson = "";

const hasSubDirty = computed(() =>
  subRows.value.some((r) => r.transactionType !== TransactionType.NONE),
);
const isDirty = () =>
  hasSubDirty.value || JSON.stringify(dialogForm.value) !== originalJson;

// ─── 変更サマリ ───────────────────────────────
const subSummary = computed(() => {
  const a = subRows.value.filter((r) => r.transactionType === TransactionType.ADD).length;
  const u = subRows.value.filter((r) => r.transactionType === TransactionType.UPDATE).length;
  const d = subRows.value.filter((r) => r.transactionType === TransactionType.DELETE).length;
  return [a ? `追加:${a}件` : "", u ? `更新:${u}件` : "", d ? `削除:${d}件` : ""]
    .filter(Boolean).join(" / ");
});

// ─── 行スタイル ───────────────────────────────
const subRowClass = ({ row }: { row: SubMasterEditRow }) => {
  if (row.transactionType === TransactionType.DELETE) return "row-deleted";
  if (row.transactionType === TransactionType.ADD)    return "row-added";
  if (row.transactionType === TransactionType.UPDATE) return "row-updated";
  return "";
};

// ─── 公開: open() ────────────────────────────
/**
 * ダイアログを開く
 * @param master null=新規 / MasterWithSubs=編集
 */
const open = (master: MasterWithSubs | null = null) => {
  subSelectOptions.value = masterApi.getSubMasterOptions();
  parentErrors.value = { code: undefined, name: undefined };

  if (master) {
    const { subMasters, ...masterFields } = master;
    dialogForm.value = { ...masterFields };
    subRows.value = subMasters.map((s) => ({
      ...s,
      transactionType: TransactionType.NONE,
    }));
  } else {
    dialogForm.value = emptyParent();
    subRows.value = [];
  }

  originalJson = JSON.stringify(dialogForm.value);
  visible.value = true;
};
defineExpose({ open });

// ─── ダイアログを閉じる（未保存ガード） ─────────
const handleClose = async (done: () => void) => {
  if (isDirty()) {
    const ok = await confirmMessageBox("未保存の変更があります。閉じますか？");
    if (!ok) return;
  }
  done();
};

// ─── 子: セル変更マーク ──────────────────────
const markSubUpdated = (row: SubMasterEditRow) => {
  if (row.transactionType === TransactionType.NONE) row.transactionType = TransactionType.UPDATE;
  row._errors = undefined;
};

// ─── 子: 行追加 ──────────────────────────────
const addSubRow = () => {
  subRows.value.push({
    transactionType: TransactionType.ADD,
    masterCode: dialogForm.value.code,
    code: "",
    name: "",
    selectValue: "",
    version: 0,
  });
};

// ─── 子: 行削除 / 取消 ───────────────────────
const deleteSubRow = (row: SubMasterEditRow) => {
  if (row.transactionType === TransactionType.ADD) {
    subRows.value = subRows.value.filter((r) => r !== row);
  } else if (row.transactionType === TransactionType.DELETE) {
    row.transactionType = row.id ? TransactionType.NONE : TransactionType.ADD;
    row._errors = undefined;
  } else {
    row.transactionType = TransactionType.DELETE;
  }
};

// ─── 保存共通ロジック ─────────────────────────
const doSave = async (parentTxType: "A" | "U") => {
  saving.value = true;
  parentErrors.value = { code: undefined, name: undefined };
  subRows.value.forEach((r) => (r._errors = undefined));

  const loading = ElLoading.service();
  try {
    const parentRow = { ...dialogForm.value, transactionType: parentTxType };
    const dirtySubRows = subRows.value.filter((r) => r.transactionType !== TransactionType.NONE);
    dirtySubRows.forEach((r) => { r.masterCode = dialogForm.value.code; });

    // 親 + 子マスタを 1トランザクションで保存
    const savedParent = await masterApi.saveWithChildren(
      parentRow as Master & { transactionType: TransactionType },
      dirtySubRows as (SubMaster & { transactionType: TransactionType })[],
    );
    dialogForm.value = { ...savedParent };
    originalJson = JSON.stringify(dialogForm.value);

    ElMessage.success("保存しました");
    visible.value = false;
    emit("saved");
  } catch (err: any) {
    // 親フォームエラー（line なし）と子テーブルエラー（line あり）を 1 回の呼び出しで処理する
    // parentErrors に事前宣言されたフィールド = 親フォームの既知フィールド
    // → 既知フィールドは赤枠インライン、それ以外はモーダル表示
    const dirtySubRows = subRows.value.filter((r) => r.transactionType !== TransactionType.NONE);
    handleBulkBusinessError(
      err,
      [{ dirtyRows: dirtySubRows, allRows: subRows.value }],
      parentErrors.value,
    );
  } finally {
    loading.close();
    saving.value = false;
  }
};

// ─── 新規作成 / 変更 / 削除 ──────────────────
const create = () => doSave("A");
const update = () => doSave("U");

const remove = async () => {
  if (!(await confirmMessageBox("削除します。よろしいですか？"))) return;
  const loading = ElLoading.service();
  try {
    await masterApi.remove(dialogForm.value.id!, dialogForm.value.version ?? 0);
    ElMessage.success("削除しました");
    visible.value = false;
    emit("saved");
  } catch (error) {
    handleBusinessError(error, {});
  } finally {
    loading.close();
  }
};
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="800px"
    :before-close="handleClose"
    draggable>

    <el-form label-width="80px" size="small">

      <!-- 親マスタ入力 -->
      <el-divider content-position="left"><b>親マスタ</b></el-divider>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="コード *">
            <el-tooltip :content="parentErrors.code" :disabled="!parentErrors.code" placement="top" popper-class="tooltip-error">
              <el-input
                v-model="dialogForm.code"
                :disabled="!isNew"
                clearable
                class="cell-required"
                :class="{ 'cell-error': parentErrors.code }" />
            </el-tooltip>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="名称 *">
            <el-tooltip :content="parentErrors.name" :disabled="!parentErrors.name" placement="top" popper-class="tooltip-error">
              <el-input
                v-model="dialogForm.name"
                clearable
                class="cell-required"
                :class="{ 'cell-error': parentErrors.name }" />
            </el-tooltip>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 子マスタ一括編集 -->
      <el-divider content-position="left">
        <b>子マスタ</b>
        <span v-if="subSummary" class="ml-2 text-sm text-orange-500 font-bold">{{ subSummary }}</span>
      </el-divider>

      <el-table
        :data="subRows"
        :row-class-name="subRowClass"
        border
        size="small"
        max-height="320px">

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
        <el-table-column label="名称 *" min-width="160">
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

        <!-- 区分 -->
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
        <el-table-column label="" width="56" align="center">
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
        <el-button size="small" icon="Plus" @click="addSubRow"> 行追加 </el-button>
      </div>
    </el-form>

    <template #footer>
      <div class="flex gap-2">
        <el-button v-if="isNew"  type="primary" icon="DocumentAdd"      :loading="saving" @click="create"> 新規作成 </el-button>
        <el-button v-if="!isNew" type="primary" icon="DocumentChecked" :loading="saving" @click="update"> 変更 </el-button>
        <el-button v-if="!isNew" type="danger"  icon="Delete"                           @click="remove"> 削除 </el-button>
        <el-button icon="Close" @click="visible = false"> キャンセル </el-button>
      </div>
    </template>
  </el-dialog>
</template>
