<!--
  ============================================================
  一覧画面サンプル（画面区分: 一覧（参照））
  ファイル名: list-ref/List.vue
  対応するUI仕様書: UI仕様書_＜画面ベース名＞_一覧.md（画面区分: 一覧（参照））
  ============================================================

  特徴:
    - 新規作成・変更・削除は提供しない（参照専用）
    - 行の[詳細]ボタンで DetailDialog を開いて内容を確認できる
    - 検索・ページング・CSVダウンロードは提供

  実業務への置き換えポイント:
    各 xxxValue    → 業務フィールド名
    MainData  → 実際の型名
    referenceApi   → 実際の API オブジェクト名
    列定義・検索項目 → UI仕様書「一覧定義」「検索条件」に対応
  ============================================================
-->
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Pagination, formatDate, formatNumber, getLabel } from "mzfw";
import { ElLoading } from "element-plus";
import type { MainData, MainDataSearch } from "@/types/mainData";
import { referenceApi } from "@/api/referenceApi";
import type { SelectOption } from "mzfw";
import DetailDialog from "./DetailDialog.vue";

// ─── 詳細ダイアログ ──────────────────────────────
const dialogRef = ref<InstanceType<typeof DetailDialog>>();

// ─── 検索条件 ────────────────────────────────────
const searchDto = ref<MainDataSearch>({});

// ─── 一覧データ ──────────────────────────────────
const items = ref<MainData[]>([]);
const pagedItems = ref<MainData[]>([]);

// ─── 選択肢 ────────────────────────────────────
const selectOptions = ref<SelectOption[]>([]);

// ─── 検索実行 ────────────────────────────────────
const search = async () => {
  const loading = ElLoading.service();
  try {
    items.value = await referenceApi.list(searchDto.value);
  } finally {
    loading.close();
  }
};

// ─── クリア ─────────────────────────────────────
const clear = () => {
  searchDto.value = {};
  search();
};

// ─── 初期表示 ────────────────────────────────────
onMounted(async () => {
  selectOptions.value = referenceApi.getSelectOptions();
  await search();
});

// ─── 詳細ダイアログを開く ─────────────────────────
const openDetail = (row: MainData) => {
  dialogRef.value?.open(row.id!);
};
</script>

<template>
  <div class="max-w-1200px">
    <!-- ▼ タイトル行 ──────────────────────────── -->
    <el-row>
      <el-col :xs="24" :sm="24" class="screen-title">
        一覧（参照）
      </el-col>
    </el-row>

    <!-- ▼ 検索条件エリア ──────────────────────── -->
    <el-collapse model-value="search">
      <el-collapse-item name="search">
        <template #title><b>検索条件</b></template>
        <el-form :model="searchDto" label-width="100px">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="コード">
                <el-input v-model="searchDto.codeValue" placeholder="コードで絞り込み" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="名称">
                <el-input v-model="searchDto.nameValue" placeholder="名称で絞り込み" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="区分">
                <el-select v-model="searchDto.selectValue" placeholder="すべて" clearable style="width: 100%">
                  <el-option v-for="opt in selectOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <!-- 検索・クリアボタン（一覧（基本）と同じ配置） -->
          <el-row>
            <el-col :span="24">
              <div class="flex gap-2 mt-4">
                <el-button type="primary" icon="Search" @click="search()">検索</el-button>
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

        <Pagination :items="items" @update:pagedItems="pagedItems = $event" />

        <!-- 編集・削除ボタンなし（詳細アイコンのみ） -->
        <el-table :data="pagedItems" stripe class="mt-4">
          <!-- 詳細アイコン（一覧（基本）のアイコン列と同じスタイル） -->
          <el-table-column label="" width="35" class-name="icon-col">
            <template #default="{ row }">
              <el-icon style="cursor: pointer" @click="openDetail(row)"><ZoomIn /></el-icon>
            </template>
          </el-table-column>
          <el-table-column label="コード" prop="codeValue" width="120" />
          <el-table-column label="名称" prop="nameValue" min-width="160" />
          <el-table-column label="区分" width="130">
            <template #default="{ row }">{{ getLabel(selectOptions, row.selectValue) }}</template>
          </el-table-column>
          <el-table-column label="数値" width="110" align="right">
            <template #default="{ row }">
              {{ row.numericValue !== undefined ? formatNumber(row.numericValue) : "" }}
            </template>
          </el-table-column>
          <el-table-column label="日付" width="110">
            <template #default="{ row }">{{ formatDate(row.dateValue) }}</template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>
  </div>

  <!-- ▼ 詳細ダイアログ（読み取り専用） -->
  <DetailDialog ref="dialogRef" />
</template>
