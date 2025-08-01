import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { Comment } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TimelineAnalysisChartProps {
  comments: Comment[];
  videoDuration?: number; // in seconds
  title?: string;
  height?: number;
}

export const TimelineAnalysisChart: React.FC<TimelineAnalysisChartProps> = ({
  comments,
  videoDuration = 300, // default 5 minutes
  title = '時系列コメント分析',
  height = 400,
}) => {
  if (comments.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant='h6' gutterBottom>
          {title}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          コメントデータがありません
        </Typography>
      </Paper>
    );
  }

  // Create time intervals (e.g., every 30 seconds)
  const intervalSize = Math.max(30, Math.ceil(videoDuration / 20)); // 20 intervals max
  const intervals: { [key: number]: number } = {};

  for (let i = 0; i < videoDuration; i += intervalSize) {
    intervals[i] = 0;
  }

  // Count comments in each interval
  comments.forEach(comment => {
    const intervalStart =
      Math.floor(comment.timestamp / intervalSize) * intervalSize;
    if (intervals.hasOwnProperty(intervalStart)) {
      intervals[intervalStart]++;
    }
  });

  const labels = Object.keys(intervals).map(interval => {
    const start = parseInt(interval);
    const end = Math.min(start + intervalSize, videoDuration);
    return `${Math.floor(start / 60)}:${(start % 60).toString().padStart(2, '0')}-${Math.floor(end / 60)}:${(end % 60).toString().padStart(2, '0')}`;
  });

  const data = Object.values(intervals);

  // Calculate statistics
  const totalComments = comments.length;
  const averageCommentsPerInterval =
    totalComments / Object.keys(intervals).length;
  const maxCommentsInInterval = Math.max(...data);
  const peakIntervals = Object.entries(intervals)
    .filter(([_, count]) => count === maxCommentsInInterval)
    .map(([interval, _]) => {
      const start = parseInt(interval);
      return `${Math.floor(start / 60)}:${(start % 60).toString().padStart(2, '0')}`;
    });

  // Find most commented timestamps
  const timestampCounts: { [key: number]: number } = {};
  comments.forEach(comment => {
    const roundedTimestamp = Math.floor(comment.timestamp / 10) * 10; // Round to 10-second intervals
    timestampCounts[roundedTimestamp] =
      (timestampCounts[roundedTimestamp] || 0) + 1;
  });

  const topTimestamps = Object.entries(timestampCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([timestamp, count]) => ({
      time: `${Math.floor(parseInt(timestamp) / 60)}:${(parseInt(timestamp) % 60).toString().padStart(2, '0')}`,
      count,
    }));

  const chartData = {
    labels,
    datasets: [
      {
        label: 'コメント数',
        data,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
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
        text: '動画タイムライン上のコメント分布',
      },
      tooltip: {
        callbacks: {
          afterLabel: (context: any) => {
            const percentage = (
              (context.parsed.y / totalComments) *
              100
            ).toFixed(1);
            return `全体の${percentage}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'コメント数',
        },
        ticks: {
          stepSize: 1,
        },
      },
      x: {
        title: {
          display: true,
          text: '時間区間',
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

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              textAlign: 'center',
              p: 1,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant='h6' color='primary'>
              {totalComments}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              総コメント数
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              textAlign: 'center',
              p: 1,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant='h6' color='primary'>
              {averageCommentsPerInterval.toFixed(1)}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              区間平均
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              textAlign: 'center',
              p: 1,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant='h6' color='primary'>
              {maxCommentsInInterval}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              最大コメント数
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              textAlign: 'center',
              p: 1,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant='h6' color='primary'>
              {peakIntervals.join(', ')}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              ピーク時間
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ height }}>
        <Line data={chartData} options={options} />
      </Box>

      {topTimestamps.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant='subtitle1' gutterBottom>
            注目ポイント（コメント集中時間）
          </Typography>
          <Grid container spacing={1}>
            {topTimestamps.map((item, index) => (
              <Grid item xs={12} sm={4} key={index}>
                <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant='body2' fontWeight='medium'>
                    {item.time} - {item.count}件
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Paper>
  );
};
