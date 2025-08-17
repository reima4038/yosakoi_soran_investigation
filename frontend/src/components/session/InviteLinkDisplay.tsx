import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  Chip,
  Divider,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Share as ShareIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { Session } from '../../types';
import { sessionService } from '../../services/sessionService';
import { useClipboard } from '../../hooks/useClipboard';
import { useAuth } from '../../contexts/AuthContext';
import { ManualCopyDialog } from '../common';

interface InviteLinkDisplayProps {
  session: Session;
  onLinkGenerated?: (link: string) => void;
  onError?: (error: string) => void;
}

interface InviteLinkData {
  inviteLink: string;
  sessionId: string;
  sessionName: string;
  sessionStatus: string;
  expiresIn: string;
  inviteSettings: {
    isEnabled: boolean;
    currentUses: number;
    allowAnonymous: boolean;
    requireApproval: boolean;
    maxUses?: number;
  };
  usageStats: {
    totalUses: number;
    successfulUses: number;
    failedUses: number;
    lastUsed: string | null;
  };
  generatedAt: string;
}

const InviteLinkDisplay: React.FC<InviteLinkDisplayProps> = ({
  session,
  onLinkGenerated,
  onError,
}) => {
  const [inviteLinkData, setInviteLinkData] = useState<InviteLinkData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [manualCopyDialogOpen, setManualCopyDialogOpen] = useState(false);
  const {
    copyToClipboard,
    isSupported: clipboardSupported,
    isCopying,
    copySuccess,
    error: clipboardError,
    resetStatus: resetClipboardStatus,
  } = useClipboard();
  const { user } = useAuth();

  // セッション作成者かどうかをチェック
  const isSessionCreator = user && session.creatorId === user.id;

  // 招待リンクを取得
  const fetchInviteLink = async () => {
    if (!isSessionCreator) {
      setError('招待リンクを取得する権限がありません');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await sessionService.getInviteLink(session.id);
      setInviteLinkData(response.data);

      if (onLinkGenerated) {
        onLinkGenerated(response.data.inviteLink);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || '招待リンクの取得に失敗しました';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // 招待リンクを再生成
  const regenerateInviteLink = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await sessionService.regenerateInviteLink(session.id);
      setInviteLinkData(prev =>
        prev
          ? {
              ...prev,
              inviteLink: response.data.inviteLink,
              generatedAt: response.data.regeneratedAt,
              usageStats: {
                totalUses: 0,
                successfulUses: 0,
                failedUses: 0,
                lastUsed: null,
              },
            }
          : null
      );

      if (onLinkGenerated) {
        onLinkGenerated(response.data.inviteLink);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || '招待リンクの再生成に失敗しました';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // クリップボードにコピー
  const handleCopyLink = async () => {
    if (!inviteLinkData) return;

    resetClipboardStatus();

    if (!clipboardSupported) {
      // クリップボードAPIがサポートされていない場合は手動コピーダイアログを表示
      setManualCopyDialogOpen(true);
      return;
    }

    const success = await copyToClipboard(inviteLinkData.inviteLink);
    if (!success && clipboardError) {
      setError(clipboardError);
      // フォールバックとして手動コピーダイアログを表示
      setManualCopyDialogOpen(true);
    }
  };

  // コンポーネントマウント時に招待リンクを取得
  useEffect(() => {
    if (isSessionCreator && session.status !== 'archived') {
      fetchInviteLink();
    }
  }, [session.id, isSessionCreator, session.status]);

  // セッション作成者でない場合は何も表示しない
  if (!isSessionCreator) {
    return null;
  }

  // セッションがアーカイブされている場合
  if (session.status === 'archived') {
    return (
      <Card>
        <CardHeader title='招待リンク' avatar={<InfoIcon color='disabled' />} />
        <CardContent>
          <Alert severity='info'>
            アーカイブされたセッションの招待リンクは利用できません。
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title='招待リンク'
        avatar={<ShareIcon color='primary' />}
        action={
          inviteLinkData && (
            <Box display='flex' gap={1}>
              <Tooltip title='使用統計を表示'>
                <IconButton onClick={() => setStatsDialogOpen(true)}>
                  <VisibilityIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title='招待リンクを再生成'>
                <IconButton onClick={regenerateInviteLink} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )
        }
      />
      <CardContent>
        {error && (
          <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {copySuccess && (
          <Alert
            severity='success'
            sx={{ mb: 2 }}
            onClose={resetClipboardStatus}
          >
            招待リンクをクリップボードにコピーしました
          </Alert>
        )}

        {loading ? (
          <Box
            display='flex'
            justifyContent='center'
            alignItems='center'
            py={3}
          >
            <CircularProgress size={24} />
            <Typography variant='body2' sx={{ ml: 2 }}>
              招待リンクを取得中...
            </Typography>
          </Box>
        ) : inviteLinkData ? (
          <Box>
            {/* 招待リンク表示 */}
            <TextField
              fullWidth
              label='招待リンク'
              value={inviteLinkData.inviteLink}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position='end'>
                    <Tooltip
                      title={
                        !clipboardSupported
                          ? 'コピー機能は利用できません（HTTPSまたはlocalhostが必要）'
                          : isCopying
                            ? 'コピー中...'
                            : copySuccess
                              ? 'コピー完了！'
                              : 'クリップボードにコピー'
                      }
                    >
                      <span>
                        <IconButton
                          onClick={handleCopyLink}
                          disabled={isCopying}
                          color={copySuccess ? 'success' : 'primary'}
                        >
                          {isCopying ? (
                            <CircularProgress size={20} />
                          ) : copySuccess ? (
                            <CheckCircleIcon />
                          ) : (
                            <CopyIcon />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* 招待設定情報 */}
            <Box display='flex' flexWrap='wrap' gap={1} mb={2}>
              <Chip
                icon={
                  inviteLinkData.inviteSettings.isEnabled ? (
                    <CheckCircleIcon />
                  ) : (
                    <ErrorIcon />
                  )
                }
                label={
                  inviteLinkData.inviteSettings.isEnabled ? '有効' : '無効'
                }
                color={
                  inviteLinkData.inviteSettings.isEnabled ? 'success' : 'error'
                }
                size='small'
              />
              {inviteLinkData.inviteSettings.allowAnonymous && (
                <Chip label='匿名参加可' color='info' size='small' />
              )}
              {inviteLinkData.inviteSettings.requireApproval && (
                <Chip label='承認必要' color='warning' size='small' />
              )}
              {inviteLinkData.inviteSettings.maxUses && (
                <Chip
                  label={`使用制限: ${inviteLinkData.inviteSettings.currentUses}/${inviteLinkData.inviteSettings.maxUses}`}
                  color='default'
                  size='small'
                />
              )}
            </Box>

            {/* 使用統計サマリー */}
            <Box
              display='flex'
              justifyContent='space-between'
              alignItems='center'
            >
              <Typography variant='body2' color='text.secondary'>
                使用回数: {inviteLinkData.usageStats.totalUses}回
                {inviteLinkData.usageStats.lastUsed && (
                  <span>
                    {' '}
                    • 最終使用:{' '}
                    {new Date(
                      inviteLinkData.usageStats.lastUsed
                    ).toLocaleDateString('ja-JP')}
                  </span>
                )}
              </Typography>
              <Button
                size='small'
                onClick={() => setStatsDialogOpen(true)}
                startIcon={<VisibilityIcon />}
              >
                詳細統計
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* 注意事項 */}
            <Alert severity='info' sx={{ mt: 2 }}>
              <Typography variant='body2'>
                この招待リンクを共有することで、他のユーザーがセッションに参加できます。
                {inviteLinkData.expiresIn !== '7d' && (
                  <span> 有効期限: {inviteLinkData.expiresIn}</span>
                )}
              </Typography>
            </Alert>
          </Box>
        ) : (
          <Box textAlign='center' py={3}>
            <Typography variant='body2' color='text.secondary' gutterBottom>
              招待リンクが生成されていません
            </Typography>
            <Button
              variant='contained'
              onClick={fetchInviteLink}
              startIcon={<ShareIcon />}
            >
              招待リンクを生成
            </Button>
          </Box>
        )}
      </CardContent>

      {/* 使用統計ダイアログ */}
      {inviteLinkData && (
        <Dialog
          open={statsDialogOpen}
          onClose={() => setStatsDialogOpen(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>招待リンク使用統計</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Typography variant='h6' gutterBottom>
                {inviteLinkData.sessionName}
              </Typography>

              <Box display='grid' gridTemplateColumns='1fr 1fr' gap={2} mb={3}>
                <Card variant='outlined'>
                  <CardContent>
                    <Typography variant='h4' color='primary'>
                      {inviteLinkData.usageStats.totalUses}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      総使用回数
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant='outlined'>
                  <CardContent>
                    <Typography variant='h4' color='success.main'>
                      {inviteLinkData.usageStats.successfulUses}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      成功回数
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant='outlined'>
                  <CardContent>
                    <Typography variant='h4' color='error.main'>
                      {inviteLinkData.usageStats.failedUses}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      失敗回数
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant='outlined'>
                  <CardContent>
                    <Typography variant='h4' color='info.main'>
                      {inviteLinkData.usageStats.totalUses > 0
                        ? Math.round(
                            (inviteLinkData.usageStats.successfulUses /
                              inviteLinkData.usageStats.totalUses) *
                              100
                          )
                        : 0}
                      %
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      成功率
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              <Typography variant='body2' color='text.secondary'>
                生成日時:{' '}
                {new Date(inviteLinkData.generatedAt).toLocaleString('ja-JP')}
              </Typography>
              {inviteLinkData.usageStats.lastUsed && (
                <Typography variant='body2' color='text.secondary'>
                  最終使用:{' '}
                  {new Date(inviteLinkData.usageStats.lastUsed).toLocaleString(
                    'ja-JP'
                  )}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatsDialogOpen(false)}>閉じる</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* 手動コピーダイアログ */}
      {inviteLinkData && (
        <ManualCopyDialog
          open={manualCopyDialogOpen}
          onClose={() => setManualCopyDialogOpen(false)}
          text={inviteLinkData.inviteLink}
          title='招待リンクの手動コピー'
          description='お使いのブラウザではクリップボードAPIがサポートされていません。以下の招待リンクを手動でコピーしてください。'
        />
      )}
    </Card>
  );
};

export default InviteLinkDisplay;
