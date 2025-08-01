import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  Share as ShareIcon,
  ContentCopy,
  Edit,
  Delete,
  MoreVert,
  Visibility,
  VisibilityOff,
  Analytics,
  Public,
  Lock,
  Person,
  Schedule,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  shareService,
  Share,
  ShareAnalytics,
} from '../../services/shareService';
import ShareCreationForm from './ShareCreationForm';

interface ShareManagementProps {
  resourceType: 'session_results' | 'evaluation' | 'analysis';
  resourceId: string;
  resourceTitle: string;
}

const ShareManagement: React.FC<ShareManagementProps> = ({
  resourceType,
  resourceId,
  resourceTitle,
}) => {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedShare, setSelectedShare] = useState<Share | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<ShareAnalytics | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuShareId, setMenuShareId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    loadShares();
  }, [resourceType, resourceId]);

  const loadShares = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await shareService.getShares({ resourceType });
      // 現在のリソースに関連する共有のみフィルタ
      const filteredShares = result.shares.filter(
        share => share.resourceId === resourceId
      );
      setShares(filteredShares);
    } catch (err: any) {
      setError(err.response?.data?.message || '共有設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleShareCreated = (share: Share, shareUrl: string) => {
    setShares(prev => [share, ...prev]);
    // 共有URLをクリップボードにコピー
    navigator.clipboard.writeText(shareUrl);
    setCopySuccess('共有URLをクリップボードにコピーしました');
    setTimeout(() => setCopySuccess(null), 3000);
  };

  const handleCopyUrl = async (share: Share) => {
    const shareUrl = shareService.generateShareUrl(share.shareToken);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess('共有URLをクリップボードにコピーしました');
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (err) {
      setError('URLのコピーに失敗しました');
    }
  };

  const handleToggleShare = async (shareId: string) => {
    try {
      const result = await shareService.toggleShare(shareId);
      setShares(prev =>
        prev.map(share =>
          share._id === shareId
            ? { ...share, isActive: result.isActive }
            : share
        )
      );
      setAnchorEl(null);
    } catch (err: any) {
      setError(
        err.response?.data?.message || '共有設定の切り替えに失敗しました'
      );
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    if (!window.confirm('この共有設定を削除しますか？')) {
      return;
    }

    try {
      await shareService.deleteShare(shareId);
      setShares(prev => prev.filter(share => share._id !== shareId));
      setAnchorEl(null);
    } catch (err: any) {
      setError(err.response?.data?.message || '共有設定の削除に失敗しました');
    }
  };

  const handleShowAnalytics = async (share: Share) => {
    setSelectedShare(share);
    setShowAnalytics(true);
    try {
      const analyticsData = await shareService.getShareAnalytics(share._id);
      setAnalytics(analyticsData);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'アクセス統計の取得に失敗しました'
      );
    }
    setAnchorEl(null);
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    shareId: string
  ) => {
    setAnchorEl(event.currentTarget);
    setMenuShareId(shareId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuShareId(null);
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Public fontSize='small' />;
      case 'password_protected':
        return <Lock fontSize='small' />;
      case 'specific_users':
        return <Person fontSize='small' />;
      default:
        return <VisibilityOff fontSize='small' />;
    }
  };

  const getStatusColor = (share: Share) => {
    if (!share.isActive) return 'default';
    if (shareService.isExpired(share)) return 'error';
    return 'success';
  };

  const getStatusText = (share: Share) => {
    if (!share.isActive) return '無効';
    if (shareService.isExpired(share)) return '期限切れ';
    return 'アクティブ';
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress />
        <Typography variant='body2' sx={{ mt: 1 }}>
          共有設定を読み込み中...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant='h6'>共有設定</Typography>
        <Button
          variant='contained'
          startIcon={<ShareIcon />}
          onClick={() => setShowCreateForm(true)}
        >
          新しい共有を作成
        </Button>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {copySuccess && (
        <Alert severity='success' sx={{ mb: 2 }}>
          {copySuccess}
        </Alert>
      )}

      {shares.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <ShareIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant='h6' color='text.secondary' gutterBottom>
              共有設定がありません
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              このリソースはまだ共有されていません
            </Typography>
            <Button
              variant='outlined'
              startIcon={<ShareIcon />}
              onClick={() => setShowCreateForm(true)}
            >
              共有を作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {shares.map(share => (
            <Grid item xs={12} md={6} key={share._id}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getVisibilityIcon(share.visibility)}
                      <Typography variant='subtitle1'>
                        {shareService.getVisibilityText(share.visibility)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        size='small'
                        label={getStatusText(share)}
                        color={getStatusColor(share)}
                        icon={
                          share.isActive && !shareService.isExpired(share) ? (
                            <CheckCircle />
                          ) : (
                            <Error />
                          )
                        }
                      />
                      <IconButton
                        size='small'
                        onClick={e => handleMenuOpen(e, share._id)}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </Box>

                  <Typography
                    variant='body2'
                    color='text.secondary'
                    gutterBottom
                  >
                    作成日:{' '}
                    {format(new Date(share.createdAt), 'yyyy年MM月dd日 HH:mm', {
                      locale: ja,
                    })}
                  </Typography>

                  {share.expiresAt && (
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      gutterBottom
                    >
                      有効期限:{' '}
                      {format(
                        new Date(share.expiresAt),
                        'yyyy年MM月dd日 HH:mm',
                        { locale: ja }
                      )}
                    </Typography>
                  )}

                  <Box
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}
                  >
                    {share.permissions.map(permission => (
                      <Chip
                        key={permission}
                        size='small'
                        label={shareService.getPermissionText(permission)}
                        variant='outlined'
                      />
                    ))}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size='small'
                      startIcon={<ContentCopy />}
                      onClick={() => handleCopyUrl(share)}
                      disabled={
                        !share.isActive || shareService.isExpired(share)
                      }
                    >
                      URLをコピー
                    </Button>
                    <Button
                      size='small'
                      startIcon={<Analytics />}
                      onClick={() => handleShowAnalytics(share)}
                    >
                      統計
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* メニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            const share = shares.find(s => s._id === menuShareId);
            if (share) handleCopyUrl(share);
          }}
        >
          <ListItemIcon>
            <ContentCopy fontSize='small' />
          </ListItemIcon>
          <ListItemText>URLをコピー</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            const share = shares.find(s => s._id === menuShareId);
            if (share) handleShowAnalytics(share);
          }}
        >
          <ListItemIcon>
            <Analytics fontSize='small' />
          </ListItemIcon>
          <ListItemText>アクセス統計</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (menuShareId) handleToggleShare(menuShareId);
          }}
        >
          <ListItemIcon>
            {shares.find(s => s._id === menuShareId)?.isActive ? (
              <VisibilityOff fontSize='small' />
            ) : (
              <Visibility fontSize='small' />
            )}
          </ListItemIcon>
          <ListItemText>
            {shares.find(s => s._id === menuShareId)?.isActive
              ? '無効にする'
              : '有効にする'}
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuShareId) handleDeleteShare(menuShareId);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize='small' color='error' />
          </ListItemIcon>
          <ListItemText>削除</ListItemText>
        </MenuItem>
      </Menu>

      {/* 共有作成フォーム */}
      <ShareCreationForm
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        resourceType={resourceType}
        resourceId={resourceId}
        resourceTitle={resourceTitle}
        onShareCreated={handleShareCreated}
      />

      {/* アクセス統計ダイアログ */}
      <Dialog
        open={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          アクセス統計
          {selectedShare && (
            <Typography variant='body2' color='text.secondary'>
              {shareService.getVisibilityText(selectedShare.visibility)} -{' '}
              {resourceTitle}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {analytics && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant='outlined'>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>
                      総アクセス数
                    </Typography>
                    <Typography variant='h3' color='primary'>
                      {analytics.summary.totalAccess}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant='outlined'>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>
                      ユニークユーザー
                    </Typography>
                    <Typography variant='h3' color='secondary'>
                      {analytics.summary.uniqueUsers}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Typography variant='h6' gutterBottom>
                  最近のアクセス
                </Typography>
                {analytics.recentAccess.length === 0 ? (
                  <Typography variant='body2' color='text.secondary'>
                    アクセス履歴がありません
                  </Typography>
                ) : (
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {analytics.recentAccess.map((access, index) => (
                      <Box
                        key={index}
                        sx={{ py: 1, borderBottom: '1px solid #eee' }}
                      >
                        <Typography variant='body2'>
                          {format(
                            new Date(access.accessedAt),
                            'yyyy/MM/dd HH:mm',
                            { locale: ja }
                          )}
                          {access.userId && ' - 認証済みユーザー'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnalytics(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShareManagement;
