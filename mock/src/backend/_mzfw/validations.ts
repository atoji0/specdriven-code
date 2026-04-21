/**
 * MODULE: validations — バリデーション関数群
 * 全関数はエラーなしで "" または null を返す。エラー時はメッセージ文字列を返す。
 *
 * ─── Enums ────────────────────────────────────────────────────────────────────
 * ValidationRange:  None | Between | Min | Max
 * ValidationCharType: 後述（正規表現値の enum）
 *
 * Types:
 *   ValidationError  { field, message, column?, line? }
 *
 * ─── Functions ────────────────────────────────────────────────────────────────
 * validateText(value?,required,rangeId?,minLen?,maxLen?,charType?)  → string
 *   テキストの必須・長さ・文字種チェック。
 *   固定N桁: Between + minLength=maxLength=N。文字種: ValidationCharType.Xxx。
 *
 * validateInteger(value,required,rangeId?,minLen?,maxLen?,maxDigit?)  → string
 *   文字列を整数として受け取り、桁数チェック。maxDigit で最大桁を指定。
 *
 * validateIntegerRange(value?,rangeId?,minVal?,maxVal?)  → string
 *   number 型の値域チェック。value が undefined/null なら素通り。
 *
 * validateDecimal(value,required,rangeId?,minVal?,maxVal?)  → string|null
 *   文字列を小数として受け取り、値域チェック。
 *
 * validateDecimalRange(value,rangeId?,minVal?,maxVal?,intDigit?,decDigit?)  → string|null
 *   number 型の小数値域 + 整数部/小数部の桁数チェック。
 *
 * validateDate(value,required,rangeId?,minVal?,maxVal?)  → string
 *   YYYY-MM-DD 文字列として受け取り、形式 + 値域チェック。
 *
 * validateDateRange(value,required,rangeId?,minVal?,maxVal?)  → string
 *   Date 型の値域チェック。
 *
 * validateDateConsistency(fromDate,toDate,fromDateColumn?)  → string|null
 *   fromDate ≤ toDate の相関チェック。fromDateColumn はエラーメッセージに埋め込む項目名。
 *
 * validateTime(value,required)  → string
 *   HHMMSS または HH:MM:SS 形式の時刻チェック。
 *
 * validateTimeHM(value,required)  → string
 *   HHMM または HH:MM 形式の時刻チェック。
 *
 * validateOption(value,required,selectOptions[])  → string
 *   選択肢チェック。selectOptions: OPTIONS.map(o => String(o.value))。
 *
 * validateRegularExpression(value,required,rangeId?,minLen?,maxLen?,customRegexp,msg)  → string|null
 *   カスタム正規表現チェック。customMessage がエラー時にそのまま表示される。
 *
 * validateRecordExists(record,expectedVersion?)  → string
 *   UPDATE/DELETE 冒頭で使う。レコード存在確認 + 楽観ロック（version 不一致）を兼ねる。
 *
 * validateExists(record)  → string
 *   ADD 時の単一キー重複チェック。findByCode 等の結果を渡す（null なら OK）。
 *
 * validateExistsComposite(record,keys[])  → string
 *   ADD 時の複合キー重複チェック。keys にフィールド名を渡すとメッセージに含まれる。
 *
 * validateLinkedRecord(records[])  → string
 *   DELETE 前の参照整合性チェック。他テーブルで使用中のレコードを削除させない。
 *
 * validateReferenceExists(record)  → string
 *   ADD/UPDATE 時に外部キー入力値の参照先存在確認。validateRecordExists とは用途が異なる。
 *
 * ─── ValidationCharType ───────────────────────────────────────────────────────
 *   AsciiDigitsOnly                   ^[0-9]+$
 *   AsciiSignedDigits                 ^-?[0-9]+$
 *   AsciiUppercaseLetters             ^[A-Z]+$
 *   AsciiUppercaseAlphanumeric        ^[0-9A-Z]+$
 *   AsciiLetters                      ^[A-Za-z]+$
 *   AsciiAlphanumeric                 ^[0-9a-zA-Z]+$
 *   AsciiAlphanumericSpace            ^[0-9a-zA-Z ]+$
 *   AsciiAlphanumericHyphen           ^[0-9a-zA-Z-]+$
 *   AsciiAlphanumericUnderscore       ^[0-9a-zA-Z_]+$
 *   AsciiAlphanumericHyphenUnderscore ^[0-9a-zA-Z_-]+$
 *   AsciiPrintable                    ^[!-~\x20]+$
 *   AsciiAlphanumericHalfKana         ^[a-zA-Z0-9ｦ-ﾟ]+$
 *   AsciiOrHalfKana                   ^[a-zA-Z0-9ｦ-ﾟ!-~\x20]+$
 *   FullWidthOnly                     ^[^!-~｡-ﾟ\x20]+$
 *   Hiragana                          ^[ぁ-ん]+$
 *   Katakana                          ^[ァ-ン]+$
 *   HiraganaOrKatakana                ^[ぁ-んァ-ン]+$
 */

