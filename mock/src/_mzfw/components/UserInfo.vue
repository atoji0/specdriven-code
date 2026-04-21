<script setup lang="ts">
// ユーザー情報コンポーネント
import { getUserId } from "../utils/common";
import { useMzfwStore } from "../store";
import { computed } from "vue";

const props = defineProps<{ router: any }>();

const mzfwStore = useMzfwStore();

const isRolesEmpty = computed(() => mzfwStore.roles.length === 0);

// ログアウト処理
const logout = () => {
  mzfwStore.setUserId("");
  mzfwStore.setRoles([]);
  props.router.push({
    name: "DummyLogin",
    query: {
      redirect: "/",
      logout: "true",
    },
  });
};
</script>
<template>
  <span v-if="!isRolesEmpty" class="flex items-center">
    {{ getUserId(true) }}
    <i class="i-mdi-logout ml-2 min-w-6 min-h-6 text-2xl cursor-pointer" @click="logout" />
  </span>
</template>
