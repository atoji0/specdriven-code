<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  field: string;
  tableName?: string;
  lineNo?: number;
  errors: Record<string, string | undefined>;
}>();

const key = computed(() =>
  props.tableName !== undefined && props.lineNo !== undefined ? `${props.tableName}.${props.lineNo}.${props.field}` : props.field,
);

const message = computed(() => props.errors[key.value]);
</script>

<template>
  <div v-if="message" class="error-msg">{{ message }}</div>
</template>

<style scoped>
.error-msg {
  color: var(--el-color-danger);
  font-size: 12px;
  font-weight: 400 !important; /* ←これ重要 */
}
</style>
