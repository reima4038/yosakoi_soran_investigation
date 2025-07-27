import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Divider,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Comment as CommentIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { Comment, evaluationService } from '../../services/evaluationService';
import { useResponsive } from '../../hooks/useResponsive';

interface TimelineCommentsProps {
  sessionId: string;
  comments: Comment[];
  currentTime: number;
  onSeekTo: (time: number) => void;
  onCommentsUpdate: (comments: Comment[]) => void;
  readonly?: boolean;
  compact?: boolean; // モバイル用コンパクト表示
}

interface CommentMarker {
  comment: Comment;
  position: number; // パーセンテージ (0-100)
}

const TimelineComments: React.FC<TimelineCommentsProps> = ({
  sessionId,
  comments,
  currentTime,
  onSeekTo,
  onCommentsUpdate,
  readonly = false,
  compact = false,
}) => {
  const { isMobile, isTouchDevice } = useResponsive();
  const [newCommentText, setNewCommentText] = useState('');
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editText, setEditText] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addCommentTime, setAddCommentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // 動画の長さを推定（最大コメントタイムスタンプ + バッファ）
  const videoDuration =
    Math.max(
      ...comments.map(c => c.timestamp),
      currentTime,
      300 // 最小5分
    ) + 60; // 1分のバッファ

  // コメントマーカーの位置を計算
  const commentMarkers: CommentMarker[] = comments.map(comment => ({
    comment,
    position: (comment.timestamp / videoDuration) * 100,
  }));

  // 現在時刻の位置を計算
  const currentTimePosition = (currentTime / videoDuration) * 100;

  // 時間フォーマット関数
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 新しいコメントの追加
  const handleAddComment = () => {
    setAddCommentTime(currentTime);
    setShowAddDialog(true);
  };

  const handleSaveNewComment = async () => {
    if (!newCommentText.trim()) {
      setError('コメント内容を入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const newComment = await evaluationService.addComment(
        sessionId,
        addCommentTime,
        newCommentText.trim()
      );

      const updatedComments = [...comments, newComment];
      onCommentsUpdate(updatedComments);

      setNewCommentText('');
      setShowAddDialog(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'コメントの追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // コメントの編集
  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setEditText(comment.text);
  };

  const handleSaveEdit = async () => {
    if (!editingComment || !editText.trim()) {
      setError('コメント内容を入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updatedComment = await evaluationService.updateComment(
        sessionId,
        editingComment.id!,
        editText.trim()
      );

      const updatedComments = comments.map(c =>
        c.id === editingComment.id ? updatedComment : c
      );
      onCommentsUpdate(updatedComments);

      setEditingComment(null);
      setEditText('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'コメントの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // コメントの削除
  const handleDeleteComment = async (comment: Comment) => {
    if (!window.confirm('このコメントを削除しますか？')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await evaluationService.deleteComment(sessionId, comment.id!);

      const updatedComments = comments.filter(c => c.id !== comment.id);
      onCommentsUpdate(updatedComments);
    } catch (err: any) {
      setError(err.response?.data?.message || 'コメントの削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // タイムラインクリックでシーク
  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const seekTime = (percentage / 100) * videoDuration;

    onSeekTo(Math.max(0, Math.min(seekTime, videoDuration)));
  };

  // コメントマーカークリックでシーク
  const handleMarkerClick = (comment: Comment) => {
    onSeekTo(comment.timestamp);
  };

  // コンパクト表示（モバイル用）
  if (compact) {
    return (
      <Box sx={{ position: 'relative' }}>
        {/* エラー表示 */}
        {error && (
          <Alert severity='error' sx={{ mb: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* コンパクトタイムライン */}
        <Box
          ref={timelineRef}
          sx={{
            position: 'relative',
            height: 40,
            backgroundColor: 'grey.100',
            borderRadius: 1,
            cursor: readonly ? 'default' : 'pointer',
            mb: 1,
          }}
          onClick={readonly ? undefined : handleTimelineClick}
        >
          {/* 現在時刻インジケーター */}
          <Box
            sx={{
              position: 'absolute',
              left: `${currentTimePosition}%`,
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: 'primary.main',
              zIndex: 2,
            }}
          />

          {/* 現在時刻ラベル */}
          <Chip
            label={formatTime(currentTime)}
            size='small'
            color='primary'
            sx={{
              position: 'absolute',
              left: `${Math.min(Math.max(currentTimePosition, 5), 90)}%`,
              top: -6,
              transform: 'translateX(-50%)',
              zIndex: 3,
              fontSize: '0.75rem',
              height: 24,
            }}
          />

          {/* コメントマーカー */}
          {commentMarkers.map((marker, index) => (
            <Box
              key={index}
              sx={{
                position: 'absolute',
                left: `${marker.position}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: isTouchDevice ? 16 : 12,
                height: isTouchDevice ? 16 : 12,
                backgroundColor: 'secondary.main',
                borderRadius: '50%',
                cursor: 'pointer',
                border: '2px solid white',
                zIndex: 1,
                '&:active': isTouchDevice ? {
                  backgroundColor: 'secondary.dark',
                  transform: 'translate(-50%, -50%) scale(1.1)',
                } : {},
              }}
              onClick={e => {
                e.stopPropagation();
                handleMarkerClick(marker.comment);
              }}
            />
          ))}
        </Box>

        {/* コメント数表示 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant='caption' color='text.secondary'>
            {comments.length} コメント
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {formatTime(videoDuration)}
          </Typography>
        </Box>

        {/* フローティングアクションボタン */}
        {!readonly && (
          <Fab
            size='small'
            color='primary'
            onClick={handleAddComment}
            disabled={loading}
            sx={{
              position: 'absolute',
              right: 8,
              top: -20,
              zIndex: 4,
            }}
          >
            <AddIcon />
          </Fab>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {/* エラー表示 */}
      {error && (
        <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* タイムライン */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Box
            display='flex'
            alignItems='center'
            justifyContent='space-between'
            mb={2}
            flexWrap={isMobile ? 'wrap' : 'nowrap'}
            gap={isMobile ? 1 : 0}
          >
            <Typography 
              variant={isMobile ? 'subtitle1' : 'h6'} 
              display='flex' 
              alignItems='center' 
              gap={1}
            >
              <ScheduleIcon />
              タイムライン
            </Typography>
            {!readonly && (
              <Button
                variant='contained'
                size={isMobile ? 'medium' : 'small'}
                startIcon={<AddIcon />}
                onClick={handleAddComment}
                disabled={loading}
                sx={{ minHeight: isMobile ? 44 : 'auto' }}
              >
                {isMobile ? '追加' : 'コメント追加'}
              </Button>
            )}
          </Box>

          {/* タイムライン本体 */}
          <Box
            ref={timelineRef}
            sx={{
              position: 'relative',
              height: isMobile ? 50 : 60,
              backgroundColor: 'grey.100',
              borderRadius: 1,
              cursor: readonly ? 'default' : 'pointer',
              mb: 1,
            }}
            onClick={readonly ? undefined : handleTimelineClick}
          >
            {/* 現在時刻インジケーター */}
            <Box
              sx={{
                position: 'absolute',
                left: `${currentTimePosition}%`,
                top: 0,
                bottom: 0,
                width: 2,
                backgroundColor: 'primary.main',
                zIndex: 2,
              }}
            />

            {/* 現在時刻ラベル */}
            <Chip
              label={formatTime(currentTime)}
              size='small'
              color='primary'
              sx={{
                position: 'absolute',
                left: `${Math.min(Math.max(currentTimePosition, 5), 90)}%`,
                top: -8,
                transform: 'translateX(-50%)',
                zIndex: 3,
                fontSize: isMobile ? '0.75rem' : '0.8125rem',
              }}
            />

            {/* コメントマーカー */}
            {commentMarkers.map((marker, index) => (
              <Tooltip
                key={index}
                title={
                  <Box>
                    <Typography variant='body2' fontWeight='bold'>
                      {formatTime(marker.comment.timestamp)}
                    </Typography>
                    <Typography variant='body2'>
                      {marker.comment.text}
                    </Typography>
                  </Box>
                }
                arrow
                disableHoverListener={isTouchDevice}
                disableFocusListener={isTouchDevice}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${marker.position}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: isTouchDevice ? 16 : 12,
                    height: isTouchDevice ? 16 : 12,
                    backgroundColor: 'secondary.main',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: '2px solid white',
                    zIndex: 1,
                    '&:hover': !isTouchDevice ? {
                      backgroundColor: 'secondary.dark',
                      transform: 'translate(-50%, -50%) scale(1.2)',
                    } : {},
                    '&:active': isTouchDevice ? {
                      backgroundColor: 'secondary.dark',
                      transform: 'translate(-50%, -50%) scale(1.1)',
                    } : {},
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    handleMarkerClick(marker.comment);
                  }}
                />
              </Tooltip>
            ))}
          </Box>

          {/* 時間軸ラベル */}
          <Box
            display='flex'
            justifyContent='space-between'
            sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
          >
            <span>0:00</span>
            <span>{formatTime(videoDuration)}</span>
          </Box>
        </CardContent>
      </Card>

      {/* コメント一覧 */}
      <Card>
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Typography
            variant={isMobile ? 'subtitle1' : 'h6'}
            display='flex'
            alignItems='center'
            gap={1}
            mb={2}
          >
            <CommentIcon />
            コメント一覧 ({comments.length})
          </Typography>

          {comments.length === 0 ? (
            <Typography
              variant='body2'
              color='text.secondary'
              textAlign='center'
              py={isMobile ? 2 : 4}
            >
              まだコメントがありません
            </Typography>
          ) : (
            <List sx={{ p: 0 }}>
              {comments
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((comment, index) => (
                  <React.Fragment key={comment.id || index}>
                    <ListItem 
                      alignItems='flex-start'
                      sx={{ 
                        px: 0,
                        py: isMobile ? 1.5 : 1,
                        minHeight: isTouchDevice ? 64 : 'auto',
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box 
                            display='flex' 
                            alignItems='center' 
                            gap={1}
                            flexWrap={isMobile ? 'wrap' : 'nowrap'}
                          >
                            <Chip
                              label={formatTime(comment.timestamp)}
                              size='small'
                              variant='outlined'
                              clickable
                              onClick={() => handleMarkerClick(comment)}
                              icon={<PlayArrowIcon />}
                              sx={{ 
                                minHeight: isTouchDevice ? 32 : 'auto',
                                '& .MuiChip-label': {
                                  fontSize: isMobile ? '0.75rem' : '0.8125rem',
                                }
                              }}
                            />
                            {comment.createdAt && (
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {new Date(comment.createdAt).toLocaleString('ja-JP')}
                              </Typography>
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography 
                            variant='body2' 
                            sx={{ 
                              mt: 1,
                              fontSize: isMobile ? '0.875rem' : '0.875rem',
                            }}
                          >
                            {comment.text}
                          </Typography>
                        }
                      />
                      {!readonly && (
                        <ListItemSecondaryAction>
                          <IconButton
                            edge='end'
                            onClick={() => handleEditComment(comment)}
                            disabled={loading}
                            size={isMobile ? 'medium' : 'small'}
                            sx={{ 
                              minHeight: isTouchDevice ? 44 : 'auto',
                              minWidth: isTouchDevice ? 44 : 'auto',
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge='end'
                            onClick={() => handleDeleteComment(comment)}
                            disabled={loading}
                            size={isMobile ? 'medium' : 'small'}
                            sx={{ 
                              ml: 1,
                              minHeight: isTouchDevice ? 44 : 'auto',
                              minWidth: isTouchDevice ? 44 : 'auto',
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                    {index < comments.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* コメント追加ダイアログ */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        maxWidth='sm'
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>コメントを追加 - {formatTime(addCommentTime)}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={isMobile ? 4 : 3}
            label='コメント内容'
            value={newCommentText}
            onChange={e => setNewCommentText(e.target.value)}
            placeholder='この時点でのコメントを入力してください'
            sx={{ mt: 1 }}
            size={isMobile ? 'medium' : 'small'}
          />
        </DialogContent>
        <DialogActions sx={{ p: isMobile ? 2 : 1 }}>
          <Button 
            onClick={() => setShowAddDialog(false)} 
            disabled={loading}
            size={isMobile ? 'large' : 'medium'}
            sx={{ minHeight: isMobile ? 48 : 'auto' }}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSaveNewComment}
            variant='contained'
            disabled={loading || !newCommentText.trim()}
            size={isMobile ? 'large' : 'medium'}
            sx={{ minHeight: isMobile ? 48 : 'auto' }}
          >
            追加
          </Button>
        </DialogActions>
      </Dialog>

      {/* コメント編集ダイアログ */}
      <Dialog
        open={!!editingComment}
        onClose={() => setEditingComment(null)}
        maxWidth='sm'
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          コメントを編集 -{' '}
          {editingComment && formatTime(editingComment.timestamp)}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={isMobile ? 4 : 3}
            label='コメント内容'
            value={editText}
            onChange={e => setEditText(e.target.value)}
            sx={{ mt: 1 }}
            size={isMobile ? 'medium' : 'small'}
          />
        </DialogContent>
        <DialogActions sx={{ p: isMobile ? 2 : 1 }}>
          <Button 
            onClick={() => setEditingComment(null)} 
            disabled={loading}
            size={isMobile ? 'large' : 'medium'}
            sx={{ minHeight: isMobile ? 48 : 'auto' }}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant='contained'
            disabled={loading || !editText.trim()}
            size={isMobile ? 'large' : 'medium'}
            sx={{ minHeight: isMobile ? 48 : 'auto' }}
          >
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimelineComments;
