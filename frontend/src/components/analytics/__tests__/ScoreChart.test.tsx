import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScoreChart } from '../ScoreChart';
import { EvaluationScore, Criterion, CriterionType } from '../../../types';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart">
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

describe('ScoreChart', () => {
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
    {
      id: '2',
      name: '表現力',
      description: '表現力の評価',
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
      evaluationId: 'eval1',
      criterionId: '2',
      score: 7,
    },
    {
      id: 'score3',
      evaluationId: 'eval2',
      criterionId: '1',
      score: 9,
    },
    {
      id: 'score4',
      evaluationId: 'eval2',
      criterionId: '2',
      score: 8,
    },
  ];

  it('renders score chart with correct data', () => {
    render(
      <ScoreChart
        scores={mockScores}
        criteria={mockCriteria}
        title="テストスコアチャート"
      />
    );

    expect(screen.getAllByText('テストスコアチャート')).toHaveLength(2);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-title')).toHaveTextContent(
      'テストスコアチャート'
    );

    // Check if labels are correct
    const labels = JSON.parse(screen.getByTestId('chart-labels').textContent!);
    expect(labels).toEqual(['技術力', '表現力']);

    // Check if average scores are calculated correctly
    const data = JSON.parse(screen.getByTestId('chart-data').textContent!);
    expect(data).toEqual([8.5, 7.5]); // (8+9)/2 = 8.5, (7+8)/2 = 7.5
  });

  it('handles empty scores gracefully', () => {
    render(<ScoreChart scores={[]} criteria={mockCriteria} />);

    expect(screen.getAllByText('スコアチャート')).toHaveLength(2);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});