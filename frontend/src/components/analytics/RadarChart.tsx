import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Box, Typography, Paper } from '@mui/material';
import { EvaluationScore, Category, Criterion } from '../../types';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface RadarChartProps {
  scores: EvaluationScore[];
  categories: Category[];
  title?: string;
  height?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  scores,
  categories,
  title = 'カテゴリ別レーダーチャート',
  height = 400,
}) => {
  // Create a map of criterion ID to category for easy lookup
  const criterionToCategoryMap = categories.reduce(
    (acc, category) => {
      category.criteria.forEach(criterion => {
        acc[criterion.id] = category;
      });
      return acc;
    },
    {} as Record<string, Category>
  );

  // Calculate average scores for each category
  const categoryScores = scores.reduce(
    (acc, score) => {
      const category = criterionToCategoryMap[score.criterionId];
      if (category) {
        if (!acc[category.id]) {
          acc[category.id] = {
            scores: [],
            maxValue: 0,
            name: category.name,
          };
        }
        acc[category.id].scores.push(score.score);

        // Find the criterion to get max value
        const criterion = category.criteria.find(
          c => c.id === score.criterionId
        );
        if (criterion && criterion.maxValue > acc[category.id].maxValue) {
          acc[category.id].maxValue = criterion.maxValue;
        }
      }
      return acc;
    },
    {} as Record<string, { scores: number[]; maxValue: number; name: string }>
  );

  const labels = Object.values(categoryScores).map(cat => cat.name);
  const averageScores = Object.values(categoryScores).map(
    cat => cat.scores.reduce((sum, score) => sum + score, 0) / cat.scores.length
  );

  // Normalize scores to percentage for better radar chart visualization
  const normalizedScores = Object.values(categoryScores).map((cat, index) => {
    const avgScore = averageScores[index];
    return (avgScore / cat.maxValue) * 100;
  });

  const data = {
    labels,
    datasets: [
      {
        label: '平均スコア (%)',
        data: normalizedScores,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
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
          label: (context: any) => {
            const categoryIndex = context.dataIndex;
            const categoryData = Object.values(categoryScores)[categoryIndex];
            const actualScore = averageScores[categoryIndex];
            return [
              `${context.dataset.label}: ${context.parsed.r.toFixed(1)}%`,
              `実際のスコア: ${actualScore.toFixed(1)}/${categoryData.maxValue}`,
            ];
          },
        },
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          callback: function (value: any) {
            return value + '%';
          },
        },
        title: {
          display: true,
          text: 'スコア (%)',
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
        <Radar data={data} options={options} />
      </Box>
    </Paper>
  );
};
