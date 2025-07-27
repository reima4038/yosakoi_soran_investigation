import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  VideoLibrary as VideoIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import EvaluationForm from './EvaluationForm';
import TimelineComments from './TimelineComments';
import YouTubePlayerComponent, {
  YouTubePlayerRef,
} from '../video/YouTubePlayer';
import {
  EvaluationData,
  Comment,
  evaluationService,
} from '../../services/evaluationService';
import { useResponsive } from '../../hooks/useResponsive';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && children}
  </div>
);

const EvaluationPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const theme = useTheme();
  const { isMobile, isTablet, isTouchDevice } = useResponsive();
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(
    null
  );
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const playerRef = useRef<YouTubePlayerRef>(null);

  // 評価データの読み込み
  useEffect(() => {
    if (!sessionId) return;

    const loadEvaluationData = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await evaluationService.getEvaluation(sessionId);
        setEvaluationData(data);
        setComments(data.evaluation.comments || []);
        setIsSubmitted(!!data.evaluation.submittedAt);
      } catch (err: any) {
        setError(
          err.response?.data?.message || '評価データの読み込みに失敗しました'
        );
      } finally {
        setLoading(false);
      }
    };

    loadEvaluationData();
  }, [sessionId]);

  // 動画の現在時刻を更新
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  // 指定時刻にシーク
  const handleSeekTo = (time: number) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(time);
    }
  };

  // コメント更新
  const handleCommentsUpdate = (updatedComments: Comment[]) => {
    setComments(updatedComments);
  };

  // 評価提出完了
  const handleEvaluationSubmitted = () => {
    setIsSubmitted(true);
    setActiveTab(0); // 評価タブに戻る
  };

  // タブ変更
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    // モバイルでタブ変更時にドロワーを閉じる
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  // モバイルドロワーの開閉
  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  if (loading) {
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

  if (error || !evaluationData) {
    return (
      <Alert severity='error'>
        {error || '評価データを読み込めませんでした'}
      </Alert>
    );
  }

  // モバイル用のタブコンテンツ
  const renderMobileTabContent = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{
            '& .MuiTab-root': {
              minHeight: isMobile ? 56 : 48,
              fontSize: isMobile ? '0.875rem' : '1rem',
            }
          }}
        >
          <Tab
            label={isMobile ? '評価' : '評価フォーム'}
            icon={<AssessmentIcon />}
            iconPosition={isMobile ? 'top' : 'start'}
          />
          <Tab
            label={isMobile ? `コメント (${comments.length})` : `コメント (${comments.length})`}
            icon={<ScheduleIcon />}
            iconPosition={isMobile ? 'top' : 'start'}
          />
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ p: isMobile ? 1 : 2, height: '100%' }}>
            <EvaluationForm
              sessionId={sessionId!}
              onEvaluationSubmitted={handleEvaluationSubmitted}
            />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: isMobile ? 1 : 2 }}>
            <Typography variant='h6' gutterBottom>
              タイムラインコメント
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 2 }}
            >
              動画の特定の時点に関するコメントです。タイムスタンプをクリックすると該当箇所にジャンプします。
            </Typography>

            {comments.length === 0 ? (
              <Alert severity='info'>
                まだコメントがありません。動画を見ながら気になった箇所にコメントを追加してください。
              </Alert>
            ) : (
              <Box>
                {comments
                  .sort((a, b) => a.timestamp - b.timestamp)
                  .map((comment, index) => (
                    <Card
                      key={comment.id || index}
                      variant='outlined'
                      sx={{ 
                        mb: 2,
                        '& .MuiCardContent-root': {
                          p: isMobile ? 1.5 : 2,
                        }
                      }}
                    >
                      <CardContent>
                        <Box
                          display='flex'
                          alignItems='center'
                          gap={1}
                          mb={1}
                          flexWrap={isMobile ? 'wrap' : 'nowrap'}
                        >
                          <Typography
                            variant='body2'
                            color='primary'
                            sx={{ 
                              cursor: 'pointer', 
                              fontWeight: 'bold',
                              minHeight: isTouchDevice ? 44 : 'auto',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            onClick={() => handleSeekTo(comment.timestamp)}
                          >
                            {Math.floor(comment.timestamp / 60)}:
                            {(comment.timestamp % 60)
                              .toFixed(0)
                              .padStart(2, '0')}
                          </Typography>
                          {comment.createdAt && (
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {new Date(comment.createdAt).toLocaleString('ja-JP')}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant='body2'>
                          {comment.text}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
              </Box>
            )}
          </Box>
        </TabPanel>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* モバイル用ヘッダー */}
        <AppBar position='static' elevation={1}>
          <Toolbar>
            <IconButton
              color='inherit'
              aria-label='メニューを開く'
              edge='start'
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant='h6' noWrap component='div' sx={{ flexGrow: 1 }}>
              {evaluationData?.session.name || '評価セッション'}
            </Typography>
          </Toolbar>
        </AppBar>

        {/* 動画プレーヤー */}
        <Box sx={{ position: 'relative', backgroundColor: 'black' }}>
          <YouTubePlayerComponent
            ref={playerRef}
            videoId={evaluationData?.session.video.youtubeId || ''}
            onTimeUpdate={handleTimeUpdate}
            height={isMobile ? 200 : 300}
          />
        </Box>

        {/* タイムラインコメント（モバイル用コンパクト表示） */}
        <Box sx={{ px: 1, py: 0.5, backgroundColor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <TimelineComments
            sessionId={sessionId!}
            comments={comments}
            currentTime={currentTime}
            onSeekTo={handleSeekTo}
            onCommentsUpdate={handleCommentsUpdate}
            readonly={isSubmitted}
            compact={true}
          />
        </Box>

        {/* 評価フォーム/コメント */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {renderMobileTabContent()}
        </Box>

        {/* モバイル用ドロワー */}
        <Drawer
          variant='temporary'
          anchor='left'
          open={mobileDrawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 280,
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant='h6'>セッション情報</Typography>
              <IconButton onClick={handleDrawerToggle}>
                <CloseIcon />
              </IconButton>
            </Box>
            
            <Typography variant='subtitle1' gutterBottom>
              {evaluationData?.session.name}
            </Typography>
            <Typography variant='body2' color='text.secondary' gutterBottom>
              動画: {evaluationData?.session.video.title}
            </Typography>
            
            {isSubmitted && (
              <Alert severity='success' sx={{ mt: 2 }}>
                評価は提出済みです。
              </Alert>
            )}
            
            {evaluationData?.session.description && (
              <Box sx={{ mt: 2 }}>
                <Typography variant='body2' color='text.secondary'>
                  {evaluationData.session.description}
                </Typography>
              </Box>
            )}
          </Box>
        </Drawer>
      </Box>
    );
  }

  // デスクトップ/タブレット用レイアウト
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Paper sx={{ p: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 2 } }}>
        <Typography variant='h4' gutterBottom>
          {evaluationData.session.name}
        </Typography>
        <Typography variant='subtitle1' color='text.secondary'>
          動画: {evaluationData.session.video.title}
        </Typography>
        {isSubmitted && (
          <Alert severity='success' sx={{ mt: 1 }}>
            評価は提出済みです。結果を確認できます。
          </Alert>
        )}
      </Paper>

      <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ flex: 1, overflow: 'hidden' }}>
        {/* 左側: 動画プレーヤー */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{ display: 'flex', flexDirection: 'column' }}
        >
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <CardContent
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                p: { xs: 1, sm: 2 }
              }}
            >
              <Typography
                variant='h6'
                display='flex'
                alignItems='center'
                gap={1}
                mb={2}
              >
                <VideoIcon />
                動画再生
              </Typography>

              <Box sx={{ flex: 1, minHeight: { xs: 200, sm: 300 } }}>
                <YouTubePlayerComponent
                  ref={playerRef}
                  videoId={evaluationData.session.video.youtubeId}
                  onTimeUpdate={handleTimeUpdate}
                  height='100%'
                />
              </Box>
            </CardContent>
          </Card>

          {/* タイムラインコメント */}
          <Box sx={{ mt: { xs: 1, sm: 2 } }}>
            <TimelineComments
              sessionId={sessionId!}
              comments={comments}
              currentTime={currentTime}
              onSeekTo={handleSeekTo}
              onCommentsUpdate={handleCommentsUpdate}
              readonly={isSubmitted}
            />
          </Box>
        </Grid>

        {/* 右側: 評価フォーム */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{ display: 'flex', flexDirection: 'column' }}
        >
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {renderMobileTabContent()}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EvaluationPage;
