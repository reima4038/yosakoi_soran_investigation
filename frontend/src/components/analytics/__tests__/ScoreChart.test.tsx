import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScoreChart } from '../ScoreChart';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  )
}));

jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn()
}));

describe('ScoreChart', () => {
  const mockScoreData = [
    {
      evaluatorName: '評価者A',
      scores: {
        'テクニック': 85,
        '表現力': 78,
        '構成': 92,
        '衣装': 88
      }
    },
    {
      evaluatorName: '評価者B',
      scores: {
        'テクニック': 82,
        '表現力': 85,
        '構成': 88,
        '衣装': 90
      }
    },
    {
      evaluatorName: '評価者C',
      scores: {
        'テクニック': 90,
        '表現力': 82,
        '構成': 85,
        '衣装': 87
      }
    }
  ];

  it('should render score chart with data', () => {
    render(<ScoreChart data={mockScoreData} />);
    
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should display correct chart data structure', () => {
    render(<ScoreChart data={mockScoreData} />);
    
    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');
    
    expect(chartData.labels).toEqual(['テクニック', '表現力', '構成', '衣装']);
    expect(chartData.datasets).toHaveLength(3);
    expect(chartData.datasets[0].label).toBe('評価者A');
    expect(chartData.datasets[0].data).toEqual([85, 78, 92, 88]);
    expect(chartData.datasets[1].label).toBe('評価者B');
    expect(chartData.datasets[1].data).toEqual([82, 85, 88, 90]);
    expect(chartData.datasets[2].label).toBe('評価者C');
    expect(chartData.datasets[2].data).toEqual([90, 82, 85, 87]);
  });

  it('should handle empty data gracefully', () => {
    render(<ScoreChart data={[]} />);
    
    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');
    
    expect(chartData.labels).toEqual([]);
    expect(chartData.datasets).toEqual([]);
  });

  it('should handle single evaluator data', () => {
    const singleEvaluatorData = [mockScoreData[0]];
    
    render(<ScoreChart data={singleEvaluatorData} />);
    
    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');
    
    expect(chartData.datasets).toHaveLength(1);
    expect(chartData.datasets[0].label).toBe('評価者A');
  });

  it('should apply correct chart options', () => {
    render(<ScoreChart data={mockScoreData} />);
    
    const chartOptionsElement = screen.getByTestId('chart-options');
    const chartOptions = JSON.parse(chartOptionsElement.textContent || '{}');
    
    expect(chartOptions.responsive).toBe(true);
    expect(chartOptions.plugins.title.display).toBe(true);
    expect(chartOptions.plugins.title.text).toBe('評価者別スコア比較');
    expect(chartOptions.scales.y.beginAtZero).toBe(true);
    expect(chartOptions.scales.y.max).toBe(100);
  });

  it('should use different colors for different evaluators', () => {
    render(<ScoreChart data={mockScoreData} />);
    
    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');
    
    const colors = chartData.datasets.map((dataset: any) => dataset.backgroundColor);
    
    // Should have different colors for each evaluator
    expect(colors).toHaveLength(3);
    expect(new Set(colors).size).toBe(3); // All colors should be unique
  });

  it('should handle missing scores in data', () => {
    const incompleteData = [
      {
        evaluatorName: '評価者A',
        scores: {
          'テクニック': 85,
          '表現力': 78
          // Missing '構成' and '衣装'
        }
      }
    ];
    
    render(<ScoreChart data={incompleteData} />);
    
    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');
    
    expect(chartData.labels).toEqual(['テクニック', '表現力']);
    expect(chartData.datasets[0].data).toEqual([85, 78]);
  });

  it('should handle custom title prop', () => {
    const customTitle = 'カスタムチャートタイトル';
    
    render(<ScoreChart data={mockScoreData} title={customTitle} />);
    
    const chartOptionsElement = screen.getByTestId('chart-options');
    const chartOptions = JSON.parse(chartOptionsElement.textContent || '{}');
    
    expect(chartOptions.plugins.title.text).toBe(customTitle);
  });

  it('should handle custom height prop', () => {
    render(<ScoreChart data={mockScoreData} height={400} />);
    
    const chartOptionsElement = screen.getByTestId('chart-options');
    const chartOptions = JSON.parse(chartOptionsElement.textContent || '{}');
    
    expect(chartOptions.maintainAspectRatio).toBe(false);
  });

  it('should show average line when showAverage is true', () => {
    render(<ScoreChart data={mockScoreData} showAverage={true} />);
    
    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');
    
    // Should have an additional dataset for average
    expect(chartData.datasets).toHaveLength(4);
    
    const averageDataset = chartData.datasets.find((dataset: any) => 
      dataset.label === '平均'
    );
    
    expect(averageDataset).toBeDefined();
    expect(averageDataset.type).toBe('line');
  });

  it('should calculate correct averages', () => {
    render(<ScoreChart data={mockScoreData} showAverage={true} />);
    
    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');
    
    const averageDataset = chartData.datasets.find((dataset: any) => 
      dataset.label === '平均'
    );
    
    // Calculate expected averages
    // テクニック: (85 + 82 + 90) / 3 = 85.67 (rounded to 85.7)
    // 表現力: (78 + 85 + 82) / 3 = 81.67 (rounded to 81.7)
    // 構成: (92 + 88 + 85) / 3 = 88.33 (rounded to 88.3)
    // 衣装: (88 + 90 + 87) / 3 = 88.33 (rounded to 88.3)
    
    expect(averageDataset.data[0]).toBeCloseTo(85.7, 1);
    expect(averageDataset.data[1]).toBeCloseTo(81.7, 1);
    expect(averageDataset.data[2]).toBeCloseTo(88.3, 1);
    expect(averageDataset.data[3]).toBeCloseTo(88.3, 1);
  });

  it('should handle data with different category sets', () => {
    const mixedData = [
      {
        evaluatorName: '評価者A',
        scores: {
          'テクニック': 85,
          '表現力': 78,
          '構成': 92
        }
      },
      {
        evaluatorName: '評価者B',
        scores: {
          'テクニック': 82,
          '表現力': 85,
          '衣装': 90
        }
      }
    ];
    
    render(<ScoreChart data={mixedData} />);
    
    const chartDataElement = screen.getByTestId('chart-data');
    const chartData = JSON.parse(chartDataElement.textContent || '{}');
    
    // Should include all unique categories
    expect(chartData.labels).toEqual(['テクニック', '表現力', '構成', '衣装']);
    
    // First evaluator should have 0 for missing '衣装'
    expect(chartData.datasets[0].data).toEqual([85, 78, 92, 0]);
    
    // Second evaluator should have 0 for missing '構成'
    expect(chartData.datasets[1].data).toEqual([82, 85, 0, 90]);
  });
});