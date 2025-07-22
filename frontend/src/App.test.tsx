import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders YOSAKOI Performance Evaluation System', () => {
  render(<App />);
  const titleElement = screen.getByText(
    /YOSAKOI Performance Evaluation System/i
  );
  expect(titleElement).toBeInTheDocument();
});

test('renders project initialization message', () => {
  render(<App />);
  const messageElement = screen.getByText(
    /Project structure initialized successfully!/i
  );
  expect(messageElement).toBeInTheDocument();
});
