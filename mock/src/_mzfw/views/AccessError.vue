<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();
</script>

<template>
  <div class="max-w-1024px">
    <el-result class="login-form" icon="warning" :title="t('z9b.label.accessError.title')" :sub-title="t('z9b.message.error.accessDenied')">
      <template #extra>
        <el-button type="primary" size="large" @click="$router.push('/')">
          {{ t("z9b.label.common.back") }}
        </el-button>
      </template>
    </el-result>
  </div>
</template>
