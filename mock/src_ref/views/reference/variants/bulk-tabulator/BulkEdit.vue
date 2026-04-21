<!--
  ============================================================
  一括更新画面サンプル・Tabulator版（画面区分: 入力（一括））
  ファイル名: variants/bulk-tabulator/BulkEdit.vue
  対応するUI仕様書: UI仕様書_＜画面ベース名＞_入力.md（画面区分: 入力（一括））
  ============================================================

  BasicBulkEdit.vue の Tabulator 版。
  transactionType（A/U/D/""）で行の状態を管理する。

  BasicBulkEdit.vue との違い:
    - テーブルを el-table → Tabulator に置き換え
    - セルのインライン編集は Tabulator のエディタを使用
    - 削除時は行を消さず transactionType="D" でグレーアウト
    - エラー表示は data-error 属性で mzfw CSS が自動適用

  実業務への置き換えポイント:
    各 xxxValue → 業務フィールド名
    MainData / MainDataSearch → 実際の型名
    referenceApi → 実際の API オブジェクト名
  ============================================================
-->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { ElLoading, ElMessage } from "element-plus";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import type { CellComponent } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";
import { handleBusinessError, confirmMessageBox, TransactionType } from "mzfw";
import type { MainData, MainDataSearch } from "@/types/mainData";
import { referenceApi } from "@/api/referenceApi";
import type { SelectOption } from "mzfw";

// ─── 拡張型: 編集中の行管理用 ───────────────────

type EditRow = MainData & {
  transactionType: TransactionType;
  _errors?: Record<string, string>;
};

// ─── Tabulator インスタンス ───────────────────
const tableRef = ref<HTMLDivElement>();
let tabulator: Tabulator | null = null;

// ─── データ・状態 ─────────────────────────────
const editRows = ref<EditRow[]>([]);
const searchDto = ref<MainDataSearch>({});

// ─── 選択肢 ──────────────────────────────────
const selectOptions = ref<SelectOption[]>([]);
const masterOptions = ref<SelectOption[]>([]);
const linkedOptionsMap = ref<Record<string, SelectOption[]>>({});

// ─── 変更行サマリ ────────────────────────────
const hasDirty = computed(() => editRows.value.some((r) => r.transactionType !== TransactionType.NONE));

const dirtySummary = computed(() => {
  const rows = editRows.value;
  const a = rows.filter((r) => r.transactionType === TransactionType.ADD).length;
  const u = rows.filter((r) => r.transactionType === TransactionType.UPDATE).length;
  const d = rows.filter((r) => r.transactionType === TransactionType.DELETE).length;
  return [a ? `追加:${a}件` : "", u ? `更新:${u}件` : "", d ? `削除:${d}件` : ""]
    .filter(Boolean)
    .join(" / ");
});

// ─── 初期表示 ──────────────────────────────────
onMounted(async () => {
  await loadOptions();
  await search();
});
onUnmounted(() => tabulator?.destroy());

// ─── 選択肢取得 ─────────────────────────────────
const loadOptions = async () => {
  const loading = ElLoading.service();
  try {
    selectOptions.value = referenceApi.getSelectOptions();
    masterOptions.value = await referenceApi.getMasterOptions();
  } finally {
    loading.close();
  }
};

const loadLinkedOptionsFor = async (masterCode: string) => {
  if (linkedOptionsMap.value[masterCode]) return;
  linkedOptionsMap.value[masterCode] = await referenceApi.getLinkedOptions(masterCode);
};

// ─── 検索 ────────────────────────────────────────
const search = async () => {
  const loading = ElLoading.service();
  try {
    const items = await referenceApi.list(searchDto.value);
    editRows.value = items.map((item) => ({ ...item, transactionType: TransactionType.NONE }));
    const masterCodes = [...new Set(items.map((i) => i.masterValue).filter(Boolean))];
    await Promise.all(masterCodes.map(loadLinkedOptionsFor));
    initTabulator();
  } finally {
    loading.close();
  }
};

const clear = () => {
  searchDto.value = {};
  search();
};

// ─── Tabulator: 行クラス付与 ──────────────────
const applyRowClass = (row: any) => {
  const el = row.getElement() as HTMLElement;
  const t = (row.getData() as EditRow).transactionType;
  el.classList.remove("row-added", "row-updated", "row-deleted");
  if (t === TransactionType.ADD) el.classList.add("row-added");
  else if (t === TransactionType.UPDATE) el.classList.add("row-updated");
  else if (t === TransactionType.DELETE) el.classList.add("row-deleted");
};

// ─── Tabulator: 選択肢 Map 変換 ─────────────────
const toValues = (opts: SelectOption[]) =>
  Object.fromEntries(opts.map((o) => [String(o.value), o.label]));

