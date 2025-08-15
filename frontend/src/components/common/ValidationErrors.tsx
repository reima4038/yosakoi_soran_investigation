import React from 'react';
import {
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

export interface ValidationError {
  field?: string;
  message: string;
}

export interface ValidationErrorsProps {
  errors: ValidationError[] | string[];
  title?: string;
  severity?: 'error' | 'warning';
}

const ValidationErrors: React.FC<ValidationErrorsProps> = ({
  errors,
  title = 'バリデーションエラー',
  severity = 'error',
}) => {
  if (!errors || errors.length === 0) {
    return null;
  }

  const normalizedErrors: ValidationError[] = errors.map(error => 
    typeof error === 'string' 
      ? { message: error }
      : error
  );

  return (
    <Alert severity={severity} sx={{ mb: 2 }}>
      <AlertTitle>{title}</AlertTitle>
      {normalizedErrors.length === 1 ? (
        <Box>{normalizedErrors[0].message}</Box>
      ) : (
        <List dense sx={{ mt: 1 }}>
          {normalizedErrors.map((error, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <ErrorIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary={error.message}
                secondary={error.field ? `フィールド: ${error.field}` : undefined}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Alert>
  );
};

export default ValidationErrors;