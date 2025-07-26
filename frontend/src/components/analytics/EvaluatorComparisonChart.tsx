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
import { Evaluation, EvaluationScore, Criterion, User } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface EvaluatorComparisonChartProps {
  evaluations: Evaluation[];
  criteria: Criterion[];
  users: User[];
  title?: string;
  height?: number;
}

export const EvaluatorComparisonChart: React.FC<
  EvaluatorComparisonChartProps
> = ({
  evaluations,
  criteria,
  users,
  title = '評価者比較グラフ',
  height = 400,
}) => {
  // Create maps for easy lookup
  const criteriaMap = criteria.reduce(
    (acc, criterion) => {
      acc[criterion.id] = criterion;
      return acc;
    },
    {} as Record<string, Criterion>
  );

  const usersMap = users.reduce(
    (acc, user) => {
      acc[user.id] = user;
      return acc;
    },
    {} as Record<string, User>
  );

  // Calculate total weighted scores for each evaluator
  const evaluatorScores = evaluations.map(evaluation => {
    let totalScore = 0;
    let maxPossibleScore = 0;

    evaluation.scores.forEach(score => {
      const criterion = criteriaMap[score.criterionId];
      if (criterion) {
        totalScore +=
          (score.score / criterion.maxValue) * criterion.weight * 100;
        maxPossibleScore += criterion.weight * 100;
      }
    });

    const normalizedScore =
      maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const user = usersMap[evaluation.userId];

    return {
      evaluatorName: user?.profile?.displayName || user?.username || 'Unknown',
      score: normalizedScore,
      evaluationId: evaluation.id,
    };
  });

  // Sort by score for better visualization
  evaluatorScores.sort((a, b) => b.score - a.score);

  const labels = evaluatorScores.map(item => item.evaluatorName);
  const scores = evaluatorScores.map(item => item.score);

  // Generate colors for each evaluator
  const colors = evaluatorScores.map((_, index) => {
    const hue = (index * 137.508) % 360; // Golden angle approximation for good color distribution
    return `hsla(${hue}, 70%, 60%, 0.8)`;
  });

  const borderColors = colors.map(color => color.replace('0.8', '1'));

  const data = {
    labels,
    datasets: [
      {
        label: '総合スコア (%)',
        data: scores,
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend since each bar represents a different evaluator
      },
      title: {
        display: true,
        text: title,
      },
      tooltip: {
        callbacks: {
          afterLabel: (context: any) => {
            const evaluatorData = evaluatorScores[context.dataIndex];
            return `評価ID: ${evaluatorData.evaluationId}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'スコア (%)',
        },
        ticks: {
          callback: function (value: any) {
            return value + '%';
          },
        },
      },
      x: {
        title: {
          display: true,
          text: '評価者',
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
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
      <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
        評価者数: {evaluatorScores.length}名 | 平均スコア:{' '}
        {(
          scores.reduce((sum, score) => sum + score, 0) / scores.length
        ).toFixed(1)}
        %
      </Typography>
    </Paper>
  );
};
