import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Archive as ArchiveIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  VideoLibrary as VideoLibraryIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { Session, SessionStatus } from '../../types';
import {
  sessionService,
  SessionListParams,
} from '../../services/sessionService';
import SessionCreationForm from './SessionCreationForm';

interface SessionManagementProps {
  onSessionSelect?: (session: Session) => void;
}

const SessionManagement: React.FC<SessionManagementProps> = ({
  onSessionSelect,
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);

  // フィルタリングとページネーション
  const [filters, setFilters] = useState<SessionListParams>({
    status: undefined,
    page: 1,
    limit: 10,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPages, setTotalPages] = useState(1);

  // セッション一覧の読み込み
  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sessionService.getSessions(filters);
      setSessions(response.sessions);
      setTotalPages(response.pagination.pages);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'セッション一覧の取得に失敗しました'
      );
      console.error('セッション一覧取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [filters]);

  // セッション作成完了時の処理
  const handleSessionCreated = (session: Session) => {
    setShowCreateForm(false);
    loadSessions(); // 一覧を再読み込み
  };

  // セッションステータスの変更
  const handleStatusChange = async (
    session: Session,
    newStatus: SessionStatus
  ) => {
    try {
      await sessionService.updateSessionStatus(session.id, newStatus);
      loadSessions(); // 一覧を再読み込み
      setMenuAnchor(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'ステータスの変更に失敗しました');
    }
  };

  // セッション削除
  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      await sessionService.deleteSession(sessionToDelete.id);
      loadSessions(); // 一覧を再読み込み
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'セッションの削除に失敗しました');
    }
  };

  // メニューの処理
  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    session: Session
  ) => {
    setMenuAnchor(event.currentTarget);
    setSelectedSession(session);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedSession(null);
  };

  // ステータスに応じた色とラベル
  const getStatusChip = (status: SessionStatus) => {
    const statusConfig = {
      [SessionStatus.DRAFT]: { color: 'default' as const, label: '下書き' },
      [SessionStatus.ACTIVE]: {
        color: 'success' as const,
        label: 'アクティブ',
      },
      [SessionStatus.COMPLETED]: { color: 'info' as const, label: '完了' },
      [SessionStatus.ARCHIVED]: {
        color: 'secondary' as const,
        label: 'アーカイブ',
      },
    };

    const config = statusConfig[status];
    return <Chip label={config.label} color={config.color} size='small' />;
  };

  // フィルタリング処理
  const handleFilterChange = (field: keyof SessionListParams, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1, // フィルタ変更時はページを1に戻す
    }));
  };

  // 検索処理（実装は簡略化）
  const filteredSessions = sessions.filter(
    session =>
      searchQuery === '' ||
      session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showCreateForm) {
    return (
      <SessionCreationForm
        onSessionCreated={handleSessionCreated}
        onCancel={() => setShowCreateForm(false)}
      />
    );
  }

  return (
    <Box>
      {/* ヘッダー */}
      <Box
        display='flex'
        justifyContent='space-between'
        alignItems='center'
        mb={3}
      >
        <Typography variant='h4'>評価セッション管理</Typography>
        <Button
          variant='contained'
          startIcon={<AddIcon />}
          onClick={() => setShowCreateForm(true)}
        >
          新しいセッション
        </Button>
      </Box>

      {/* フィルタとサーチ */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems='center'>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder='セッション名で検索...'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={e =>
                    handleFilterChange('status', e.target.value || undefined)
                  }
                  label='ステータス'
                >
                  <MenuItem value=''>すべて</MenuItem>
                  <MenuItem value={SessionStatus.DRAFT}>下書き</MenuItem>
                  <MenuItem value={SessionStatus.ACTIVE}>アクティブ</MenuItem>
                  <MenuItem value={SessionStatus.COMPLETED}>完了</MenuItem>
                  <MenuItem value={SessionStatus.ARCHIVED}>アーカイブ</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* セッション一覧 */}
      {loading ? (
        <Box display='flex' justifyContent='center' py={4}>
          <CircularProgress />
        </Box>
      ) : filteredSessions.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign='center' py={4}>
              <Typography variant='h6' color='text.secondary'>
                セッションが見つかりません
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                新しいセッションを作成してください
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filteredSessions.map(session => (
            <Grid item xs={12} key={session.id}>
              <Card>
                <CardContent>
                  <Box
                    display='flex'
                    justifyContent='space-between'
                    alignItems='flex-start'
                  >
                    <Box flex={1}>
                      <Box display='flex' alignItems='center' gap={2} mb={1}>
                        <Typography variant='h6'>{session.name}</Typography>
                        {getStatusChip(session.status)}
                      </Box>

                      {session.description && (
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          sx={{ mb: 2 }}
                        >
                          {session.description}
                        </Typography>
                      )}

                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <Box display='flex' alignItems='center' gap={1}>
                            <VideoLibraryIcon fontSize='small' color='action' />
                            <Typography variant='body2'>
                              {(session as any).videoId?.title ||
                                '動画情報なし'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Box display='flex' alignItems='center' gap={1}>
                            <AssessmentIcon fontSize='small' color='action' />
                            <Typography variant='body2'>
                              {(session as any).templateId?.name ||
                                'テンプレート情報なし'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Box display='flex' alignItems='center' gap={1}>
                            <PeopleIcon fontSize='small' color='action' />
                            <Typography variant='body2'>
                              評価者: {session.participants?.length || 0}人
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      {(session.startDate || session.endDate) && (
                        <Box mt={2}>
                          <Typography variant='caption' color='text.secondary'>
                            {session.startDate &&
                              `開始: ${new Date(session.startDate).toLocaleString('ja-JP')}`}
                            {session.startDate && session.endDate && ' | '}
                            {session.endDate &&
                              `終了: ${new Date(session.endDate).toLocaleString('ja-JP')}`}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Box>
                      <IconButton
                        onClick={e => handleMenuOpen(e, session)}
                        size='small'
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <Box display='flex' justifyContent='center' mt={3}>
          <Pagination
            count={totalPages}
            page={filters.page || 1}
            onChange={(_, page) => handleFilterChange('page', page)}
            color='primary'
          />
        </Box>
      )}

      {/* アクションメニュー */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {selectedSession && (
          <>
            <MenuItem
              onClick={() => {
                if (onSessionSelect) onSessionSelect(selectedSession);
                handleMenuClose();
              }}
            >
              <EditIcon fontSize='small' sx={{ mr: 1 }} />
              詳細を見る
            </MenuItem>

            {selectedSession.status === SessionStatus.DRAFT && (
              <MenuItem
                onClick={() =>
                  handleStatusChange(selectedSession, SessionStatus.ACTIVE)
                }
              >
                <PlayArrowIcon fontSize='small' sx={{ mr: 1 }} />
                アクティブにする
              </MenuItem>
            )}

            {selectedSession.status === SessionStatus.ACTIVE && (
              <MenuItem
                onClick={() =>
                  handleStatusChange(selectedSession, SessionStatus.COMPLETED)
                }
              >
                <StopIcon fontSize='small' sx={{ mr: 1 }} />
                完了にする
              </MenuItem>
            )}

            {selectedSession.status === SessionStatus.COMPLETED && (
              <MenuItem
                onClick={() =>
                  handleStatusChange(selectedSession, SessionStatus.ARCHIVED)
                }
              >
                <ArchiveIcon fontSize='small' sx={{ mr: 1 }} />
                アーカイブする
              </MenuItem>
            )}

            {(selectedSession.status === SessionStatus.DRAFT ||
              selectedSession.status === SessionStatus.ARCHIVED) && (
              <MenuItem
                onClick={() => {
                  setSessionToDelete(selectedSession);
                  setDeleteDialogOpen(true);
                  handleMenuClose();
                }}
                sx={{ color: 'error.main' }}
              >
                <DeleteIcon fontSize='small' sx={{ mr: 1 }} />
                削除
              </MenuItem>
            )}
          </>
        )}
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
            この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleDeleteSession}
            color='error'
            variant='contained'
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionManagement;
