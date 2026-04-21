<script setup lang="ts">
import logoUrl from "../assets/logo.png";

interface LogoProps {
  /** ロゴを表示するか */
  isShow?: boolean;
}

withDefaults(defineProps<LogoProps>(), {
  isShow: true,
});
</script>

<template>
  <div class="hidden md:flex" v-if="isShow">
    <el-image class="w-30 min-w-35" :src="logoUrl" />
  </div>
</template>
