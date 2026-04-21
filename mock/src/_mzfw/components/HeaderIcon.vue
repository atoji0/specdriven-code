<script setup lang="ts">
import { ElTooltip, ElLink, ElIcon } from "element-plus";

/**
 * @description ヘッダーアイコン
 */
interface HeaderIcon {
  /** アイコンのVueコンポーネント */
  icon: any;
  /** ツールチップに表示するラベル */
  label: string;
  /** クリック時のコールバック（任意） */
  onClick?: () => void;
}

/**
 * @description ヘッダーアイコンコンポーネントのprops
 */
interface HeaderIconProps {
  /** ヘッダーに表示するアイコンの配列 */
  headerIcons: HeaderIcon[];
}

defineProps<HeaderIconProps>();
</script>

<template>
  <!-- ヘッダーアイコンをループで表示 -->
  <template v-for="(menu, index) in headerIcons" :key="index">
    <!-- ツールチップでラベル表示 -->
    <el-tooltip :content="menu.label">
      <!-- アイコンクリックでonClick実行 -->
      <el-link @click="menu.onClick" class="HeaderIconLink">
        <el-icon>
          <component :is="menu.icon" />
        </el-icon>
      </el-link>
    </el-tooltip>
  </template>
</template>
