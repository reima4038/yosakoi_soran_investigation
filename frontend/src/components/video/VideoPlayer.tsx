import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import { YouTubePlayer } from 'react-youtube';
import YouTubePlayerComponent from './YouTubePlayer';
import TimestampManager, { Timestamp } from './TimestampManager';
import { Video } from '../../services/videoService';

interface VideoPlayerProps {
  video: Video;
  timestamps?: Timestamp[];
  onTimestampAdd?: (timestamp: Omit<Timestamp, 'id'>) => void;
  onTimestampUpdate?: (id: string, timestamp: Partial<Timestamp>) => void;
  onTimestampDelete?: (id: string) => void;
  readonly?: boolean;
  autoplay?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  timestamps = [],
  onTimestampAdd,
  onTimestampUpdate,
  onTimestampDelete,
  readonly = false,
  autoplay = false,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekToTime, setSeekToTime] = useState<number | undefined>(undefined);
  const playerRef = useRef<YouTubePlayer | null>(null);

  // 時間更新のハンドラー
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // 動画の長さ変更のハンドラー
  const handleDurationChange = useCallback((videoDuration: number) => {
    setDuration(videoDuration);
  }, []);

  // プレーヤー準備完了のハンドラー
  const handlePlayerReady = useCallback((player: YouTubePlayer) => {
    playerRef.current = player;
  }, []);

  // タイムスタンプ追加のハンドラー
  const handleTimestampAdd = useCallback(
    (timestamp: Omit<Timestamp, 'id'>) => {
      const newTimestamp = {
        ...timestamp,
        id: `timestamp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      onTimestampAdd?.(newTimestamp);
    },
    [onTimestampAdd]
  );

  // タイムスタンプシークのハンドラー
  const handleTimestampSeek = useCallback((time: number) => {
    setSeekToTime(time);
    // シーク後にseekToTimeをリセット
    setTimeout(() => setSeekToTime(undefined), 100);
  }, []);

  // 時間のフォーマット
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* 動画プレーヤー部分 */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={2}>
            <Box sx={{ p: 2 }}>
              {/* 動画情報 */}
              <Box sx={{ mb: 2 }}>
                <Typography variant='h5' component='h2' gutterBottom>
                  {video.title}
                </Typography>
                <Stack
                  direction='row'
                  spacing={2}
                  alignItems='center'
                  flexWrap='wrap'
                >
                  <Typography variant='body2' color='text.secondary'>
                    {video.channelName}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    公開日:{' '}
                    {new Date(video.uploadDate).toLocaleDateString('ja-JP')}
                  </Typography>
                  {duration > 0 && (
                    <Typography variant='body2' color='text.secondary'>
                      長さ: {formatTime(duration)}
                    </Typography>
                  )}
                </Stack>
              </Box>

              {/* メタデータ */}
              {(video.metadata.teamName ||
                video.metadata.eventName ||
                video.metadata.year) && (
                <Box sx={{ mb: 2 }}>
                  <Stack direction='row' spacing={1} flexWrap='wrap'>
                    {video.metadata.teamName && (
                      <Chip
                        label={`チーム: ${video.metadata.teamName}`}
                        size='small'
                        color='primary'
                        variant='outlined'
                      />
                    )}
                    {video.metadata.eventName && (
                      <Chip
                        label={`大会: ${video.metadata.eventName}`}
                        size='small'
                        color='secondary'
                        variant='outlined'
                      />
                    )}
                    {video.metadata.year && (
                      <Chip
                        label={`${video.metadata.year}年`}
                        size='small'
                        variant='outlined'
                      />
                    )}
                    {video.metadata.performanceName && (
                      <Chip
                        label={`演舞: ${video.metadata.performanceName}`}
                        size='small'
                        color='info'
                        variant='outlined'
                      />
                    )}
                    {video.metadata.location && (
                      <Chip
                        label={`場所: ${video.metadata.location}`}
                        size='small'
                        variant='outlined'
                      />
                    )}
                  </Stack>
                </Box>
              )}

              {/* タグ */}
              {video.tags.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Stack direction='row' spacing={1} flexWrap='wrap'>
                    {video.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size='small'
                        variant='filled'
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              <Divider sx={{ mb: 2 }} />

              {/* YouTube プレーヤー */}
              <Box sx={{ position: 'relative', width: '100%' }}>
                <YouTubePlayerComponent
                  videoId={video.youtubeId}
                  onTimeUpdate={handleTimeUpdate}
                  onDurationChange={handleDurationChange}
                  onPlayerReady={handlePlayerReady}
                  seekToTime={seekToTime}
                  autoplay={autoplay}
                  showControls={true}
                  height={400}
                />
              </Box>

              {/* 動画説明 */}
              {video.description && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant='h6' gutterBottom>
                    説明
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{
                      whiteSpace: 'pre-wrap',
                      maxHeight: 200,
                      overflow: 'auto',
                      p: 2,
                      backgroundColor: 'action.hover',
                      borderRadius: 1,
                    }}
                  >
                    {video.description}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* タイムスタンプ管理部分 */}
        <Grid item xs={12} lg={4}>
          <TimestampManager
            timestamps={timestamps}
            currentTime={currentTime}
            onTimestampAdd={handleTimestampAdd}
            onTimestampUpdate={onTimestampUpdate || (() => {})}
            onTimestampDelete={onTimestampDelete || (() => {})}
            onTimestampSeek={handleTimestampSeek}
            readonly={readonly}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default VideoPlayer;
