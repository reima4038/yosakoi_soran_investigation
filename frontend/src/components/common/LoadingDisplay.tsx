import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Skeleton,
} from '@mui/material';

interface LoadingDisplayProps {
  type?: 'circular' | 'linear' | 'skeleton';
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  skeletonLines?: number;
  className?: string;
}

const LoadingDisplay: React.FC<LoadingDisplayProps> = ({
  type = 'circular',
  message = '読み込み中...',
  size = 'medium',
  fullScreen = false,
  skeletonLines = 3,
  className,
}) => {
  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'large':
        return 60;
      default:
        return 40;
    }
  };

  const containerSx = fullScreen
    ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 9999,
      }
    : {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      };

  if (type === 'skeleton') {
    return (
      <Box className={className} sx={{ p: 2 }}>
        {Array.from({ length: skeletonLines }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            height={size === 'small' ? 20 : size === 'large' ? 40 : 30}
            sx={{ mb: 1 }}
          />
        ))}
      </Box>
    );
  }

  if (type === 'linear') {
    return (
      <Box className={className} sx={{ width: '100%', p: 2 }}>
        <LinearProgress />
        {message && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, textAlign: 'center' }}
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box className={className} sx={containerSx}>
      <CircularProgress size={getSizeValue()} />
      {message && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2, textAlign: 'center' }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingDisplay;