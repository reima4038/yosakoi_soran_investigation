import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  Container,
  Paper,
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
      navigate(from, { replace: true });
    } catch (err) {
      // エラーは useAuth フックで処理される
    }
  };

  return (
    <Container maxWidth='sm'>
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
                <LoginIcon
                  sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
                />
                <Typography variant='h4' gutterBottom>
                  ログイン
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  よさこい演舞評価システムにログインしてください
                </Typography>
              </Box>

              {error && (
                <Alert severity='error' sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label='メールアドレス'
                  name='email'
                  type='email'
                  value={formData.email}
                  onChange={handleChange}
                  required
                  margin='normal'
                  autoComplete='email'
                  autoFocus
                />

                <TextField
                  fullWidth
                  label='パスワード'
                  name='password'
                  type='password'
                  value={formData.password}
                  onChange={handleChange}
                  required
                  margin='normal'
                  autoComplete='current-password'
                />

                <Button
                  type='submit'
                  fullWidth
                  variant='contained'
                  disabled={isLoading}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {isLoading ? 'ログイン中...' : 'ログイン'}
                </Button>
              </form>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant='body2' sx={{ mb: 1 }}>
                  <Link component={RouterLink} to='/password-reset'>
                    パスワードを忘れた方はこちら
                  </Link>
                </Typography>
                <Typography variant='body2'>
                  アカウントをお持ちでない方は{' '}
                  <Link component={RouterLink} to='/register'>
                    こちらから登録
                  </Link>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