import { getMessage } from "./message";

export enum ValidationRange {
  None = "None",
  Between = "Between",
  Min = "Min",
  Max = "Max",
}

export enum ValidationCharType {
  AsciiDigitsOnly                   = "^[0-9]+$",
  AsciiSignedDigits                 = "^-?[0-9]+$",
  AsciiUppercaseLetters             = "^[A-Z]+$",
  AsciiUppercaseAlphanumeric        = "^[0-9A-Z]+$",
  AsciiLetters                      = "^[A-Za-z]+$",
  AsciiAlphanumeric                 = "^[0-9a-zA-Z]+$",
  AsciiAlphanumericSpace            = "^[0-9a-zA-Z ]+$",
  AsciiAlphanumericHyphen           = "^[0-9a-zA-Z-]+$",
  AsciiAlphanumericUnderscore       = "^[0-9a-zA-Z_]+$",
  AsciiAlphanumericHyphenUnderscore = "^[0-9a-zA-Z_-]+$",
  AsciiPrintable                    = "^[!-~\x20]+$",
  AsciiAlphanumericHalfKana         = "^[a-zA-Z0-9ｦ-ﾟ]+$",
  AsciiOrHalfKana                   = "^[a-zA-Z0-9ｦ-ﾟ!-~\x20]+$",
  FullWidthOnly                     = "^[^!-~｡-ﾟ\x20]+$",
  Hiragana                          = "^[ぁ-ん]+$",
  Katakana                          = "^[ァ-ン]+$",
  HiraganaOrKatakana                = "^[ぁ-んァ-ン]+$",
}

export interface ValidationError {
  field: string;
  message: string;
  column?: string;
  line?: number;
}


// ========================================
// 1. ValidateText
// ========================================

export function validateText(params: {
  /** チェック対象の値 */
  value?: string;
  /** 必須フラグ */
  required: boolean;
  /** 範囲指定 */
  validationRangeId?: ValidationRange;
  /** 最小桁数 */
  minLength?: number;
  /** 最大桁数 */
  maxLength?: number;
  /** 文字種別ID */
  validationCharType?: ValidationCharType;
}): string {
  const {
    value,
    required,
    validationRangeId = ValidationRange.None,
    minLength = 0,
    maxLength = 0,
    validationCharType,
  } = params;

  // 1. 必須チェック
  if (required && (!value || value.trim() === "")) {
    return getMessage("validation.required");
  }

  // 値が空の場合（任意項目）、以降のチェックはスキップ
  if (!value || value.trim() === "") {
    return "";
  }

  const length = value.length;

  // 2. 長さチェック
  switch (validationRangeId) {
    case ValidationRange.Between:
      if (maxLength === minLength) {
        if (length !== minLength) {
          return getMessage("validation.lengthFixed", minLength);
        }
      } else if (length < minLength || length > maxLength) {
        return getMessage("validation.lengthBetween", minLength, maxLength);
      }
      break;

    case ValidationRange.Min:
      if (length < minLength) {
        return getMessage("validation.lengthMin", minLength);
      }
      break;

    case ValidationRange.Max:
      if (length > maxLength) {
        return getMessage("validation.lengthMax", maxLength);
      }
      break;

    case ValidationRange.None:
    default:
      // 範囲チェックなし
      break;
  }

  // 3. 文字種別チェック
  if (validationCharType) {
    const regex = new RegExp(validationCharType);
    if (!regex.test(value)) {
      const charTypeName = (Object.keys(ValidationCharType) as (keyof typeof ValidationCharType)[])
        .find(key => ValidationCharType[key] === validationCharType) ?? validationCharType;
      const charTypeLabel = getMessage(`charType.${charTypeName}`);
      return getMessage("validation.charTypeInvalid", charTypeLabel);
    }
  }

  return "";
}

