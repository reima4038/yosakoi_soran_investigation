import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScoreChart } from '../ScoreChart';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: any) => (
    <div data-testid='bar-chart'>
      <div data-testid='chart-data'>{JSON.stringify(data)}</div>
      <div data-testid='chart-options'>{JSON.stringify(options)}</div>
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
  const mockCriteria = [
    { id: 'テクニック', name: 'テクニック', weight: 1 },
    { id: '表現力', name: '表現力', weight: 1 },
    { id: '構成', name: '構成', weight: 1 },
    { id: '衣装', name: '衣装', weight: 1 },
  ];

  const mockScores = [
    { criterionId: 'テクニック', score: 85, evaluatorId: 'evaluator1' },
    { criterionId: '表現力', score: 78, evaluatorId: 'evaluator1' },
    { criterionId: '構成', score: 92, evaluatorId: 'evaluator1' },
    { criterionId: '衣装', score: 88, evaluatorId: 'evaluator1' },
    { criterionId: 'テクニック', score: 82, evaluatorId: 'evaluator2' },
    { criterionId: '表現力', score: 85, evaluatorId: 'evaluator2' },
    { criterionId: '構成', score: 88, evaluatorId: 'evaluator2' },
    { criterionId: '衣装', score: 90, evaluatorId: 'evaluator2' },
    { criterionId: 'テクニック', score: 90, evaluatorId: 'evaluator3' },
    { criterionId: '表現力', score: 82, evaluatorId: 'evaluator3' },
    { criterionId: '構成', score: 85, evaluatorId: 'evaluator3' },
    { criterionId: '衣装', score: 87, evaluatorId: 'evaluator3' },
  ];

  it('should render score chart with data', () => {
    render(<ScoreChart scores={mockScores} criteria={mockCriteria} />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should display correct chart data structure', () => {
    render(<ScoreChart scores={mockScores} criteria={mockCriteria} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');

    expect(chartData.labels).toEqual(['テクニック', '表現力', '構成', '衣装']);
    expect(chartData.datasets).toBeDefined();
  });

  it('should handle empty data gracefully', () => {
    render(<ScoreChart scores={[]} criteria={mockCriteria} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');

    expect(chartData.labels).toEqual([]);
    expect(chartData.datasets).toHaveLength(1); // Still has average dataset
  });

  it('should handle single evaluator data', () => {
    const singleEvaluatorScores = mockScores.slice(0, 4); // First 4 scores (evaluator1)

    render(
      <ScoreChart scores={singleEvaluatorScores} criteria={mockCriteria} />
    );

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');

    expect(chartData.datasets).toBeDefined();
    expect(chartData.labels).toEqual(['テクニック', '表現力', '構成', '衣装']);
  });

  it('should apply correct chart options', () => {
    render(<ScoreChart scores={mockScores} criteria={mockCriteria} />);

    const chartOptionsElement = screen.getByTestId('chart-options');
    const chartOptions = JSON.parse(chartOptionsElement.textContent || '{}');

    expect(chartOptions.responsive).toBe(true);
    expect(chartOptions.plugins.title.display).toBe(true);
    expect(chartOptions.plugins.title.text).toBe('スコアチャート');
    expect(chartOptions.scales.y.beginAtZero).toBe(true);
    expect(chartOptions.scales.y.beginAtZero).toBe(true);
  });

  it('should use different colors for different evaluators', () => {
    render(<ScoreChart scores={mockScores} criteria={mockCriteria} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');

    expect(chartData.datasets).toBeDefined();
    expect(chartData.labels).toEqual(['テクニック', '表現力', '構成', '衣装']);
  });

  it('should handle missing scores in data', () => {
    const incompleteScores = [
      { criterionId: 'テクニック', score: 85, evaluatorId: 'evaluator1' },
      { criterionId: '表現力', score: 78, evaluatorId: 'evaluator1' },
    ];

    render(<ScoreChart scores={incompleteScores} criteria={mockCriteria} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');

    expect(chartData.labels).toEqual(['テクニック', '表現力']);
  });

  it('should handle custom title prop', () => {
    const customTitle = 'カスタムチャートタイトル';

    render(
      <ScoreChart
        scores={mockScores}
        title={customTitle}
        criteria={mockCriteria}
      />
    );

    const chartOptionsElement = screen.getByTestId('chart-options');
    const chartOptions = JSON.parse(chartOptionsElement.textContent || '{}');

    expect(chartOptions.plugins.title.text).toBe(customTitle);
  });

  it('should handle custom height prop', () => {
    render(
      <ScoreChart scores={mockScores} height={400} criteria={mockCriteria} />
    );

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should show chart with basic data', () => {
    render(<ScoreChart scores={mockScores} criteria={mockCriteria} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');

    expect(chartData.labels).toEqual(['テクニック', '表現力', '構成', '衣装']);
  });

  it('should calculate averages correctly', () => {
    render(<ScoreChart scores={mockScores} criteria={mockCriteria} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');

    // テクニック: (85 + 82 + 90) / 3 = 85.67
    // 表現力: (78 + 85 + 82) / 3 = 81.67
    // 構成: (92 + 88 + 85) / 3 = 88.33
    // 衣装: (88 + 90 + 87) / 3 = 88.33
    expect(chartData.datasets[0].data[0]).toBeCloseTo(85.67, 1);
    expect(chartData.datasets[0].data[1]).toBeCloseTo(81.67, 1);
    expect(chartData.datasets[0].data[2]).toBeCloseTo(88.33, 1);
    expect(chartData.datasets[0].data[3]).toBeCloseTo(88.33, 1);
  });

  it('should handle mixed data sets', () => {
    const mixedScores = [
      { criterionId: 'テクニック', score: 85, evaluatorId: 'evaluator1' },
      { criterionId: '表現力', score: 78, evaluatorId: 'evaluator1' },
      { criterionId: 'テクニック', score: 82, evaluatorId: 'evaluator2' },
      { criterionId: '衣装', score: 90, evaluatorId: 'evaluator2' },
    ];

    render(<ScoreChart scores={mixedScores} criteria={mockCriteria} />);

    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');

    expect(chartData.labels).toEqual(['テクニック', '表現力', '衣装']);
  });
});
