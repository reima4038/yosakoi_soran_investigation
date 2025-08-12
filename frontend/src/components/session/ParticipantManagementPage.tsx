import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Checkbox,
  Toolbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { sessionService } from '../../services/sessionService';
import { Session, SessionUserRole } from '../../types';

interface SessionParticipant {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: SessionUserRole;
  hasSubmitted: boolean;
  submittedAt?: string;
  invitedAt: string;
  joinedAt?: string;
  invitationStatus: 'pending' | 'accepted' | 'declined';
}

const ParticipantManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, hasAnyRole } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [hasManagePermission, setHasManagePermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  // 招待ダイアログの状態
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteRole, setInviteRole] = useState<SessionUserRole>(
    SessionUserRole.EVALUATOR
  );
  const [isInviting, setIsInviting] = useState(false);

  // 削除確認ダイアログの状態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] =
    useState<SessionParticipant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 一括選択の状態
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // 招待フォームのバリデーション
  const [inviteErrors, setInviteErrors] = useState({
    emails: '',
    role: '',
  });

  // CSVファイルアップロード
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // 権限変更確認ダイアログの状態
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState<{
    participantId: string;
    participantName: string;
    currentRole: SessionUserRole;
    newRole: SessionUserRole;
  } | null>(null);

  // セッション詳細の取得
  useEffect(() => {
    if (id) {
      fetchSessionData(id);
    }
  }, [fetchSessionData, id]);

  const fetchSessionData = async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError('');

      // セッション基本情報と参加者情報を並行取得
      const [sessionData, participantsData] = await Promise.all([
        sessionService.getSession(sessionId),
        sessionService.getSessionParticipants(sessionId).catch(() => null), // 参加者APIが失敗してもセッション情報は取得
      ]);

      setSession(sessionData);

      // 権限チェック
      checkManagePermission(sessionData);

      if (participantsData) {
        // 実際のAPIレスポンスから参加者データを変換
        const participantData: SessionParticipant[] =
          participantsData.participants?.map((p: any) => ({
            id: p.id || p.userId,
            name:
              p.user?.profile?.displayName ||
              p.user?.username ||
              p.name ||
              'Unknown User',
            email: p.user?.email || p.email || '',
            avatar: p.user?.profile?.avatar || p.avatar,
            role: p.role,
            hasSubmitted: p.hasSubmitted || false,
            submittedAt: p.submittedAt,
            invitedAt: p.invitedAt,
            joinedAt: p.joinedAt,
            invitationStatus: p.joinedAt
              ? 'accepted'
              : p.invitationStatus || 'pending',
          })) || [];

        setParticipants(participantData);
      } else {
        // APIが利用できない場合はセッションデータから参加者情報を取得
        const fallbackParticipants: SessionParticipant[] =
          sessionData.participants?.map((p: any) => ({
            id: p.userId || p.id,
            name:
              p.user?.profile?.displayName ||
              p.user?.username ||
              `User ${p.userId}`,
            email: p.user?.email || `user${p.userId}@example.com`,
            avatar: p.user?.profile?.avatar,
            role: p.role,
            hasSubmitted: p.hasSubmitted || false,
            submittedAt: p.submittedAt,
            invitedAt: p.invitedAt?.toISOString
              ? p.invitedAt.toISOString()
              : p.invitedAt,
            joinedAt: p.joinedAt?.toISOString
              ? p.joinedAt.toISOString()
              : p.joinedAt,
            invitationStatus: p.joinedAt ? 'accepted' : 'pending',
          })) || [];

        setParticipants(fallbackParticipants);
      }
    } catch (error: any) {
      console.error('Session fetch error:', error);

      // エラーの詳細な処理
      if (error.response?.status === 404) {
        setError('指定されたセッションが見つかりません。');
      } else if (error.response?.status === 403) {
        setError('このセッションにアクセスする権限がありません。');
      } else if (error.response?.status >= 500) {
        setError('サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        setError('ネットワークエラーが発生しました。インターネット接続を確認してください。');
      } else {
        setError(`セッション情報の取得に失敗しました。${error.message || 'エラーが発生しました。'}`);
      }
    } finally {
      setIsLoading(false);
      setPermissionChecked(true);
    }
  };

  // 参加者管理権限のチェック
  const checkManagePermission = (sessionData: Session) => {
    if (!user) {
      setHasManagePermission(false);
      return;
    }

    // ADMINは常に管理可能
    if (user.role === UserRole.ADMIN) {
      setHasManagePermission(true);
      return;
    }

    // EVALUATORの場合、セッション作成者のみ管理可能
    if (user.role === UserRole.EVALUATOR) {
      const isCreator = sessionData.creatorId === user.id;
      setHasManagePermission(isCreator);
      return;
    }

    // その他のロールは管理不可
    setHasManagePermission(false);
  };

  // メールアドレスのバリデーション
  const validateEmails = (emailString: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = emailString
      .split(',')
      .map(email => email.trim())
      .filter(email => email);

    if (emails.length === 0) {
      return { isValid: false, error: 'メールアドレスを入力してください' };
    }

    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return {
        isValid: false,
        error: `無効なメールアドレス: ${invalidEmails.join(', ')}`,
      };
    }

    // 既存の参加者との重複チェック
    const existingEmails = participants.map(p => p.email.toLowerCase());
    const duplicateEmails = emails.filter(email =>
      existingEmails.includes(email.toLowerCase())
    );

    if (duplicateEmails.length > 0) {
      return {
        isValid: false,
        error: `既に参加者として登録済み: ${duplicateEmails.join(', ')}`,
      };
    }

    return { isValid: true, error: '', emails };
  };

  // CSVファイルの処理
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      // CSVの各行からメールアドレスを抽出（1列目をメールアドレスとして扱う）
      const emails = lines
        .map(line => line.split(',')[0]?.trim())
        .filter(
          email => email && email !== 'email' && email !== 'メールアドレス'
        ) // ヘッダー行を除外
        .join(', ');

      setInviteEmails(emails);
    };

    reader.readAsText(file);
  };

  // 招待フォームのバリデーション
  const validateInviteForm = () => {
    const errors = { emails: '', role: '' };

    const emailValidation = validateEmails(inviteEmails);
    if (!emailValidation.isValid) {
      errors.emails = emailValidation.error;
    }

    if (!inviteRole) {
      errors.role = '権限を選択してください';
    }

    setInviteErrors(errors);
    return emailValidation.isValid && !errors.role;
  };

  // 参加者招待の処理
  const handleInvite = async () => {
    if (!id) return;

    // バリデーションチェック
    if (!validateInviteForm()) {
      return;
    }

    try {
      setIsInviting(true);
      setError('');

      const emailValidation = validateEmails(inviteEmails);
      if (!emailValidation.isValid || !emailValidation.emails) {
        setError(emailValidation.error);
        return;
      }

      const inviteData = {
        emails: emailValidation.emails,
        message: inviteMessage.trim() || undefined,
        role: inviteRole,
      };

      await sessionService.inviteEvaluators(
        id,
        inviteData.emails,
        inviteData.message
      );

      setSuccessMessage(`${inviteData.emails.length}名の参加者を招待しました`);
      setInviteDialogOpen(false);
      setInviteEmails('');
      setInviteMessage('');
      setInviteRole(SessionUserRole.EVALUATOR);
      setInviteErrors({ emails: '', role: '' });

      // 参加者リストを再取得
      await fetchSessionData(id);
    } catch (error: any) {
      console.error('Invite error:', error);

      // エラーの詳細な処理
      if (error.response?.status === 400) {
        setError('招待データに問題があります');
      } else if (error.response?.status === 403) {
        setError('参加者を招待する権限がありません');
      } else if (error.response?.status === 409) {
        setError('一部のメールアドレスは既に招待済みです');
      } else {
        setError('参加者の招待に失敗しました');
      }
    } finally {
      setIsInviting(false);
    }
  };

  // 参加者削除の処理
  const handleDeleteParticipant = async () => {
    if (!participantToDelete || !id) return;

    try {
      setIsDeleting(true);
      setError('');

      await sessionService.removeParticipant(id, participantToDelete.id);

      // ローカル状態を更新
      setParticipants(prev =>
        prev.filter(p => p.id !== participantToDelete.id)
      );

      setSuccessMessage(`${participantToDelete.name}を参加者から削除しました`);
      setDeleteDialogOpen(false);
      setParticipantToDelete(null);
    } catch (error: any) {
      console.error('Delete participant error:', error);

      // エラーの詳細な処理
      if (error.response?.status === 403) {
        setError('参加者を削除する権限がありません');
      } else if (error.response?.status === 404) {
        setError('参加者が見つかりません');
      } else if (error.response?.status === 409) {
        setError('評価を提出済みの参加者は削除できません');
      } else {
        setError('参加者の削除に失敗しました');
      }

      setDeleteDialogOpen(false);
      setParticipantToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // 一括削除の処理
  const handleBulkDelete = async () => {
    if (!id || selectedParticipants.length === 0) return;

    try {
      setIsDeleting(true);
      setError('');

      // 並行して削除処理を実行
      const deletePromises = selectedParticipants.map(participantId =>
        sessionService.removeParticipant(id, participantId)
      );

      await Promise.all(deletePromises);

      // ローカル状態を更新
      setParticipants(prev =>
        prev.filter(p => !selectedParticipants.includes(p.id))
      );

      setSuccessMessage(
        `${selectedParticipants.length}名の参加者を削除しました`
      );
      setSelectedParticipants([]);
      setBulkDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      setError('一部の参加者の削除に失敗しました');
      setBulkDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // 権限変更の確認
  const handleRoleChangeRequest = (
    participantId: string,
    newRole: SessionUserRole
  ) => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant || participant.role === newRole) return;

    setRoleChangeData({
      participantId,
      participantName: participant.name,
      currentRole: participant.role,
      newRole,
    });
    setRoleChangeDialogOpen(true);
  };

  // 権限変更の実行
  const handleRoleChangeConfirm = async () => {
    if (!id || !roleChangeData) return;

    try {
      setError('');

      await sessionService.updateParticipantRole(
        id,
        roleChangeData.participantId,
        roleChangeData.newRole
      );

      // ローカル状態を更新
      setParticipants(prev =>
        prev.map(p =>
          p.id === roleChangeData.participantId
            ? { ...p, role: roleChangeData.newRole }
            : p
        )
      );

      setSuccessMessage(
        `${roleChangeData.participantName}の権限を${roleChangeData.newRole}に変更しました`
      );
      setRoleChangeDialogOpen(false);
      setRoleChangeData(null);
    } catch (error: any) {
      console.error('Role change error:', error);

      // エラーの詳細な処理
      if (error.response?.status === 403) {
        setError('参加者の権限を変更する権限がありません');
      } else if (error.response?.status === 404) {
        setError('参加者が見つかりません');
      } else if (error.response?.status === 409) {
        setError('評価提出済みの参加者の権限は変更できません');
      } else {
        setError('権限の変更に失敗しました');
      }

      setRoleChangeDialogOpen(false);
      setRoleChangeData(null);
    }
  };

  // 一括選択の処理
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedParticipants(participants.map(p => p.id));
    } else {
      setSelectedParticipants([]);
    }
  };

  const handleSelectParticipant = (participantId: string, checked: boolean) => {
    if (checked) {
      setSelectedParticipants(prev => [...prev, participantId]);
    } else {
      setSelectedParticipants(prev => prev.filter(id => id !== participantId));
    }
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading || !permissionChecked) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant='body2' sx={{ mt: 2, textAlign: 'center' }}>
          参加者情報を読み込み中...
        </Typography>
      </Box>
    );
  }

  if (error && !session) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/sessions')}
          >
            セッション一覧に戻る
          </Button>
          {id && (
            <Button
              variant="outlined"
              onClick={() => navigate(`/sessions/${id}`)}
            >
              セッション詳細に戻る
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  if (!hasManagePermission) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error' sx={{ mb: 2 }}>
          このセッションの参加者を管理する権限がありません。
          {user?.role === UserRole.EVALUATOR && session && (
            <Box component="span" sx={{ display: 'block', mt: 1, fontSize: '0.875rem' }}>
              参加者管理は作成者またはシステム管理者のみが行えます。
            </Box>
          )}
        </Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/sessions/${id}`)}
          >
            セッション詳細に戻る
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/sessions')}
          >
            セッション一覧に戻る
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(`/sessions/${id}`)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant='h4'>参加者管理</Typography>
          <Typography variant='body2' color='text.secondary'>
            {session?.name}
          </Typography>
        </Box>
        <Button
          variant='contained'
          startIcon={<PersonAddIcon />}
          onClick={() => setInviteDialogOpen(true)}
        >
          参加者を招待
        </Button>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity='success' sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* 参加者統計 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant='h6' color='primary'>
                {participants.length}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                総参加者数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant='h6' color='success.main'>
                {
                  participants.filter(p => p.invitationStatus === 'accepted')
                    .length
                }
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                参加済み
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant='h6' color='warning.main'>
                {
                  participants.filter(p => p.invitationStatus === 'pending')
                    .length
                }
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                招待中
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant='h6' color='info.main'>
                {participants.filter(p => p.hasSubmitted).length}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                評価提出済み
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 参加者一覧 */}
      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant='h6'>
              参加者一覧 ({participants.length}名)
            </Typography>
            {selectedParticipants.length > 0 && (
              <Button
                variant='outlined'
                color='error'
                size='small'
                startIcon={<DeleteIcon />}
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                選択した{selectedParticipants.length}名を削除
              </Button>
            )}
          </Box>

          {participants.length > 0 && (
            <Toolbar sx={{ pl: 0, pr: 0, minHeight: '48px !important' }}>
              <Checkbox
                checked={selectedParticipants.length === participants.length}
                indeterminate={
                  selectedParticipants.length > 0 &&
                  selectedParticipants.length < participants.length
                }
                onChange={e => handleSelectAll(e.target.checked)}
              />
              <Typography variant='body2' sx={{ ml: 1 }}>
                {selectedParticipants.length > 0
                  ? `${selectedParticipants.length}名選択中`
                  : '全て選択'}
              </Typography>
            </Toolbar>
          )}

          {participants.length > 0 ? (
            <List>
              {participants.map((participant, index) => (
                <React.Fragment key={participant.id}>
                  <ListItem>
                    <Checkbox
                      checked={selectedParticipants.includes(participant.id)}
                      onChange={e =>
                        handleSelectParticipant(
                          participant.id,
                          e.target.checked
                        )
                      }
                      sx={{ mr: 1 }}
                    />
                    <ListItemAvatar>
                      <Avatar src={participant.avatar}>
                        {participant.name[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <Typography variant='subtitle1'>
                            {participant.name}
                          </Typography>
                          <Chip
                            label={participant.role}
                            size='small'
                            variant='outlined'
                            color='primary'
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant='body2' color='text.secondary'>
                            {participant.email}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            招待日: {formatDate(participant.invitedAt)}
                            {participant.joinedAt &&
                              ` | 参加日: ${formatDate(participant.joinedAt)}`}
                            {participant.submittedAt &&
                              ` | 提出日: ${formatDate(participant.submittedAt)}`}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Chip
                          label={
                            participant.hasSubmitted ? '提出済み' : '未提出'
                          }
                          color={
                            participant.hasSubmitted ? 'success' : 'default'
                          }
                          size='small'
                        />
                        <Chip
                          label={
                            participant.invitationStatus === 'accepted'
                              ? '参加済み'
                              : '招待中'
                          }
                          color={
                            participant.invitationStatus === 'accepted'
                              ? 'primary'
                              : 'warning'
                          }
                          size='small'
                        />
                        <FormControl size='small' sx={{ minWidth: 100 }}>
                          <Select
                            value={participant.role}
                            onChange={e =>
                              handleRoleChangeRequest(
                                participant.id,
                                e.target.value as SessionUserRole
                              )
                            }
                          >
                            <MenuItem value={SessionUserRole.EVALUATOR}>
                              評価者
                            </MenuItem>
                            <MenuItem value={SessionUserRole.OBSERVER}>
                              観察者
                            </MenuItem>
                          </Select>
                        </FormControl>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => {
                            setParticipantToDelete(participant);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < participants.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography
              variant='body2'
              color='text.secondary'
              align='center'
              sx={{ py: 4 }}
            >
              まだ参加者がいません
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* 招待ダイアログ */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => {
          setInviteDialogOpen(false);
          setInviteEmails('');
          setInviteMessage('');
          setInviteRole(SessionUserRole.EVALUATOR);
          setInviteErrors({ emails: '', role: '' });
        }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>参加者を招待</DialogTitle>
        <DialogContent>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            メールアドレスを直接入力するか、CSVファイルから一括で招待できます。
          </Typography>
          <TextField
            fullWidth
            label='メールアドレス'
            placeholder='email1@example.com, email2@example.com'
            value={inviteEmails}
            onChange={e => {
              setInviteEmails(e.target.value);
              // リアルタイムバリデーション
              if (inviteErrors.emails) {
                setInviteErrors(prev => ({ ...prev, emails: '' }));
              }
            }}
            margin='normal'
            multiline
            rows={3}
            error={!!inviteErrors.emails}
            helperText={
              inviteErrors.emails ||
              '複数のメールアドレスはカンマで区切ってください'
            }
          />

          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, mb: 1 }}
          >
            <Typography variant='body2' color='text.secondary'>
              または
            </Typography>
            <Button
              variant='outlined'
              component='label'
              startIcon={<UploadIcon />}
              size='small'
            >
              CSVファイルから読み込み
              <input
                type='file'
                accept='.csv'
                hidden
                onChange={handleCsvUpload}
              />
            </Button>
            {csvFile && (
              <Typography variant='caption' color='text.secondary'>
                {csvFile.name}
              </Typography>
            )}
          </Box>

          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ display: 'block', mb: 2 }}
          >
            CSVファイルの1列目をメールアドレスとして読み込みます
          </Typography>

          <FormControl fullWidth margin='normal' error={!!inviteErrors.role}>
            <InputLabel>権限</InputLabel>
            <Select
              value={inviteRole}
              onChange={e => {
                setInviteRole(e.target.value as SessionUserRole);
                // リアルタイムバリデーション
                if (inviteErrors.role) {
                  setInviteErrors(prev => ({ ...prev, role: '' }));
                }
              }}
            >
              <MenuItem value={SessionUserRole.EVALUATOR}>評価者</MenuItem>
              <MenuItem value={SessionUserRole.OBSERVER}>観察者</MenuItem>
            </Select>
            {inviteErrors.role && (
              <Typography
                variant='caption'
                color='error'
                sx={{ mt: 0.5, ml: 1.5 }}
              >
                {inviteErrors.role}
              </Typography>
            )}
          </FormControl>

          <TextField
            fullWidth
            label='招待メッセージ（任意）'
            value={inviteMessage}
            onChange={e => setInviteMessage(e.target.value)}
            margin='normal'
            multiline
            rows={3}
            placeholder={`${session?.name}の評価セッションにご招待いたします。\n\n評価期間: ${session ? formatDate(session.startDate) : ''} ～ ${session ? formatDate(session.endDate) : ''}\n\nご参加をお待ちしております。`}
            helperText='空欄の場合は標準的な招待メッセージが送信されます'
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setInviteDialogOpen(false);
              setInviteEmails('');
              setInviteMessage('');
              setInviteRole(SessionUserRole.EVALUATOR);
              setInviteErrors({ emails: '', role: '' });
            }}
            disabled={isInviting}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleInvite}
            variant='contained'
            startIcon={<EmailIcon />}
            disabled={isInviting || !inviteEmails.trim() || !inviteRole}
          >
            {isInviting ? '招待中...' : '招待を送信'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>参加者の削除</DialogTitle>
        <DialogContent>
          <Typography>
            「{participantToDelete?.name}」を参加者から削除しますか？
            この操作は取り消すことができません。
          </Typography>
          {participantToDelete?.hasSubmitted && (
            <Alert severity='warning' sx={{ mt: 2 }}>
              この参加者は既に評価を提出しています。削除すると評価データも失われます。
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeleting}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleDeleteParticipant}
            color='error'
            variant='contained'
            disabled={isDeleting}
          >
            {isDeleting ? '削除中...' : '削除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 一括削除確認ダイアログ */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
      >
        <DialogTitle>参加者の一括削除</DialogTitle>
        <DialogContent>
          <Typography>
            選択した{selectedParticipants.length}名の参加者を削除しますか？
            この操作は取り消すことができません。
          </Typography>
          {selectedParticipants.some(
            id => participants.find(p => p.id === id)?.hasSubmitted
          ) && (
            <Alert severity='warning' sx={{ mt: 2 }}>
              選択した参加者の中に評価を提出済みの方が含まれています。
              削除すると評価データも失われます。
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setBulkDeleteDialogOpen(false)}
            disabled={isDeleting}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleBulkDelete}
            color='error'
            variant='contained'
            disabled={isDeleting}
          >
            {isDeleting
              ? '削除中...'
              : `${selectedParticipants.length}名を削除`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 権限変更確認ダイアログ */}
      <Dialog
        open={roleChangeDialogOpen}
        onClose={() => setRoleChangeDialogOpen(false)}
      >
        <DialogTitle>権限の変更</DialogTitle>
        <DialogContent>
          <Typography>
            「{roleChangeData?.participantName}」の権限を 「
            {roleChangeData?.currentRole}」から「{roleChangeData?.newRole}
            」に変更しますか？
          </Typography>
          {roleChangeData &&
            participants.find(p => p.id === roleChangeData.participantId)
              ?.hasSubmitted && (
              <Alert severity='info' sx={{ mt: 2 }}>
                この参加者は既に評価を提出しています。権限変更後も提出済みの評価は保持されます。
              </Alert>
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleChangeDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleRoleChangeConfirm}
            color='primary'
            variant='contained'
          >
            変更
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParticipantManagementPage;
