<script setup lang="ts">
// 汎用ページネーションコンポーネント
import { ref, computed, watch } from "vue";

// ページネーション用props型
interface PaginationProps<T> {
  items: T[];
  defaultPageSize?: number;
  layout?: string;
}

const props = defineProps<PaginationProps<any>>();
const emit = defineEmits<{
  (e: "update:pagedItems", pagedItems: any[]): void;
  (e: "update:pageInfo", pageInfo: { currentPage: number; pageSize: number }): void;
}>();

const pageSize = ref(props.defaultPageSize ?? 10); // 1ページあたり件数
const currentPage = ref(1); // 現在のページ

// ページング済みデータ
const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return props.items.slice(start, start + pageSize.value);
});

// ページング済みデータをemit
watch(
  [pagedItems, currentPage, pageSize],
  () => {
    emit("update:pagedItems", pagedItems.value);
  },
  { immediate: true },
);

// ページ情報をemit
const emitPageInfo = () => {
  emit("update:pageInfo", { currentPage: currentPage.value, pageSize: pageSize.value });
};

// ページ変更ハンドラ
const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  emitPageInfo();
};
// ページサイズ変更ハンドラ
const handleSizeChange = (size: number) => {
  pageSize.value = size;
  emitPageInfo();
};
</script>

<template>
  <!-- Element Plus ページネーション -->
  <el-pagination
    :total="props.items.length"
    :page-size="pageSize"
    :current-page="currentPage"
    :layout="props.layout || 'total, prev, pager, next, jumper, sizes'"
    @current-change="handleCurrentChange"
    @size-change="handleSizeChange" />
</template>
