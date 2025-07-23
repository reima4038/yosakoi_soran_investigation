import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  BookmarkBorder as BookmarkIcon
} from '@mui/icons-material';

export interface Timestamp {
  id: string;
  time: number;
  label: string;
  description?: string;
  category?: string;
  color?: string;
}

interface TimestampManagerProps {
  timestamps: Timestamp[];
  currentTime: number;
  onTimestampAdd: (timestamp: Omit<Timestamp, 'id'>) => void;
  onTimestampUpdate: (id: string, timestamp: Partial<Timestamp>) => void;
  onTimestampDelete: (id: string) => void;
  onTimestampSeek: (time: number) => void;
  categories?: string[];
  readonly?: boolean;
}

const TimestampManager: React.FC<TimestampManagerProps> = ({
  timestamps,
  currentTime,
  onTimestampAdd,
  onTimestampUpdate,
  onTimestampDelete,
  onTimestampSeek,
  categories = ['開始', '見どころ', '技', '終了'],
  readonly = false
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTimestamp, setEditingTimestamp] = useState<Timestamp | null>(null);
  const [formData, setFormData] = useState({
    time: 0,
    label: '',
    description: '',
    category: categories[0] || ''
  });

  // 時間のフォーマット
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // カテゴリーの色を取得
  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      '開始': '#4caf50',
      '見どころ': '#ff9800',
      '技': '#2196f3',
      '終了': '#f44336',
      'default': '#9e9e9e'
    };
    return colors[category] || colors.default;
  };

  // 新しいタイムスタンプを追加
  const handleAddTimestamp = useCallback(() => {
    setFormData({
      time: Math.floor(currentTime),
      label: '',
      description: '',
      category: categories[0] || ''
    });
    setEditingTimestamp(null);
    setDialogOpen(true);
  }, [currentTime, categories]);

  // タイムスタンプを編集
  const handleEditTimestamp = useCallback((timestamp: Timestamp) => {
    setFormData({
      time: timestamp.time,
      label: timestamp.label,
      description: timestamp.description || '',
      category: timestamp.category || categories[0] || ''
    });
    setEditingTimestamp(timestamp);
    setDialogOpen(true);
  }, [categories]);

  // ダイアログを閉じる
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingTimestamp(null);
    setFormData({
      time: 0,
      label: '',
      description: '',
      category: categories[0] || ''
    });
  }, [categories]);

  // タイムスタンプを保存
  const handleSaveTimestamp = useCallback(() => {
    if (!formData.label.trim()) return;

    const timestampData = {
      time: formData.time,
      label: formData.label.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category,
      color: getCategoryColor(formData.category)
    };

    if (editingTimestamp) {
      onTimestampUpdate(editingTimestamp.id, timestampData);
    } else {
      onTimestampAdd(timestampData);
    }

    handleCloseDialog();
  }, [formData, editingTimestamp, onTimestampAdd, onTimestampUpdate, handleCloseDialog]);

  // タイムスタンプを削除
  const handleDeleteTimestamp = useCallback((id: string) => {
    onTimestampDelete(id);
  }, [onTimestampDelete]);

  // タイムスタンプにシーク
  const handleSeekToTimestamp = useCallback((time: number) => {
    onTimestampSeek(time);
  }, [onTimestampSeek]);

  // タイムスタンプをソート
  const sortedTimestamps = [...timestamps].sort((a, b) => a.time - b.time);

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h3">
              タイムスタンプ
            </Typography>
            {!readonly && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddTimestamp}
                size="small"
              >
                追加
              </Button>
            )}
          </Box>

          {sortedTimestamps.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              タイムスタンプがありません
            </Typography>
          ) : (
            <List dense>
              {sortedTimestamps.map((timestamp) => (
                <ListItem
                  key={timestamp.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: Math.abs(currentTime - timestamp.time) < 5 ? 'action.hover' : 'transparent'
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={formatTime(timestamp.time)}
                          size="small"
                          sx={{
                            backgroundColor: timestamp.color || getCategoryColor(timestamp.category || ''),
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                        <Typography variant="body2" fontWeight="medium">
                          {timestamp.label}
                        </Typography>
                        {timestamp.category && (
                          <Chip
                            label={timestamp.category}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    }
                    secondary={timestamp.description}
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="この時間にジャンプ">
                        <IconButton
                          size="small"
                          onClick={() => handleSeekToTimestamp(timestamp.time)}
                        >
                          <PlayIcon />
                        </IconButton>
                      </Tooltip>
                      {!readonly && (
                        <>
                          <Tooltip title="編集">
                            <IconButton
                              size="small"
                              onClick={() => handleEditTimestamp(timestamp)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="削除">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteTimestamp(timestamp.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}

          {/* 現在時刻のクイック追加 */}
          {!readonly && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <BookmarkIcon color="action" />
                <Typography variant="body2" color="text.secondary">
                  現在時刻: {formatTime(currentTime)}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleAddTimestamp}
                  startIcon={<AddIcon />}
                >
                  ここにマーク
                </Button>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* タイムスタンプ編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTimestamp ? 'タイムスタンプを編集' : 'タイムスタンプを追加'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="時間（秒）"
              type="number"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: parseInt(e.target.value) || 0 })}
              helperText={`${formatTime(formData.time)} の位置`}
              fullWidth
            />
            <TextField
              label="ラベル"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="例: 開始、見どころ、技名など"
              required
              fullWidth
            />
            <TextField
              label="説明（任意）"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="詳細な説明を入力"
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="カテゴリー"
              select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              SelectProps={{ native: true }}
              fullWidth
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            キャンセル
          </Button>
          <Button
            onClick={handleSaveTimestamp}
            variant="contained"
            disabled={!formData.label.trim()}
          >
            {editingTimestamp ? '更新' : '追加'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimestampManager;