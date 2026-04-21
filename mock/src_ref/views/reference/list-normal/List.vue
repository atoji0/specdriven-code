<!--
  ============================================================
  一覧画面サンプル（画面区分: 一覧（通常））
  ファイル名: list-normal/List.vue
  対応するUI仕様書: UI仕様書_＜画面ベース名＞_一覧.md（画面区分: 一覧（通常））
  ============================================================

  画面構成:
    - 検索条件エリア（折りたたみ可）
    - 検索結果一覧（ページング付き）
    - [選択] ボタン押下 → EditDialog.vue（入力ダイアログ）を開く
    - [新規作成] ボタン → 新規モードで EditDialog.vue を開く

  実装パターン一覧:
    テキスト系    → codeValue（部分一致）、nameValue（部分一致）
    数値系        → numericValue（From-To 範囲）
    日付系        → dateValue（From-To 範囲）
    固定値選択    → selectValue（el-select、固定値）
    マスタ参照    → masterValue（el-select、DBマスタから取得）
    連動マスタ    → linkedValue（masterValue 変更で選択肢が再取得）
    フラグ系      → flagValue（el-checkbox）
    テキストエリア→ memoValue（一覧では先頭50文字を表示）

  実業務への置き換えポイント:
    各 xxxValue → 業務フィールド名（例: codeValue → countryCode）
    MainData / MainDataSearch → 実際の型名
    referenceApi → 実際の API オブジェクト名
  ============================================================
-->
<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { Pagination } from "mzfw";
import { ElLoading } from "element-plus";
import { formatDate, formatNumber, getLabel } from "mzfw";
import type { MainData, MainDataSearch } from "@/types/mainData";
import { referenceApi } from "@/api/referenceApi";
import type { SelectOption } from "mzfw";
import EditDialog from "./EditDialog.vue";

// アイコンはグローバル登録済み → 個別 import 不要

// ─── データ・状態 ─────────────────────────────
const items = ref<MainData[]>([]);
const pagedItems = ref<MainData[]>([]);
const searchDto = ref<MainDataSearch>({});

// ─── 選択肢（バックエンドから取得） ──────────────
const selectOptions = ref<SelectOption[]>([]);
const masterOptions = ref<SelectOption[]>([]);
const linkedOptions = ref<SelectOption[]>([]);

// ─── 初期表示 ──────────────────────────────────
onMounted(async () => {
  await loadOptions();
  await search();
});

// ─── masterValue 変更 → linkedValue の選択肢を再取得 ─
watch(
  () => searchDto.value.masterValue,
  async (newMasterCode) => {
    searchDto.value.linkedValue = undefined;
    linkedOptions.value = [];
    if (newMasterCode) {
      await loadLinkedOptions(newMasterCode);
    }
  },
);

// ─── 選択肢取得 ─────────────────────────────────
const loadOptions = async () => {
  const loading = ElLoading.service();
  try {
    selectOptions.value = referenceApi.getSelectOptions(); // 固定値（同期）
    masterOptions.value = await referenceApi.getMasterOptions(); // マスタ参照（非同期）
  } finally {
    loading.close();
  }
};

const loadLinkedOptions = async (masterCode: string) => {
  const loading = ElLoading.service();
  try {
    linkedOptions.value = await referenceApi.getLinkedOptions(masterCode);
  } finally {
    loading.close();
  }
};

// ─── 検索 ───────────────────────────────────────
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
  linkedOptions.value = [];
  search();
};

// ─── ダイアログ ─────────────────────────────────
const dialogRef = ref<InstanceType<typeof EditDialog> | null>(null);
const openDialog = (row?: MainData) => dialogRef.value?.open(row?.id ?? null);

</script>

