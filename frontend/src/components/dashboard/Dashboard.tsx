import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Chip,
  Paper,
  useTheme,
  LinearProgress,
  Avatar,
  Badge,
  IconButton,
  Tooltip,
  Alert,
  Divider,
  useMediaQuery,
} from '@mui/material';
import {
  VideoLibrary,
  Assessment,
  Group,
  Settings,
  TrendingUp,
  PlayArrow,
  Add,
  Notifications,
  Schedule,
  CheckCircle,
  Warning,
  Error,
  Info,
  Star,
  Timeline,
  Share,
  Comment,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';

// 通知の型定義
interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

// 統計データの型定義
interface DashboardStats {
  totalVideos: number;
  completedEvaluations: number;
  activeSessions: number;
  pendingTasks: number;
  averageScore: number;
  recentActivity: number;
}

// セッション情報の型定義
interface SessionInfo {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'completed' | 'overdue';
  progress: number;
  deadline: string;
  participantCount: number;
  submittedCount: number;
  priority: 'high' | 'medium' | 'low';
}

// アクティビティの型定義
interface Activity {
  id: string;
  type: 'evaluation' | 'video' | 'session' | 'template' | 'comment';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactElement;
  user?: {
    name: string;
    avatar?: string;
  };
  actionUrl?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, hasAnyRole } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalVideos: 0,
    completedEvaluations: 0,
    activeSessions: 0,
    pendingTasks: 0,
    averageScore: 0,
    recentActivity: 0,
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeSessions, setActiveSessions] = useState<SessionInfo[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // データの取得
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      // TODO: API呼び出し
      // const response = await apiClient.get('/api/dashboard');
      // setStats(response.data.stats);
      // setNotifications(response.data.notifications);
      // setActiveSessions(response.data.activeSessions);
      // setRecentActivities(response.data.recentActivities);

      // モックデータ
      const mockStats: DashboardStats = {
        totalVideos: 24,
        completedEvaluations: 12,
        activeSessions: 3,
        pendingTasks: 5,
        averageScore: 82.5,
        recentActivity: 8,
      };

      const mockNotifications: Notification[] = [
        {
          id: 'notif1',
          type: 'warning',
          title: '評価期限が近づいています',
          message: '「春祭り2024」の評価期限まで残り2日です',
          timestamp: '2024-08-10T10:00:00Z',
          isRead: false,
          actionUrl: '/sessions/1/evaluate',
        },
        {
          id: 'notif2',
          type: 'info',
          title: '新しいコメントが投稿されました',
          message: '「地区大会予選」にフィードバックが追加されました',
          timestamp: '2024-08-10T08:30:00Z',
          isRead: false,
          actionUrl: '/sessions/2/sharing',
        },
        {
          id: 'notif3',
          type: 'success',
          title: '評価が完了しました',
          message: '「夏の舞」の評価を正常に提出しました',
          timestamp: '2024-08-09T16:45:00Z',
          isRead: true,
        },
      ];

      const mockActiveSessions: SessionInfo[] = [
        {
          id: '1',
          name: '地区大会予選',
          status: 'active',
          progress: 75,
          deadline: '2024-08-15T23:59:59Z',
          participantCount: 5,
          submittedCount: 4,
          priority: 'high',
        },
        {
          id: '2',
          name: '春祭り2024',
          status: 'pending',
          progress: 25,
          deadline: '2024-08-20T23:59:59Z',
          participantCount: 3,
          submittedCount: 1,
          priority: 'medium',
        },
        {
          id: '3',
          name: '新人チーム評価',
          status: 'overdue',
          progress: 60,
          deadline: '2024-08-08T23:59:59Z',
          participantCount: 4,
          submittedCount: 2,
          priority: 'high',
        },
      ];

      const mockActivities: Activity[] = [
        {
          id: 'act1',
          type: 'evaluation',
          title: '評価を完了',
          description: '「春祭り2024」の評価を提出しました',
          timestamp: '2024-08-10T14:30:00Z',
          icon: <Assessment />,
          user: { name: user?.profile?.displayName || user?.username || 'あなた' },
          actionUrl: '/sessions/1/results',
        },
        {
          id: 'act2',
          type: 'video',
          title: '新しい動画が登録されました',
          description: '「夏の舞 - 青春チーム」が追加されました',
          timestamp: '2024-08-10T11:15:00Z',
          icon: <VideoLibrary />,
          user: { name: '管理者' },
          actionUrl: '/videos/5',
        },
        {
          id: 'act3',
          type: 'comment',
          title: 'フィードバックが投稿されました',
          description: '「地区大会予選」に新しいコメントが追加されました',
          timestamp: '2024-08-10T09:45:00Z',
          icon: <Comment />,
          user: { name: '田中審査員' },
          actionUrl: '/sessions/2/sharing',
        },
        {
          id: 'act4',
          type: 'session',
          title: 'セッションが開始されました',
          description: '「新人チーム評価」の評価期間が始まりました',
          timestamp: '2024-08-09T18:00:00Z',
          icon: <Group />,
          user: { name: '佐藤指導者' },
          actionUrl: '/sessions/3',
        },
        {
          id: 'act5',
          type: 'template',
          title: 'テンプレートが更新されました',
          description: '「本祭評価テンプレート」が改訂されました',
          timestamp: '2024-08-09T15:20:00Z',
          icon: <Settings />,
          user: { name: '管理者' },
          actionUrl: '/templates/1',
        },
      ];

      setStats(mockStats);
      setNotifications(mockNotifications);
      setActiveSessions(mockActiveSessions);
      setRecentActivities(mockActivities);
    } catch (error) {
      console.error('Dashboard data fetch failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // クイックアクション項目
  const quickActions = [
    {
      title: '動画を登録',
      description: '新しい演舞動画を登録',
      icon: <VideoLibrary />,
      action: () => navigate('/videos'),
      color: 'primary' as const,
    },
    {
      title: '評価を開始',
      description: '割り当てられた評価を実行',
      icon: <Assessment />,
      action: () => navigate('/evaluations'),
      color: 'secondary' as const,
    },
    {
      title: 'セッション管理',
      description: '評価セッションを管理',
      icon: <Group />,
      action: () => navigate('/sessions'),
      color: 'success' as const,
      roles: [UserRole.ADMIN, UserRole.EVALUATOR],
    },
    {
      title: 'テンプレート管理',
      description: '評価テンプレートを管理',
      icon: <Settings />,
      action: () => navigate('/templates'),
      color: 'info' as const,
      roles: [UserRole.ADMIN, UserRole.EVALUATOR],
    },
    {
      title: '分析・結果',
      description: '評価結果を分析',
      icon: <TrendingUp />,
      action: () => navigate('/analytics'),
      color: 'warning' as const,
      roles: [UserRole.ADMIN, UserRole.EVALUATOR],
    },
    {
      title: '共有・フィードバック',
      description: '結果を共有・議論',
      icon: <Share />,
      action: () => navigate('/sharing'),
      color: 'secondary' as const,
    },
  ];

  // ユーザーがアクセス可能なクイックアクションをフィルタリング
  const visibleQuickActions = quickActions.filter(action => {
    if (action.roles && !hasAnyRole(action.roles)) return false;
    return true;
  });

  // 通知アイコンの取得
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'error':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'success':
        return <CheckCircle color="success" />;
      default:
        return <Info color="info" />;
    }
  };

  // 通知の既読処理
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      // TODO: API呼び出し
      // await apiClient.put(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // 時間フォーマット
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}分前`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}時間前`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}日前`;
    }
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: SessionInfo['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'completed':
        return 'info';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: SessionInfo['status']) => {
    switch (status) {
      case 'active':
        return '進行中';
      case 'pending':
        return '待機中';
      case 'completed':
        return '完了';
      case 'overdue':
        return '期限超過';
      default:
        return '不明';
    }
  };

  const getPriorityColor = (priority: SessionInfo['priority']) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* ウェルカムメッセージ */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom>
                おかえりなさい、{user?.profile?.displayName || user?.username}さん
              </Typography>
              <Typography variant='body1' sx={{ opacity: 0.9 }}>
                よさこい演舞評価システムへようこそ。今日も素晴らしい評価活動を始めましょう。
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="更新">
                <IconButton 
                  onClick={fetchDashboardData} 
                  sx={{ color: 'white' }}
                  disabled={isLoading}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Badge badgeContent={unreadNotificationCount} color="error">
                <IconButton sx={{ color: 'white' }}>
                  <Notifications />
                </IconButton>
              </Badge>
            </Box>
          </Box>
          
          {/* 簡易統計 */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{stats.completedEvaluations}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>完了評価</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{stats.pendingTasks}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>保留タスク</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{stats.averageScore.toFixed(1)}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>平均スコア</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{stats.recentActivity}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>今日の活動</Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
        
        {/* 背景装飾 */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            zIndex: 0,
          }}
        />
      </Paper>

      <Grid container spacing={3}>
        {/* 通知・アラート */}
        {unreadNotificationCount > 0 && (
          <Grid item xs={12}>
            <Alert 
              severity="info" 
              sx={{ mb: 0 }}
              action={
                <Button color="inherit" size="small">
                  すべて表示
                </Button>
              }
            >
              {unreadNotificationCount}件の未読通知があります
            </Alert>
          </Grid>
        )}

        {/* クイックアクション */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                クイックアクション
              </Typography>
              <Grid container spacing={2}>
                {visibleQuickActions.map((action, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Button
                      fullWidth
                      variant='outlined'
                      color={action.color}
                      startIcon={action.icon}
                      onClick={action.action}
                      sx={{
                        height: isMobile ? 70 : 80,
                        flexDirection: 'column',
                        gap: 0.5,
                        textTransform: 'none',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 2,
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      <Typography variant='subtitle2' sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                        {action.title}
                      </Typography>
                      <Typography variant='caption' color='text.secondary' sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
                        {action.description}
                      </Typography>
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 統計情報 */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                統計情報
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VideoLibrary color='primary' />
                    <Typography variant='body2'>登録動画数</Typography>
                  </Box>
                  <Typography variant='h6'>{stats.totalVideos}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assessment color='secondary' />
                    <Typography variant='body2'>完了評価数</Typography>
                  </Box>
                  <Typography variant='h6'>{stats.completedEvaluations}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Group color='success' />
                    <Typography variant='body2'>進行中セッション</Typography>
                  </Box>
                  <Typography variant='h6'>{stats.activeSessions}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Star color='warning' />
                    <Typography variant='body2'>平均スコア</Typography>
                  </Box>
                  <Typography variant='h6'>{stats.averageScore.toFixed(1)}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 進行中のセッション */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant='h6'>
                  進行中のセッション
                </Typography>
                <Chip 
                  label={`${activeSessions.length}件`} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
              </Box>
              
              {activeSessions.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {activeSessions.map((session, index) => (
                    <React.Fragment key={session.id}>
                      <ListItem
                        button
                        onClick={() => navigate(`/sessions/${session.id}`)}
                        sx={{ 
                          px: 0,
                          '&:hover': { backgroundColor: 'action.hover' },
                          borderRadius: 1,
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: getStatusColor(session.status) + '.main' }}>
                            <PlayArrow />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2">{session.name}</Typography>
                              {session.priority === 'high' && (
                                <Chip label="高" size="small" color="error" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                締切: {formatDate(session.deadline)} | {session.submittedCount}/{session.participantCount}名提出
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={session.progress} 
                                sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                                color={session.status === 'overdue' ? 'error' : 'primary'}
                              />
                            </Box>
                          }
                        />
                        <Chip
                          label={getStatusLabel(session.status)}
                          color={getStatusColor(session.status) as any}
                          size='small'
                        />
                      </ListItem>
                      {index < activeSessions.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Schedule sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    進行中のセッションはありません
                  </Typography>
                </Box>
              )}
              
              <Button
                fullWidth
                variant='outlined'
                startIcon={<Add />}
                onClick={() => navigate('/sessions')}
                sx={{ mt: 2 }}
              >
                すべてのセッションを見る
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* 最近のアクティビティ */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant='h6'>
                  最近のアクティビティ
                </Typography>
                <Chip 
                  label={`${recentActivities.length}件`} 
                  size="small" 
                  color="secondary" 
                  variant="outlined" 
                />
              </Box>
              
              {recentActivities.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {recentActivities.slice(0, 5).map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem
                        button={!!activity.actionUrl}
                        onClick={() => activity.actionUrl && navigate(activity.actionUrl)}
                        sx={{ 
                          px: 0,
                          '&:hover': activity.actionUrl ? { backgroundColor: 'action.hover' } : {},
                          borderRadius: 1,
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            {React.cloneElement(activity.icon, { sx: { fontSize: 18 } })}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {activity.title}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {activity.description}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                {activity.user?.name} • {formatTimeAgo(activity.timestamp)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < Math.min(recentActivities.length, 5) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Timeline sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    最近のアクティビティはありません
                  </Typography>
                </Box>
              )}
              
              <Button
                fullWidth
                variant='outlined'
                startIcon={<TrendingUp />}
                onClick={() => navigate('/analytics')}
                sx={{ mt: 2 }}
              >
                詳細な分析を見る
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* 通知センター */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant='h6'>
                  通知センター
                </Typography>
                <Badge badgeContent={unreadNotificationCount} color="error">
                  <Notifications />
                </Badge>
              </Box>
              
              {notifications.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {notifications.slice(0, 3).map((notification, index) => (
                    <React.Fragment key={notification.id}>
                      <ListItem
                        button={!!notification.actionUrl}
                        onClick={() => {
                          if (notification.actionUrl) {
                            navigate(notification.actionUrl);
                            markNotificationAsRead(notification.id);
                          }
                        }}
                        sx={{ 
                          px: 0,
                          opacity: notification.isRead ? 0.7 : 1,
                          backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                          borderRadius: 1,
                          mb: 0.5,
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'transparent' }}>
                            {getNotificationIcon(notification.type)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: notification.isRead ? 400 : 600 }}>
                              {notification.title}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {notification.message}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                {formatTimeAgo(notification.timestamp)}
                              </Typography>
                            </Box>
                          }
                        />
                        {!notification.isRead && (
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                        )}
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Notifications sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    新しい通知はありません
                  </Typography>
                </Box>
              )}
              
              {notifications.length > 3 && (
                <Button
                  fullWidth
                  variant='outlined'
                  sx={{ mt: 2 }}
                >
                  すべての通知を見る
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
