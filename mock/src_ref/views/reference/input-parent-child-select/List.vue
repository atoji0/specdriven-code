<!--
  ============================================================
  一覧画面サンプル（画面区分: 入力（親子選択））
  ファイル名: input-parent-child-select/List.vue
  ============================================================

  画面構成:
    - データ一覧（紐付きマスタ名を表示）
    - [選択] → EditDialog.vue（親データ編集 + マスタ選択ダイアログ）
    - [新規作成] → 新規モードで EditDialog.vue を開く

  データ設計ポイント:
    data ↔ master を surrogate key（id）で結合する 1:N 中間テーブル（subData）を使用。
    コード変更による参照整合性破壊が発生しない。

  実業務への置き換えポイント:
    DataWithSubData / subDataApi → 実際の型名・API オブジェクト名
  ============================================================
-->
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Pagination } from "mzfw";
import { ElLoading } from "element-plus";
import type { DataWithSubData } from "@/types/mainData";
import { subDataApi } from "@/api/subDataApi";
import EditDialog from "./EditDialog.vue";

// ─── データ ──────────────────────────────────
const items      = ref<DataWithSubData[]>([]);
const pagedItems = ref<DataWithSubData[]>([]);

// ─── 検索条件 ─────────────────────────────────
const searchCode = ref("");
const searchName = ref("");

// ─── クライアントフィルタ ─────────────────────
const filteredItems = computed(() =>
  items.value.filter((d) => {
    const codeMatch = !searchCode.value || d.codeValue.toLowerCase().includes(searchCode.value.toLowerCase());
    const nameMatch = !searchName.value || d.nameValue.includes(searchName.value);
    return codeMatch && nameMatch;
  }),
);

// ─── 初期表示 ─────────────────────────────────
onMounted(() => loadList());

const loadList = async () => {
  const loading = ElLoading.service();
  try {
    items.value = await subDataApi.list();
  } finally {
    loading.close();
  }
};

const search = () => { /* filteredItems が computed で随時反映 */ };
const clear  = () => { searchCode.value = ""; searchName.value = ""; };

// ─── ダイアログ ───────────────────────────────
const dialogRef = ref<InstanceType<typeof EditDialog> | null>(null);
const openDialog = (row: DataWithSubData | null = null) => dialogRef.value?.open(row?.id ?? null);
</script>

<template>
  <div class="max-w-900px">
    <!-- タイトル行 -->
    <el-row>
      <el-col :xs="24" :sm="16" class="screen-title">
        データ ↔ マスタ 親子選択メンテ
      </el-col>
      <el-col :xs="24" :sm="8" class="flex justify-end">
        <el-button type="primary" icon="DocumentAdd" @click="openDialog()">新規作成</el-button>
      </el-col>
    </el-row>

    <!-- 検索条件 -->
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
          <div class="flex gap-2 mt-4">
            <el-button type="primary" icon="Search" @click="search">検索</el-button>
            <el-button icon="RefreshLeft" @click="clear">クリア</el-button>
          </div>
        </el-form>
      </el-collapse-item>
    </el-collapse>
    <el-divider class="my-0" />

    <!-- 検索結果 -->
    <el-collapse model-value="result">
      <el-collapse-item name="result">
        <template #title><b>検索結果</b></template>

        <Pagination :items="filteredItems" @update:pagedItems="pagedItems = $event" />

        <el-table :data="pagedItems" stripe class="mt-4">
          <!-- 編集アイコン -->
          <el-table-column label="" width="35" class-name="icon-col">
            <template #default="{ row }">
              <el-icon style="cursor: pointer" @click="openDialog(row)"><Edit /></el-icon>
            </template>
          </el-table-column>

          <el-table-column prop="codeValue" label="コード" width="120" />
          <el-table-column prop="nameValue" label="名称"   width="180" />

          <!-- 紐付きマスタ（1:N・サロゲートキー結合） -->
          <el-table-column label="紐付きマスタ" min-width="260">
            <template #default="{ row }: { row: DataWithSubData }">
              <div v-if="row.linkedMasters.length" class="flex flex-wrap gap-1">
                <el-tag
                  v-for="m in row.linkedMasters"
                  :key="m.id"
                  size="small"
                  type="primary">
                  {{ m.code }} {{ m.name }}
                </el-tag>
              </div>
              <span v-else class="text-gray-400 text-sm">（未選択）</span>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>
  </div>

  <!-- 編集ダイアログ -->
  <EditDialog ref="dialogRef" @saved="loadList" />
</template>
