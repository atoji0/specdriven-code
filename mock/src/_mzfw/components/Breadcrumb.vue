<script setup lang="ts">
import { computed } from "vue";
import type { MenuItem } from "../fw-types";
import { useRoute } from "vue-router";

interface BreadcrumbProps {
  menus: MenuItem[];
  activePath: string;
}

const props = defineProps<BreadcrumbProps>();
const route = useRoute();

const breadcrumbItems = computed(() => {
  const currentPath = props.activePath || route.path;
  const items = [{ label: "ホーム", path: "/" }];
  let matched = false;
  for (const menu of props.menus) {
    for (const subitem of menu.subitems || []) {
      if (subitem.path === currentPath) {
        items.push({ label: menu.label, path: "" }, { label: subitem.label, path: currentPath });
        matched = true;
        break;
      }
    }
    if (matched) break;
  }
  // 子ルート対応: /Parent/child のようにサブアイテムのパスがプレフィックスになるケース
  if (!matched) {
    for (const menu of props.menus) {
      for (const subitem of menu.subitems || []) {
        if (currentPath.startsWith(subitem.path + "/")) {
          const currentTitle = (route.meta?.title as string) || currentPath;
          items.push(
            { label: menu.label, path: "" },
            { label: subitem.label, path: subitem.path },
            { label: currentTitle, path: currentPath }
          );
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  }
  return items;
});
</script>

<template>
  <el-breadcrumb separator="/" style="margin-bottom: 16px" v-if="activePath !== '/'">
    <el-breadcrumb-item v-for="(item, index) in breadcrumbItems" :key="index" :to="item.path && item.path !== activePath ? item.path : undefined">
      {{ item.label }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>
