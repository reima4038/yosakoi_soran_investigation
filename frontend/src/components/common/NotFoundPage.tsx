import React from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  useTheme,
} from '@mui/material';
import {
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { isAuthenticated } = useAuth();

  const handleGoHome = () => {
    navigate(isAuthenticated ? '/dashboard' : '/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 3,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            textAlign: 'center',
            width: '100%',
            maxWidth: 500,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
          }}
        >
          {/* 404 イラスト */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '4rem', sm: '6rem' },
                fontWeight: 'bold',
                color: theme.palette.primary.main,
                textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                mb: 2,
              }}
            >
              404
            </Typography>
            <SearchIcon
              sx={{
                fontSize: { xs: 60, sm: 80 },
                color: theme.palette.text.secondary,
                opacity: 0.5,
              }}
            />
          </Box>

          {/* エラーメッセージ */}
          <Typography variant="h4" gutterBottom sx={{ mb: 2 }}>
            ページが見つかりません
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            お探しのページは存在しないか、移動または削除された可能性があります。
            URLを確認するか、以下のボタンから他のページに移動してください。
          </Typography>

          {/* アクションボタン */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
              size="large"
            >
              {isAuthenticated ? 'ダッシュボードへ' : 'ホームへ'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleGoBack}
              size="large"
            >
              前のページに戻る
            </Button>
          </Box>

          {/* 追加情報 */}
          <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="body2" color="text.secondary">
              問題が続く場合は、システム管理者にお問い合わせください。
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFoundPage;