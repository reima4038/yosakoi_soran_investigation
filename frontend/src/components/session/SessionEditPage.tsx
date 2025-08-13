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
  IconButton,
  FormControlLabel,
  Switch,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { sessionService } from '../../services/sessionService';
import { Session, Video, Template } from '../../types';
import {
  handleSessionError,
  createSuccessMessage,
  ErrorInfo,
} from '../../utils/errorHandler';
import { ErrorDisplay, LoadingDisplay, FeedbackSnackbar } from '../common';

const SessionEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [successMessage, setSuccessMessage] = useState<ErrorInfo | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

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
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  );

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
      console.log('SessionEditPage: Session ID from URL:', id);
      const loadData = async () => {
        try {
          // 選択肢とセッション情報を並行して取得
          console.log('Attempting to fetch session with ID:', id);
          const [, sessionResult] = await Promise.allSettled([
            fetchOptions(),
            sessionService.getSession(id, false), // includeDetailsをfalseに設定
          ]);

          // セッション情報の処理
          if (sessionResult.status === 'fulfilled') {
            const sessionData = sessionResult.value;
            console.log('Session data loaded:', sessionData);
            setSession(sessionData);
            checkEditPermission(sessionData);

            // フォームデータの初期化は、テンプレートとビデオのデータが読み込まれた後に行う
            // useEffectで処理される
          } else {
            console.error('Session loading failed:', sessionResult.reason);
            const errorInfo = handleSessionError(
              sessionResult.reason,
              '情報取得'
            );
            setError(errorInfo);
          }
        } catch (error) {
          console.error('Data loading error:', error);
          if (error && typeof error === 'object' && 'response' in error) {
            console.error('Error response:', (error as any).response?.data);
            console.error('Error status:', (error as any).response?.status);
          }
          const errorInfo = handleSessionError(error, '情報取得');
          setError(errorInfo);
        } finally {
          setIsLoading(false);
          setPermissionChecked(true);
        }
      };
      loadData();
    }
  }, [id]);

  // テンプレート・動画一覧が更新されたときにフォームデータを再初期化
  useEffect(() => {
    if (session && (templates.length > 0 || videos.length > 0)) {
      console.log('Reinitializing form data:', {
        sessionExists: !!session,
        templatesCount: templates.length,
        videosCount: videos.length,
        currentFormData: formData,
        sessionData: session
      });
      try {
        initializeFormData(session);
      } catch (error) {
        console.error('Error initializing form data:', error);
        setError({
          message: 'フォームデータの初期化に失敗しました。',
          severity: 'error',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }, [templates, videos, session]);

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

      // 実際のAPIから動画とテンプレートの一覧を取得
      const [videosData, templatesData] = await Promise.allSettled([
        import('../../services/videoService').then(module =>
          module.videoService.getVideos()
        ),
        import('../../services/templateService').then(module =>
          module.templateService.getTemplates()
        ),
      ]);

      // 動画データの処理
      if (videosData.status === 'fulfilled') {
        const rawVideoList = Array.isArray(videosData.value)
          ? videosData.value
          : videosData.value?.data || videosData.value?.videos || [];

        // IDフィールドを正規化
        const videoList = rawVideoList.map((video: any) => ({
          ...video,
          id: video.id || video._id,
        }));

        setVideos(videoList);

        if (process.env.NODE_ENV === 'development') {
          console.log(
            'Videos loaded:',
            videoList.length,
            videoList.map(v => ({ id: v.id, title: v.title }))
          );
        }
      } else {
        console.warn('動画一覧の取得に失敗しました:', videosData.reason);
        setVideos([]);
      }

      // テンプレートデータの処理
      if (templatesData.status === 'fulfilled') {
        const rawTemplateList = Array.isArray(templatesData.value)
          ? templatesData.value
          : templatesData.value?.data || [];

        // IDフィールドを正規化
        const templateList = rawTemplateList.map((template: any) => ({
          ...template,
          id: template.id || template._id,
        }));

        setTemplates(templateList);

        if (process.env.NODE_ENV === 'development') {
          console.log(
            'Templates loaded:',
            templateList.length,
            templateList.map(t => ({
              id: t.id || t._id,
              name: t.name,
              hasId: !!t.id,
              hasUnderscore: !!t._id,
              fullObject: t,
            }))
          );
        }
      } else {
        console.warn(
          'テンプレート一覧の取得に失敗しました:',
          templatesData.reason
        );
        setTemplates([]);
      }
    } catch (error) {
      console.error('選択肢の取得に失敗しました:', error);
      // エラーが発生してもフォームは表示する
      setVideos([]);
      setTemplates([]);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  // フォームデータの初期化
  const initializeFormData = (sessionData: Session) => {
    try {
      console.log('initializeFormData called with:', sessionData);
      
      // 日付の安全な変換
      const formatDateForInput = (date: string | Date | undefined | null) => {
        if (!date) return '';
        try {
          const dateObj = typeof date === 'string' ? new Date(date) : date;
          if (isNaN(dateObj.getTime())) return '';
          return dateObj.toISOString().slice(0, 16);
        } catch (error) {
          console.warn('Date formatting error:', error, 'for date:', date);
          return '';
        }
      };

    // videoIdとtemplateIdの安全な取得
    const getIdFromValue = (value: any) => {
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value?.id) return value.id;
      if (typeof value === 'object' && value?._id) return value._id;
      return '';
    };

    // フォームデータの初期化
    const initialFormData = {
      name: sessionData.name || '',
      description: sessionData.description || '',
      startDate: formatDateForInput(sessionData.startDate),
      endDate: formatDateForInput(sessionData.endDate),
      videoId: getIdFromValue(sessionData.videoId),
      templateId: getIdFromValue(sessionData.templateId),
      settings: {
        isAnonymous: sessionData.settings?.allowAnonymous || false,
        showResultsAfterSubmit: sessionData.settings?.showRealTimeResults !== false,
        allowComments: !sessionData.settings?.requireComments,
      },
    };

    setFormData(initialFormData);
    setOriginalData(initialFormData);
    setHasUnsavedChanges(false);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('originalData set to:', initialFormData);
    }

    // 開発環境でのデバッグ情報
    if (process.env.NODE_ENV === 'development') {
      console.log('Form data initialized successfully:', {
        sessionName: sessionData.name,
        rawTemplateId: sessionData.templateId,
        rawVideoId: sessionData.videoId,
        extractedTemplateId: initialFormData.templateId,
        extractedVideoId: initialFormData.videoId,
        availableTemplates: templates.length,
        availableVideos: videos.length,
        templateFound: templates.find(t => t.id === initialFormData.templateId)
          ? 'Yes'
          : 'No',
        videoFound: videos.find(v => v.id === initialFormData.videoId)
          ? 'Yes'
          : 'No',
        templateStructure:
          typeof sessionData.templateId === 'object'
            ? Object.keys(sessionData.templateId)
            : 'string',
        videoStructure:
          typeof sessionData.videoId === 'object'
            ? Object.keys(sessionData.videoId)
            : 'string',
        templateIds: templates.map(t => t.id),
        videoIds: videos.map(v => v.id),
        templateMatch: templates.find(t => t.id === initialFormData.templateId),
        videoMatch: videos.find(v => v.id === initialFormData.videoId),
      });
    }
    } catch (error) {
      console.error('Error in initializeFormData:', error);
      throw error;
    }
  };

  // 編集権限のチェック
  const checkEditPermission = (sessionData: Session) => {
    if (!user) {
      setHasEditPermission(false);
      return;
    }

    // ADMINは常に編集可能
    if (user.role === UserRole.ADMIN) {
      setHasEditPermission(true);
      return;
    }

    // EVALUATORの場合、セッション作成者のみ編集可能
    if (user.role === UserRole.EVALUATOR) {
      const isCreator = sessionData.creatorId === user.id;
      setHasEditPermission(isCreator);
      return;
    }

    // その他のロールは編集不可
    setHasEditPermission(false);
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

    // 日付の検証（両方が入力されている場合のみチェック）
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
    if (!originalData) {
      if (process.env.NODE_ENV === 'development') {
        console.log('checkForChanges: originalData is null');
      }
      return false;
    }

    const hasChanges = JSON.stringify(newFormData) !== JSON.stringify(originalData);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('checkForChanges:', {
        hasChanges,
        newFormData,
        originalData,
        newFormDataStr: JSON.stringify(newFormData),
        originalDataStr: JSON.stringify(originalData)
      });
    }

    return hasChanges;
  };

  // フォーム入力の処理
  const handleInputChange = (field: string, value: any) => {
    const newFormData = {
      ...formData,
      [field]: value,
    };

    setFormData(newFormData);
    const hasChanges = checkForChanges(newFormData);
    setHasUnsavedChanges(hasChanges);

    if (process.env.NODE_ENV === 'development') {
      console.log('handleInputChange:', {
        field,
        value,
        hasChanges,
        newFormData,
        originalData
      });
    }

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
      setError({
        message: '入力内容に問題があります。',
        severity: 'error',
        details: 'エラーメッセージを確認して修正してください。',
      });
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      // 日付の安全な変換（空の場合はundefinedを返す）
      const parseDate = (dateString: string) => {
        if (!dateString) return undefined;
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
          }
          return date;
        } catch (error) {
          throw new Error(`日付の形式が正しくありません: ${dateString}`);
        }
      };

      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        startDate: parseDate(formData.startDate),
        endDate: parseDate(formData.endDate),
        videoId: formData.videoId,
        templateId: formData.templateId,
        settings: {
          // UpdateSessionRequestの設定プロパティ名に合わせる
          allowAnonymous: formData.settings.isAnonymous,
          requireComments: !formData.settings.allowComments, // 逆の意味なので反転
          showRealTimeResults: formData.settings.showResultsAfterSubmit,
        },
      };

      await sessionService.updateSession(id, updateData);

      const successInfo = createSuccessMessage('セッション情報の更新');
      setSuccessMessage(successInfo);
      setHasUnsavedChanges(false);
      setOriginalData(formData);

      // 2秒後に詳細ページに戻る
      setTimeout(() => {
        navigate(`/sessions/${id}`);
      }, 2000);
    } catch (error: unknown) {
      // 統一されたエラーハンドリングを使用
      const errorInfo = handleSessionError(error as any, '更新');
      setError(errorInfo);
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

  if (isLoading || !permissionChecked) {
    return (
      <LoadingDisplay type='linear' message='セッション情報を読み込み中...' />
    );
  }

  if (error && !session) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorDisplay
          error={error}
          onRetry={id ? () => window.location.reload() : undefined}
          showDetails={true}
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant='contained'
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/sessions')}
          >
            セッション一覧に戻る
          </Button>
          {id && (
            <Button
              variant='outlined'
              onClick={() => navigate(`/sessions/${id}`)}
            >
              セッション詳細に戻る
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  if (!hasEditPermission) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error' sx={{ mb: 2 }}>
          このセッションを編集する権限がありません。
          {user?.role === UserRole.EVALUATOR && session && (
            <Box
              component='span'
              sx={{ display: 'block', mt: 1, fontSize: '0.875rem' }}
            >
              セッションの編集は作成者またはシステム管理者のみが行えます。
            </Box>
          )}
        </Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='contained'
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/sessions/${id}`)}
          >
            セッション詳細に戻る
          </Button>
          <Button variant='outlined' onClick={() => navigate('/sessions')}>
            セッション一覧に戻る
          </Button>
        </Box>
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
        <ErrorDisplay
          error={error}
          showDetails={true}
          onDismiss={() => setError(null)}
          className='mb-2'
        />
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
                    label='開始日時（任意）'
                    type='datetime-local'
                    value={formData.startDate}
                    onChange={e =>
                      handleInputChange('startDate', e.target.value)
                    }
                    InputLabelProps={{
                      shrink: true,
                    }}
                    error={!!validationErrors.startDate}
                    helperText={validationErrors.startDate || '評価期間の開始日時を設定できます'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label='終了日時（任意）'
                    type='datetime-local'
                    value={formData.endDate}
                    onChange={e => handleInputChange('endDate', e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    error={!!validationErrors.endDate}
                    helperText={validationErrors.endDate || '評価期間の終了日時を設定できます'}
                  />
                </Grid>
              </Grid>

              {/* 動画・テンプレート選択 */}
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <Autocomplete
                    key={`video-${videos.length}-${formData.videoId}`}
                    options={videos}
                    getOptionLabel={option => option.title}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    value={
                      formData.videoId && videos.length > 0
                        ? videos.find(v => v.id === formData.videoId) || null
                        : null
                    }
                    onChange={(_event, newValue) => {
                      const newVideoId = newValue?.id || '';
                      handleInputChange('videoId', newVideoId);

                      if (process.env.NODE_ENV === 'development') {
                        console.log('Video selected:', {
                          newVideoId,
                          videoTitle: newValue?.title,
                          formDataBefore: formData.videoId,
                        });
                      }
                    }}
                    loading={isLoadingOptions}
                    renderInput={params => (
                      <TextField
                        {...params}
                        label='評価対象動画'
                        required
                        error={!!validationErrors.videoId}
                        helperText={
                          validationErrors.videoId ||
                          (process.env.NODE_ENV === 'development'
                            ? `選択中: ${formData.videoId || 'なし'} / 利用可能: ${videos.length}件 / 見つかった: ${videos.find(v => v.id === formData.videoId) ? 'Yes' : 'No'} / Value: ${videos.find(v => v.id === formData.videoId)?.title || 'null'}`
                            : '')
                        }
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component='li' {...props}>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                        >
                          <img
                            src={option.thumbnailUrl}
                            alt={option.title}
                            style={{
                              width: 60,
                              height: 34,
                              objectFit: 'cover',
                              borderRadius: 4,
                            }}
                            onError={e => {
                              (e.target as HTMLImageElement).src =
                                '/placeholder-video.png';
                            }}
                          />
                          <Box>
                            <Typography variant='body2'>
                              {option.title}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {option.metadata?.teamName || 'チーム名未設定'}
                            </Typography>
                            {process.env.NODE_ENV === 'development' && (
                              <Typography
                                variant='caption'
                                color='primary'
                                sx={{ display: 'block' }}
                              >
                                ID: {option.id}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    )}
                    noOptionsText={
                      isLoadingOptions
                        ? '読み込み中...'
                        : '動画が見つかりません'
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <Autocomplete
                    key={`template-${templates.length}-${formData.templateId}`}
                    options={templates}
                    getOptionLabel={option => option.name}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    value={(() => {
                      const foundTemplate =
                        formData.templateId && templates.length > 0
                          ? templates.find(t => t.id === formData.templateId)
                          : null;

                      if (process.env.NODE_ENV === 'development') {
                        console.log(
                          'Template Autocomplete value calculation:',
                          {
                            formDataTemplateId: formData.templateId,
                            templatesLength: templates.length,
                            foundTemplate: foundTemplate
                              ? {
                                  id: foundTemplate.id,
                                  name: foundTemplate.name,
                                }
                              : null,
                            allTemplateIds: templates.map(t => t.id),
                            exactMatch: templates.some(
                              t => t.id === formData.templateId
                            ),
                          }
                        );
                      }

                      return foundTemplate || null;
                    })()}
                    onChange={(_event, newValue) => {
                      const newTemplateId = newValue?.id || '';
                      handleInputChange('templateId', newTemplateId);

                      if (process.env.NODE_ENV === 'development') {
                        console.log('Template selected:', {
                          newTemplateId,
                          templateName: newValue?.name,
                          formDataBefore: formData.templateId,
                        });
                      }
                    }}
                    loading={isLoadingOptions}
                    renderInput={params => (
                      <TextField
                        {...params}
                        label='評価テンプレート'
                        required
                        error={!!validationErrors.templateId}
                        helperText={
                          validationErrors.templateId ||
                          (process.env.NODE_ENV === 'development'
                            ? `選択中: ${formData.templateId || 'なし'} / 利用可能: ${templates.length}件 / 見つかった: ${templates.find(t => t.id === formData.templateId) ? 'Yes' : 'No'} / Value: ${templates.find(t => t.id === formData.templateId)?.name || 'null'}`
                            : '')
                        }
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component='li' {...props}>
                        <Box>
                          <Typography variant='body2'>{option.name}</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {option.description}
                          </Typography>
                          {process.env.NODE_ENV === 'development' && (
                            <Typography
                              variant='caption'
                              color='primary'
                              sx={{ display: 'block' }}
                            >
                              ID: {option.id}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                    noOptionsText={
                      isLoadingOptions
                        ? '読み込み中...'
                        : 'テンプレートが見つかりません'
                    }
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
        <Button variant='outlined' onClick={handleCancel} disabled={isSaving}>
          キャンセル
        </Button>
        <Button
          variant='contained'
          startIcon={
            isSaving ? (
              <CircularProgress size={20} color='inherit' />
            ) : (
              <SaveIcon />
            )
          }
          onClick={handleSave}
          disabled={(() => {
            const conditions = {
              isSaving,
              hasUnsavedChanges,
              hasName: !!formData.name.trim(),
              hasVideoId: !!formData.videoId,
              hasTemplateId: !!formData.templateId,
              // 日付は任意項目
              hasStartDate: !!formData.startDate,
              hasEndDate: !!formData.endDate
            };
            
            const isDisabled = isSaving ||
              !hasUnsavedChanges ||
              !formData.name.trim() ||
              !formData.videoId ||
              !formData.templateId;
            
            if (process.env.NODE_ENV === 'development') {
              console.log('Save button state:', {
                ...conditions,
                isDisabled,
                formData: {
                  name: formData.name,
                  startDate: formData.startDate,
                  endDate: formData.endDate,
                  videoId: formData.videoId,
                  templateId: formData.templateId
                }
              });
            }
            
            return isDisabled;
          })()}
        >
          {isSaving
            ? '保存中...'
            : hasUnsavedChanges
              ? '変更を保存'
              : '保存済み'}
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
          <Button onClick={handleCancelNavigation}>キャンセル</Button>
          <Button
            onClick={handleConfirmNavigation}
            color='error'
            variant='contained'
          >
            離れる
          </Button>
        </DialogActions>
      </Dialog>

      {/* 成功メッセージのSnackbar */}
      <FeedbackSnackbar
        open={!!successMessage}
        message={successMessage}
        onClose={() => setSuccessMessage(null)}
        autoHideDuration={3000}
      />
    </Box>
  );
};

export default SessionEditPage;
