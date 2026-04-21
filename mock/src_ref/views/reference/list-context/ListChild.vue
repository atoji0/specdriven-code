<!--
  ============================================================
  一覧画面サンプル（画面区分: 一覧（コンテキスト））─ データ一覧
  ファイル名: list-context/ListChild.vue
  ============================================================

  画面構成:
    - 選択した区分（コンテキスト）をサマリとして上部に表示
    - その区分でフィルタしたデータ一覧
    - [区分変更] → ListParent.vue へ戻る
    - [新規作成] / 行アイコン → EditDialog.vue を開く

  実業務への置き換えポイント:
    parentSelectValue → 実際のコンテキストフィールド名
    MainData → 実際の型名
    referenceApi  → 実際の API オブジェクト名
  ============================================================
-->
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElLoading } from "element-plus";
import { Pagination, formatDate, formatNumber, getLabel } from "mzfw";
import type { MainData } from "@/types/mainData";
import { referenceApi } from "@/api/referenceApi";
import type { SelectOption } from "mzfw";
import EditDialog from "./EditDialog.vue";

// ─── ルーター / コンテキスト受け取り ────────────
const router = useRouter();
const route = useRoute();

// ★ Pinia ストアから受け取る場合はここを変更
const parentSelectValue = ref<string>(String(route.query.selectValue ?? ""));

// ─── データ ───────────────────────────────────
const items = ref<MainData[]>([]);
const pagedItems = ref<MainData[]>([]);

// ─── 選択肢（ラベル表示用） ─────────────────────
const selectOptions = ref<SelectOption[]>([]);

// ─── 初期表示 ──────────────────────────────────
onMounted(async () => {
  const loading = ElLoading.service();
  try {
    selectOptions.value = referenceApi.getSelectOptions();
    await search();
  } finally {
    loading.close();
  }
});

// ─── 検索（コンテキストの区分を必ず適用） ─────────
const search = async () => {
  const loading = ElLoading.service();
  try {
    items.value = await referenceApi.list({
      selectValue: parentSelectValue.value,
    });
  } finally {
    loading.close();
  }
};

// ─── 区分変更（親画面へ戻る） ─────────────────
const goToParent = () => {
  router.push("/ReferenceListContext");
};

// ─── ダイアログ ────────────────────────────────
const dialogRef = ref<InstanceType<typeof EditDialog> | null>(null);
const openDialog = (row?: MainData) =>
  dialogRef.value?.open(row?.id ?? null, parentSelectValue.value);
</script>

<template>
  <div class="max-w-1200px">
    <!-- ▼ タイトル行 ──────────────────────────── -->
    <el-row>
      <el-col :xs="24" :sm="12" class="screen-title">
        一覧（コンテキスト）
      </el-col>
      <el-col :xs="24" :sm="12" class="flex justify-end gap-2">
        <el-button icon="Setting" @click="goToParent">区分変更</el-button>
        <el-button type="primary" icon="DocumentAdd" @click="openDialog()">新規作成</el-button>
      </el-col>
    </el-row>

    <!-- ▼ コンテキストサマリ（表示専用） ─────── -->
    <el-card class="mt-2 mb-2" shadow="never">
      <div class="flex gap-6 text-sm">
        <span>区分：<b>{{ getLabel(selectOptions, parentSelectValue) }}</b></span>
      </div>
    </el-card>

    <!-- ▼ 検索結果エリア ──────────────────────── -->
    <el-collapse model-value="result">
      <el-collapse-item name="result">
        <template #title><b>検索結果</b></template>

        <Pagination :items="items" @update:pagedItems="pagedItems = $event" />

        <el-table :data="pagedItems" stripe class="mt-4">
          <!-- 編集アイコン（一覧（基本）と同じ） -->
          <el-table-column label="" width="35" class-name="icon-col">
            <template #default="{ row }">
              <el-icon style="cursor: pointer" @click="openDialog(row)"><Edit /></el-icon>
            </template>
          </el-table-column>

          <el-table-column prop="codeValue" label="コード" width="120" />
          <el-table-column prop="nameValue" label="名称" min-width="160" />
          <el-table-column label="数値" width="110" align="right">
            <template #default="{ row }">
              {{ row.numericValue !== undefined ? formatNumber(row.numericValue) : "" }}
            </template>
          </el-table-column>
          <el-table-column label="日付" width="110">
            <template #default="{ row }">{{ formatDate(row.dateValue) }}</template>
          </el-table-column>
          <!-- 区分（コンテキストで固定） -->
          <el-table-column label="区分" width="130">
            <template #default="{ row }">{{ getLabel(selectOptions, row.selectValue) }}</template>
          </el-table-column>
          <el-table-column label="フラグ" width="70" align="center">
            <template #default="{ row }">
              <span v-if="row.flagValue === 1" class="text-green-600 font-bold">✓</span>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>
  </div>

  <!-- ▼ 編集ダイアログ（list-context/EditDialog.vue） -->
  <EditDialog ref="dialogRef" @saved="search" />
</template>
