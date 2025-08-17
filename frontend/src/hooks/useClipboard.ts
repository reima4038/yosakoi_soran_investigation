import { useState, useCallback, useRef } from 'react';

export interface UseClipboardReturn {
  copyToClipboard: (text: string) => Promise<boolean>;
  isSupported: boolean;
  lastCopied: string | null;
  error: string | null;
  isCopying: boolean;
  copySuccess: boolean;
  resetStatus: () => void;
}

export const useClipboard = (): UseClipboardReturn => {
  const [lastCopied, setLastCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clipboard APIがサポートされているかチェック
  const isSupported = Boolean(
    typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function' &&
      window.isSecureContext // HTTPSまたはlocalhostでのみ利用可能
  );

  const copyToClipboard = useCallback(
    async (text: string): Promise<boolean> => {
      setError(null);
      setCopySuccess(false);
      setIsCopying(true);

      // 既存のタイムアウトをクリア
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (!text) {
        setError('コピーするテキストが空です');
        setIsCopying(false);
        return false;
      }

      try {
        let success = false;

        // Clipboard APIを使用
        if (isSupported) {
          try {
            await navigator.clipboard.writeText(text);
            success = true;
          } catch (err) {
            console.error('Clipboard API failed:', err);
            setError('クリップボードへのコピーに失敗しました');

            // フォールバック処理を試行
            success = fallbackCopy(text);
          }
        } else {
          // フォールバック処理
          success = fallbackCopy(text);
        }

        if (success) {
          setLastCopied(text);
          setCopySuccess(true);

          // 3秒後に成功状態をリセット
          timeoutRef.current = setTimeout(() => {
            setCopySuccess(false);
          }, 3000);
        }

        setIsCopying(false);
        return success;
      } catch (err) {
        console.error('Copy operation failed:', err);
        setError('コピー処理中にエラーが発生しました');
        setIsCopying(false);
        return false;
      }
    },
    [isSupported]
  );

  // フォールバック処理（古いブラウザ対応）
  const fallbackCopy = (text: string): boolean => {
    try {
      // テキストエリアを作成してコピー
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setLastCopied(text);
        return true;
      } else {
        setError('フォールバック処理でのコピーに失敗しました');
        return false;
      }
    } catch (err) {
      
      setError('コピー機能がサポートされていません');
      return false;
    }
  };

  // ステータスリセット関数
  const resetStatus = useCallback(() => {
    setError(null);
    setCopySuccess(false);
    setIsCopying(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    copyToClipboard,
    isSupported,
    lastCopied,
    error,
    isCopying,
    copySuccess,
    resetStatus,
  };
};
