<!--
  ============================================================
  参照一覧画面サンプル・Tabulator版（画面区分: 一覧（参照））
  ファイル名: variants/list-ref-tabulator/List.vue
  ============================================================

  list-ref/List.vue の Tabulator 版。
  編集機能は一切なく、高速スクロール・列幅調整が必要な場合に選択する。

  list-ref/List.vue（el-table版）との違い:
    - テーブルを el-table → Tabulator に置き換え
    - 列フィルタ・列幅ドラッグなど Tabulator 独自機能を活用
    - DetailDialog を開くボタンを Tabulator のカスタム列で実装

  実業務への置き換えポイント:
    各 xxxValue    → 業務フィールド名
    MainData  → 実際の型名
    referenceApi   → 実際の API オブジェクト名
    columns 定義   → UI仕様書「一覧定義」に対応
  ============================================================
-->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { ElLoading } from "element-plus";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";
import { formatDate, getLabel } from "mzfw";
import type { MainData, MainDataSearch } from "@/types/mainData";
import { referenceApi } from "@/api/referenceApi";
import type { SelectOption } from "mzfw";
import DetailDialog from "../../list-ref/DetailDialog.vue";

// ─── Tabulator インスタンス ───────────────────
const tableRef = ref<HTMLDivElement>();
let tabulator: Tabulator | null = null;

// ─── データ・状態 ─────────────────────────────
const searchDto = ref<MainDataSearch>({});

// ─── 選択肢 ──────────────────────────────────
const selectOptions = ref<SelectOption[]>([]);

// ─── 詳細ダイアログ ──────────────────────────
const dialogRef = ref<InstanceType<typeof DetailDialog>>();

// ─── 初期表示 ──────────────────────────────────
onMounted(async () => {
  selectOptions.value = referenceApi.getSelectOptions();
  await search();
});
onUnmounted(() => tabulator?.destroy());

// ─── 検索 ────────────────────────────────────────
const search = async () => {
  const loading = ElLoading.service();
  try {
    const res = await referenceApi.list(searchDto.value);
    initTabulator(res);
  } finally {
    loading.close();
  }
};

const clear = () => {
  searchDto.value = {};
  search();
};

// ─── Tabulator: 初期化 ───────────────────────────
const initTabulator = (data: MainData[]) => {
  if (!tableRef.value) return;
  tabulator?.destroy();

  tabulator = new Tabulator(tableRef.value, {
    data,
    layout: "fitDataFill",
    // height を指定しないことで自然な行高（改行対応）を有効化
    pagination: true,
    paginationSize: 50,
    paginationSizeSelector: [20, 50, 100],
    // 列ヘッダにフィルタを追加（参照一覧で役立つ）
    headerFilterLiveFilterDelay: 200,
    columns: [
      // ── 参照アイコン ──
      {
        title: "",
        field: "id",
        width: 40,
        hozAlign: "center",
        headerSort: false,
        editable: false,
        formatter: () =>
          `<span style="cursor:pointer;color:#409eff;display:inline-flex;align-items:center">
            <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor">
              <path d="M795.904 750.72l124.992 124.928a32 32 0 0 1-45.248 45.248L750.656 795.904a416 416 0 1 1 45.248-45.248zM480 832a352 352 0 1 0 0-704 352 352 0 0 0 0 704zm-32-384v-96a32 32 0 0 1 64 0v96h96a32 32 0 0 1 0 64h-96v96a32 32 0 0 1-64 0v-96h-96a32 32 0 0 1 0-64h96z"/>
            </svg>
          </span>`,
        cellClick: (_e, cell) => {
          const row = cell.getRow().getData() as MainData;
          if (row.id != null) dialogRef.value?.open(row.id);
        },
      },
      // ── コード ──
      {
        title: "コード",
        field: "codeValue",
        width: 130,
        headerFilter: "input",
        editable: false,
      },
      // ── 名称 ──
      {
        title: "名称",
        field: "nameValue",
        minWidth: 160,
        headerFilter: "input",
        editable: false,
      },
      // ── 区分 ──
      {
        title: "区分",
        field: "selectValue",
        width: 130,
        editable: false,
        formatter: (cell) => {
          const v = String(cell.getValue() ?? "");
          return getLabel(selectOptions.value, v) ?? v;
        },
        // ヘッダフィルタにラベル変換後の値で絞り込む辞書を渡す（Tabulator v6以降は headerFilterFunc で制御）
        headerFilter: "input",
        headerFilterFunc: (headerValue: string, rowValue: string) =>
          getLabel(selectOptions.value, rowValue)?.includes(headerValue) ?? false,
      },
      // ── 数値 ──
      {
        title: "数値",
        field: "numericValue",
        width: 120,
        hozAlign: "right",
        editable: false,
        formatter: (cell) => {
          const v = cell.getValue();
          return v != null ? Number(v).toLocaleString("ja-JP") : "";
        },
      },
      // ── 日付 ──
      {
        title: "日付",
        field: "dateValue",
        width: 140,
        editable: false,
        formatter: (cell) => formatDate(cell.getValue()),
        headerFilter: "input",
      },
      // ── マスタ参照 ──
      {
        title: "マスタ参照",
        field: "masterName",
        width: 140,
        editable: false,
        headerFilter: "input",
      },
      // ── 連動マスタ ──
      {
        title: "連動マスタ",
        field: "linkedName",
        width: 140,
        editable: false,
        headerFilter: "input",
      },
      // ── フラグ ──
      {
        title: "フラグ",
        field: "flagValue",
        width: 80,
        hozAlign: "center",
        editable: false,
        formatter: (cell) => (cell.getValue() === 1 ? "✓" : ""),
      },
      // ── 備考 ──
      {
        title: "備考",
        field: "memoValue",
        minWidth: 200,
        editable: false,
        headerFilter: "input",
        formatter: (cell) => {
          const v = String(cell.getValue() ?? "");
          const truncated = v.length > 50 ? v.substring(0, 50) + "…" : v;
          return truncated.replace(/\n/g, "<br>");
        },
      },
    ],
  });
};
</script>

<template>
  <div class="max-w-1600px">
    <!-- ▼ タイトル行 ──────────────────────────── -->
    <el-row>
      <el-col :xs="24" :sm="24" class="screen-title">
        一覧（参照・Tabulator版）
      </el-col>
    </el-row>

    <!-- ▼ 検索条件エリア（一覧（基本）と同じ構成） -->
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
          <!-- 検索・クリアボタン -->
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

    <!-- ▼ 検索結果エリア -->
    <el-collapse model-value="result">
      <el-collapse-item name="result">
        <template #title><b>検索結果</b></template>
        <!--
          Tabulator テーブル領域
          ヘッダフィルタで各列ごとの絞り込みが可能。
          列幅はドラッグで変更可能。
        -->
        <div ref="tableRef" class="mt-4" />
      </el-collapse-item>
    </el-collapse>
  </div>

  <!-- ▼ 詳細ダイアログ（読み取り専用・list-ref/DetailDialog.vue を共用） -->
  <DetailDialog ref="dialogRef" />
</template>
