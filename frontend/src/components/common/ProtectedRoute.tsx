import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth, UserRole } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  adminOnly?: boolean;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  adminOnly = false,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isLoading, user, hasRole, hasAnyRole } = useAuth();
  const location = useLocation();
  
  // デバッグログ
  console.log('ProtectedRoute - path:', location.pathname, 'isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  // ローディング中の表示
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant='body2' color='text.secondary'>
          認証状態を確認中...
        </Typography>
      </Box>
    );
  }

  // 未認証の場合はログインページにリダイレクト
  if (!isAuthenticated) {
    // ディープリンク対応: 元のURLを保存
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 管理者権限が必要な場合のチェック
  if (adminOnly && !hasRole(UserRole.ADMIN)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant='h5' color='error'>
          アクセス権限がありません
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          この機能は管理者のみが利用できます。
        </Typography>
      </Box>
    );
  }

  // 特定のロールが必要な場合のチェック
  if (requiredRoles && requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant='h5' color='error'>
          アクセス権限がありません
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          この機能を利用するには適切な権限が必要です。
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          現在のロール: {user?.role}
        </Typography>
      </Box>
    );
  }

  // 認証済みかつ権限がある場合は子コンポーネントを表示
  return <>{children}</>;
};

export default ProtectedRoute;
