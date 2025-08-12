// エラーハンドリングユーティリティ

export interface ErrorInfo {
  message: string;
  severity: 'error' | 'warning' | 'info';
  action?: {
    label: string;
    handler: () => void;
  };
  details?: string;
}

export interface ApiError {
  response?: {
    status: number;
    data?: any;
  };
  code?: string;
  message?: string;
}

/**
 * APIエラーを統一されたエラー情報に変換する
 */
export const handleApiError = (
  error: ApiError,
  context: string = 'API操作'
): ErrorInfo => {
  console.error(`${context} error:`, error);

  // ネットワークエラー
  if (error.code === 'NETWORK_ERROR' || !error.response) {
    return {
      message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
      severity: 'error',
      details: 'ネットワーク接続に問題があるか、サーバーが応答していません。',
    };
  }

  const status = error.response.status;
  const errorData = error.response.data;

  switch (status) {
    case 400:
      return {
        message: '入力データに問題があります。',
        severity: 'error',
        details: errorData?.message || '送信されたデータが正しくありません。入力内容を確認してください。',
      };

    case 401:
      return {
        message: '認証が必要です。',
        severity: 'error',
        details: '再度ログインしてください。',
      };

    case 403:
      return {
        message: 'この操作を実行する権限がありません。',
        severity: 'error',
        details: '管理者にお問い合わせください。',
      };

    case 404:
      return {
        message: '指定されたリソースが見つかりません。',
        severity: 'error',
        details: 'リソースが削除されたか、URLが間違っている可能性があります。',
      };

    case 409:
      return {
        message: 'データの競合が発生しました。',
        severity: 'warning',
        details: '他のユーザーが同じデータを変更している可能性があります。ページを再読み込みしてください。',
      };

    case 422:
      return {
        message: 'データの検証に失敗しました。',
        severity: 'error',
        details: errorData?.message || '入力されたデータが要件を満たしていません。',
      };

    case 429:
      return {
        message: 'リクエストが多すぎます。',
        severity: 'warning',
        details: 'しばらく時間をおいてから再度お試しください。',
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        message: 'サーバーエラーが発生しました。',
        severity: 'error',
        details: 'しばらく時間をおいてから再度お試しください。問題が続く場合は管理者にお問い合わせください。',
      };

    default:
      return {
        message: `${context}に失敗しました。`,
        severity: 'error',
        details: error.message || `予期しないエラーが発生しました（ステータス: ${status}）。`,
      };
  }
};

/**
 * セッション関連のエラーメッセージを生成する
 */
export const handleSessionError = (error: ApiError, operation: string): ErrorInfo => {
  const baseError = handleApiError(error, `セッション${operation}`);

  // セッション固有のエラーメッセージをカスタマイズ
  if (error.response?.status === 404) {
    return {
      ...baseError,
      message: 'セッションが見つかりません。',
      details: 'セッションが削除されたか、URLが間違っている可能性があります。',
    };
  }

  if (error.response?.status === 403) {
    return {
      ...baseError,
      message: 'このセッションにアクセスする権限がありません。',
      details: 'セッションの作成者またはシステム管理者のみがアクセスできます。',
    };
  }

  return baseError;
};

/**
 * 参加者管理関連のエラーメッセージを生成する
 */
export const handleParticipantError = (error: ApiError, operation: string): ErrorInfo => {
  const baseError = handleApiError(error, `参加者${operation}`);

  // 参加者管理固有のエラーメッセージをカスタマイズ
  if (error.response?.status === 403) {
    return {
      ...baseError,
      message: '参加者を管理する権限がありません。',
      details: 'セッションの作成者またはシステム管理者のみが参加者を管理できます。',
    };
  }

  if (error.response?.status === 409) {
    return {
      ...baseError,
      message: '参加者の状態が変更されています。',
      details: '他のユーザーが参加者情報を変更した可能性があります。ページを再読み込みしてください。',
    };
  }

  return baseError;
};

/**
 * バリデーションエラーを統一されたエラー情報に変換する
 */
export const handleValidationError = (
  field: string,
  value: any,
  rules: string[]
): ErrorInfo | null => {
  for (const rule of rules) {
    switch (rule) {
      case 'required':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return {
            message: `${field}は必須です。`,
            severity: 'error',
          };
        }
        break;

      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return {
            message: '有効なメールアドレスを入力してください。',
            severity: 'error',
          };
        }
        break;

      case 'minLength:3':
        if (value && value.length < 3) {
          return {
            message: `${field}は3文字以上で入力してください。`,
            severity: 'error',
          };
        }
        break;

      case 'maxLength:255':
        if (value && value.length > 255) {
          return {
            message: `${field}は255文字以内で入力してください。`,
            severity: 'error',
          };
        }
        break;

      case 'future':
        if (value && new Date(value) <= new Date()) {
          return {
            message: `${field}は現在時刻より後に設定してください。`,
            severity: 'error',
          };
        }
        break;
    }
  }

  return null;
};

/**
 * 成功メッセージを生成する
 */
export const createSuccessMessage = (operation: string): ErrorInfo => {
  return {
    message: `${operation}が完了しました。`,
    severity: 'info',
  };
};

/**
 * 確認メッセージを生成する
 */
export const createConfirmMessage = (
  operation: string,
  target: string,
  onConfirm: () => void
): ErrorInfo => {
  return {
    message: `${target}を${operation}しますか？`,
    severity: 'warning',
    details: 'この操作は取り消すことができません。',
    action: {
      label: '実行',
      handler: onConfirm,
    },
  };
};