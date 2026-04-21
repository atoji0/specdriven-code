<!--
  ============================================================
  一覧画面サンプル（画面区分: 一覧（コンテキスト））─ 区分選択画面
  ファイル名: list-context/ListParent.vue
  ============================================================

  画面構成:
    - 固定値（区分）をプルダウンで選択
    - [一覧表示] ボタン → ListChild.vue へ遷移（選択した区分がコンテキストになる）

  実業務への置き換えポイント:
    selectValue → 実際の区分フィールド名
    referenceApi.getSelectOptions() → 実際の固定値取得API
  ============================================================
-->
<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { referenceApi } from "@/api/referenceApi";
import type { SelectOption } from "mzfw";

// ─── ルーター ─────────────────────────────────
const router = useRouter();

// ─── 固定値選択肢（コンテキスト候補） ─────────
const selectOptions = ref<SelectOption[]>(referenceApi.getSelectOptions());

// ─── 選択中の区分 ─────────────────────────────
const selectedValue = ref<string | number>("");

// ─── [一覧表示] ボタン ─────────────────────────
const goToList = () => {
  if (!selectedValue.value) return;
  router.push({
    path: "/ReferenceListContext/list",
    query: { selectValue: selectedValue.value },
  });
};
</script>

<template>
  <div class="max-w-600px">
    <!-- ▼ タイトル行 ──────────────────────────── -->
    <el-row>
      <el-col :span="24" class="screen-title">
        一覧（コンテキスト）
      </el-col>
    </el-row>

    <!-- ▼ 検索条件エリア ──────────────────────── -->
    <el-collapse model-value="search">
      <el-collapse-item name="search">
        <template #title><b>検索条件</b></template>
        <el-form label-width="80px">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="10">
              <el-form-item label="区分">
                <el-select
                  v-model="selectedValue"
                  placeholder="区分を選択"
                  style="width: 100%"
                  clearable>
                  <el-option
                    v-for="opt in selectOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="24">
              <div class="flex gap-2 mt-4">
                <el-button
                  type="primary"
                  icon="Search"
                  :disabled="!selectedValue"
                  @click="goToList">
                  一覧表示
                </el-button>
              </div>
            </el-col>
          </el-row>
        </el-form>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>