// ========================================
// 2. ValidateInteger
// ========================================

export function validateInteger(params: {
  value: string;
  required: boolean;
  validationRangeId?: ValidationRange;
  minLength?: number;
  maxLength?: number;
  maxDigit?: number;
}): string {
  const {
    value,
    required,
    validationRangeId = ValidationRange.None,
    minLength = 0,
    maxLength = 0,
    maxDigit = -1,
  } = params;

  if (required && (!value || value.trim() === "")) {
    return getMessage("validation.required");
  }

  if (!value || value.trim() === "") {
    return "";
  }

  const intValue = parseInt(value, 10);
  if (isNaN(intValue) || !/^-?\d+$/.test(value.trim())) {
    return getMessage("validation.integerInvalid");
  }

  const digitCount = value.replace("-", "").length;
  if (maxDigit > 0 && digitCount > maxDigit) {
    return getMessage("validation.lengthMax", maxDigit);
  }

  switch (validationRangeId) {
    case ValidationRange.Between:
      if (digitCount < minLength || digitCount > maxLength) {
        return getMessage("validation.lengthBetween", minLength, maxLength);
      }
      break;
    case ValidationRange.Min:
      if (digitCount < minLength) {
        return getMessage("validation.lengthMin", minLength);
      }
      break;
    case ValidationRange.Max:
      if (digitCount > maxLength) {
        return getMessage("validation.lengthMax", maxLength);
      }
      break;
  }

  return "";
}

// ========================================
// 3. ValidateIntegerRange
// ========================================

export function validateIntegerRange(params: {
  value?: number;
  validationRangeId?: ValidationRange;
  minValue?: number;
  maxValue?: number;
}): string {
  const {
    value,
    validationRangeId = ValidationRange.None,
    minValue = 0,
    maxValue = 0,
  } = params;

  if (value === undefined || value === null) {
    return "";
  }

  switch (validationRangeId) {
    case ValidationRange.Between:
      if (value < minValue || value > maxValue) {
        return getMessage("validation.integerRangeBetween", minValue, maxValue);
      }
      break;
    case ValidationRange.Min:
      if (value < minValue) {
        return getMessage("validation.integerRangeMin", minValue);
      }
      break;
    case ValidationRange.Max:
      if (value > maxValue) {
        return getMessage("validation.integerRangeMax", maxValue);
      }
      break;
  }

  return "";
}

// ========================================
// 4. ValidateDecimal
// ========================================

export function validateDecimal(params: {
  value: string;
  required: boolean;
  validationRangeId?: ValidationRange;
  minValue?: number;
  maxValue?: number;
}): string | null {
  const {
    value,
    required,
    validationRangeId = ValidationRange.None,
    minValue = 0,
    maxValue = 0,
  } = params;

  if (required && (!value || value.trim() === "")) {
    return getMessage("validation.required");
  }

  if (!value || value.trim() === "") {
    return null;
  }

  const decimalValue = parseFloat(value);
  if (isNaN(decimalValue)) {
    return getMessage("validation.decimalInvalid");
  }

  switch (validationRangeId) {
    case ValidationRange.Between:
      if (decimalValue < minValue || decimalValue > maxValue) {
        return getMessage("validation.decimalRangeBetween", minValue, maxValue);
      }
      break;
    case ValidationRange.Min:
      if (decimalValue < minValue) {
        return getMessage("validation.decimalRangeMin", minValue);
      }
      break;
    case ValidationRange.Max:
      if (decimalValue > maxValue) {
        return getMessage("validation.decimalRangeMax", maxValue);
      }
      break;
  }

  return null;
}

// ========================================
// 5. ValidateDecimalRange
// ========================================

export function validateDecimalRange(params: {
  value: number;
  validationRangeId?: ValidationRange;
  minValue?: number;
  maxValue?: number;
  integerDigit?: number;
  decimalDigit?: number;
}): string | null {
  const {
    value,
    validationRangeId = ValidationRange.None,
    minValue = 0,
    maxValue = 0,
    integerDigit = 0,
    decimalDigit = 0,
  } = params;

  if (integerDigit > 0 || decimalDigit > 0) {
    const valueStr = value.toString();
    const parts = valueStr.split(".");
    const integerPart = (parts[0] || "").replace("-", "");
    const decimalPart = parts[1] || "";

    if ((integerDigit > 0 && integerPart.length > integerDigit) || (decimalDigit > 0 && decimalPart.length > decimalDigit)) {
      return getMessage("validation.decimalDigitInvalid", integerDigit, decimalDigit);
    }
  }

  switch (validationRangeId) {
    case ValidationRange.Between:
      if (value < minValue || value > maxValue) {
        return getMessage("validation.decimalRangeBetween", minValue, maxValue);
      }
      break;
    case ValidationRange.Min:
      if (value < minValue) {
        return getMessage("validation.decimalRangeMin", minValue);
      }
      break;
    case ValidationRange.Max:
      if (value > maxValue) {
        return getMessage("validation.decimalRangeMax", maxValue);
      }
      break;
  }

  return null;
}

