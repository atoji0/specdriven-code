/**
 * データフォーマット用のユーティリティ関数群を提供するモジュールです。
 */


/**
 * Date型を指定した区切り文字で YYYY-MM-DD 形式にフォーマットします。
 * @param date Date型
 * @param separator 区切り文字 ('/' | '-' | '')、デフォルトは'-'
 * @returns フォーマットされた日付文字列、入力がnull/undefinedの場合は空文字
 */
export const formatDate = (date?: Date | string | null, sep = '-'): string => {
  if (!date) return "";
  const iso = typeof date === 'string' ? date : date.toISOString();
  return iso.slice(0, 10).replace(/-/g, sep);
}

/**
 * 数値文字列をカンマ区切りでフォーマットします。
 * @param v 数値文字列（例: '1000'）
 * @returns カンマ区切りの文字列（例: '1,000'）、未入力時は空文字
 */
export const formatNumber = (v?: string) =>
  v ? Number(v).toLocaleString() : "";


/**
 * カンマ区切りの数値文字列を数値に変換します。
 * @param v カンマ区切りの数値文字列（例: '1,000'）
 * @returns 数値（例: 1000）、変換できない場合は undefined
 */
export const parseNumber = (v?: string) => {
  if (!v) return undefined;
  const n = Number(v.replace(/,/g, ""));
  return isNaN(n) ? undefined : n;
};

/**
 * 選択肢リストから値に対応する表示ラベルを返します。
 * @param options 選択肢リスト（label / value を持つオブジェクト配列）
 * @param value 検索する値
 * @returns ラベル文字列。見つからない場合は value をそのまま文字列化して返す
 */
export const getLabel = (options: { label: string; value: unknown }[], value: unknown): string =>
  options.find((o) => o.value === value)?.label ?? String(value);

/**
 * 時刻文字列を HH:MM:SS 形式に正規化します（バリデーション通過後に呼ぶ）。
 * @param value HHMMSS または HH:MM:SS 形式の文字列
 * @returns HH:MM:SS 形式の文字列
 */
export const formatTime = (value: string): string => {
  const c = value.replace(/:/g, "");
  return `${c.substring(0, 2)}:${c.substring(2, 4)}:${c.substring(4, 6)}`;
};

/**
 * 時刻文字列を HH:MM 形式に正規化します（バリデーション通過後に呼ぶ）。
 * @param value HHMM または HH:MM 形式の文字列
 * @returns HH:MM 形式の文字列
 */
export const formatTimeHM = (value: string): string => {
  const c = value.replace(/:/g, "");
  return `${c.substring(0, 2)}:${c.substring(2, 4)}`;
};
