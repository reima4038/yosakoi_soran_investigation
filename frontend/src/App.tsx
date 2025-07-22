import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './store';
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
});

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <div className='App'>
            <header className='App-header'>
              <h1>YOSAKOI Performance Evaluation System</h1>
              <p>Project structure initialized successfully!</p>
            </header>
          </div>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
