<!--
  ============================================================
  一覧画面サンプル（Excel ダウンロード / アップロード付き）
  ファイル名: variants/list-with-excel/List.vue
  対応するUI仕様書: UI仕様書_＜画面ベース名＞_一覧.md（画面区分: 一覧（通常）・Excel亜種）
  ============================================================

  BasicList.vue の構成をベースに Excel 一括操作を追加したサンプル。
  Excel 関連以外はすべて BasicList.vue と同一の実装。

  Excel 列構成（1-indexed）:
    1: transactionType  A=新規 / U=更新 / D=削除（アップロード時に指定）
    2: id              ※hidden（更新・削除時の識別用）
    3: codeValue
    4: nameValue
    5: numericValue
    6: dateValue       YYYY-MM-DD 文字列
    7: selectValue
    8: masterValue
    9: linkedValue
   10: flagValue       0 or 1
   11: memoValue
   12: version         ※hidden（楽観ロック用）
   13: errorMessage    ※自動付与（アップロードエラー出力用）

  アップロード処理方針:
    - transactionType が空の行はスキップ
    - バリデーションはすべてバックエンド側（referenceApi.saveAll）で実施
    - エラーは exportExcelErrors で最終列に出力
  ============================================================
-->
<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { Pagination, Excel, formatDate, formatNumber, getLabel } from "mzfw";
import { TransactionType } from "mzfw";
import type { ExcelColumnDefinition } from "mzfw";
import { ElLoading } from "element-plus";
import type { UploadFile } from "element-plus";
import type { MainData, MainDataSearch } from "@/types/mainData";
import { referenceApi } from "@/api/referenceApi";
import type { SelectOption } from "mzfw";
import BasicEditDrawer from "./EditDrawer.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// ──────────────────────────────────────────────
// Excel 列定義
// transactionType を含む拡張型を局所定義
// ──────────────────────────────────────────────
type MainDataExcel = MainData & { transactionType?: string };

const excelColumns: ExcelColumnDefinition<MainDataExcel>[] = [
  { key: "transactionType", label: "A/U/D",      width: 8  },
  { key: "id",              hidden: true                   },
  { key: "codeValue",       label: "コード",      width: 15 },
  { key: "nameValue",       label: "名称",        width: 30 },
  { key: "numericValue",    label: "数値",        width: 12 },
  { key: "dateValue",       label: "日付",        width: 14 },
  { key: "selectValue",     label: "固定値選択",  width: 14 },
  { key: "masterValue",     label: "マスタ参照",  width: 14 },
  { key: "linkedValue",     label: "連動マスタ",  width: 14 },
  { key: "flagValue",       label: "フラグ",      width: 8  },
  { key: "memoValue",       label: "備考",        width: 40 },
  { key: "version",         hidden: true                   },
];

// errorMessage は generateExcelTemplate が自動付与（列13）
const ERROR_COL = 13;

// ─── データ・状態 ─────────────────────────────
const items = ref<MainData[]>([]);
const pagedItems = ref<MainData[]>([]);
const searchDto = ref<MainDataSearch>({});
// ★ uploadKey: el-upload に :key="uploadKey" でバインドし、アップロードのたびに ++ する
//              → 同一ファイルを連続してアップロードできるようになる
const uploadKey = ref(0);

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

// ─── Drawer ─────────────────────────────────
const dialogRef = ref<InstanceType<typeof BasicEditDrawer> | null>(null);
const openDialog = (row?: MainData) => dialogRef.value?.open(row?.id ?? null);

