import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataExportManager } from '../DataExportManager';

// Mock the analytics service
jest.mock('../../../services/analyticsService', () => ({
  analyticsService: {
    exportSessionData: jest.fn(),
  },
}));

describe('DataExportManager', () => {
  const mockProps = {
    sessionId: 'session-123',
    sessionName: 'Test Session',
  };

  it('renders export button', () => {
    render(<DataExportManager {...mockProps} />);

    expect(screen.getByText('エクスポート')).toBeInTheDocument();
  });

  it('renders with disabled state', () => {
    render(<DataExportManager {...mockProps} disabled={true} />);

    const button = screen.getByText('エクスポート').closest('button');
    expect(button).toBeDisabled();
  });
});
