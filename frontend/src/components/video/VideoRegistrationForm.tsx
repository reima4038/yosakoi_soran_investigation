import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  videoService,
  YouTubeVideoInfo,
  CreateVideoRequest,
} from '../../services/videoService';
import EnhancedURLInput from '../common/EnhancedURLInput';
import { NormalizedURL, URLValidationError } from '../../utils/urlNormalizer';
import { 
  createDynamicVideoRegistrationSchema,
  relaxedVideoRegistrationSchema 
} from '../../utils/validationSchemas';

interface VideoRegistrationFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  youtubeUrl: string;
  metadata?: {
    teamName?: string;
    performanceName?: string;
    eventName?: string;
    year?: number | null;
    location?: string;
  };
  tags?: string[];
}

const VideoRegistrationForm: React.FC<VideoRegistrationFormProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'url' | 'preview' | 'details'>('url');
  const [youtubeInfo, setYoutubeInfo] = useState<YouTubeVideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [normalizedUrl, setNormalizedUrl] = useState<NormalizedURL | null>(null);
  const [urlValidationError, setUrlValidationError] = useState<URLValidationError | null>(null);
  const [isUrlValid, setIsUrlValid] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(
      isUrlValid 
        ? createDynamicVideoRegistrationSchema(isUrlValid, urlValidationError?.message)
        : relaxedVideoRegistrationSchema
    ) as any,
    defaultValues: {
      youtubeUrl: '',
      metadata: {},
      tags: [],
    },
  });

  const watchedUrl = watch('youtubeUrl');
  const watchedTags = watch('tags') || [];

  // URL検証成功時のハンドラー
  const handleValidURL = useCallback((url: NormalizedURL) => {
    setNormalizedUrl(url);
    setUrlValidationError(null);
    setIsUrlValid(true);
  }, []);

  // URL検証失敗時のハンドラー
  const handleInvalidURL = useCallback((error: URLValidationError) => {
    setUrlValidationError(error);
    setNormalizedUrl(null);
    setIsUrlValid(false);
  }, []);

  // URL検証状態変更時のハンドラー
  const handleValidationChange = useCallback((isValid: boolean) => {
    setIsUrlValid(isValid);
    if (!isValid) {
      setNormalizedUrl(null);
      setYoutubeInfo(null);
    }
  }, []);

  const handleUrlCheck = async () => {
    if (!watchedUrl || !isUrlValid || !normalizedUrl) {
      setError('有効なYouTube URLを入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 正規化されたURLを使用してビデオ情報を取得
      const info = await videoService.getYouTubeInfo(normalizedUrl.canonical);
      setYoutubeInfo(info);
      setStep('preview');
    } catch (err: any) {
      // より詳細なエラーハンドリング
      const errorMessage = err.response?.data?.message || err.message;
      
      if (errorMessage.includes('private') || errorMessage.includes('非公開')) {
        setError('この動画は非公開のため登録できません。公開されている動画のURLを使用してください。');
      } else if (errorMessage.includes('not found') || errorMessage.includes('見つかりません')) {
        setError('指定された動画が見つかりません。URLが正しいか確認してください。');
      } else if (errorMessage.includes('quota') || errorMessage.includes('制限')) {
        setError('YouTube APIの利用制限に達しました。しばらく時間をおいてから再試行してください。');
      } else {
        setError(`動画情報の取得に失敗しました: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
      setValue('tags', [...watchedTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue(
      'tags',
      watchedTags.filter(tag => tag !== tagToRemove)
    );
  };

  const handleRegister = async (data: FormData) => {
    console.log('handleRegister called with data:', data);
    setLoading(true);
    setError(null);

    try {
      // 正規化されたURLを使用して登録
      const urlToUse = normalizedUrl?.canonical || data.youtubeUrl;
      
      const createData: CreateVideoRequest = {
        youtubeUrl: urlToUse,
        metadata: {
          ...data.metadata,
          year: data.metadata?.year || undefined
        },
        tags: data.tags || [],
      };

      console.log('Sending create request:', createData);
      await videoService.createVideo(createData);
      console.log('Video created successfully');
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Video registration error:', err);
      
      // より詳細なエラーハンドリング
      const errorMessage = err.response?.data?.message || err.message;
      
      if (errorMessage.includes('duplicate') || errorMessage.includes('既に登録')) {
        setError('この動画は既に登録されています。別の動画を選択してください。');
      } else if (errorMessage.includes('private') || errorMessage.includes('非公開')) {
        setError('この動画は非公開のため登録できません。');
      } else if (errorMessage.includes('validation') || errorMessage.includes('バリデーション')) {
        setError('入力内容に問題があります。各項目を確認してください。');
      } else {
        setError(`動画の登録に失敗しました: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('url');
    setYoutubeInfo(null);
    setError(null);
    setTagInput('');
    setNormalizedUrl(null);
    setUrlValidationError(null);
    setIsUrlValid(false);
    reset();
    onClose();
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='md' fullWidth>
      <DialogTitle>
        動画登録
        {step === 'preview' && ' - プレビュー'}
        {step === 'details' && ' - 詳細情報'}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert 
            severity='error' 
            sx={{ mb: 2 }}
            action={
              step === 'url' && (
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => setError(null)}
                >
                  閉じる
                </Button>
              )
            }
          >
            <Typography variant="body2">
              {error}
            </Typography>
            {step === 'url' && urlValidationError && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                💡 ヒント: {urlValidationError.suggestion || 'YouTube URLの形式を確認してください'}
              </Typography>
            )}
          </Alert>
        )}

        {/* URL検証エラーの詳細表示 */}
        {step === 'url' && urlValidationError && !error && (
          <Alert severity='warning' sx={{ mb: 2 }}>
            <Typography variant="body2">
              {urlValidationError.message}
            </Typography>
            {urlValidationError.suggestion && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                💡 {urlValidationError.suggestion}
              </Typography>
            )}
            {urlValidationError.example && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                例: {urlValidationError.example}
              </Typography>
            )}
          </Alert>
        )}

        {step === 'url' && (
          <Box>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              登録したいYouTube動画のURLを入力してください。様々な形式のYouTube URLに対応しています。
            </Typography>

            <Controller
              name='youtubeUrl'
              control={control}
              render={({ field }) => (
                <EnhancedURLInput
                  value={field.value}
                  onChange={field.onChange}
                  onValidURL={handleValidURL}
                  onInvalidURL={handleInvalidURL}
                  onValidationChange={handleValidationChange}
                  label='YouTube URL'
                  placeholder='https://www.youtube.com/watch?v=... または https://youtu.be/...'
                  error={!!errors.youtubeUrl}
                  helperText={errors.youtubeUrl?.message}
                  required
                  showMetadata={true}
                  showSuggestions={true}
                  showExamples={true}
                  allowPaste={true}
                  allowClear={true}
                  sx={{ mb: 2 }}
                />
              )}
            />

            {/* 追加のヒント表示 */}
            {!isUrlValid && !loading && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  💡 対応しているURL形式:
                </Typography>
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                  <li>標準URL: https://www.youtube.com/watch?v=VIDEO_ID</li>
                  <li>短縮URL: https://youtu.be/VIDEO_ID</li>
                  <li>埋め込みURL: https://www.youtube.com/embed/VIDEO_ID</li>
                  <li>モバイルURL: https://m.youtube.com/watch?v=VIDEO_ID</li>
                  <li>追加パラメータ付きURL（プレイリスト、タイムスタンプなど）</li>
                </Box>
              </Alert>
            )}
          </Box>
        )}

        {step === 'preview' && youtubeInfo && (
          <Box>
            <Card sx={{ mb: 3 }}>
              <CardMedia
                component='img'
                height='200'
                image={
                  youtubeInfo.thumbnails.medium?.url ||
                  youtubeInfo.thumbnails.default.url
                }
                alt={youtubeInfo.title}
              />
              <CardContent>
                <Typography variant='h6' gutterBottom>
                  {youtubeInfo.title}
                </Typography>
                <Typography variant='body2' color='text.secondary' gutterBottom>
                  チャンネル: {youtubeInfo.channelTitle}
                </Typography>
                <Typography variant='body2' color='text.secondary' gutterBottom>
                  公開日:{' '}
                  {new Date(youtubeInfo.publishedAt).toLocaleDateString(
                    'ja-JP'
                  )}
                </Typography>
                <Typography variant='body2' color='text.secondary' gutterBottom>
                  再生回数: {parseInt(youtubeInfo.viewCount).toLocaleString()}回
                </Typography>
                
                {/* 正規化されたURL情報の表示 */}
                {normalizedUrl && (
                  <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant='caption' color='text.secondary' display='block'>
                      動画ID: {normalizedUrl.videoId}
                    </Typography>
                    {normalizedUrl.metadata?.timestamp && (
                      <Typography variant='caption' color='text.secondary' display='block'>
                        開始時間: {Math.floor(normalizedUrl.metadata.timestamp / 60)}:{(normalizedUrl.metadata.timestamp % 60).toString().padStart(2, '0')}
                      </Typography>
                    )}
                    {normalizedUrl.metadata?.playlist && (
                      <Typography variant='caption' color='text.secondary' display='block'>
                        プレイリスト: {normalizedUrl.metadata.playlist}
                        {normalizedUrl.metadata.index && ` (${normalizedUrl.metadata.index}番目)`}
                      </Typography>
                    )}
                  </Box>
                )}

                {youtubeInfo.isEmbeddable === false && (
                  <Alert severity='warning' sx={{ mt: 2 }}>
                    この動画は埋め込み再生ができません
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* URL正規化の成功メッセージ */}
            {normalizedUrl && normalizedUrl.original !== normalizedUrl.canonical && (
              <Alert severity='success' sx={{ mb: 2 }}>
                <Typography variant='body2'>
                  ✓ URLが正規化されました
                </Typography>
                <Typography variant='caption' display='block' sx={{ mt: 0.5, wordBreak: 'break-all' }}>
                  元のURL: {normalizedUrl.original}
                </Typography>
                <Typography variant='caption' display='block' sx={{ wordBreak: 'break-all' }}>
                  正規化後: {normalizedUrl.canonical}
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {step === 'details' && (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name='metadata.teamName'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='チーム名'
                      error={!!errors.metadata?.teamName}
                      helperText={errors.metadata?.teamName?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='metadata.performanceName'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='演舞名'
                      error={!!errors.metadata?.performanceName}
                      helperText={errors.metadata?.performanceName?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='metadata.eventName'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='大会名'
                      error={!!errors.metadata?.eventName}
                      helperText={errors.metadata?.eventName?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name='metadata.year'
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>年度</InputLabel>
                      <Select {...field} value={field.value || ''} label='年度'>
                        <MenuItem value=''>
                          <em>選択してください</em>
                        </MenuItem>
                        {yearOptions.map(year => (
                          <MenuItem key={year} value={year}>
                            {year}年
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name='metadata.location'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label='場所'
                      error={!!errors.metadata?.location}
                      helperText={errors.metadata?.location?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant='subtitle2' gutterBottom>
                    タグ
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      size='small'
                      label='タグを追加'
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button onClick={handleAddTag} variant='outlined'>
                      追加
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {watchedTags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        onDelete={() => handleRemoveTag(tag)}
                        size='small'
                      />
                    ))}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          キャンセル
        </Button>

        {step === 'url' && (
          <Button
            onClick={handleUrlCheck}
            variant='contained'
            disabled={!watchedUrl || !isUrlValid || loading}
          >
            {loading ? <CircularProgress size={20} /> : '動画を確認'}
          </Button>
        )}

        {step === 'preview' && (
          <>
            <Button onClick={() => setStep('url')}>戻る</Button>
            <Button onClick={() => setStep('details')} variant='contained'>
              詳細情報を入力
            </Button>
          </>
        )}

        {step === 'details' && (
          <>
            <Button onClick={() => setStep('preview')}>戻る</Button>
            <Button
              onClick={(e) => {
                console.log('Register button clicked');
                console.log('Form errors:', errors);
                console.log('Form values:', watch());
                handleSubmit(
                  (data) => {
                    console.log('Form validation passed, calling handleRegister');
                    handleRegister(data);
                  },
                  (errors) => {
                    console.log('Form validation failed:', errors);
                  }
                )(e);
              }}
              variant='contained'
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : '登録'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default VideoRegistrationForm;
