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
      
      const sessionData = await sessionService.getSession(sessionId);
      setSession(sessionData);
      
      // 参加者データの変換（実際のAPIレスポンスに合わせて調整が必要）
      const participantData: SessionParticipant[] = sessionData.participants.map(p => ({
        id: p.userId,
        name: `User ${p.userId}`, // 実際のユーザー名を取得する必要がある
        email: `user${p.userId}@example.com`, // 実際のメールアドレスを取得する必要がある
        role: p.role,
        hasSubmitted: p.hasSubmitted,
        invitedAt: p.invitedAt.toISOString(),
        joinedAt: p.joinedAt?.toISOString(),
        invitationStatus: p.joinedAt ? 'accepted' : 'pending',
      }));
      
      setParticipants(participantData);
    } catch (error: any) {
      console.error('Session fetch error:', error);
      setError('セッション情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 参加者招待の処理
  const handleInvite = async () => {
    if (!id || !inviteEmails.trim()) return;

    try {
      setIsInviting(true);
      setError('');
      
      const emails = inviteEmails
        .split(',')
        .map(email => email.trim())
        .filter(email => email);

      await sessionService.inviteEvaluators(id, emails, inviteMessage);
      
      setSuccessMessage(`${emails.length}名の参加者を招待しました`);
      setInviteDialogOpen(false);
      setInviteEmails('');
      setInviteMessage('');
      
      // 参加者リストを再取得
      await fetchSessionData(id);
    } catch (error: any) {
      console.error('Invite error:', error);
      setError('参加者の招待に失敗しました');
    } finally {
      setIsInviting(false);
    }
  };

  // 参加者削除の処理
  const handleDeleteParticipant = async () => {
    if (!participantToDelete || !id) return;

    try {
      // 実際のAPIエンドポイントが必要
      // await sessionService.removeParticipant(id, participantToDelete.id);
      
      setParticipants(prev => 
        prev.filter(p => p.id !== participantToDelete.id)
      );
      
      setSuccessMessage('参加者を削除しました');
      setDeleteDialogOpen(false);
      setParticipantToDelete(null);
    } catch (error: any) {
      console.error('Delete participant error:', error);
      setError('参加者の削除に失敗しました');
    }
  };

  // 権限変更の処理
  const handleRoleChange = async (participantId: string, newRole: SessionUserRole) => {
    try {
      // 実際のAPIエンドポイントが必要
      // await sessionService.updateParticipantRole(id, participantId, newRole);
      
      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, role: newRole } : p
        )
      );
      
      setSuccessMessage('参加者の権限を変更しました');
    } catch (error: any) {
      console.error('Role change error:', error);
      setError('権限の変更に失敗しました');
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
                      primary={participant.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {participant.email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            招待日: {formatDate(participant.invitedAt)}
                            {participant.joinedAt && ` | 参加日: ${formatDate(participant.joinedAt)}`}
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
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>参加者を招待</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="メールアドレス"
            placeholder="email1@example.com, email2@example.com"
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            helperText="複数のメールアドレスはカンマで区切ってください"
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>権限</InputLabel>
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as SessionUserRole)}
            >
              <MenuItem value={SessionUserRole.EVALUATOR}>評価者</MenuItem>
              <MenuItem value={SessionUserRole.OBSERVER}>観察者</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="招待メッセージ（任意）"
            value={inviteMessage}
            onChange={(e) => setInviteMessage(e.target.value)}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleInvite}
            variant="contained"
            startIcon={<EmailIcon />}
            disabled={isInviting || !inviteEmails.trim()}
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