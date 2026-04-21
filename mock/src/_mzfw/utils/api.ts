/**
 * API通信処理およびエラー処理のためのユーティリティモジュールです。
 * GET/POST/PUT/DELETE/ダウンロード/アップロードなどの関数を提供します。
 */

import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import FileSaver from "file-saver";
import { useMzfwStore } from "../store";
import { getLocale, getUserId } from "./common";
import { ApplicationError, AuthorizationError, BusinessError, ConnectionError, SystemError } from "../errors";
import type { Translate, ValidationError } from "../fw-types";
import { fwHeaderKey } from "../constants";
import { ElMessage } from "element-plus";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * GETリクエストを送信します。
 * @param url APIエンドポイント
 * @param config Axios設定
 * @returns レスポンスデータ
 */
export const apiGet = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const backendUrl = useMzfwStore().env.backendUrl;
  try {
    const res = await axios.get<T>(backendUrl + url, { ...buildFwHeader(), ...config });
    return res.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * POSTリクエストを送信します。
 * @param url APIエンドポイント
 * @param data 送信データ
 * @param config Axios設定
 * @returns レスポンスデータ
 */
export const apiPost = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  const backendUrl = useMzfwStore().env.backendUrl;
  try {
    const res = await axios.post<T>(backendUrl + url, data, { ...buildFwHeader(), ...config });
    return res.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * PUTリクエストを送信します。
 * @param url APIエンドポイント
 * @param data 送信データ
 * @param config Axios設定
 * @returns レスポンスデータ
 */
export const apiPut = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  const backendUrl = useMzfwStore().env.backendUrl;
  try {
    const res = await axios.put<T>(backendUrl + url, data, { ...buildFwHeader(), ...config });
    return res.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * DELETEリクエストを送信します。
 * @param url APIエンドポイント
 * @param config Axios設定
 * @returns レスポンスデータ
 */
export const apiDelete = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const backendUrl = useMzfwStore().env.backendUrl;
  try {
    const res = await axios.delete<T>(backendUrl + url, { ...buildFwHeader(), ...config });
    return res.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * ファイルダウンロードAPIを呼び出します。
 * @param url APIエンドポイント
 * @param config Axios設定
 * @param fileName 保存ファイル名
 */
export const apiDownload = async (url: string, config?: AxiosRequestConfig, fileName?: string) => {
  const backendUrl = useMzfwStore().env.backendUrl;
  try {
    const res = await axios.get<ArrayBuffer>(backendUrl + url, {
      ...buildFwHeader(),
      responseType: "arraybuffer",
      ...config,
    });
    const contentDisposition = res.headers["content-disposition"];
    if (contentDisposition) {
      fileName = getFileName(contentDisposition);
    }
    const blob = new Blob([res.data]);
    FileSaver.saveAs(blob, fileName);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * ストリームダウンロードAPIを呼び出します（fetch利用）。
 * @param t i18n関数
 * @param url APIエンドポイント
 * @param config fetch設定
 * @param onProgress 進捗コールバック
 * @param fileName 保存ファイル名
 */
export const apiStreamDownload = async (
  t: Translate,
  url: string,
  config?: RequestInit,
  onProgress?: (progress: number) => void,
  fileName?: string,
) => {
  const backendUrl = useMzfwStore().env.backendUrl;
  const axiosHeaders = buildFwHeader().headers;
  const fetchHeaders: Record<string, string> = {};
  if (axiosHeaders) {
    Object.entries(axiosHeaders).forEach(([key, value]) => {
      if (typeof value !== "undefined") {
        fetchHeaders[key] = String(value);
      }
    });
  }
  const res = await fetch(backendUrl + url, {
    method: "GET",
    ...config,
    headers: {
      ...(config?.headers || {}),
      ...fetchHeaders,
    },
  });
  if (!res.ok) throw new ApplicationError(t("z9b.message.error.downloadFailed"));
  const contentDisposition = res.headers.get("content-disposition") || "";
  if (contentDisposition) {
    fileName = getFileName(contentDisposition);
  }
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body?.getReader();
  if (!reader) throw new ApplicationError(t("z9b.message.error.downloadFailed"));
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      if (onProgress && total > 0) {
        onProgress(received / total);
      }
    }
  }
  const blob = new Blob(chunks as BlobPart[]);
  FileSaver.saveAs(blob, fileName);
};

/**
 * ファイルアップロードAPIを呼び出します。
 * @param t i18n関数
 * @param url APIエンドポイント
 * @param files アップロードファイル配列
 * @param data 追加データ
 * @param acceptExtension 許可拡張子
 * @param maxFilesizeMB 最大ファイルサイズ(MB)
 * @param config Axios設定
 * @returns レスポンスデータ
 */
export const apiUpload = async <T>(
  t: Translate,
  url: string,
  files: File[],
  data?: any,
  acceptExtension?: string[],
  maxFilesizeMB: number = 100,
  config?: AxiosRequestConfig,
): Promise<T> => {
  if (files.length == 0) {
    throw new ApplicationError(t("z9b.message.warn.fileNotSelected"));
  }
  let totalSize = 0;
  for (const file of files) {
    if (acceptExtension && acceptExtension.length) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!acceptExtension.includes(ext || "")) {
        throw new ApplicationError(t("z9b.message.error.fileInvalid", { p0: file.name }));
      }
    }
    totalSize += file.size;
  }
  if (data) {
    totalSize += new Blob([JSON.stringify(data)]).size;
  }
  if (maxFilesizeMB && totalSize / 1024 / 1024 > maxFilesizeMB) {
    throw new ApplicationError(t("z9b.message.error.fileSizeLimit", { p0: maxFilesizeMB }));
  }
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  if (data) {
    formData.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));
  }
  const backendUrl = useMzfwStore().env.backendUrl;
  try {
    const res = await axios.post<T>(backendUrl + url, formData, {
      ...buildFwHeader(),
      headers: {
        "Content-Type": "multipart/form-data",
        ...(config?.headers || {}),
      },
      ...config,
    });
    return res.data;
  } catch (error: any) {
    handleApiError(error);
    throw error;
  }
};

