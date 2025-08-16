import React from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  CircularProgress,
  Skeleton,
  Card,
  CardContent,
} from '@mui/material';

export interface LoadingIndicatorProps {
  variant?: 'linear' | 'circular' | 'skeleton';
  message?: string;
  submessage?: string;
  progress?: number;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  variant = 'linear',
  message = '読み込み中...',
  submessage,
  progress,
  size = 'medium',
  fullScreen = false,
}) => {
  const getSizeProps = () => {
    switch (size) {
      case 'small':
        return { circularSize: 24, spacing: 1, fontSize: 'body2' as const };
      case 'large':
        return { circularSize: 48, spacing: 3, fontSize: 'h6' as const };
      default:
        return { circularSize: 32, spacing: 2, fontSize: 'body1' as const };
    }
  };

  const { circularSize, spacing, fontSize } = getSizeProps();

  const renderContent = () => {
    switch (variant) {
      case 'circular':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing }}>
            <CircularProgress size={circularSize} />
            <Typography variant={fontSize} textAlign="center">
              {message}
            </Typography>
            {submessage && (
              <Typography variant="caption" color="text.secondary" textAlign="center">
                {submessage}
              </Typography>
            )}
          </Box>
        );

      case 'skeleton':
        return (
          <Box sx={{ width: '100%' }}>
            <Skeleton variant="text" height={40} />
            <Skeleton variant="rectangular" height={200} sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Skeleton variant="rectangular" width="30%" height={100} />
              <Skeleton variant="rectangular" width="70%" height={100} />
            </Box>
          </Box>
        );

      default: // linear
        return (
          <Box sx={{ width: '100%' }}>
            <LinearProgress 
              variant={progress !== undefined ? 'determinate' : 'indeterminate'}
              value={progress}
              sx={{ mb: spacing }}
            />
            <Typography variant={fontSize} textAlign="center" gutterBottom>
              {message}
            </Typography>
            {submessage && (
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                {submessage}
              </Typography>
            )}
            {progress !== undefined && (
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                {Math.round(progress)}% 完了
              </Typography>
            )}
          </Box>
        );
    }
  };

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
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 9999,
        }}
      >
        <Card sx={{ minWidth: 300, maxWidth: 500 }}>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: spacing * 2 }}>
      {renderContent()}
    </Box>
  );
};

export default LoadingIndicator;