// ─── Tabulator: 初期化 ───────────────────────────
const initTabulator = () => {
  if (!tableRef.value) return;
  tabulator?.destroy();

  tabulator = new Tabulator(tableRef.value, {
    data: editRows.value,
    layout: "fitDataFill",
    height: "400px",
    rowFormatter: applyRowClass,
    // Tab キーによるセル間ナビゲーションを無効化（未レンダリングセルへの移動でクラッシュするため）
    keybindings: {
      navNext: false,
      navPrev: false,
    },
    columns: [
      // ── 状態 ──
      {
        title: "状態",
        field: "transactionType",
        width: 52,
        hozAlign: "center",
        headerHozAlign: "center",
        headerSort: false,
        editable: false,
        formatter: (cell) => {
          const v = cell.getValue() as TransactionType;
          if (v === TransactionType.ADD)    return `<span style="color:#67c23a;font-size:12px;font-weight:600">追加</span>`;
          if (v === TransactionType.UPDATE) return `<span style="color:#e6a23c;font-size:12px;font-weight:600">更新</span>`;
          if (v === TransactionType.DELETE) return `<span style="color:#f56c6c;font-size:12px;font-weight:600">削除</span>`;
          return "";
        },
      },
      // ── コード（既存行は読み取り専用） ──
      {
        title: "コード *",
        field: "codeValue",
        width: 130,
        editable: (cell) => {
          const d = cell.getRow().getData() as EditRow;
          return !d.id && d.transactionType !== TransactionType.DELETE;
        },
        editor: "input",
        cellEdited: onCellEdited,
      },
      // ── 名称 ──
      {
        title: "名称 *",
        field: "nameValue",
        minWidth: 160,
        editable: (cell) => (cell.getRow().getData() as EditRow).transactionType !== TransactionType.DELETE,
        editor: "input",
        cellEdited: onCellEdited,
      },
      // ── 数値 ──
      {
        title: "数値",
        field: "numericValue",
        width: 120,
        hozAlign: "right",
        editable: (cell) => (cell.getRow().getData() as EditRow).transactionType !== TransactionType.DELETE,
        editor: "number",
        formatter: (cell) => {
          const v = cell.getValue();
          if (v == null || v === "") return "";
          return Number(v).toLocaleString("ja-JP");
        },
        cellEdited: onCellEdited,
      },
      // ── 日付 ──
      {
        title: "日付 *",
        field: "dateValue",
        width: 140,
        editable: (cell) => (cell.getRow().getData() as EditRow).transactionType !== TransactionType.DELETE,
        // input[type=date] を使ったカスタムエディタ（Luxon 不要）
        editor: (cell: CellComponent, onRendered, success, cancel) => {
          const input = document.createElement("input");
          input.type = "date";
          input.style.width = "100%";
          input.style.boxSizing = "border-box";
          // Date / ISO文字列 → YYYY-MM-DD に変換してセット
          const v = cell.getValue();
          if (v) {
            const d = v instanceof Date ? v : new Date(v);
            if (!isNaN(d.getTime())) {
              input.value = d.toISOString().slice(0, 10);
            }
          }
          onRendered(() => input.focus());
          input.addEventListener("change", () => success(input.value ? new Date(input.value) : null));
          input.addEventListener("blur", () => cancel(undefined));
          input.addEventListener("keydown", (e) => { if (e.key === "Escape") cancel(undefined); });
          return input;
        },
        // Date / ISO文字列 → YYYY/MM/DD 表示
        formatter: (cell) => {
          const v = cell.getValue();
          if (!v) return "";
          const d = v instanceof Date ? v : new Date(v);
          if (isNaN(d.getTime())) return "";
          return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
        },
        cellEdited: onCellEdited,
      },
      // ── 固定値選択 ──
      {
        title: "区分 *",
        field: "selectValue",
        width: 130,
        editable: (cell) => (cell.getRow().getData() as EditRow).transactionType !== TransactionType.DELETE,
        editor: "list",
        editorParams: { values: toValues(selectOptions.value) },
        formatter: (cell) =>
          selectOptions.value.find((o) => String(o.value) === String(cell.getValue()))?.label ?? "",
        cellEdited: onCellEdited,
      },
      // ── マスタ参照 ──
      {
        title: "マスタ参照 *",
        field: "masterValue",
        width: 140,
        editable: (cell) => (cell.getRow().getData() as EditRow).transactionType !== TransactionType.DELETE,
        editor: "list",
        editorParams: { values: toValues(masterOptions.value) },
        formatter: (cell) =>
          masterOptions.value.find((o) => String(o.value) === String(cell.getValue()))?.label ?? "",
        cellEdited: onMasterCellEdited,
      },
      // ── 連動マスタ ──
      {
        title: "連動マスタ *",
        field: "linkedValue",
        width: 140,
        editable: (cell) => {
          const d = cell.getRow().getData() as EditRow;
          return !!d.masterValue && d.transactionType !== TransactionType.DELETE;
        },
        editor: "list",
        editorParams: (cell) => ({
          values: toValues(linkedOptionsMap.value[(cell.getRow().getData() as EditRow).masterValue] ?? []),
        }),
        formatter: (cell) => {
          const d = cell.getRow().getData() as EditRow;
          return (linkedOptionsMap.value[d.masterValue] ?? [])
            .find((o) => String(o.value) === String(cell.getValue()))?.label ?? "";
        },
        cellEdited: onCellEdited,
      },
      // ── フラグ ──
      {
        title: "フラグ",
        field: "flagValue",
        width: 80,
        hozAlign: "center",
        editable: false,
        // HTML チェックボックスで表示
        formatter: (cell) => {
          const checked = cell.getValue() === 1;
          const disabled = (cell.getRow().getData() as EditRow).transactionType === TransactionType.DELETE;
          return `<input type="checkbox" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} style="cursor:${disabled ? "default" : "pointer"};width:16px;height:16px">`;
        },
        // クリックで 0/1 をトグル
        cellClick: (_e, cell) => {
          const data = cell.getRow().getData() as EditRow;
          if (data.transactionType === TransactionType.DELETE) return;
          data.flagValue = data.flagValue === 1 ? 0 : 1;
          cell.setValue(data.flagValue);
          onCellEdited(cell);
        },
      },
      // ── 備考 ──
      {
        title: "備考",
        field: "memoValue",
        minWidth: 200,
        editable: (cell) => (cell.getRow().getData() as EditRow).transactionType !== TransactionType.DELETE,
        // textarea カスタムエディタ（改行入力対応）
        editor: (cell: CellComponent, onRendered, success, cancel) => {
          const ta = document.createElement("textarea");
          ta.value = cell.getValue() ?? "";
          ta.style.width = "100%";
          ta.style.minHeight = "60px";
          ta.style.boxSizing = "border-box";
          ta.style.resize = "vertical";
          ta.style.fontFamily = "inherit";
          ta.style.fontSize = "inherit";
          ta.style.padding = "2px 4px";
          onRendered(() => { ta.focus(); ta.select(); });
          // Ctrl+Enter で確定 / Esc でキャンセル
          ta.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); success(ta.value); }
            if (e.key === "Escape") cancel(undefined);
          });
          ta.addEventListener("blur", () => success(ta.value));
          return ta;
        },
        // 改行を <br> に変換して表示
        formatter: (cell) => {
          const v = cell.getValue();
          if (!v) return "";
          return String(v).replace(/\n/g, "<br>");
        },
        cellEdited: onCellEdited,
      },
      // ── 削除/取り消しボタン ──
      {
        title: "操作",
        field: "_action",
        width: 52,
        hozAlign: "center",
        headerHozAlign: "center",
        headerSort: false,
        editable: false,
        formatter: (cell) => {
          const t = (cell.getRow().getData() as EditRow).transactionType;
          if (t === TransactionType.DELETE) return `<span style="cursor:pointer;color:#909399;font-size:12px">取消</span>`;
          return `<span style="cursor:pointer;color:#f56c6c;font-size:12px">削除</span>`;
        },
        cellClick: (_e, cell) => onDeleteClick(cell),
      },
    ],
  });
};

