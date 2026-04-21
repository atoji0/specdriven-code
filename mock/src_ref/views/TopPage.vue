<script setup lang="ts">
import { useRouter } from "vue-router";
import { setupService } from "@/backend/services/setupService";
import { getAppMenus } from "@/config/app";
import { ElLoading, ElMessage } from "element-plus";

const router = useRouter();
const menuGroups = getAppMenus();

const resetSampleData = async () => {
  const loading = ElLoading.service({ text: "データをリセット中..." });
  try {
    await setupService.clearAndResetAllData();
    ElMessage.success("サンプルデータをリセットしました");
  } finally {
    loading.close();
  }
};
</script>

<template>
  <div class="max-w-1200px">
    <div class="screen-title">トップページ</div>

    <!-- app.ts の getAppMenus() から生成したナビゲーション -->
    <div v-for="group in menuGroups" :key="group.id" class="mt-6">
      <div class="text-sm font-bold text-gray-500 mb-2">{{ group.label }}</div>
      <div class="flex flex-wrap gap-2">
        <el-button
          v-for="item in group.subitems"
          :key="item.id"
          @click="router.push(item.path!)">
          {{ item.label }}
        </el-button>
      </div>
    </div>

    <el-divider />
    <div class="text-sm text-gray-500 mb-2">すべてのデータを削除して、初期サンプルデータを再投入します。</div>
    <el-button icon="RefreshLeft" @click="resetSampleData">サンプルデータをリセット</el-button>
  </div>
</template>
