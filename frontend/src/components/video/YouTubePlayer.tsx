import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  Box,
  IconButton,
  Slider,
  Typography,
  Paper,
  Tooltip,
  Stack,
  Alert,
  CircularProgress,
  Fade,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Replay10 as Replay10Icon,
  Forward10 as Forward10Icon,
  Settings as SettingsIcon,
  Hd as HdIcon,
  SignalWifi1Bar as LowQualityIcon,
  SignalWifi4Bar as HighQualityIcon,
  BatteryAlert as BatteryIcon,
} from '@mui/icons-material';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';
import { useResponsive } from '../../hooks/useResponsive';

interface YouTubePlayerComponentProps {
  videoId: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayerReady?: (player: YouTubePlayer) => void;
  seekToTime?: number;
  autoplay?: boolean;
  showControls?: boolean;
  height?: number | string;
  width?: number | string;
  mobileOptimized?: boolean;
  adaptiveQuality?: boolean;
  batteryOptimized?: boolean;
}

export interface YouTubePlayerRef {
  seekTo: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  play: () => void;
  pause: () => void;
}

const YouTubePlayerComponent = forwardRef<
  YouTubePlayerRef,
  YouTubePlayerComponentProps
>(
  (
    {
      videoId,
      onTimeUpdate,
      onDurationChange,
      onPlayerReady,
      seekToTime,
      autoplay = false,
      showControls: showControlsProp = true,
      height = 360,
      width = 640,
      mobileOptimized = true,
      adaptiveQuality = true,
      batteryOptimized = true,
    },
    ref
  ) => {
    const { isMobile, isTouchDevice } = useResponsive();
    const [player, setPlayer] = useState<YouTubePlayer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [networkQuality, setNetworkQuality] = useState<'high' | 'medium' | 'low'>('high');
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
    const [isLowPowerMode, setIsLowPowerMode] = useState(false);
    const [currentQuality, setCurrentQuality] = useState<string>('auto');
    const [availableQualities, setAvailableQualities] = useState<string[]>([]);

    const playerRef = useRef<HTMLDivElement>(null);
    const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const networkMonitorRef = useRef<NodeJS.Timeout | null>(null);

    // バッテリー状態の監視
    const monitorBatteryStatus = useCallback(async () => {
      if ('getBattery' in navigator && batteryOptimized) {
        try {
          const battery = await (navigator as any).getBattery();
          setBatteryLevel(battery.level);
          setIsLowPowerMode(battery.level < 0.2 || !battery.charging);
          
          battery.addEventListener('levelchange', () => {
            setBatteryLevel(battery.level);
            setIsLowPowerMode(battery.level < 0.2 || !battery.charging);
          });
          
          battery.addEventListener('chargingchange', () => {
            setIsLowPowerMode(battery.level < 0.2 || !battery.charging);
          });
        } catch (error) {
          // Battery API not supported
        }
      }
    }, [batteryOptimized]);

    // ネットワーク品質の監視
    const monitorNetworkQuality = useCallback(() => {
      if ('connection' in navigator && adaptiveQuality) {
        const connection = (navigator as any).connection;
        
        const updateNetworkQuality = () => {
          const effectiveType = connection.effectiveType;
          switch (effectiveType) {
            case '4g':
              setNetworkQuality('high');
              break;
            case '3g':
              setNetworkQuality('medium');
              break;
            case '2g':
            case 'slow-2g':
              setNetworkQuality('low');
              break;
            default:
              setNetworkQuality('medium');
          }
        };

        updateNetworkQuality();
        connection.addEventListener('change', updateNetworkQuality);
        
        return () => {
          connection.removeEventListener('change', updateNetworkQuality);
        };
      }
    }, [adaptiveQuality]);

    // 時間追跡の開始（バッテリー最適化対応）
    const startTimeTracking = useCallback(
      (playerInstance: YouTubePlayer) => {
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current);
        }

        // バッテリー最適化: 低電力モードでは更新頻度を下げる
        const updateInterval = isLowPowerMode ? 2000 : 1000;

        timeUpdateIntervalRef.current = setInterval(() => {
          if (
            playerInstance &&
            typeof playerInstance.getCurrentTime === 'function'
          ) {
            try {
              const time = playerInstance.getCurrentTime();
              setCurrentTime(time);
              onTimeUpdate?.(time);
            } catch (error) {
              // エラーログを削除してサイレントに処理
            }
          }
        }, updateInterval);
      },
      [onTimeUpdate, isLowPowerMode]
    );

    // コントロールの自動非表示（モバイル用）
    const hideControlsAfterDelay = useCallback(() => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      if (isMobile && isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setControlsVisible(false);
        }, 3000);
      }
    }, [isMobile, isPlaying]);

    // コントロールの表示
    const showControlsHandler = useCallback(() => {
      setControlsVisible(true);
      hideControlsAfterDelay();
    }, [hideControlsAfterDelay]);

    // 品質の自動調整
    const adjustQualityBasedOnConditions = useCallback((playerInstance: YouTubePlayer) => {
      if (!adaptiveQuality) return;

      let targetQuality = 'auto';
      
      // ネットワーク品質に基づく調整
      if (networkQuality === 'low') {
        targetQuality = 'small'; // 240p
      } else if (networkQuality === 'medium') {
        targetQuality = 'medium'; // 360p
      } else if (isLowPowerMode) {
        targetQuality = 'medium'; // バッテリー節約のため360pに制限
      }

      // モバイルデバイスでの最適化
      if (isMobile && !isFullscreen) {
        // 小さい画面では高画質は不要
        if (targetQuality === 'auto') {
          targetQuality = 'large'; // 480p
        }
      }

      try {
        if (targetQuality !== 'auto') {
          playerInstance.setPlaybackQuality(targetQuality);
          setCurrentQuality(targetQuality);
        }
      } catch (error) {
        // Quality setting failed
      }
    }, [adaptiveQuality, networkQuality, isLowPowerMode, isMobile, isFullscreen]);

    // 外部からアクセス可能なメソッドを公開
    useImperativeHandle(
      ref,
      () => ({
        seekTo: (time: number) => {
          if (player) {
            player.seekTo(time, true);
          }
        },
        getCurrentTime: () => {
          return player ? player.getCurrentTime() : 0;
        },
        getDuration: () => {
          return player ? player.getDuration() : 0;
        },
        play: () => {
          if (player) {
            player.playVideo();
          }
        },
        pause: () => {
          if (player) {
            player.pauseVideo();
          }
        },
      }),
      [player]
    );

    // プレーヤーの準備完了時
    const handlePlayerReady: YouTubeProps['onReady'] = useCallback(
      (event: any) => {
        const playerInstance = event.target;
        setPlayer(playerInstance);
        setIsReady(true);
        setIsLoading(false);

        // 動画の長さを取得
        const videoDuration = playerInstance.getDuration();
        setDuration(videoDuration);
        onDurationChange?.(videoDuration);

        // 音量を設定（モバイルでは初期音量を下げる）
        const initialVolume = isMobile ? Math.min(volume, 70) : volume;
        playerInstance.setVolume(initialVolume);
        setVolume(initialVolume);

        // 利用可能な品質レベルを取得
        try {
          const qualities = playerInstance.getAvailableQualityLevels();
          setAvailableQualities(qualities);
        } catch (error) {
          // Quality levels not available
        }

        // 品質の自動調整
        adjustQualityBasedOnConditions(playerInstance);

        // 外部コールバック
        onPlayerReady?.(playerInstance);

        // 時間更新の監視を開始
        startTimeTracking(playerInstance);

        // モバイル用コントロール自動非表示
        if (isMobile) {
          hideControlsAfterDelay();
        }
      },
      [onDurationChange, volume, onPlayerReady, startTimeTracking, isMobile, adjustQualityBasedOnConditions, hideControlsAfterDelay]
    );

    // 再生状態変更時
    const handleStateChange: YouTubeProps['onStateChange'] = useCallback(
      (event: any) => {
        const playerState = event.data;
        const YT = (window as any).YT;

        if (YT) {
          switch (playerState) {
            case YT.PlayerState.PLAYING:
              setIsPlaying(true);
              setIsLoading(false);
              if (isMobile) {
                hideControlsAfterDelay();
              }
              break;
            case YT.PlayerState.PAUSED:
            case YT.PlayerState.ENDED:
              setIsPlaying(false);
              if (isMobile) {
                setControlsVisible(true);
              }
              break;
            case YT.PlayerState.BUFFERING:
              setIsLoading(true);
              break;
          }
        }
      },
      [isMobile, hideControlsAfterDelay]
    );

    // 外部からの時間指定
    useEffect(() => {
      if (player && seekToTime !== undefined && isReady) {
        player.seekTo(seekToTime, true);
      }
    }, [player, seekToTime, isReady]);

    // 初期化時の監視開始
    useEffect(() => {
      monitorBatteryStatus();
      const networkCleanup = monitorNetworkQuality();
      
      return () => {
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current);
        }
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
        if (networkMonitorRef.current) {
          clearInterval(networkMonitorRef.current);
        }
        if (networkCleanup) {
          networkCleanup();
        }
      };
    }, [monitorBatteryStatus, monitorNetworkQuality]);

    // 品質調整の監視
    useEffect(() => {
      if (player && isReady) {
        adjustQualityBasedOnConditions(player);
      }
    }, [player, isReady, networkQuality, isLowPowerMode, isFullscreen, adjustQualityBasedOnConditions]);

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
    const handleVolumeChange = useCallback(
      (_: Event, newValue: number | number[]) => {
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
      },
      [player, isMuted]
    );

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
    const handleSeek = useCallback(
      (_: Event, newValue: number | number[]) => {
        const seekTime = Array.isArray(newValue) ? newValue[0] : newValue;
        if (player) {
          player.seekTo(seekTime, true);
          setCurrentTime(seekTime);
        }
      },
      [player]
    );

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
        document.removeEventListener(
          'fullscreenchange',
          handleFullscreenChange
        );
      };
    }, []);

    // 時間のフォーマット
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const opts: YouTubeProps['opts'] = {
      height: typeof height === 'string' ? height : height.toString(),
      width: typeof width === 'string' ? width : width.toString(),
      playerVars: {
        autoplay: autoplay && !isLowPowerMode ? 1 : 0, // バッテリー節約時は自動再生無効
        controls: showControlsProp ? 0 : 1, // カスタムコントロールを使用する場合は0
        disablekb: showControlsProp ? 1 : 0,
        fs: 0, // フルスクリーンボタンを無効化（カスタムで実装）
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        // モバイル最適化設定
        playsinline: isMobile ? 1 : 0, // iOSでインライン再生
        enablejsapi: 1,
        // 品質設定
        vq: networkQuality === 'low' ? 'small' : networkQuality === 'medium' ? 'medium' : 'auto',
        // バッテリー最適化
        html5: 1, // HTML5プレーヤーを強制使用
        cc_load_policy: isLowPowerMode ? 0 : 1, // 低電力時は字幕を無効化
      },
    };

    return (
      <Box 
        ref={playerRef} 
        sx={{ 
          position: 'relative', 
          width: '100%',
          backgroundColor: 'black',
          // モバイル用タッチ最適化
          touchAction: 'manipulation',
        }}
        onClick={isMobile ? showControlsHandler : undefined}
      >
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={handlePlayerReady}
          onStateChange={handleStateChange}
          style={{ width: '100%' }}
        />

        {/* ローディング表示 */}
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}
          >
            <CircularProgress sx={{ color: 'white' }} />
          </Box>
        )}

        {/* ネットワーク/バッテリー状態表示 */}
        {(isLowPowerMode || networkQuality === 'low') && (
          <Alert
            severity="warning"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: 8,
              zIndex: 5,
              fontSize: '0.75rem',
            }}
          >
            {isLowPowerMode && <BatteryIcon sx={{ mr: 1, fontSize: 16 }} />}
            {networkQuality === 'low' && <LowQualityIcon sx={{ mr: 1, fontSize: 16 }} />}
            {isLowPowerMode ? 'バッテリー節約モード' : '低速ネットワーク検出'}
          </Alert>
        )}

        {/* カスタムコントロール */}
        {showControlsProp && isReady && (
          <Fade in={controlsVisible || !isMobile} timeout={300}>
            <Paper
              elevation={3}
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: isMobile ? 1 : 2,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
              }}
            >
              {/* プログレスバー */}
              <Box sx={{ mb: isMobile ? 1 : 2 }}>
                <Slider
                  value={currentTime}
                  max={duration}
                  onChange={handleSeek}
                  sx={{
                    color: 'red',
                    '& .MuiSlider-thumb': {
                      width: isTouchDevice ? 16 : 12,
                      height: isTouchDevice ? 16 : 12,
                    },
                    '& .MuiSlider-track': {
                      height: isTouchDevice ? 4 : 3,
                    },
                    '& .MuiSlider-rail': {
                      height: isTouchDevice ? 4 : 3,
                    },
                  }}
                />
                <Box
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    mt: 0.5,
                    alignItems: 'center',
                  }}
                >
                  <Typography variant='caption' sx={{ fontSize: isMobile ? '0.75rem' : '0.75rem' }}>
                    {formatTime(currentTime)}
                  </Typography>
                  
                  {/* 品質インジケーター */}
                  {adaptiveQuality && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {networkQuality === 'high' ? (
                        <HighQualityIcon sx={{ fontSize: 14 }} />
                      ) : (
                        <LowQualityIcon sx={{ fontSize: 14 }} />
                      )}
                      <Typography variant='caption' sx={{ fontSize: '0.7rem' }}>
                        {currentQuality}
                      </Typography>
                    </Box>
                  )}
                  
                  <Typography variant='caption' sx={{ fontSize: isMobile ? '0.75rem' : '0.75rem' }}>
                    {formatTime(duration)}
                  </Typography>
                </Box>
              </Box>

              {/* コントロールボタン */}
              <Stack 
                direction='row' 
                spacing={isMobile ? 0.5 : 1} 
                alignItems='center'
                justifyContent={isMobile ? 'space-around' : 'flex-start'}
              >
                <Tooltip title='10秒戻る' disableHoverListener={isTouchDevice}>
                  <IconButton 
                    onClick={skipBackward} 
                    sx={{ 
                      color: 'white',
                      minHeight: isTouchDevice ? 44 : 'auto',
                      minWidth: isTouchDevice ? 44 : 'auto',
                    }}
                  >
                    <Replay10Icon />
                  </IconButton>
                </Tooltip>

                <Tooltip title={isPlaying ? '一時停止' : '再生'} disableHoverListener={isTouchDevice}>
                  <IconButton 
                    onClick={togglePlayPause} 
                    sx={{ 
                      color: 'white',
                      minHeight: isTouchDevice ? 44 : 'auto',
                      minWidth: isTouchDevice ? 44 : 'auto',
                    }}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </IconButton>
                </Tooltip>

                <Tooltip title='10秒進む' disableHoverListener={isTouchDevice}>
                  <IconButton 
                    onClick={skipForward} 
                    sx={{ 
                      color: 'white',
                      minHeight: isTouchDevice ? 44 : 'auto',
                      minWidth: isTouchDevice ? 44 : 'auto',
                    }}
                  >
                    <Forward10Icon />
                  </IconButton>
                </Tooltip>

                {!isMobile && <Box sx={{ flexGrow: 1 }} />}

                {/* 音量コントロール（デスクトップのみ） */}
                {!isMobile && (
                  <Stack
                    direction='row'
                    spacing={1}
                    alignItems='center'
                    sx={{ minWidth: 120 }}
                  >
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
                          height: 12,
                        },
                      }}
                    />
                  </Stack>
                )}

                {/* モバイル用ミュートボタン */}
                {isMobile && (
                  <Tooltip title={isMuted ? 'ミュート解除' : 'ミュート'} disableHoverListener={isTouchDevice}>
                    <IconButton 
                      onClick={toggleMute} 
                      sx={{ 
                        color: 'white',
                        minHeight: 44,
                        minWidth: 44,
                      }}
                    >
                      {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                    </IconButton>
                  </Tooltip>
                )}

                <Tooltip
                  title={isFullscreen ? 'フルスクリーン終了' : 'フルスクリーン'}
                  disableHoverListener={isTouchDevice}
                >
                  <IconButton 
                    onClick={toggleFullscreen} 
                    sx={{ 
                      color: 'white',
                      minHeight: isTouchDevice ? 44 : 'auto',
                      minWidth: isTouchDevice ? 44 : 'auto',
                    }}
                  >
                    {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </Paper>
          </Fade>
        )}

        {/* バッテリーレベル表示（低電力時のみ） */}
        {batteryLevel !== null && isLowPowerMode && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <BatteryIcon sx={{ fontSize: 14 }} />
            {Math.round(batteryLevel * 100)}%
          </Box>
        )}
      </Box>
    );
  }
);

export default YouTubePlayerComponent;
