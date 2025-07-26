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
import { Box, Typography, Paper, Grid } from '@mui/material';
import { EvaluationScore, Criterion } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ScoreDistributionChartProps {
  scores: EvaluationScore[];
  criteria: Criterion[];
  selectedCriterionId?: string;
  title?: string;
  height?: number;
}

export const ScoreDistributionChart: React.FC<ScoreDistributionChartProps> = ({
  scores,
  criteria,
  selectedCriterionId,
  title = '項目別スコア分布分析',
  height = 400,
}) => {
  // Create a map of criterion ID to criterion for easy lookup
  const criteriaMap = criteria.reduce((acc, criterion) => {
    acc[criterion.id] = criterion;
    return acc;
  }, {} as Record<string, Criterion>);

  // Filter scores by selected criterion or use all scores
  const targetCriterionId = selectedCriterionId || criteria[0]?.id;
  const targetCriterion = criteriaMap[targetCriterionId];
  
  if (!targetCriterion) {
    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          評価基準が見つかりません
        </Typography>
      </Paper>
    );
  }

  const criterionScores = scores
    .filter(score => score.criterionId === targetCriterionId)
    .map(score => score.score);

  if (criterionScores.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          選択された評価項目のデータがありません
        </Typography>
      </Paper>
    );
  }

  // Calculate statistics
  const average = criterionScores.reduce((sum, score) => sum + score, 0) / criterionScores.length;
  const sortedScores = [...criterionScores].sort((a, b) => a - b);
  const median = sortedScores.length % 2 === 0
    ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
    : sortedScores[Math.floor(sortedScores.length / 2)];
  const min = Math.min(...criterionScores);
  const max = Math.max(...criterionScores);
  const variance = criterionScores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / criterionScores.length;
  const standardDeviation = Math.sqrt(variance);

  // Create histogram data
  const binSize = Math.max(1, Math.ceil((max - min) / 10));
  const bins: { [key: string]: number } = {};
  
  for (let i = min; i <= max; i += binSize) {
    const binLabel = `${i}-${Math.min(i + binSize - 1, max)}`;
    bins[binLabel] = 0;
  }

  criterionScores.forEach(score => {
    const binIndex = Math.floor((score - min) / binSize);
    const binStart = min + binIndex * binSize;
    const binLabel = `${binStart}-${Math.min(binStart + binSize - 1, max)}`;
    bins[binLabel] = (bins[binLabel] || 0) + 1;
  });

  const labels = Object.keys(bins);
  const data = Object.values(bins);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'スコア分布',
        data,
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
        text: `${targetCriterion.name} - スコア分布`,
      },
      tooltip: {
        callbacks: {
          afterLabel: (context: any) => {
            const percentage = ((context.parsed.y / criterionScores.length) * 100).toFixed(1);
            return `割合: ${percentage}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '評価者数',
        },
        ticks: {
          stepSize: 1,
        },
      },
      x: {
        title: {
          display: true,
          text: 'スコア範囲',
        },
      },
    },
  };

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" color="primary">
              {average.toFixed(1)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              平均
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" color="primary">
              {median.toFixed(1)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              中央値
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" color="primary">
              {standardDeviation.toFixed(1)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              標準偏差
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" color="primary">
              {min}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              最小値
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" color="primary">
              {max}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              最大値
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" color="primary">
              {criterionScores.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              評価数
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ height }}>
        <Bar data={chartData} options={options} />
      </Box>
    </Paper>
  );
};