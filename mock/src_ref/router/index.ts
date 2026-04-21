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

  // ─────────────────────────────────────────
  // 参照サンプル画面（reference）
  // ─────────────────────────────────────────

  // 一覧系
  {
    path: "/ReferenceList",
    name: "ReferenceList",
    component: () => import("@/views/reference/list-normal/List.vue"),
    meta: {
      title: "サンプル一覧（基本）",
      roles: ["ADMIN"],
    },
  },
  {
    path: "/ReferenceListWithExcel",
    name: "ReferenceListWithExcel",
    component: () => import("@/views/reference/variants/list-with-excel/List.vue"),
    meta: {
      title: "サンプル一覧（Excel対応）",
      roles: ["ADMIN"],
    },
  },
  {
    path: "/ReferenceListContext",
    name: "ReferenceListContext",
    component: () => import("@/views/reference/list-context/ListParent.vue"),
    meta: {
      title: "サンプル一覧（コンテキスト）",
      roles: ["ADMIN"],
    },
  },  {
    path: "/ReferenceListContext/list",
    name: "ReferenceListContextList",
    component: () => import("@/views/reference/list-context/ListChild.vue"),
    meta: {
      title: "一覧（コンテキスト）",
      roles: ["ADMIN"],
    },
  },  {
    path: "/ReferenceListRef",
    name: "ReferenceListRef",
    component: () => import("@/views/reference/list-ref/List.vue"),
    meta: {
      title: "サンプル一覧（参照）",
      roles: ["ADMIN"],
    },
  },
  {
    path: "/ReferenceListRefTabulator",
    name: "ReferenceListRefTabulator",
    component: () => import("@/views/reference/variants/list-ref-tabulator/List.vue"),
    meta: {
      title: "サンプル一覧（参照・Tabulator版）",
      roles: ["ADMIN"],
    },
  },

  // 一括更新系
  {
    path: "/ReferenceBulkEdit",
    name: "ReferenceBulkEdit",
    component: () => import("@/views/reference/input-bulk/BulkEdit.vue"),
    meta: {
      title: "サンプル一括更新",
      roles: ["ADMIN"],
    },
  },
  {
    path: "/ReferenceBulkEditTabulator",
    name: "ReferenceBulkEditTabulator",
    component: () => import("@/views/reference/variants/bulk-tabulator/BulkEdit.vue"),
    meta: {
      title: "サンプル一括更新（Tabulator版）",
      roles: ["ADMIN"],
    },
  },

  // 親子系
  {
    path: "/ReferenceParentChildBulkEdit",
    name: "ReferenceParentChildBulkEdit",
    component: () => import("@/views/reference/variants/parent-child-bulk/BulkEdit.vue"),
    meta: {
      title: "親子マスタメンテ（一括編集版）",
      roles: ["ADMIN"],
    },
  },
  {
    path: "/ReferenceParentChildListDialog",
    name: "ReferenceParentChildListDialog",
    component: () => import("@/views/reference/input-parent-child/List.vue"),
    meta: {
      title: "親子マスタメンテ（ダイアログ版）",
      roles: ["ADMIN"],
    },
  },
  // ← 親子メンテ（選択ダイアログ）は一時削除（input-parent-child-select フォルダ削除済み）

  {
    path: "/ReferenceParentChildSelect",
    name: "ReferenceParentChildSelect",
    component: () => import("@/views/reference/input-parent-child-select/List.vue"),
    meta: {
      title: "データ↔マスタ 親子選択メンテ",
      roles: ["ADMIN"],
    },
  },

  // 選択ダイアログ系
  {
    path: "/ReferenceMasterSelect",
    name: "ReferenceMasterSelect",
    component: () => import("@/views/reference/select/List.vue"),
    meta: {
      title: "マスタ選択ダイアログサンプル",
      roles: ["ADMIN"],
    },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  await dummyLoginNavigationGuard(to, from, next);
});

export default router;
