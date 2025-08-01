import React, { useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Backdrop,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../store';
import {
  selectSnackbar,
  selectGlobalLoading,
  selectGlobalError,
  hideSnackbar,
  clearError,
} from '../../store/slices/uiSlice';

const GlobalStateManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const snackbar = useAppSelector(selectSnackbar);
  const globalLoading = useAppSelector(selectGlobalLoading);
  const globalError = useAppSelector(selectGlobalError);

  // グローバルエラーの自動クリア（10秒後）
  useEffect(() => {
    if (globalError) {
      const timer = setTimeout(() => {
        dispatch(clearError('global'));
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [globalError, dispatch]);

  // スナックバーを閉じる
  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    dispatch(hideSnackbar());
  };

  return (
    <>
      {/* グローバルローディング */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: 'column',
          gap: 2,
        }}
        open={globalLoading}
      >
        <CircularProgress color="inherit" size={60} />
        <Typography variant="h6">読み込み中...</Typography>
      </Backdrop>

      {/* グローバルエラー表示 */}
      {globalError && (
        <Snackbar
          open={!!globalError}
          autoHideDuration={10000}
          onClose={() => dispatch(clearError('global'))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={() => dispatch(clearError('global'))}
            severity="error"
            variant="filled"
            sx={{ width: '100%' }}
          >
            {globalError}
          </Alert>
        </Snackbar>
      )}

      {/* 通常のスナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.autoHideDuration}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default GlobalStateManager;