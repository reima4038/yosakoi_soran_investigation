import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from './VideoPlayer';
import { Timestamp } from './TimestampManager';
import { videoService, Video } from '../../services/videoService';

interface VideoDetailPageProps {
  onEdit?: (video: Video) => void;
}

const VideoDetailPage: React.FC<VideoDetailPageProps> = ({ onEdit }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [video, setVideo] = useState<Video | null>(null);
  const [timestamps, setTimestamps] = useState<Timestamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 動画データを取得
  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) {
        setError('動画IDが指定されていません');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const videoData = await videoService.getVideo(id);
        setVideo(videoData);

        // TODO: タイムスタンプデータを取得（後のタスクで実装）
        // const timestampData = await timestampService.getTimestamps(id);
        // setTimestamps(timestampData);
      } catch (err: any) {
        setError(err.response?.data?.message || '動画の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id]);

  // タイムスタンプ追加
  const handleTimestampAdd = async (timestamp: Omit<Timestamp, 'id'>) => {
    try {
      // TODO: タイムスタンプをサーバーに保存（後のタスクで実装）
      const newTimestamp: Timestamp = {
        ...timestamp,
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      setTimestamps(prev => [...prev, newTimestamp]);
    } catch (err: any) {
      // console.error('Failed to add timestamp:', err);
    }
  };

  // タイムスタンプ更新
  const handleTimestampUpdate = async (
    id: string,
    updates: Partial<Timestamp>
  ) => {
    try {
      // TODO: タイムスタンプをサーバーで更新（後のタスクで実装）
      setTimestamps(prev =>
        prev.map(timestamp =>
          timestamp.id === id ? { ...timestamp, ...updates } : timestamp
        )
      );
    } catch (err: any) {
      // console.error('Failed to update timestamp:', err);
    }
  };

  // タイムスタンプ削除
  const handleTimestampDelete = async (id: string) => {
    try {
      // TODO: タイムスタンプをサーバーから削除（後のタスクで実装）
      setTimestamps(prev => prev.filter(timestamp => timestamp.id !== id));
    } catch (err: any) {
      // console.error('Failed to delete timestamp:', err);
    }
  };

  // 戻るボタン
  const handleBack = () => {
    navigate(-1);
  };

  // 編集ボタン
  const handleEdit = () => {
    if (video && onEdit) {
      onEdit(video);
    }
  };

  if (loading) {
    return (
      <Container maxWidth='xl'>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth='xl'>
        <Box sx={{ py: 3 }}>
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant='outlined'
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            戻る
          </Button>
        </Box>
      </Container>
    );
  }

  if (!video) {
    return (
      <Container maxWidth='xl'>
        <Box sx={{ py: 3 }}>
          <Alert severity='warning'>動画が見つかりません</Alert>
          <Button
            variant='outlined'
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mt: 2 }}
          >
            戻る
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth='xl'>
      <Box sx={{ py: 3 }}>
        {/* パンくずリスト */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component='button'
            variant='body2'
            onClick={handleBack}
            sx={{ textDecoration: 'none' }}
          >
            動画一覧
          </Link>
          <Typography variant='body2' color='text.primary'>
            {video.title}
          </Typography>
        </Breadcrumbs>

        {/* ヘッダー */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Button
            variant='outlined'
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            戻る
          </Button>

          {onEdit && (
            <Button
              variant='contained'
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              編集
            </Button>
          )}
        </Box>

        {/* 動画プレーヤー */}
        <VideoPlayer
          video={video}
          timestamps={timestamps}
          onTimestampAdd={handleTimestampAdd}
          onTimestampUpdate={handleTimestampUpdate}
          onTimestampDelete={handleTimestampDelete}
          readonly={false}
          autoplay={false}
        />

        {/* 追加情報 */}
        <Paper elevation={1} sx={{ mt: 3, p: 2 }}>
          <Typography variant='h6' gutterBottom>
            動画情報
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant='subtitle2' color='text.secondary'>
                登録者
              </Typography>
              <Typography variant='body2'>
                {video.createdBy.username}
              </Typography>
            </Box>
            <Box>
              <Typography variant='subtitle2' color='text.secondary'>
                登録日
              </Typography>
              <Typography variant='body2'>
                {new Date(video.createdAt).toLocaleDateString('ja-JP')}
              </Typography>
            </Box>
            <Box>
              <Typography variant='subtitle2' color='text.secondary'>
                YouTube ID
              </Typography>
              <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                {video.youtubeId}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default VideoDetailPage;
