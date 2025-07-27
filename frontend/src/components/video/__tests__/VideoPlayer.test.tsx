import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VideoPlayer } from '../VideoPlayer';

// Mock YouTube Player API
const mockYouTubePlayer = {
  playVideo: jest.fn(),
  pauseVideo: jest.fn(),
  seekTo: jest.fn(),
  getCurrentTime: jest.fn(() => 0),
  getDuration: jest.fn(() => 300),
  getPlayerState: jest.fn(() => 1), // Playing state
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  destroy: jest.fn()
};

// Mock YouTube API
(global as any).YT = {
  Player: jest.fn().mockImplementation(() => mockYouTubePlayer),
  PlayerState: {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5
  }
};

// Mock the YouTube API script loading
Object.defineProperty(window, 'onYouTubeIframeAPIReady', {
  writable: true,
  value: jest.fn()
});

describe('VideoPlayer', () => {
  const defaultProps = {
    videoId: 'dQw4w9WgXcQ',
    onTimeUpdate: jest.fn(),
    onStateChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any created players
    if (mockYouTubePlayer.destroy) {
      mockYouTubePlayer.destroy();
    }
  });

  it('should render video player container', () => {
    render(<VideoPlayer {...defaultProps} />);
    
    const playerContainer = screen.getByTestId('youtube-player');
    expect(playerContainer).toBeInTheDocument();
  });

  it('should initialize YouTube player with correct video ID', async () => {
    render(<VideoPlayer {...defaultProps} />);
    
    await waitFor(() => {
      expect((global as any).YT.Player).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          videoId: 'dQw4w9WgXcQ',
          events: expect.objectContaining({
            onReady: expect.any(Function),
            onStateChange: expect.any(Function)
          })
        })
      );
    });
  });

  it('should handle play button click', async () => {
    const { rerender } = render(<VideoPlayer {...defaultProps} />);
    
    // Simulate player ready
    const playerInstance = (global as any).YT.Player.mock.results[0].value;
    const onReady = (global as any).YT.Player.mock.calls[0][1].events.onReady;
    onReady({ target: playerInstance });

    rerender(<VideoPlayer {...defaultProps} />);

    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    expect(mockYouTubePlayer.playVideo).toHaveBeenCalled();
  });

  it('should handle pause button click', async () => {
    const { rerender } = render(<VideoPlayer {...defaultProps} />);
    
    // Simulate player ready and playing
    const playerInstance = (global as any).YT.Player.mock.results[0].value;
    const onReady = (global as any).YT.Player.mock.calls[0][1].events.onReady;
    onReady({ target: playerInstance });

    // Mock playing state
    mockYouTubePlayer.getPlayerState.mockReturnValue(1); // Playing

    rerender(<VideoPlayer {...defaultProps} />);

    const pauseButton = screen.getByRole('button', { name: /pause/i });
    fireEvent.click(pauseButton);

    expect(mockYouTubePlayer.pauseVideo).toHaveBeenCalled();
  });

  it('should handle seek to specific time', async () => {
    const { rerender } = render(<VideoPlayer {...defaultProps} />);
    
    // Simulate player ready
    const playerInstance = (global as any).YT.Player.mock.results[0].value;
    const onReady = (global as any).YT.Player.mock.calls[0][1].events.onReady;
    onReady({ target: playerInstance });

    rerender(<VideoPlayer {...defaultProps} seekTo={120} />);

    await waitFor(() => {
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(120, true);
    });
  });

  it('should call onTimeUpdate callback', async () => {
    const onTimeUpdate = jest.fn();
    render(<VideoPlayer {...defaultProps} onTimeUpdate={onTimeUpdate} />);
    
    // Simulate player ready
    const playerInstance = (global as any).YT.Player.mock.results[0].value;
    const onReady = (global as any).YT.Player.mock.calls[0][1].events.onReady;
    onReady({ target: playerInstance });

    // Mock current time
    mockYouTubePlayer.getCurrentTime.mockReturnValue(60);

    // Simulate time update (this would normally be called by an interval)
    // We'll trigger it manually for testing
    await waitFor(() => {
      expect(onTimeUpdate).toHaveBeenCalledWith(60);
    }, { timeout: 2000 });
  });

  it('should call onStateChange callback', async () => {
    const onStateChange = jest.fn();
    render(<VideoPlayer {...defaultProps} onStateChange={onStateChange} />);
    
    // Simulate player ready
    const playerInstance = (global as any).YT.Player.mock.results[0].value;
    const onReady = (global as any).YT.Player.mock.calls[0][1].events.onReady;
    const onStateChange_callback = (global as any).YT.Player.mock.calls[0][1].events.onStateChange;
    
    onReady({ target: playerInstance });
    
    // Simulate state change to playing
    onStateChange_callback({ data: 1 }); // Playing state

    expect(onStateChange).toHaveBeenCalledWith(1);
  });

  it('should update video when videoId prop changes', async () => {
    const { rerender } = render(<VideoPlayer {...defaultProps} />);
    
    // Simulate player ready
    const playerInstance = (global as any).YT.Player.mock.results[0].value;
    const onReady = (global as any).YT.Player.mock.calls[0][1].events.onReady;
    onReady({ target: playerInstance });

    // Add loadVideoById method to mock
    mockYouTubePlayer.loadVideoById = jest.fn();

    // Change video ID
    rerender(<VideoPlayer {...defaultProps} videoId="newVideoId123" />);

    await waitFor(() => {
      expect(mockYouTubePlayer.loadVideoById).toHaveBeenCalledWith('newVideoId123');
    });
  });

  it('should handle player errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock player creation to throw error
    (global as any).YT.Player.mockImplementationOnce(() => {
      throw new Error('Player creation failed');
    });

    render(<VideoPlayer {...defaultProps} />);
    
    // Should not crash the component
    expect(screen.getByTestId('youtube-player')).toBeInTheDocument();
    
    consoleError.mockRestore();
  });

  it('should cleanup player on unmount', () => {
    const { unmount } = render(<VideoPlayer {...defaultProps} />);
    
    // Simulate player ready
    const playerInstance = (global as any).YT.Player.mock.results[0].value;
    const onReady = (global as any).YT.Player.mock.calls[0][1].events.onReady;
    onReady({ target: playerInstance });

    unmount();

    expect(mockYouTubePlayer.destroy).toHaveBeenCalled();
  });

  it('should display loading state before player is ready', () => {
    render(<VideoPlayer {...defaultProps} />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should hide loading state after player is ready', async () => {
    render(<VideoPlayer {...defaultProps} />);
    
    // Simulate player ready
    const playerInstance = (global as any).YT.Player.mock.results[0].value;
    const onReady = (global as any).YT.Player.mock.calls[0][1].events.onReady;
    onReady({ target: playerInstance });

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('should handle custom player options', () => {
    const customOptions = {
      width: 800,
      height: 450,
      playerVars: {
        autoplay: 1,
        controls: 0
      }
    };

    render(<VideoPlayer {...defaultProps} options={customOptions} />);
    
    expect((global as any).YT.Player).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        width: 800,
        height: 450,
        playerVars: expect.objectContaining({
          autoplay: 1,
          controls: 0
        })
      })
    );
  });
});