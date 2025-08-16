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
import LoadingIndicator from '../common/LoadingIndicator';
import ErrorDisplay from '../common/ErrorDisplay';
import EvaluationLoadingState from './EvaluationLoadingState';

// セッション状態の定義
enum SessionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

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
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastErrorTime, setLastErrorTime] = useState<Date | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentTimestamp, setCommentTimestamp] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // セッション状態検証ユーティリティ
  const validateSessionAccess = (session: EvaluationSession) => {
    const now = new Date();
    const endDate = session.endDate ? new Date(session.endDate) : null;
    const sessionStatus = (session as any).status;

    // セッション状態チェック
    switch (sessionStatus) {
      case SessionStatus.DRAFT:
        return {
          canAccess: false,
          title: 'セッションは準備中です',
          message: 'このセッションはまだ開始されていません。',
          action: '管理者がセッションを開始するまでお待ちください。',
          severity: 'info' as const,
          redirectTo: '/sessions'
        };

      case SessionStatus.COMPLETED:
        return {
          canAccess: false,
          title: 'セッションは終了しています',
          message: 'このセッションは既に終了しています。',
          action: '結果ページで評価結果を確認できます。',
          severity: 'info' as const,
          redirectTo: `/sessions/${session.id}/results`
        };

      case SessionStatus.ARCHIVED:
        return {
          canAccess: false,
          title: 'セッションはアーカイブされています',
          message: 'このセッションはアーカイブされており、評価できません。',
          action: 'セッション一覧で他のセッションを確認してください。',
          severity: 'warning' as const,
          redirectTo: '/sessions'
        };

      case SessionStatus.ACTIVE:
        // アクティブセッションの期限チェック
        if (endDate && now > endDate) {
          return {
            canAccess: false,
            title: 'セッションの期限が切れています',
            message: `このセッションは ${endDate.toLocaleString()} に終了しました。`,
            action: '結果ページで評価結果を確認できます。',
            severity: 'warning' as const,
            redirectTo: `/sessions/${session.id}/results`
          };
        }
        
        return {
          canAccess: true,
          title: 'セッションにアクセス可能',
          message: 'セッションは正常にアクセス可能です。',
          action: '',
          severity: 'success' as const,
          redirectTo: null
        };

      default:
        return {
          canAccess: false,
          title: '不明なセッション状態',
          message: 'セッションの状態が不明です。',
          action: '管理者にお問い合わせください。',
          severity: 'error' as const,
          redirectTo: '/sessions'
        };
    }
  };

  // 権限チェック
  const validateUserPermission = (session: EvaluationSession, userId: string) => {
    // セッションの評価者リストに含まれているかチェック
    const evaluators = (session as any).evaluators || [];
    const isEvaluator = evaluators.some((evaluatorId: string) => evaluatorId === userId);
    const isCreator = (session as any).creatorId === userId;

    if (!isEvaluator && !isCreator) {
      return {
        hasPermission: false,
        title: '評価権限がありません',
        message: 'このセッションの評価権限がありません。',
        action: '管理者にお問い合わせいただくか、正しいアカウントでログインしてください。',
        severity: 'warning' as const,
        redirectTo: '/dashboard'
      };
    }

    return {
      hasPermission: true,
      title: '評価権限があります',
      message: 'セッションの評価権限があります。',
      action: '',
      severity: 'success' as const,
      redirectTo: null
    };
  };

  // エラーハンドリングユーティリティ
  const getErrorDetails = (error: any) => {
    const status = error.response?.status;
    const errorCode = error.code;
    const errorMessage = error.response?.data?.message || error.message;

    switch (status) {
      case 404:
        return {
          title: 'セッションが見つかりません',
          message: 'セッションが削除されたか、URLが間違っている可能性があります。',
          action: 'セッション一覧で確認してください。',
          severity: 'error' as const,
          canRetry: false,
          redirectTo: '/sessions'
        };
      
      case 403:
        return {
          title: '評価権限がありません',
          message: 'このセッションの評価権限がありません。',
          action: '管理者にお問い合わせいただくか、正しいアカウントでログインしてください。',
          severity: 'warning' as const,
          canRetry: false,
          redirectTo: '/dashboard'
        };
      
      case 400:
        return {
          title: 'セッションが利用できません',
          message: errorMessage || 'セッションが無効または非アクティブです。',
          action: 'セッションの状態を確認してください。',
          severity: 'info' as const,
          canRetry: true,
          redirectTo: '/sessions'
        };
      
      case 401:
        return {
          title: '認証が必要です',
          message: 'ログインセッションが期限切れです。',
          action: '再度ログインしてください。',
          severity: 'warning' as const,
          canRetry: false,
          redirectTo: '/login'
        };
      
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          title: 'サーバーエラー',
          message: 'サーバーで一時的な問題が発生しています。',
          action: 'しばらく時間をおいて再試行してください。',
          severity: 'error' as const,
          canRetry: true,
          redirectTo: null
        };
      
      default:
        if (errorCode === 'NETWORK_ERROR' || !error.response) {
          return {
            title: 'ネットワークエラー',
            message: 'インターネット接続に問題があります。',
            action: '接続を確認して再試行してください。',
            severity: 'error' as const,
            canRetry: true,
            redirectTo: null
          };
        }
        
        return {
          title: '予期しないエラー',
          message: errorMessage || 'セッション情報の取得に失敗しました。',
          action: 'しばらく時間をおいて再試行してください。',
          severity: 'error' as const,
          canRetry: true,
          redirectTo: null
        };
    }
  };

  // 指数バックオフ計算
  const getRetryDelay = (retryCount: number) => {
    return Math.min(1000 * Math.pow(2, retryCount), 30000); // 最大30秒
  };

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

  const fetchSession = async (id: string, isRetry: boolean = false) => {
    try {
      setIsLoading(true);
      setError('');
      setLastErrorTime(null);
      
      if (isRetry) {
        setIsRetrying(true);
        setRetryCount(prev => prev + 1);
        
        // 指数バックオフでリトライ遅延
        const delay = getRetryDelay(retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // evaluationServiceを使用してデータを取得
      const data = await evaluationService.getEvaluation(id);
      
      // セッション状態検証
      const sessionValidation = validateSessionAccess(data.session);
      if (!sessionValidation.canAccess) {
        setError(JSON.stringify(sessionValidation));
        setSession(data.session); // セッション情報は設定（エラー表示で使用）
        return;
      }

      // 権限チェック
      if (user?.id) {
        const permissionValidation = validateUserPermission(data.session, user.id);
        if (!permissionValidation.hasPermission) {
          setError(JSON.stringify(permissionValidation));
          setSession(data.session);
          return;
        }
      }
      
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

      // 成功時にリトライカウントをリセット
      setRetryCount(0);
      setIsRetrying(false);
    } catch (error: any) {
      console.error('評価データ取得エラー:', error);
      
      const errorDetails = getErrorDetails(error);
      setError(JSON.stringify(errorDetails));
      setLastErrorTime(new Date());
      setIsRetrying(false);
      
      // 診断情報をログに記録
      console.error('エラー診断情報:', {
        sessionId: id,
        retryCount,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        error: {
          status: error.response?.status,
          code: error.code,
          message: error.message,
          data: error.response?.data
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 手動リトライ機能
  const handleRetry = () => {
    if (sessionId && !isLoading && !isRetrying) {
      fetchSession(sessionId, true);
    }
  };

  // 自動リトライ機能（ネットワークエラーの場合のみ）
  const handleAutoRetry = () => {
    if (!sessionId || isLoading || isRetrying || retryCount >= 3) return;
    
    try {
      const errorDetails = error ? JSON.parse(error) : null;
      if (errorDetails?.canRetry && errorDetails?.severity === 'error') {
        const delay = getRetryDelay(retryCount);
        setTimeout(() => {
          if (!isLoading && !isRetrying) {
            fetchSession(sessionId, true);
          }
        }, delay);
      }
    } catch (e) {
      // エラーパース失敗時は何もしない
    }
  };

  // 自動リトライのトリガー
  useEffect(() => {
    if (error && retryCount < 3) {
      const timer = setTimeout(handleAutoRetry, 2000);
      return () => clearTimeout(timer);
    }
  }, [error, retryCount]);

  // セッション状態の定期チェック
  useEffect(() => {
    if (!session || evaluationData.isSubmitted) return;

    const checkSessionStatus = () => {
      const sessionValidation = validateSessionAccess(session);
      if (!sessionValidation.canAccess) {
        console.log('セッション状態が変更されました:', sessionValidation.title);
        setError(JSON.stringify(sessionValidation));
      }
    };

    // 5分ごとにセッション状態をチェック
    const statusCheckInterval = setInterval(checkSessionStatus, 5 * 60 * 1000);

    return () => clearInterval(statusCheckInterval);
  }, [session, evaluationData.isSubmitted]);

  // ネットワーク状態の監視
  useEffect(() => {
    const handleOnline = () => {
      console.log('ネットワーク接続が復旧しました');
      if (error && retryCount < 3) {
        // ネットワーク復旧時に自動リトライ
        setTimeout(() => {
          if (sessionId && !isLoading && !isRetrying) {
            fetchSession(sessionId, true);
          }
        }, 1000);
      }
    };

    const handleOffline = () => {
      console.log('ネットワーク接続が切断されました');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error, retryCount, sessionId, isLoading, isRetrying, fetchSession]);

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
    } catch (error: any) {
      console.error('自動保存エラー:', error);
      setAutoSaveStatus('error');
      
      // 自動保存エラーの診断情報
      console.error('自動保存エラー診断情報:', {
        sessionId,
        scoresCount: evaluationData.scores.length,
        timestamp: new Date().toISOString(),
        error: {
          status: error.response?.status,
          code: error.code,
          message: error.message,
          data: error.response?.data
        }
      });
      
      // 重要でないエラーの場合は、しばらく後に再試行
      if (error.response?.status >= 500 || error.code === 'NETWORK_ERROR') {
        setTimeout(() => {
          if (autoSaveStatus === 'error') {
            handleAutoSave();
          }
        }, 5000);
      }
    }
  };

  // 評価提出
  const handleSubmit = async () => {
    try {
      if (sessionId && session) {
        // 提出前にセッション状態を再検証
        const sessionValidation = validateSessionAccess(session);
        if (!sessionValidation.canAccess) {
          setError(JSON.stringify(sessionValidation));
          setSubmitDialogOpen(false);
          return;
        }

        // evaluationServiceを使用して評価を提出
        await evaluationService.submitEvaluation(sessionId);
        setEvaluationData(prev => ({ ...prev, isSubmitted: true }));
        setSubmitDialogOpen(false);
        navigate(`/sessions/${sessionId}/results`);
      }
    } catch (error: any) {
      console.error('評価提出エラー:', error);
      
      // 提出エラーの診断情報
      console.error('評価提出エラー診断情報:', {
        sessionId,
        scoresCount: evaluationData.scores.length,
        completedScores: evaluationData.scores.filter(s => s.score > 0).length,
        timestamp: new Date().toISOString(),
        error: {
          status: error.response?.status,
          code: error.code,
          message: error.message,
          data: error.response?.data
        }
      });
      
      const errorDetails = getErrorDetails(error);
      let errorMessage = errorDetails.title + ': ' + errorDetails.message;
      
      if (error.response?.status === 400) {
        const serverMessage = error.response?.data?.message;
        if (serverMessage) {
          errorMessage = serverMessage;
        }
        
        // 完了していない項目がある場合の詳細情報
        if (serverMessage?.includes('すべての評価項目')) {
          const missingCriteria = error.response?.data?.data?.missingCriteria || [];
          if (missingCriteria.length > 0) {
            errorMessage += '\n\n未完了の項目:\n' + 
              missingCriteria.map((c: any) => `• ${c.categoryName}: ${c.name}`).join('\n');
          }
        }
      }
      
      setError(errorMessage);
      setSubmitDialogOpen(false);
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
    if (!session || evaluationData.isSubmitted) return false;
    
    // セッション状態チェック
    const sessionValidation = validateSessionAccess(session);
    if (!sessionValidation.canAccess) return false;
    
    // すべての評価項目にスコアが入力されているかチェック
    const allCriteria = session.template.categories.flatMap(cat => cat.criteria);
    return allCriteria.every(crit =>
      evaluationData.scores.find(s => s.criterionId === crit.id)?.score > 0
    );
  };

  if (isLoading || isRetrying) {
    return (
      <EvaluationLoadingState
        message={isRetrying ? `再試行中... (${retryCount}回目)` : '評価画面を読み込み中...'}
        submessage={isRetrying 
          ? `${getRetryDelay(retryCount - 1) / 1000}秒待機後に再試行しています`
          : 'セッション情報とテンプレートを取得しています'
        }
        retryCount={retryCount}
      />
    );
  }

  if (error || !session) {
    let errorDetails = null;
    try {
      errorDetails = error ? JSON.parse(error) : null;
    } catch (e) {
      // エラーパース失敗時は従来のエラーメッセージを使用
    }

    const customActions = [];
    
    // 主要なリダイレクトアクション
    if (errorDetails?.redirectTo) {
      customActions.push({
        label: errorDetails.redirectTo === '/sessions' ? 'セッション一覧' : 
               errorDetails.redirectTo === '/dashboard' ? 'ダッシュボード' : 
               errorDetails.redirectTo === '/login' ? 'ログイン' : '戻る',
        onClick: () => navigate(errorDetails.redirectTo),
        variant: 'contained' as const,
        primary: true,
      });
    }

    return (
      <ErrorDisplay
        title={errorDetails?.title || 'エラーが発生しました'}
        message={`${errorDetails?.message || error || 'セッションが見つかりません'}${
          errorDetails?.action ? '\n\n' + errorDetails.action : ''
        }`}
        severity={errorDetails?.severity || 'error'}
        canRetry={errorDetails?.canRetry !== false}
        onRetry={handleRetry}
        isRetrying={isRetrying}
        actions={customActions}
        errorDetails={{
          timestamp: lastErrorTime || undefined,
          retryCount: retryCount > 0 ? retryCount : undefined,
          errorCode: errorDetails?.title,
        }}
        showDetails={true}
      />
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {session.name}
        </Typography>
        
        {/* セッション状態に応じた警告 */}
        {session.endDate && new Date() > new Date(session.endDate) && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            このセッションは期限切れです。評価の提出はできません。
          </Alert>
        )}
        
        {evaluationData.isSubmitted && (
          <Alert severity="success" sx={{ mb: 2 }}>
            評価は既に提出済みです。内容の変更はできません。
          </Alert>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label={`進捗: ${getProgress()}% (${evaluationData.scores.filter(s => s.score > 0).length}/${session?.template.categories.flatMap(cat => cat.criteria).length || 0})`}
            color={getProgress() === 100 ? 'success' : getProgress() >= 50 ? 'primary' : 'warning'}
            icon={getProgress() === 100 ? <span>✓</span> : <span>⏳</span>}
          />
          <Chip
            label={
              autoSaveStatus === 'saved' ? '✓ 保存済み' : 
              autoSaveStatus === 'saving' ? '⏳ 保存中...' : 
              '⚠ 保存エラー'
            }
            color={autoSaveStatus === 'saved' ? 'success' : autoSaveStatus === 'saving' ? 'info' : 'error'}
            size="small"
            variant={autoSaveStatus === 'saved' ? 'outlined' : 'filled'}
          />
          {/* セッション状態表示 */}
          <Chip
            label={`状態: ${(session as any).status === 'active' ? 'アクティブ' : 
                           (session as any).status === 'completed' ? '完了' : 
                           (session as any).status === 'draft' ? '準備中' : 
                           (session as any).status === 'archived' ? 'アーカイブ' : '不明'}`}
            color={(session as any).status === 'active' ? 'success' : 
                   (session as any).status === 'completed' ? 'default' : 
                   (session as any).status === 'draft' ? 'warning' : 'error'}
            size="small"
            variant="outlined"
          />
          {/* 期限表示 */}
          {session.endDate && (
            <Chip
              label={`期限: ${new Date(session.endDate).toLocaleDateString()}`}
              color={new Date() > new Date(session.endDate) ? 'error' : 'default'}
              size="small"
              variant="outlined"
            />
          )}
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SendIcon color="primary" />
            評価の提出
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              評価を提出しますか？提出後は内容を変更できません。
            </Typography>
          </Alert>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              提出内容の確認
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={`進捗: ${getProgress()}%`}
                color={getProgress() === 100 ? 'success' : 'warning'}
                size="small"
              />
              <Chip
                label={`評価項目: ${evaluationData.scores.filter(s => s.score > 0).length}/${session?.template.categories.flatMap(cat => cat.criteria).length || 0}`}
                color="info"
                size="small"
              />
              <Chip
                label={`コメント: ${evaluationData.timelineComments.length}件`}
                color="default"
                size="small"
              />
            </Box>
          </Box>

          {getProgress() < 100 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                一部の評価項目が未完了です。このまま提出してもよろしいですか？
              </Typography>
            </Alert>
          )}

          {session?.endDate && new Date() > new Date(session.endDate) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                セッションの期限が切れています。提出できない可能性があります。
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setSubmitDialogOpen(false)}
            variant="outlined"
          >
            キャンセル
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            startIcon={<SendIcon />}
            disabled={session?.endDate && new Date() > new Date(session.endDate)}
          >
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