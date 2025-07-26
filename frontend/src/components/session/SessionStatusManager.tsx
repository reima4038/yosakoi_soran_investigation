import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Archive as ArchiveIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { Session, SessionStatus } from '../../types';
import { sessionService } from '../../services/sessionService';

interface SessionStatusManagerProps {
  session: Session;
  onSessionUpdated?: (session: Session) => void;
}

interface ProgressData {
  totalEvaluators: number;
  completedEvaluations: number;
  pendingEvaluations: number;
  completionRate: number;
  evaluators: Array<{
    id: string;
    name: string;
    status: 'completed' | 'pending';
    submittedAt: Date | null;
  }>;
  timeRemaining: number | null;
  isOverdue: boolean;
}

const SessionStatusManager: React.FC<SessionStatusManagerProps> = ({
  session,
  onSessionUpdated,
}) => {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    status: SessionStatus | null;
    title: string;
    message: string;
  }>({
    open: false,
    status: null,
    title: '',
    message: '',
  });

  // 進捗データの読み込み
  const loadProgress = async () => {
    if (session.status === SessionStatus.DRAFT) return;

    try {
      setLoading(true);
      const progressData = await sessionService.getSessionProgress(session.id);
      setProgress(progressData);
    } catch (err: any) {
      setError(err.response?.data?.message || '進捗データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
  }, [session.id, session.status]);

  // ステータス変更の確認ダイアログを表示
  const showStatusChangeDialog = (newStatus: SessionStatus) => {
    const dialogs = {
      [SessionStatus.ACTIVE]: {
        title: 'セッションをアクティブにする',
        message:
          'セッションをアクティブにすると、評価者が評価を開始できるようになります。よろしいですか？',
      },
      [SessionStatus.COMPLETED]: {
        title: 'セッションを完了する',
        message:
          'セッションを完了すると、新しい評価の受付が停止されます。よろしいですか？',
      },
      [SessionStatus.ARCHIVED]: {
        title: 'セッションをアーカイブする',
        message:
          'セッションをアーカイブすると、編集や変更ができなくなります。よろしいですか？',
      },
      [SessionStatus.DRAFT]: {
        title: '',
        message: '',
      },
    };

    const dialog = dialogs[newStatus];
    setConfirmDialog({
      open: true,
      status: newStatus,
      title: dialog.title,
      message: dialog.message,
    });
  };

  // ステータス変更の実行
  const handleStatusChange = async () => {
    if (!confirmDialog.status) return;

    try {
      setLoading(true);
      setError(null);

      const updatedSession = await sessionService.patchSessionStatus(
        session.id,
        confirmDialog.status
      );

      if (onSessionUpdated) {
        onSessionUpdated(updatedSession);
      }

      setConfirmDialog({ open: false, status: null, title: '', message: '' });

      // 進捗データを再読み込み
      await loadProgress();
    } catch (err: any) {
      setError(err.response?.data?.message || 'ステータスの変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ステータスに応じたアクションボタン
  const getStatusActions = () => {
    const actions = [];

    switch (session.status) {
      case SessionStatus.DRAFT:
        actions.push(
          <Button
            key='activate'
            variant='contained'
            color='success'
            startIcon={<PlayArrowIcon />}
            onClick={() => showStatusChangeDialog(SessionStatus.ACTIVE)}
            disabled={loading}
          >
            アクティブにする
          </Button>
        );
        actions.push(
          <Button
            key='archive'
            variant='outlined'
            startIcon={<ArchiveIcon />}
            onClick={() => showStatusChangeDialog(SessionStatus.ARCHIVED)}
            disabled={loading}
          >
            アーカイブ
          </Button>
        );
        break;

      case SessionStatus.ACTIVE:
        actions.push(
          <Button
            key='complete'
            variant='contained'
            color='primary'
            startIcon={<StopIcon />}
            onClick={() => showStatusChangeDialog(SessionStatus.COMPLETED)}
            disabled={loading}
          >
            完了にする
          </Button>
        );
        actions.push(
          <Button
            key='archive'
            variant='outlined'
            startIcon={<ArchiveIcon />}
            onClick={() => showStatusChangeDialog(SessionStatus.ARCHIVED)}
            disabled={loading}
          >
            アーカイブ
          </Button>
        );
        break;

      case SessionStatus.COMPLETED:
        actions.push(
          <Button
            key='archive'
            variant='outlined'
            startIcon={<ArchiveIcon />}
            onClick={() => showStatusChangeDialog(SessionStatus.ARCHIVED)}
            disabled={loading}
          >
            アーカイブ
          </Button>
        );
        break;

      case SessionStatus.ARCHIVED:
        // アーカイブ済みは変更不可
        break;
    }

    return actions;
  };

  // 時間の表示フォーマット
  const formatTimeRemaining = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}日${hours % 24}時間`;
    } else if (hours > 0) {
      return `${hours}時間`;
    } else {
      const minutes = Math.floor(milliseconds / (1000 * 60));
      return `${minutes}分`;
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ステータス概要 */}
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title='セッションステータス'
          action={
            <Box display='flex' gap={1}>
              {getStatusActions()}
            </Box>
          }
        />
        <CardContent>
          <Grid container spacing={2} alignItems='center'>
            <Grid item>
              <Chip
                label={
                  session.status === SessionStatus.DRAFT
                    ? '下書き'
                    : session.status === SessionStatus.ACTIVE
                      ? 'アクティブ'
                      : session.status === SessionStatus.COMPLETED
                        ? '完了'
                        : 'アーカイブ'
                }
                color={
                  session.status === SessionStatus.DRAFT
                    ? 'default'
                    : session.status === SessionStatus.ACTIVE
                      ? 'success'
                      : session.status === SessionStatus.COMPLETED
                        ? 'info'
                        : 'secondary'
                }
                size='large'
              />
            </Grid>

            {session.startDate && (
              <Grid item>
                <Typography variant='body2' color='text.secondary'>
                  開始: {new Date(session.startDate).toLocaleString('ja-JP')}
                </Typography>
              </Grid>
            )}

            {session.endDate && (
              <Grid item>
                <Typography variant='body2' color='text.secondary'>
                  終了: {new Date(session.endDate).toLocaleString('ja-JP')}
                </Typography>
              </Grid>
            )}
          </Grid>

          {/* 期限警告 */}
          {progress?.isOverdue && (
            <Alert severity='error' sx={{ mt: 2 }} icon={<WarningIcon />}>
              このセッションは期限を過ぎています
            </Alert>
          )}

          {progress?.timeRemaining &&
            progress.timeRemaining < 24 * 60 * 60 * 1000 &&
            !progress.isOverdue && (
              <Alert severity='warning' sx={{ mt: 2 }} icon={<ScheduleIcon />}>
                残り時間: {formatTimeRemaining(progress.timeRemaining)}
              </Alert>
            )}
        </CardContent>
      </Card>

      {/* 進捗状況 */}
      {progress && (
        <Card>
          <CardHeader
            title='評価進捗状況'
            subheader={`${progress.completedEvaluations}/${progress.totalEvaluators}人が評価完了`}
          />
          <CardContent>
            {loading ? (
              <Box display='flex' justifyContent='center' py={2}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* 進捗バー */}
                <Box sx={{ mb: 3 }}>
                  <Box
                    display='flex'
                    justifyContent='space-between'
                    alignItems='center'
                    mb={1}
                  >
                    <Typography variant='body2'>完了率</Typography>
                    <Typography variant='body2' fontWeight='bold'>
                      {progress.completionRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant='determinate'
                    value={progress.completionRate}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                {/* 評価者一覧 */}
                <Typography variant='subtitle1' gutterBottom>
                  評価者の状況
                </Typography>
                <List>
                  {progress.evaluators.map((evaluator, index) => (
                    <React.Fragment key={evaluator.id}>
                      <ListItem>
                        <ListItemIcon>
                          {evaluator.status === 'completed' ? (
                            <CheckCircleIcon color='success' />
                          ) : (
                            <PersonIcon color='action' />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={evaluator.name}
                          secondary={
                            evaluator.status === 'completed' &&
                            evaluator.submittedAt
                              ? `完了: ${new Date(evaluator.submittedAt).toLocaleString('ja-JP')}`
                              : '評価待ち'
                          }
                        />
                        <Chip
                          label={
                            evaluator.status === 'completed' ? '完了' : '保留中'
                          }
                          color={
                            evaluator.status === 'completed'
                              ? 'success'
                              : 'warning'
                          }
                          size='small'
                        />
                      </ListItem>
                      {index < progress.evaluators.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 確認ダイアログ */}
      <Dialog
        open={confirmDialog.open}
        onClose={() =>
          setConfirmDialog({
            open: false,
            status: null,
            title: '',
            message: '',
          })
        }
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setConfirmDialog({
                open: false,
                status: null,
                title: '',
                message: '',
              })
            }
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleStatusChange}
            variant='contained'
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? '変更中...' : '確認'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionStatusManager;
