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
  const { hasAnyRole } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 招待ダイアログの状態
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteRole, setInviteRole] = useState<SessionUserRole>(SessionUserRole.EVALUATOR);
  const [isInviting, setIsInviting] = useState(false);

  // 削除確認ダイアログの状態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<SessionParticipant | null>(null);

  // 招待フォームのバリデーション
  const [inviteErrors, setInviteErrors] = useState({
    emails: '',
    role: '',
  });

  // CSVファイルアップロード
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // セッション詳細の取得
  useEffect(() => {
    if (id) {
      fetchSessionData(id);
    }
  }, [id]);

  const fetchSessionData = async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError('');
      
      // セッション基本情報と参加者情報を並行取得
      const [sessionData, participantsData] = await Promise.all([
        sessionService.getSession(sessionId),
        sessionService.getSessionParticipants(sessionId).catch(() => null) // 参加者APIが失敗してもセッション情報は取得
      ]);
      
      setSession(sessionData);
      
      if (participantsData) {
        // 実際のAPIレスポンスから参加者データを変換
        const participantData: SessionParticipant[] = participantsData.participants?.map((p: any) => ({
          id: p.id || p.userId,
          name: p.user?.profile?.displayName || p.user?.username || p.name || 'Unknown User',
          email: p.user?.email || p.email || '',
          avatar: p.user?.profile?.avatar || p.avatar,
          role: p.role,
          hasSubmitted: p.hasSubmitted || false,
          submittedAt: p.submittedAt,
          invitedAt: p.invitedAt,
          joinedAt: p.joinedAt,
          invitationStatus: p.joinedAt ? 'accepted' : (p.invitationStatus || 'pending'),
        })) || [];
        
        setParticipants(participantData);
      } else {
        // APIが利用できない場合はセッションデータから参加者情報を取得
        const fallbackParticipants: SessionParticipant[] = sessionData.participants?.map((p: any) => ({
          id: p.userId || p.id,
          name: p.user?.profile?.displayName || p.user?.username || `User ${p.userId}`,
          email: p.user?.email || `user${p.userId}@example.com`,
          avatar: p.user?.profile?.avatar,
          role: p.role,
          hasSubmitted: p.hasSubmitted || false,
          submittedAt: p.submittedAt,
          invitedAt: p.invitedAt?.toISOString ? p.invitedAt.toISOString() : p.invitedAt,
          joinedAt: p.joinedAt?.toISOString ? p.joinedAt.toISOString() : p.joinedAt,
          invitationStatus: p.joinedAt ? 'accepted' : 'pending',
        })) || [];
        
        setParticipants(fallbackParticipants);
      }
    } catch (error: any) {
      console.error('Session fetch error:', error);
      
      // エラーの詳細な処理
      if (error.response?.status === 404) {
        setError('セッションが見つかりません');
      } else if (error.response?.status === 403) {
        setError('このセッションにアクセスする権限がありません');
      } else {
        setError('セッション情報の取得に失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
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
        error: `無効なメールアドレス: ${invalidEmails.join(', ')}` 
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
        error: `既に参加者として登録済み: ${duplicateEmails.join(', ')}` 
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
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      // CSVの各行からメールアドレスを抽出（1列目をメールアドレスとして扱う）
      const emails = lines
        .map(line => line.split(',')[0]?.trim())
        .filter(email => email && email !== 'email' && email !== 'メールアドレス') // ヘッダー行を除外
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

      await sessionService.inviteEvaluators(id, inviteData.emails, inviteData.message);
      
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
      
      
      // エラーの詳細な処理
      if (error.response?.status === 403) {
        setError('参加者を削除する権限がありません');
      } else if (error.response?.status === 404) {
        setError('参加者が見つかりません');
      } else {
        setError('参加者の削除に失敗しました');
      }
      
      setDeleteDialogOpen(false);
      setParticipantToDelete(null);
    }
  };

  // 権限変更の処理
  const handleRoleChange = async (participantId: string, newRole: SessionUserRole) => {
    if (!id) return;
    
    try {
      setError('');
      
      await sessionService.updateParticipantRole(id, participantId, newRole);
      
      // ローカル状態を更新
      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, role: newRole } : p
        )
      );
      
      const participant = participants.find(p => p.id === participantId);
      setSuccessMessage(`${participant?.name}の権限を${newRole}に変更しました`);
    } catch (error: any) {
      
      
      // エラーの詳細な処理
      if (error.response?.status === 403) {
        setError('参加者の権限を変更する権限がありません');
      } else if (error.response?.status === 404) {
        setError('参加者が見つかりません');
      } else {
        setError('権限の変更に失敗しました');
      }
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

  // 管理権限の確認
  const canManage = hasAnyRole([UserRole.ADMIN, UserRole.EVALUATOR]);

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          参加者情報を読み込み中...
        </Typography>
      </Box>
    );
  }

  if (error && !session) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/sessions')}
          sx={{ mt: 2 }}
        >
          セッション一覧に戻る
        </Button>
      </Box>
    );
  }

  if (!canManage) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">参加者を管理する権限がありません</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/sessions/${id}`)}
          sx={{ mt: 2 }}
        >
          セッション詳細に戻る
        </Button>
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
          <Typography variant="h4">
            参加者管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {session?.name}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setInviteDialogOpen(true)}
        >
          参加者を招待
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* 参加者統計 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {participants.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                総参加者数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {participants.filter(p => p.invitationStatus === 'accepted').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                参加済み
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {participants.filter(p => p.invitationStatus === 'pending').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                招待中
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {participants.filter(p => p.hasSubmitted).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                評価提出済み
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 参加者一覧 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            参加者一覧 ({participants.length}名)
          </Typography>
          
          {participants.length > 0 ? (
            <List>
              {participants.map((participant, index) => (
                <React.Fragment key={participant.id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar src={participant.avatar}>
                        {participant.name[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {participant.name}
                          </Typography>
                          <Chip
                            label={participant.role}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {participant.email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            招待日: {formatDate(participant.invitedAt)}
                            {participant.joinedAt && ` | 参加日: ${formatDate(participant.joinedAt)}`}
                            {participant.submittedAt && ` | 提出日: ${formatDate(participant.submittedAt)}`}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={participant.hasSubmitted ? '提出済み' : '未提出'}
                          color={participant.hasSubmitted ? 'success' : 'default'}
                          size="small"
                        />
                        <Chip
                          label={participant.invitationStatus === 'accepted' ? '参加済み' : '招待中'}
                          color={participant.invitationStatus === 'accepted' ? 'primary' : 'warning'}
                          size="small"
                        />
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <Select
                            value={participant.role}
                            onChange={(e) => handleRoleChange(participant.id, e.target.value as SessionUserRole)}
                          >
                            <MenuItem value={SessionUserRole.EVALUATOR}>評価者</MenuItem>
                            <MenuItem value={SessionUserRole.OBSERVER}>観察者</MenuItem>
                          </Select>
                        </FormControl>
                        <IconButton
                          size="small"
                          color="error"
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
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
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
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>参加者を招待</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            メールアドレスを直接入力するか、CSVファイルから一括で招待できます。
          </Typography>
          <TextField
            fullWidth
            label="メールアドレス"
            placeholder="email1@example.com, email2@example.com"
            value={inviteEmails}
            onChange={(e) => {
              setInviteEmails(e.target.value);
              // リアルタイムバリデーション
              if (inviteErrors.emails) {
                setInviteErrors(prev => ({ ...prev, emails: '' }));
              }
            }}
            margin="normal"
            multiline
            rows={3}
            error={!!inviteErrors.emails}
            helperText={inviteErrors.emails || "複数のメールアドレスはカンマで区切ってください"}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              または
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              size="small"
            >
              CSVファイルから読み込み
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={handleCsvUpload}
              />
            </Button>
            {csvFile && (
              <Typography variant="caption" color="text.secondary">
                {csvFile.name}
              </Typography>
            )}
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            CSVファイルの1列目をメールアドレスとして読み込みます
          </Typography>
          
          <FormControl fullWidth margin="normal" error={!!inviteErrors.role}>
            <InputLabel>権限</InputLabel>
            <Select
              value={inviteRole}
              onChange={(e) => {
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
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                {inviteErrors.role}
              </Typography>
            )}
          </FormControl>
          
          <TextField
            fullWidth
            label="招待メッセージ（任意）"
            value={inviteMessage}
            onChange={(e) => setInviteMessage(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            placeholder={`${session?.name}の評価セッションにご招待いたします。\n\n評価期間: ${session ? formatDate(session.startDate) : ''} ～ ${session ? formatDate(session.endDate) : ''}\n\nご参加をお待ちしております。`}
            helperText="空欄の場合は標準的な招待メッセージが送信されます"
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
            variant="contained"
            startIcon={<EmailIcon />}
            disabled={isInviting || !inviteEmails.trim() || !inviteRole}
          >
            {isInviting ? '招待中...' : '招待を送信'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>参加者の削除</DialogTitle>
        <DialogContent>
          <Typography>
            「{participantToDelete?.name}」を参加者から削除しますか？
            この操作は取り消すことができません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleDeleteParticipant} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParticipantManagementPage;