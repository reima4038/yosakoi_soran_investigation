import React from 'react';
import {
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  Typography,
  Box,
  useTheme,
} from '@mui/material';
import {
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// パンくずアイテムの型定義
interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactElement;
}

// ルートマッピング
const routeMapping: Record<string, string> = {
  '/dashboard': 'ダッシュボード',
  '/videos': '動画管理',
  '/sessions': 'セッション管理',
  '/templates': 'テンプレート管理',
  '/analytics': '分析・結果',
  '/sharing': '共有・フィードバック',
  '/profile': 'プロフィール',
  '/login': 'ログイン',
  '/register': 'ユーザー登録',
  '/password-reset': 'パスワードリセット',
};

// 動的ルートのパターン
const dynamicRoutePatterns = [
  { pattern: /^\/videos\/(.+)$/, label: '動画詳細' },
  { pattern: /^\/sessions\/(.+)\/evaluate$/, label: '評価実行' },
  { pattern: /^\/sessions\/(.+)\/results$/, label: '評価結果' },
  { pattern: /^\/sessions\/(.+)\/sharing$/, label: '共有設定' },
  { pattern: /^\/sessions\/(.+)\/participants$/, label: '参加者管理' },
  { pattern: /^\/sessions\/(.+)\/edit$/, label: 'セッション編集' },
  { pattern: /^\/sessions\/(.+)$/, label: 'セッション詳細' },
  { pattern: /^\/templates\/create$/, label: 'テンプレート作成' },
  { pattern: /^\/templates\/(.+)\/edit$/, label: 'テンプレート編集' },
  { pattern: /^\/templates\/(.+)$/, label: 'テンプレート詳細' },
];

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const theme = useTheme();
  const { isAuthenticated } = useAuth();

  // パンくずアイテムを生成
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter(x => x);
    const breadcrumbs: BreadcrumbItem[] = [];

    // ホーム/ダッシュボードを追加
    if (isAuthenticated) {
      breadcrumbs.push({
        label: 'ダッシュボード',
        path: '/dashboard',
        icon: <HomeIcon sx={{ fontSize: 16 }} />,
      });
    }

    // 現在のパスを解析
    let currentPath = '';
    
    for (let i = 0; i < pathnames.length; i++) {
      currentPath += `/${pathnames[i]}`;
      
      // 静的ルートをチェック
      if (routeMapping[currentPath]) {
        // ダッシュボードは既に追加済みなのでスキップ
        if (currentPath === '/dashboard') continue;
        
        breadcrumbs.push({
          label: routeMapping[currentPath],
          path: i === pathnames.length - 1 ? undefined : currentPath,
        });
      } else {
        // 動的ルートをチェック
        let matched = false;
        for (const { pattern, label } of dynamicRoutePatterns) {
          if (pattern.test(currentPath)) {
            breadcrumbs.push({
              label,
              path: i === pathnames.length - 1 ? undefined : currentPath,
            });
            matched = true;
            break;
          }
        }
        
        // マッチしない場合は、パス名をそのまま使用
        if (!matched && i === pathnames.length - 1) {
          breadcrumbs.push({
            label: pathnames[i],
          });
        }
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // ホームページや認証ページではパンくずを表示しない
  if (
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/password-reset' ||
    breadcrumbs.length <= 1
  ) {
    return null;
  }

  return (
    <Box
      sx={{
        py: 1,
        px: { xs: 2, sm: 3 },
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <MuiBreadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            color: theme.palette.text.secondary,
          },
        }}
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          if (isLast || !item.path) {
            return (
              <Typography
                key={index}
                color="text.primary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontWeight: 500,
                }}
              >
                {item.icon}
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={index}
              component={RouterLink}
              to={item.path}
              underline="hover"
              color="inherit"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': {
                  color: theme.palette.primary.main,
                },
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};

export default Breadcrumbs;