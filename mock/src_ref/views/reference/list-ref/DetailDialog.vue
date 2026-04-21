<!--
  ============================================================
  詳細ダイアログ（画面区分: 一覧（参照） - 詳細表示）
  ファイル名: list-ref/DetailDialog.vue
  対応するUI仕様書: UI仕様書_＜画面ベース名＞_一覧.md（画面区分: 一覧（参照））
  ============================================================

  参照専用のダイアログ。
    - 全 el-input / el-select / el-date-picker は disabled
    - フッターには [閉じる] ボタンのみ（変更・削除なし）

  List.vue から dialogRef.value?.open(id) で呼び出す。

  実業務への置き換えポイント:
    各 xxxValue    → 業務フィールド名
    MainData  → 実際の型名
    referenceApi   → 実際の API オブジェクト名
    タイトル文字列  → UI仕様書「画面タイトル」に対応
  ============================================================
-->
<script setup lang="ts">
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { formatNumber, formatDate } from "mzfw";
import type { MainData } from "@/types/mainData";
import { referenceApi } from "@/api/referenceApi";
import type { SelectOption } from "mzfw";

// ─── 内部状態 ────────────────────────────────────
const visible = ref(false);
const detailId = ref<number | null>(null);

// ─── 外部から呼ぶ open() ─────────────────────────
const open = (id: number) => {
  detailId.value = id;
  visible.value = true;
};
defineExpose({ open });

// ─── 表示データ ──────────────────────────────────
const form = ref<Partial<MainData>>({});;

// ─── 選択肢 ────────────────────────────────────
const selectOptions = ref<SelectOption[]>([]);
const masterOptions = ref<SelectOption[]>([]);
const linkedOptions = ref<SelectOption[]>([]);

// ─── ダイアログが開く時にデータを取得 ────────────
watch(visible, async (newVal) => {
  if (!newVal) return;
  selectOptions.value = referenceApi.getSelectOptions();
  masterOptions.value = await referenceApi.getMasterOptions();

  const data = await referenceApi.get(detailId.value!).catch(() => null);
  if (!data) {
    ElMessage.error("データが見つかりません");
    visible.value = false;
    return;
  }
  form.value = { ...data };
  if (data.masterValue) {
    linkedOptions.value = await referenceApi.getLinkedOptions(data.masterValue);
  }
});

// ─── 閉じる ─────────────────────────────────────
const close = () => (visible.value = false);
</script>

<template>
  <el-dialog v-model="visible" title="詳細参照画面タイトル" width="600px" :close-on-click-modal="true">
    <!-- ▼ 参照用 descriptions（全項目テキスト表示） -->
    <el-descriptions :column="1" border label-width="140px">
      <el-descriptions-item label="コード">{{ form.codeValue }}</el-descriptions-item>
      <el-descriptions-item label="名称">{{ form.nameValue }}</el-descriptions-item>
      <el-descriptions-item label="数値">{{ formatNumber(form.numericValue?.toString()) }}</el-descriptions-item>
      <el-descriptions-item label="日付">{{ form.dateValue ? formatDate(form.dateValue) : "" }}</el-descriptions-item>
      <el-descriptions-item label="区分">{{ selectOptions.find(o => o.value === form.selectValue)?.label ?? "" }}</el-descriptions-item>
      <el-descriptions-item label="マスタ参照">{{ masterOptions.find(o => o.value === form.masterValue)?.label ?? "" }}</el-descriptions-item>
      <el-descriptions-item label="連動マスタ">{{ linkedOptions.find(o => o.value === form.linkedValue)?.label ?? "" }}</el-descriptions-item>
      <el-descriptions-item label="フラグ">{{ form.flagValue === 1 ? "有効" : "無効" }}</el-descriptions-item>
      <el-descriptions-item label="備考">
        <span style="white-space: pre-wrap">{{ form.memoValue }}</span>
      </el-descriptions-item>
    </el-descriptions>

    <!-- ▼ フッター: [閉じる]のみ -->
    <template #footer>
      <div class="flex gap-2">
        <el-button icon="Close" @click="close">閉じる</el-button>
      </div>
    </template>
  </el-dialog>
</template>
