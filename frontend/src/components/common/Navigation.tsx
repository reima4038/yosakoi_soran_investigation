import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  VideoLibrary,
  Assessment,
  Group,
  Settings,
  Dashboard,
  AccountCircle,
  Logout,
  Login,
  PersonAdd,
  Notifications,
  Share,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ReactElement;
  roles?: UserRole[];
  adminOnly?: boolean;
  description?: string;
}

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isAuthenticated, logout, hasRole, hasAnyRole } = useAuth();

  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] =
    React.useState<null | HTMLElement>(null);
  const [userMenuAnchorEl, setUserMenuAnchorEl] =
    React.useState<null | HTMLElement>(null);

  // メニュー項目の定義（ロールベースのアクセス制御付き）
  const navigationItems: NavigationItem[] = [
    { 
      path: '/dashboard', 
      label: 'ダッシュボード', 
      icon: <Dashboard />,
      description: 'メインダッシュボード'
    },
    { 
      path: '/videos', 
      label: '動画管理', 
      icon: <VideoLibrary />,
      description: 'YouTube動画の登録・管理'
    },
    {
      path: '/sessions',
      label: 'セッション管理',
      icon: <Group />,
      roles: [UserRole.ADMIN, UserRole.EVALUATOR],
      description: '評価セッションの作成・管理'
    },
    {
      path: '/templates',
      label: 'テンプレート管理',
      icon: <Settings />,
      roles: [UserRole.ADMIN, UserRole.EVALUATOR],
      description: '評価テンプレートの作成・編集'
    },
    { 
      path: '/evaluations', 
      label: '評価実行', 
      icon: <Assessment />,
      description: '演舞動画の評価実行'
    },
    {
      path: '/analytics',
      label: '分析・結果',
      icon: <Assessment />,
      roles: [UserRole.ADMIN, UserRole.EVALUATOR],
      description: '評価結果の分析・可視化'
    },
    {
      path: '/sharing',
      label: '共有・フィードバック',
      icon: <Share />,
      description: '評価結果の共有とフィードバック'
    },
  ];

  // ユーザーがアクセス可能なメニュー項目をフィルタリング
  const getVisibleMenuItems = (): NavigationItem[] => {
    if (!isAuthenticated) return [];

    return navigationItems.filter(item => {
      if (item.adminOnly && !hasRole(UserRole.ADMIN)) return false;
      if (item.roles && !hasAnyRole(item.roles)) return false;
      return true;
    });
  };

  const visibleMenuItems = getVisibleMenuItems();

  // モバイルメニューの制御
  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchorEl(null);
  };

  // ユーザーメニューの制御
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  // ナビゲーション処理
  const handleNavigate = (path: string) => {
    navigate(path);
    handleMobileMenuClose();
  };

  // ログアウト処理
  const handleLogout = () => {
    logout();
    handleUserMenuClose();
    navigate('/login');
  };

  // ロール表示用のラベル
  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case UserRole.ADMIN:
        return '管理者';
      case UserRole.EVALUATOR:
        return '評価者';
      case UserRole.USER:
        return 'ユーザー';
      default:
        return '';
    }
  };

  // ロール表示用の色
  const getRoleColor = (
    role: UserRole
  ): 'primary' | 'secondary' | 'default' => {
    switch (role) {
      case UserRole.ADMIN:
        return 'primary';
      case UserRole.EVALUATOR:
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <AppBar position='static' elevation={1}>
      <Toolbar>
        {/* ロゴ・タイトル */}
        <Typography
          variant='h6'
          component='div'
          sx={{
            flexGrow: isMobile ? 1 : 0,
            cursor: 'pointer',
            mr: isMobile ? 0 : 3,
          }}
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
        >
          よさこい演舞評価システム
        </Typography>

        {/* 認証済みユーザー向けナビゲーション */}
        {isAuthenticated && (
          <>
            {/* デスクトップ版メニュー */}
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
                {visibleMenuItems.map(item => {
                  const isActive = location.pathname === item.path || 
                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                  
                  return (
                    <Button
                      key={item.path}
                      color='inherit'
                      startIcon={item.icon}
                      onClick={() => handleNavigate(item.path)}
                      variant={isActive ? 'outlined' : 'text'}
                      title={item.description}
                      sx={{
                        borderColor: isActive ? 'white' : 'transparent',
                        backgroundColor: isActive 
                          ? 'rgba(255, 255, 255, 0.15)' 
                          : 'transparent',
                        fontWeight: isActive ? 600 : 400,
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                        '&:focus': {
                          outline: '2px solid rgba(255, 255, 255, 0.5)',
                          outlineOffset: '2px',
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </Box>
            )}

            {/* ユーザー情報とメニュー */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* 通知アイコン（将来の実装用） */}
              <IconButton 
                color='inherit' 
                size='small'
                title='通知'
                aria-label='通知を表示'
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '&:focus': {
                    outline: '2px solid rgba(255, 255, 255, 0.5)',
                    outlineOffset: '2px',
                  },
                }}
              >
                <Notifications />
              </IconButton>

              {/* ユーザーロール表示 */}
              {user && !isMobile && (
                <Chip
                  label={getRoleLabel(user.role)}
                  size='small'
                  color={getRoleColor(user.role)}
                  variant='outlined'
                  title={`現在のロール: ${getRoleLabel(user.role)}`}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                />
              )}

              {/* ユーザーアバターとメニュー */}
              <IconButton
                onClick={handleUserMenuOpen}
                size='small'
                aria-label='ユーザーメニューを開く'
                title={`${user?.profile?.displayName || user?.username}のメニュー`}
                sx={{ 
                  ml: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '&:focus': {
                    outline: '2px solid rgba(255, 255, 255, 0.5)',
                    outlineOffset: '2px',
                  },
                }}
              >
                <Avatar
                  src={user?.profile?.avatar}
                  sx={{ 
                    width: 32, 
                    height: 32,
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    transition: 'border-color 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.6)',
                    },
                  }}
                >
                  {user?.profile?.displayName?.[0] ||
                    user?.username?.[0] ||
                    'U'}
                </Avatar>
              </IconButton>

              {/* モバイル版ハンバーガーメニュー */}
              {isMobile && (
                <IconButton
                  size='large'
                  edge='end'
                  color='inherit'
                  aria-label='メインメニューを開く'
                  title='メニュー'
                  onClick={handleMobileMenuOpen}
                  sx={{ 
                    ml: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&:focus': {
                      outline: '2px solid rgba(255, 255, 255, 0.5)',
                      outlineOffset: '2px',
                    },
                  }}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Box>
          </>
        )}

        {/* 未認証ユーザー向けボタン */}
        {!isAuthenticated && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              color='inherit'
              startIcon={<Login />}
              onClick={() => navigate('/login')}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
                '&:focus': {
                  outline: '2px solid rgba(255, 255, 255, 0.5)',
                  outlineOffset: '2px',
                },
              }}
            >
              ログイン
            </Button>
            <Button
              color='inherit'
              startIcon={<PersonAdd />}
              onClick={() => navigate('/register')}
              variant='outlined'
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'white',
                },
                '&:focus': {
                  outline: '2px solid rgba(255, 255, 255, 0.5)',
                  outlineOffset: '2px',
                },
              }}
            >
              登録
            </Button>
          </Box>
        )}

        {/* モバイル版メインメニュー */}
        <Menu
          anchorEl={mobileMenuAnchorEl}
          open={Boolean(mobileMenuAnchorEl)}
          onClose={handleMobileMenuClose}
          PaperProps={{
            sx: { 
              minWidth: 280,
              maxWidth: 320,
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {visibleMenuItems.map(item => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            
            return (
              <MenuItem
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                selected={isActive}
                sx={{
                  minHeight: 56,
                  backgroundColor: isActive 
                    ? 'rgba(25, 118, 210, 0.08)' 
                    : 'transparent',
                  borderLeft: isActive 
                    ? '4px solid #1976d2' 
                    : '4px solid transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                  },
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: isActive ? 'primary.main' : 'inherit',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  secondary={item.description}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'primary.main' : 'inherit',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                  }}
                />
              </MenuItem>
            );
          })}
        </Menu>

        {/* ユーザーメニュー */}
        <Menu
          anchorEl={userMenuAnchorEl}
          open={Boolean(userMenuAnchorEl)}
          onClose={handleUserMenuClose}
          PaperProps={{
            sx: { minWidth: 200 },
          }}
        >
          {/* ユーザー情報表示 */}
          <MenuItem disabled>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <Typography variant='subtitle2'>
                {user?.profile?.displayName || user?.username}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {user?.email}
              </Typography>
              {user && (
                <Chip
                  label={getRoleLabel(user.role)}
                  size='small'
                  color={getRoleColor(user.role)}
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
          </MenuItem>

          <Divider />

          {/* プロフィール */}
          <MenuItem
            onClick={() => {
              handleNavigate('/profile');
              handleUserMenuClose();
            }}
          >
            <ListItemIcon>
              <AccountCircle />
            </ListItemIcon>
            <ListItemText primary='プロフィール' />
          </MenuItem>

          <Divider />

          {/* ログアウト */}
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            <ListItemText primary='ログアウト' />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