// ─── セル編集: transactionType を U にマーク ──────
const onCellEdited = (cell: any) => {
  const data = cell.getRow().getData() as EditRow;
  if (data.transactionType === TransactionType.NONE) data.transactionType = TransactionType.UPDATE;
  data._errors = undefined;
  clearRowErrors(cell.getRow());
  cell.getRow().reformat();
};

// ─── マスタ参照編集: 連動マスタリセット ─────────
const onMasterCellEdited = async (cell: any) => {
  onCellEdited(cell);
  const data = cell.getRow().getData() as EditRow;
  data.linkedValue = "";
  if (data.masterValue) await loadLinkedOptionsFor(data.masterValue);
  cell.getRow().update(data);
};

// ─── 行削除/取り消し ────────────────────────────
const onDeleteClick = (cell: any) => {
  const row = cell.getRow();
  const data = row.getData() as EditRow;
  if (data.transactionType === TransactionType.ADD) {
    // 未保存の追加行はリストから除去
    editRows.value = editRows.value.filter((r) => r !== data);
    row.delete();
  } else if (data.transactionType === TransactionType.DELETE) {
    // 削除マーク解除
    data.transactionType = data.id ? TransactionType.NONE : TransactionType.ADD;
    row.update(data);
    row.reformat();
  } else {
    // 削除マーク
    data.transactionType = TransactionType.DELETE;
    row.update(data);
    row.reformat();
  }
};

