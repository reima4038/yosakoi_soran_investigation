import React from 'react';
import {
  Box,
  Alert,
  AlertTitle,
  Button,
  Typography,
  Card,
  CardContent,
  CardActions,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
  Login as LoginIcon,
  List as ListIcon,
} from '@mui/icons-material';

export interface ErrorAction {
  label: string;
  onClick: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  icon?: React.ReactNode;
  primary?: boolean;
}

export interface ErrorDisplayProps {
  title: string;
  message: string;
  severity?: 'error' | 'warning' | 'info';
  actions?: ErrorAction[];
  canRetry?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
  isRetrying?: boolean;
  errorDetails?: {
    timestamp?: Date;
    retryCount?: number;
    errorCode?: string;
    requestId?: string;
  };
  showDetails?: boolean;
  maxWidth?: number;
  fullScreen?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title,
  message,
  severity = 'error',
  actions = [],
  canRetry = true,
  onRetry,
  retryLabel = '再試行',
  isRetrying = false,
  errorDetails,
  showDetails = false,
  maxWidth = 600,
  fullScreen = false,
}) => {
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);

  const getDefaultActions = (): ErrorAction[] => {
    const defaultActions: ErrorAction[] = [];

    if (canRetry && onRetry) {
      defaultActions.push({
        label: isRetrying ? '再試行中...' : retryLabel,
        onClick: onRetry,
        variant: 'contained',
        color: 'primary',
        icon: <RefreshIcon />,
        primary: true,
      });
    }

    // 共通のナビゲーションアクション
    defaultActions.push(
      {
        label: 'ダッシュボード',
        onClick: () => (window.location.href = '/dashboard'),
        variant: 'outlined',
        icon: <HomeIcon />,
      },
      {
        label: 'セッション一覧',
        onClick: () => (window.location.href = '/sessions'),
        variant: 'outlined',
        icon: <ListIcon />,
      }
    );

    return defaultActions;
  };

  const allActions = actions.length > 0 ? actions : getDefaultActions();
  const primaryAction = allActions.find(action => action.primary);
  const secondaryActions = allActions.filter(action => !action.primary);

  const renderContent = () => (
    <Box>
      <Alert
        severity={severity as 'error' | 'warning' | 'info' | 'success'}
        sx={{ mb: 2 }}
        action={
          primaryAction && (
            <Button
              color='inherit'
              size='small'
              onClick={primaryAction.onClick}
              disabled={isRetrying}
              startIcon={primaryAction.icon}
            >
              {primaryAction.label}
            </Button>
          )
        }
      >
        <AlertTitle>{title}</AlertTitle>
        <Typography variant='body2' sx={{ mb: 1 }}>
          {message}
        </Typography>

        {errorDetails && (
          <Box sx={{ mt: 1 }}>
            {errorDetails.timestamp && (
              <Chip
                label={`発生時刻: ${errorDetails.timestamp.toLocaleString()}`}
                size='small'
                variant='outlined'
                sx={{ mr: 1, mb: 1 }}
              />
            )}
            {errorDetails.retryCount !== undefined &&
              errorDetails.retryCount > 0 && (
                <Chip
                  label={`再試行回数: ${errorDetails.retryCount}回`}
                  size='small'
                  variant='outlined'
                  sx={{ mr: 1, mb: 1 }}
                />
              )}
            {errorDetails.errorCode && (
              <Chip
                label={`エラーコード: ${errorDetails.errorCode}`}
                size='small'
                variant='outlined'
                sx={{ mr: 1, mb: 1 }}
              />
            )}
          </Box>
        )}
      </Alert>

      {/* 詳細情報の展開 */}
      {(showDetails || errorDetails?.requestId) && (
        <Box sx={{ mb: 2 }}>
          <Button
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            startIcon={
              detailsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />
            }
            size='small'
            color='inherit'
          >
            詳細情報
          </Button>
          <Collapse in={detailsExpanded}>
            <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant='caption' component='div' sx={{ mb: 1 }}>
                <strong>診断情報:</strong>
              </Typography>
              {errorDetails?.requestId && (
                <Typography variant='caption' component='div'>
                  リクエストID: {errorDetails.requestId}
                </Typography>
              )}
              <Typography variant='caption' component='div'>
                ユーザーエージェント: {navigator.userAgent}
              </Typography>
              <Typography variant='caption' component='div'>
                URL: {window.location.href}
              </Typography>
              <Typography variant='caption' component='div'>
                タイムスタンプ: {new Date().toISOString()}
              </Typography>
            </Box>
          </Collapse>
        </Box>
      )}

      {/* アクションボタン */}
      {secondaryActions.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {secondaryActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outlined'}
              color={action.color || 'primary'}
              onClick={action.onClick}
              startIcon={action.icon}
              disabled={isRetrying}
            >
              {action.label}
            </Button>
          ))}
        </Box>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          zIndex: 9999,
          p: 2,
        }}
      >
        <Card sx={{ maxWidth, width: '100%' }}>
          <CardContent>{renderContent()}</CardContent>
        </Card>
      </Box>
    );
  }

  return <Box sx={{ p: 3, maxWidth, mx: 'auto' }}>{renderContent()}</Box>;
};

export default ErrorDisplay;
