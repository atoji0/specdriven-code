<!--
  ============================================================
  汎用マスタ選択ダイアログ（単一選択）
  ファイル名: components/MasterSelectDialog.vue
  ============================================================

  使い方:
    1. 呼び出し元から ref="masterSelectRef" で参照
    2. masterSelectRef.value?.open() でダイアログを開く
    3. @selected="onSelected" で選択結果（1件）を受け取る

  実業務への置き換えポイント:
    MasterItem        → 実際の選択対象型
    masterSelectApi   → 実際の検索 API（listForSelect 等）
    列定義            → 業務の選択対象に合わせて変更
    ダイアログタイトル → UI仕様書「参照マスタ項目」の名称に変更

  選択確定: 行クリックで即座に emit して閉じる（確定ボタン不要）

  実業務への置き換えポイント:
    Master      → 実際の選択対象型（code / name が必須）
    masterApi.listMasters() → 実際のリスト取得 API に変更
    列定義      → 業務の選択対象に合わせて変更
  ============================================================
-->
<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Pagination } from "mzfw";
import { ElLoading } from "element-plus";
import type { Master } from "@/types/master";
import { masterApi } from "@/api/masterApi";

// ─── Emits ───────────────────────────────────
/** 行クリック時に選択した1件を emit する。
 * 受け取り側: @selected="(item) => { form.code = item.code; form.name = item.name }" */
const emit = defineEmits<{ (e: "selected", item: Master): void }>();

// ─── 内部状態 ────────────────────────────────
const visible = ref(false);

// ─── 公開: open() ────────────────────────────
const open = () => { visible.value = true; };
defineExpose({ open });

// ─── 検索条件（クライアントフィルタ） ──────────
const searchCode = ref("");
const searchName = ref("");

// ─── 全件データ → computed でフィルタ → Pagination ─
const allItems = ref<Master[]>([]);
const pagedItems = ref<Master[]>([]);

const filteredItems = computed(() =>
  allItems.value.filter((m) => {
    const c = !searchCode.value || m.code.includes(searchCode.value);
    const n = !searchName.value || m.name.includes(searchName.value);
    return c && n;
  }),
);

// ─── クリア ──────────────────────────────────
const clear = () => { searchCode.value = ""; searchName.value = ""; };

// ─── ダイアログが開いたら全件ロード ─────────────
watch(visible, async (newVal) => {
  if (!newVal) return;
  clear();
  const loading = ElLoading.service();
  try {
    allItems.value = await masterApi.list();
  } finally {
    loading.close();
  }
});

// ─── 行クリック → 即確定 ──────────────────────
const onRowClick = (row: Master) => {
  emit("selected", row);
  visible.value = false;
};

// ─── 閉じる ──────────────────────────────────
const close = () => (visible.value = false);
</script>

<template>
  <el-dialog v-model="visible" title="マスタ選択" width="700px" :close-on-click-modal="false">

    <!-- ▼ 検索条件（クライアントフィルタ） -->
    <el-form inline class="mb-3">
      <el-form-item label="コード">
        <el-input v-model="searchCode" placeholder="コードで絞り込み" clearable style="width: 140px" />
      </el-form-item>
      <el-form-item label="名称">
        <el-input v-model="searchName" placeholder="名称で絞り込み" clearable style="width: 180px" />
      </el-form-item>
      <el-form-item>
        <el-button icon="RefreshLeft" @click="clear">クリア</el-button>
      </el-form-item>
    </el-form>

    <!-- ▼ 件数 + Pagination -->
    <Pagination :items="filteredItems" @update:pagedItems="pagedItems = $event" />

    <!--
      ▼ 一覧テーブル
         highlight-current-row: 行ホバー時にハイライト
         @row-click: 行クリックで即選択確定
         業務に合わせて列を追加・変更すること
    -->
    <el-table
      :data="pagedItems"
      border
      stripe
      highlight-current-row
      style="cursor: pointer"
      @row-click="onRowClick">
      <el-table-column label="コード" prop="code" width="130" />
      <el-table-column label="名称" prop="name" min-width="160" />
      <!-- 必要に応じて列を追加 -->
    </el-table>

    <!-- ▼ フッター -->
    <template #footer>
      <el-button icon="Close" @click="close">閉じる</el-button>
    </template>
  </el-dialog>
</template>
