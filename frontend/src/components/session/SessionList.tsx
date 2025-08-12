import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Avatar,
  AvatarGroup,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  PlayArrow as PlayArrowIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { sessionService } from '../../services/sessionService';

// 表示用のセッション型定義
interface SessionDisplay {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  startDate: string;
  endDate: string;
  videoTitle: string;
  templateName: string;
  participantCount: number;
  submittedCount: number;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    hasSubmitted: boolean;
  }>;
  createdAt: string;
  creatorName: string;
  creatorId: string;
}

const SessionList: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasAnyRole } = useAuth();
  const [sessions, setSessions] = useState<SessionDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<SessionDisplay | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSession, setSelectedSession] = useState<SessionDisplay | null>(null);

  // APIデータを表示用に変換
  const convertToDisplaySession = (session: any): SessionDisplay => {
    // 参加者データの処理
    const participants = session.participants || session.evaluators || [];
    const participantList = participants.map((participant: any) => ({
      id: participant._id || participant.id || participant.userId || 'unknown',
      name: participant.name || 
            participant.profile?.displayName || 
            participant.username || 
            'Unknown User',
      avatar: participant.avatar || participant.profile?.avatar,
      hasSubmitted: participant.hasSubmitted || false,
    }));

    // 提出数の計算
    const submittedCount = participantList.filter(p => p.hasSubmitted).length;

    return {
      id: session._id || session.id || 'unknown',
      name: session.name || 'Untitled Session',
      description: session.description || '',
      status: session.status || 'draft',
      startDate: session.startDate || new Date().toISOString(),
      endDate: session.endDate || new Date().toISOString(),
      videoTitle: session.video?.title || 
                  session.videoId?.title || 
                  'Unknown Video',
      templateName: session.template?.name || 
                    session.templateId?.name || 
                    'Unknown Template',
      participantCount: participantList.length,
      submittedCount: submittedCount,
      participants: participantList,
      createdAt: session.createdAt || new Date().toISOString(),
      creatorName: session.creator?.name ||
                   session.creator?.profile?.displayName ||
                   session.creator?.username ||
                   session.creatorId?.profile?.displayName || 
                   session.creatorId?.username || 
                   'Unknown Creator',
      creatorId: session.creator?.id ||
                 session.creator?._id ||
                 session.creatorId?._id ||
                 session.creatorId?.id ||
                 session.creatorId ||
                 'unknown',
    };
  };

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('Fetching sessions...');
      const response = await sessionService.getSessions();
      console.log('Sessions loaded:', response);
      
      const displaySessions = response.sessions.map(convertToDisplaySession);
      setSessions(displaySessions);
    } catch (error: any) {
      console.error('Sessions fetch error:', error);
      
      // エラーの種類に応じて適切な処理を行う
      if (error.response?.status === 403) {
        setError('セッション一覧にアクセスする権限がありません。管理者にお問い合わせください。');
      } else if (error.response?.status === 401) {
        setError('認証が必要です。再度ログインしてください。');
      } else if (error.response?.status >= 500) {
        setError('サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        setError('ネットワークエラーが発生しました。インターネット接続を確認してください。');
      } else {
        setError(`セッション一覧の取得に失敗しました。${error.message || 'エラーが発生しました。'}`);
      }
      
      // エラー時はセッションリストを空にする
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // セッション一覧の取得
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // リトライ機能
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    fetchSessions();
  }, [fetchSessions]);

  // ステータス表示用の設定
  const getStatusConfig = (status: SessionDisplay['status']) => {
    switch (status) {
      case 'draft':
        return { label: '下書き', color: 'default' as const, icon: <EditIcon /> };
      case 'active':
        return { label: '進行中', color: 'primary' as const, icon: <PlayArrowIcon /> };
      case 'completed':
        return { label: '完了', color: 'success' as const, icon: <CheckCircleIcon /> };
      case 'archived':
        return { label: 'アーカイブ', color: 'secondary' as const, icon: <CancelIcon /> };
      default:
        return { label: '不明', color: 'default' as const, icon: <ScheduleIcon /> };
    }
  };

  // 進捗率の計算
  const getProgressPercentage = (session: SessionDisplay) => {
    if (session.participantCount === 0) return 0;
    return Math.round((session.submittedCount / session.participantCount) * 100);
  };

  // メニューの制御
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, session: SessionDisplay) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedSession(session);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedSession(null);
  };

  // セッション削除の確認
  const handleDeleteClick = (session: SessionDisplay) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  // セッション削除の実行
  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;

    try {
      await sessionService.deleteSession(sessionToDelete.id);
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (error: any) {
      console.error('Session delete error:', error);
      
      // エラーの種類に応じて適切なメッセージを表示
      if (error.response?.status === 403) {
        setError('このセッションを削除する権限がありません。');
      } else if (error.response?.status === 404) {
        setError('削除しようとしたセッションが見つかりません。');
      } else if (error.response?.status >= 500) {
        setError('サーバーエラーが発生しました。セッションの削除に失敗しました。');
      } else {
        setError(`セッションの削除に失敗しました。${error.message || 'エラーが発生しました。'}`);
      }
      
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // セッション作成権限の確認
  const canCreateSession = hasAnyRole([UserRole.ADMIN, UserRole.EVALUATOR]);

  // セッション編集権限の確認
  const canEditSession = (session: SessionDisplay) => {
    if (!user) return false;
    
    // ADMINは常に編集可能
    if (user.role === UserRole.ADMIN) return true;
    
    // EVALUATORの場合、セッション作成者のみ編集可能
    if (user.role === UserRole.EVALUATOR) {
      return session.creatorId === user.id;
    }
    
    return false;
  };

  if (isLoading && sessions.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">評価セッション管理</Typography>
          {canCreateSession && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/sessions/create')}
            >
              新規セッション作成
            </Button>
          )}
        </Box>
        
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          セッション一覧を読み込み中...
          {retryCount > 0 && ` (${retryCount + 1}回目)`}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">評価セッション管理</Typography>
        {canCreateSession && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/sessions/create')}
          >
            新規セッション作成
          </Button>
        )}
      </Box>

      {error && (
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
          {error}
        </Alert>
      )}

      {/* セッション一覧 */}
      <Grid container spacing={3}>
        {sessions.map((session) => {
          const statusConfig = getStatusConfig(session.status);
          const progressPercentage = getProgressPercentage(session);

          return (
            <Grid item xs={12} md={6} lg={4} key={session.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 4,
                  },
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/sessions/${session.id}`)}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  {/* ヘッダー */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Chip
                      icon={statusConfig.icon}
                      label={statusConfig.label}
                      color={statusConfig.color}
                      size="small"
                    />
                    {canEditSession(session) && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, session);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </Box>

                  {/* セッション名と説明 */}
                  <Typography variant="h6" gutterBottom noWrap>
                    {session.name}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {session.description}
                  </Typography>

                  {/* 動画とテンプレート情報 */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      動画: {session.videoTitle}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      テンプレート: {session.templateName}
                    </Typography>
                  </Box>

                  {/* 期間 */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      期間: {formatDate(session.startDate)} ～ {formatDate(session.endDate)}
                    </Typography>
                  </Box>

                  {/* 進捗情報 */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2">
                        評価進捗
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {session.submittedCount}/{session.participantCount} ({progressPercentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={progressPercentage}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  {/* 参加者アバター */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
                      {session.participants.map((participant) => (
                        <Tooltip title={participant.name} key={participant.id}>
                          <Avatar
                            src={participant.avatar}
                            sx={{
                              border: participant.hasSubmitted 
                                ? '2px solid #4caf50' 
                                : '2px solid #f44336',
                            }}
                          >
                            {participant.name[0]}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                    <Typography variant="caption" color="text.secondary">
                      作成者: {session.creatorName}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {sessions.length === 0 && !isLoading && !error && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <AssessmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            評価セッションがありません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            新しい評価セッションを作成して、演舞の評価を開始しましょう。
          </Typography>
          {canCreateSession && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/sessions/create')}
            >
              最初のセッションを作成
            </Button>
          )}
        </Box>
      )}

      {sessions.length === 0 && !isLoading && error && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CancelIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            セッション一覧を読み込めませんでした
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            ネットワーク接続を確認するか、しばらく時間をおいてから再度お試しください。
          </Typography>
          <Button
            variant="outlined"
            onClick={handleRetry}
            disabled={isLoading}
          >
            再読み込み
          </Button>
        </Box>
      )}

      {/* セッションメニュー */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          navigate(`/sessions/${selectedSession?.id}/edit`);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText primary="編集" />
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/sessions/${selectedSession?.id}/participants`);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <PeopleIcon />
          </ListItemIcon>
          <ListItemText primary="参加者管理" />
        </MenuItem>
        <MenuItem onClick={() => selectedSession && handleDeleteClick(selectedSession)}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText primary="削除" />
        </MenuItem>
      </Menu>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>セッションの削除</DialogTitle>
        <DialogContent>
          <Typography>
            「{sessionToDelete?.name}」を削除しますか？
            この操作は取り消すことができません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionList;