<script setup lang="ts">
import { useMzfwStore } from "../store";

const mzfwStore = useMzfwStore();

// サイドメニュー開閉切替処理
const changeSideMenu = () => {
  mzfwStore.changeSideMenu();
};
</script>

<template>
  <!-- サイドメニュー開閉アイコン -->
  <el-icon :size="24" class="cursor-pointer mx-3" @click="changeSideMenu()">
    <!-- アイコンの切り替え -->
    <component :is="mzfwStore.isSideMenuOpen ? 'Expand' : 'Fold'" />
  </el-icon>
</template>
