<script setup lang="ts">
/**
 * @description アプリタイトル
 */
interface AppTitleProps {
  /** アプリ名 */
  appName: string;
}

defineProps<AppTitleProps>();
</script>

<template>
  <div class="flex items-center whitespace-nowrap">
    <div class="text-xl mr-2">{{ appName }}</div>
  </div>
</template>