// ========================================
// 6. ValidateDate
// ========================================

export function validateDate(params: {
  value: string;
  required: boolean;
  validationRangeId?: ValidationRange;
  minValue?: Date;
  maxValue?: Date;
}): string {
  const {
    value,
    required,
    validationRangeId = ValidationRange.None,
    minValue,
    maxValue,
  } = params;

  if (required && (!value || value.trim() === "")) {
    return getMessage("validation.required");
  }

  if (!value || value.trim() === "") {
    return "";
  }

  const dateValue = new Date(value);
  if (isNaN(dateValue.getTime())) {
    return getMessage("validation.dateInvalid");
  }

  if (minValue || maxValue) {
    switch (validationRangeId) {
      case ValidationRange.Between:
        if (minValue && maxValue && (dateValue < minValue || dateValue > maxValue)) {
          return getMessage("validation.dateRangeBetween", minValue.toISOString().split("T")[0], maxValue.toISOString().split("T")[0]);
        }
        break;
      case ValidationRange.Min:
        if (minValue && dateValue < minValue) {
          return getMessage("validation.dateRangeMin", minValue.toISOString().split("T")[0]);
        }
        break;
      case ValidationRange.Max:
        if (maxValue && dateValue > maxValue) {
          return getMessage("validation.dateRangeMax", maxValue.toISOString().split("T")[0]);
        }
        break;
    }
  }

  return "";
}

// ========================================
// 7. ValidateDateRange
// ========================================

export function validateDateRange(params: {
  value: Date;
  required: boolean;
  validationRangeId?: ValidationRange;
  minValue?: Date;
  maxValue?: Date;
}): string {
  const {
    value,
    required,
    validationRangeId = ValidationRange.None,
    minValue,
    maxValue,
  } = params;

  if (required && !value) {
    return getMessage("validation.required");
  }

  if (!value) {
    return "";
  }

  if (minValue || maxValue) {
    switch (validationRangeId) {
      case ValidationRange.Between:
        if (minValue && maxValue && (value < minValue || value > maxValue)) {
          return getMessage("validation.dateRangeBetween", minValue.toISOString().split("T")[0], maxValue.toISOString().split("T")[0]);
        }
        break;
      case ValidationRange.Min:
        if (minValue && value < minValue) {
          return getMessage("validation.dateRangeMin", minValue.toISOString().split("T")[0]);
        }
        break;
      case ValidationRange.Max:
        if (maxValue && value > maxValue) {
          return getMessage("validation.dateRangeMax", maxValue.toISOString().split("T")[0]);
        }
        break;
    }
  }

  return "";
}

// ========================================
// 8. ValidateTime
// ========================================

export function validateTime(params: {
  value: string;
  required: boolean;
}): string {
  const { value, required } = params;

  if (required && (!value || value.trim() === "")) {
    return getMessage("validation.required");
  }

  if (!value || value.trim() === "") {
    return "";
  }

  const cleanValue = value.replace(/:/g, "");
  if (cleanValue.length !== 6 || !/^\d{6}$/.test(cleanValue)) {
    return getMessage("validation.timeInvalid");
  }

  const hh = parseInt(cleanValue.substring(0, 2), 10);
  const mm = parseInt(cleanValue.substring(2, 4), 10);
  const ss = parseInt(cleanValue.substring(4, 6), 10);

  if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) {
    return getMessage("validation.timeInvalid");
  }

  return "";
}

// ========================================
// 9. ValidateTimeHM
// ========================================

