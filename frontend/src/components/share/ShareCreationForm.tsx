import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Box,
  Typography,
  Alert,
  Autocomplete,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  ContentCopy,
  Visibility,
  VisibilityOff,
  CalendarToday,
  Person,
  Lock,
  Public
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { shareService, CreateShareRequest, Share } from '../../services/shareService';

interface ShareCreationFormProps {
  open: boolean;
  onClose: () => void;
  resourceType: 'session_results' | 'evaluation' | 'analysis';
  resourceId: string;
  resourceTitle: string;
  onShareCreated?: (share: Share, shareUrl: string) => void;
}

interface User {
  _id: string;
  username: string;
  profile?: { displayName?: string };
}

const ShareCreationForm: React.FC<ShareCreationFormProps> = ({
  open,
  onClose,
  resourceType,
  resourceId,
  resourceTitle,
  onShareCreated
}) => {
  const [formData, setFormData] = useState<CreateShareRequest>({
    resourceType,
    resourceId,
    visibility: 'private',
    permissions: ['view'],
    settings: {
      allowComments: true,
      allowDownload: false,
      showEvaluatorNames: false,
      showIndividualScores: true
    }
  });

  const [showPassword, setShowPassword] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // フォームリセット
  useEffect(() => {
    if (open) {
      setFormData({
        resourceType,
        resourceId,
        visibility: 'private',
        permissions: ['view'],
        settings: {
          allowComments: true,
          allowDownload: false,
          showEvaluatorNames: false,
          showIndividualScores: true
        }
      });
      setSelectedUsers([]);
      setError(null);
      setValidationErrors([]);
    }
  }, [open, resourceType, resourceId]);

  // ユーザー一覧の取得（実際の実装では適切なAPIを呼び出す）
  useEffect(() => {
    // TODO: ユーザー一覧を取得するAPIを実装
    setAvailableUsers([]);
  }, []);

  const handleInputChange = (field: keyof CreateShareRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSettingsChange = (field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData(prev => {
      const permissions = prev.permissions || [];
      if (checked) {
        return {
          ...prev,
          permissions: [...permissions, permission]
        };
      } else {
        return {
          ...prev,
          permissions: permissions.filter(p => p !== permission)
        };
      }
    });
  };

  const handleUserSelection = (users: User[]) => {
    setSelectedUsers(users);
    setFormData(prev => ({
      ...prev,
      allowedUsers: users.map(user => user._id)
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    setValidationErrors([]);

    // バリデーション
    const errors = shareService.validateShareSettings(formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const result = await shareService.createShare(formData);
      onShareCreated?.(result.share, result.shareUrl);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || '共有設定の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Public />;
      case 'password_protected':
        return <Lock />;
      case 'specific_users':
        return <Person />;
      default:
        return <VisibilityOff />;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            共有設定の作成
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {resourceTitle}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {validationErrors.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 公開設定 */}
            <FormControl fullWidth>
              <InputLabel>公開設定</InputLabel>
              <Select
                value={formData.visibility}
                onChange={(e) => handleInputChange('visibility', e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    {getVisibilityIcon(formData.visibility)}
                  </InputAdornment>
                }
              >
                <MenuItem value="private">非公開（自分のみ）</MenuItem>
                <MenuItem value="public">全体公開</MenuItem>
                <MenuItem value="password_protected">パスワード保護</MenuItem>
                <MenuItem value="specific_users">特定ユーザーのみ</MenuItem>
              </Select>
            </FormControl>

            {/* パスワード設定 */}
            {formData.visibility === 'password_protected' && (
              <TextField
                fullWidth
                label="パスワード"
                type={showPassword ? 'text' : 'password'}
                value={formData.password || ''}
                onChange={(e) => handleInputChange('password', e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            )}

            {/* ユーザー選択 */}
            {formData.visibility === 'specific_users' && (
              <Autocomplete
                multiple
                options={availableUsers}
                value={selectedUsers}
                onChange={(_, newValue) => handleUserSelection(newValue)}
                getOptionLabel={(option) => option.profile?.displayName || option.username}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option.profile?.displayName || option.username}
                      {...getTagProps({ index })}
                      key={option._id}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="共有するユーザー"
                    placeholder="ユーザーを選択してください"
                  />
                )}
              />
            )}

            {/* 権限設定 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                権限設定
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[
                  { key: 'view', label: '閲覧' },
                  { key: 'comment', label: 'コメント' },
                  { key: 'edit', label: '編集' }
                ].map(({ key, label }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Switch
                        checked={formData.permissions?.includes(key) || false}
                        onChange={(e) => handlePermissionChange(key, e.target.checked)}
                        disabled={key === 'view'} // 閲覧権限は必須
                      />
                    }
                    label={label}
                  />
                ))}
              </Box>
            </Box>

            {/* 有効期限 */}
            <DateTimePicker
              label="有効期限（任意）"
              value={formData.expiresAt ? new Date(formData.expiresAt) : null}
              onChange={(date) => handleInputChange('expiresAt', date?.toISOString())}
              slotProps={{
                textField: {
                  fullWidth: true,
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday />
                      </InputAdornment>
                    )
                  }
                }
              }}
            />

            {/* 詳細設定 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                詳細設定
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings?.allowComments || false}
                      onChange={(e) => handleSettingsChange('allowComments', e.target.checked)}
                    />
                  }
                  label="コメントを許可"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings?.allowDownload || false}
                      onChange={(e) => handleSettingsChange('allowDownload', e.target.checked)}
                    />
                  }
                  label="ダウンロードを許可"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings?.showEvaluatorNames || false}
                      onChange={(e) => handleSettingsChange('showEvaluatorNames', e.target.checked)}
                    />
                  }
                  label="評価者名を表示"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings?.showIndividualScores || false}
                      onChange={(e) => handleSettingsChange('showIndividualScores', e.target.checked)}
                    />
                  }
                  label="個別スコアを表示"
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? '作成中...' : '共有設定を作成'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ShareCreationForm;