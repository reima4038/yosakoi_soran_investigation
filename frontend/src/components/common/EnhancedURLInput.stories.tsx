/**
 * EnhancedURLInput Storybook Stories
 * 様々な使用例とプロパティの組み合わせを示す
 */

import React, { useState } from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { Box, Typography, Paper } from '@mui/material';
import EnhancedURLInput from './EnhancedURLInput';
import { NormalizedURL, URLValidationError } from '../../utils/urlNormalizer';

const meta: Meta<typeof EnhancedURLInput> = {
  title: 'Components/EnhancedURLInput',
  component: EnhancedURLInput,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
改善されたURL入力コンポーネント。リアルタイムバリデーション、フィードバック表示、修正提案機能を提供します。

## 主な機能
- リアルタイムURL検証
- 入力状態の自動判定
- エラーメッセージと修正提案
- メタデータ表示（タイムスタンプ、プレイリスト情報）
- 貼り付け・クリア機能
- デバウンス機能
        `,
      },
    },
  },
  argTypes: {
    value: {
      control: 'text',
      description: '入力値',
    },
    onChange: {
      action: 'onChange',
      description: '値変更時のコールバック',
    },
    onValidURL: {
      action: 'onValidURL',
      description: '有効なURL検出時のコールバック',
    },
    onInvalidURL: {
      action: 'onInvalidURL',
      description: '無効なURL検出時のコールバック',
    },
    onValidationChange: {
      action: 'onValidationChange',
      description: '検証状態変更時のコールバック',
    },
    label: {
      control: 'text',
      description: 'ラベルテキスト',
    },
    placeholder: {
      control: 'text',
      description: 'プレースホルダーテキスト',
    },
    debounceDelay: {
      control: { type: 'number', min: 0, max: 1000, step: 50 },
      description: 'デバウンス遅延時間（ミリ秒）',
    },
    showMetadata: {
      control: 'boolean',
      description: 'メタデータ表示の有効/無効',
    },
    showSuggestions: {
      control: 'boolean',
      description: '修正提案表示の有効/無効',
    },
    showExamples: {
      control: 'boolean',
      description: 'サンプルURL表示の有効/無効',
    },
    allowPaste: {
      control: 'boolean',
      description: '貼り付けボタンの有効/無効',
    },
    allowClear: {
      control: 'boolean',
      description: 'クリアボタンの有効/無効',
    },
    disabled: {
      control: 'boolean',
      description: '無効状態',
    },
    required: {
      control: 'boolean',
      description: '必須フィールド',
    },
    error: {
      control: 'boolean',
      description: '外部エラー状態',
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium'],
      description: 'サイズ',
    },
  },
};

export default meta;
type Story = StoryObj<typeof EnhancedURLInput>;

// 基本的な使用例
export const Default: Story = {
  args: {
    value: '',
    label: 'YouTube URL',
    placeholder: 'https://www.youtube.com/watch?v=...',
    showMetadata: true,
    showSuggestions: true,
    showExamples: true,
    allowPaste: true,
    allowClear: true,
    debounceDelay: 300,
  },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
        <EnhancedURLInput
          {...args}
          value={value}
          onChange={setValue}
        />
      </Box>
    );
  },
};

// 有効なURLの例
export const WithValidURL: Story = {
  args: {
    ...Default.args,
    value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
  render: Default.render,
};

// タイムスタンプ付きURLの例
export const WithTimestamp: Story = {
  args: {
    ...Default.args,
    value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s',
  },
  render: Default.render,
};

// プレイリスト付きURLの例
export const WithPlaylist: Story = {
  args: {
    ...Default.args,
    value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmRdnEQy8VJqQzNlkVjYoungUdmzP&index=5',
  },
  render: Default.render,
};

// 短縮URLの例
export const WithShortenedURL: Story = {
  args: {
    ...Default.args,
    value: 'https://youtu.be/dQw4w9WgXcQ',
  },
  render: Default.render,
};

// エラー状態の例
export const WithError: Story = {
  args: {
    ...Default.args,
    value: 'https://vimeo.com/123456',
  },
  render: Default.render,
};

// 無効状態の例
export const Disabled: Story = {
  args: {
    ...Default.args,
    value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    disabled: true,
  },
  render: Default.render,
};

// 必須フィールドの例
export const Required: Story = {
  args: {
    ...Default.args,
    required: true,
  },
  render: Default.render,
};

// 小さいサイズの例
export const SmallSize: Story = {
  args: {
    ...Default.args,
    size: 'small',
  },
  render: Default.render,
};

// カスタムラベルとプレースホルダー
export const CustomLabels: Story = {
  args: {
    ...Default.args,
    label: 'カスタムラベル',
    placeholder: 'カスタムプレースホルダーテキスト',
  },
  render: Default.render,
};

// 機能を無効にした例
export const MinimalFeatures: Story = {
  args: {
    ...Default.args,
    showMetadata: false,
    showSuggestions: false,
    showExamples: false,
    allowPaste: false,
    allowClear: false,
  },
  render: Default.render,
};

// 高速デバウンスの例
export const FastDebounce: Story = {
  args: {
    ...Default.args,
    debounceDelay: 100,
  },
  render: Default.render,
};

// コールバック付きの例
export const WithCallbacks: Story = {
  args: {
    ...Default.args,
  },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    const [validUrl, setValidUrl] = useState<NormalizedURL | null>(null);
    const [error, setError] = useState<URLValidationError | null>(null);
    const [isValid, setIsValid] = useState(false);
    
    const handleValidURL = (normalizedUrl: NormalizedURL) => {
      setValidUrl(normalizedUrl);
      setError(null);
    };
    
    const handleInvalidURL = (validationError: URLValidationError) => {
      setError(validationError);
      setValidUrl(null);
    };
    
    const handleValidationChange = (valid: boolean) => {
      setIsValid(valid);
    };
    
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
        <EnhancedURLInput
          {...args}
          value={value}
          onChange={setValue}
          onValidURL={handleValidURL}
          onInvalidURL={handleInvalidURL}
          onValidationChange={handleValidationChange}
        />
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            コールバック情報
          </Typography>
          
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2" gutterBottom>
              <strong>検証状態:</strong> {isValid ? '有効' : '無効'}
            </Typography>
            
            {validUrl && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>正規化されたURL:</strong>
                </Typography>
                <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                  {validUrl.canonical}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>ビデオID:</strong> {validUrl.videoId}
                </Typography>
                {validUrl.metadata && (
                  <Typography variant="body2">
                    <strong>メタデータ:</strong> {JSON.stringify(validUrl.metadata)}
                  </Typography>
                )}
              </Box>
            )}
            
            {error && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="error" gutterBottom>
                  <strong>エラー:</strong> {error.message}
                </Typography>
                {error.suggestion && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>提案:</strong> {error.suggestion}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    );
  },
};

// 複数の入力フィールドの例
export const MultipleInputs: Story = {
  render: () => {
    const [values, setValues] = useState(['', '', '']);
    
    const handleChange = (index: number) => (value: string) => {
      const newValues = [...values];
      newValues[index] = value;
      setValues(newValues);
    };
    
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 2, space: 2 }}>
        <Typography variant="h6" gutterBottom>
          複数のURL入力
        </Typography>
        
        {values.map((value, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <EnhancedURLInput
              value={value}
              onChange={handleChange(index)}
              label={`YouTube URL ${index + 1}`}
              showMetadata={true}
              showSuggestions={true}
              showExamples={true}
              allowPaste={true}
              allowClear={true}
              debounceDelay={300}
            />
          </Box>
        ))}
      </Box>
    );
  },
};