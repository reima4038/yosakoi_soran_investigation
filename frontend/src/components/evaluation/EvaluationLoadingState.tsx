import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Skeleton,
  LinearProgress,
  Typography,
  Chip,
  Fade,
  Alert,
} from '@mui/material';

export interface EvaluationLoadingStateProps {
  message?: string;
  submessage?: string;
  retryCount?: number;
  showProgress?: boolean;
  progress?: number;
  loadingStage?: 'initial' | 'fetching' | 'processing' | 'finalizing';
  estimatedTime?: number;
}

const EvaluationLoadingState: React.FC<EvaluationLoadingStateProps> = ({
  message = '評価画面を読み込み中...',
  submessage = 'セッション情報とテンプレートを取得しています',
  retryCount = 0,
  showProgress = false,
  progress,
  loadingStage = 'initial',
  estimatedTime = 5000,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSlowLoadingWarning, setShowSlowLoadingWarning] = useState(false);
  const [progressValue, setProgressValue] = useState(progress || 0);

  // 経過時間の追跡
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);
      
      // 遅いローディングの警告表示（20秒後に表示）
      if (elapsed > Math.max(estimatedTime * 2, 20000) && !showSlowLoadingWarning) {
        setShowSlowLoadingWarning(true);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [estimatedTime, showSlowLoadingWarning]);

  // プログレス値の自動更新（実際のプログレスがない場合）
  useEffect(() => {
    if (progress === undefined) {
      const timer = setInterval(() => {
        setProgressValue(prev => {
          const target = getStageProgress(loadingStage);
          const increment = (target - prev) * 0.1;
          return Math.min(prev + increment, target);
        });
      }, 100);

      return () => clearInterval(timer);
    } else {
      setProgressValue(progress);
    }
  }, [progress, loadingStage]);

  const getStageProgress = (stage: string): number => {
    switch (stage) {
      case 'initial': return 10;
      case 'fetching': return 40;
      case 'processing': return 70;
      case 'finalizing': return 90;
      default: return 0;
    }
  };

  const getStageMessage = (stage: string): string => {
    switch (stage) {
      case 'initial': return 'セッション情報を確認中...';
      case 'fetching': return 'データを取得中...';
      case 'processing': return 'テンプレートを処理中...';
      case 'finalizing': return '画面を準備中...';
      default: return submessage;
    }
  };

  const formatElapsedTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}秒`;
  };
  return (
    <Box sx={{ p: 3 }}>
      {/* 遅いローディング警告 */}
      <Fade in={showSlowLoadingWarning}>
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          variant="outlined"
        >
          読み込みに時間がかかっています。ネットワーク接続をご確認ください。
        </Alert>
      </Fade>

      {/* プログレスバー */}
      <LinearProgress 
        variant="determinate"
        value={progressValue}
        sx={{ 
          mb: 2,
          height: 8,
          borderRadius: 4,
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            transition: 'transform 0.3s ease-in-out',
          }
        }}
      />
      
      {/* ローディングメッセージ */}
      <Typography variant="body2" sx={{ textAlign: 'center', mb: 1, fontWeight: 500 }}>
        {retryCount > 0 ? `再試行中... (${retryCount}回目)` : message}
      </Typography>
      
      <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', color: 'text.secondary', mb: 1 }}>
        {retryCount > 0 
          ? `しばらくお待ちください...`
          : getStageMessage(loadingStage)
        }
      </Typography>

      {/* 進捗情報 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Chip
          label={`${Math.round(progressValue)}%`}
          color="primary"
          size="small"
          variant="outlined"
        />
        <Chip
          label={`経過時間: ${formatElapsedTime(elapsedTime)}`}
          color="default"
          size="small"
          variant="outlined"
        />
        {retryCount > 0 && (
          <Chip
            label={retryCount < 3 ? `自動再試行: ${3 - retryCount}回残り` : '手動で再試行してください'}
            color={retryCount < 3 ? 'info' : 'warning'}
            size="small"
          />
        )}
      </Box>

      {/* スケルトンUI */}
      <Grid container spacing={3}>
        {/* 動画プレーヤー部分のスケルトン */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Skeleton variant="text" height={32} width="60%" sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={400} sx={{ mb: 2, borderRadius: 1 }} />
              
              {/* 動画コントロールのスケルトン */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="text" width={100} height={20} />
                <Skeleton variant="rectangular" width="100%" height={8} sx={{ mx: 2 }} />
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton variant="rectangular" width={100} height={8} />
              </Box>
              
              <Skeleton variant="rectangular" width={150} height={36} />
            </CardContent>
          </Card>
        </Grid>

        {/* 評価フォーム部分のスケルトン */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Skeleton variant="text" height={32} width="50%" sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={8} sx={{ mb: 3 }} />

              {/* 評価カテゴリのスケルトン */}
              {[1, 2].map((index) => (
                <Box key={index} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Skeleton variant="text" width="70%" height={24} />
                    <Skeleton variant="rectangular" width={50} height={20} />
                  </Box>
                  <Skeleton variant="text" width="90%" height={16} sx={{ mb: 2 }} />
                  
                  {/* 評価項目のスケルトン */}
                  {[1, 2].map((itemIndex) => (
                    <Box key={itemIndex} sx={{ mb: 2, pl: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Skeleton variant="text" width="80%" height={20} />
                        <Skeleton variant="rectangular" width={40} height={16} />
                      </Box>
                      <Skeleton variant="text" width="95%" height={14} sx={{ mb: 1 }} />
                      <Skeleton variant="rectangular" width="100%" height={32} sx={{ mb: 1 }} />
                      <Skeleton variant="rectangular" width="100%" height={60} />
                    </Box>
                  ))}
                </Box>
              ))}

              {/* 総合コメントのスケルトン */}
              <Box sx={{ mt: 3 }}>
                <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={100} sx={{ mb: 2 }} />
              </Box>

              {/* ボタンのスケルトン */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="rectangular" width={80} height={36} />
                <Skeleton variant="rectangular" width="100%" height={36} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EvaluationLoadingState;