<template>
  <div class="max-w-1200px">
    <!-- ▼ タイトル行 ──────────────────────────── -->
    <el-row>
      <el-col :xs="24" :sm="12" class="screen-title">
        <!--  UI仕様書「画面タイトル」を設定（例: 商品マスタ管理）  -->
        一覧（基本）
      </el-col>
      <el-col :xs="24" :sm="12" class="flex justify-end">
        <el-button type="primary" icon="DocumentAdd" @click="openDialog()"> 新規作成 </el-button>
      </el-col>
    </el-row>

    <!-- ▼ 検索条件エリア ──────────────────────── -->
    <el-collapse model-value="search">
      <el-collapse-item name="search">
        <template #title><b>検索条件</b></template>
        <el-form :model="searchDto" label-width="130px">
          <el-row :gutter="16">
            <!-- テキスト系: 部分一致 -->
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="コード">
                <el-input v-model="searchDto.codeValue" placeholder="コードを入力" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="名称">
                <el-input v-model="searchDto.nameValue" placeholder="名称を入力" clearable />
              </el-form-item>
            </el-col>

            <!-- 数値系: From-To 範囲 -->
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="数値">
                <div class="flex gap-2 items-center">
                  <el-input
                    v-model="searchDto.numericValueFrom"
                    placeholder="From"
                    clearable
                    :formatter="formatNumber"
                    :parser="(v: string) => v.replace(/[^0-9]/g, '').slice(0, 10)"
                    class="numeric-input" />
                  <span>-</span>
                  <el-input
                    v-model="searchDto.numericValueTo"
                    placeholder="To"
                    clearable
                    :formatter="formatNumber"
                    :parser="(v: string) => v.replace(/[^0-9]/g, '').slice(0, 10)"
                    class="numeric-input" />
                </div>
              </el-form-item>
            </el-col>

            <!-- 日付系: From-To 範囲 -->
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="日付">
                <div class="flex gap-2 items-center">
                  <el-date-picker
                    v-model="searchDto.dateValueFrom"
                    placeholder="From"
                    format="YYYY/MM/DD"
                    value-format="YYYY-MM-DD"
                    clearable
                    class="flex-1"
                    style="width: auto" />
                  <span>-</span>
                  <el-date-picker
                    v-model="searchDto.dateValueTo"
                    placeholder="To"
                    format="YYYY/MM/DD"
                    value-format="YYYY-MM-DD"
                    clearable
                    class="flex-1"
                    style="width: auto" />
                </div>
              </el-form-item>
            </el-col>

            <!-- 固定値選択: バックエンドで管理された固定値 -->
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="固定値選択">
                <el-select v-model="searchDto.selectValue" placeholder="選択" clearable style="width: 100%">
                  <el-option v-for="opt in selectOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>

            <!-- マスタ参照選択: DBマスタから取得 -->
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="マスタ参照">
                <el-select v-model="searchDto.masterValue" placeholder="マスタを選択" clearable style="width: 100%">
                  <el-option v-for="opt in masterOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>

            <!-- 連動マスタ参照: masterValue に連動して選択肢が変わる -->
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="連動マスタ参照">
                <el-select
                  v-model="searchDto.linkedValue"
                  placeholder="連動マスタを選択"
                  clearable
                  :disabled="!searchDto.masterValue"
                  style="width: 100%">
                  <el-option v-for="opt in linkedOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>

            <!-- フラグ系: チェックボックス -->
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="フラグ">
                <el-checkbox v-model="searchDto.flagValue" :true-value="1" :false-value="undefined"> 有効のみ </el-checkbox>
              </el-form-item>
            </el-col>
          </el-row>

          <!-- 検索・クリアボタン -->
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

        <Pagination :items="items" @update:pagedItems="pagedItems = $event" />

        <el-table :data="pagedItems" stripe class="mt-4">
          <!-- 編集アイコン → EditDialog を開く -->
          <el-table-column label="" width="35" class-name="icon-col">
            <template #default="{ row }">
              <el-icon style="cursor: pointer" @click="openDialog(row)"><Edit /></el-icon>
            </template>
          </el-table-column>

          <!-- コード -->
          <el-table-column prop="codeValue" label="コード" width="120" />

          <!-- 名称 -->
          <el-table-column prop="nameValue" label="名称" min-width="160" />

          <!-- 数値系: 右寄せ・数値フォーマット -->
          <el-table-column label="数値" width="110" align="right">
            <template #default="{ row }">
              {{ row.numericValue !== undefined ? formatNumber(row.numericValue) : "" }}
            </template>
          </el-table-column>

          <!-- 日付系 -->
          <el-table-column label="日付" width="110">
            <template #default="{ row }">{{ formatDate(row.dateValue) }}</template>
          </el-table-column>

          <!-- 固定値選択: ラベルで表示 -->
          <el-table-column label="固定値選択" width="130">
            <template #default="{ row }">
              {{ getLabel(selectOptions, row.selectValue) }}
            </template>
          </el-table-column>

          <!-- マスタ参照: ラベルで表示 -->
          <el-table-column label="マスタ参照" width="130">
            <template #default="{ row }">
              {{ row.masterName }}
            </template>
          </el-table-column>

          <!-- 連動マスタ参照 -->
          <el-table-column prop="linkedValue" label="連動マスタ" width="120">
            <template #default="{ row }">
              {{ row.linkedName }}
            </template>
          </el-table-column>

          <!-- フラグ系: ✓ マーク -->
          <el-table-column label="フラグ" width="70" align="center">
            <template #default="{ row }">
              <span v-if="row.flagValue === 1" class="text-green-600 font-bold">✓</span>
            </template>
          </el-table-column>

          <!-- テキストエリア系: 先頭50文字 -->
          <el-table-column label="備考" min-width="200">
            <template #default="{ row }">
              <div class="whitespace-pre-wrap">
                {{ row.memoValue ? row.memoValue.substring(0, 50) + (row.memoValue.length > 50 ? "…" : "") : "" }}
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>
  </div>

  <!-- ▼ 編集ダイアログ（list-normal/EditDialog.vue） -->
  <EditDialog ref="dialogRef" @saved="search" />
</template>
