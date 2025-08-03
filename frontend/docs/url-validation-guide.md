# フロントエンドURL検証ガイド

## 概要

このガイドでは、フロントエンド用のYouTube URL検証ユーティリティの使用方法について説明します。

## 主要機能

### 1. URL正規化
- 様々なYouTube URL形式に対応
- メタデータ抽出（タイムスタンプ、プレイリスト情報）
- プロトコル補完

### 2. リアルタイムバリデーション
- デバウンス機能付き
- 入力状態の判定
- ユーザーフレンドリーなヒント

### 3. Reactフック
- `useURLValidation`: 単一URL検証
- `useMultipleURLValidation`: 複数URL検証
- `useURLInput`: 入力フィールド用
- `useBatchURLValidation`: バッチ処理用

## 基本的な使用方法

### URL正規化

```typescript
import { YouTubeURLNormalizer } from '../utils/urlNormalizer';

// 基本的な正規化
const result = YouTubeURLNormalizer.normalize('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest');

console.log(result);
// {
//   original: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest',
//   canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
//   videoId: 'dQw4w9WgXcQ',
//   isValid: true,
//   metadata: {
//     playlist: 'PLtest'
//   }
// }

// クイック検証
const validation = YouTubeURLNormalizer.validateQuick('https://youtu.be/dQw4w9WgXcQ');

if (validation.isValid) {
  console.log('有効なURL:', validation.normalizedUrl);
} else {
  console.log('エラー:', validation.error?.message);
}
```

### 入力状態の判定

```typescript
import { YouTubeURLNormalizer } from '../utils/urlNormalizer';

const inputState = YouTubeURLNormalizer.getInputState('https://www.youtube');
// 'typing' - 入力中

const hint = YouTubeURLNormalizer.getURLHint('https://www.youtube.com/channel/test');
// '動画ページのURLを入力してください（例: https://www.youtube.com/watch?v=...)'
```

## Reactフックの使用方法

### useURLValidation

単一のURL入力フィールドでの使用：

```typescript
import React, { useState } from 'react';
import { useURLValidation } from '../hooks/useURLValidation';

function URLInputComponent() {
  const [url, setUrl] = useState('');
  const {
    validationResult,
    isValidating,
    inputState,
    hint,
    validate,
    validateImmediate,
    clear
  } = useURLValidation({
    debounceDelay: 300
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    validate(value);
  };

  const handleSubmit = () => {
    validateImmediate(url);
    if (validationResult?.isValid) {
      console.log('正規化されたURL:', validationResult.normalizedUrl);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={url}
        onChange={handleInputChange}
        placeholder="YouTube URLを入力してください"
        className={`input ${inputState === 'valid' ? 'valid' : inputState === 'invalid' ? 'invalid' : ''}`}
      />
      
      {isValidating && <span>検証中...</span>}
      
      {hint && (
        <div className="hint">{hint}</div>
      )}
      
      {validationResult && !validationResult.isValid && (
        <div className="error">
          {validationResult.error?.message}
          {validationResult.error?.suggestion && (
            <div className="suggestion">{validationResult.error.suggestion}</div>
          )}
        </div>
      )}
      
      {validationResult?.isValid && (
        <div className="success">
          ✓ 有効なYouTube URL
          <div>動画ID: {validationResult.normalizedUrl?.videoId}</div>
        </div>
      )}
      
      <button onClick={handleSubmit} disabled={!validationResult?.isValid}>
        登録
      </button>
    </div>
  );
}
```

### useURLInput

より簡単な入力フィールド用フック：

```typescript
import React, { useState } from 'react';
import { useURLInput } from '../hooks/useURLValidation';

function SimpleURLInput() {
  const [url, setUrl] = useState('');
  
  const {
    validationResult,
    isValidating,
    inputState,
    hint,
    inputProps,
    isFocused
  } = useURLInput({
    debounceDelay: 300,
    onValidURL: (normalizedUrl) => {
      console.log('有効なURL:', normalizedUrl);
    },
    onInvalidURL: (error) => {
      console.log('エラー:', error);
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    inputProps.onChange(value);
  };

  return (
    <div className={`input-container ${isFocused ? 'focused' : ''}`}>
      <input
        type="text"
        value={url}
        onChange={handleChange}
        onFocus={inputProps.onFocus}
        onBlur={inputProps.onBlur}
        placeholder="YouTube URLを入力してください"
        className={`input ${inputState}`}
      />
      
      {isValidating && <div className="loading">検証中...</div>}
      
      {hint && <div className="hint">{hint}</div>}
      
      {validationResult && !validationResult.isValid && (
        <div className="error-message">
          {validationResult.error?.message}
        </div>
      )}
    </div>
  );
}
```

### useMultipleURLValidation

複数のURL入力を管理：

