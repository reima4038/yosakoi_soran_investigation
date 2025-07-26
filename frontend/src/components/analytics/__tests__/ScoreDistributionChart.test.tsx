import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScoreDistributionChart } from '../ScoreDistributionChart';
import { EvaluationScore, Criterion, CriterionType } from '../../../types';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: any) => (
    <div data-testid="distribution-chart">
      <div data-testid="chart-title">{options.plugins.title.text}</div>
      <div data-testid="chart-labels">{JSON.stringify(data.labels)}</div>
      <div data-testid="chart-data">{JSON.stringify(data.datasets[0].data)}</div>
    </div>
  ),
}));

jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

describe('ScoreDistributionChart', () => {
  const mockCriteria: Criterion[] = [
    {
      id: '1',
      name: '技術力',
      description: '技術的な評価',
      type: CriterionType.NUMERIC,
      minValue: 0,
      maxValue: 10,
      weight: 0.5,
    },
  ];

  const mockScores: EvaluationScore[] = [
    {
      id: 'score1',
      evaluationId: 'eval1',
      criterionId: '1',
      score: 8,
    },
    {
      id: 'score2',
      evaluationId: 'eval2',
      criterionId: '1',
      score: 7,
    },
    {
      id: 'score3',
      evaluationId: 'eval3',
      criterionId: '1',
      score: 9,
    },
    {
      id: 'score4',
      evaluationId: 'eval4',
      criterionId: '1',
      score: 8,
    },
  ];

  it('renders score distribution chart with statistics', () => {
    render(
      <ScoreDistributionChart
        scores={mockScores}
        criteria={mockCriteria}
        selectedCriterionId="1"
        title="テスト分布分析"
      />
    );

    expect(screen.getByText('テスト分布分析')).toBeInTheDocument();
    expect(screen.getByTestId('distribution-chart')).toBeInTheDocument();

    // Check statistics are displayed
    expect(screen.getByText('平均')).toBeInTheDocument();
    expect(screen.getByText('中央値')).toBeInTheDocument();
    expect(screen.getByText('標準偏差')).toBeInTheDocument();
    expect(screen.getByText('最小値')).toBeInTheDocument();
    expect(screen.getByText('最大値')).toBeInTheDocument();
    expect(screen.getByText('評価数')).toBeInTheDocument();

    // Check if average is calculated correctly (8+7+9+8)/4 = 8
    expect(screen.getAllByText('8.0')).toHaveLength(2); // Average and median are both 8.0
  });

  it('handles empty scores gracefully', () => {
    render(
      <ScoreDistributionChart
        scores={[]}
        criteria={mockCriteria}
        selectedCriterionId="1"
      />
    );

    expect(screen.getByText('選択された評価項目のデータがありません')).toBeInTheDocument();
  });

  it('handles missing criterion gracefully', () => {
    render(
      <ScoreDistributionChart
        scores={mockScores}
        criteria={[]}
        selectedCriterionId="nonexistent"
      />
    );

    expect(screen.getByText('評価基準が見つかりません')).toBeInTheDocument();
  });
});