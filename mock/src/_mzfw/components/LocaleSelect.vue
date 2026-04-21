<script setup lang="ts">
import { ref } from "vue";

import { setLocale } from "../utils/common";
import type { LocaleItem } from "../fw-types";

/**
 * @description 言語選択コンポーネントのprops
 */
interface LangSelectProps {
  /** vue-i18nのインスタンス */
  i18n: any;
  /** 選択可能な言語リスト（省略時はdefaultLangList） */
  langList?: LocaleItem[];
}

const props = defineProps<LangSelectProps>();

// langListがpropsで渡されていなければ空配列
const selectLocales = ref<LocaleItem[]>(props.langList ?? []);

// 現在選択されている言語のインデックスを取得
const selectLocaleIndex = ref(selectLocales.value.findIndex((item) => item.locale === props.i18n.global.locale.value));

// 言語変更処理
const changeLocale = (index: number) => {
  const selected = selectLocales.value[index];
  if (selected) {
    props.i18n.global.locale.value = selected.locale;
    setLocale(selected.locale);
    selectLocaleIndex.value = index;
  }
};
</script>

<template>
  <el-dropdown trigger="click" @command="changeLocale" class="text-4xl text-white cursor-pointer flex items-center">
    <span class="mb-2">{{ selectLocales[selectLocaleIndex]?.font ?? "" }}</span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-for="(locale, index) in selectLocales" :key="locale.locale" :command="index">
          {{ locale.name }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
