import React from 'react';
import {
  Alert,
  Button,
  Snackbar,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

export interface OperationFeedbackProps {
  isLoading?: boolean;
  error?: string | null;
  success?: string | null;
  onRetry?: () => void;
  onClearMessages?: () => void;
  loadingMessage?: string;
  showAsSnackbar?: boolean;
  retryLabel?: string;
}

const OperationFeedback: React.FC<OperationFeedbackProps> = ({
  isLoading = false,
  error = null,
  success = null,
  onRetry,
  onClearMessages,
  loadingMessage = '処理中...',
  showAsSnackbar = false,
  retryLabel = '再試行',
}) => {
  if (showAsSnackbar) {
    return (
      <>
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={onClearMessages}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            severity="error" 
            onClose={onClearMessages}
            action={
              onRetry && (
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={onRetry}
                  startIcon={<RefreshIcon />}
                >
                  {retryLabel}
                </Button>
              )
            }
          >
            {error}
          </Alert>
        </Snackbar>
        
        <Snackbar
          open={!!success}
          autoHideDuration={4000}
          onClose={onClearMessages}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={onClearMessages}>
            {success}
          </Alert>
        </Snackbar>
      </>
    );
  }

  return (
    <>
      {isLoading && (
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            mb: 2,
          }}
        >
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {loadingMessage}
          </Typography>
        </Box>
      )}
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <>
              {onRetry && (
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={onRetry}
                  startIcon={<RefreshIcon />}
                >
                  {retryLabel}
                </Button>
              )}
              {onClearMessages && (
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={onClearMessages}
                >
                  閉じる
                </Button>
              )}
            </>
          }
        >
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          onClose={onClearMessages}
        >
          {success}
        </Alert>
      )}
    </>
  );
};

export default OperationFeedback;