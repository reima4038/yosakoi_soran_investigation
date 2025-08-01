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

// 評価データの型定義
interface EvaluationScore {
  criterionId: string;
  score: number;
  comment: string;
}

interface TimelineComment {
  id: string;
  timestamp: number;
  comment: string;
  criterionId?: string;
}

interface EvaluationData {
  sessionId: string;
  scores: EvaluationScore[];
  timelineComments: TimelineComment[];
  overallComment: string;
  isSubmitted: boolean;
}

// セッション情報の型定義
interface EvaluationSession {
  id: string;
  name: string;
  description: string;
  video: {
    id: string;
    title: string;
    youtubeId: string;
    duration: number;
  };
  template: {
    id: string;
    name: string;
    categories: Array<{
      id: string;
      name: string;
      description: string;
      weight: number;
      criteria: Array<{
        id: string;
        name: string;
        description: string;
        weight: number;
        minScore: number;
        maxScore: number;
        isRequired: boolean;
      }>;
    }>;
    settings: {
      allowComments: boolean;
      requireAllCriteria: boolean;
      showWeights: boolean;
    };
  };
  endDate: string;
}

const EvaluationPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [session, setSession] = useState<EvaluationSession | null>(null);
  const [evaluationData, setEvaluationData] = useState<EvaluationData>({
    sessionId: sessionId || '',
    scores: [],
    timelineComments: [],
    overallComment: '',
    isSubmitted: false,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
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
  }, [evaluationData]);

  const fetchSession = async (id: string) => {
    try {
      setIsLoading(true);
      // TODO: API呼び出し
      // const response = await apiClient.get(`/api/sessions/${id}/evaluation`);
      // setSession(response.data);

      // モックデータ
      const mockSession: EvaluationSession = {
        id,
        name: '第45回よさこい祭り 本祭評価',
        description: '本祭での各チームの演舞を評価します',
        video: {
          id: 'video1',
          title: '鳴子踊り - 伝統チーム',
          youtubeId: 'dQw4w9WgXcQ',
          duration: 272, // 4:32
        },
        template: {
          id: 'template1',
          name: '本祭評価テンプレート',
          categories: [
            {
              id: 'cat1',
              name: '技術面',
              description: '演舞の技術的な完成度を評価',
              weight: 30,
              criteria: [
                {
                  id: 'crit1',
                  name: '基本動作の正確性',
                  description: 'よさこいの基本動作が正確に実行されているか',
                  weight: 40,
                  minScore: 1,
                  maxScore: 5,
                  isRequired: true,
                },
                {
                  id: 'crit2',
                  name: '鳴子の扱い',
                  description: '鳴子を効果的に使用できているか',
                  weight: 30,
                  minScore: 1,
                  maxScore: 5,
                  isRequired: true,
                },
              ],
            },
            {
              id: 'cat2',
              name: '表現力',
              description: '演舞の表現力と感情の伝達を評価',
              weight: 25,
              criteria: [
                {
                  id: 'crit3',
                  name: '表情・感情表現',
                  description: '豊かな表情で感情を表現できているか',
                  weight: 50,
                  minScore: 1,
                  maxScore: 5,
                  isRequired: true,
                },
              ],
            },
          ],
          settings: {
            allowComments: true,
            requireAllCriteria: false,
            showWeights: true,
          },
        },
        endDate: '2024-08-15T23:59:59Z',
      };
      setSession(mockSession);

      // 評価データの初期化
      const initialScores = mockSession.template.categories.flatMap(cat =>
        cat.criteria.map(crit => ({
          criterionId: crit.id,
          score: 0,
          comment: '',
        }))
      );
      setEvaluationData(prev => ({
        ...prev,
        scores: initialScores,
      }));
    } catch (error: any) {
      setError('セッション情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
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
      // TODO: API呼び出し
      // await apiClient.put(`/api/evaluations/${sessionId}`, evaluationData);
      setAutoSaveStatus('saved');
    } catch (error) {
      setAutoSaveStatus('error');
    }
  };

  // 評価提出
  const handleSubmit = async () => {
    try {
      // TODO: API呼び出し
      // await apiClient.post(`/api/evaluations/${sessionId}/submit`, evaluationData);
      setEvaluationData(prev => ({ ...prev, isSubmitted: true }));
      setSubmitDialogOpen(false);
      navigate(`/sessions/${sessionId}/results`);
    } catch (error: any) {
      setError('評価の提出に失敗しました');
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
    const requiredCriteria = session.template.categories
      .flatMap(cat => cat.criteria)
      .filter(crit => crit.isRequired);
    return requiredCriteria.every(crit =>
      evaluationData.scores.find(s => s.criterionId === crit.id)?.score > 0
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          評価画面を読み込み中...
        </Typography>
      </Box>
    );
  }

  if (error || !session) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'セッションが見つかりません'}</Alert>
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
                {session.template.settings.allowComments && evaluationData.timelineComments.map(comment => (
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
              {session.template.settings.allowComments && (
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
                        {session.template.settings.showWeights && (
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
                              {criterion.isRequired && (
                                <Chip label="必須" size="small" color="error" sx={{ ml: 1 }} />
                              )}
                            </Typography>
                            {session.template.settings.showWeights && (
                              <Chip label={`${criterion.weight}%`} size="small" variant="outlined" />
                            )}
                          </Box>
                          
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {criterion.description}
                          </Typography>

                          <Box sx={{ px: 1 }}>
                            <Slider
                              value={score?.score || 0}
                              min={criterion.minScore}
                              max={criterion.maxScore}
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
      {session.template.settings.allowComments && (
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