import { logger } from './logger';

export interface NetworkDiagnostics {
  isOnline: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface ApiDiagnostics {
  baseUrl: string;
  healthCheck: boolean;
  authStatus: boolean;
  responseTime: number;
  lastError?: string;
}

/**
 * ネットワーク接続の診断情報を取得
 */
export function getNetworkDiagnostics(): NetworkDiagnostics {
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  return {
    isOnline: navigator.onLine,
    connectionType: connection?.type || 'unknown',
    effectiveType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || 0,
    rtt: connection?.rtt || 0,
    saveData: connection?.saveData || false,
  };
}

/**
 * API接続の診断
 */
export async function diagnoseApiConnection(
  baseUrl: string
): Promise<ApiDiagnostics> {
  const startTime = performance.now();
  let healthCheck = false;
  let authStatus = false;
  let lastError: string | undefined;

  try {
    // ヘルスチェック
    const healthResponse = await fetch(
      `${baseUrl.replace('/api', '')}/health`,
      {
        method: 'GET',
        timeout: 10000,
      } as any
    );

    healthCheck = healthResponse.ok;

    if (!healthCheck) {
      lastError = `Health check failed: ${healthResponse.status} ${healthResponse.statusText}`;
    }
  } catch (error: any) {
    lastError = `Health check error: ${error.message}`;
    logger.error('Health check failed', 'NetworkDiagnostics', {
      error: error.message,
    });
  }

  try {
    // 認証状態チェック（トークンがある場合）
    const token = localStorage.getItem('authToken');
    if (token) {
      const authResponse = await fetch(`${baseUrl}/auth/verify`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      } as any);

      authStatus = authResponse.ok;

      if (!authStatus && !lastError) {
        lastError = `Auth check failed: ${authResponse.status} ${authResponse.statusText}`;
      }
    }
  } catch (error: any) {
    if (!lastError) {
      lastError = `Auth check error: ${error.message}`;
    }
    logger.error('Auth check failed', 'NetworkDiagnostics', {
      error: error.message,
    });
  }

  const responseTime = performance.now() - startTime;

  return {
    baseUrl,
    healthCheck,
    authStatus,
    responseTime,
    lastError,
  };
}

/**
 * 包括的な診断レポートを生成
 */
export async function generateDiagnosticReport(baseUrl: string): Promise<{
  network: NetworkDiagnostics;
  api: ApiDiagnostics;
  browser: {
    userAgent: string;
    language: string;
    cookieEnabled: boolean;
    localStorageAvailable: boolean;
  };
  timestamp: string;
}> {
  const network = getNetworkDiagnostics();
  const api = await diagnoseApiConnection(baseUrl);

  // ローカルストレージの可用性チェック
  let localStorageAvailable = false;
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    localStorageAvailable = true;
  } catch (e) {
    localStorageAvailable = false;
  }

  const browser = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    localStorageAvailable,
  };

  const report = {
    network,
    api,
    browser,
    timestamp: new Date().toISOString(),
  };

  logger.info('診断レポート生成完了', 'NetworkDiagnostics', report);

  return report;
}

/**
 * 診断レポートを人間が読みやすい形式に変換
 */
export function formatDiagnosticReport(
  report: Awaited<ReturnType<typeof generateDiagnosticReport>>
): string {
  const { network, api, browser, timestamp } = report;

  return `
診断レポート (${timestamp})

【ネットワーク状態】
- オンライン状態: ${network.isOnline ? '✓ オンライン' : '✗ オフライン'}
- 接続タイプ: ${network.connectionType}
- 実効速度: ${network.effectiveType}
- ダウンリンク: ${network.downlink} Mbps
- RTT: ${network.rtt} ms
- データ節約モード: ${network.saveData ? 'ON' : 'OFF'}

【API接続状態】
- ベースURL: ${api.baseUrl}
- ヘルスチェック: ${api.healthCheck ? '✓ 正常' : '✗ 失敗'}
- 認証状態: ${api.authStatus ? '✓ 認証済み' : '✗ 未認証'}
- 応答時間: ${api.responseTime.toFixed(0)} ms
${api.lastError ? `- エラー: ${api.lastError}` : ''}

【ブラウザ情報】
- ユーザーエージェント: ${browser.userAgent}
- 言語: ${browser.language}
- Cookie有効: ${browser.cookieEnabled ? 'YES' : 'NO'}
- LocalStorage利用可能: ${browser.localStorageAvailable ? 'YES' : 'NO'}
  `.trim();
}
