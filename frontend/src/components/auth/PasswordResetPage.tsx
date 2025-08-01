import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  Link,
} from '@mui/material';
import {
  Lock as LockIcon,
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../utils/api';

const PasswordResetPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState<'request' | 'reset'>(token ? 'reset' : 'request');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [requestData, setRequestData] = useState({
    email: '',
  });

  const [resetData, setResetData] = useState({
    password: '',
    confirmPassword: '',
  });

  const handleRequestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRequestData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleResetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setResetData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await apiClient.post('/api/auth/password-reset-request', {
        email: requestData.email,
      });
      setSuccess(true);
    } catch (error: any) {
      setError(
        error.response?.data?.message || 
        'パスワードリセットリクエストの送信に失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resetData.password !== resetData.confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (resetData.password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await apiClient.post('/api/auth/password-reset', {
        token,
        password: resetData.password,
      });
      setSuccess(true);
    } catch (error: any) {
      setError(
        error.response?.data?.message || 
        'パスワードのリセットに失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 3,
          }}
        >
          <Paper elevation={3} sx={{ width: '100%', maxWidth: 400 }}>
            <Card>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <LockIcon
                  sx={{ fontSize: 48, color: 'success.main', mb: 2 }}
                />
                <Typography variant="h5" gutterBottom>
                  {step === 'request' ? '送信完了' : 'リセット完了'}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {step === 'request' 
                    ? 'パスワードリセット用のリンクをメールで送信しました。メールをご確認ください。'
                    : 'パスワードが正常にリセットされました。新しいパスワードでログインしてください。'
                  }
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate('/login')}
                  fullWidth
                >
                  ログインページへ
                </Button>
              </CardContent>
            </Card>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 3,
        }}
      >
        <Paper elevation={3} sx={{ width: '100%', maxWidth: 400 }}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                {step === 'request' ? (
                  <EmailIcon
                    sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
                  />
                ) : (
                  <LockIcon
                    sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
                  />
                )}
                <Typography variant="h4" gutterBottom>
                  {step === 'request' ? 'パスワードリセット' : '新しいパスワード'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step === 'request' 
                    ? 'メールアドレスを入力してください。パスワードリセット用のリンクを送信します。'
                    : '新しいパスワードを入力してください。'
                  }
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {step === 'request' ? (
                <form onSubmit={handleRequestSubmit}>
                  <TextField
                    fullWidth
                    label="メールアドレス"
                    name="email"
                    type="email"
                    value={requestData.email}
                    onChange={handleRequestChange}
                    required
                    margin="normal"
                    autoComplete="email"
                    autoFocus
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isLoading}
                    sx={{ mt: 3, mb: 2 }}
                  >
                    {isLoading ? '送信中...' : 'リセットリンクを送信'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit}>
                  <TextField
                    fullWidth
                    label="新しいパスワード"
                    name="password"
                    type="password"
                    value={resetData.password}
                    onChange={handleResetChange}
                    required
                    margin="normal"
                    autoComplete="new-password"
                    autoFocus
                  />

                  <TextField
                    fullWidth
                    label="パスワード確認"
                    name="confirmPassword"
                    type="password"
                    value={resetData.confirmPassword}
                    onChange={handleResetChange}
                    required
                    margin="normal"
                    autoComplete="new-password"
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isLoading}
                    sx={{ mt: 3, mb: 2 }}
                  >
                    {isLoading ? 'リセット中...' : 'パスワードをリセット'}
                  </Button>
                </form>
              )}

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button
                  startIcon={<ArrowBackIcon />}
                  component={RouterLink}
                  to="/login"
                  variant="text"
                >
                  ログインページに戻る
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Paper>
      </Box>
    </Container>
  );
};

export default PasswordResetPage;