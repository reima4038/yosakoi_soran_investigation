import React, { useState } from 'react';
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
import * as yup from 'yup';
import {
  videoService,
  YouTubeVideoInfo,
  CreateVideoRequest,
} from '../../services/videoService';

const schema = yup.object().shape({
  youtubeUrl: yup
    .string()
    .required('YouTube URLは必須です')
    .matches(
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}$/,
      '有効なYouTube URLを入力してください'
    ),
  metadata: yup
    .object()
    .shape({
      teamName: yup
        .string()
        .max(100, 'チーム名は100文字以下で入力してください')
        .optional(),
      performanceName: yup
        .string()
        .max(100, '演舞名は100文字以下で入力してください')
        .optional(),
      eventName: yup
        .string()
        .max(100, '大会名は100文字以下で入力してください')
        .optional(),
      year: yup
        .number()
        .nullable()
        .min(1900, '年度は1900年以降で入力してください')
        .max(new Date().getFullYear() + 1, '年度は来年以前で入力してください')
        .optional(),
      location: yup
        .string()
        .max(100, '場所は100文字以下で入力してください')
        .optional(),
    })
    .optional(),
  tags: yup
    .array()
    .of(yup.string().max(30, 'タグは30文字以下で入力してください'))
    .optional(),
});

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

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      youtubeUrl: '',
      metadata: {},
      tags: [],
    },
  });

  const watchedUrl = watch('youtubeUrl');
  const watchedTags = watch('tags') || [];

  const handleUrlCheck = async () => {
    if (!watchedUrl) return;

    setLoading(true);
    setError(null);

    try {
      const info = await videoService.getYouTubeInfo(watchedUrl);
      setYoutubeInfo(info);
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.message || '動画情報の取得に失敗しました');
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
      const createData: CreateVideoRequest = {
        youtubeUrl: data.youtubeUrl,
        metadata: data.metadata || {},
        tags: data.tags || [],
      };

      console.log('Sending create request:', createData);
      await videoService.createVideo(createData);
      console.log('Video created successfully');
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Video registration error:', err);
      setError(err.response?.data?.message || '動画の登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('url');
    setYoutubeInfo(null);
    setError(null);
    setTagInput('');
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
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 'url' && (
          <Box>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              登録したいYouTube動画のURLを入力してください
            </Typography>

            <Controller
              name='youtubeUrl'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='YouTube URL'
                  placeholder='https://www.youtube.com/watch?v=...'
                  error={!!errors.youtubeUrl}
                  helperText={errors.youtubeUrl?.message}
                  sx={{ mb: 2 }}
                />
              )}
            />
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
                <Typography variant='body2' color='text.secondary'>
                  再生回数: {parseInt(youtubeInfo.viewCount).toLocaleString()}回
                </Typography>
                {youtubeInfo.isEmbeddable === false && (
                  <Alert severity='warning' sx={{ mt: 2 }}>
                    この動画は埋め込み再生ができません
                  </Alert>
                )}
              </CardContent>
            </Card>
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
            disabled={!watchedUrl || loading}
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
