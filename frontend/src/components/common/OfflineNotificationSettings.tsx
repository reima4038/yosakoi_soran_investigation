import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Sync as SyncIcon,
  Save as SaveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { offlineService } from '../../services/offlineService';
import { useResponsive } from '../../hooks/useResponsive';

interface OfflineNotificationSettingsProps {
  open: boolean;
  onClose: () => void;
}

const OfflineNotificationSettings: React.FC<
  OfflineNotificationSettingsProps
> = ({ open, onClose }) => {
  const { isMobile } = useResponsive();
  const [settings, setSettings] = useState({
    offlineMode: true,
    syncCompleted: true,
    syncFailed: true,
    dataSaved: false,
  });
  const [browserNotificationPermission, setBrowserNotificationPermission] =
    useState<NotificationPermission>('default');
  const [recentNotifications, setRecentNotifications] = useState<
    Array<{
      id: string;
      type: 'sync_failed' | 'data_saved' | 'sync_completed';
      message: string;
      timestamp: number;
    }>
  >([]);

  // 設定の読み込み
  useEffect(() => {
    if (open) {
      const currentSettings = offlineService.getNotificationSettings();
      setSettings(currentSettings);

      // ブラウザ通知の許可状態を確認
      if ('Notification' in window) {
        setBrowserNotificationPermission(Notification.permission);
      }

      // 最近の通知を取得
      const notifications = offlineService.getOfflineNotifications();
      setRecentNotifications(notifications.slice(-10)); // 最新10件
    }
  }, [open]);

  // 設定の更新
  const handleSettingChange =
    (key: keyof typeof settings) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newSettings = {
        ...settings,
        [key]: event.target.checked,
      };
      setSettings(newSettings);
      offlineService.updateNotificationSettings(newSettings);
    };

  // ブラウザ通知の許可を要求
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setBrowserNotificationPermission(permission);

        if (permission === 'granted') {
          // テスト通知を送信
          new Notification('通知が有効になりました', {
            body: 'オフライン機能の通知を受け取ることができます',
            icon: '/favicon.ico',
          });
        }
      } catch (error) {
        console.error('Failed to request notification permission:', error);
      }
    }
  };

  // 通知履歴のクリア
  const clearNotificationHistory = () => {
    offlineService.clearOfflineNotifications();
    setRecentNotifications([]);
  };

  // 時間のフォーマット
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) {
      return 'たった今';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}分前`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}時間前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  // 通知タイプのアイコン
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'sync_completed':
        return <SyncIcon color='success' />;
      case 'sync_failed':
        return <SyncIcon color='error' />;
      case 'data_saved':
        return <SaveIcon color='info' />;
      default:
        return <NotificationsIcon />;
    }
  };

  // 通知タイプの色
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'sync_completed':
        return 'success.main';
      case 'sync_failed':
        return 'error.main';
      case 'data_saved':
        return 'info.main';
      default:
        return 'text.primary';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box display='flex' alignItems='center' gap={1}>
          <SettingsIcon />
          オフライン通知設定
          {isMobile && (
            <Box sx={{ ml: 'auto' }}>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* ブラウザ通知の設定 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant='h6' gutterBottom>
            ブラウザ通知
          </Typography>

          {browserNotificationPermission === 'default' && (
            <Alert severity='info' sx={{ mb: 2 }}>
              ブラウザ通知を有効にすると、オフライン時の同期状況をリアルタイムで確認できます。
            </Alert>
          )}

          {browserNotificationPermission === 'denied' && (
            <Alert severity='warning' sx={{ mb: 2 }}>
              ブラウザ通知が無効になっています。ブラウザの設定から通知を許可してください。
            </Alert>
          )}

          {browserNotificationPermission === 'granted' && (
            <Alert severity='success' sx={{ mb: 2 }}>
              ブラウザ通知が有効になっています。
            </Alert>
          )}

          {browserNotificationPermission !== 'granted' && (
            <Button
              variant='outlined'
              startIcon={<NotificationsIcon />}
              onClick={requestNotificationPermission}
              disabled={browserNotificationPermission === 'denied'}
              fullWidth={isMobile}
            >
              通知を有効にする
            </Button>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 通知設定 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant='h6' gutterBottom>
            通知設定
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.offlineMode}
                  onChange={handleSettingChange('offlineMode')}
                />
              }
              label={
                <Box>
                  <Typography variant='body2'>オフラインモード通知</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    オフライン状態になったときに通知します
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.syncCompleted}
                  onChange={handleSettingChange('syncCompleted')}
                />
              }
              label={
                <Box>
                  <Typography variant='body2'>同期完了通知</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    データの同期が完了したときに通知します
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.syncFailed}
                  onChange={handleSettingChange('syncFailed')}
                />
              }
              label={
                <Box>
                  <Typography variant='body2'>同期失敗通知</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    データの同期に失敗したときに通知します
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.dataSaved}
                  onChange={handleSettingChange('dataSaved')}
                />
              }
              label={
                <Box>
                  <Typography variant='body2'>データ保存通知</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    オフライン時にデータが保存されたときに通知します
                  </Typography>
                </Box>
              }
            />
          </FormGroup>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 通知履歴 */}
        <Box>
          <Box
            display='flex'
            justifyContent='space-between'
            alignItems='center'
            sx={{ mb: 1 }}
          >
            <Typography variant='h6'>最近の通知</Typography>
            {recentNotifications.length > 0 && (
              <Button
                size='small'
                onClick={clearNotificationHistory}
                startIcon={<NotificationsOffIcon />}
              >
                クリア
              </Button>
            )}
          </Box>

          {recentNotifications.length === 0 ? (
            <Alert severity='info'>最近の通知はありません</Alert>
          ) : (
            <List dense>
              {recentNotifications.map(notification => (
                <ListItem key={notification.id} divider>
                  <ListItemIcon>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={notification.message}
                    secondary={formatTime(notification.timestamp)}
                    primaryTypographyProps={{
                      color: getNotificationColor(notification.type),
                      variant: 'body2',
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: isMobile ? 2 : 1 }}>
        <Button onClick={onClose} fullWidth={isMobile}>
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OfflineNotificationSettings;