// ─── 行追加 ──────────────────────────────────────
const addRow = () => {
  const newRow: EditRow = {
    transactionType: TransactionType.ADD,
    codeValue: "",
    nameValue: "",
    numericValue: undefined,
    dateValue: new Date(),
    selectValue: "",
    masterValue: "",
    linkedValue: "",
    flagValue: 1,
    memoValue: undefined,
    version: 0,
  };
  editRows.value.push(newRow);
  tabulator?.addRow(newRow);
};

// ─── エラー表示／クリア ──────────────────────────
const ERROR_FIELDS = ["codeValue", "nameValue", "numericValue", "dateValue", "selectValue", "masterValue", "linkedValue", "memoValue"];

const setRowErrors = (row: any, errors: Record<string, string>) => {
  Object.entries(errors).forEach(([field, message]) => {
    const cell = row.getCell(field);
    if (cell) {
      cell.getElement().setAttribute("data-error", "true");
      cell.getElement().setAttribute("title", message);
    }
  });
};

const clearRowErrors = (row: any) => {
  ERROR_FIELDS.forEach((field) => {
    const cell = row.getCell(field);
    if (cell) {
      cell.getElement().removeAttribute("data-error");
      cell.getElement().removeAttribute("title");
    }
  });
};

// ─── 一括保存 ────────────────────────────────────
const saveAll = async () => {
  const dirtyRows = editRows.value.filter((r) => r.transactionType !== TransactionType.NONE);
  if (!(await confirmMessageBox(`${dirtyRows.length} 件を保存します。よろしいですか？`))) return;

  const loading = ElLoading.service();
  try {
    await referenceApi.saveAll(dirtyRows as (MainData & { transactionType: TransactionType })[]);
    ElMessage.success(`${dirtyRows.length} 件を保存しました`);
    await search();
  } catch (error: any) {
    // エラーを一旦クリア
    tabulator?.getRows().forEach(clearRowErrors);
    if (error?.errors?.length) {
      // dirty 行のみを対象に行番号でマッピング
      const dirtyTabulatorRows = tabulator?.getRows().filter((r) =>
        (r.getData() as EditRow).transactionType !== TransactionType.NONE
      ) ?? [];
      let inlineCount = 0;
      const globalMessages: string[] = [];
      error.errors.forEach((err: { field: string; message: string; line?: number }) => {
        if (err.line != null) {
          const row = dirtyTabulatorRows[err.line - 1];
          if (row) {
            const data = row.getData() as EditRow;
            if (!data._errors) data._errors = {};
            data._errors[err.field] = err.message;
            setRowErrors(row, { [err.field]: err.message });
            inlineCount++;
          }
        } else {
          globalMessages.push(err.message);
        }
      });
      globalMessages.forEach((msg) => ElMessage.error(msg));
      if (inlineCount > 0) ElMessage.error(`${inlineCount} 件の入力エラーがあります`);
    } else {
      handleBusinessError(error, {});
    }
  } finally {
    loading.close();
  }
};
</script>

<template>
  <div class="max-w-1600px">
    <!-- ▼ タイトル行 ──────────────────────────── -->
    <el-row>
      <el-col :xs="24" :sm="12" class="screen-title">
        一括更新画面タイトル（Tabulator版）
      </el-col>
      <el-col :xs="24" :sm="12" class="flex justify-end items-center gap-2">
        <span v-if="dirtySummary" class="text-sm text-orange-500 font-bold">
          {{ dirtySummary }}
        </span>
        <el-button type="primary" icon="DocumentChecked" :disabled="!hasDirty" @click="saveAll"> 一括保存 </el-button>
      </el-col>
    </el-row>

    <!-- ▼ 検索条件エリア ──────────────────────── -->
    <el-collapse model-value="search">
      <el-collapse-item name="search">
        <template #title><b>検索条件</b></template>
        <el-form :model="searchDto" label-width="130px">
          <el-row :gutter="16">
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
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="固定値選択">
                <el-select v-model="searchDto.selectValue" placeholder="選択" clearable style="width: 100%">
                  <el-option v-for="opt in selectOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="フラグ">
                <el-checkbox v-model="searchDto.flagValue" :true-value="1" :false-value="undefined"> 有効のみ </el-checkbox>
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

    <!-- ▼ 一覧編集エリア ──────────────────────── -->
    <el-collapse model-value="edit">
      <el-collapse-item name="edit">
        <template #title><b>一覧編集</b></template>
        <div ref="tableRef" />
        <div class="mt-2">
          <el-button icon="Plus" @click="addRow"> 行追加 </el-button>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>
