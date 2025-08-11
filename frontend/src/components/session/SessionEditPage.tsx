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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { sessionService } from '../../services/sessionService';
import { Session, Video, Template } from '../../types';

const SessionEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { hasAnyRole } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);

  // フォームの状態
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    videoId: '',
    templateId: '',
    settings: {
      isAnonymous: false,
      showResultsAfterSubmit: true,
      allowComments: true,
    },
  });

  // 動画・テンプレートの選択肢
  const [videos, setVideos] = useState<Video[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // 確認ダイアログの状態
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // バリデーションエラーの状態
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    startDate: '',
    endDate: '',
    videoId: '',
    templateId: '',
  });

  // セッション詳細の取得
  useEffect(() => {
    if (id) {
      fetchSession(id);
      fetchOptions();
    }
  }, [id]);

  // ページ離脱時の確認
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 動画・テンプレートの選択肢を取得
  const fetchOptions = async () => {
    try {
      setIsLoadingOptions(true);
      
      // 実際のAPIエンドポイントに置き換える必要があります
      // const [videosResponse, templatesResponse] = await Promise.all([
      //   fetch('/api/videos'),
      //   fetch('/api/templates')
      // ]);
      
      // モックデータ（実際のAPIに置き換える）
      const mockVideos: Video[] = [
        {
          id: 'video1',
          youtubeId: 'dQw4w9WgXcQ',
          title: '鳴子踊り - 伝統チーム',
          channelName: 'よさこいチャンネル',
          uploadDate: '2024-07-01',
          description: '伝統的な鳴子踊りの演舞',
          metadata: {
            teamName: '伝統チーム',
            performanceName: '鳴子踊り',
            eventName: 'よさこい祭り',
            year: 2024,
          },
          tags: ['よさこい', '鳴子踊り'],
          thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
          createdAt: '2024-07-01T00:00:00Z',
          createdBy: 'admin',
        },
        {
          id: 'video2',
          youtubeId: 'abc123def',
          title: '現代風よさこい - 青春チーム',
          channelName: 'よさこいチャンネル',
          uploadDate: '2024-07-02',
          description: '現代風アレンジのよさこい演舞',
          metadata: {
            teamName: '青春チーム',
            performanceName: '現代風よさこい',
            eventName: 'よさこい祭り',
            year: 2024,
          },
          tags: ['よさこい', '現代風'],
          thumbnailUrl: 'https://img.youtube.com/vi/abc123def/maxresdefault.jpg',
          createdAt: '2024-07-02T00:00:00Z',
          createdBy: 'admin',
        },
      ];

      const mockTemplates: Template[] = [
        {
          id: 'template1',
          name: '本祭評価テンプレート',
          description: '本祭での演舞評価用の標準テンプレート',
          createdAt: '2024-06-01T00:00:00Z',
          creatorId: 'admin',
          categories: [],
        },
        {
          id: 'template2',
          name: '地方車評価テンプレート',
          description: '地方車での演舞評価用テンプレート',
          createdAt: '2024-06-02T00:00:00Z',
          creatorId: 'admin',
          categories: [],
        },
      ];

      setVideos(mockVideos);
      setTemplates(mockTemplates);
    } catch (error) {
      
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const fetchSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError('');

      const sessionData = await sessionService.getSession(sessionId);
      setSession(sessionData);

      // フォームデータの初期化
      const initialFormData = {
        name: sessionData.name,
        description: sessionData.description,
        startDate: new Date(sessionData.startDate).toISOString().slice(0, 16),
        endDate: new Date(sessionData.endDate).toISOString().slice(0, 16),
        videoId: sessionData.videoId,
        templateId: sessionData.templateId,
        settings: sessionData.settings,
      };
      
      setFormData(initialFormData);
      setOriginalData(initialFormData);
      setHasUnsavedChanges(false);
    } catch (error: any) {
      
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
      videoId: '',
      templateId: '',
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

    // 動画・テンプレートの検証
    if (!formData.videoId) {
      errors.videoId = '評価対象動画を選択してください';
    }

    if (!formData.templateId) {
      errors.templateId = '評価テンプレートを選択してください';
    }

    setValidationErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  // 変更検知
  const checkForChanges = (newFormData: any) => {
    if (!originalData) return false;
    
    return JSON.stringify(newFormData) !== JSON.stringify(originalData);
  };

  // フォーム入力の処理
  const handleInputChange = (field: string, value: any) => {
    const newFormData = {
      ...formData,
      [field]: value,
    };
    
    setFormData(newFormData);
    setHasUnsavedChanges(checkForChanges(newFormData));

    // リアルタイムバリデーション
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleSettingsChange = (field: string, value: boolean) => {
    const newFormData = {
      ...formData,
      settings: {
        ...formData.settings,
        [field]: value,
      },
    };
    
    setFormData(newFormData);
    setHasUnsavedChanges(checkForChanges(newFormData));
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
        videoId: formData.videoId,
        templateId: formData.templateId,
        settings: formData.settings,
      };

      await sessionService.updateSession(id, updateData);
      setSuccessMessage('セッション情報を更新しました');
      setHasUnsavedChanges(false);
      setOriginalData(formData);

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

  // キャンセル処理
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setPendingNavigation(`/sessions/${id}`);
      setConfirmDialogOpen(true);
    } else {
      navigate(`/sessions/${id}`);
    }
  };

  // 確認ダイアログでの続行
  const handleConfirmNavigation = () => {
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setConfirmDialogOpen(false);
    setPendingNavigation(null);
  };

  // 確認ダイアログでのキャンセル
  const handleCancelNavigation = () => {
    setConfirmDialogOpen(false);
    setPendingNavigation(null);
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

              {/* 動画・テンプレート選択 */}
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <Autocomplete
                    options={videos}
                    getOptionLabel={(option) => option.title}
                    value={videos.find(v => v.id === formData.videoId) || null}
                    onChange={(event, newValue) => {
                      handleInputChange('videoId', newValue?.id || '');
                    }}
                    loading={isLoadingOptions}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="評価対象動画"
                        required
                        error={!!validationErrors.videoId}
                        helperText={validationErrors.videoId}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <img
                            src={option.thumbnailUrl}
                            alt={option.title}
                            style={{ width: 60, height: 34, objectFit: 'cover', borderRadius: 4 }}
                          />
                          <Box>
                            <Typography variant="body2">{option.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.metadata.teamName}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Autocomplete
                    options={templates}
                    getOptionLabel={(option) => option.name}
                    value={templates.find(t => t.id === formData.templateId) || null}
                    onChange={(event, newValue) => {
                      handleInputChange('templateId', newValue?.id || '');
                    }}
                    loading={isLoadingOptions}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="評価テンプレート"
                        required
                        error={!!validationErrors.templateId}
                        helperText={validationErrors.templateId}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box>
                          <Typography variant="body2">{option.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        </Box>
                      </Box>
                    )}
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
          onClick={handleCancel}
          disabled={isSaving}
        >
          キャンセル
        </Button>
        <Button
          variant='contained'
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={
            isSaving || 
            !hasUnsavedChanges ||
            !formData.name.trim() || 
            !formData.startDate || 
            !formData.endDate || 
            !formData.videoId || 
            !formData.templateId
          }
        >
          {isSaving ? '保存中...' : hasUnsavedChanges ? '変更を保存' : '保存済み'}
        </Button>
      </Box>

      {/* 確認ダイアログ */}
      <Dialog open={confirmDialogOpen} onClose={handleCancelNavigation}>
        <DialogTitle>未保存の変更があります</DialogTitle>
        <DialogContent>
          <Typography>
            変更内容が保存されていません。このページを離れますか？
            変更内容は失われます。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelNavigation}>
            キャンセル
          </Button>
          <Button onClick={handleConfirmNavigation} color="error" variant="contained">
            離れる
          </Button>
        </DialogActions>
      </Dialog>

      {/* 成功メッセージのSnackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SessionEditPage;