/**
 * BusinessError発生時、エラー内容をerrorsオブジェクトにセットします。
 * @param error エラーオブジェクト
 * @param errors フィールドごとのエラーメッセージ格納先
 */
export const handleBusinessError = (error: unknown, errors: Record<string, string | undefined>) => {
  if (error instanceof BusinessError) {
    // 呼び出し前に宣言されていたフィールド名を記録（赤枠表示の対象）
    const knownFields = new Set(Object.keys(errors));
    Object.keys(errors).forEach(k => delete errors[k]);
    error.errors.forEach(e => {
      errors[e.field] = e.message;
    });
    // knownFields が空（errors.value = {} でリセット後）の場合は全フィールドをインライン表示扱いとする
    // knownFields に含まれないフィールドのエラーのみモーダルで表示
    const globalMessages = knownFields.size > 0
      ? error.errors.filter(e => !knownFields.has(e.field)).map(e => e.message)
      : [];
    if (globalMessages.length > 0) {
      ElMessage.error(globalMessages.join("\n"));
    } else if (error.errors.length > 0) {
      ElMessage.error(`${error.errors.length} 件のエラーがあります`);
    }
  } else {
    throw error;
  }
};

/** テーブル一括編集の行グループ（N子テーブル対応） */
export type BulkErrorRowGroup = {
  /** 変更行配列（line 番号でエラーをマップ） */
  dirtyRows: { _errors?: Record<string, string | undefined> }[];
  /** エラークリア対象の全行（省略時は dirtyRows と同じ） */
  allRows?: { _errors?: Record<string, string | undefined> }[];
};

/**
 * テーブル一括編集のサーバーエラーを行・セル・親フォームに反映します。
 *
 * ### 呼び出し形式（2 パターン）
 *
 * **旧形式（後方互換）**
 * ```ts
 * handleBulkBusinessError(error, dirtyRows, allRows)
 * ```
 *
 * **親子対応形式（N 子テーブル対応）**
 * ```ts
 * handleBulkBusinessError(error, rowGroups, parentErrors)
 * // rowGroups: BulkErrorRowGroup[]
 * //   - 複数の子テーブルを持つ場合は配列に追加する
 * //   - サーバーは column = "0"/"1"/... でどのグループか示す（省略時は 0 番目）
 * // parentErrors: { field: undefined, ... } と事前宣言しておくと
 * //   line なし & 宣言済みフィールド → インライン赤枠、それ以外 → モーダル
 * ```
 *
 * @param error BusinessError または再スローするエラー
 * @param rowGroupsOrDirtyRows BulkErrorRowGroup[] または変更行配列（旧形式）
 * @param parentErrorsOrAllRows 親フォームエラー格納オブジェクト、または全行配列（旧形式）
 */
