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
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { Evaluation, EvaluationScore, Criterion, User } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface EvaluatorAgreementAnalysisProps {
  evaluations: Evaluation[];
  criteria: Criterion[];
  users: User[];
  title?: string;
  height?: number;
}

interface CriterionAgreement {
  criterionId: string;
  criterionName: string;
  variance: number;
  standardDeviation: number;
  agreement: number; // 0-1, higher is better agreement
  scores: number[];
  average: number;
}

export const EvaluatorAgreementAnalysis: React.FC<
  EvaluatorAgreementAnalysisProps
> = ({
  evaluations,
  criteria,
  users,
  title = '評価者間の一致度分析',
  height = 400,
}) => {
  if (evaluations.length < 2) {
    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant='h6' gutterBottom>
          {title}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          一致度分析には2人以上の評価者が必要です
        </Typography>
      </Paper>
    );
  }

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

  // Calculate agreement for each criterion
  const criterionAgreements: CriterionAgreement[] = criteria.map(criterion => {
    const criterionScores = evaluations
      .map(
        evaluation =>
          evaluation.scores.find(score => score.criterionId === criterion.id)
            ?.score
      )
      .filter((score): score is number => score !== undefined);

    if (criterionScores.length < 2) {
      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        variance: 0,
        standardDeviation: 0,
        agreement: 1,
        scores: criterionScores,
        average: criterionScores[0] || 0,
      };
    }

    const average =
      criterionScores.reduce((sum, score) => sum + score, 0) /
      criterionScores.length;
    const variance =
      criterionScores.reduce(
        (sum, score) => sum + Math.pow(score - average, 2),
        0
      ) / criterionScores.length;
    const standardDeviation = Math.sqrt(variance);

    // Agreement score: inverse of coefficient of variation, normalized to 0-1
    // Lower variance relative to mean = higher agreement
    const coefficientOfVariation =
      average > 0 ? standardDeviation / average : 0;
    const agreement = Math.max(0, 1 - coefficientOfVariation);

    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      variance,
      standardDeviation,
      agreement,
      scores: criterionScores,
      average,
    };
  });

  // Calculate overall agreement
  const overallAgreement =
    criterionAgreements.reduce((sum, ca) => sum + ca.agreement, 0) /
    criterionAgreements.length;

  // Sort by agreement (lowest first to highlight problematic areas)
  const sortedAgreements = [...criterionAgreements].sort(
    (a, b) => a.agreement - b.agreement
  );

  // Prepare chart data
  const labels = sortedAgreements.map(ca => ca.criterionName);
  const agreementData = sortedAgreements.map(ca => ca.agreement * 100); // Convert to percentage
  const varianceData = sortedAgreements.map(ca => ca.standardDeviation);

  const chartData = {
    labels,
    datasets: [
      {
        label: '一致度 (%)',
        data: agreementData,
        backgroundColor: agreementData.map(
          value =>
            value >= 80
              ? 'rgba(76, 175, 80, 0.6)' // Green for high agreement
              : value >= 60
                ? 'rgba(255, 193, 7, 0.6)' // Yellow for medium agreement
                : 'rgba(244, 67, 54, 0.6)' // Red for low agreement
        ),
        borderColor: agreementData.map(value =>
          value >= 80
            ? 'rgba(76, 175, 80, 1)'
            : value >= 60
              ? 'rgba(255, 193, 7, 1)'
              : 'rgba(244, 67, 54, 1)'
        ),
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
        text: '評価項目別一致度',
      },
      tooltip: {
        callbacks: {
          afterLabel: (context: any) => {
            const index = context.dataIndex;
            const agreement = sortedAgreements[index];
            return [
              `標準偏差: ${agreement.standardDeviation.toFixed(2)}`,
              `平均スコア: ${agreement.average.toFixed(1)}`,
              `評価数: ${agreement.scores.length}`,
            ];
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
          text: '一致度 (%)',
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
          text: '評価項目',
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
        },
      },
    },
  };

  const getAgreementColor = (agreement: number) => {
    if (agreement >= 0.8) return 'success';
    if (agreement >= 0.6) return 'warning';
    return 'error';
  };

  const getAgreementLabel = (agreement: number) => {
    if (agreement >= 0.8) return '高い一致';
    if (agreement >= 0.6) return '中程度の一致';
    return '低い一致';
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
              {(overallAgreement * 100).toFixed(1)}%
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              全体一致度
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
              {evaluations.length}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              評価者数
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
              {criterionAgreements.filter(ca => ca.agreement >= 0.8).length}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              高一致項目数
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
              {criterionAgreements.filter(ca => ca.agreement < 0.6).length}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              要注意項目数
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ height, mb: 2 }}>
        <Bar data={chartData} options={options} />
      </Box>

      <Typography variant='subtitle1' gutterBottom>
        詳細分析結果
      </Typography>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>評価項目</TableCell>
              <TableCell align='center'>一致度</TableCell>
              <TableCell align='center'>平均スコア</TableCell>
              <TableCell align='center'>標準偏差</TableCell>
              <TableCell align='center'>評価数</TableCell>
              <TableCell align='center'>状態</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedAgreements.map(agreement => (
              <TableRow key={agreement.criterionId}>
                <TableCell component='th' scope='row'>
                  {agreement.criterionName}
                </TableCell>
                <TableCell align='center'>
                  {(agreement.agreement * 100).toFixed(1)}%
                </TableCell>
                <TableCell align='center'>
                  {agreement.average.toFixed(1)}
                </TableCell>
                <TableCell align='center'>
                  {agreement.standardDeviation.toFixed(2)}
                </TableCell>
                <TableCell align='center'>{agreement.scores.length}</TableCell>
                <TableCell align='center'>
                  <Chip
                    label={getAgreementLabel(agreement.agreement)}
                    color={getAgreementColor(agreement.agreement) as any}
                    size='small'
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
