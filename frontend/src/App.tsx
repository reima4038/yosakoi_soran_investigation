import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container } from '@mui/material';
import { store } from './store';
import { AuthProvider, UserRole } from './contexts/AuthContext';
import { VideoManagement, VideoDetailPage } from './components/video';
import { Dashboard } from './components/dashboard';
import { LoginPage, RegisterPage, ProfilePage, PasswordResetPage } from './components/auth';
import { Navigation, ProtectedRoute, OfflineStatus } from './components/common';
import { SessionList, SessionDetailPage } from './components/session';
import { TemplateList, TemplateDetailPage, TemplateCreatePage } from './components/template';
import { EvaluationPage } from './components/evaluation';
import { ResultsPage } from './components/results';
import { SharingPage } from './components/sharing';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
      '@media (max-width:600px)': {
        fontSize: '1.5rem',
      },
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 600,
      '@media (max-width:600px)': {
        fontSize: '1.25rem',
      },
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      '@media (max-width:600px)': {
        fontSize: '1.125rem',
      },
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      '@media (max-width:600px)': {
        fontSize: '1rem',
      },
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      '@media (max-width:600px)': {
        fontSize: '0.875rem',
      },
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      '@media (max-width:600px)': {
        fontSize: '0.875rem',
      },
    },
  },
  components: {
    // Mobile-first button optimizations
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44, // Touch-friendly minimum height
          '@media (max-width:600px)': {
            minHeight: 48, // Larger on mobile for better touch targets
            fontSize: '0.875rem',
          },
        },
        sizeSmall: {
          minHeight: 36,
          '@media (max-width:600px)': {
            minHeight: 40,
          },
        },
        sizeLarge: {
          minHeight: 52,
          '@media (max-width:600px)': {
            minHeight: 56,
          },
        },
      },
    },
    // Mobile-optimized form controls
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            minHeight: 44,
            '@media (max-width:600px)': {
              minHeight: 48,
            },
          },
        },
      },
    },
    // Touch-friendly tabs
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 48,
          '@media (max-width:600px)': {
            minHeight: 56,
            fontSize: '0.875rem',
          },
        },
      },
    },
    // Mobile-optimized cards
    MuiCard: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            borderRadius: 8,
          },
        },
      },
    },
    // Touch-friendly list items
    MuiListItem: {
      styleOverrides: {
        root: {
          minHeight: 48,
          '@media (max-width:600px)': {
            minHeight: 56,
          },
        },
      },
    },
    // Mobile-optimized app bar
    MuiAppBar: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            '& .MuiToolbar-root': {
              minHeight: 56,
              paddingLeft: 16,
              paddingRight: 16,
            },
          },
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/password-reset'].includes(location.pathname);

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 認証ページ以外でナビゲーションを表示 */}
      {!isAuthPage && <Navigation />}

      <Container
        maxWidth={false}
        sx={{
          mt: isAuthPage ? 0 : { xs: 1, sm: 2 },
          mb: { xs: 2, sm: 4 },
          px: isAuthPage ? 0 : { xs: 1, sm: 2 },
        }}
      >
        <Routes>
          <Route path='/' element={<Navigate to='/dashboard' replace />} />
          <Route path='/login' element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path='/password-reset' element={<PasswordResetPage />} />
          <Route
            path='/profile'
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/dashboard'
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path='/videos'
            element={
              <ProtectedRoute>
                <VideoManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path='/videos/:id'
            element={
              <ProtectedRoute>
                <VideoDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/sessions'
            element={
              <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.EVALUATOR]}>
                <SessionList />
              </ProtectedRoute>
            }
          />
          <Route
            path='/sessions/:id'
            element={
              <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.EVALUATOR]}>
                <SessionDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/templates'
            element={
              <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.EVALUATOR]}>
                <TemplateList />
              </ProtectedRoute>
            }
          />
          <Route
            path='/templates/create'
            element={
              <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.EVALUATOR]}>
                <TemplateCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/templates/:id'
            element={
              <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.EVALUATOR]}>
                <TemplateDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/evaluations'
            element={
              <ProtectedRoute>
                <EvaluationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/sessions/:sessionId/evaluate'
            element={
              <ProtectedRoute>
                <EvaluationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/sessions/:sessionId/results'
            element={
              <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.EVALUATOR]}>
                <ResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/analytics'
            element={
              <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.EVALUATOR]}>
                <ResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/sharing'
            element={
              <ProtectedRoute>
                <SharingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path='/sessions/:sessionId/sharing'
            element={
              <ProtectedRoute>
                <SharingPage />
              </ProtectedRoute>
            }
          />
          <Route path='*' element={<Navigate to='/dashboard' replace />} />
        </Routes>
      </Container>

      {/* オフライン状態表示 */}
      <OfflineStatus showPersistent={true} position='bottom' />
    </Box>
  );
};

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