export const handleBulkBusinessError = (
  error: unknown,
  rowGroupsOrDirtyRows:
    | BulkErrorRowGroup[]
    | { _errors?: Record<string, string | undefined> }[],
  parentErrorsOrAllRows?:
    | Record<string, string | undefined>
    | { _errors?: Record<string, string | undefined> }[],
): void => {
  if (!(error instanceof BusinessError)) {
    throw error;
  }

  // ── 引数の正規化 ──────────────────────────────────────────────
  let groups: BulkErrorRowGroup[];
  let parentErrors: Record<string, string | undefined> | undefined;

  const isGroups =
    rowGroupsOrDirtyRows.length > 0 &&
    "dirtyRows" in (rowGroupsOrDirtyRows[0] as object);

  if (isGroups) {
    // 新形式: rowGroups + parentErrors
    groups = rowGroupsOrDirtyRows as BulkErrorRowGroup[];
    parentErrors = Array.isArray(parentErrorsOrAllRows)
      ? undefined
      : (parentErrorsOrAllRows as Record<string, string | undefined> | undefined);
  } else {
    // 旧形式: dirtyRows + allRows（後方互換）
    const dirtyRows = rowGroupsOrDirtyRows as {
      _errors?: Record<string, string | undefined>;
    }[];
    const allRows = Array.isArray(parentErrorsOrAllRows)
      ? (parentErrorsOrAllRows as { _errors?: Record<string, string | undefined> }[])
      : dirtyRows;
    groups = [{ dirtyRows, allRows }];
    parentErrors = undefined;
  }

  // ── エラークリア ──────────────────────────────────────────────
  groups.forEach((g) => (g.allRows ?? g.dirtyRows).forEach((r) => (r._errors = undefined)));

  // ── エラー振り分け ────────────────────────────────────────────
  const parentKnownFields = parentErrors ? new Set(Object.keys(parentErrors)) : undefined;
  let inlineCount = 0;
  const globalMessages: string[] = [];

  error.errors.forEach((e) => {
    if (e.line != null) {
      // 行番号あり → 子テーブルの行エラー
      // 複数グループの場合は e.column をグループインデックスとして使用（"0","1",...）
      let groupIdx = 0;
      if (groups.length > 1 && e.column != null) {
        const idx = parseInt(e.column, 10);
        if (!isNaN(idx) && idx >= 0 && idx < groups.length) groupIdx = idx;
      }
      const row = groups[groupIdx].dirtyRows[e.line - 1];
      if (row) {
        if (!row._errors) row._errors = {};
        row._errors[e.field] = e.message;
        inlineCount++;
      }
    } else if (parentKnownFields?.has(e.field)) {
      // 行番号なし & 親フォームの既知フィールド → インライン赤枠
      parentErrors![e.field] = e.message;
      inlineCount++;
    } else {
      // 行番号なし & 未知フィールド → モーダル
      globalMessages.push(e.message);
    }
  });

  // ── メッセージ表示 ────────────────────────────────────────────
  globalMessages.forEach((msg) => ElMessage.error(msg));
  if (inlineCount > 0) ElMessage.error(`${inlineCount} 件の入力エラーがあります`);
};

// APIエラーを処理する
const handleApiError = (error: any) => {
  if (!error.response) {
    throw new ConnectionError();
  }
  let data = error.response.data;
  if (data instanceof ArrayBuffer) {
    try {
      data = JSON.parse(new TextDecoder("utf-8").decode(data));
    } catch {}
  }

  // バリデーションエラーチェック（バックエンドから { errors: ValidationError[] } 形式で返される）
  if (error.response.status === 400 && Array.isArray(data.errors)) {
    throw new BusinessError(data.errors as ValidationError[]);
  } else if (error.response.status === 401 || error.response.status === 403) {
    // 認可エラー
    throw new AuthorizationError();
  } else if (error.response.status === 409) {
    // 競合エラー
    throw new ApplicationError(data.message);
  } else {
    // その他のエラー
    const header = error.response.headers?.[fwHeaderKey] || "";
    let callerProcessLogId: string = "";
    if (header) {
      try {
        const headerJson = JSON.parse(header);
        callerProcessLogId = headerJson.callerProcessLogId;
      } catch {}
    }
    throw new SystemError(error.response.data?.message, callerProcessLogId);
  }
};

// FWヘッダーを構築する。
const buildFwHeader = (): AxiosRequestConfig => {
  const fwHeader = {
    user: getUserId(),
    language: getLocale(),
    callerProcessLogId: "",
  };
  const headers: Record<string, string> = {};
  headers[fwHeaderKey] = JSON.stringify(fwHeader);
  headers["Cache-Control"] = "no-cache";
  const mzfwStore = useMzfwStore();
  if (mzfwStore.env.useDummyAuth && getUserId()) {
    headers[mzfwStore.env.wssoUserKey] = getUserId();
  }
  return { headers };
};

// ファイル名をContent-Dispositionヘッダーから取得する。
const getFileName = (contentDisposition: string): string => {
  let fileName = contentDisposition.substring(contentDisposition.indexOf("''") + 2, contentDisposition.length);
  return decodeURI(fileName).replace(/\+/g, " ");
};
