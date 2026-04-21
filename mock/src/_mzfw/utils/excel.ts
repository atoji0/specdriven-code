/**
 * Excelファイルの読み込み・保存・エラー出力などを行うユーティリティモジュールです。
 * exceljsライブラリを利用しています。
 */
import * as ExcelJs from "exceljs";
import { Workbook } from "exceljs";
import type { UploadFile } from "element-plus";
import { ElMessage } from "element-plus";
import { ApplicationError, BusinessError } from "../errors";
import type { Translate, ExcelColumnDefinition } from "../fw-types";

const excelMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * 汎用Excelテンプレートを作成する。
 * @param headers 列定義
 * @param sheetName シート名
 * @param rowHeight 行の高さ
 * @param isErrorMessage エラーメッセージ列を追加するか
 * @returns { workbook, worksheet }
 */
export const generateExcelTemplate = async <T>(
  headers: ExcelColumnDefinition<T>[],
  sheetName: string = "Template",
  rowHeight: number = 13.5,
  isErrorMessage: boolean = true,
): Promise<{ workbook: ExcelJs.Workbook; worksheet: ExcelJs.Worksheet }> => {
  const workbook = new ExcelJs.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // 行の高さ調整
  worksheet.properties.defaultRowHeight = rowHeight;

  const allHeaders = [...headers] as ExcelColumnDefinition<any>[];
  if (isErrorMessage) {
    // エラーメッセージ列を追加
    allHeaders.push({
      key: "errorMessage",
      width: 80,
    });
  }

  // 列定義（hidden列含む）
  worksheet.columns = allHeaders.map((h) => ({
    header: h.label ?? (h.key as string),
    key: h.key as string,
    width: h.width ?? 10,
    hidden: h.hidden ?? false,
  }));

  // ヘッダー行のスタイル
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, _colNumber) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D9D9D9" }, // グレー背景
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.font = {
      bold: true,
    };
  });
  if (isErrorMessage && allHeaders.length > 0) {
    // エラー列を追加
    const errorCol = worksheet.getColumn(allHeaders.length);
    errorCol.style = {
      font: { color: { argb: "FF0000" } },
    };
  }

  return { workbook, worksheet };
};

/**
 * Excelテンプレートをロードします。
 * @param t i18nのtranslate関数
 * @param filePath Excelファイルのパス
 * @param sheetIndex シート番号（1始まり）
 * @returns workbook, worksheet
 */
export const loadExcelTemplate = async (
  t: Translate,
  filePath: string,
  sheetIndex: number = 1,
): Promise<{ workbook: ExcelJs.Workbook; worksheet: ExcelJs.Worksheet }> => {
  const file = await fetch(filePath);
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJs.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.getWorksheet(sheetIndex);
  if (!worksheet) {
    throw new ApplicationError(t("z9b.message.error.targetSheetNotFound", { p0: sheetIndex }));
  }
  return { workbook, worksheet };
};

/**
 * Excelファイルを読み込み、指定シートの2行目以降のデータを取得します。
 * @param t i18nのtranslate関数
 * @param file Excelファイル
 * @param sheetIndex シート番号（1始まり）
 * @returns workbook, worksheet, rows
 */
export const loadExcelFile = async (
  t: Translate,
  file: UploadFile,
  sheetIndex: number = 1,
): Promise<{ workbook: ExcelJs.Workbook; worksheet: ExcelJs.Worksheet; rows: ExcelJs.Row[] }> => {
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file.raw as Blob);
  });
  const workbook = new ExcelJs.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.getWorksheet(sheetIndex);
  if (!worksheet) {
    throw new ApplicationError(t("z9b.message.error.targetSheetNotFound", { p0: sheetIndex }));
  }
  const rows = worksheet.getRows(2, worksheet.rowCount - 1);
  if (!rows) {
    throw new ApplicationError(t("z99.message.dataNotFound"));
  }

  return { workbook, worksheet, rows };
};

/**
 * Excelファイルを保存します。
 * @param workbook Excelワークブック
 * @param worksheet Excelワークシート
 * @param rows 追加する行データ
 * @param fileName 保存するファイル名
 */
export const saveExcel = async (workbook: ExcelJs.Workbook, worksheet: ExcelJs.Worksheet, rows: any[][], fileName: string) => {
  rows.forEach((row) => {
    const newRow = worksheet.addRow(row);
    newRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
      };
    });
  });
  const response = await workbook.xlsx.writeBuffer();
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(new Blob([response], { type: excelMimeType }));
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(link.href);
};

/**
 * Excelの行データからA/U/D件数をカウントし、成功メッセージを表示します。
 * @param t i18n用の翻訳関数
 * @param rows Excelの行データ
 */
export const exportExcelResult = (t: Translate, rows: any[]) => {
  let addCount = 0;
  let updateCount = 0;
  let deleteCount = 0;

  for (const row of rows) {
    // A/U/Dの件数をカウントする。
    switch (row.getCell(1).value) {
      case "A":
        addCount++;
        break;
      case "U":
        updateCount++;
        break;
      case "D":
        deleteCount++;
        break;
    }
  }
  // 成功メッセージを表示する。
  ElMessage.success(t("z9b.message.info.operationSummary", { p0: addCount, p1: updateCount, p2: deleteCount }));
};

/**
 * BusinessError発生時、Excelにエラーメッセージを出力しダウンロードします。
 * @param t i18n用の翻訳関数
 * @param workbook Excelワークブック
 * @param error エラーオブジェクト
 * @param rows Excelの行データ
 * @param column エラーを出力する列のインデックス
 * @param rowHeight 行の高さ
 * @param fileName エラー付きExcelファイルのファイル名
 */
export const exportExcelErrors = (
  t: Translate,
  workbook: Workbook,
  error: unknown,
  rows: any[],
  fileName: string,
  column: number,
  rowHeight: number = 13.5,
) => {
  if (error instanceof BusinessError) {
    // 行番号ごとにエラーメッセージをまとめる
    const errorMap: Record<number, string[]> = {};
    error.errors.forEach((err) => {
      // line がnull/undefinedの場合はスキップ
      if (err.line != null) {
        if (!errorMap[err.line]) errorMap[err.line] = [];
        errorMap[err.line]!.push(err.field + " : " + err.message);
      }
    });
    var errorCount = 0;
    for (let line = 1; line <= rows.length; line++) {
      if (errorMap[line]) {
        // 指定列にエラー内容をセット
        rows[line - 1].getCell(column).value = errorMap[line]!.join("\n");
        rows[line - 1].getCell(column).alignment = { wrapText: true };
        rows[line - 1].height = errorMap[line]!.length * rowHeight;
        errorCount++;
      } else {
        // エラーがなければ空をセット
        rows[line - 1].getCell(column).value = "";
        rows[line - 1].height = rowHeight;
      }
    }
    // エラー付きExcelをダウンロード
    workbook.xlsx.writeBuffer().then((response: ArrayBuffer) => {
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(new Blob([response], { type: excelMimeType }));
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
      ElMessage.error(t("z9b.message.error.errorOccurred", { p0: errorCount }));
    });
  } else {
    throw error;
  }
};

const Excel = {
  generateExcelTemplate,
  loadExcelTemplate,
  loadExcelFile,
  saveExcel,
  exportExcelResult,
  exportExcelErrors,
};

export default Excel;
