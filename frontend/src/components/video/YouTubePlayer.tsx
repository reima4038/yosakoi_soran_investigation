import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  IconButton,
  Slider,
  Typography,
  Paper,
  Tooltip,
  Stack
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Replay10 as Replay10Icon,
  Forward10 as Forward10Icon
} from '@mui/icons-material';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';

interface YouTubePlayerComponentProps {
  videoId: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayerReady?: (player: YouTubePlayer) => void;
  seekToTime?: number;
  autoplay?: boolean;
  showControls?: boolean;
  height?: number;
  width?: number;
}

const YouTubePlayerComponent: React.FC<YouTubePlayerComponentProps> = ({
  videoId,
  onTimeUpdate,
  onDurationChange,
  onPlayerReady,
  seekToTime,
  autoplay = false,
  showControls = true,
  height = 360,
  width = 640
}) => {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const playerRef = useRef<HTMLDivElement>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // プレーヤーの準備完了時
  const handlePlayerReady: YouTubeProps['onReady'] = useCallback((event: any) => {
    const playerInstance = event.target;
    setPlayer(playerInstance);
    setIsReady(true);
    
    // 動画の長さを取得
    const videoDuration = playerInstance.getDuration();
    setDuration(videoDuration);
    onDurationChange?.(videoDuration);

    // 音量を設定
    playerInstance.setVolume(volume);

    // 外部コールバック
    onPlayerReady?.(playerInstance);

    // 時間更新の監視を開始
    startTimeTracking(playerInstance);
  }, [onDurationChange, volume, onPlayerReady, startTimeTracking]);

  // 再生状態変更時
  const handleStateChange: YouTubeProps['onStateChange'] = useCallback((event: any) => {
    const playerState = event.data;
    const YT = (window as any).YT;
    
    if (YT) {
      switch (playerState) {
        case YT.PlayerState.PLAYING:
          setIsPlaying(true);
          break;
        case YT.PlayerState.PAUSED:
        case YT.PlayerState.ENDED:
          setIsPlaying(false);
          break;
      }
    }
  }, []);

  // 時間追跡の開始
  const startTimeTracking = useCallback((playerInstance: YouTubePlayer) => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }

    timeUpdateIntervalRef.current = setInterval(() => {
      if (playerInstance && typeof playerInstance.getCurrentTime === 'function') {
        try {
          const time = playerInstance.getCurrentTime();
          setCurrentTime(time);
          onTimeUpdate?.(time);
        } catch (error) {
          console.warn('Failed to get current time:', error);
        }
      }
    }, 1000);
  }, [onTimeUpdate]);

  // 外部からの時間指定
  useEffect(() => {
    if (player && seekToTime !== undefined && isReady) {
      player.seekTo(seekToTime, true);
    }
  }, [player, seekToTime, isReady]);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, []);

  // 再生/一時停止の切り替え
  const togglePlayPause = useCallback(() => {
    if (!player) return;

    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }, [player, isPlaying]);

  // 音量の変更
  const handleVolumeChange = useCallback((_: Event, newValue: number | number[]) => {
    const volumeValue = Array.isArray(newValue) ? newValue[0] : newValue;
    setVolume(volumeValue);
    if (player) {
      player.setVolume(volumeValue);
      if (volumeValue === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  }, [player, isMuted]);

  // ミュート切り替え
  const toggleMute = useCallback(() => {
    if (!player) return;

    if (isMuted) {
      player.unMute();
      setIsMuted(false);
      setVolume(player.getVolume());
    } else {
      player.mute();
      setIsMuted(true);
    }
  }, [player, isMuted]);

  // シーク
  const handleSeek = useCallback((_: Event, newValue: number | number[]) => {
    const seekTime = Array.isArray(newValue) ? newValue[0] : newValue;
    if (player) {
      player.seekTo(seekTime, true);
      setCurrentTime(seekTime);
    }
  }, [player]);

  // 10秒戻る
  const skipBackward = useCallback(() => {
    if (player) {
      const newTime = Math.max(0, currentTime - 10);
      player.seekTo(newTime, true);
    }
  }, [player, currentTime]);

  // 10秒進む
  const skipForward = useCallback(() => {
    if (player) {
      const newTime = Math.min(duration, currentTime + 10);
      player.seekTo(newTime, true);
    }
  }, [player, currentTime, duration]);

  // フルスクリーン切り替え
  const toggleFullscreen = useCallback(() => {
    if (!playerRef.current) return;

    if (!isFullscreen) {
      if (playerRef.current.requestFullscreen) {
        playerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  // フルスクリーン状態の監視
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 時間のフォーマット
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const opts: YouTubeProps['opts'] = {
    height: height.toString(),
    width: width.toString(),
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: showControls ? 0 : 1, // カスタムコントロールを使用する場合は0
      disablekb: showControls ? 1 : 0,
      fs: 0, // フルスクリーンボタンを無効化（カスタムで実装）
      modestbranding: 1,
      rel: 0,
      showinfo: 0
    }
  };

  return (
    <Box ref={playerRef} sx={{ position: 'relative', width: '100%' }}>
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={handlePlayerReady}
        onStateChange={handleStateChange}
        style={{ width: '100%' }}
      />

      {showControls && isReady && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white'
          }}
        >
          {/* プログレスバー */}
          <Box sx={{ mb: 2 }}>
            <Slider
              value={currentTime}
              max={duration}
              onChange={handleSeek}
              sx={{
                color: 'red',
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12
                }
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption">
                {formatTime(currentTime)}
              </Typography>
              <Typography variant="caption">
                {formatTime(duration)}
              </Typography>
            </Box>
          </Box>

          {/* コントロールボタン */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="10秒戻る">
              <IconButton onClick={skipBackward} sx={{ color: 'white' }}>
                <Replay10Icon />
              </IconButton>
            </Tooltip>

            <Tooltip title={isPlaying ? '一時停止' : '再生'}>
              <IconButton onClick={togglePlayPause} sx={{ color: 'white' }}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="10秒進む">
              <IconButton onClick={skipForward} sx={{ color: 'white' }}>
                <Forward10Icon />
              </IconButton>
            </Tooltip>

            <Box sx={{ flexGrow: 1 }} />

            {/* 音量コントロール */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 120 }}>
              <Tooltip title={isMuted ? 'ミュート解除' : 'ミュート'}>
                <IconButton onClick={toggleMute} sx={{ color: 'white' }}>
                  {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                </IconButton>
              </Tooltip>
              <Slider
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                sx={{
                  color: 'white',
                  width: 80,
                  '& .MuiSlider-thumb': {
                    width: 12,
                    height: 12
                  }
                }}
              />
            </Stack>

            <Tooltip title={isFullscreen ? 'フルスクリーン終了' : 'フルスクリーン'}>
              <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default YouTubePlayerComponent;