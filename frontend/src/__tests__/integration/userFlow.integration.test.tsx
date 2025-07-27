import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock components for integration testing
const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (email === 'test@example.com' && password === 'password') {
      setUser({ id: '1', email, username: 'testuser' });
      setLoading(false);
      return { success: true };
    } else {
      setLoading(false);
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    setUser(null);
  };

  const value = { user, login, logout, loading };

  return (
    <div data-testid="auth-provider">
      {React.Children.map(children, child =>
        React.isValidElement(child) ? React.cloneElement(child, { auth: value } as any) : child
      )}
    </div>
  );
};

const LoginForm: React.FC<{ auth: any; onSuccess: () => void }> = ({ auth, onSuccess }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await auth.login(email, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (auth.user) {
    return <div data-testid="user-info">Welcome, {auth.user.username}!</div>;
  }

  return (
    <form onSubmit={handleSubmit} data-testid="login-form">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="email-input"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="password-input"
      />
      <button type="submit" disabled={auth.loading} data-testid="login-button">
        {auth.loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <div data-testid="error-message">{error}</div>}
    </form>
  );
};

const VideoList: React.FC<{ auth: any }> = ({ auth }) => {
  const [videos, setVideos] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadVideos = async () => {
    if (!auth.user) return;
    
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setVideos([
      { id: '1', title: 'Test Video 1', teamName: 'Team A' },
      { id: '2', title: 'Test Video 2', teamName: 'Team B' }
    ]);
    setLoading(false);
  };

  React.useEffect(() => {
    loadVideos();
  }, [auth.user]);

  if (!auth.user) {
    return <div data-testid="login-required">Please login to view videos</div>;
  }

  if (loading) {
    return <div data-testid="loading">Loading videos...</div>;
  }

  return (
    <div data-testid="video-list">
      <h2>Videos</h2>
      {videos.map(video => (
        <div key={video.id} data-testid={`video-${video.id}`}>
          <h3>{video.title}</h3>
          <p>Team: {video.teamName}</p>
        </div>
      ))}
    </div>
  );
};

const EvaluationForm: React.FC<{ auth: any; videoId: string }> = ({ auth, videoId }) => {
  const [scores, setScores] = React.useState<{ [key: string]: number }>({});
  const [comments, setComments] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleScoreChange = (criterion: string, score: number) => {
    setScores(prev => ({ ...prev, [criterion]: score }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    setSubmitted(true);
  };

  if (!auth.user) {
    return <div data-testid="auth-required">Authentication required</div>;
  }

  if (submitted) {
    return <div data-testid="submission-success">Evaluation submitted successfully!</div>;
  }

  return (
    <form onSubmit={handleSubmit} data-testid="evaluation-form">
      <h3>Evaluate Video {videoId}</h3>
      
      <div>
        <label>Technical Score (0-100):</label>
        <input
          type="number"
          min="0"
          max="100"
          value={scores.technical || ''}
          onChange={(e) => handleScoreChange('technical', parseInt(e.target.value) || 0)}
          data-testid="technical-score"
        />
      </div>
      
      <div>
        <label>Expression Score (0-100):</label>
        <input
          type="number"
          min="0"
          max="100"
          value={scores.expression || ''}
          onChange={(e) => handleScoreChange('expression', parseInt(e.target.value) || 0)}
          data-testid="expression-score"
        />
      </div>
      
      <div>
        <label>Comments:</label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          data-testid="comments-input"
        />
      </div>
      
      <button type="submit" data-testid="submit-evaluation">
        Submit Evaluation
      </button>
    </form>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = React.useState<'login' | 'videos' | 'evaluate'>('login');
  const [selectedVideoId, setSelectedVideoId] = React.useState<string>('');

  return (
    <MockAuthProvider>
      <div data-testid="app">
        <nav>
          <button onClick={() => setCurrentView('login')} data-testid="nav-login">
            Login
          </button>
          <button onClick={() => setCurrentView('videos')} data-testid="nav-videos">
            Videos
          </button>
        </nav>
        
        {currentView === 'login' && (
          <LoginForm
            auth={undefined} // Will be injected by MockAuthProvider
            onSuccess={() => setCurrentView('videos')}
          />
        )}
        
        {currentView === 'videos' && (
          <div>
            <VideoList auth={undefined} />
            <button
              onClick={() => {
                setSelectedVideoId('1');
                setCurrentView('evaluate');
              }}
              data-testid="evaluate-video-1"
            >
              Evaluate Video 1
            </button>
          </div>
        )}
        
        {currentView === 'evaluate' && (
          <EvaluationForm auth={undefined} videoId={selectedVideoId} />
        )}
      </div>
    </MockAuthProvider>
  );
};

describe('User Flow Integration Tests', () => {
  describe('Authentication Flow', () => {
    it('should complete login flow successfully', async () => {
      render(<App />);
      
      // Should start with login form
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
      
      // Fill in credentials
      fireEvent.change(screen.getByTestId('email-input'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'password' }
      });
      
      // Submit login
      fireEvent.click(screen.getByTestId('login-button'));
      
      // Should show loading state
      expect(screen.getByText('Logging in...')).toBeInTheDocument();
      
      // Wait for login to complete
      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Welcome, testuser!')).toBeInTheDocument();
    });

    it('should handle login errors', async () => {
      render(<App />);
      
      // Fill in wrong credentials
      fireEvent.change(screen.getByTestId('email-input'), {
        target: { value: 'wrong@example.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'wrongpassword' }
      });
      
      // Submit login
      fireEvent.click(screen.getByTestId('login-button'));
      
      // Wait for error
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  describe('Video Management Flow', () => {
    it('should show videos after login', async () => {
      render(<App />);
      
      // Login first
      fireEvent.change(screen.getByTestId('email-input'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'password' }
      });
      fireEvent.click(screen.getByTestId('login-button'));
      
      // Wait for login
      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toBeInTheDocument();
      });
      
      // Navigate to videos
      fireEvent.click(screen.getByTestId('nav-videos'));
      
      // Should show loading first
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      
      // Wait for videos to load
      await waitFor(() => {
        expect(screen.getByTestId('video-list')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('video-1')).toBeInTheDocument();
      expect(screen.getByTestId('video-2')).toBeInTheDocument();
      expect(screen.getByText('Test Video 1')).toBeInTheDocument();
      expect(screen.getByText('Team: Team A')).toBeInTheDocument();
    });

    it('should require login to view videos', async () => {
      render(<App />);
      
      // Navigate to videos without login
      fireEvent.click(screen.getByTestId('nav-videos'));
      
      expect(screen.getByTestId('login-required')).toBeInTheDocument();
      expect(screen.getByText('Please login to view videos')).toBeInTheDocument();
    });
  });

  describe('Evaluation Flow', () => {
    it('should complete evaluation submission', async () => {
      render(<App />);
      
      // Login first
      fireEvent.change(screen.getByTestId('email-input'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'password' }
      });
      fireEvent.click(screen.getByTestId('login-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toBeInTheDocument();
      });
      
      // Navigate to videos and start evaluation
      fireEvent.click(screen.getByTestId('nav-videos'));
      
      await waitFor(() => {
        expect(screen.getByTestId('video-list')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTestId('evaluate-video-1'));
      
      // Should show evaluation form
      expect(screen.getByTestId('evaluation-form')).toBeInTheDocument();
      expect(screen.getByText('Evaluate Video 1')).toBeInTheDocument();
      
      // Fill in scores
      fireEvent.change(screen.getByTestId('technical-score'), {
        target: { value: '85' }
      });
      fireEvent.change(screen.getByTestId('expression-score'), {
        target: { value: '90' }
      });
      fireEvent.change(screen.getByTestId('comments-input'), {
        target: { value: 'Great performance overall!' }
      });
      
      // Submit evaluation
      fireEvent.click(screen.getByTestId('submit-evaluation'));
      
      // Wait for submission
      await waitFor(() => {
        expect(screen.getByTestId('submission-success')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Evaluation submitted successfully!')).toBeInTheDocument();
    });
  });

  describe('Navigation Flow', () => {
    it('should handle navigation between views', async () => {
      render(<App />);
      
      // Start at login
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
      
      // Login
      fireEvent.change(screen.getByTestId('email-input'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'password' }
      });
      fireEvent.click(screen.getByTestId('login-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('user-info')).toBeInTheDocument();
      });
      
      // Navigate to videos
      fireEvent.click(screen.getByTestId('nav-videos'));
      
      await waitFor(() => {
        expect(screen.getByTestId('video-list')).toBeInTheDocument();
      });
      
      // Navigate back to login
      fireEvent.click(screen.getByTestId('nav-login'));
      
      expect(screen.getByTestId('user-info')).toBeInTheDocument(); // Still logged in
    });
  });
});