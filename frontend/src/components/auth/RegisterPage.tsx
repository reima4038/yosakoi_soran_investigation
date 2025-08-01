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
import { PersonAdd as RegisterIcon } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });

  const [validationError, setValidationError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) clearError();
    if (validationError) setValidationError('');
  };

  const validateForm = (): boolean => {
    if (formData.password !== formData.confirmPassword) {
      setValidationError('パスワードが一致しません');
      return false;
    }
    if (formData.password.length < 6) {
      setValidationError('パスワードは6文字以上で入力してください');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName || undefined,
      });
      navigate('/dashboard');
    } catch (err) {
      // エラーは useAuth フックで処理される
    }
  };

  const displayError = validationError || error;

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
                <RegisterIcon
                  sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
                />
                <Typography variant='h4' gutterBottom>
                  ユーザー登録
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  新しいアカウントを作成してください
                </Typography>
              </Box>

              {displayError && (
                <Alert severity='error' sx={{ mb: 2 }}>
                  {displayError}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label='ユーザー名'
                  name='username'
                  value={formData.username}
                  onChange={handleChange}
                  required
                  margin='normal'
                  autoComplete='username'
                  autoFocus
                />

                <TextField
                  fullWidth
                  label='表示名（任意）'
                  name='displayName'
                  value={formData.displayName}
                  onChange={handleChange}
                  margin='normal'
                  autoComplete='name'
                />

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
                  autoComplete='new-password'
                />

                <TextField
                  fullWidth
                  label='パスワード確認'
                  name='confirmPassword'
                  type='password'
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  margin='normal'
                  autoComplete='new-password'
                />

                <Button
                  type='submit'
                  fullWidth
                  variant='contained'
                  disabled={isLoading}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {isLoading ? '登録中...' : 'アカウント作成'}
                </Button>
              </form>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant='body2'>
                  すでにアカウントをお持ちの方は{' '}
                  <Link component={RouterLink} to='/login'>
                    こちらからログイン
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

export default RegisterPage;
