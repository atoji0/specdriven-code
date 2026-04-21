import type { AppConfig } from "mzfw";
import type { MenuItem } from "mzfw";

export const appConfig: AppConfig = {
  name: "Spec2App MZFW",
  version: "1.0.0",
  defaultLocale: "ja",
  localeItems: [
    { name: "日本語", locale: "ja", font: "🇯🇵" },
    { name: "English", locale: "en", font: "🇺🇸" },
  ],
  showLogo: true,
};

/**
 * アプリケーションのメニュー構造を返す関数
 * @param t i18n翻訳関数（オプション）
 * @returns メニュー構造
 */
export function getAppMenus(): MenuItem[] {
  return [
    // ─────────────────────────────────────────
    // 参照サンプルメニュー（reference）
    // ─────────────────────────────────────────

    // ── 一覧 ──
    {
      id: "M_REF_LIST",
      index: "99",
      label: "一覧",
      opened: true,
      subitems: [
        {
          id: "M_REF_LIST_01",
          index: "99-1",
          label: "一覧（基本）",
          path: "/ReferenceList",
          roles: ["ADMIN"],
        },
        {
          id: "M_REF_LIST_02",
          index: "99-2",
          label: "一覧（Excel対応）",
          path: "/ReferenceListWithExcel",
          roles: ["ADMIN"],
        },
        {
          id: "M_REF_LIST_03",
          index: "99-3",
          label: "一覧（コンテキスト）",
          path: "/ReferenceListContext",
          roles: ["ADMIN"],
        },
      ],
    },

    // ── 参照 ──
    {
      id: "M_REF_REF",
      index: "98",
      label: "参照",
      opened: true,
      subitems: [
        {
          id: "M_REF_REF_01",
          index: "98-1",
          label: "一覧（参照）",
          path: "/ReferenceListRef",
          roles: ["ADMIN"],
        },
        {
          id: "M_REF_REF_02",
          index: "98-2",
          label: "一覧（参照・Tabulator版）",
          path: "/ReferenceListRefTabulator",
          roles: ["ADMIN"],
        },
      ],
    },

    // ── 一括更新 ──
    {
      id: "M_REF_BULK",
      index: "97",
      label: "一括更新",
      opened: true,
      subitems: [
        {
          id: "M_REF_BULK_01",
          index: "97-1",
          label: "一括更新",
          path: "/ReferenceBulkEdit",
          roles: ["ADMIN"],
        },
        {
          id: "M_REF_BULK_02",
          index: "97-2",
          label: "一括更新（Tabulator版）",
          path: "/ReferenceBulkEditTabulator",
          roles: ["ADMIN"],
        },
      ],
    },

    // ── 親子 ──
    {
      id: "M_REF_CHILD",
      index: "96",
      label: "親子",
      opened: true,
      subitems: [
        {
          id: "M_REF_CHILD_01",
          index: "96-1",
          label: "親子メンテ（一括編集）",
          path: "/ReferenceParentChildBulkEdit",
          roles: ["ADMIN"],
        },
        {
          id: "M_REF_CHILD_02",
          index: "96-2",
          label: "親子メンテ（ダイアログ）",
          path: "/ReferenceParentChildListDialog",
          roles: ["ADMIN"],
        },
        {
          id: "M_REF_CHILD_03",
          index: "96-3",
          label: "親子選択メンテ",
          path: "/ReferenceParentChildSelect",
          roles: ["ADMIN"],
        },
      ],
    },

    // ── 選択ダイアログ ──
    {
      id: "M_REF_SELECT",
      index: "95",
      label: "選択ダイアログ",
      opened: true,
      subitems: [
        {
          id: "M_REF_SELECT_01",
          index: "95-1",
          label: "マスタ選択ダイアログ",
          path: "/ReferenceMasterSelect",
          roles: ["ADMIN"],
        },
      ],
    },

    // ここに各業務のメニューを追加
  ];
}
