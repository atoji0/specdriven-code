import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { dummyLoginNavigationGuard } from "mzfw";
import { AccessError, SystemError } from "mzfw";

// i18n Ally用のダミー関数（実行時には翻訳されないため、動的にi18n.global.tを使用すること）
const t: (s: string) => string = (s) => s;

const routes: Array<RouteRecordRaw> = [
  {
    path: "/DummyLogin",
    name: "DummyLogin",
    component: () => import("@/views/DummyLogin.vue"),
    meta: {
      title: t("z9b.label.dummyAuth.title"),
    },
  },
  {
    path: "/install",
    name: "Install",
    component: () => import("@/views/InstallPage.vue"),
    meta: { title: "インストール" },
  },
  {
    path: "/AccessError",
    name: "AccessError",
    component: AccessError,
    meta: {
      title: t("z9b.label.accessError.title"),
    },
  },
  {
    path: "/SystemError",
    name: "SystemError",
    component: SystemError,
    meta: {
      title: t("z9b.label.systemError.title"),
    },
  },
  {
    path: "/",
    name: "Home",
    component: () => import("@/views/TopPage.vue"),
    meta: {
      title: "トップページ",
    },
  },
  // ここに各業務画面のルートを追加
  {
    path: "/defect-record",
    name: "DefectRecordList",
    component: () => import("@/views/defectRecord/DefectRecordList.vue"),
    meta: { title: "不具合記録管理" },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  await dummyLoginNavigationGuard(to, from, next);
});

router.afterEach((to) => {
  const pageTitle = to.meta?.title as string | undefined;
  document.title = pageTitle ? `${pageTitle} | Spec2App Demo` : "Spec2App Demo";
});

export default router;
