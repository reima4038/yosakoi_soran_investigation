import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Lock,
  Visibility,
  Download,
  Share as ShareIcon,
  Person,
  Schedule,
  ContentCopy
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { shareService, SharedContent } from '../../services/shareService';

const SharedContentViewer: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [content, setContent] = useState<SharedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadSharedContent();
    }
  }, [token]);

  const loadSharedContent = async (inputPassword?: string) => {
    if (!token) return;

    setLoading(true);
    setError(null);
    setPasswordError(null);

    try {
      const passwordToUse = inputPassword || searchParams.get('password') || undefined;
      const sharedContent = await shareService.accessSharedContent(token, passwordToUse);
      setContent(sharedContent);
      setShowPasswordDialog(false);
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.requiresPassword) {
        setShowPasswordDialog(true);
      } else if (err.response?.status === 401 && errorData?.message?.includes('パスワード')) {
        setPasswordError('パスワードが正しくありません');
        setShowPasswordDialog(true);
      } else {
        setError(errorData?.message || '共有コンテンツの読み込みに失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (!password.trim()) {
      setPasswordError('パスワードを入力してください');
      return;
    }
    loadSharedContent(password);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // TODO: スナックバー表示
    } catch (err) {
      console.error('URLのコピーに失敗しました:', err);
    }
  };

  const renderResourceContent = () => {
    if (!content) return null;

    const { share, resource } = content;

    switch (share.resourceType) {
      case 'session_results':
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              評価セッション結果
            </Typography>
            {resource.session && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {resource.session.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {resource.session.description}
                  </Typography>
                  {resource.session.videoId && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        評価対象動画
                      </Typography>
                      <Typography variant="body2">
                        {resource.session.videoId.title}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
            {/* TODO: 評価結果の表示 */}
            <Alert severity="info">
              評価結果の詳細表示は今後実装予定です
            </Alert>
          </Box>
        );

      case 'evaluation':
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              個別評価結果
            </Typography>
            {resource.evaluation && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    評価者: {resource.evaluation.userId?.profile?.displayName || resource.evaluation.userId?.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    提出日: {resource.evaluation.submittedAt && 
                      format(new Date(resource.evaluation.submittedAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })
                    }
                  </Typography>
                  {/* TODO: 評価詳細の表示 */}
                </CardContent>
              </Card>
            )}
            <Alert severity="info" sx={{ mt: 2 }}>
              評価詳細の表示は今後実装予定です
            </Alert>
          </Box>
        );

      default:
        return (
          <Alert severity="warning">
            サポートされていないコンテンツタイプです
          </Alert>
        );
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => window.location.reload()}>
          再試行
        </Button>
      </Box>
    );
  }

  if (!content) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="warning">
          共有コンテンツが見つかりません
        </Alert>
      </Box>
    );
  }

  const { share } = content;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* ヘッダー情報 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                共有コンテンツ
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar sx={{ width: 24, height: 24 }}>
                  <Person fontSize="small" />
                </Avatar>
                <Typography variant="body2">
                  共有者: {share.creator.profile?.displayName || share.creator.username}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                共有日: {format(new Date(share.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
              </Typography>
              {share.expiresAt && (
                <Typography variant="body2" color="text.secondary">
                  有効期限: {format(new Date(share.expiresAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={handleCopyUrl} title="URLをコピー">
                <ContentCopy />
              </IconButton>
              {share.settings.allowDownload && (
                <IconButton title="ダウンロード">
                  <Download />
                </IconButton>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {share.permissions.map((permission) => (
              <Chip
                key={permission}
                size="small"
                label={shareService.getPermissionText(permission)}
                variant="outlined"
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* メインコンテンツ */}
      <Card>
        <CardContent>
          {renderResourceContent()}
        </CardContent>
      </Card>

      {/* パスワード入力ダイアログ */}
      <Dialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock />
            パスワードが必要です
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            この共有コンテンツはパスワードで保護されています。
          </Typography>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}
          <TextField
            fullWidth
            type="password"
            label="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePasswordSubmit();
              }
            }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handlePasswordSubmit}
            variant="contained"
            disabled={!password.trim()}
          >
            アクセス
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SharedContentViewer;