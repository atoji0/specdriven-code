/**
 * Element Plusのメッセージボックスをラップした共通メッセージボックスユーティリティです。
 * 確認・警告・完了メッセージボックスの表示関数を提供します。
 */
import { ElMessageBox } from "element-plus";

/**
 * メッセージボックスを表示します。
 * @param method confirmまたはalert
 * @param message 表示メッセージ
 * @param type メッセージタイプ
 * @returns ユーザがOKした場合true, キャンセル/閉じた場合false
 */
const showMessageBox = async (method: "confirm" | "alert", message: string, type: "success" | "warning" | "info" | "error"): Promise<boolean> => {
  try {
    await ElMessageBox[method](message, {
      type,
      showClose: false,
      closeOnPressEscape: false,
      closeOnClickModal: false,
      appendTo: "body", // 修正: HTMLElement ではなく CSS セレクタ文字列
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * 確認メッセージボックスを表示します。
 * @param message メッセージ
 * @param appendTo 追加先要素
 */
export const confirmMessageBox = (message: string): Promise<boolean> => {
  return showMessageBox("confirm", message, "info");
};

/**
 * 警告メッセージボックスを表示します。
 * @param message メッセージ
 * @param appendTo 追加先要素
 */
export const alertMessageBox = (message: string): Promise<boolean> => {
  return showMessageBox("alert", message, "error");
};

/**
 * 完了メッセージボックスを表示します。
 * @param message メッセージ
 * @param appendTo 追加先要素
 */
export const completeMessageBox = (message: string): Promise<boolean> => {
  return showMessageBox("alert", message, "info");
};
