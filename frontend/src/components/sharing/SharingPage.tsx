import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Switch,
  FormControlLabel,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
  Paper,
  Avatar,
  Divider,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Share as ShareIcon,
  Link as LinkIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Comment as CommentIcon,
  Reply as ReplyIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Public as PublicIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sharing-tabpanel-${index}`}
      aria-labelledby={`sharing-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// 共有リンクの型定義
interface ShareLink {
  id: string;
  name: string;
  url: string;
  isPublic: boolean;
  allowComments: boolean;
  expiresAt?: string;
  accessCount: number;
  createdAt: string;
}

// フィードバックの型定義
interface Feedback {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: string;
  likes: number;
  dislikes: number;
  replies: Array<{
    id: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    timestamp: string;
  }>;
  isLiked: boolean;
  isDisliked: boolean;
}

// 通知設定の型定義
interface NotificationSettings {
  emailOnComment: boolean;
  emailOnReply: boolean;
  emailOnLike: boolean;
  pushOnComment: boolean;
  pushOnReply: boolean;
  pushOnLike: boolean;
}

const SharingPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, hasAnyRole } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailOnComment: true,
    emailOnReply: true,
    emailOnLike: false,
    pushOnComment: true,
    pushOnReply: true,
    pushOnLike: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [createLinkDialogOpen, setCreateLinkDialogOpen] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkPublic, setNewLinkPublic] = useState(true);
  const [newLinkComments, setNewLinkComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyToFeedback, setReplyToFeedback] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // データの取得
  useEffect(() => {
    if (sessionId) {
      fetchSharingData(sessionId);
    }
  }, [sessionId]);

  const fetchSharingData = async (id: string) => {
    try {
      setIsLoading(true);
      // TODO: API呼び出し
      // const response = await apiClient.get(`/api/sessions/${id}/sharing`);
      // setShareLinks(response.data.shareLinks);
      // setFeedbacks(response.data.feedbacks);
      // setNotifications(response.data.notifications);

      // モックデータ
      const mockShareLinks: ShareLink[] = [
        {
          id: 'link1',
          name: '一般公開リンク',
          url: `https://example.com/shared/results/${id}?token=abc123`,
          isPublic: true,
          allowComments: true,
          accessCount: 25,
          createdAt: '2024-08-10T10:00:00Z',
        },
        {
          id: 'link2',
          name: '関係者限定リンク',
          url: `https://example.com/shared/results/${id}?token=def456`,
          isPublic: false,
          allowComments: false,
          expiresAt: '2024-09-10T23:59:59Z',
          accessCount: 8,
          createdAt: '2024-08-12T14:30:00Z',
        },
      ];

      const mockFeedbacks: Feedback[] = [
        {
          id: 'feedback1',
          authorName: '観客A',
          content: '素晴らしい演舞でした！特に隊形変化が美しく、感動しました。',
          timestamp: '2024-08-15T16:30:00Z',
          likes: 12,
          dislikes: 0,
          replies: [
            {
              id: 'reply1',
              authorName: 'チーム代表',
              content: 'ありがとうございます！練習の成果が出て嬉しいです。',
              timestamp: '2024-08-15T18:00:00Z',
            },
          ],
          isLiked: false,
          isDisliked: false,
        },
        {
          id: 'feedback2',
          authorName: '指導者B',
          content: '技術的な完成度が高く、表現力も豊かでした。今後の発展が楽しみです。',
          timestamp: '2024-08-16T09:15:00Z',
          likes: 8,
          dislikes: 0,
          replies: [],
          isLiked: true,
          isDisliked: false,
        },
        {
          id: 'feedback3',
          authorName: '他チーム関係者',
          content: '衣装と音楽の調和が素晴らしく、ストーリー性も感じられました。',
          timestamp: '2024-08-16T14:45:00Z',
          likes: 5,
          dislikes: 1,
          replies: [],
          isLiked: false,
          isDisliked: false,
        },
      ];

      setShareLinks(mockShareLinks);
      setFeedbacks(mockFeedbacks);
    } catch (error: any) {
      setError('共有データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // タブ変更
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 共有リンク作成
  const handleCreateShareLink = async () => {
    try {
      // TODO: API呼び出し
      // const response = await apiClient.post(`/api/sessions/${sessionId}/share-links`, {
      //   name: newLinkName,
      //   isPublic: newLinkPublic,
      //   allowComments: newLinkComments,
      // });

      // モック処理
      const newLink: ShareLink = {
        id: `link_${Date.now()}`,
        name: newLinkName,
        url: `https://example.com/shared/results/${sessionId}?token=${Math.random().toString(36).substr(2, 9)}`,
        isPublic: newLinkPublic,
        allowComments: newLinkComments,
        accessCount: 0,
        createdAt: new Date().toISOString(),
      };

      setShareLinks(prev => [...prev, newLink]);
      setCreateLinkDialogOpen(false);
      setNewLinkName('');
      setNewLinkPublic(true);
      setNewLinkComments(true);
      setSnackbarMessage('共有リンクを作成しました');
      setSnackbarOpen(true);
    } catch (error: any) {
      setError('共有リンクの作成に失敗しました');
    }
  };

  // リンクのコピー
  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setSnackbarMessage('リンクをコピーしました');
      setSnackbarOpen(true);
    } catch (error) {
      setError('リンクのコピーに失敗しました');
    }
  };

  // 共有リンク削除
  const handleDeleteShareLink = async (linkId: string) => {
    try {
      // TODO: API呼び出し
      // await apiClient.delete(`/api/sessions/${sessionId}/share-links/${linkId}`);
      setShareLinks(prev => prev.filter(link => link.id !== linkId));
      setSnackbarMessage('共有リンクを削除しました');
      setSnackbarOpen(true);
    } catch (error: any) {
      setError('共有リンクの削除に失敗しました');
    }
  };

  // フィードバック投稿
  const handlePostFeedback = async () => {
    if (!newComment.trim()) return;

    try {
      // TODO: API呼び出し
      // const response = await apiClient.post(`/api/sessions/${sessionId}/feedback`, {
      //   content: newComment,
      // });

      // モック処理
      const newFeedback: Feedback = {
        id: `feedback_${Date.now()}`,
        authorName: user?.profile?.displayName || user?.username || 'あなた',
        authorAvatar: user?.profile?.avatar,
        content: newComment,
        timestamp: new Date().toISOString(),
        likes: 0,
        dislikes: 0,
        replies: [],
        isLiked: false,
        isDisliked: false,
      };

      setFeedbacks(prev => [newFeedback, ...prev]);
      setNewComment('');
      setSnackbarMessage('フィードバックを投稿しました');
      setSnackbarOpen(true);
    } catch (error: any) {
      setError('フィードバックの投稿に失敗しました');
    }
  };

  // 返信投稿
  const handlePostReply = async () => {
    if (!replyContent.trim() || !replyToFeedback) return;

    try {
      // TODO: API呼び出し
      // await apiClient.post(`/api/feedback/${replyToFeedback}/replies`, {
      //   content: replyContent,
      // });

      // モック処理
      const newReply = {
        id: `reply_${Date.now()}`,
        authorName: user?.profile?.displayName || user?.username || 'あなた',
        authorAvatar: user?.profile?.avatar,
        content: replyContent,
        timestamp: new Date().toISOString(),
      };

      setFeedbacks(prev => prev.map(feedback =>
        feedback.id === replyToFeedback
          ? { ...feedback, replies: [...feedback.replies, newReply] }
          : feedback
      ));

      setReplyDialogOpen(false);
      setReplyToFeedback(null);
      setReplyContent('');
      setSnackbarMessage('返信を投稿しました');
      setSnackbarOpen(true);
    } catch (error: any) {
      setError('返信の投稿に失敗しました');
    }
  };

  // いいね/よくないね
  const handleLike = async (feedbackId: string, isLike: boolean) => {
    try {
      // TODO: API呼び出し
      // await apiClient.post(`/api/feedback/${feedbackId}/${isLike ? 'like' : 'dislike'}`);

      // モック処理
      setFeedbacks(prev => prev.map(feedback => {
        if (feedback.id === feedbackId) {
          if (isLike) {
            return {
              ...feedback,
              likes: feedback.isLiked ? feedback.likes - 1 : feedback.likes + 1,
              dislikes: feedback.isDisliked ? feedback.dislikes - 1 : feedback.dislikes,
              isLiked: !feedback.isLiked,
              isDisliked: false,
            };
          } else {
            return {
              ...feedback,
              likes: feedback.isLiked ? feedback.likes - 1 : feedback.likes,
              dislikes: feedback.isDisliked ? feedback.dislikes - 1 : feedback.dislikes + 1,
              isLiked: false,
              isDisliked: !feedback.isDisliked,
            };
          }
        }
        return feedback;
      }));
    } catch (error: any) {
      setError('評価の更新に失敗しました');
    }
  };

  // 通知設定の更新
  const handleNotificationChange = async (setting: keyof NotificationSettings, value: boolean) => {
    try {
      // TODO: API呼び出し
      // await apiClient.put(`/api/sessions/${sessionId}/notification-settings`, {
      //   [setting]: value,
      // });

      setNotifications(prev => ({
        ...prev,
        [setting]: value,
      }));
    } catch (error: any) {
      setError('通知設定の更新に失敗しました');
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

  // 権限確認
  const canManageSharing = hasAnyRole([UserRole.ADMIN, UserRole.EVALUATOR]);

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          共有設定を読み込み中...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          共有・フィードバック
        </Typography>
        <Typography variant="body2" color="text.secondary">
          評価結果の共有設定とフィードバックの管理
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* タブ */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab icon={<ShareIcon />} label="共有設定" />
          <Tab icon={<CommentIcon />} label="フィードバック" />
          <Tab icon={<NotificationsIcon />} label="通知設定" />
        </Tabs>

        {/* 共有設定タブ */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">共有リンク管理</Typography>
            {canManageSharing && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateLinkDialogOpen(true)}
              >
                新規リンク作成
              </Button>
            )}
          </Box>

          <Grid container spacing={3}>
            {shareLinks.map((link) => (
              <Grid item xs={12} key={link.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {link.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <Chip
                            icon={link.isPublic ? <PublicIcon /> : <LockIcon />}
                            label={link.isPublic ? '公開' : '非公開'}
                            color={link.isPublic ? 'success' : 'default'}
                            size="small"
                          />
                          <Chip
                            label={link.allowComments ? 'コメント可' : 'コメント不可'}
                            color={link.allowComments ? 'primary' : 'default'}
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          アクセス数: {link.accessCount}回 | 作成日: {formatDate(link.createdAt)}
                          {link.expiresAt && ` | 有効期限: ${formatDate(link.expiresAt)}`}
                        </Typography>
                      </Box>
                      {canManageSharing && (
                        <IconButton
                          onClick={() => handleDeleteShareLink(link.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <TextField
                        value={link.url}
                        fullWidth
                        size="small"
                        InputProps={{ readOnly: true }}
                      />
                      <Tooltip title="リンクをコピー">
                        <IconButton onClick={() => handleCopyLink(link.url)}>
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {shareLinks.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ShareIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                共有リンクがありません
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                評価結果を共有するためのリンクを作成しましょう。
              </Typography>
              {canManageSharing && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateLinkDialogOpen(true)}
                >
                  最初のリンクを作成
                </Button>
              )}
            </Box>
          )}
        </TabPanel>

        {/* フィードバックタブ */}
        <TabPanel value={tabValue} index={1}>
          {/* フィードバック投稿フォーム */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                フィードバックを投稿
              </Typography>
              <TextField
                placeholder="演舞に対するフィードバックをお書きください..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                multiline
                rows={3}
                fullWidth
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                startIcon={<CommentIcon />}
                onClick={handlePostFeedback}
                disabled={!newComment.trim()}
              >
                投稿
              </Button>
            </CardContent>
          </Card>

          {/* フィードバック一覧 */}
          <Typography variant="h6" gutterBottom>
            フィードバック ({feedbacks.length}件)
          </Typography>

          {feedbacks.map((feedback) => (
            <Card key={feedback.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar src={feedback.authorAvatar}>
                    {feedback.authorName[0]}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2">
                        {feedback.authorName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(feedback.timestamp)}
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {feedback.content}
                    </Typography>

                    {/* アクションボタン */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<ThumbUpIcon />}
                        onClick={() => handleLike(feedback.id, true)}
                        color={feedback.isLiked ? 'primary' : 'inherit'}
                      >
                        {feedback.likes}
                      </Button>
                      <Button
                        size="small"
                        startIcon={<ThumbDownIcon />}
                        onClick={() => handleLike(feedback.id, false)}
                        color={feedback.isDisliked ? 'error' : 'inherit'}
                      >
                        {feedback.dislikes}
                      </Button>
                      <Button
                        size="small"
                        startIcon={<ReplyIcon />}
                        onClick={() => {
                          setReplyToFeedback(feedback.id);
                          setReplyDialogOpen(true);
                        }}
                      >
                        返信
                      </Button>
                    </Box>

                    {/* 返信一覧 */}
                    {feedback.replies.length > 0 && (
                      <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e0e0e0' }}>
                        {feedback.replies.map((reply) => (
                          <Box key={reply.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                            <Avatar src={reply.authorAvatar} sx={{ width: 32, height: 32 }}>
                              {reply.authorName[0]}
                            </Avatar>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontSize: '0.875rem' }}>
                                  {reply.authorName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDate(reply.timestamp)}
                                </Typography>
                              </Box>
                              <Typography variant="body2">
                                {reply.content}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}

          {feedbacks.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CommentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                フィードバックがありません
              </Typography>
              <Typography variant="body2" color="text.secondary">
                最初のフィードバックを投稿してディスカッションを始めましょう。
              </Typography>
            </Box>
          )}
        </TabPanel>

        {/* 通知設定タブ */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            通知設定
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    メール通知
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="新しいコメント"
                        secondary="フィードバックが投稿されたときに通知"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={notifications.emailOnComment}
                          onChange={(e) => handleNotificationChange('emailOnComment', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary="返信"
                        secondary="あなたのコメントに返信があったときに通知"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={notifications.emailOnReply}
                          onChange={(e) => handleNotificationChange('emailOnReply', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary="いいね"
                        secondary="あなたのコメントにいいねがついたときに通知"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={notifications.emailOnLike}
                          onChange={(e) => handleNotificationChange('emailOnLike', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    プッシュ通知
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="新しいコメント"
                        secondary="フィードバックが投稿されたときに通知"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={notifications.pushOnComment}
                          onChange={(e) => handleNotificationChange('pushOnComment', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary="返信"
                        secondary="あなたのコメントに返信があったときに通知"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={notifications.pushOnReply}
                          onChange={(e) => handleNotificationChange('pushOnReply', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary="いいね"
                        secondary="あなたのコメントにいいねがついたときに通知"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={notifications.pushOnLike}
                          onChange={(e) => handleNotificationChange('pushOnLike', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* 共有リンク作成ダイアログ */}
      <Dialog
        open={createLinkDialogOpen}
        onClose={() => setCreateLinkDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新規共有リンク作成</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="リンク名"
            value={newLinkName}
            onChange={(e) => setNewLinkName(e.target.value)}
            fullWidth
            margin="normal"
            placeholder="例: 一般公開用リンク"
          />
          <FormControlLabel
            control={
              <Switch
                checked={newLinkPublic}
                onChange={(e) => setNewLinkPublic(e.target.checked)}
              />
            }
            label="公開リンク（誰でもアクセス可能）"
            sx={{ mt: 2, display: 'block' }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={newLinkComments}
                onChange={(e) => setNewLinkComments(e.target.checked)}
              />
            }
            label="コメント機能を有効にする"
            sx={{ mt: 1, display: 'block' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateLinkDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleCreateShareLink}
            variant="contained"
            disabled={!newLinkName.trim()}
          >
            作成
          </Button>
        </DialogActions>
      </Dialog>

      {/* 返信ダイアログ */}
      <Dialog
        open={replyDialogOpen}
        onClose={() => setReplyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>返信を投稿</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="返信内容"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            multiline
            rows={3}
            fullWidth
            margin="normal"
            placeholder="返信内容を入力してください..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handlePostReply}
            variant="contained"
            disabled={!replyContent.trim()}
          >
            投稿
          </Button>
        </DialogActions>
      </Dialog>

      {/* スナックバー */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default SharingPage;