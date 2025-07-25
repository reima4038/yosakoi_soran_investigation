import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Fab,
  Snackbar,
  Alert,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import VideoList from './VideoList';
import VideoRegistrationForm from './VideoRegistrationForm';
import { Video } from '../../services/videoService';

const VideoManagement: React.FC = () => {
  const [registrationFormOpen, setRegistrationFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleRegistrationSuccess = () => {
    setSnackbar({
      open: true,
      message: '動画が正常に登録されました',
      severity: 'success',
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleVideoSelect = (video: Video) => {
    // 動画選択時の処理（後のタスクで実装）
    console.log('Selected video:', video);
  };

  const handleVideoEdit = (video: Video) => {
    // 動画編集時の処理（後のタスクで実装）
    console.log('Edit video:', video);
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth='xl'>
      <Box sx={{ py: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography variant='h4' component='h1'>
            動画管理
          </Typography>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => setRegistrationFormOpen(true)}
          >
            動画を登録
          </Button>
        </Box>

        <VideoList
          onVideoSelect={handleVideoSelect}
          onVideoEdit={handleVideoEdit}
          refreshTrigger={refreshTrigger}
        />

        {/* フローティングアクションボタン（モバイル用） */}
        <Fab
          color='primary'
          aria-label='add video'
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', sm: 'none' },
          }}
          onClick={() => setRegistrationFormOpen(true)}
        >
          <AddIcon />
        </Fab>

        <VideoRegistrationForm
          open={registrationFormOpen}
          onClose={() => setRegistrationFormOpen(false)}
          onSuccess={handleRegistrationSuccess}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default VideoManagement;
