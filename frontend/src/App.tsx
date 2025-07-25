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
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 600,
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

            <Container maxWidth={false} sx={{ mt: 2, mb: 4 }}>
              <Routes>
                <Route path='/' element={<Navigate to='/videos' replace />} />
                <Route path='/videos' element={<VideoManagement />} />
                <Route path='/videos/:id' element={<VideoDetailPage />} />
                <Route path='*' element={<Navigate to='/videos' replace />} />
              </Routes>
            </Container>
          </Box>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
