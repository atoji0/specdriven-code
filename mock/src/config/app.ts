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
 *
 * ─────────────────────────────────────────────────────────
 * 【命名規則】
 *   id     : M_ + エンティティ名（大文字スネークケース）
 *            サブアイテムは M_{ENTITY}_01, _02 … の連番
 *   index  : メニューツリーの表示順を "2" / "2-1" / "2-2" のように指定
 *   path   : router/index.ts に定義した path と完全一致させること
 * ─────────────────────────────────────────────────────────
 *
 * ■ 例：工事管理のメニューを追加する場合
 *   {
 *     id: "M_PROJECT",
 *     index: "2",
 *     label: "工事管理",
 *     opened: true,
 *     subitems: [
 *       { id: "M_PROJECT_01", index: "2-1", label: "プロジェクト管理", path: "/project" },
 *       { id: "M_PROJECT_02", index: "2-2", label: "工事計画管理",     path: "/construction-plan" },
 *     ],
 *   },
 */
export function getAppMenus(): MenuItem[] {
  return [
    // ここに各業務のメニューを追加
    {
      id: "M_DEFECT",
      index: "1",
      label: "車両不具合管理",
      opened: true,
      subitems: [
        { id: "M_DEFECT_01", index: "1-1", label: "不具合記録管理", path: "/defect-record" },
      ],
    },
  ];
}
