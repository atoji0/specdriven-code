<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useMzfwStore } from "../store";
import type { MenuItem } from "../fw-types";

/**
 * @description メニューアイテム
 */
interface MenuProps {
  /** メニューリスト */
  menus: MenuItem[];
  activePath: string;
}

const props = defineProps<MenuProps>();
const emit = defineEmits<{
  (e: "navigate", path: string): void;
}>();
const mzfwStore = useMzfwStore();

// ロールでフィルタしたメニュー
const filteredMenus = computed(() => {
  const userRoles = mzfwStore.roles;
  // 親メニュー
  return props.menus
    .filter((menu) => !menu.roles || menu.roles.some((role) => userRoles.includes(role)))
    .map((menu) => ({
      ...menu,
      // サブメニュー
      subitems: menu.subitems.filter((item) => !item.roles || item.roles.some((role) => userRoles.includes(role))),
    }))
    .filter((menu) => menu.subitems.length > 0);
});

// デフォルトで開いているサブメニューのインデックスを全て取得
const defaultOpeneds = computed(() => filteredMenus.value.filter((m) => m.opened).map((m) => m.index));
// 現在のアクティブなメニューのインデックスを取得
const activeMenuIndex = computed(
  () => filteredMenus.value.flatMap((menu) => menu.subitems).find((item) => item.path === props.activePath)?.index || "",
);

// マウント時に画面幅を監視し、1024px以下ならサイドメニューを閉じる
onMounted(() => {
  const handleResize = () => {
    if (window.innerWidth < 1024) {
      mzfwStore.isSideMenuOpen = false;
    }
  };
  window.addEventListener("resize", handleResize);

  // コンポーネント破棄時にリスナーを削除
  onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
  });
});

// メニュークリック時の画面遷移処理
function handleMenuClick(path: string) {
  if (window.innerWidth < 1024) {
    mzfwStore.isSideMenuOpen = false;
  }
  emit("navigate", path);
}
</script>

<template>
  <!-- サイドメニュー本体 -->
  <el-scrollbar v-if="mzfwStore.isSideMenuOpen" class="menu-area">
    <el-aside class="menu-aside">
      <!-- メニューリスト -->
      <!-- key を defaultOpeneds の内容で変化させることで、roles が確定した後に el-menu を再マウントし default-openeds を確実に適用させる -->
      <el-menu class="border-none" :key="defaultOpeneds.join(',')" :default-openeds="defaultOpeneds" :default-active="activeMenuIndex">
        <!-- メニューごとにサブメニューを表示 -->
        <template v-for="menu in filteredMenus" :key="menu.id">
          <el-sub-menu :index="menu.index">
            <template #title>
              <!-- メニューラベルをツールチップで表示 -->
              {{ menu.label }}
            </template>
            <!-- サブメニューアイテムを表示 -->
            <template v-for="item in menu.subitems" :key="item.id">
              <el-menu-item :index="item.index" @click="handleMenuClick(item.path)">
                {{ item.label }}
              </el-menu-item>
            </template>
          </el-sub-menu>
        </template>
      </el-menu>
    </el-aside>
  </el-scrollbar>
</template>
