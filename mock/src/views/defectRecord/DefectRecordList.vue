<!--
  ============================================================
  不具合記録管理 一覧画面（画面区分: 一覧（通常））
  ファイル名: defectRecord/DefectRecordList.vue
  対応するUI仕様書: 車両不具合管理_UI仕様書_不具合記録管理.md
  ============================================================

  画面構成:
    - 検索条件（車両コード・作成日 From/To）
    - 検索結果一覧（サムネイル・不具合記録ID・車種名・不具合内容・作成日時）
    - サムネイルクリック → フルサイズ画像モーダル
    - [新規作成] / IDクリック → DefectRecordEditDialog を開く

  実業務への置き換えポイント:
    defectRecordApi → REST API 呼び出しに置き換える
  ============================================================
-->
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElLoading } from "element-plus";
import { formatDate } from "mzfw";
import type { DefectRecord, DefectRecordSearch } from "@/types/defectRecord";
import { defectRecordApi } from "@/api/defectRecordApi";
import DefectRecordEditDialog from "./DefectRecordEditDialog.vue";

// ─── データ・状態 ─────────────────────────────
const items = ref<DefectRecord[]>([]);
const searchDto = ref<DefectRecordSearch>({});

// ─── 初期表示 ──────────────────────────────────
onMounted(async () => {
  await search();
});

// ─── 検索（最大50件・createdAt降順はAPI側で保証） ─
const search = async () => {
  const loading = ElLoading.service();
  try {
    items.value = await defectRecordApi.list(searchDto.value);
  } finally {
    loading.close();
  }
};

const clear = () => {
  searchDto.value = {};
  search();
};

// ─── ダイアログ ─────────────────────────────────
const dialogRef = ref<InstanceType<typeof DefectRecordEditDialog> | null>(null);
const openNew = () => dialogRef.value?.open(null);
const openEdit = (id: number) => dialogRef.value?.open(id);

// ─── 不具合内容の表示（先頭50文字） ──────────────
const truncate = (text: string | undefined) => (text ?? "").slice(0, 50);

// ─── 日付フォーマット（YYYY/MM/DD HH:mm） ─────────
const formatDateTime = (date: Date | string) => {
  const d = new Date(date);
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
</script>

<template>
  <div class="max-w-1400px">
    <!-- ▼ タイトル行 ──────────────────────────── -->
    <el-row>
      <el-col :xs="24" :sm="12" class="screen-title">
        不具合記録管理
      </el-col>
      <el-col :xs="24" :sm="12" class="flex justify-end">
        <el-button type="primary" icon="DocumentAdd" @click="openNew">
          新規作成
        </el-button>
      </el-col>
    </el-row>

    <!-- ▼ 検索条件 ──────────────────────────────── -->
    <el-collapse model-value="search" class="mt-2">
      <el-collapse-item name="search">
        <template #title><b>検索条件</b></template>
        <el-form :model="searchDto" label-width="130px">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="車両コード">
                <el-input
                  v-model="searchDto.vehicleCode"
                  placeholder="半角数字10桁"
                  clearable
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="作成日（From）">
                <el-date-picker
                  v-model="searchDto.createdAtFrom"
                  type="date"
                  placeholder="YYYY-MM-DD"
                  format="YYYY/MM/DD"
                  value-format="YYYY-MM-DD"
                  clearable
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="作成日（To）">
                <el-date-picker
                  v-model="searchDto.createdAtTo"
                  type="date"
                  placeholder="YYYY-MM-DD"
                  format="YYYY/MM/DD"
                  value-format="YYYY-MM-DD"
                  clearable
                  style="width: 100%"
                />
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

    <!-- ▼ 一覧 ──────────────────────────────────── -->
    <el-collapse model-value="result" class="mt-2">
      <el-collapse-item name="result">
        <template #title><b>検索結果</b></template>

        <!-- テーブル（PC） -->
        <el-table :data="items" stripe class="mt-4 pc-only">
          <!-- 編集アイコン列 -->
          <el-table-column label="" width="35" class-name="icon-col">
            <template #default="{ row }">
              <el-icon style="cursor: pointer" @click="openEdit(row.id)"><Edit /></el-icon>
            </template>
          </el-table-column>

          <!-- サムネイル列 -->
          <el-table-column label="サムネイル" width="90" align="center">
            <template #default="{ row }">
              <el-image
                v-if="row.thumbnailImage"
                :src="row.thumbnailImage"
                :preview-src-list="[row.annotatedImage]"
                preview-teleported
                fit="cover"
                style="width: 72px; height: 54px; border-radius: 4px; cursor: zoom-in;"
              />
              <span v-else style="color: #ccc; font-size: 11px;">なし</span>
            </template>
          </el-table-column>

          <!-- 車種名列 -->
          <el-table-column label="車種名" width="120" prop="vehicleTypeName" />

          <!-- 不具合内容列 -->
          <el-table-column label="不具合内容" min-width="160">
            <template #default="{ row }">
              {{ truncate(row.defectDescription) }}
            </template>
          </el-table-column>

          <!-- 作成日時列 -->
          <el-table-column label="作成日時" width="160" align="center">
            <template #default="{ row }">
              {{ formatDateTime(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>

        <!-- カード（モバイル） -->
        <div class="card-list sp-only mt-2">
          <div
            v-for="row in items"
            :key="row.id"
            class="defect-card"
          >
            <div class="defect-card__header">
              <el-button size="small" @click="openEdit(row.id!)">
                <el-icon><Edit /></el-icon> 編集
              </el-button>
              <span class="defect-card__date">{{ formatDateTime(row.recordedAt) }}</span>
            </div>
            <div class="defect-card__body">
              <el-image
                v-if="row.thumbnailImage"
                :src="row.thumbnailImage"
                :preview-src-list="[row.annotatedImage]"
                preview-teleported
                fit="cover"
                class="defect-card__thumb"
              />
              <div class="defect-card__info">
                <div class="defect-card__vehicle">{{ row.vehicleTypeName }}</div>
                <div class="defect-card__desc">{{ truncate(row.defectDescription) || "（内容なし）" }}</div>
              </div>
            </div>
          </div>
          <div v-if="items.length === 0" class="text-center mt-4 text-gray-400">
            データがありません
          </div>
        </div>

        <div v-if="items.length === 0" class="text-center mt-4 text-gray-400 pc-only">
          データがありません
        </div>
        <div v-if="items.length >= 50" class="text-right mt-2 text-gray-400 text-xs">
          ※ 最新50件を表示しています
        </div>
      </el-collapse-item>
    </el-collapse>

    <!-- ▼ 入力ダイアログ ─────────────────────────── -->
    <DefectRecordEditDialog ref="dialogRef" @saved="search" />
  </div>
</template>

<style scoped>
.pc-only { display: block; }
.sp-only { display: none !important; }

@media (max-width: 767px) {
  .pc-only { display: none !important; }
  .sp-only { display: flex !important; }
}

/* カードリスト（モバイル） */
.card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.defect-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff;
}

.defect-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.defect-card__date {
  font-size: 12px;
  color: #909399;
}

.defect-card__body {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.defect-card__thumb {
  width: 90px;
  height: 68px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
}

.defect-card__info {
  flex: 1;
  min-width: 0;
}

.defect-card__vehicle {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 4px;
}

.defect-card__desc {
  font-size: 13px;
  color: #606266;
  word-break: break-all;
}
</style>
