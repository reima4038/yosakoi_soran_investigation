import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Typography,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { Session } from '../../types';
import { sessionService } from '../../services/sessionService';

interface InvitationManagerProps {
  session: Session;
  onInvitationSent?: () => void;
}

interface Invitation {
  email: string;
  inviteLink: string;
  invitedAt: Date;
  status: 'pending' | 'accepted' | 'declined';
}

const InvitationManager: React.FC<InvitationManagerProps> = ({
  session,
  onInvitationSent,
}) => {
  const [emails, setEmails] = useState<string[]>(['']);
  const [message, setMessage] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // メールアドレスの追加
  const addEmailField = () => {
    setEmails([...emails, '']);
  };

  // メールアドレスの削除
  const removeEmailField = (index: number) => {
    const newEmails = emails.filter((_, i) => i !== index);
    setEmails(newEmails.length > 0 ? newEmails : ['']);
  };

  // メールアドレスの更新
  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  // メールアドレスの検証
  const validateEmails = (): string | null => {
    const validEmails = emails.filter(email => email.trim() !== '');

    if (validEmails.length === 0) {
      return '少なくとも1つのメールアドレスを入力してください';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = validEmails.filter(email => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      return `無効なメールアドレスがあります: ${invalidEmails.join(', ')}`;
    }

    return null;
  };

  // 招待の送信
  const handleSendInvitations = async () => {
    const validationError = validateEmails();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const validEmails = emails.filter(email => email.trim() !== '');
      const result = await sessionService.inviteEvaluators(
        session.id,
        validEmails,
        message.trim() || undefined
      );

      setInvitations(result.invitations);
      setSuccess(`${validEmails.length}件の招待を送信しました`);
      setInviteDialogOpen(false);

      if (onInvitationSent) {
        onInvitationSent();
      }

      // フォームをリセット
      setEmails(['']);
      setMessage('');
    } catch (err: any) {
      setError(err.response?.data?.message || '招待の送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 招待リンクのコピー
  const copyInviteLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setSuccess('招待リンクをクリップボードにコピーしました');
    } catch (err) {
      setError('クリップボードへのコピーに失敗しました');
    }
  };

  return (
    <Box>
      {/* エラー・成功メッセージ */}
      {error && (
        <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity='success'
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* 招待ボタン */}
      <Box
        display='flex'
        justifyContent='space-between'
        alignItems='center'
        mb={2}
      >
        <Typography variant='h6'>評価者の招待</Typography>
        <Button
          variant='contained'
          startIcon={<SendIcon />}
          onClick={() => setInviteDialogOpen(true)}
          disabled={session.status !== 'active' && session.status !== 'draft'}
        >
          評価者を招待
        </Button>
      </Box>

      {/* 招待履歴 */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader
            title='招待履歴'
            subheader={`${invitations.length}件の招待を送信済み`}
          />
          <CardContent>
            <List>
              {invitations.map((invitation, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display='flex' alignItems='center' gap={1}>
                          <EmailIcon fontSize='small' color='action' />
                          <Typography variant='body1'>
                            {invitation.email}
                          </Typography>
                          <Chip
                            label={
                              invitation.status === 'pending'
                                ? '保留中'
                                : invitation.status === 'accepted'
                                  ? '承諾済み'
                                  : '辞退'
                            }
                            color={
                              invitation.status === 'pending'
                                ? 'warning'
                                : invitation.status === 'accepted'
                                  ? 'success'
                                  : 'error'
                            }
                            size='small'
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant='caption' color='text.secondary'>
                          招待日時:{' '}
                          {new Date(invitation.invitedAt).toLocaleString(
                            'ja-JP'
                          )}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge='end'
                        onClick={() => copyInviteLink(invitation.inviteLink)}
                        title='招待リンクをコピー'
                      >
                        <CopyIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < invitations.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* 招待ダイアログ */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Box display='flex' alignItems='center' gap={1}>
            <SendIcon />
            評価者を招待
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* セッション情報 */}
            <Card variant='outlined' sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant='subtitle1' gutterBottom>
                  招待対象セッション
                </Typography>
                <Typography variant='h6'>{session.name}</Typography>
                {session.description && (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mt: 1 }}
                  >
                    {session.description}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* メールアドレス入力 */}
            <Typography variant='subtitle1' gutterBottom>
              招待するメールアドレス
            </Typography>
            {emails.map((email, index) => (
              <Box
                key={index}
                display='flex'
                alignItems='center'
                gap={1}
                mb={2}
              >
                <TextField
                  fullWidth
                  label={`メールアドレス ${index + 1}`}
                  value={email}
                  onChange={e => updateEmail(index, e.target.value)}
                  type='email'
                  placeholder='example@domain.com'
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <EmailIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                {emails.length > 1 && (
                  <IconButton
                    onClick={() => removeEmailField(index)}
                    color='error'
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            ))}

            <Button
              startIcon={<AddIcon />}
              onClick={addEmailField}
              sx={{ mb: 3 }}
            >
              メールアドレスを追加
            </Button>

            {/* メッセージ */}
            <TextField
              fullWidth
              label='招待メッセージ（任意）'
              value={message}
              onChange={e => setMessage(e.target.value)}
              multiline
              rows={3}
              placeholder='評価者への追加メッセージを入力してください'
              sx={{ mb: 2 }}
            />

            {/* 注意事項 */}
            <Alert severity='info'>
              <Typography variant='body2'>
                招待リンクは7日間有効です。招待された評価者は、リンクをクリックしてセッションに参加できます。
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)} disabled={loading}>
            キャンセル
          </Button>
          <Button
            onClick={handleSendInvitations}
            variant='contained'
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {loading ? '送信中...' : '招待を送信'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvitationManager;
