import React from 'react';
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
  Chip,
  Paper,
  useTheme,
} from '@mui/material';
import {
  VideoLibrary,
  Assessment,
  Group,
  Settings,
  TrendingUp,
  PlayArrow,
  Add,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  // const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, hasAnyRole } = useAuth();

  // クイックアクション項目
  const quickActions = [
    {
      title: '動画を登録',
      description: '新しい演舞動画を登録',
      icon: <VideoLibrary />,
      action: () => navigate('/videos/new'),
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
      title: 'セッション作成',
      description: '新しい評価セッションを作成',
      icon: <Group />,
      action: () => navigate('/sessions/new'),
      color: 'success' as const,
      roles: [UserRole.ADMIN, UserRole.EVALUATOR],
    },
    {
      title: 'テンプレート作成',
      description: '評価テンプレートを作成',
      icon: <Settings />,
      action: () => navigate('/templates/new'),
      color: 'info' as const,
      roles: [UserRole.ADMIN, UserRole.EVALUATOR],
    },
  ];

  // ユーザーがアクセス可能なクイックアクションをフィルタリング
  const visibleQuickActions = quickActions.filter(action => {
    if (action.roles && !hasAnyRole(action.roles)) return false;
    return true;
  });

  // 最近のアクティビティ（モックデータ）
  const recentActivities = [
    {
      id: 1,
      type: 'evaluation',
      title: '「春祭り2024」の評価を完了',
      time: '2時間前',
      icon: <Assessment />,
    },
    {
      id: 2,
      type: 'video',
      title: '新しい動画「夏の舞」が登録されました',
      time: '4時間前',
      icon: <VideoLibrary />,
    },
    {
      id: 3,
      type: 'session',
      title: '評価セッション「地区大会予選」が開始されました',
      time: '1日前',
      icon: <Group />,
    },
  ];

  // 進行中のセッション（モックデータ）
  const activeSessions = [
    {
      id: 1,
      name: '地区大会予選',
      status: 'active',
      progress: 75,
      deadline: '2024-02-15',
    },
    {
      id: 2,
      name: '春祭り2024',
      status: 'pending',
      progress: 25,
      deadline: '2024-02-20',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '進行中';
      case 'pending':
        return '待機中';
      case 'completed':
        return '完了';
      default:
        return '不明';
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* ウェルカムメッセージ */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
        }}
      >
        <Typography variant='h4' gutterBottom>
          おかえりなさい、{user?.profile?.displayName || user?.username}さん
        </Typography>
        <Typography variant='body1' sx={{ opacity: 0.9 }}>
          よさこい演舞評価システムへようこそ。今日も素晴らしい評価活動を始めましょう。
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {/* クイックアクション */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                クイックアクション
              </Typography>
              <Grid container spacing={2}>
                {visibleQuickActions.map((action, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Button
                      fullWidth
                      variant='outlined'
                      color={action.color}
                      startIcon={action.icon}
                      onClick={action.action}
                      sx={{
                        height: 80,
                        flexDirection: 'column',
                        gap: 1,
                        textTransform: 'none',
                      }}
                    >
                      <Typography variant='subtitle2'>
                        {action.title}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
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
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                統計情報
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VideoLibrary color='primary' />
                  <Box>
                    <Typography variant='h6'>24</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      登録動画数
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment color='secondary' />
                  <Box>
                    <Typography variant='h6'>12</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      完了評価数
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Group color='success' />
                  <Box>
                    <Typography variant='h6'>3</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      進行中セッション
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 進行中のセッション */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                進行中のセッション
              </Typography>
              <List>
                {activeSessions.map(session => (
                  <ListItem
                    key={session.id}
                    button
                    onClick={() => navigate(`/sessions/${session.id}`)}
                  >
                    <ListItemIcon>
                      <PlayArrow />
                    </ListItemIcon>
                    <ListItemText
                      primary={session.name}
                      secondary={`締切: ${session.deadline} | 進捗: ${session.progress}%`}
                    />
                    <Chip
                      label={getStatusLabel(session.status)}
                      color={getStatusColor(session.status) as any}
                      size='small'
                    />
                  </ListItem>
                ))}
              </List>
              <Button
                fullWidth
                variant='outlined'
                startIcon={<Add />}
                onClick={() => navigate('/sessions')}
                sx={{ mt: 1 }}
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
              <Typography variant='h6' gutterBottom>
                最近のアクティビティ
              </Typography>
              <List>
                {recentActivities.map(activity => (
                  <ListItem key={activity.id}>
                    <ListItemIcon>{activity.icon}</ListItemIcon>
                    <ListItemText
                      primary={activity.title}
                      secondary={activity.time}
                    />
                  </ListItem>
                ))}
              </List>
              <Button
                fullWidth
                variant='outlined'
                startIcon={<TrendingUp />}
                onClick={() => navigate('/analytics')}
                sx={{ mt: 1 }}
              >
                詳細な分析を見る
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
