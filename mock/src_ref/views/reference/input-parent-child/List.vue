<!--
  ============================================================
  一覧画面サンプル（画面区分: 入力（親子））
  ファイル名: input-parent-child/List.vue
  対応するUI仕様書: UI仕様書_＜画面ベース名＞_一覧.md（画面区分: 入力（親子））
  ============================================================

  画面構成:
    - 親マスタの検索条件（クライアントフィルタ）
    - 親マスタ一覧（[選択]は親＋全子をダイアログで一括編集）
    - [新規作成] → EditDialog.vue（新規モード）

  実業務への置き換えポイント:
    MasterWithSubs / masterApi → 実際の型名・API オブジェクト名
  ============================================================
-->
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Pagination } from "mzfw";
import { ElLoading } from "element-plus";
import type { MasterWithSubs } from "@/api/masterApi";
import { masterApi } from "@/api/masterApi";
import EditDialog from "./EditDialog.vue";

// ─── データ ──────────────────────────────────
const items = ref<MasterWithSubs[]>([]);
const pagedItems = ref<MasterWithSubs[]>([]);

// ─── 検索条件 ─────────────────────────────────
const searchCode = ref("");
const searchName = ref("");

// ─── フィルタリング（クライアントサイド） ─────────
const filteredItems = computed(() =>
  items.value.filter((m) => {
    const codeMatch = !searchCode.value || m.code.includes(searchCode.value);
    const nameMatch = !searchName.value || m.name.includes(searchName.value);
    return codeMatch && nameMatch;
  }),
);

// ─── 初期表示 ─────────────────────────────────
onMounted(async () => {
  await loadList();
});

// ─── 一覧読み込み ──────────────────────────────
const loadList = async () => {
  const loading = ElLoading.service();
  try {
    items.value = await masterApi.listWithChildren();
  } finally {
    loading.close();
  }
};

// ─── 検索（クライアントフィルタなので再描画を促すだけ） ──
// filteredItems は computed で自動更新されるため、ボタンは UI 一貫性のために配置
const search = () => {/* filteredItems が computed で随時反映 */};

// ─── クリア ───────────────────────────────────
const clear = () => {
  searchCode.value = "";
  searchName.value = "";
};

// ─── ダイアログ ───────────────────────────────
const dialogRef = ref<InstanceType<typeof EditDialog> | null>(null);
const openDialog = (row: MasterWithSubs | null = null) => dialogRef.value?.open(row);
</script>

<template>
  <div class="max-w-800px">
    <!-- ▼ タイトル行 ──────────────────────────── -->
    <el-row>
      <el-col :xs="24" :sm="12" class="screen-title">
        親子メンテ（ダイアログ）
      </el-col>
      <el-col :xs="24" :sm="12" class="flex justify-end">
        <el-button type="primary" icon="DocumentAdd" @click="openDialog()"> 新規作成 </el-button>
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
                <el-button type="primary" icon="Search" @click="search">検索</el-button>
                <el-button icon="RefreshLeft" @click="clear">クリア</el-button>
              </div>
            </el-col>
          </el-row>
        </el-form>
      </el-collapse-item>
    </el-collapse>
    <el-divider class="my-0" />
    <!-- ▼ 検索結果エリア ──────────────────────── -->
    <el-collapse model-value="result">
      <el-collapse-item name="result">
        <template #title><b>検索結果</b></template>

        <Pagination :items="filteredItems" @update:pagedItems="pagedItems = $event" />

        <el-table :data="pagedItems" stripe class="mt-4">
          <!-- 編集アイコン → EditDialog を開く -->
          <el-table-column label="" width="35" class-name="icon-col">
            <template #default="{ row }">
              <el-icon style="cursor: pointer" @click="openDialog(row)"><Edit /></el-icon>
            </template>
          </el-table-column>

          <!-- コード -->
          <el-table-column prop="code" label="コード" width="140" />

          <!-- 名称 -->
          <el-table-column prop="name" label="名称" width="200" />

          <!-- 子マスタ -->
          <el-table-column label="子マスタ（コード 名称）" min-width="240">
            <template #default="{ row }">
              <div
                v-for="sub in row.subMasters"
                :key="sub.code"
                class="leading-snug whitespace-nowrap">
                {{ sub.code }}&nbsp;{{ sub.name }}
              </div>
              <span v-if="!row.subMasters?.length" class="text-gray-400 text-sm">（なし）</span>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>
  </div>

  <!-- ▼ 編集ダイアログ ──────────────────────── -->
  <EditDialog ref="dialogRef" @saved="loadList" />
</template>
