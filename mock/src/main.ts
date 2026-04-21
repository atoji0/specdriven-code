import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import i18n from "@/locales";
import ElementPlus from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import "element-plus/dist/index.css";
import "uno.css";
import "mzfw/css/style.scss";
import router from "./router";
import { registerGlobalErrorHandlers, useMzfwStore } from "mzfw";
import { setupService } from "@/backend/services/setupService";
import { configureDb } from "mzfw_backend/dbRuntime";
import { APP_DB_CONFIG } from "@/backend/dbConfig";

// IndexedDB 設定を登録（createApp より前に必ず呼ぶ）
configureDb(APP_DB_CONFIG);

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(i18n);
app.use(router);
app.use(ElementPlus);
Object.entries(ElementPlusIconsVue).forEach(([key, component]) => app.component(key, component));

// グローバルエラーハンドラを登録
registerGlobalErrorHandlers(i18n.global.t, app, (route) => {
  router.push(route);
});

// 環境情報を読み込み → 初期データ投入 → アプリマウント
const store = useMzfwStore();
store.fetchEnv("env/env.json")
  .catch(() => { /* env.json が無くても続行 */ })
  .finally(async () => {
    await setupService.setup(); // IndexedDB サンプルデータ投入（Java移行後は削除）
    app.mount("#app");
  });
