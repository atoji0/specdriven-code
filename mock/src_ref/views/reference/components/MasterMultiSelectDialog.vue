<!--
  ============================================================
  汎用マスタ選択ダイアログ（複数選択）
  ファイル名: components/MasterMultiSelectDialog.vue
  ============================================================

  使い方:
    1. 呼び出し元から ref="masterMultiSelectRef" で参照
    2. masterMultiSelectRef.value?.open() でダイアログを開く
    3. @selected="onSelected" で選択結果（配列）を受け取る

  実業務への置き換えポイント:
    MasterItem        → 実際の選択対象型
    masterSelectApi   → 実際の検索 API（listForSelect 等）
    列定義            → 業務の選択対象に合わせて変更
    ダイアログタイトル → UI仕様書「参照マスタ項目」の名称に変更

  選択確定: チェックボックスで複数選択 → [選択して閉じる] ボタンで確定
  ============================================================
-->
<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { ElMessage, ElLoading } from "element-plus";
import { Pagination } from "mzfw";
import type { Master } from "@/types/master";
import { masterApi } from "@/api/masterApi";

// ─── Emits ───────────────────────────────────
/** [選択して閉じる]ボタン押下時に選択した N 件を emit する。
 * 受け取り側: @selected="(items) => { form.codes = items.map(i => i.code) }" */
const emit = defineEmits<{ (e: "selected", items: Master[]): void }>();

// ─── 内部状態 ────────────────────────────────
const visible = ref(false);

// ─── 公開: open() ────────────────────────────
const open = () => { visible.value = true; };
defineExpose({ open });

// ─── 検索条件（クライアントフィルタ） ──────────
const searchCode = ref("");
const searchName = ref("");

// ─── 全件データ → filtered → Pagination ─────
const allItems = ref<Master[]>([]);
const pagedItems = ref<Master[]>([]);

const filteredItems = computed(() =>
  allItems.value.filter((m) => {
    const c = !searchCode.value || m.code.includes(searchCode.value);
    const n = !searchName.value || m.name.includes(searchName.value);
    return c && n;
  }),
);

// ─── 選択中の行 ──────────────────────────────
const selectedRows = ref<Master[]>([]);
const selectedCount = computed(() => selectedRows.value.length);

const onSelectionChange = (rows: Master[]) => {
  selectedRows.value = rows;
};

// ─── クリア ──────────────────────────────────
const clear = () => { searchCode.value = ""; searchName.value = ""; };

// ─── ダイアログが開いたら全件ロード ─────────────
watch(visible, async (newVal) => {
  if (!newVal) return;
  clear();
  selectedRows.value = [];
  const loading = ElLoading.service();
  try {
    allItems.value = await masterApi.list();
  } finally {
    loading.close();
  }
});

// ─── 選択確定 ────────────────────────────────
const confirmSelect = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning("1件以上を選択してください");
    return;
  }
  emit("selected", [...selectedRows.value]);
  visible.value = false;
};
// ─── 閉じる ──────────────────────────────────
const close = () => (visible.value = false);
</script>

<template>
  <el-dialog v-model="visible" title="マスタ選択（複数可）" width="700px" :close-on-click-modal="false">

    <!-- ▼ 検索条件 -->
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

    <!-- ▼ 件数 + Pagination + 選択カウント -->
    <div class="flex justify-between items-center">
      <Pagination :items="filteredItems" @update:pagedItems="pagedItems = $event" />
      <span v-if="selectedCount > 0" class="text-sm text-primary font-bold">{{ selectedCount }} 件選択中</span>
    </div>

    <!--
      ▼ 一覧テーブル（チェックボックス付き）
         type="selection": 行選択チェックボックス列を自動生成
         @selection-change: 選択が変わるたびに selectedRows を更新
         業務に合わせて列を追加・変更すること
    -->
    <el-table
      :data="pagedItems"
      border
      stripe
      @selection-change="onSelectionChange">
      <el-table-column type="selection" width="50" />
      <el-table-column label="コード" prop="code" width="130" />
      <el-table-column label="名称" prop="name" min-width="160" />
      <!-- 必要に応じて列を追加 -->
    </el-table>

    <!-- ▼ フッター -->
    <template #footer>
      <div class="flex gap-2">
        <!--
          [選択して閉じる] = 選択確定ボタン。
          選択件数をバッジで表示する（0件の場合は非表示）。
        -->
        <el-badge :value="selectedCount" :hidden="selectedCount === 0">
          <el-button type="primary" icon="Check" @click="confirmSelect">
            選択して閉じる
          </el-button>
        </el-badge>
        <el-button icon="Close" @click="close">キャンセル</el-button>
      </div>
    </template>
  </el-dialog>
</template>
