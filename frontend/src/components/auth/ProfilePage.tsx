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
  Avatar,
  Grid,
  Divider,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  AccountCircle,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth, UserRole } from '../../contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const [formData, setFormData] = useState({
    displayName: user?.profile?.displayName || '',
    bio: user?.profile?.bio || '',
    expertise: user?.profile?.expertise?.join(', ') || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordError, setPasswordError] = useState('');

  // ロール表示用のラベル
  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case UserRole.ADMIN:
        return '管理者';
      case UserRole.EVALUATOR:
        return '評価者';
      case UserRole.USER:
        return 'ユーザー';
      default:
        return '';
    }
  };

  // ロール表示用の色
  const getRoleColor = (
    role: UserRole
  ): 'primary' | 'secondary' | 'default' => {
    switch (role) {
      case UserRole.ADMIN:
        return 'primary';
      case UserRole.EVALUATOR:
        return 'secondary';
      default:
        return 'default';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (updateError) setUpdateError('');
    if (updateSuccess) setUpdateSuccess(false);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (passwordError) setPasswordError('');
  };

  const handleEdit = () => {
    setIsEditing(true);
    setUpdateSuccess(false);
    setUpdateError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      displayName: user?.profile?.displayName || '',
      bio: user?.profile?.bio || '',
      expertise: user?.profile?.expertise?.join(', ') || '',
    });
    setUpdateError('');
    setUpdateSuccess(false);
  };

  const handleSave = async () => {
    try {
      // TODO: API呼び出しでプロフィール更新
      // const response = await apiClient.put('/api/users/me', {
      //   profile: {
      //     displayName: formData.displayName,
      //     bio: formData.bio,
      //     expertise: formData.expertise.split(',').map(s => s.trim()).filter(s => s),
      //   }
      // });
      
      setIsEditing(false);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error: any) {
      setUpdateError(error.response?.data?.message || 'プロフィールの更新に失敗しました');
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('新しいパスワードが一致しません');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('パスワードは6文字以上で入力してください');
      return;
    }

    try {
      // TODO: API呼び出しでパスワード更新
      // await apiClient.put('/api/users/me/password', {
      //   currentPassword: passwordData.currentPassword,
      //   newPassword: passwordData.newPassword,
      // });

      setIsPasswordDialogOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || 'パスワードの更新に失敗しました');
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: アバター画像のアップロード処理
      console.log('Avatar upload:', file);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md">
        <Typography variant="h4">ユーザー情報が見つかりません</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          プロフィール管理
        </Typography>

        {updateSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            プロフィールが正常に更新されました
          </Alert>
        )}

        {updateError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {updateError}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* プロフィール情報カード */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">基本情報</Typography>
                  {!isEditing ? (
                    <Button
                      startIcon={<EditIcon />}
                      onClick={handleEdit}
                      variant="outlined"
                    >
                      編集
                    </Button>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        variant="contained"
                        disabled={isLoading}
                      >
                        保存
                      </Button>
                      <Button
                        startIcon={<CancelIcon />}
                        onClick={handleCancel}
                        variant="outlined"
                      >
                        キャンセル
                      </Button>
                    </Box>
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="ユーザー名"
                      value={user.username}
                      disabled
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="メールアドレス"
                      value={user.email}
                      disabled
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="表示名"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="自己紹介"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      disabled={!isEditing}
                      multiline
                      rows={3}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="専門分野（カンマ区切り）"
                      name="expertise"
                      value={formData.expertise}
                      onChange={handleChange}
                      disabled={!isEditing}
                      variant="outlined"
                      helperText="例: よさこい, 審査, 指導"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Box>
                  <Typography variant="h6" gutterBottom>
                    セキュリティ
                  </Typography>
                  <Button
                    startIcon={<LockIcon />}
                    onClick={() => setIsPasswordDialogOpen(true)}
                    variant="outlined"
                  >
                    パスワード変更
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* アバターとロール情報カード */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                  <Avatar
                    src={user.profile?.avatar}
                    sx={{ 
                      width: 120, 
                      height: 120, 
                      mx: 'auto',
                      fontSize: '3rem',
                    }}
                  >
                    {user.profile?.displayName?.[0] || user.username?.[0] || 'U'}
                  </Avatar>
                  <IconButton
                    component="label"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    }}
                  >
                    <PhotoCamera />
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                  </IconButton>
                </Box>

                <Typography variant="h6" gutterBottom>
                  {user.profile?.displayName || user.username}
                </Typography>

                <Chip
                  label={getRoleLabel(user.role)}
                  color={getRoleColor(user.role)}
                  sx={{ mb: 2 }}
                />

                {user.profile?.bio && (
                  <Typography variant="body2" color="text.secondary">
                    {user.profile.bio}
                  </Typography>
                )}

                {user.profile?.expertise && user.profile.expertise.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      専門分野
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                      {user.profile.expertise.map((skill, index) => (
                        <Chip
                          key={index}
                          label={skill}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* パスワード変更ダイアログ */}
        <Dialog
          open={isPasswordDialogOpen}
          onClose={() => setIsPasswordDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>パスワード変更</DialogTitle>
          <DialogContent>
            {passwordError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {passwordError}
              </Alert>
            )}

            <TextField
              fullWidth
              label="現在のパスワード"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              margin="normal"
              autoComplete="current-password"
            />

            <TextField
              fullWidth
              label="新しいパスワード"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              margin="normal"
              autoComplete="new-password"
            />

            <TextField
              fullWidth
              label="新しいパスワード（確認）"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              margin="normal"
              autoComplete="new-password"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsPasswordDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handlePasswordUpdate}
              variant="contained"
              disabled={isLoading}
            >
              更新
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ProfilePage;