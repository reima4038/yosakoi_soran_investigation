import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { ScoreChart } from './ScoreChart';
import { RadarChart } from './RadarChart';
import { EvaluatorComparisonChart } from './EvaluatorComparisonChart';
import { ScoreDistributionChart } from './ScoreDistributionChart';
import { TimelineAnalysisChart } from './TimelineAnalysisChart';
import { EvaluatorAgreementAnalysis } from './EvaluatorAgreementAnalysis';
import { DataExportManager } from './DataExportManager';
import { Evaluation, Session, Template, User } from '../../types';

interface AnalyticsDashboardProps {
  sessionId: string;
  evaluations: Evaluation[];
  session: Session;
  template: Template;
  users: User[];
  loading?: boolean;
  error?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  sessionId,
  evaluations,
  session,
  template,
  users,
  loading = false,
  error,
}) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight={400}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!evaluations.length) {
    return (
      <Alert severity='info' sx={{ m: 2 }}>
        まだ評価データがありません。評価が提出されると分析結果が表示されます。
      </Alert>
    );
  }

  // Flatten all scores from all evaluations
  const allScores = evaluations.flatMap(evaluation => evaluation.scores);

  // Get all criteria from template
  const allCriteria = template.categories.flatMap(
    category => category.criteria
  );

  // Calculate summary statistics
  const totalEvaluations = evaluations.length;
  const completedEvaluations = evaluations.filter(e => e.isComplete).length;
  const averageScore =
    allScores.length > 0
      ? allScores.reduce((sum, score) => sum + score.score, 0) /
        allScores.length
      : 0;

  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={1} sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant='h4'>
            評価結果分析 - {session.name}
          </Typography>
          <DataExportManager
            sessionId={sessionId}
            sessionName={session.name}
            disabled={loading}
          />
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant='h6' color='primary'>
              {totalEvaluations}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              総評価数
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant='h6' color='primary'>
              {completedEvaluations}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              完了評価数
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant='h6' color='primary'>
              {averageScore.toFixed(1)}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              平均スコア
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label='analytics tabs'
        >
          <Tab label='項目別スコア' />
          <Tab label='カテゴリ分析' />
          <Tab label='評価者比較' />
          <Tab label='詳細分析' />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ScoreChart
              scores={allScores}
              criteria={allCriteria}
              title='評価項目別平均スコア'
              height={500}
            />
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <RadarChart
              scores={allScores}
              categories={template.categories}
              title='カテゴリ別レーダーチャート'
              height={400}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: 400 }}>
              <Typography variant='h6' gutterBottom>
                カテゴリ別詳細
              </Typography>
              <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
                {template.categories.map(category => {
                  const categoryScores = allScores.filter(score =>
                    category.criteria.some(
                      criterion => criterion.id === score.criterionId
                    )
                  );
                  const avgScore =
                    categoryScores.length > 0
                      ? categoryScores.reduce(
                          (sum, score) => sum + score.score,
                          0
                        ) / categoryScores.length
                      : 0;
                  const maxScore = Math.max(
                    ...category.criteria.map(c => c.maxValue)
                  );

                  return (
                    <Box
                      key={category.id}
                      sx={{ mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}
                    >
                      <Typography variant='subtitle1' fontWeight='bold'>
                        {category.name}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        平均: {avgScore.toFixed(1)} / {maxScore} (
                        {((avgScore / maxScore) * 100).toFixed(1)}%)
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        重み: {(category.weight * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <EvaluatorComparisonChart
              evaluations={evaluations}
              criteria={allCriteria}
              users={users}
              title='評価者別総合スコア比較'
              height={500}
            />
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ScoreDistributionChart
              scores={allScores}
              criteria={allCriteria}
              title='スコア分布分析'
              height={400}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <EvaluatorAgreementAnalysis
              evaluations={evaluations}
              criteria={allCriteria}
              users={users}
              title='評価者間一致度分析'
              height={400}
            />
          </Grid>
          <Grid item xs={12}>
            <TimelineAnalysisChart
              comments={evaluations.flatMap(e => e.comments)}
              title='タイムライン分析'
              height={400}
            />
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};
