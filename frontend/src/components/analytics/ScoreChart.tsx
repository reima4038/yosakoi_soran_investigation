import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Box, Typography, Paper } from '@mui/material';
import { EvaluationScore, Criterion } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ScoreChartProps {
  scores: EvaluationScore[];
  criteria: Criterion[];
  title?: string;
  height?: number;
}

export const ScoreChart: React.FC<ScoreChartProps> = ({
  scores,
  criteria,
  title = 'スコアチャート',
  height = 400,
}) => {
  // Create a map of criterion ID to criterion for easy lookup
  const criteriaMap = criteria.reduce(
    (acc, criterion) => {
      acc[criterion.id] = criterion;
      return acc;
    },
    {} as Record<string, Criterion>
  );

  // Calculate average scores for each criterion
  const criterionScores = scores.reduce(
    (acc, score) => {
      if (!acc[score.criterionId]) {
        acc[score.criterionId] = [];
      }
      acc[score.criterionId].push(score.score);
      return acc;
    },
    {} as Record<string, number[]>
  );

  const labels = Object.keys(criterionScores).map(
    criterionId => criteriaMap[criterionId]?.name || 'Unknown'
  );

  const averageScores = Object.values(criterionScores).map(
    scores => scores.reduce((sum, score) => sum + score, 0) / scores.length
  );

  const maxScores = Object.keys(criterionScores).map(
    criterionId => criteriaMap[criterionId]?.maxValue || 10
  );

  const data = {
    labels,
    datasets: [
      {
        label: '平均スコア',
        data: averageScores,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
      },
      tooltip: {
        callbacks: {
          afterLabel: (context: any) => {
            const criterionId = Object.keys(criterionScores)[context.dataIndex];
            const criterion = criteriaMap[criterionId];
            if (criterion) {
              return `最大値: ${criterion.maxValue}`;
            }
            return '';
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'スコア',
        },
      },
      x: {
        title: {
          display: true,
          text: '評価項目',
        },
      },
    },
  };

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant='h6' gutterBottom>
        {title}
      </Typography>
      <Box sx={{ height }}>
        <Bar data={data} options={options} />
      </Box>
    </Paper>
  );
};
