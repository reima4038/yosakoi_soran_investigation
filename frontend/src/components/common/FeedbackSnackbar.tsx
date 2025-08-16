import React from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { ErrorInfo } from '../../utils/errorHandler';

interface FeedbackSnackbarProps {
  open: boolean;
  message: ErrorInfo | null;
  onClose: () => void;
  autoHideDuration?: number;
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

const FeedbackSnackbar: React.FC<FeedbackSnackbarProps> = ({
  open,
  message,
  onClose,
  autoHideDuration = 6000,
  anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
}) => {
  if (!message) return null;

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
    >
      <Alert
        severity={message.severity}
        onClose={onClose}
        action={
          message.action ? (
            <IconButton
              size="small"
              color="inherit"
              onClick={() => {
                message.action?.handler();
                onClose();
              }}
            >
              {message.action.label}
            </IconButton>
          ) : (
            <IconButton
              size="small"
              color="inherit"
              onClick={onClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )
        }
      >
        <AlertTitle>{message.message}</AlertTitle>
        {message.details && (
          typeof message.details === 'string' 
            ? message.details 
            : JSON.stringify(message.details)
        )}
      </Alert>
    </Snackbar>
  );
};

export default FeedbackSnackbar;