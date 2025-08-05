/**
 * 改善されたビデオ登録フォーム
 * EnhancedURLInputコンポーネントを使用してユーザー体験を向上
 */

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
  Stepper,
  Step,
  StepLabel,
  Fade,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  VideoLibrary as VideoLibraryIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import EnhancedURLInput from '../common/EnhancedURLInput';
import { NormalizedURL } from '../../utils/urlNormalizer';
import {
  videoService,
  YouTubeVideoInfo,
  CreateVideoRequest,
} from '../../services/videoService';
import { 
  createDynamicVideoRegistrationSchema,
  relaxedVideoRegistrationSchema 
} from '../../utils/validationSchemas';

interface EnhancedVideoRegistrationFormProps {
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

const steps = ['URL入力', 'プレビュー', '詳細情報'];

const EnhancedVideoRegistrationForm: React.FC<EnhancedVideoRegistrationFormProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [youtubeInfo, setYoutubeInfo] = useState<YouTubeVideoInfo | null>(null);
  const [normalizedUrl, setNormalizedUrl] = useState<NormalizedURL | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [urlValid, setUrlValid] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(
      urlValid 
        ? createDynamicVideoRegistrationSchema(urlValid)
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

  // URL検証成功時のコールバック
  const handleValidURL = useCallback(async (normalizedUrl: NormalizedURL) => {
    setNormalizedUrl(normalizedUrl);
    setError(null);
    
    // 自動的に動画情報を取得
    if (normalizedUrl.videoId) {
      setLoading(true);
      try {
        const info = await videoService.getYouTubeInfo(normalizedUrl.canonical);
        setYoutubeInfo(info);
      } catch (err: any) {
        setError(err.response?.data?.message || '動画情報の取得に失敗しました');
        setYoutubeInfo(null);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  // URL検証失敗時のコールバック
  const handleInvalidURL = useCallback(() => {
    setNormalizedUrl(null);
    setYoutubeInfo(null);
    setError(null);
  }, []);

  // URL検証状態変更時のコールバック
  const handleValidationChange = useCallback((isValid: boolean) => {
    setUrlValid(isValid);
  }, []);

  // 次のステップに進む
  const handleNext = () => {
    if (activeStep === 0 && urlValid && youtubeInfo) {
      setActiveStep(1);
    } else if (activeStep === 1) {
      setActiveStep(2);
    }
  };

  // 前のステップに戻る
  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  // タグ追加
  const handleAddTag = () => {
    if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
      setValue('tags', [...watchedTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // タグ削除
  const handleRemoveTag = (tagToRemove: string) => {
    setValue(
      'tags',
      watchedTags.filter(tag => tag !== tagToRemove)
    );
  };

  // 動画登録
  const handleRegister = async (data: FormData) => {
    setLoading(true);
    setError(null);

    try {
      const createData: CreateVideoRequest = {
        youtubeUrl: normalizedUrl?.canonical || data.youtubeUrl,
        metadata: data.metadata || {},
        tags: data.tags || [],
      };

      await videoService.createVideo(createData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || '動画の登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // フォームクローズ
  const handleClose = () => {
    setActiveStep(0);
    setYoutubeInfo(null);
    setNormalizedUrl(null);
    setError(null);
    setTagInput('');
    setUrlValid(false);
    reset();
    onClose();
  };

  // 年度選択肢
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => currentYear - i);

  // ステップ1: URL入力
  const renderUrlStep = () => (
    <Box>
      <Typography variant="body1" gutterBottom>
        登録したいYouTube動画のURLを入力してください
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        様々なYouTube URL形式に対応しています（短縮URL、埋め込みURL、タイムスタンプ付きURLなど）
      </Typography>

      <Controller
        name="youtubeUrl"
        control={control}
        render={({ field }) => (
          <EnhancedURLInput
            value={field.value}
            onChange={field.onChange}
            onValidURL={handleValidURL}
            onInvalidURL={handleInvalidURL}
            onValidationChange={handleValidationChange}
            error={!!errors.youtubeUrl}
            helperText={errors.youtubeUrl?.message}
            showMetadata={true}
            showSuggestions={true}
            showExamples={true}
            allowPaste={true}
            allowClear={true}
            sx={{ mb: 2 }}
          />
        )}
      />

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            動画情報を取得中...
          </Typography>
        </Box>
      )}

      {normalizedUrl && (
        <Fade in={true}>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>正規化されたURL:</strong>
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              {normalizedUrl.canonical}
            </Typography>
            {normalizedUrl.metadata && (
              <Box sx={{ mt: 1 }}>
                {normalizedUrl.metadata.timestamp && (
                  <Chip
                    size="small"
                    label={`開始時間: ${Math.floor(normalizedUrl.metadata.timestamp / 60)}:${(normalizedUrl.metadata.timestamp % 60).toString().padStart(2, '0')}`}
                    sx={{ mr: 1 }}
                  />
                )}
                {normalizedUrl.metadata.playlist && (
                  <Chip
                    size="small"
                    label={`プレイリスト${normalizedUrl.metadata.index ? ` (${normalizedUrl.metadata.index})` : ''}`}
                    sx={{ mr: 1 }}
                  />
                )}
              </Box>
            )}
          </Alert>
        </Fade>
      )}
    </Box>
  );

  // ステップ2: プレビュー
  const renderPreviewStep = () => (
    <Box>
      {youtubeInfo && (
        <Card>
          <CardMedia
            component="img"
            height="240"
            image={
              youtubeInfo.thumbnails.high?.url ||
              youtubeInfo.thumbnails.medium?.url ||
              youtubeInfo.thumbnails.default.url
            }
            alt={youtubeInfo.title}
          />
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {youtubeInfo.title}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>チャンネル:</strong> {youtubeInfo.channelTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>公開日:</strong> {new Date(youtubeInfo.publishedAt).toLocaleDateString('ja-JP')}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>再生回数:</strong> {parseInt(youtubeInfo.viewCount).toLocaleString()}回
              </Typography>
              {youtubeInfo.likeCount && (
                <Typography variant="body2" color="text.secondary">
                  <strong>いいね:</strong> {parseInt(youtubeInfo.likeCount).toLocaleString()}
                </Typography>
              )}
            </Box>

            {youtubeInfo.tags && youtubeInfo.tags.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>タグ:</strong>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {youtubeInfo.tags.slice(0, 10).map((tag, index) => (
                    <Chip key={index} label={tag} size="small" variant="outlined" />
                  ))}
                  {youtubeInfo.tags.length > 10 && (
                    <Chip label={`+${youtubeInfo.tags.length - 10}個`} size="small" variant="outlined" />
                  )}
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="success" />
              <Typography variant="body2" color="success.main">
                動画情報の取得が完了しました
              </Typography>
            </Box>

            {youtubeInfo.isEmbeddable === false && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  この動画は埋め込み再生ができません。プレーヤーでの再生に制限がある場合があります。
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );

  // ステップ3: 詳細情報
  const renderDetailsStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InfoIcon />
        詳細情報の入力
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        動画に関する追加情報を入力してください（任意）
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Controller
            name="metadata.teamName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="チーム名"
                error={!!errors.metadata?.teamName}
                helperText={errors.metadata?.teamName?.message}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Controller
            name="metadata.performanceName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="演舞名"
                error={!!errors.metadata?.performanceName}
                helperText={errors.metadata?.performanceName?.message}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Controller
            name="metadata.eventName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="大会名"
                error={!!errors.metadata?.eventName}
                helperText={errors.metadata?.eventName?.message}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Controller
            name="metadata.year"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>年度</InputLabel>
                <Select {...field} value={field.value || ''} label="年度">
                  <MenuItem value="">
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
            name="metadata.location"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="場所"
                error={!!errors.metadata?.location}
                helperText={errors.metadata?.location?.message}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              タグ
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                label="タグを追加"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                sx={{ flexGrow: 1 }}
              />
              <Button onClick={handleAddTag} variant="outlined">
                追加
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {watchedTags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VideoLibraryIcon />
          動画登録
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && renderUrlStep()}
        {activeStep === 1 && renderPreviewStep()}
        {activeStep === 2 && renderDetailsStep()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          キャンセル
        </Button>

        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            戻る
          </Button>
        )}

        {activeStep === 0 && (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={!urlValid || !youtubeInfo || loading}
          >
            次へ
          </Button>
        )}

        {activeStep === 1 && (
          <Button onClick={handleNext} variant="contained">
            詳細情報を入力
          </Button>
        )}

        {activeStep === 2 && (
          <Button
            onClick={handleSubmit(handleRegister)}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : '登録'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedVideoRegistrationForm;