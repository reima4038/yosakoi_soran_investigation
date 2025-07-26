import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  Typography,
  TextField,
  Button,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Menu,
  MenuList,
  MenuItem as MenuItemComponent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  videoService,
  Video,
  VideoListParams,
} from '../../services/videoService';

interface VideoListProps {
  onVideoSelect?: (video: Video) => void;
  onVideoEdit?: (video: Video) => void;
  refreshTrigger?: number;
}

const VideoList: React.FC<VideoListProps> = ({
  onVideoSelect,
  onVideoEdit,
  refreshTrigger,
}) => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // フィルター状態
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');

  // メニュー状態
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // 削除確認ダイアログ
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: VideoListParams = {
        page: currentPage,
        limit: 12,
      };

      if (searchTerm) params.search = searchTerm;
      if (selectedYear) params.year = selectedYear as number;
      if (selectedTeam) params.teamName = selectedTeam;
      if (selectedEvent) params.eventName = selectedEvent;

      const response = await videoService.getVideos(params);
      setVideos(response.videos);
      setTotalPages(response.pagination.pages);
    } catch (err: any) {
      setError(err.response?.data?.message || '動画の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedYear, selectedTeam, selectedEvent]);

  useEffect(() => {
    fetchVideos();
  }, [refreshTrigger, fetchVideos]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchVideos();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedYear('');
    setSelectedTeam('');
    setSelectedEvent('');
    setCurrentPage(1);
    fetchVideos();
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    video: Video
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedVideo(video);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVideo(null);
  };

  const handleDeleteClick = (video: Video) => {
    setVideoToDelete(video);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!videoToDelete) return;

    try {
      await videoService.deleteVideo(videoToDelete._id);
      setDeleteDialogOpen(false);
      setVideoToDelete(null);
      fetchVideos(); // リストを更新
    } catch (err: any) {
      setError(err.response?.data?.message || '動画の削除に失敗しました');
    }
  };

  const handleEditClick = () => {
    if (selectedVideo && onVideoEdit) {
      onVideoEdit(selectedVideo);
    }
    handleMenuClose();
  };

  const handleVideoClick = (video: Video) => {
    if (onVideoSelect) {
      onVideoSelect(video);
    } else {
      // デフォルトで詳細ページに遷移
      navigate(`/videos/${video._id}`);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => currentYear - i);

  if (loading && videos.length === 0) {
    return (
      <Box>
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Card>
                <Skeleton variant='rectangular' height={180} />
                <CardContent>
                  <Skeleton variant='text' height={32} />
                  <Skeleton variant='text' height={20} />
                  <Skeleton variant='text' height={20} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 検索・フィルター */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems='center'>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size='small'
                label='検索'
                placeholder='タイトル、チーム名、大会名で検索'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={handleSearch} size='small'>
                      <SearchIcon />
                    </IconButton>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth size='small'>
                <InputLabel>年度</InputLabel>
                <Select
                  value={selectedYear}
                  label='年度'
                  onChange={e => setSelectedYear(e.target.value as number | '')}
                >
                  <MenuItem value=''>すべて</MenuItem>
                  {yearOptions.map(year => (
                    <MenuItem key={year} value={year}>
                      {year}年
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4} md={2}>
              <TextField
                fullWidth
                size='small'
                label='チーム名'
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4} md={2}>
              <TextField
                fullWidth
                size='small'
                label='大会名'
                value={selectedEvent}
                onChange={e => setSelectedEvent(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={8} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant='contained'
                  onClick={handleSearch}
                  startIcon={<SearchIcon />}
                  fullWidth
                >
                  検索
                </Button>
                <Button
                  variant='outlined'
                  onClick={handleClearFilters}
                  startIcon={<FilterIcon />}
                >
                  クリア
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 動画一覧 */}
      <Grid container spacing={2}>
        {videos.map(video => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={video._id}>
            <Card
              sx={{
                height: '100%',
                cursor: onVideoSelect ? 'pointer' : 'default',
                '&:hover': onVideoSelect
                  ? {
                      boxShadow: 4,
                    }
                  : {},
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component='img'
                  height='180'
                  image={video.thumbnailUrl}
                  alt={video.title}
                  onClick={() => handleVideoClick(video)}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: 1,
                  }}
                >
                  <IconButton
                    size='small'
                    onClick={e => handleMenuOpen(e, video)}
                    sx={{ color: 'white' }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                {onVideoSelect && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      borderRadius: '50%',
                      p: 1,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      '&:hover': { opacity: 1 },
                    }}
                  >
                    <PlayIcon sx={{ color: 'white', fontSize: 32 }} />
                  </Box>
                )}
              </Box>

              <CardContent onClick={() => handleVideoClick(video)}>
                <Typography variant='h6' component='h3' gutterBottom noWrap>
                  {video.title}
                </Typography>

                <Typography variant='body2' color='text.secondary' gutterBottom>
                  {video.channelName}
                </Typography>

                {video.metadata.teamName && (
                  <Typography variant='body2' gutterBottom>
                    チーム: {video.metadata.teamName}
                  </Typography>
                )}

                {video.metadata.eventName && (
                  <Typography variant='body2' gutterBottom>
                    大会: {video.metadata.eventName}
                  </Typography>
                )}

                {video.metadata.year && (
                  <Typography variant='body2' gutterBottom>
                    年度: {video.metadata.year}年
                  </Typography>
                )}

                <Box
                  sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
                >
                  {video.tags.slice(0, 3).map((tag, index) => (
                    <Chip key={index} label={tag} size='small' />
                  ))}
                  {video.tags.length > 3 && (
                    <Chip label={`+${video.tags.length - 3}`} size='small' />
                  )}
                </Box>

                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ mt: 1, display: 'block' }}
                >
                  登録日:{' '}
                  {new Date(video.createdAt).toLocaleDateString('ja-JP')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ページネーション */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color='primary'
          />
        </Box>
      )}

      {/* コンテキストメニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuList>
          <MenuItemComponent onClick={handleEditClick}>
            <EditIcon sx={{ mr: 1 }} />
            編集
          </MenuItemComponent>
          <MenuItemComponent
            onClick={() => selectedVideo && handleDeleteClick(selectedVideo)}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1 }} />
            削除
          </MenuItemComponent>
        </MenuList>
      </Menu>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>動画の削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{videoToDelete?.title}」を削除しますか？
            この操作は取り消せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleDeleteConfirm}
            color='error'
            variant='contained'
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VideoList;
