import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, Container } from '@mui/material';
import { store } from './store';
import { VideoManagement, VideoDetailPage } from './components/video';
import { OfflineStatus } from './components/common';
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

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Box sx={{ flexGrow: 1 }}>
            <AppBar position='static' elevation={1}>
              <Toolbar>
                <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
                  よさこい演舞評価システム
                </Typography>
              </Toolbar>
            </AppBar>

            <Container 
              maxWidth={false} 
              sx={{ 
                mt: { xs: 1, sm: 2 }, 
                mb: { xs: 2, sm: 4 },
                px: { xs: 1, sm: 2 }
              }}
            >
              <Routes>
                <Route path='/' element={<Navigate to='/videos' replace />} />
                <Route path='/videos' element={<VideoManagement />} />
                <Route path='/videos/:id' element={<VideoDetailPage />} />
                <Route path='*' element={<Navigate to='/videos' replace />} />
              </Routes>
            </Container>

            {/* オフライン状態表示 */}
            <OfflineStatus showPersistent={true} position="bottom" />
          </Box>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
