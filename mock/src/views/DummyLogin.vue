<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { validateDummyLoginAvailable, dummyLogin } from "mzfw";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const route = useRoute();
const router = useRouter();

const users = [
  { label: "user : 一般ユーザー", value: "user" },
  { label: "admin : 管理者", value: "admin" },
];
const form = ref({ userId: "" });
const errors = ref({ userId: "" });

onMounted(async () => {
  // ダミーログインの有効性を確認
  validateDummyLoginAvailable();
  // ログオフクエリパラメータがない場合は自動的にadminユーザーでログイン
  if (!route.query.logout) {
    if (await dummyLogin("admin", t)) {
      const redirectPath = (route.query.redirect as string) || "/";
      router.push(redirectPath);
    }
  }
});

// ログイン処理
const login = async () => {
  // ダミーログインを実行
  if (await dummyLogin(form.value.userId, t)) {
    // ログイン後、リダイレクト先に遷移
    const redirectPath = (route.query.redirect as string) || "/";
    router.push(redirectPath);
  }
};
</script>

<template>
  <el-form @submit.prevent="login">
    <el-form-item label="ダミーログイン" />
    <el-form-item label="ユーザーID" :error="errors.userId" required>
      <el-select v-model="form.userId" style="width: 200px"
        ><el-option v-for="opt in users" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="login" :disabled="form.userId.length === 0">ログイン</el-button>
    </el-form-item>
  </el-form>
</template>
