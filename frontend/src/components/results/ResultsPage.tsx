import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Visibility as VisibilityIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TrendingUp as TrendingUpIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`results-tabpanel-${index}`}
      aria-labelledby={`results-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// 評価結果の型定義
interface EvaluationResult {
  id: string;
  evaluatorName: string;
  evaluatorRole: string;
  submittedAt: string;
  overallScore: number;
  categoryScores: Array<{
    categoryId: string;
    categoryName: string;
    score: number;
    weight: number;
  }>;
  criteriaScores: Array<{
    criterionId: string;
    criterionName: string;
    categoryName: string;
    score: number;
    comment: string;
    weight: number;
  }>;
  overallComment: string;
  timelineComments: Array<{
    timestamp: number;
    comment: string;
  }>;
}

// セッション結果の型定義
interface SessionResults {
  sessionId: string;
  sessionName: string;
  videoTitle: string;
  templateName: string;
  status: string;
  startDate: string;
  endDate: string;
  participantCount: number;
  submittedCount: number;
  averageScore: number;
  evaluations: EvaluationResult[];
  categories: Array<{
    id: string;
    name: string;
    weight: number;
    averageScore: number;
    criteria: Array<{
      id: string;
      name: string;
      weight: number;
      averageScore: number;
    }>;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ResultsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, hasAnyRole } = useAuth();
  const [results, setResults] = useState<SessionResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [selectedEvaluator, setSelectedEvaluator] = useState<string>('all');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // 結果データの取得
  useEffect(() => {
    if (sessionId) {
      fetchResults(sessionId);
    }
  }, [sessionId]);

  const fetchResults = async (id: string) => {
    try {
      setIsLoading(true);
      // TODO: API呼び出し
      // const response = await apiClient.get(`/api/sessions/${id}/results`);
      // setResults(response.data);

      // モックデータ
      const mockResults: SessionResults = {
        sessionId: id,
        sessionName: '第45回よさこい祭り 本祭評価',
        videoTitle: '鳴子踊り - 伝統チーム',
        templateName: '本祭評価テンプレート',
        status: 'completed',
        startDate: '2024-08-01T09:00:00Z',
        endDate: '2024-08-15T23:59:59Z',
        participantCount: 5,
        submittedCount: 3,
        averageScore: 81.7,
        evaluations: [
          {
            id: 'eval1',
            evaluatorName: '田中審査員',
            evaluatorRole: '主審査員',
            submittedAt: '2024-08-03T14:30:00Z',
            overallScore: 85,
            categoryScores: [
              { categoryId: 'cat1', categoryName: '技術面', score: 88, weight: 30 },
              { categoryId: 'cat2', categoryName: '表現力', score: 82, weight: 25 },
              { categoryId: 'cat3', categoryName: '構成・演出', score: 85, weight: 25 },
              { categoryId: 'cat4', categoryName: '総合評価', score: 85, weight: 20 },
            ],
            criteriaScores: [
              { criterionId: 'crit1', criterionName: '基本動作の正確性', categoryName: '技術面', score: 4, comment: '基本動作は非常に正確', weight: 40 },
              { criterionId: 'crit2', criterionName: '鳴子の扱い', categoryName: '技術面', score: 5, comment: '鳴子の音が美しい', weight: 30 },
            ],
            overallComment: '全体的に非常に完成度の高い演舞でした。',
            timelineComments: [
              { timestamp: 45, comment: '隊形変化が美しい' },
              { timestamp: 120, comment: '表情が豊か' },
            ],
          },
          {
            id: 'eval2',
            evaluatorName: '佐藤指導者',
            evaluatorRole: '指導者',
            submittedAt: '2024-08-04T16:45:00Z',
            overallScore: 78,
            categoryScores: [
              { categoryId: 'cat1', categoryName: '技術面', score: 80, weight: 30 },
              { categoryId: 'cat2', categoryName: '表現力', score: 75, weight: 25 },
              { categoryId: 'cat3', categoryName: '構成・演出', score: 78, weight: 25 },
              { categoryId: 'cat4', categoryName: '総合評価', score: 79, weight: 20 },
            ],
            criteriaScores: [
              { criterionId: 'crit1', criterionName: '基本動作の正確性', categoryName: '技術面', score: 4, comment: '概ね良好', weight: 40 },
              { criterionId: 'crit2', criterionName: '鳴子の扱い', categoryName: '技術面', score: 4, comment: 'もう少し力強さが欲しい', weight: 30 },
            ],
            overallComment: '技術的には良いが、もう少し迫力が欲しい。',
            timelineComments: [
              { timestamp: 30, comment: '動きが少し小さい' },
              { timestamp: 180, comment: 'フィナーレは良い' },
            ],
          },
          {
            id: 'eval3',
            evaluatorName: '山田評価者',
            evaluatorRole: '評価者',
            submittedAt: '2024-08-05T10:20:00Z',
            overallScore: 82,
            categoryScores: [
              { categoryId: 'cat1', categoryName: '技術面', score: 85, weight: 30 },
              { categoryId: 'cat2', categoryName: '表現力', score: 80, weight: 25 },
              { categoryId: 'cat3', categoryName: '構成・演出', score: 82, weight: 25 },
              { categoryId: 'cat4', categoryName: '総合評価', score: 81, weight: 20 },
            ],
            criteriaScores: [
              { criterionId: 'crit1', criterionName: '基本動作の正確性', categoryName: '技術面', score: 4, comment: '安定している', weight: 40 },
              { criterionId: 'crit2', criterionName: '鳴子の扱い', categoryName: '技術面', score: 4, comment: '統一感がある', weight: 30 },
            ],
            overallComment: 'バランスの取れた良い演舞だと思います。',
            timelineComments: [
              { timestamp: 60, comment: '息が合っている' },
              { timestamp: 150, comment: '感動的な場面' },
            ],
          },
        ],
        categories: [
          {
            id: 'cat1',
            name: '技術面',
            weight: 30,
            averageScore: 84.3,
            criteria: [
              { id: 'crit1', name: '基本動作の正確性', weight: 40, averageScore: 4.0 },
              { id: 'crit2', name: '鳴子の扱い', weight: 30, averageScore: 4.3 },
            ],
          },
          {
            id: 'cat2',
            name: '表現力',
            weight: 25,
            averageScore: 79.0,
            criteria: [
              { id: 'crit3', name: '表情・感情表現', weight: 50, averageScore: 3.9 },
            ],
          },
          {
            id: 'cat3',
            name: '構成・演出',
            weight: 25,
            averageScore: 81.7,
            criteria: [
              { id: 'crit4', name: '楽曲との調和', weight: 40, averageScore: 4.1 },
            ],
          },
          {
            id: 'cat4',
            name: '総合評価',
            weight: 20,
            averageScore: 81.7,
            criteria: [
              { id: 'crit5', name: '全体の完成度', weight: 60, averageScore: 4.1 },
            ],
          },
        ],
      };
      setResults(mockResults);
    } catch (error: any) {
      setError('評価結果の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // タブ変更
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // データエクスポート
  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      // TODO: API呼び出し
      // const response = await apiClient.get(`/api/sessions/${sessionId}/export?format=${format}`);
      // ダウンロード処理
      console.log(`Exporting as ${format}`);
      setExportDialogOpen(false);
    } catch (error: any) {
      setError('エクスポートに失敗しました');
    }
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // チャート用データの準備
  const getCategoryChartData = () => {
    if (!results) return [];
    return results.categories.map(cat => ({
      name: cat.name,
      平均スコア: cat.averageScore,
      重み: cat.weight,
    }));
  };

  const getEvaluatorComparisonData = () => {
    if (!results) return [];
    return results.evaluations.map(eval => ({
      name: eval.evaluatorName,
      総合スコア: eval.overallScore,
      ...eval.categoryScores.reduce((acc, cat) => ({
        ...acc,
        [cat.categoryName]: cat.score,
      }), {}),
    }));
  };

  const getRadarChartData = () => {
    if (!results) return [];
    return results.categories.map(cat => ({
      category: cat.name,
      平均: cat.averageScore,
      最高: Math.max(...results.evaluations.map(e => 
        e.categoryScores.find(c => c.categoryId === cat.id)?.score || 0
      )),
      最低: Math.min(...results.evaluations.map(e => 
        e.categoryScores.find(c => c.categoryId === cat.id)?.score || 0
      )),
    }));
  };

  // 権限確認
  const canViewResults = hasAnyRole([UserRole.ADMIN, UserRole.EVALUATOR]);

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          評価結果を読み込み中...
        </Typography>
      </Box>
    );
  }

  if (error || !results) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || '評価結果が見つかりません'}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/sessions')}
          sx={{ mt: 2 }}
        >
          セッション一覧に戻る
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(`/sessions/${sessionId}`)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" gutterBottom>
            評価結果・分析
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {results.sessionName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ShareIcon />}
            onClick={() => {/* TODO: 共有機能 */}}
          >
            共有
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => setExportDialogOpen(true)}
          >
            エクスポート
          </Button>
        </Box>
      </Box>

      {/* サマリーカード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary" gutterBottom>
                {results.averageScore.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                平均スコア
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" gutterBottom>
                {results.submittedCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                提出済み評価数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main" gutterBottom>
                {Math.round((results.submittedCount / results.participantCount) * 100)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                完了率
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" gutterBottom>
                {results.categories.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                評価カテゴリ数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* フィルター */}
      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>評価者フィルター</InputLabel>
          <Select
            value={selectedEvaluator}
            onChange={(e) => setSelectedEvaluator(e.target.value)}
            label="評価者フィルター"
          >
            <MenuItem value="all">すべての評価者</MenuItem>
            {results.evaluations.map(eval => (
              <MenuItem key={eval.id} value={eval.id}>
                {eval.evaluatorName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* タブ */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab icon={<BarChartIcon />} label="サマリー" />
          <Tab icon={<PieChartIcon />} label="詳細分析" />
          <Tab icon={<TrendingUpIcon />} label="評価者比較" />
          <Tab label="個別評価" />
        </Tabs>

        {/* サマリータブ */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    カテゴリ別平均スコア
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getCategoryChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="平均スコア" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    カテゴリ重み分布
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getCategoryChartData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="重み"
                      >
                        {getCategoryChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 詳細分析タブ */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    レーダーチャート分析
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={getRadarChartData()}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar name="平均" dataKey="平均" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                      <Radar name="最高" dataKey="最高" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                      <Radar name="最低" dataKey="最低" stroke="#ffc658" fill="#ffc658" fillOpacity={0.3} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    カテゴリ別詳細統計
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>カテゴリ</TableCell>
                          <TableCell align="right">平均スコア</TableCell>
                          <TableCell align="right">最高スコア</TableCell>
                          <TableCell align="right">最低スコア</TableCell>
                          <TableCell align="right">標準偏差</TableCell>
                          <TableCell align="right">重み</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {results.categories.map((category) => {
                          const scores = results.evaluations.map(e => 
                            e.categoryScores.find(c => c.categoryId === category.id)?.score || 0
                          );
                          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                          const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length;
                          const stdDev = Math.sqrt(variance);

                          return (
                            <TableRow key={category.id}>
                              <TableCell>{category.name}</TableCell>
                              <TableCell align="right">{category.averageScore.toFixed(1)}</TableCell>
                              <TableCell align="right">{Math.max(...scores).toFixed(1)}</TableCell>
                              <TableCell align="right">{Math.min(...scores).toFixed(1)}</TableCell>
                              <TableCell align="right">{stdDev.toFixed(1)}</TableCell>
                              <TableCell align="right">{category.weight}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 評価者比較タブ */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    評価者別スコア比較
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getEvaluatorComparisonData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="総合スコア" fill="#8884d8" />
                      {results.categories.map((cat, index) => (
                        <Bar key={cat.id} dataKey={cat.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    評価者別詳細
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>評価者</TableCell>
                          <TableCell>役割</TableCell>
                          <TableCell align="right">総合スコア</TableCell>
                          <TableCell align="right">提出日時</TableCell>
                          <TableCell align="center">アクション</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {results.evaluations.map((evaluation) => (
                          <TableRow key={evaluation.id}>
                            <TableCell>{evaluation.evaluatorName}</TableCell>
                            <TableCell>
                              <Chip label={evaluation.evaluatorRole} size="small" />
                            </TableCell>
                            <TableCell align="right">{evaluation.overallScore}</TableCell>
                            <TableCell align="right">{formatDate(evaluation.submittedAt)}</TableCell>
                            <TableCell align="center">
                              <Tooltip title="詳細表示">
                                <IconButton size="small">
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 個別評価タブ */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            {results.evaluations.map((evaluation) => (
              <Grid item xs={12} key={evaluation.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        {evaluation.evaluatorName} ({evaluation.evaluatorRole})
                      </Typography>
                      <Chip
                        label={`総合スコア: ${evaluation.overallScore}`}
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      提出日時: {formatDate(evaluation.submittedAt)}
                    </Typography>

                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      カテゴリ別スコア
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      {evaluation.categoryScores.map((category) => (
                        <Grid item xs={6} md={3} key={category.categoryId}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="h6" color="primary">
                              {category.score}
                            </Typography>
                            <Typography variant="caption">
                              {category.categoryName}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>

                    {evaluation.overallComment && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          総合コメント
                        </Typography>
                        <Typography variant="body2" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          {evaluation.overallComment}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Paper>

      {/* エクスポートダイアログ */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      >
        <DialogTitle>評価結果のエクスポート</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            エクスポート形式を選択してください：
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => handleExport('csv')}
              fullWidth
            >
              CSV形式
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleExport('excel')}
              fullWidth
            >
              Excel形式
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleExport('pdf')}
              fullWidth
            >
              PDF形式
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>
            キャンセル
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResultsPage;