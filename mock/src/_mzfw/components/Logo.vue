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
  <div class="hidden md:flex logo-wrapper" v-if="isShow">
    <img :src="logoUrl" class="logo-img" />
  </div>
</template>

<style scoped>
.logo-wrapper {
  height: 100%;
  align-items: center;
}
.logo-img {
  height: 100%;
  width: auto;
  max-height: 100%;
  object-fit: contain;
  display: block;
}
</style>
