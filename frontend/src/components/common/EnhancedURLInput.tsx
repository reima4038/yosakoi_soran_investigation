/**
 * 改善されたURL入力コンポーネント
 * リアルタイムバリデーション、フィードバック表示、修正提案機能を提供
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Typography,
  Alert,
  Chip,
  CircularProgress,
  Fade,
  Collapse,
  IconButton,
  Tooltip,
  InputAdornment,
  Link,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Clear as ClearIcon,
  ContentPaste as PasteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useURLInput } from '../../hooks/useURLValidation';
import { NormalizedURL, URLValidationError } from '../../utils/urlNormalizer';

export interface EnhancedURLInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidURL?: (normalizedUrl: NormalizedURL) => void;
  onInvalidURL?: (error: URLValidationError) => void;
  onValidationChange?: (isValid: boolean) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  debounceDelay?: number;
  showMetadata?: boolean;
  showSuggestions?: boolean;
  showExamples?: boolean;
  allowPaste?: boolean;
  allowClear?: boolean;
  validateOnMount?: boolean;
  sx?: any;
}

const EnhancedURLInput: React.FC<EnhancedURLInputProps> = ({
  value,
  onChange,
  onValidURL,
  onInvalidURL,
  onValidationChange,
  label = 'YouTube URL',
  placeholder = 'https://www.youtube.com/watch?v=...',
  helperText,
  error: externalError = false,
  disabled = false,
  required = false,
  fullWidth = true,
  size = 'medium',
  debounceDelay = 300,
  showMetadata = true,
  showSuggestions = true,
  showExamples = true,
  allowPaste = true,
  allowClear = true,
  validateOnMount = false,
  sx,
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [showDetails, setShowDetails] = useState(false);

  const {
    validationResult,
    isValidating,
    inputState,
    hint,
    inputProps,
    isFocused,
  } = useURLInput({
    debounceDelay,
    validateOnMount,
    initialUrl: value,
    onValidURL,
    onInvalidURL,
    onValidationChange: (result) => {
      if (onValidationChange) {
        onValidationChange(result?.isValid || false);
      }
    },
  });

  // 外部からの値の変更を内部状態に反映
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  // 内部値の変更を外部に通知
  const handleChange = useCallback((newValue: string) => {
    setInternalValue(newValue);
    onChange(newValue);
    inputProps.onChange(newValue);
  }, [onChange, inputProps.onChange]);

  // クリップボードから貼り付け
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleChange(text);
    } catch (error) {
      console.warn('クリップボードからの読み取りに失敗しました:', error);
    }
  }, [handleChange]);

  // 入力をクリア
  const handleClear = useCallback(() => {
    handleChange('');
  }, [handleChange]);

  // 再検証
  const handleRefresh = useCallback(() => {
    inputProps.onChange(internalValue);
  }, [inputProps.onChange, internalValue]);

  // 入力状態に基づくスタイリング
  const getInputColor = () => {
    if (externalError) return 'error';
    if (inputState === 'valid') return 'success';
    if (inputState === 'invalid') return 'error';
    if (inputState === 'typing') return 'warning';
    return 'primary';
  };

  // ステータスアイコンの取得
  const getStatusIcon = () => {
    if (isValidating) {
      return <CircularProgress size={20} />;
    }
    
    switch (inputState) {
      case 'valid':
        return <CheckCircleIcon color="success" />;
      case 'invalid':
        return <ErrorIcon color="error" />;
      case 'typing':
        return <WarningIcon color="warning" />;
      default:
        return null;
    }
  };

  // エラーメッセージの取得
  const getErrorMessage = () => {
    if (validationResult && !validationResult.isValid && validationResult.error) {
      return validationResult.error.message;
    }
    return null;
  };

  // 修正提案の取得
  const getSuggestion = () => {
    if (validationResult && !validationResult.isValid && validationResult.error) {
      return validationResult.error.suggestion;
    }
    return hint;
  };

  // サンプルURLの取得
  const getExampleURL = () => {
    if (validationResult && !validationResult.isValid && validationResult.error) {
      return validationResult.error.example;
    }
    return 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  };

  // メタデータの表示
  const renderMetadata = () => {
    if (!showMetadata || !validationResult?.isValid || !validationResult.normalizedUrl?.metadata) {
      return null;
    }

    const metadata = validationResult.normalizedUrl.metadata;
    const chips = [];

    if (metadata.timestamp) {
      const minutes = Math.floor(metadata.timestamp / 60);
      const seconds = metadata.timestamp % 60;
      chips.push(
        <Chip
          key="timestamp"
          label={`${minutes}:${seconds.toString().padStart(2, '0')}`}
          size="small"
          color="info"
          icon={<InfoIcon />}
        />
      );
    }

    if (metadata.playlist) {
      chips.push(
        <Chip
          key="playlist"
          label={`プレイリスト${metadata.index ? ` (${metadata.index})` : ''}`}
          size="small"
          color="secondary"
        />
      );
    }

    return chips.length > 0 ? (
      <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {chips}
      </Box>
    ) : null;
  };

  // 入力補助ボタンの作成
  const getInputAdornments = () => {
    const endAdornments = [];

    // ステータスアイコン
    const statusIcon = getStatusIcon();
    if (statusIcon) {
      endAdornments.push(
        <Box key="status" sx={{ mr: 1 }}>
          {statusIcon}
        </Box>
      );
    }

    // クリアボタン
    if (allowClear && internalValue && !disabled) {
      endAdornments.push(
        <Tooltip key="clear" title="クリア">
          <IconButton size="small" onClick={handleClear}>
            <ClearIcon />
          </IconButton>
        </Tooltip>
      );
    }

    // 貼り付けボタン
    if (allowPaste && !disabled && navigator.clipboard) {
      endAdornments.push(
        <Tooltip key="paste" title="貼り付け">
          <IconButton size="small" onClick={handlePaste}>
            <PasteIcon />
          </IconButton>
        </Tooltip>
      );
    }

    // 再検証ボタン
    if (internalValue && !isValidating && !disabled) {
      endAdornments.push(
        <Tooltip key="refresh" title="再検証">
          <IconButton size="small" onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      );
    }

    return endAdornments.length > 0 ? (
      <InputAdornment position="end">
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {endAdornments}
        </Box>
      </InputAdornment>
    ) : undefined;
  };

  return (
    <Box sx={sx}>
      <TextField
        fullWidth={fullWidth}
        size={size}
        label={label}
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={inputProps.onFocus}
        onBlur={inputProps.onBlur}
        error={externalError || (inputState === 'invalid')}
        disabled={disabled}
        required={required}
        color={getInputColor() as any}
        helperText={helperText || getErrorMessage()}
        InputProps={{
          endAdornment: getInputAdornments(),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: inputState === 'valid' ? 'success.main' : 
                           inputState === 'invalid' ? 'error.main' :
                           inputState === 'typing' ? 'warning.main' : 'primary.main',
              },
            },
          },
        }}
      />

      {/* 成功メッセージ */}
      <Fade in={inputState === 'valid'}>
        <Box>
          {inputState === 'valid' && (
            <Alert 
              severity="success" 
              sx={{ mt: 1 }}
              action={
                showMetadata && validationResult?.normalizedUrl?.metadata && (
                  <IconButton
                    size="small"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    <InfoIcon />
                  </IconButton>
                )
              }
            >
              <Typography variant="body2">
                ✓ 有効なYouTube URL
                {validationResult?.normalizedUrl && (
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    動画ID: {validationResult.normalizedUrl.videoId}
                  </Typography>
                )}
              </Typography>
            </Alert>
          )}
        </Box>
      </Fade>

      {/* メタデータ表示 */}
      <Collapse in={showDetails && inputState === 'valid'}>
        <Box sx={{ mt: 1 }}>
          {validationResult?.normalizedUrl && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                正規化されたURL:
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', mb: 1 }}>
                {validationResult.normalizedUrl.canonical}
              </Typography>
              {renderMetadata()}
            </Box>
          )}
        </Box>
      </Collapse>

      {/* ヒントと修正提案 */}
      <Fade in={!!hint || (!!validationResult && !validationResult.isValid)}>
        <Box>
          {(hint || (validationResult && !validationResult.isValid)) && (
            <Box sx={{ mt: 1 }}>
              {showSuggestions && getSuggestion() && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    💡 {getSuggestion()}
                  </Typography>
                </Alert>
              )}

              {showExamples && inputState === 'invalid' && (
                <Alert severity="info">
                  <Typography variant="body2" gutterBottom>
                    📝 正しいURL例:
                  </Typography>
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleChange(getExampleURL());
                    }}
                    sx={{ wordBreak: 'break-all' }}
                  >
                    {getExampleURL()}
                  </Link>
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </Fade>

      {/* 入力状態インジケーター */}
      {isFocused && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            状態:
          </Typography>
          <Chip
            size="small"
            label={
              inputState === 'empty' ? '未入力' :
              inputState === 'typing' ? '入力中' :
              inputState === 'valid' ? '有効' :
              inputState === 'invalid' ? '無効' : '不明'
            }
            color={
              inputState === 'valid' ? 'success' :
              inputState === 'invalid' ? 'error' :
              inputState === 'typing' ? 'warning' : 'default'
            }
            variant="outlined"
          />
          {isValidating && (
            <Typography variant="caption" color="text.secondary">
              検証中...
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default EnhancedURLInput;