// ──────────────────────────────────────────────
// Excel ダウンロード
// ──────────────────────────────────────────────
const downloadExcel = async () => {
  const loading = ElLoading.service();
  try {
    const rows = items.value.map((item) => [
      "",                      // col 1: transactionType（空）
      item.id ?? "",           // col 2: id（hidden）
      item.codeValue,          // col 3
      item.nameValue,          // col 4
      item.numericValue ?? "", // col 5
      item.dateValue ? formatDate(item.dateValue) : "", // col 6
      item.selectValue,        // col 7
      item.masterValue,        // col 8
      item.linkedValue,        // col 9
      item.flagValue,          // col 10
      item.memoValue ?? "",    // col 11
      item.version,            // col 12（hidden）
      "",                      // col 13: errorMessage（罫線維持用）
    ]);
    const { workbook, worksheet } = await Excel.generateExcelTemplate(excelColumns, "Reference");
    await Excel.saveExcel(workbook, worksheet, rows, "reference_data.xlsx");
  } finally {
    loading.close();
  }
};

// ──────────────────────────────────────────────
// Excel アップロード
// transactionType が設定された行のみ抽出してバックエンドに一括送信。
// バリデーションはすべてバックエンド側で行い、エラーは exportExcelErrors で出力する。
// ──────────────────────────────────────────────
const uploadExcel = async (file: UploadFile) => {
  const loading = ElLoading.service();
  const { workbook, rows } = await Excel.loadExcelFile(t, file);
  uploadKey.value++; // el-upload をリセットして同一ファイルの再選択を可能にする

  try {
    const data = rows
      .map((row) => ({
        transactionType: (row.getCell(1).value as string | null)?.trim() ?? "",
        id:           Number(row.getCell(2).value) || undefined,
        codeValue:    String(row.getCell(3).value ?? ""),
        nameValue:    String(row.getCell(4).value ?? ""),
        numericValue: row.getCell(5).value != null ? Number(row.getCell(5).value) : undefined,
        // ★ 日付セル: ExcelJS は Date オブジェクトで返すので new Date() でキャスト
        //             文字列で保持したい場合は formatDate() で「YYYY-MM-DD」に変換する
        dateValue:    row.getCell(6).value ? new Date(row.getCell(6).value as string) : new Date(),
        selectValue:  String(row.getCell(7).value ?? ""),
        masterValue:  String(row.getCell(8).value ?? ""),
        linkedValue:  String(row.getCell(9).value ?? ""),
        flagValue:    Number(row.getCell(10).value ?? 0),
        memoValue:    row.getCell(11).value != null ? String(row.getCell(11).value) : undefined,
        version:      Number(row.getCell(12).value ?? 0),
      }))
      .filter((item) => !!item.transactionType);

    await referenceApi.saveAll(data as (MainData & { transactionType: TransactionType })[]);
    Excel.exportExcelResult(t, rows);
    await search();
  } catch (error) {
    Excel.exportExcelErrors(t, workbook, error, rows, "error_reference_data.xlsx", ERROR_COL);
  } finally {
    loading.close();
  }
};
</script>

<template>
  <div class="max-w-1200px">
    <!-- ▼ タイトル行 ──────────────────────────── -->
    <el-row>
      <el-col :xs="24" :sm="12" class="screen-title">
        一覧（Excel対応）
      </el-col>
      <el-col :xs="24" :sm="12" class="flex justify-end">
        <el-button type="primary" icon="DocumentAdd" @click="openDialog()"> 新規作成 </el-button>
        <el-upload
          :key="uploadKey"
          class="ml-4"
          :on-change="uploadExcel"
          :show-file-list="false"
          accept=".xlsx"
          :auto-upload="false"
        >
          <el-button icon="Upload"> アップロード </el-button>
        </el-upload>
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
                <el-button icon="Download" @click="downloadExcel"> ダウンロード </el-button>
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
          <!-- 編集ボタン（編集ダイアログを開く） -->
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

          <!-- マスタ参照 -->
          <el-table-column label="マスタ参照" width="130">
            <template #default="{ row }">
              {{ row.masterName ?? row.masterValue }}
            </template>
          </el-table-column>

          <!-- 連動マスタ参照 -->
          <el-table-column label="連動マスタ" width="120">
            <template #default="{ row }">
              {{ row.linkedName ?? row.linkedValue }}
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

  <!-- ▼ 編集 Drawer（右スライド 60%） ───────────── -->
  <BasicEditDrawer ref="dialogRef" @saved="search" />
</template>
