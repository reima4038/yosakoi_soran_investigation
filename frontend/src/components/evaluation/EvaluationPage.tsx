import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Slider,
  TextField,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Fab,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Replay as ReplayIcon,
  VolumeUp as VolumeUpIcon,
  Fullscreen as FullscreenIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Comment as CommentIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { evaluationService } from '../../services/evaluationService';
import type { EvaluationData, EvaluationSession, EvaluationScore } from '../../services/evaluationService';

// ローカル型定義（evaluationServiceの型を拡張）
interface TimelineComment {
  id: string;
  timestamp: number;
  comment: string;
  criterionId?: string;
}

interface LocalEvaluationData {
  sessionId: string;
  scores: EvaluationScore[];
  timelineComments: TimelineComment[];
  overallComment: string;
  isSubmitted: boolean;
}

const EvaluationPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [session, setSession] = useState<EvaluationSession | null>(null);
  const [evaluationData, setEvaluationData] = useState<LocalEvaluationData>({
    sessionId: sessionId || '',
    scores: [],
    timelineComments: [],
    overallComment: '',
    isSubmitted: false,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentTimestamp, setCommentTimestamp] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // セッション情報の取得
  useEffect(() => {
    if (sessionId) {
      fetchSession(sessionId);
    }
  }, [sessionId]);

  // 自動保存
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (!evaluationData.isSubmitted) {
        handleAutoSave();
      }
    }, 30000); // 30秒ごと

    return () => clearInterval(autoSaveInterval);
  }, [evaluationData, handleAutoSave]);

  const fetchSession = async (id: string, isRetry: boolean = false) => {
    try {
      setIsLoading(true);
      setError('');
      
      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }

      // evaluationServiceを使用してデータを取得
      const data = await evaluationService.getEvaluation(id);
      
      setSession(data.session);

      // 評価データの初期化
      const initialScores: EvaluationScore[] = data.session.template.categories.flatMap(cat =>
        cat.criteria.map(crit => ({
          criterionId: crit.id,
          score: data.evaluation.scores.find(s => s.criterionId === crit.id)?.score || 0,
          comment: data.evaluation.scores.find(s => s.criterionId === crit.id)?.comment || '',
        }))
      );
      
      setEvaluationData(prev => ({
        ...prev,
        sessionId: data.evaluation.sessionId,
        scores: initialScores,
        isSubmitted: data.evaluation.isComplete && !!data.evaluation.submittedAt,
      }));

      // リトライカウントをリセット
      setRetryCount(0);
    } catch (error: any) {
      console.error('評価データ取得エラー:', error);
      
      // エラーの種類に応じて適切なメッセージを設定
      if (error.response?.status === 404) {
        setError('セッションが見つかりません。セッション一覧に戻って確認してください。');
      } else if (error.response?.status === 403) {
        setError('このセッションの評価権限がありません。管理者にお問い合わせください。');
      } else if (error.response?.status === 400) {
        const message = error.response?.data?.message || 'セッションが無効または非アクティブです';
        setError(message);
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        setError('ネットワーク接続に問題があります。インターネット接続を確認してください。');
      } else {
        setError('セッション情報の取得に失敗しました。しばらく時間をおいて再試行してください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // リトライ機能
  const handleRetry = () => {
    if (sessionId) {
      fetchSession(sessionId, true);
    }
  };

  // 動画制御
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const handleVolumeChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.volume = value;
      setVolume(value);
    }
  };

  // 評価スコアの更新
  const handleScoreChange = (criterionId: string, score: number) => {
    setEvaluationData(prev => ({
      ...prev,
      scores: prev.scores.map(s =>
        s.criterionId === criterionId ? { ...s, score } : s
      ),
    }));
  };

  // 評価コメントの更新
  const handleCommentChange = (criterionId: string, comment: string) => {
    setEvaluationData(prev => ({
      ...prev,
      scores: prev.scores.map(s =>
        s.criterionId === criterionId ? { ...s, comment } : s
      ),
    }));
  };

  // タイムラインコメントの追加
  const handleAddTimelineComment = () => {
    setCommentTimestamp(currentTime);
    setShowCommentDialog(true);
  };

  const handleSaveTimelineComment = () => {
    if (newComment.trim()) {
      const comment: TimelineComment = {
        id: `comment_${Date.now()}`,
        timestamp: commentTimestamp,
        comment: newComment.trim(),
      };
      setEvaluationData(prev => ({
        ...prev,
        timelineComments: [...prev.timelineComments, comment],
      }));
      setNewComment('');
      setShowCommentDialog(false);
    }
  };

  // 自動保存
  const handleAutoSave = async () => {
    try {
      setAutoSaveStatus('saving');
      
      if (sessionId) {
        // evaluationServiceを使用してスコアを保存
        await evaluationService.saveScores(sessionId, evaluationData.scores);
        setAutoSaveStatus('saved');
      }
    } catch (error) {
      console.error('自動保存エラー:', error);
      setAutoSaveStatus('error');
    }
  };

  // 評価提出
  const handleSubmit = async () => {
    try {
      if (sessionId) {
        // evaluationServiceを使用して評価を提出
        await evaluationService.submitEvaluation(sessionId);
        setEvaluationData(prev => ({ ...prev, isSubmitted: true }));
        setSubmitDialogOpen(false);
        navigate(`/sessions/${sessionId}/results`);
      }
    } catch (error: any) {
      console.error('評価提出エラー:', error);
      
      if (error.response?.status === 400) {
        const message = error.response?.data?.message || '評価の提出に失敗しました';
        setError(message);
      } else {
        setError('評価の提出に失敗しました。しばらく時間をおいて再試行してください。');
      }
    }
  };

  // 時間フォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 進捗計算
  const getProgress = () => {
    if (!session) return 0;
    const totalCriteria = session.template.categories.flatMap(cat => cat.criteria).length;
    const completedCriteria = evaluationData.scores.filter(s => s.score > 0).length;
    return Math.round((completedCriteria / totalCriteria) * 100);
  };

  // バリデーション
  const canSubmit = () => {
    if (!session) return false;
    // すべての評価項目にスコアが入力されているかチェック
    const allCriteria = session.template.categories.flatMap(cat => cat.criteria);
    return allCriteria.every(crit =>
      evaluationData.scores.find(s => s.criterionId === crit.id)?.score > 0
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          {retryCount > 0 ? `再試行中... (${retryCount}回目)` : '評価画面を読み込み中...'}
        </Typography>
        <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', display: 'block', color: 'text.secondary' }}>
          セッション情報とテンプレートを取得しています
        </Typography>
      </Box>
    );
  }

  if (error || !session) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRetry}
              disabled={isLoading}
            >
              再試行
            </Button>
          }
        >
          {error || 'セッションが見つかりません'}
        </Alert>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/sessions')}
          >
            セッション一覧に戻る
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/dashboard')}
          >
            ダッシュボードに戻る
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {session.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={`進捗: ${getProgress()}%`}
            color={getProgress() === 100 ? 'success' : 'primary'}
          />
          <Chip
            label={autoSaveStatus === 'saved' ? '保存済み' : autoSaveStatus === 'saving' ? '保存中...' : '保存エラー'}
            color={autoSaveStatus === 'saved' ? 'success' : autoSaveStatus === 'saving' ? 'info' : 'error'}
            size="small"
          />
          <Typography variant="body2" color="text.secondary">
            評価者: {user?.profile?.displayName || user?.username}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 動画プレーヤー */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {session.video.title}
              </Typography>
              
              {/* 動画エリア */}
              <Box sx={{ position: 'relative', mb: 2 }}>
                <video
                  ref={videoRef}
                  width="100%"
                  height="400"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  style={{ borderRadius: 8 }}
                >
                  <source src={`https://example.com/videos/${session.video.id}.mp4`} type="video/mp4" />
                  お使いのブラウザは動画再生に対応していません。
                </video>
                
                {/* タイムラインコメント表示 */}
                {/* タイムラインコメント表示（設定があれば） */}
                {evaluationData.timelineComments.map(comment => (
                  <Tooltip
                    key={comment.id}
                    title={comment.comment}
                    placement="top"
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 60,
                        left: `${(comment.timestamp / duration) * 100}%`,
                        width: 4,
                        height: 20,
                        bgcolor: 'primary.main',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleSeek(comment.timestamp)}
                    />
                  </Tooltip>
                ))}
              </Box>

              {/* 動画コントロール */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <IconButton onClick={handlePlayPause}>
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                  </IconButton>
                  <Typography variant="body2">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </Typography>
                  <Box sx={{ flexGrow: 1, mx: 2 }}>
                    <Slider
                      value={currentTime}
                      max={duration}
                      onChange={(_, value) => handleSeek(value as number)}
                      size="small"
                    />
                  </Box>
                  <VolumeUpIcon />
                  <Slider
                    value={volume}
                    max={1}
                    step={0.1}
                    onChange={(_, value) => handleVolumeChange(value as number)}
                    sx={{ width: 100 }}
                    size="small"
                  />
                </Box>
              </Box>

              {/* タイムラインコメント追加ボタン */}
              {true && (
                <Button
                  startIcon={<CommentIcon />}
                  onClick={handleAddTimelineComment}
                  variant="outlined"
                  size="small"
                >
                  この時点にコメント追加
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 評価フォーム */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                評価フォーム
              </Typography>
              
              <LinearProgress
                variant="determinate"
                value={getProgress()}
                sx={{ mb: 2 }}
              />

              {/* 評価項目 */}
              {session.template.categories.map(category => (
                <Accordion key={category.id} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box>
                      <Typography variant="subtitle1">
                        {category.name}
                        {/* 重み表示（設定があれば） */}
                        {true && (
                          <Chip label={`${category.weight}%`} size="small" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {category.description}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {category.criteria.map(criterion => {
                      const score = evaluationData.scores.find(s => s.criterionId === criterion.id);
                      return (
                        <Box key={criterion.id} sx={{ mb: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="body2" sx={{ flexGrow: 1 }}>
                              {criterion.name}
                              {/* 必須マーク（設定があれば） */}
                              {false && (
                                <Chip label="必須" size="small" color="error" sx={{ ml: 1 }} />
                              )}
                            </Typography>
                            {/* 重み表示（設定があれば） */}
                            {true && (
                              <Chip label={`${criterion.weight}%`} size="small" variant="outlined" />
                            )}
                          </Box>
                          
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {criterion.description}
                          </Typography>

                          <Box sx={{ px: 1 }}>
                            <Slider
                              value={score?.score || 0}
                              min={criterion.minValue}
                              max={criterion.maxValue}
                              step={1}
                              marks
                              valueLabelDisplay="on"
                              onChange={(_, value) => handleScoreChange(criterion.id, value as number)}
                            />
                          </Box>

                          <TextField
                            placeholder="コメント（任意）"
                            value={score?.comment || ''}
                            onChange={(e) => handleCommentChange(criterion.id, e.target.value)}
                            multiline
                            rows={2}
                            fullWidth
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      );
                    })}
                  </AccordionDetails>
                </Accordion>
              ))}

              {/* 総合コメント */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  総合コメント
                </Typography>
                <TextField
                  placeholder="演舞全体に対する総合的なコメントをお書きください"
                  value={evaluationData.overallComment}
                  onChange={(e) => setEvaluationData(prev => ({ ...prev, overallComment: e.target.value }))}
                  multiline
                  rows={4}
                  fullWidth
                />
              </Box>

              {/* 提出ボタン */}
              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleAutoSave}
                  disabled={autoSaveStatus === 'saving'}
                >
                  保存
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={() => setSubmitDialogOpen(true)}
                  disabled={!canSubmit()}
                  fullWidth
                >
                  評価を提出
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* タイムラインコメント追加ダイアログ */}
      <Dialog
        open={showCommentDialog}
        onClose={() => setShowCommentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          タイムラインコメント追加 ({formatTime(commentTimestamp)})
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="コメント"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            multiline
            rows={3}
            fullWidth
            placeholder="この時点での気づきやコメントを入力してください"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCommentDialog(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSaveTimelineComment} variant="contained">
            追加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提出確認ダイアログ */}
      <Dialog
        open={submitDialogOpen}
        onClose={() => setSubmitDialogOpen(false)}
      >
        <DialogTitle>評価の提出</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            評価を提出しますか？提出後は内容を変更できません。
          </Typography>
          <Typography variant="body2" color="text.secondary">
            進捗: {getProgress()}% 完了
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            提出する
          </Button>
        </DialogActions>
      </Dialog>

      {/* フローティングアクションボタン */}
      {true && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleAddTimelineComment}
        >
          <CommentIcon />
        </Fab>
      )}
    </Box>
  );
};

export default EvaluationPage;