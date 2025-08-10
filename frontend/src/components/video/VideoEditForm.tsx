import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
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
  Video,
  UpdateVideoRequest,
} from '../../services/videoService';

interface VideoEditFormProps {
  open: boolean;
  video: Video | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  metadata: {
    teamName?: string;
    performanceName?: string;
    eventName?: string;
    year?: number | null;
    location?: string;
  };
  tags: string[];
}

const validationSchema = yup.object({
  metadata: yup.object({
    teamName: yup
      .string()
      .nullable()
      .transform(value => (value === '' ? null : value))
      .max(100, 'チーム名は100文字以内で入力してください'),
    performanceName: yup
      .string()
      .nullable()
      .transform(value => (value === '' ? null : value))
      .max(100, '演舞名は100文字以内で入力してください'),
    eventName: yup
      .string()
      .nullable()
      .transform(value => (value === '' ? null : value))
      .max(100, '大会名は100文字以内で入力してください'),
    year: yup
      .number()
      .nullable()
      .transform(value => (value === '' ? null : value))
      .min(1900, '1900年以降の年度を入力してください')
      .max(new Date().getFullYear() + 10, '未来すぎる年度です'),
    location: yup
      .string()
      .nullable()
      .transform(value => (value === '' ? null : value))
      .max(100, '場所は100文字以内で入力してください'),
  }),
  tags: yup.array().of(yup.string()).max(20, 'タグは20個まで設定できます'),
});

const VideoEditForm: React.FC<VideoEditFormProps> = ({
  open,
  video,
  onClose,
  onSuccess,
}) => {
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
    resolver: yupResolver(validationSchema),
    defaultValues: {
      metadata: {},
      tags: [],
    },
  });

  const watchedTags = watch('tags') || [];

  // 動画データが変更されたときにフォームを初期化
  useEffect(() => {
    if (video && open) {
      reset({
        metadata: {
          teamName: video.metadata?.teamName || '',
          performanceName: video.metadata?.performanceName || '',
          eventName: video.metadata?.eventName || '',
          year: video.metadata?.year || null,
          location: video.metadata?.location || '',
        },
        tags: video.tags || [],
      });
      setError(null);
      console.log('Form initialized with video data:', {
        videoId: video.id || (video as any)._id,
        metadata: video.metadata,
        tags: video.tags,
        fullVideo: video,
      });
    }
  }, [video, open, reset]);

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

  const handleUpdate = async (data: FormData) => {
    if (!video) return;

    const videoId = video.id || (video as any)._id;
    if (!videoId) {
      setError('動画IDが見つかりません。ページを再読み込みしてください。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 空の文字列をundefinedに変換してAPIに送信
      const cleanMetadata = {
        teamName: data.metadata.teamName?.trim() || undefined,
        performanceName: data.metadata.performanceName?.trim() || undefined,
        eventName: data.metadata.eventName?.trim() || undefined,
        year: data.metadata.year || undefined,
        location: data.metadata.location?.trim() || undefined,
      };

      const updateData: UpdateVideoRequest = {
        metadata: cleanMetadata,
        tags: data.tags || [],
      };

      console.log('Sending update request for video:', videoId);
      console.log('Video ID type:', typeof videoId);
      console.log('Video ID length:', videoId?.length);
      console.log('Video object:', JSON.stringify(video, null, 2));
      console.log('Update data:', JSON.stringify(updateData, null, 2));

      await videoService.updateVideo(videoId, updateData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      const errorDetails = err.response?.data?.errors || [];

      // より詳細なエラー情報を表示
      let detailedError = errorMessage;
      if (errorDetails.length > 0) {
        const fieldErrors = errorDetails
          .map(
            (error: any) =>
              `${error.path || error.field || 'フィールド'}: ${
                error.msg || error.message
              }`
          )
          .join(', ');
        detailedError = `${errorMessage} (詳細: ${fieldErrors})`;
      }

      if (
        errorMessage.includes('validation') ||
        errorMessage.includes('バリデーション')
      ) {
        setError(`入力内容に問題があります: ${detailedError}`);
      } else if (
        errorMessage.includes('not found') ||
        errorMessage.includes('見つかりません')
      ) {
        setError('動画が見つかりません。削除された可能性があります。');
      } else if (
        errorMessage.includes('権限') ||
        errorMessage.includes('FORBIDDEN')
      ) {
        setError('この動画を編集する権限がありません。');
      } else {
        setError(`動画の更新に失敗しました: ${detailedError}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setTagInput('');
    reset();
    onClose();
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => currentYear - i);

  if (!video) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='md' fullWidth>
      <DialogTitle>動画編集 - {video.title}</DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant='body2' color='text.secondary'>
            YouTube URL: {`https://www.youtube.com/watch?v=${video.youtubeId}`}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            チャンネル: {video.channelName}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            アップロード日:{' '}
            {new Date(video.uploadDate).toLocaleDateString('ja-JP')}
          </Typography>
        </Box>

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
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit(handleUpdate)}
          variant='contained'
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : '更新'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VideoEditForm;
