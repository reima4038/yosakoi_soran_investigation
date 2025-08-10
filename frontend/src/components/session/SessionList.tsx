import React, { useState, useEffect } from 'react';
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

// セッションの型定義
interface Session {
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
}

const SessionList: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasRole, hasAnyRole } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // セッション一覧の取得
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      
      // 実際のAPI呼び出し
      const response = await fetch('/api/sessions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('セッション一覧の取得に失敗しました');
      }
      
      const data = await response.json();
      setSessions(data.data.sessions || []);
    } catch (error: any) {
      console.error('Sessions fetch error:', error);
      setError('セッション一覧の取得に失敗しました');
      
      // エラー時はモックデータを使用（開発用）
      const mockSessions: Session[] = [
        {
          id: '1',
          name: '第45回よさこい祭り 本祭評価',
          description: '本祭での各チームの演舞を評価します',
          status: 'active',
          startDate: '2024-08-01T09:00:00Z',
          endDate: '2024-08-15T23:59:59Z',
          videoTitle: '鳴子踊り - 伝統チーム',
          templateName: '本祭評価テンプレート',
          participantCount: 5,
          submittedCount: 3,
          participants: [
            { id: '1', name: '田中審査員', hasSubmitted: true },
            { id: '2', name: '佐藤指導者', hasSubmitted: true },
            { id: '3', name: '山田評価者', hasSubmitted: true },
            { id: '4', name: '鈴木審査員', hasSubmitted: false },
            { id: '5', name: '高橋指導者', hasSubmitted: false },
          ],
          createdAt: '2024-07-25T10:00:00Z',
          creatorName: '管理者',
        },
        {
          id: '2',
          name: '地方車演舞評価セッション',
          description: '地方車での演舞パフォーマンスを評価',
          status: 'completed',
          startDate: '2024-07-15T09:00:00Z',
          endDate: '2024-07-30T23:59:59Z',
          videoTitle: '地方車演舞 - 青春チーム',
          templateName: '地方車評価テンプレート',
          participantCount: 3,
          submittedCount: 3,
          participants: [
            { id: '1', name: '田中審査員', hasSubmitted: true },
            { id: '2', name: '佐藤指導者', hasSubmitted: true },
            { id: '3', name: '山田評価者', hasSubmitted: true },
          ],
          createdAt: '2024-07-10T14:00:00Z',
          creatorName: '管理者',
        },
        {
          id: '3',
          name: '新人チーム評価',
          description: '新人チームの演舞技術向上のための評価',
          status: 'draft',
          startDate: '2024-08-20T09:00:00Z',
          endDate: '2024-09-05T23:59:59Z',
          videoTitle: '新人演舞 - フレッシュチーム',
          templateName: '新人評価テンプレート',
          participantCount: 4,
          submittedCount: 0,
          participants: [
            { id: '1', name: '田中審査員', hasSubmitted: false },
            { id: '2', name: '佐藤指導者', hasSubmitted: false },
            { id: '3', name: '山田評価者', hasSubmitted: false },
            { id: '4', name: '鈴木審査員', hasSubmitted: false },
          ],
          createdAt: '2024-08-01T16:00:00Z',
          creatorName: '管理者',
        },
      ];
      setSessions(mockSessions);
    } finally {
      setIsLoading(false);
    }
  };

  // ステータス表示用の設定
  const getStatusConfig = (status: Session['status']) => {
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
  const getProgressPercentage = (session: Session) => {
    if (session.participantCount === 0) return 0;
    return Math.round((session.submittedCount / session.participantCount) * 100);
  };

  // メニューの制御
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, session: Session) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedSession(session);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedSession(null);
  };

  // セッション削除の確認
  const handleDeleteClick = (session: Session) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  // セッション削除の実行
  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;

    try {
      // TODO: API呼び出し
      // await apiClient.delete(`/api/sessions/${sessionToDelete.id}`);
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (error: any) {
      setError('セッションの削除に失敗しました');
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

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          セッション一覧を読み込み中...
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
        <Alert severity="error" sx={{ mb: 2 }}>
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
                    {canCreateSession && (
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
                        <Tooltip key={participant.id} title={participant.name}>
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

      {sessions.length === 0 && !isLoading && (
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