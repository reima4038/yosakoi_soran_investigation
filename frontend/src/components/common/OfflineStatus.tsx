import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  Snackbar,
  IconButton,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  CloudOff as OfflineIcon,
  Cloud as OnlineIcon,
  Sync as SyncIcon,
  SyncDisabled as SyncDisabledIcon,
  Storage as StorageIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Assessment as EvaluationIcon,
  Comment as CommentIcon,
  Queue as QueueIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import OfflineNotificationSettings from './OfflineNotificationSettings';
import { offlineService } from '../../services/offlineService';
import { useResponsive } from '../../hooks/useResponsive';

interface OfflineStatusProps {
  showPersistent?: boolean;
  position?: 'top' | 'bottom';
}

const OfflineStatus: React.FC<OfflineStatusProps> = ({
  showPersistent = false,
  position = 'bottom',
}) => {
  const { isMobile } = useResponsive();
  const [isOnline, setIsOnline] = useState(offlineService.getOnlineStatus());
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    unsyncedEvaluations: 0,
    unsyncedComments: 0,
    queuedItems: 0,
  });
  const [storageUsage, setStorageUsage] = useState<{
    used: number;
    quota: number;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [offlineNotifications, setOfflineNotifications] = useState<Array<{
    id: string;
    type: 'sync_failed' | 'data_saved' | 'sync_completed';
    message: string;
    timestamp: number;
  }>>([]);

  // オンライン状態の監視
  useEffect(() => {
    const unsubscribe = offlineService.addOnlineListener((online) => {
      const wasOffline = !isOnline;
      setIsOnline(online);
      
      if (online && wasOffline) {
        setShowSnackbar(true);
        setIsSyncing(true);
        // 同期開始
        offlineService.syncWhenOnline().finally(() => {
          setIsSyncing(false);
          updateSyncStatus();
        });
      } else if (!online) {
        setShowSnackbar(true);
      }
    });

    return unsubscribe;
  }, [isOnline]);

  // 同期状態の更新
  const updateSyncStatus = async () => {
    try {
      const status = await offlineService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to get sync status:', error);
    }
  };

  // ストレージ使用量の更新
  const updateStorageUsage = async () => {
    try {
      const usage = await offlineService.getStorageUsage();
      setStorageUsage(usage);
    } catch (error) {
      console.error('Failed to get storage usage:', error);
    }
  };

  // オフライン通知の監視
  useEffect(() => {
    const handleOfflineNotification = (event: CustomEvent) => {
      setOfflineNotifications(prev => [...prev, event.detail]);
    };

    window.addEventListener('offline-notification', handleOfflineNotification as EventListener);
    
    return () => {
      window.removeEventListener('offline-notification', handleOfflineNotification as EventListener);
    };
  }, []);

  // 初期データの読み込み
  useEffect(() => {
    updateSyncStatus();
    updateStorageUsage();
    
    // 既存のオフライン通知を読み込み
    const existingNotifications = offlineService.getOfflineNotifications();
    setOfflineNotifications(existingNotifications);
    
    // 定期的に状態を更新
    const interval = setInterval(() => {
      updateSyncStatus();
      updateStorageUsage();
    }, 10000); // 10秒ごと

    return () => clearInterval(interval);
  }, []);

  // 手動同期
  const handleManualSync = async () => {
    if (!isOnline) return;
    
    setIsSyncing(true);
    try {
      await offlineService.syncWhenOnline();
      await updateSyncStatus();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // キャッシュクリア
  const handleClearCache = async () => {
    try {
      await offlineService.clearCache();
      await updateStorageUsage();
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  // ストレージ使用率の計算
  const getStoragePercentage = () => {
    if (!storageUsage || storageUsage.quota === 0) return 0;
    return (storageUsage.used / storageUsage.quota) * 100;
  };

  // ストレージサイズのフォーマット
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 未同期データがあるかチェック
  const hasUnsyncedData = syncStatus.unsyncedEvaluations > 0 || 
                         syncStatus.unsyncedComments > 0 || 
                         syncStatus.queuedItems > 0;

  // 永続表示用のコンポーネント
  if (showPersistent) {
    return (
      <Box
        sx={{
          position: 'fixed',
          [position]: 16,
          right: 16,
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Chip
          icon={isOnline ? <OnlineIcon /> : <OfflineIcon />}
          label={isOnline ? 'オンライン' : 'オフライン'}
          color={isOnline ? 'success' : 'warning'}
          size={isMobile ? 'medium' : 'small'}
          onClick={() => setShowDetails(true)}
          sx={{ cursor: 'pointer' }}
        />
        
        {hasUnsyncedData && (
          <Chip
            icon={isSyncing ? <SyncIcon /> : <SyncDisabledIcon />}
            label={`未同期: ${syncStatus.unsyncedEvaluations + syncStatus.unsyncedComments}`}
            color='warning'
            size={isMobile ? 'medium' : 'small'}
            onClick={() => setShowDetails(true)}
            sx={{ cursor: 'pointer' }}
          />
        )}
      </Box>
    );
  }

  return (
    <>
      {/* スナックバー通知 */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: position, horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSnackbar(false)}
          severity={isOnline ? 'success' : 'warning'}
          sx={{ width: '100%' }}
          action={
            <IconButton
              size="small"
              aria-label="詳細"
              color="inherit"
              onClick={() => {
                setShowDetails(true);
                setShowSnackbar(false);
              }}
            >
              <InfoIcon />
            </IconButton>
          }
        >
          {isOnline ? (
            <>
              オンラインに復帰しました
              {hasUnsyncedData && ' - データを同期中...'}
            </>
          ) : (
            'オフラインモードです - データはローカルに保存されます'
          )}
        </Alert>
      </Snackbar>

      {/* 詳細ダイアログ */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            {isOnline ? <OnlineIcon color="success" /> : <OfflineIcon color="warning" />}
            接続状態とオフライン機能
            <Box sx={{ ml: 'auto' }}>
              <IconButton onClick={() => setShowDetails(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {/* 接続状態 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              現在の状態
            </Typography>
            <Alert severity={isOnline ? 'success' : 'warning'}>
              {isOnline ? (
                'インターネットに接続されています'
              ) : (
                'オフラインです。データはローカルに保存され、オンライン復帰時に同期されます。'
              )}
            </Alert>
          </Box>

          {/* 同期状態 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              同期状態
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <EvaluationIcon />
                </ListItemIcon>
                <ListItemText
                  primary="未同期の評価"
                  secondary={`${syncStatus.unsyncedEvaluations} 件`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CommentIcon />
                </ListItemIcon>
                <ListItemText
                  primary="未同期のコメント"
                  secondary={`${syncStatus.unsyncedComments} 件`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <QueueIcon />
                </ListItemIcon>
                <ListItemText
                  primary="同期待ちアイテム"
                  secondary={`${syncStatus.queuedItems} 件`}
                />
              </ListItem>
            </List>

            {isOnline && hasUnsyncedData && (
              <Button
                variant="contained"
                startIcon={isSyncing ? <SyncIcon /> : <SyncIcon />}
                onClick={handleManualSync}
                disabled={isSyncing}
                fullWidth={isMobile}
                sx={{ mt: 1 }}
              >
                {isSyncing ? '同期中...' : '今すぐ同期'}
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* ストレージ使用量 */}
          {storageUsage && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                ストレージ使用量
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">
                    {formatBytes(storageUsage.used)} / {formatBytes(storageUsage.quota)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getStoragePercentage().toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={getStoragePercentage()}
                  sx={{ mt: 1 }}
                />
              </Box>
              
              <Button
                variant="outlined"
                startIcon={<StorageIcon />}
                onClick={handleClearCache}
                size="small"
                fullWidth={isMobile}
              >
                キャッシュをクリア
              </Button>
            </Box>
          )}

          {/* オフライン機能の説明 */}
          <Box>
            <Typography variant="h6" gutterBottom>
              オフライン機能について
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              このアプリケーションはオフラインでも使用できます：
            </Typography>
            <List dense>
              <ListItem>
                <Typography variant="body2">
                  • 評価データとコメントはローカルに保存されます
                </Typography>
              </ListItem>
              <ListItem>
                <Typography variant="body2">
                  • オンライン復帰時に自動的に同期されます
                </Typography>
              </ListItem>
              <ListItem>
                <Typography variant="body2">
                  • 一度読み込んだセッションや動画はキャッシュされます
                </Typography>
              </ListItem>
              <ListItem>
                <Typography variant="body2">
                  • 同期に失敗した場合は自動的にリトライされます
                </Typography>
              </ListItem>
            </List>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: isMobile ? 2 : 1 }}>
          <Button
            startIcon={<SettingsIcon />}
            onClick={() => {
              setShowNotificationSettings(true);
              setShowDetails(false);
            }}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            通知設定
          </Button>
          <Button onClick={() => setShowDetails(false)} fullWidth={isMobile}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* 通知設定ダイアログ */}
      <OfflineNotificationSettings
        open={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />
    </>
  );
};

export default OfflineStatus;