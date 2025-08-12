import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  Typography,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { ErrorInfo } from '../../utils/errorHandler';

interface ErrorDisplayProps {
  error: ErrorInfo | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className,
}) => {
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  if (!error) return null;

  const handleToggleDetails = () => {
    setDetailsOpen(!detailsOpen);
  };

  return (
    <Alert
      severity={error.severity}
      className={className}
      onClose={onDismiss}
      action={
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {error.action && (
            <Button
              color="inherit"
              size="small"
              onClick={error.action.handler}
            >
              {error.action.label}
            </Button>
          )}
          {onRetry && (
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
            >
              再試行
            </Button>
          )}
          {error.details && showDetails && (
            <Button
              color="inherit"
              size="small"
              endIcon={detailsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={handleToggleDetails}
            >
              詳細
            </Button>
          )}
        </Box>
      }
    >
      <AlertTitle>{error.message}</AlertTitle>
      {error.details && showDetails && (
        <Collapse in={detailsOpen}>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {error.details}
          </Typography>
        </Collapse>
      )}
    </Alert>
  );
};

export default ErrorDisplay;