```typescript
import React, { useState } from 'react';
import { useMultipleURLValidation } from '../hooks/useURLValidation';

function MultipleURLInput() {
  const [urls, setUrls] = useState<{ id: string; value: string }[]>([
    { id: '1', value: '' }
  ]);

  const {
    validationResults,
    isValidating,
    validateURL,
    removeURL,
    getValidURLs
  } = useMultipleURLValidation({
    debounceDelay: 300
  });

  const addURL = () => {
    const newId = Date.now().toString();
    setUrls([...urls, { id: newId, value: '' }]);
  };

  const updateURL = (id: string, value: string) => {
    setUrls(urls.map(url => url.id === id ? { ...url, value } : url));
    validateURL(id, value);
  };

  const deleteURL = (id: string) => {
    setUrls(urls.filter(url => url.id !== id));
    removeURL(id);
  };

  const handleSubmit = () => {
    const validURLs = getValidURLs();
    console.log('有効なURL一覧:', validURLs);
  };

  return (
    <div>
      <h3>YouTube URL一括登録</h3>
      
      {urls.map((url) => {
        const validation = validationResults.get(url.id);
        
        return (
          <div key={url.id} className="url-input-row">
            <input
              type="text"
              value={url.value}
              onChange={(e) => updateURL(url.id, e.target.value)}
              placeholder="YouTube URLを入力してください"
              className={`input ${validation?.isValid ? 'valid' : validation && !validation.isValid ? 'invalid' : ''}`}
            />
            
            <button onClick={() => deleteURL(url.id)}>削除</button>
            
            {validation && !validation.isValid && (
              <div className="error">{validation.error?.message}</div>
            )}
          </div>
        );
      })}
      
      <button onClick={addURL}>URL追加</button>
      
      {isValidating && <div>検証中...</div>}
      
      <div className="summary">
        有効なURL: {getValidURLs().length} / {urls.length}
      </div>
      
      <button 
        onClick={handleSubmit} 
        disabled={getValidURLs().length === 0}
      >
        一括登録
      </button>
    </div>
  );
}
```

### useBatchURLValidation

大量のURLを効率的に処理：

```typescript
import React, { useState } from 'react';
import { useBatchURLValidation } from '../hooks/useURLValidation';

function BatchURLProcessor() {
  const [urlText, setUrlText] = useState('');
  
  const {
    validateBatch,
    isValidating,
    progress,
    results,
    cancel
  } = useBatchURLValidation({
    batchSize: 10,
    delay: 100
  });

  const handleProcess = async () => {
    const urls = urlText.split('\n').filter(url => url.trim());
    await validateBatch(urls);
  };

  const validCount = results.filter(r => r.isValid).length;
  const invalidCount = results.filter(r => !r.isValid).length;

  return (
    <div>
      <h3>URL一括検証</h3>
      
      <textarea
        value={urlText}
        onChange={(e) => setUrlText(e.target.value)}
        placeholder="URLを1行ずつ入力してください"
        rows={10}
        cols={50}
      />
      
      <div>
        <button onClick={handleProcess} disabled={isValidating}>
          一括検証開始
        </button>
        
        {isValidating && (
          <button onClick={cancel}>キャンセル</button>
        )}
      </div>
      
      {isValidating && (
        <div className="progress">
          進行状況: {Math.round(progress * 100)}%
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {results.length > 0 && (
        <div className="results">
          <h4>検証結果</h4>
          <div>有効: {validCount}, 無効: {invalidCount}</div>
          
          <div className="result-list">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`result-item ${result.isValid ? 'valid' : 'invalid'}`}
              >
                <span className="status">
                  {result.isValid ? '✓' : '✗'}
                </span>
                <span className="url">
                  {result.normalizedUrl?.original || 'Invalid URL'}
                </span>
                {!result.isValid && (
                  <span className="error">
                    {result.error?.message}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 対応URL形式

以下のYouTube URL形式に対応しています：

1. **標準URL**: `https://www.youtube.com/watch?v=VIDEO_ID`
2. **追加パラメータ付き**: `https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST&index=1&t=30s`
3. **短縮URL**: `https://youtu.be/VIDEO_ID`
4. **埋め込みURL**: `https://www.youtube.com/embed/VIDEO_ID`
5. **モバイル版**: `https://m.youtube.com/watch?v=VIDEO_ID`
6. **プロトコルなし**: `youtube.com/watch?v=VIDEO_ID`
7. **直接ビデオID**: `VIDEO_ID`

## エラータイプ

```typescript
enum URLValidationErrorType {
  INVALID_FORMAT = 'INVALID_FORMAT',      // URL形式が無効
  NOT_YOUTUBE = 'NOT_YOUTUBE',            // YouTube以外のURL
  MISSING_VIDEO_ID = 'MISSING_VIDEO_ID',  // ビデオIDが見つからない
  PRIVATE_VIDEO = 'PRIVATE_VIDEO',        // 非公開動画
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',    // 動画が見つからない
  NETWORK_ERROR = 'NETWORK_ERROR',        // ネットワークエラー
  DUPLICATE_VIDEO = 'DUPLICATE_VIDEO'     // 重複動画
}
```

## パフォーマンス考慮事項

### デバウンス設定
- **推奨値**: 300ms
- **高速入力**: 150ms
- **低速環境**: 500ms

### バッチ処理設定
- **バッチサイズ**: 5-10個
- **遅延**: 100-200ms
- **大量処理**: バッチサイズを大きく、遅延を小さく

## トラブルシューティング

### よくある問題

1. **デバウンスが効かない**
   - タイマーのクリーンアップを確認
   - useEffectの依存配列を確認

2. **メモリリーク**
   - コンポーネントのアンマウント時にクリーンアップを実行
   - リスナーの適切な削除

3. **パフォーマンス問題**
   - デバウンス時間の調整
   - バッチサイズの最適化

### デバッグ方法

```typescript
// デバッグ用のログ出力
const validation = YouTubeURLNormalizer.validateQuick(url);
console.log('Validation result:', validation);

// 入力状態の確認
const state = YouTubeURLNormalizer.getInputState(url);
console.log('Input state:', state);

// ヒントの確認
const hint = YouTubeURLNormalizer.getURLHint(url);
console.log('Hint:', hint);
```

## 今後の拡張予定

- [ ] 他の動画プラットフォーム対応
- [ ] カスタムバリデーションルール
- [ ] オフライン対応
- [ ] キャッシュ機能
- [ ] 国際化対応