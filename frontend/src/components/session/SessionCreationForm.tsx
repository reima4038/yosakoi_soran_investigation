import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Typography,
  Alert,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { Video, Template, Session } from '../../types';
import { videoService } from '../../services/videoService';
import { templateService } from '../../services/templateService';
import {
  sessionService,
  CreateSessionRequest,
} from '../../services/sessionService';

interface SessionCreationFormProps {
  onSessionCreated?: (session: Session) => void;
  onCancel?: () => void;
  initialVideoId?: string;
  initialTemplateId?: string;
}

interface FormData {
  name: string;
  description: string;
  videoId: string;
  templateId: string;
  startDate: Date | null;
  endDate: Date | null;
  settings: {
    allowAnonymous: boolean;
    requireComments: boolean;
    showRealTimeResults: boolean;
    maxEvaluationsPerUser: number;
  };
}

const SessionCreationForm: React.FC<SessionCreationFormProps> = ({
  onSessionCreated,
  onCancel,
  initialVideoId = '',
  initialTemplateId = '',
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    videoId: initialVideoId,
    templateId: initialTemplateId,
    startDate: null,
    endDate: null,
    settings: {
      allowAnonymous: false,
      requireComments: false,
      showRealTimeResults: true,
      maxEvaluationsPerUser: 1,
    },
  });

  const [videos, setVideos] = useState<Video[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // 初期データの読み込み
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingData(true);
        const [videosData, templatesData] = await Promise.all([
          videoService.getVideos({ page: 1, limit: 100 }),
          templateService.getTemplates(),
        ]);

        setVideos(videosData.videos);
        setTemplates(templatesData);

        // 初期選択されたビデオとテンプレートを設定
        if (initialVideoId) {
          const video = videosData.videos.find(v => v.id === initialVideoId);
          if (video) setSelectedVideo(video);
        }

        if (initialTemplateId) {
          const template = templatesData.find(
            t => t.id === initialTemplateId
          );
          if (template) setSelectedTemplate(template);
        }
      } catch (err) {
        setError('データの読み込みに失敗しました');
        // console.error('初期データ読み込みエラー:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadInitialData();
  }, [initialVideoId, initialTemplateId]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSettingsChange = (
    field: keyof FormData['settings'],
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value,
      },
    }));
  };

  const handleVideoChange = (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    setSelectedVideo(video || null);
    handleInputChange('videoId', videoId);

    // 動画が選択されたら、動画名を基にセッション名を自動生成
    if (video && !formData.name) {
      const sessionName = `${video.title} の評価セッション`;
      handleInputChange('name', sessionName);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template || null);
    handleInputChange('templateId', templateId);
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'セッション名を入力してください';
    }
    if (!formData.videoId) {
      return '評価対象の動画を選択してください';
    }
    if (!formData.templateId) {
      return '評価テンプレートを選択してください';
    }
    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate >= formData.endDate
    ) {
      return '終了日時は開始日時より後に設定してください';
    }
    if (
      formData.settings.maxEvaluationsPerUser < 1 ||
      formData.settings.maxEvaluationsPerUser > 10
    ) {
      return '最大評価回数は1〜10の範囲で設定してください';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const sessionData: CreateSessionRequest = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        videoId: formData.videoId,
        templateId: formData.templateId,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        settings: formData.settings,
      };

      const createdSession = await sessionService.createSession(sessionData);

      if (onSessionCreated) {
        onSessionCreated(createdSession);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'セッションの作成に失敗しました');
      // console.error('セッション作成エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='400px'
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Card>
        <CardHeader
          title='新しい評価セッションを作成'
          subheader='動画の評価セッションを設定してください'
        />
        <CardContent>
          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity='error' sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* 基本情報 */}
              <Grid item xs={12}>
                <Typography variant='h6' gutterBottom>
                  基本情報
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label='セッション名'
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  required
                  placeholder='例: 第50回よさこい祭り 決勝戦評価'
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label='説明'
                  value={formData.description}
                  onChange={e =>
                    handleInputChange('description', e.target.value)
                  }
                  multiline
                  rows={3}
                  placeholder='セッションの目的や注意事項を記載してください'
                />
              </Grid>

              {/* 動画選択 */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant='h6' gutterBottom>
                  評価対象動画
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>動画を選択</InputLabel>
                  <Select
                    value={formData.videoId}
                    onChange={e => handleVideoChange(e.target.value)}
                    label='動画を選択'
                  >
                    {videos.map(video => (
                      <MenuItem key={video.id} value={video.id}>
                        <Box>
                          <Typography variant='body1'>{video.title}</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {video.metadata.teamName &&
                              `${video.metadata.teamName} - `}
                            {video.channelName}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {selectedVideo && (
                <Grid item xs={12}>
                  <Card variant='outlined'>
                    <CardContent>
                      <Box display='flex' gap={2}>
                        <img
                          src={selectedVideo.thumbnailUrl}
                          alt={selectedVideo.title}
                          style={{ width: 120, height: 90, objectFit: 'cover' }}
                        />
                        <Box flex={1}>
                          <Typography variant='subtitle1'>
                            {selectedVideo.title}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {selectedVideo.channelName}
                          </Typography>
                          {selectedVideo.metadata.teamName && (
                            <Chip
                              label={selectedVideo.metadata.teamName}
                              size='small'
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* テンプレート選択 */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant='h6' gutterBottom>
                  評価テンプレート
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>テンプレートを選択</InputLabel>
                  <Select
                    value={formData.templateId}
                    onChange={e => handleTemplateChange(e.target.value)}
                    label='テンプレートを選択'
                  >
                    {templates.map(template => (
                      <MenuItem key={template.id} value={template.id}>
                        <Box>
                          <Typography variant='body1'>
                            {template.name}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {template.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {selectedTemplate && (
                <Grid item xs={12}>
                  <Card variant='outlined'>
                    <CardContent>
                      <Typography variant='subtitle1'>
                        {selectedTemplate.name}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{ mb: 1 }}
                      >
                        {selectedTemplate.description}
                      </Typography>
                      <Box display='flex' flexWrap='wrap' gap={1}>
                        {selectedTemplate.categories.map(category => (
                          <Chip
                            key={category.id}
                            label={`${category.name} (${category.criteria.length}項目)`}
                            size='small'
                            variant='outlined'
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* 日時設定 */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant='h6' gutterBottom>
                  評価期間
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label='開始日時'
                  value={formData.startDate}
                  onChange={date => handleInputChange('startDate', date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: '未設定の場合は即座に開始されます',
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label='終了日時'
                  value={formData.endDate}
                  onChange={date => handleInputChange('endDate', date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: '未設定の場合は手動で終了します',
                    },
                  }}
                />
              </Grid>

              {/* 設定オプション */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant='h6' gutterBottom>
                  評価設定
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings.allowAnonymous}
                      onChange={e =>
                        handleSettingsChange('allowAnonymous', e.target.checked)
                      }
                    />
                  }
                  label='匿名評価を許可'
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings.requireComments}
                      onChange={e =>
                        handleSettingsChange(
                          'requireComments',
                          e.target.checked
                        )
                      }
                    />
                  }
                  label='コメント入力を必須にする'
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings.showRealTimeResults}
                      onChange={e =>
                        handleSettingsChange(
                          'showRealTimeResults',
                          e.target.checked
                        )
                      }
                    />
                  }
                  label='リアルタイム結果表示'
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type='number'
                  label='1人あたりの最大評価回数'
                  value={formData.settings.maxEvaluationsPerUser}
                  onChange={e =>
                    handleSettingsChange(
                      'maxEvaluationsPerUser',
                      parseInt(e.target.value)
                    )
                  }
                  inputProps={{ min: 1, max: 10 }}
                  helperText='1〜10回まで設定可能'
                />
              </Grid>

              {/* アクションボタン */}
              <Grid item xs={12}>
                <Box
                  display='flex'
                  justifyContent='flex-end'
                  gap={2}
                  sx={{ mt: 2 }}
                >
                  {onCancel && (
                    <Button
                      variant='outlined'
                      onClick={onCancel}
                      disabled={loading}
                    >
                      キャンセル
                    </Button>
                  )}
                  <Button
                    type='submit'
                    variant='contained'
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    {loading ? '作成中...' : 'セッションを作成'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
};

export default SessionCreationForm;
