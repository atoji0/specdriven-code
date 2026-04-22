<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { i18n } from "./locales";
import router from "./router/index";
import { useRoute } from "vue-router";
import { Menu, useMzfwStore, Breadcrumb, LocaleSelect, MenuExpandIcon, UserInfo, Logo, getCurrentDate, AppTitle } from "mzfw";
import { envJson } from "mzfw";
import { appConfig, getAppMenus } from "@/config/app";
import type { LocaleItem } from "./_mzfw/fw-types";
import jaLocale from "element-plus/es/locale/lang/ja";
import enLocale from "element-plus/es/locale/lang/en";

const { t } = useI18n();
const route = useRoute();

// テンプレートで使用するため明示的に定義
const appRouter = router;

// デフォルトロケールを初期設定
if (!i18n.global.locale.value) {
  i18n.global.locale.value = appConfig.defaultLocale as typeof i18n.global.locale.value;
}

const elementLocale = computed(() => (i18n.global.locale.value === "ja" ? jaLocale : enLocale));

onMounted(async () => {
  // アプリ起動時に、環境情報を読み込む
  useMzfwStore().fetchEnv(envJson);
});

const menus = computed(() => getAppMenus());

// 利用可能なロケールリスト（appConfigから動的生成）
const localeList = computed<LocaleItem[]>(() => appConfig.localeItems);

// Header部分
const appName = ref<string>("");
const screenName = ref<string>("");

watch(
  // 画面名と言語切替を監視
  [() => route.meta.title, () => i18n.global.locale.value],
  ([titleValue]) => {
    appName.value = t("z99.label.appName");
    // 画面名およびブラウザタイトルを更新
    screenName.value = titleValue as string;
    document.title = appName.value + " - " + screenName.value;
  },
);
</script>

<template>
  <el-config-provider size="small" :locale="elementLocale">
    <el-container class="main-area">
      <el-header>
        <el-row class="GlobalNavi">
          <!-- タイトル -->
          <el-col :xs="4" :sm="10">
            <MenuExpandIcon />
            <div class="hidden md:flex">
              <AppTitle :appName="appName" />
            </div>
          </el-col>
          <!-- ユーザ名・ロケール切替 -->
          <el-col :xs="12" :sm="6">
            <LocaleSelect v-if="localeList.length > 1" :i18n="i18n" :lang-list="localeList" class="mr-4" />
            <UserInfo :router="appRouter" />
          </el-col>
          <!-- 表示日時 -->
          <el-col :xs="8" :sm="appConfig.showLogo ? 5 : 8" class="justify-end pr-2">{{ getCurrentDate() }}</el-col>
          <!-- ロゴ -->
          <el-col :xs="0" :sm="appConfig.showLogo ? 3 : 0" class="justify-end pr-4">
            <Logo :is-show="appConfig.showLogo" />
          </el-col>
        </el-row>
      </el-header>
      <el-container class="main-area">
        <Menu :menus="menus" :active-path="route.path" @navigate="appRouter.push" />
        <el-main>
          <Breadcrumb :menus="menus" :active-path="route.path" />
          <div>
            <router-view />
          </div>
        </el-main>
      </el-container>
    </el-container>
  </el-config-provider>
</template>