export function validateTimeHM(params: {
  value: string;
  required: boolean;
}): string {
  const { value, required } = params;

  if (required && (!value || value.trim() === "")) {
    return getMessage("validation.required");
  }

  if (!value || value.trim() === "") {
    return "";
  }

  const cleanValue = value.replace(/:/g, "");
  if (cleanValue.length !== 4 || !/^\d{4}$/.test(cleanValue)) {
    return getMessage("validation.timeHMInvalid");
  }

  const hh = parseInt(cleanValue.substring(0, 2), 10);
  const mm = parseInt(cleanValue.substring(2, 4), 10);

  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return getMessage("validation.timeHMInvalid");
  }

  return "";
}

// ========================================
// 10. ValidateRegularExpression
// ========================================

export function validateRegularExpression(params: {
  value: string;
  required: boolean;
  validationRangeId?: ValidationRange;
  minLength?: number;
  maxLength?: number;
  customRegularExp: string;
  customMessage: string;
}): string | null {
  const {
    value,
    required,
    validationRangeId = ValidationRange.None,
    minLength = 0,
    maxLength = 0,
    customRegularExp,
    customMessage,
  } = params;

  if (required && (!value || value.trim() === "")) {
    return getMessage("validation.required");
  }

  if (!value || value.trim() === "") {
    return null;
  }

  const length = value.length;

  switch (validationRangeId) {
    case ValidationRange.Between:
      if (length < minLength || length > maxLength) {
        return getMessage("validation.lengthBetween", minLength, maxLength);
      }
      break;
    case ValidationRange.Min:
      if (length < minLength) {
        return getMessage("validation.lengthMin", minLength);
      }
      break;
    case ValidationRange.Max:
      if (length > maxLength) {
        return getMessage("validation.lengthMax", maxLength);
      }
      break;
  }

  if (customRegularExp) {
    const regex = new RegExp(customRegularExp);
    if (!regex.test(value)) {
      return getMessage("validation.regexInvalid", customMessage);
    }
  }

  return null;
}

// ========================================
// 11. ValidateDateConsistency
// ========================================

export function validateDateConsistency(params: {
  fromDate: Date;
  toDate: Date;
  fromDateColumn?: string;
}): string | null {
  const { fromDate, toDate, fromDateColumn = "開始日" } = params;

  if (fromDate && toDate && fromDate > toDate) {
    return getMessage("validation.dateConsistency", fromDateColumn);
  }

  return null;
}

// ========================================
// 12. ValidateRecordExists
// ========================================

export function validateRecordExists<T extends { id?: number | string; version?: number }>(params: {
  record: T | null;
  expectedVersion?: number;
}): string {
  const { record, expectedVersion } = params;

  if (!record) {
    return getMessage("validation.recordNotFound");
  }

  if (expectedVersion !== undefined && record.version !== undefined && record.version !== expectedVersion) {
    return getMessage("validation.versionConflict");
  }

  return "";
}

// ========================================
// 13. ValidateExists
// ========================================

export function validateExists<T>(params: {
  record: T | null | undefined;
}): string {
  const { record } = params;
  if (record !== null && record !== undefined) {
    return getMessage("validation.existsDuplicate");
  }
  return "";
}

export function validateExistsComposite<T>(params: {
  record: T | null | undefined;
  keys: string[];
}): string {
  const { record, keys } = params;
  if (record !== null && record !== undefined) {
    return getMessage("validation.existsDuplicateComposite", keys.join("、"));
  }
  return "";
}

// ========================================
// 14. ValidateLinkedRecord
// ========================================

export function validateLinkedRecord<T>(params: {
  /** 参照元のレコード一覧（1件以上存在すると削除不可） */
  records: T[];
}): string {
  const { records } = params;
  if (records.length > 0) {
    return getMessage("validation.linkedRecord");
  }
  return "";
}

// ========================================
// 15. ValidateReferenceExists
// ========================================

export function validateReferenceExists<T>(params: {
  /** 参照先レコード（null/undefined ならエラー） */
  record: T | null | undefined;
}): string {
  const { record } = params;
  if (record === null || record === undefined) {
    return getMessage("validation.referenceNotFound");
  }
  return "";
}

// ========================================
// 16. ValidateOption
// ========================================

export function validateOption(params: {
  value: string;
  required: boolean;
  selectOptions: string[];
}): string {
  const { value, required, selectOptions } = params;

  if (required && (!value || value.trim() === "")) {
    return getMessage("validation.required");
  }

  if (!value || value.trim() === "") {
    return "";
  }

  if (!selectOptions.includes(value)) {
    return getMessage("validation.optionInvalid");
  }

  return "";
}
