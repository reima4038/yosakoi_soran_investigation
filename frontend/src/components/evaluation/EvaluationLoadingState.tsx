import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Skeleton,
  LinearProgress,
  Typography,
  Chip,
} from '@mui/material';

export interface EvaluationLoadingStateProps {
  message?: string;
  submessage?: string;
  retryCount?: number;
  showProgress?: boolean;
  progress?: number;
}

const EvaluationLoadingState: React.FC<EvaluationLoadingStateProps> = ({
  message = '評価画面を読み込み中...',
  submessage = 'セッション情報とテンプレートを取得しています',
  retryCount = 0,
  showProgress = false,
  progress,
}) => {
  return (
    <Box sx={{ p: 3 }}>
      {/* プログレスバー */}
      <LinearProgress 
        variant={progress !== undefined ? 'determinate' : 'indeterminate'}
        value={progress}
        sx={{ mb: 2 }}
      />
      
      {/* ローディングメッセージ */}
      <Typography variant="body2" sx={{ textAlign: 'center', mb: 1 }}>
        {retryCount > 0 ? `再試行中... (${retryCount}回目)` : message}
      </Typography>
      
      <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', color: 'text.secondary', mb: 3 }}>
        {retryCount > 0 
          ? `しばらくお待ちください...`
          : submessage
        }
      </Typography>

      {/* 再試行情報 */}
      {retryCount > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Chip
            label={retryCount < 3 ? `自動再試行: ${3 - retryCount}回残り` : '手動で再試行してください'}
            color={retryCount < 3 ? 'info' : 'warning'}
            size="small"
          />
        </Box>
      )}

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