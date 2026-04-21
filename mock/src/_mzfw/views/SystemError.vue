<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ref } from "vue";

const router = useRouter();
const { t } = useI18n();

const errorTimeStamp = ref(sessionStorage.getItem("errorTimeStamp"));
const errorMessage = ref(sessionStorage.getItem("errorMessage"));
const requestLogId = ref(sessionStorage.getItem("requestLogId"));
</script>

<template>
  <el-result icon="error" :title="t('z9b.label.systemError.title')" :sub-title="t('z9b.message.error.systemError')">
    <template #extra>
      <div>
        <h3>{{ t("z9b.label.systemError.errorInfo") }}</h3>
        <el-row class="justify-start">
          <el-col :span="6" class="text-left">
            {{ t("z9b.label.systemError.timeStamp") }}
          </el-col>
          <el-col :span="18" class="text-left">
            {{ errorTimeStamp }}
          </el-col>
        </el-row>
        <!-- エラーメッセージ -->
        <el-row class="justify-start">
          <el-col :span="6" class="text-left">
            {{ t("z9b.label.systemError.errorMessage") }}
          </el-col>
          <el-col :span="18" class="text-left">
            {{ errorMessage }}
          </el-col>
        </el-row>
        <!-- リクエストログID -->
        <el-row class="justify-start mb-4">
          <el-col :span="6" class="text-left">
            {{ t("z9b.label.systemError.requestLogId") }}
          </el-col>
          <el-col :span="18" class="text-left">
            {{ requestLogId }}
          </el-col>
        </el-row>
        <el-button type="primary" size="large" @click="router.back()">
          {{ t("z9b.label.common.back") }}
        </el-button>
      </div>
    </template>
  </el-result>
</template>
