/**
 * 日付処理のユーティリティ関数
 * JST（日本標準時）基準での日付処理を提供
 */

// JST（UTC+9）のオフセット（分）
const JST_OFFSET_MINUTES = 9 * 60;

/**
 * UTC日付をJST基準のdatetime-local形式の文字列に変換
 * @param date UTC日付（Date | string | null | undefined）
 * @returns datetime-local形式の文字列（YYYY-MM-DDTHH:mm）
 */
export const formatDateForInput = (date: string | Date | undefined | null): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    // UTC時間をJSTに変換
    const jstDate = new Date(dateObj.getTime() + JST_OFFSET_MINUTES * 60 * 1000);
    return jstDate.toISOString().slice(0, 16);
  } catch (error) {
    console.warn('Date formatting error:', error, 'for date:', date);
    return '';
  }
};

/**
 * datetime-local形式の文字列をUTC日付に変換
 * @param dateString datetime-local形式の文字列
 * @returns UTC日付（Date | undefined）
 */
export const parseDateFromInput = (dateString: string): Date | undefined => {
  if (!dateString) return undefined;
  
  try {
    // datetime-local入力はローカル時間として解釈される
    const localDate = new Date(dateString);
    if (isNaN(localDate.getTime())) {
      throw new Error('Invalid date');
    }
    
    // JSTからUTCに変換
    const utcDate = new Date(localDate.getTime() - JST_OFFSET_MINUTES * 60 * 1000);
    return utcDate;
  } catch (error) {
    throw new Error(`日付の形式が正しくありません: ${dateString}`);
  }
};

/**
 * 日付を日本語形式で表示用にフォーマット
 * @param date 日付（Date | string | null | undefined）
 * @param includeTime 時刻を含めるかどうか（デフォルト: true）
 * @returns フォーマットされた日付文字列
 */
export const formatDateForDisplay = (
  date: string | Date | undefined | null,
  includeTime: boolean = true
): string => {
  if (!date) return '未設定';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // 無効な日付の場合
    if (isNaN(dateObj.getTime())) {
      return '無効な日付';
    }

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Tokyo', // JST基準で表示
    };

    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }

    return dateObj.toLocaleDateString('ja-JP', options);
  } catch (error) {
    return '日付エラー';
  }
};

/**
 * 現在の日時をJST基準で取得
 * @returns 現在の日時（Date）
 */
export const getCurrentJSTDate = (): Date => {
  return new Date();
};

/**
 * 日付が有効かどうかをチェック
 * @param date チェックする日付
 * @returns 有効な日付かどうか
 */
export const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};