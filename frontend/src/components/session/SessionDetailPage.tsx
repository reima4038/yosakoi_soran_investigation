import React, { useState, useEffect } from 'react';
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

// セッション詳細の型定義
interface SessionDetail {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  startDate: string;
  endDate: string;
  video: {
    id: string;
    title: string;
    youtubeId: string;
    thumbnailUrl: string;
    duration: string;
  };
  template: {
    id: string;
    name: string;
    description: string;
    categoryCount: number;
    criteriaCount: number;
  };
  participants: Array<{
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
  evaluations: Array<{
    id: string;
    evaluatorName: string;
    submittedAt: string;
    overallScore: number;
    commentCount: number;
  }>;
  createdAt: string;
  creatorName: string;
  settings: {
    isAnonymous: boolean;
    showResultsAfterSubmit: boolean;
    allowComments: boolean;
  };
}

const SessionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, hasAnyRole } = useAuth();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // セッション詳細の取得
  useEffect(() => {
    if (id) {
      fetchSessionDetail(id);
    }
  }, [id]);

  const fetchSessionDetail = async (sessionId: string) => {
    try {
      setIsLoading(true);
      // TODO: API呼び出し
      // const response = await apiClient.get(`/api/sessions/${sessionId}`);
      // setSession(response.data);

      // モックデータ
      const mockSession: SessionDetail = {
        id: sessionId,
        name: '第45回よさこい祭り 本祭評価',
        description: '本祭での各チームの演舞を評価します。技術面、表現力、構成などを総合的に評価してください。',
        status: 'active',
        startDate: '2024-08-01T09:00:00Z',
        endDate: '2024-08-15T23:59:59Z',
        video: {
          id: 'video1',
          title: '鳴子踊り - 伝統チーム',
          youtubeId: 'dQw4w9WgXcQ',
          thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
          duration: '4:32',
        },
        template: {
          id: 'template1',
          name: '本祭評価テンプレート',
          description: '本祭での演舞評価用の標準テンプレート',
          categoryCount: 4,
          criteriaCount: 12,
        },
        participants: [
          {
            id: '1',
            name: '田中審査員',
            email: 'tanaka@example.com',
            role: '主審査員',
            hasSubmitted: true,
            submittedAt: '2024-08-03T14:30:00Z',
            invitedAt: '2024-07-25T10:00:00Z',
            joinedAt: '2024-07-26T09:15:00Z',
          },
          {
            id: '2',
            name: '佐藤指導者',
            email: 'sato@example.com',
            role: '指導者',
            hasSubmitted: true,
            submittedAt: '2024-08-04T16:45:00Z',
            invitedAt: '2024-07-25T10:00:00Z',
            joinedAt: '2024-07-25T11:30:00Z',
          },
          {
            id: '3',
            name: '山田評価者',
            email: 'yamada@example.com',
            role: '評価者',
            hasSubmitted: true,
            submittedAt: '2024-08-05T10:20:00Z',
            invitedAt: '2024-07-25T10:00:00Z',
            joinedAt: '2024-07-27T13:45:00Z',
          },
          {
            id: '4',
            name: '鈴木審査員',
            email: 'suzuki@example.com',
            role: '審査員',
            hasSubmitted: false,
            invitedAt: '2024-07-25T10:00:00Z',
            joinedAt: '2024-07-28T08:20:00Z',
          },
          {
            id: '5',
            name: '高橋指導者',
            email: 'takahashi@example.com',
            role: '指導者',
            hasSubmitted: false,
            invitedAt: '2024-07-25T10:00:00Z',
          },
        ],
        evaluations: [
          {
            id: 'eval1',
            evaluatorName: '田中審査員',
            submittedAt: '2024-08-03T14:30:00Z',
            overallScore: 85,
            commentCount: 12,
          },
          {
            id: 'eval2',
            evaluatorName: '佐藤指導者',
            submittedAt: '2024-08-04T16:45:00Z',
            overallScore: 78,
            commentCount: 8,
          },
          {
            id: 'eval3',
            evaluatorName: '山田評価者',
            submittedAt: '2024-08-05T10:20:00Z',
            overallScore: 82,
            commentCount: 15,
          },
        ],
        createdAt: '2024-07-25T10:00:00Z',
        creatorName: '管理者',
        settings: {
          isAnonymous: false,
          showResultsAfterSubmit: true,
          allowComments: true,
        },
      };
      setSession(mockSession);
    } catch (error: any) {
      setError('セッション詳細の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ステータス表示用の設定
  const getStatusConfig = (status: SessionDetail['status']) => {
    switch (status) {
      case 'draft':
        return { label: '下書き', color: 'default' as const, icon: <EditIcon /> };
      case 'active':
        return { label: '進行中', color: 'primary' as const, icon: <PlayArrowIcon /> };
      case 'completed':
        return { label: '完了', color: 'success' as const, icon: <CheckCircleIcon /> };
      case 'archived':
        return { label: 'アーカイブ', color: 'secondary' as const, icon: <ScheduleIcon /> };
      default:
        return { label: '不明', color: 'default' as const, icon: <ScheduleIcon /> };
    }
  };

  // 進捗率の計算
  const getProgressPercentage = (session: SessionDetail) => {
    const submittedCount = session.participants.filter(p => p.hasSubmitted).length;
    if (session.participants.length === 0) return 0;
    return Math.round((submittedCount / session.participants.length) * 100);
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

  // タブ変更
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 編集権限の確認
  const canEdit = hasAnyRole([UserRole.ADMIN, UserRole.EVALUATOR]);

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          セッション詳細を読み込み中...
        </Typography>
      </Box>
    );
  }

  if (error || !session) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'セッションが見つかりません'}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/sessions')}
          sx={{ mt: 2 }}
        >
          セッション一覧に戻る
        </Button>
      </Box>
    );
  }

  const statusConfig = getStatusConfig(session.status);
  const progressPercentage = getProgressPercentage(session);
  const submittedCount = session.participants.filter(p => p.hasSubmitted).length;

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
              作成者: {session.creatorName} | 作成日: {formatDate(session.createdAt)}
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
                  {submittedCount}/{session.participants.length}
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
                      <Typography variant="body2" color="text.secondary">
                        再生時間: {session.video.duration}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => navigate(`/videos/${session.video.id}`)}
                    fullWidth
                  >
                    動画を表示
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    評価テンプレート
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    {session.template.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {session.template.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Chip label={`${session.template.categoryCount} カテゴリ`} size="small" />
                    <Chip label={`${session.template.criteriaCount} 評価項目`} size="small" />
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={() => navigate(`/templates/${session.template.id}`)}
                    fullWidth
                  >
                    テンプレートを表示
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 参加者タブ */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              参加者一覧 ({session.participants.length}名)
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
          <List>
            {session.participants.map((participant, index) => (
              <React.Fragment key={participant.id}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar src={participant.avatar}>
                      {participant.name[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={participant.name}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {participant.email} | {participant.role}
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
                {index < session.participants.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </TabPanel>

        {/* 評価結果タブ */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              評価結果 ({session.evaluations.length}件)
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={() => navigate(`/sessions/${session.id}/results`)}
            >
              詳細分析を表示
            </Button>
          </Box>
          {session.evaluations.length > 0 ? (
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
                  {index < session.evaluations.length - 1 && <Divider />}
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