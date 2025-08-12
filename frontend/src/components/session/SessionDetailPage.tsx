import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Divider,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  VideoLibrary as VideoLibraryIcon,
  Settings as SettingsIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { sessionService } from '../../services/sessionService';
import { Session, SessionStatus } from '../../types';
import { handleSessionError, ErrorInfo } from '../../utils/errorHandler';
import { ErrorDisplay, LoadingDisplay } from '../common';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`session-tabpanel-${index}`}
      aria-labelledby={`session-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// セッション詳細の拡張型定義（APIレスポンス用）
interface SessionDetail extends Session {
  video?: {
    id: string;
    title: string;
    youtubeId: string;
    thumbnailUrl: string;
    duration?: string;
  };
  template?: {
    id: string;
    name: string;
    description: string;
    categoryCount?: number;
    criteriaCount?: number;
  };
  participantDetails?: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    hasSubmitted: boolean;
    submittedAt?: string;
    invitedAt: string;
    joinedAt?: string;
  }>;
  evaluations?: Array<{
    id: string;
    evaluatorName: string;
    submittedAt: string;
    overallScore: number;
    commentCount: number;
  }>;
  creatorName?: string;
}

const SessionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, hasAnyRole } = useAuth();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // セッション詳細の取得
  useEffect(() => {
    let isMounted = true;

    const loadSessionDetail = async () => {
      if (id && isMounted) {
        await fetchSessionDetail(id);
      }
    };

    loadSessionDetail();

    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  }, [id]);

  const fetchSessionDetail = async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setNotFound(false);
      
      // sessionServiceを使用してセッション詳細を取得
      const sessionData = await sessionService.getSession(sessionId);
      
      // データが正常に取得できた場合のみ状態を更新
      if (sessionData) {
        setSession(sessionData as SessionDetail);
      } else {
        setNotFound(true);
        setError({
          message: 'セッションデータが見つかりません。',
          severity: 'error',
          details: 'セッションが削除されたか、データが破損している可能性があります。',
        });
      }
    } catch (error: any) {
      console.error('Session detail fetch error:', error);
      
      // 統一されたエラーハンドリングを使用
      if (error.response?.status === 404) {
        setNotFound(true);
      }
      
      const errorInfo = handleSessionError(error, '詳細取得');
      setError(errorInfo);
    } finally {
      setIsLoading(false);
    }
  };

  // ステータス表示用の設定
  const getStatusConfig = (status: SessionStatus) => {
    switch (status) {
      case SessionStatus.DRAFT:
        return { label: '下書き', color: 'default' as const, icon: <EditIcon /> };
      case SessionStatus.ACTIVE:
        return { label: '進行中', color: 'primary' as const, icon: <PlayArrowIcon /> };
      case SessionStatus.COMPLETED:
        return { label: '完了', color: 'success' as const, icon: <CheckCircleIcon /> };
      case SessionStatus.ARCHIVED:
        return { label: 'アーカイブ', color: 'secondary' as const, icon: <ScheduleIcon /> };
      default:
        return { label: '不明', color: 'default' as const, icon: <ScheduleIcon /> };
    }
  };

  // 進捗率の計算
  const getProgressPercentage = (session: SessionDetail) => {
    const participants = session.participantDetails || session.participants || [];
    const submittedCount = participants.filter((p: any) => p.hasSubmitted).length;
    if (participants.length === 0) return 0;
    return Math.round((submittedCount / participants.length) * 100);
  };

  // 日付フォーマット
  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // タブ変更
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 編集権限の確認
  const canEdit = useMemo(() => {
    if (!user || !session) return false;
    
    // ADMINは常に編集可能
    if (user.role === UserRole.ADMIN) return true;
    
    // EVALUATORの場合、セッション作成者のみ編集可能
    if (user.role === UserRole.EVALUATOR) {
      return session.creatorId === user.id;
    }
    
    return false;
  }, [user, session]);

  if (isLoading) {
    return (
      <LoadingDisplay
        type="linear"
        message="セッション詳細を読み込み中..."
      />
    );
  }

  // 404エラーの場合は専用の表示を行う
  if (notFound) {
    const notFoundError: ErrorInfo = {
      message: `指定されたセッション（ID: ${id}）が見つかりません。`,
      severity: 'error',
      details: 'セッションが削除されたか、URLが間違っている可能性があります。',
    };

    return (
      <Box sx={{ p: 3 }}>
        <ErrorDisplay
          error={notFoundError}
          showDetails={true}
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
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

  if (error || !session) {
    const displayError = error || {
      message: 'セッションが見つかりません',
      severity: 'error' as const,
      details: 'セッションデータの読み込みに失敗しました。',
    };

    return (
      <Box sx={{ p: 3 }}>
        <ErrorDisplay
          error={displayError}
          onRetry={!notFound && id ? () => fetchSessionDetail(id) : undefined}
          showDetails={true}
        />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
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

  const statusConfig = getStatusConfig(session.status);
  const progressPercentage = getProgressPercentage(session);
  const participants = session.participantDetails || session.participants || [];
  const submittedCount = participants.filter((p: any) => p.hasSubmitted).length;

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/sessions')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" gutterBottom>
            {session.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={statusConfig.icon}
              label={statusConfig.label}
              color={statusConfig.color}
            />
            <Typography variant="body2" color="text.secondary">
              作成者: {session.creatorName || '不明'} | 作成日: {formatDate(session.createdAt)}
            </Typography>
          </Box>
        </Box>
        {canEdit && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/sessions/${session.id}/edit`)}
          >
            編集
          </Button>
        )}
      </Box>

      {/* 基本情報カード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                セッション概要
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {session.description}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                評価期間: {formatDate(session.startDate)} ～ {formatDate(session.endDate)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                評価進捗
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2">
                  提出済み
                </Typography>
                <Typography variant="h6" color="primary">
                  {submittedCount}/{participants.length}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={progressPercentage}
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary" align="center">
                {progressPercentage}% 完了
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* タブ */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab icon={<VideoLibraryIcon />} label="動画・テンプレート" />
          <Tab icon={<PeopleIcon />} label="参加者" />
          <Tab icon={<AssessmentIcon />} label="評価結果" />
          <Tab icon={<SettingsIcon />} label="設定" />
        </Tabs>

        {/* 動画・テンプレートタブ */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    評価対象動画
                  </Typography>
                  {session.video ? (
                    <>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <img
                          src={session.video.thumbnailUrl}
                          alt={session.video.title}
                          style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 4 }}
                        />
                        <Box>
                          <Typography variant="subtitle1" gutterBottom>
                            {session.video.title}
                          </Typography>
                          {session.video.duration && (
                            <Typography variant="body2" color="text.secondary">
                              再生時間: {session.video.duration}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Button
                        variant="outlined"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => session.video && navigate(`/videos/${session.video.id}`)}
                        fullWidth
                      >
                        動画を表示
                      </Button>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      動画情報が設定されていません
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    評価テンプレート
                  </Typography>
                  {session.template ? (
                    <>
                      <Typography variant="subtitle1" gutterBottom>
                        {session.template.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {session.template.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        {session.template.categoryCount && (
                          <Chip label={`${session.template.categoryCount} カテゴリ`} size="small" />
                        )}
                        {session.template.criteriaCount && (
                          <Chip label={`${session.template.criteriaCount} 評価項目`} size="small" />
                        )}
                      </Box>
                      <Button
                        variant="outlined"
                        startIcon={<SettingsIcon />}
                        onClick={() => session.template && navigate(`/templates/${session.template.id}`)}
                        fullWidth
                      >
                        テンプレートを表示
                      </Button>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      テンプレート情報が設定されていません
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 参加者タブ */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              参加者一覧 ({participants.length}名)
            </Typography>
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<PeopleIcon />}
                onClick={() => navigate(`/sessions/${session.id}/participants`)}
              >
                参加者管理
              </Button>
            )}
          </Box>
          {participants.length > 0 ? (
            <List>
              {participants.map((participant: any, index: number) => (
                <React.Fragment key={participant.id || participant.userId || index}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar src={participant.avatar}>
                        {participant.name?.[0] || '?'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={participant.name || '名前未設定'}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {participant.email || 'メール未設定'} | {participant.role || '役割未設定'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            招待日: {formatDate(participant.invitedAt)}
                            {participant.joinedAt && ` | 参加日: ${formatDate(participant.joinedAt)}`}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={participant.hasSubmitted ? '提出済み' : '未提出'}
                        color={participant.hasSubmitted ? 'success' : 'default'}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < participants.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              参加者がいません
            </Typography>
          )}
        </TabPanel>

        {/* 評価結果タブ */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              評価結果 ({session.evaluations?.length || 0}件)
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={() => navigate(`/sessions/${session.id}/results`)}
            >
              詳細分析を表示
            </Button>
          </Box>
          {session.evaluations && session.evaluations.length > 0 ? (
            <List>
              {session.evaluations.map((evaluation, index) => (
                <React.Fragment key={evaluation.id}>
                  <ListItem>
                    <ListItemText
                      primary={evaluation.evaluatorName}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            提出日: {formatDate(evaluation.submittedAt)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            コメント数: {evaluation.commentCount}件
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={`${evaluation.overallScore}点`}
                        color="primary"
                        variant="outlined"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  {session.evaluations && index < session.evaluations.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              まだ評価結果がありません
            </Typography>
          )}
        </TabPanel>

        {/* 設定タブ */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            セッション設定
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="匿名評価"
                secondary="評価者の名前を他の参加者に表示しない"
              />
              <ListItemSecondaryAction>
                <Chip
                  label={session.settings.isAnonymous ? '有効' : '無効'}
                  color={session.settings.isAnonymous ? 'success' : 'default'}
                  size="small"
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="提出後結果表示"
                secondary="評価提出後に他の評価結果を表示する"
              />
              <ListItemSecondaryAction>
                <Chip
                  label={session.settings.showResultsAfterSubmit ? '有効' : '無効'}
                  color={session.settings.showResultsAfterSubmit ? 'success' : 'default'}
                  size="small"
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="コメント機能"
                secondary="タイムライン連動コメントを許可する"
              />
              <ListItemSecondaryAction>
                <Chip
                  label={session.settings.allowComments ? '有効' : '無効'}
                  color={session.settings.allowComments ? 'success' : 'default'}
                  size="small"
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default SessionDetailPage;