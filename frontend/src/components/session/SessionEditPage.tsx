import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  LinearProgress,
  IconButton,
  FormControlLabel,
  Switch,
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { sessionService } from '../../services/sessionService';
import { Session } from '../../types';

const SessionEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { hasAnyRole } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // フォームの状態
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    settings: {
      isAnonymous: false,
      showResultsAfterSubmit: true,
      allowComments: true,
    },
  });

  // バリデーションエラーの状態
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  // セッション詳細の取得
  useEffect(() => {
    if (id) {
      fetchSession(id);
    }
  }, [id]);

  const fetchSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError('');

      const sessionData = await sessionService.getSession(sessionId);
      setSession(sessionData);

      // フォームデータの初期化
      setFormData({
        name: sessionData.name,
        description: sessionData.description,
        startDate: new Date(sessionData.startDate).toISOString().slice(0, 16),
        endDate: new Date(sessionData.endDate).toISOString().slice(0, 16),
        settings: sessionData.settings,
      });
    } catch (error: any) {
      console.error('Session fetch error:', error);
      setError('セッション情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // バリデーション関数
  const validateForm = () => {
    const errors = {
      name: '',
      startDate: '',
      endDate: '',
    };

    // セッション名の検証
    if (!formData.name.trim()) {
      errors.name = 'セッション名は必須です';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'セッション名は3文字以上で入力してください';
    }

    // 日付の検証
    if (!formData.startDate) {
      errors.startDate = '開始日時は必須です';
    }

    if (!formData.endDate) {
      errors.endDate = '終了日時は必須です';
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (startDate >= endDate) {
        errors.endDate = '終了日時は開始日時より後に設定してください';
      }
    }

    setValidationErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  // フォーム入力の処理
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // リアルタイムバリデーション
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleSettingsChange = (field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value,
      },
    }));
  };

  // セッション更新の処理
  const handleSave = async () => {
    if (!id) return;

    // バリデーションチェック
    if (!validateForm()) {
      setError('入力内容に問題があります。エラーメッセージを確認してください。');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      setSuccessMessage('');

      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        settings: formData.settings,
      };

      await sessionService.updateSession(id, updateData);
      setSuccessMessage('セッション情報を更新しました');

      // 2秒後に詳細ページに戻る
      setTimeout(() => {
        navigate(`/sessions/${id}`);
      }, 2000);
    } catch (error: any) {
      
      
      // APIエラーの詳細な処理
      if (error.response?.status === 403) {
        setError('このセッションを編集する権限がありません');
      } else if (error.response?.status === 404) {
        setError('セッションが見つかりません');
      } else if (error.response?.status === 400) {
        setError('入力データに問題があります');
      } else {
        setError('セッション情報の更新に失敗しました');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 編集権限の確認
  const canEdit = hasAnyRole([UserRole.ADMIN, UserRole.EVALUATOR]);

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant='body2' sx={{ mt: 2, textAlign: 'center' }}>
          セッション情報を読み込み中...
        </Typography>
      </Box>
    );
  }

  if (error && !session) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/sessions')}
          sx={{ mt: 2 }}
        >
          セッション一覧に戻る
        </Button>
      </Box>
    );
  }

  if (!canEdit) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>このセッションを編集する権限がありません</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/sessions/${id}`)}
          sx={{ mt: 2 }}
        >
          セッション詳細に戻る
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(`/sessions/${id}`)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant='h4'>セッション編集</Typography>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity='success' sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* 編集フォーム */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                基本情報
              </Typography>

              <TextField
                fullWidth
                label='セッション名'
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                margin='normal'
                required
                error={!!validationErrors.name}
                helperText={validationErrors.name}
              />

              <TextField
                fullWidth
                label='説明'
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                margin='normal'
                multiline
                rows={3}
              />

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='開始日時'
                    type='datetime-local'
                    value={formData.startDate}
                    onChange={e =>
                      handleInputChange('startDate', e.target.value)
                    }
                    InputLabelProps={{
                      shrink: true,
                    }}
                    error={!!validationErrors.startDate}
                    helperText={validationErrors.startDate}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='終了日時'
                    type='datetime-local'
                    value={formData.endDate}
                    onChange={e => handleInputChange('endDate', e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    error={!!validationErrors.endDate}
                    helperText={validationErrors.endDate}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                セッション設定
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.isAnonymous}
                    onChange={e =>
                      handleSettingsChange('isAnonymous', e.target.checked)
                    }
                  />
                }
                label='匿名評価'
                sx={{ display: 'block', mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.showResultsAfterSubmit}
                    onChange={e =>
                      handleSettingsChange(
                        'showResultsAfterSubmit',
                        e.target.checked
                      )
                    }
                  />
                }
                label='提出後結果表示'
                sx={{ display: 'block', mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.allowComments}
                    onChange={e =>
                      handleSettingsChange('allowComments', e.target.checked)
                    }
                  />
                }
                label='コメント機能'
                sx={{ display: 'block', mb: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 保存・キャンセルボタン */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button
          variant='outlined'
          onClick={() => navigate(`/sessions/${id}`)}
          disabled={isSaving}
        >
          キャンセル
        </Button>
        <Button
          variant='contained'
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={isSaving || !formData.name.trim() || !formData.startDate || !formData.endDate}
        >
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </Box>
    </Box>
  );
};

export default SessionEditPage;
