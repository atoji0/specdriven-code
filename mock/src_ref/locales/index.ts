import { createI18n } from "vue-i18n";
import jaFw from "mzfw/locales/ja.json";
import enFw from "mzfw/locales/en.json";
import jaApp from "./ja.json";
import enApp from "./en.json";

const i18n = createI18n({
  legacy: false,
  locale: "ja",
  fallbackLocale: "ja",
  messages: {
    ja: { ...jaFw, ...jaApp },
    en: { ...enFw, ...enApp },
  },
});

export { i18n };
export default i18n;