import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Menu,
  MenuItem,
  Alert,
  Grid,
  Divider,
} from '@mui/material';
import {
  Add,
  PlayArrow,
  Edit,
  Delete,
  Share,
  MoreVert,
  Bookmark,
  Schedule,
  Visibility,
  Code,
} from '@mui/icons-material';
import {
  timestampService,
  TimestampLink,
  CreateTimestampLinkRequest,
} from '../../services/timestampService';

interface TimestampManagerProps {
  videoId: string;
  youtubeId: string;
  _videoTitle: string;
  currentTime?: number;
  onSeekTo?: (time: number) => void;
}

const TimestampManager: React.FC<TimestampManagerProps> = ({
  videoId,
  youtubeId,
  _videoTitle,
  currentTime = 0,
  onSeekTo,
}) => {
  const [links, setLinks] = useState<TimestampLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<TimestampLink | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLink, setSelectedLink] = useState<TimestampLink | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateTimestampLinkRequest>({
    videoId,
    title: '',
    description: '',
    startTime: 0,
    endTime: undefined,
    isHighlight: false,
    tags: [],
    isPublic: true,
  });

  useEffect(() => {
    loadTimestampLinks();
  }, [videoId]);

  useEffect(() => {
    if (showCreateDialog && !editingLink) {
      setFormData(prev => ({
        ...prev,
        startTime: Math.floor(currentTime),
      }));
    }
  }, [showCreateDialog, currentTime, editingLink]);

  const loadTimestampLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await timestampService.getTimestampLinks({ videoId });
      setLinks(result.links);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'タイムスタンプリンクの取得に失敗しました'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    setError(null);
    try {
      const newLink = await timestampService.createTimestampLink(formData);
      setLinks(prev => [newLink, ...prev]);
      setShowCreateDialog(false);
      resetForm();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'タイムスタンプリンクの作成に失敗しました'
      );
    }
  };

  const handleUpdateLink = async () => {
    if (!editingLink) return;

    setError(null);
    try {
      const updatedLink = await timestampService.updateTimestampLink(
        editingLink.id,
        formData
      );
      setLinks(prev =>
        prev.map(link => (link.id === editingLink.id ? updatedLink : link))
      );
      setShowCreateDialog(false);
      setEditingLink(null);
      resetForm();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'タイムスタンプリンクの更新に失敗しました'
      );
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!window.confirm('このタイムスタンプリンクを削除しますか？')) {
      return;
    }

    try {
      await timestampService.deleteTimestampLink(linkId);
      setLinks(prev => prev.filter(link => link.id !== linkId));
      setAnchorEl(null);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'タイムスタンプリンクの削除に失敗しました'
      );
    }
  };

  const handleCopyUrl = async (link: TimestampLink) => {
    const shareUrl = timestampService.generateShareUrl(link.shareToken);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess('URLをクリップボードにコピーしました');
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (err) {
      setError('URLのコピーに失敗しました');
    }
    setAnchorEl(null);
  };

  const handleCopyEmbedCode = async (link: TimestampLink) => {
    const embedCode = timestampService.generateEmbedCode(
      youtubeId,
      link.startTime,
      link.endTime,
      { width: 560, height: 315 }
    );
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopySuccess('埋め込みコードをクリップボードにコピーしました');
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (err) {
      setError('埋め込みコードのコピーに失敗しました');
    }
    setAnchorEl(null);
  };

  const handleSeekTo = (time: number) => {
    if (onSeekTo) {
      onSeekTo(time);
    }
  };

  const handleEditLink = (link: TimestampLink) => {
    setEditingLink(link);
    setFormData({
      videoId: link.videoId,
      title: link.title,
      description: link.description || '',
      startTime: link.startTime,
      endTime: link.endTime,
      isHighlight: link.isHighlight,
      tags: link.tags,
      isPublic: link.isPublic,
    });
    setShowCreateDialog(true);
    setAnchorEl(null);
  };

  const resetForm = () => {
    setFormData({
      videoId,
      title: '',
      description: '',
      startTime: Math.floor(currentTime),
      endTime: undefined,
      isHighlight: false,
      tags: [],
      isPublic: true,
    });
    setEditingLink(null);
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    link: TimestampLink
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedLink(link);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLink(null);
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    setFormData(prev => ({ ...prev, tags }));
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>タイムスタンプリンクを読み込み中...</Typography>
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
        <Typography variant='h6'>タイムスタンプリンク</Typography>
        <Button
          variant='contained'
          startIcon={<Add />}
          onClick={() => setShowCreateDialog(true)}
        >
          新規作成
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

      {links.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Schedule sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant='h6' color='text.secondary' gutterBottom>
              タイムスタンプリンクがありません
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              動画の特定の時点へのリンクを作成できます
            </Typography>
            <Button
              variant='outlined'
              startIcon={<Add />}
              onClick={() => setShowCreateDialog(true)}
            >
              最初のリンクを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <List>
          {links.map((link, index) => (
            <React.Fragment key={link.id}>
              <ListItem>
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                  <IconButton
                    size='small'
                    onClick={() => handleSeekTo(link.startTime)}
                    color='primary'
                  >
                    <PlayArrow />
                  </IconButton>
                </Box>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant='subtitle1'>{link.title}</Typography>
                      {link.isHighlight && (
                        <Chip
                          size='small'
                          label='ハイライト'
                          color='secondary'
                          icon={<Bookmark />}
                        />
                      )}
                      {!link.isPublic && (
                        <Chip size='small' label='非公開' variant='outlined' />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant='body2' color='text.secondary'>
                        {timestampService.formatTime(link.startTime)}
                        {link.endTime &&
                          ` - ${timestampService.formatTime(link.endTime)}`}
                        {link.isHighlight && link.endTime && (
                          <span>
                            {' '}
                            (長さ:{' '}
                            {timestampService.getHighlightDurationText(
                              link.startTime,
                              link.endTime
                            )}
                            )
                          </span>
                        )}
                      </Typography>
                      {link.description && (
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          sx={{ mt: 0.5 }}
                        >
                          {link.description}
                        </Typography>
                      )}
                      {link.tags.length > 0 && (
                        <Box
                          sx={{
                            mt: 1,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 0.5,
                          }}
                        >
                          {link.tags.map((tag, tagIndex) => (
                            <Chip
                              key={tagIndex}
                              size='small'
                              label={tag}
                              variant='outlined'
                            />
                          ))}
                        </Box>
                      )}
                      <Box
                        sx={{
                          mt: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <Visibility fontSize='small' />
                          <Typography variant='caption'>
                            {link.viewCount}回視聴
                          </Typography>
                        </Box>
                        <Typography variant='caption' color='text.secondary'>
                          {timestampService.getRelativeTime(link.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton onClick={e => handleMenuOpen(e, link)}>
                    <MoreVert />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              {index < links.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* メニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedLink && handleEditLink(selectedLink)}>
          <Edit fontSize='small' sx={{ mr: 1 }} />
          編集
        </MenuItem>
        <MenuItem onClick={() => selectedLink && handleCopyUrl(selectedLink)}>
          <Share fontSize='small' sx={{ mr: 1 }} />
          URLをコピー
        </MenuItem>
        <MenuItem
          onClick={() => selectedLink && handleCopyEmbedCode(selectedLink)}
        >
          <Code fontSize='small' sx={{ mr: 1 }} />
          埋め込みコードをコピー
        </MenuItem>
        <MenuItem
          onClick={() => selectedLink && handleDeleteLink(selectedLink.id)}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize='small' sx={{ mr: 1 }} />
          削除
        </MenuItem>
      </Menu>

      {/* 作成/編集ダイアログ */}
      <Dialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingLink(null);
          resetForm();
        }}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          {editingLink
            ? 'タイムスタンプリンクを編集'
            : 'タイムスタンプリンクを作成'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='タイトル'
                value={formData.title}
                onChange={e =>
                  setFormData(prev => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='説明（任意）'
                value={formData.description}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label='開始時間（秒）'
                type='number'
                value={formData.startTime}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    startTime: Number(e.target.value),
                  }))
                }
                required
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label='終了時間（秒）- ハイライト用'
                type='number'
                value={formData.endTime || ''}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    endTime: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
                inputProps={{ min: formData.startTime + 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='タグ（カンマ区切り）'
                value={formData.tags.join(', ')}
                onChange={e => handleTagsChange(e.target.value)}
                placeholder='例: ハイライト, 技術, 表現力'
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isHighlight}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        isHighlight: e.target.checked,
                      }))
                    }
                  />
                }
                label='ハイライト区間として設定'
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isPublic}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        isPublic: e.target.checked,
                      }))
                    }
                  />
                }
                label='公開する'
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowCreateDialog(false);
              setEditingLink(null);
              resetForm();
            }}
          >
            キャンセル
          </Button>
          <Button
            onClick={editingLink ? handleUpdateLink : handleCreateLink}
            variant='contained'
            disabled={!formData.title.trim()}
          >
            {editingLink ? '更新' : '作成'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimestampManager;
