import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIndicatorIcon,
  Visibility as VisibilityIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Public as PublicIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { templateService, Template } from '../../services/templateService';
import { useTemplateOperations } from '../../hooks/useTemplateOperations';
import { OperationFeedback } from '../common';

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
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// 評価項目の型定義
interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  minScore: number;
  maxScore: number;
  isRequired: boolean;
}

// 評価カテゴリの型定義
interface EvaluationCategory {
  id: string;
  name: string;
  description: string;
  weight: number;
  criteria: EvaluationCriterion[];
}

// テンプレート詳細の型定義
interface TemplateDetail {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isPublic: boolean;
  categories: EvaluationCategory[];
  settings: {
    allowComments: boolean;
    requireAllCriteria: boolean;
    showWeights: boolean;
    anonymousEvaluation: boolean;
  };
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  creatorName: string;
  tags: string[];
}

const TemplateDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, hasAnyRole } = useAuth();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);

  const { operationState, clearMessages, getTemplate } =
    useTemplateOperations();
  const [tabValue, setTabValue] = useState(0);

  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  // テンプレート詳細の取得
  useEffect(() => {
    if (id) {
      fetchTemplateDetail(id);
    }
  }, [id]);

  const fetchTemplateDetail = async (templateId: string) => {
    try {
      console.log('Fetching template detail:', templateId);
      const apiTemplate = await getTemplate(templateId);

      if (!apiTemplate) {
        return;
      }

      // APIデータを表示用に変換
      const templateDetail: TemplateDetail = {
        id: apiTemplate.id,
        name: apiTemplate.name,
        description: apiTemplate.description,
        isDefault: false, // APIから取得する場合はデフォルトテンプレートの概念はない
        isPublic: apiTemplate.isPublic,
        categories: apiTemplate.categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          weight: Math.round(cat.weight * 100), // 小数点を%表記に変換
          criteria: cat.criteria.map(crit => ({
            id: crit.id,
            name: crit.name,
            description: crit.description,
            weight: Math.round(crit.weight * 100), // 小数点を%表記に変換
            minScore: crit.minValue,
            maxScore: crit.maxValue,
            isRequired: crit.allowComments || false, // 適切にマッピング
          })),
        })),
        settings: {
          allowComments: apiTemplate.allowGeneralComments || false,
          requireAllCriteria: false,
          showWeights: true,
          anonymousEvaluation: false,
        },
        usageCount: 0, // 使用回数はAPIから取得していない
        createdAt: apiTemplate.createdAt,
        updatedAt: apiTemplate.updatedAt || apiTemplate.createdAt,
        creatorName:
          typeof apiTemplate.creatorId === 'string'
            ? 'Unknown'
            : (apiTemplate.creatorId as any)?.username || 'Unknown',
        tags: [], // タグはAPIから取得していない
      };

      setTemplate(templateDetail);
    } catch (error: any) {
      console.error('Failed to fetch template detail:', error);
      // エラーはuseTemplateOperationsで管理される
    }
  };

  // タブ変更
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

  // 編集権限の確認
  const canEdit =
    hasAnyRole([UserRole.ADMIN, UserRole.EVALUATOR]) &&
    (template?.isDefault === false || hasAnyRole([UserRole.ADMIN]));

  if (operationState.isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant='body2' sx={{ mt: 2, textAlign: 'center' }}>
          テンプレート詳細を読み込み中...
        </Typography>
      </Box>
    );
  }

  if (operationState.error || !template) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/templates')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant='h4'>テンプレート詳細</Typography>
        </Box>

        <Alert
          severity='error'
          sx={{ mb: 2 }}
          action={
            <Button
              color='inherit'
              size='small'
              onClick={() => id && fetchTemplateDetail(id)}
              disabled={operationState.isLoading}
            >
              再試行
            </Button>
          }
        >
          {operationState.error || 'テンプレートが見つかりません'}
        </Alert>

        <Button
          variant='contained'
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/templates')}
        >
          テンプレート一覧に戻る
        </Button>
      </Box>
    );
  }

  const totalCriteria = template.categories.reduce(
    (sum, cat) => sum + cat.criteria.length,
    0
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/templates')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant='h4' gutterBottom>
            {template.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={template.isPublic ? <PublicIcon /> : <LockIcon />}
              label={template.isPublic ? '公開' : '非公開'}
              color={template.isPublic ? 'success' : 'default'}
              size='small'
              variant={template.isPublic ? 'filled' : 'outlined'}
            />
            {template.isDefault && (
              <Chip label='デフォルト' color='warning' size='small' />
            )}
            <Typography variant='body2' color='text.secondary'>
              作成者: {template.creatorName} | 更新日:{' '}
              {formatDate(template.updatedAt)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='outlined'
            startIcon={<VisibilityIcon />}
            onClick={() => setPreviewDialogOpen(true)}
          >
            プレビュー
          </Button>
          {canEdit && (
            <>
              <Button
                variant='outlined'
                startIcon={<EditIcon />}
                onClick={() => navigate(`/templates/${template.id}/edit`)}
              >
                編集
              </Button>
            </>
          )}
        </Box>
      </Box>

      <OperationFeedback
        isLoading={operationState.isLoading}
        error={operationState.error}
        success={operationState.success}
        onRetry={() => id && fetchTemplateDetail(id)}
        onClearMessages={clearMessages}
        loadingMessage='テンプレート詳細を読み込み中...'
        showAsSnackbar={true}
      />

      {/* 基本情報カード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                テンプレート概要
              </Typography>
              <Typography variant='body1' sx={{ mb: 2 }}>
                {template.description}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                使用回数: {template.usageCount}回
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                構成情報
              </Typography>
              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
              >
                <Typography variant='body2'>カテゴリ数</Typography>
                <Typography variant='h6' color='primary'>
                  {template.categories.length}
                </Typography>
              </Box>
              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
              >
                <Typography variant='body2'>評価項目数</Typography>
                <Typography variant='h6' color='primary'>
                  {totalCriteria}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Typography variant='body2' color='text.secondary'>
                作成日: {formatDate(template.createdAt)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* タブ */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant='scrollable'
          scrollButtons='auto'
        >
          <Tab label='評価項目' />
          <Tab label='設定' />
        </Tabs>

        {/* 評価項目タブ */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant='h6' sx={{ mb: 2 }}>
            評価カテゴリと項目
          </Typography>

          {template.categories.map((category, categoryIndex) => (
            <Accordion key={category.id} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant='h6'>{category.name}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    重み: {category.weight}% | 項目数:{' '}
                    {category.criteria.length}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mb: 2 }}
                >
                  {category.description}
                </Typography>

                <Typography variant='subtitle1' sx={{ mb: 1 }}>
                  評価項目
                </Typography>

                <List dense>
                  {category.criteria.map((criterion, criterionIndex) => (
                    <ListItem key={criterion.id} divider>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Typography variant='body1'>
                              {criterion.name}
                            </Typography>
                            {criterion.isRequired && (
                              <Chip label='必須' size='small' color='error' />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant='body2' color='text.secondary'>
                              {criterion.description}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              重み: {criterion.weight}% | 範囲:{' '}
                              {criterion.minScore}-{criterion.maxScore}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </TabPanel>

        {/* 設定タブ */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant='h6' gutterBottom>
            テンプレート設定
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary='コメント機能'
                secondary='評価時にタイムライン連動コメントを許可する'
              />
              <ListItemSecondaryAction>
                <Chip
                  label={template.settings.allowComments ? '有効' : '無効'}
                  color={
                    template.settings.allowComments ? 'success' : 'default'
                  }
                  size='small'
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary='全項目必須'
                secondary='すべての評価項目の入力を必須とする'
              />
              <ListItemSecondaryAction>
                <Chip
                  label={template.settings.requireAllCriteria ? '有効' : '無効'}
                  color={
                    template.settings.requireAllCriteria ? 'success' : 'default'
                  }
                  size='small'
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary='重み表示'
                secondary='評価者に各項目の重みを表示する'
              />
              <ListItemSecondaryAction>
                <Chip
                  label={template.settings.showWeights ? '有効' : '無効'}
                  color={template.settings.showWeights ? 'success' : 'default'}
                  size='small'
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary='匿名評価'
                secondary='評価者の名前を他の参加者に表示しない'
              />
              <ListItemSecondaryAction>
                <Chip
                  label={
                    template.settings.anonymousEvaluation ? '有効' : '無効'
                  }
                  color={
                    template.settings.anonymousEvaluation
                      ? 'success'
                      : 'default'
                  }
                  size='small'
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </TabPanel>
      </Paper>

      {/* プレビューダイアログ */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>テンプレートプレビュー</DialogTitle>
        <DialogContent>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            このテンプレートを使用した評価画面のプレビューです。
          </Typography>
          {/* TODO: 実際の評価フォームのプレビューを実装 */}
          <Alert severity='info'>プレビュー機能は今後実装予定です。</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateDetailPage;
