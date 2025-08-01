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
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<TemplateDetail | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  // テンプレート詳細の取得
  useEffect(() => {
    if (id) {
      fetchTemplateDetail(id);
    }
  }, [id]);

  const fetchTemplateDetail = async (templateId: string) => {
    try {
      setIsLoading(true);
      // TODO: API呼び出し
      // const response = await apiClient.get(`/api/templates/${templateId}`);
      // setTemplate(response.data);

      // モックデータ
      const mockTemplate: TemplateDetail = {
        id: templateId,
        name: '本祭評価テンプレート',
        description: '本祭での演舞評価用の標準テンプレート。技術面、表現力、構成などを総合的に評価します。',
        isDefault: true,
        isPublic: true,
        categories: [
          {
            id: 'cat1',
            name: '技術面',
            description: '演舞の技術的な完成度を評価',
            weight: 30,
            criteria: [
              {
                id: 'crit1',
                name: '基本動作の正確性',
                description: 'よさこいの基本動作が正確に実行されているか',
                weight: 40,
                minScore: 1,
                maxScore: 5,
                isRequired: true,
              },
              {
                id: 'crit2',
                name: '鳴子の扱い',
                description: '鳴子を効果的に使用できているか',
                weight: 30,
                minScore: 1,
                maxScore: 5,
                isRequired: true,
              },
              {
                id: 'crit3',
                name: '隊形変化',
                description: '隊形変化がスムーズで効果的か',
                weight: 30,
                minScore: 1,
                maxScore: 5,
                isRequired: false,
              },
            ],
          },
          {
            id: 'cat2',
            name: '表現力',
            description: '演舞の表現力と感情の伝達を評価',
            weight: 25,
            criteria: [
              {
                id: 'crit4',
                name: '表情・感情表現',
                description: '豊かな表情で感情を表現できているか',
                weight: 50,
                minScore: 1,
                maxScore: 5,
                isRequired: true,
              },
              {
                id: 'crit5',
                name: '観客との一体感',
                description: '観客を巻き込む力があるか',
                weight: 50,
                minScore: 1,
                maxScore: 5,
                isRequired: false,
              },
            ],
          },
          {
            id: 'cat3',
            name: '構成・演出',
            description: '演舞の構成と演出の完成度を評価',
            weight: 25,
            criteria: [
              {
                id: 'crit6',
                name: '楽曲との調和',
                description: '楽曲と演舞が調和しているか',
                weight: 40,
                minScore: 1,
                maxScore: 5,
                isRequired: true,
              },
              {
                id: 'crit7',
                name: '衣装・小道具',
                description: '衣装や小道具が効果的に使用されているか',
                weight: 30,
                minScore: 1,
                maxScore: 5,
                isRequired: false,
              },
              {
                id: 'crit8',
                name: 'ストーリー性',
                description: '演舞にストーリー性があるか',
                weight: 30,
                minScore: 1,
                maxScore: 5,
                isRequired: false,
              },
            ],
          },
          {
            id: 'cat4',
            name: '総合評価',
            description: '全体的な印象と完成度を評価',
            weight: 20,
            criteria: [
              {
                id: 'crit9',
                name: '全体の完成度',
                description: '演舞全体の完成度はどうか',
                weight: 60,
                minScore: 1,
                maxScore: 5,
                isRequired: true,
              },
              {
                id: 'crit10',
                name: '独創性',
                description: '独創的で印象に残る演舞か',
                weight: 40,
                minScore: 1,
                maxScore: 5,
                isRequired: false,
              },
            ],
          },
        ],
        settings: {
          allowComments: true,
          requireAllCriteria: false,
          showWeights: true,
          anonymousEvaluation: false,
        },
        usageCount: 25,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-07-20T14:30:00Z',
        creatorName: 'システム管理者',
        tags: ['本祭', '標準', '総合評価'],
      };
      setTemplate(mockTemplate);
      setEditedTemplate(mockTemplate);
    } catch (error: any) {
      setError('テンプレート詳細の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // タブ変更
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 編集モード切り替え
  const handleEditToggle = () => {
    if (isEditing) {
      setEditedTemplate(template);
    }
    setIsEditing(!isEditing);
  };

  // 保存処理
  const handleSave = async () => {
    if (!editedTemplate) return;

    try {
      // TODO: API呼び出し
      // await apiClient.put(`/api/templates/${editedTemplate.id}`, editedTemplate);
      setTemplate(editedTemplate);
      setIsEditing(false);
    } catch (error: any) {
      setError('テンプレートの保存に失敗しました');
    }
  };

  // 基本情報の更新
  const handleBasicInfoChange = (field: string, value: any) => {
    if (!editedTemplate) return;
    setEditedTemplate({
      ...editedTemplate,
      [field]: value,
    });
  };

  // 設定の更新
  const handleSettingChange = (field: string, value: boolean) => {
    if (!editedTemplate) return;
    setEditedTemplate({
      ...editedTemplate,
      settings: {
        ...editedTemplate.settings,
        [field]: value,
      },
    });
  };

  // カテゴリの追加
  const handleAddCategory = () => {
    if (!editedTemplate) return;
    const newCategory: EvaluationCategory = {
      id: `cat_${Date.now()}`,
      name: '新しいカテゴリ',
      description: '',
      weight: 10,
      criteria: [],
    };
    setEditedTemplate({
      ...editedTemplate,
      categories: [...editedTemplate.categories, newCategory],
    });
  };

  // カテゴリの更新
  const handleCategoryChange = (categoryId: string, field: string, value: any) => {
    if (!editedTemplate) return;
    setEditedTemplate({
      ...editedTemplate,
      categories: editedTemplate.categories.map(cat =>
        cat.id === categoryId ? { ...cat, [field]: value } : cat
      ),
    });
  };

  // カテゴリの削除
  const handleDeleteCategory = (categoryId: string) => {
    if (!editedTemplate) return;
    setEditedTemplate({
      ...editedTemplate,
      categories: editedTemplate.categories.filter(cat => cat.id !== categoryId),
    });
  };

  // 評価項目の追加
  const handleAddCriterion = (categoryId: string) => {
    if (!editedTemplate) return;
    const newCriterion: EvaluationCriterion = {
      id: `crit_${Date.now()}`,
      name: '新しい評価項目',
      description: '',
      weight: 10,
      minScore: 1,
      maxScore: 5,
      isRequired: false,
    };
    setEditedTemplate({
      ...editedTemplate,
      categories: editedTemplate.categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, criteria: [...cat.criteria, newCriterion] }
          : cat
      ),
    });
  };

  // 評価項目の更新
  const handleCriterionChange = (categoryId: string, criterionId: string, field: string, value: any) => {
    if (!editedTemplate) return;
    setEditedTemplate({
      ...editedTemplate,
      categories: editedTemplate.categories.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              criteria: cat.criteria.map(crit =>
                crit.id === criterionId ? { ...crit, [field]: value } : crit
              ),
            }
          : cat
      ),
    });
  };

  // 評価項目の削除
  const handleDeleteCriterion = (categoryId: string, criterionId: string) => {
    if (!editedTemplate) return;
    setEditedTemplate({
      ...editedTemplate,
      categories: editedTemplate.categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, criteria: cat.criteria.filter(crit => crit.id !== criterionId) }
          : cat
      ),
    });
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
  const canEdit = hasAnyRole([UserRole.ADMIN, UserRole.EVALUATOR]) && 
    (template?.isDefault === false || hasAnyRole([UserRole.ADMIN]));

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          テンプレート詳細を読み込み中...
        </Typography>
      </Box>
    );
  }

  if (error || !template || !editedTemplate) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'テンプレートが見つかりません'}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/templates')}
          sx={{ mt: 2 }}
        >
          テンプレート一覧に戻る
        </Button>
      </Box>
    );
  }

  const totalCriteria = template.categories.reduce((sum, cat) => sum + cat.criteria.length, 0);

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/templates')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" gutterBottom>
            {template.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={template.isPublic ? '公開' : '非公開'}
              color={template.isPublic ? 'success' : 'default'}
              size="small"
            />
            {template.isDefault && (
              <Chip label="デフォルト" color="warning" size="small" />
            )}
            <Typography variant="body2" color="text.secondary">
              作成者: {template.creatorName} | 更新日: {formatDate(template.updatedAt)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={() => setPreviewDialogOpen(true)}
          >
            プレビュー
          </Button>
          {canEdit && (
            <>
              {!isEditing ? (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEditToggle}
                >
                  編集
                </Button>
              ) : (
                <>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                  >
                    保存
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleEditToggle}
                  >
                    キャンセル
                  </Button>
                </>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* 基本情報カード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                テンプレート概要
              </Typography>
              {isEditing ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="テンプレート名"
                    value={editedTemplate.name}
                    onChange={(e) => handleBasicInfoChange('name', e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="説明"
                    value={editedTemplate.description}
                    onChange={(e) => handleBasicInfoChange('description', e.target.value)}
                    multiline
                    rows={3}
                    fullWidth
                  />
                </Box>
              ) : (
                <>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {template.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    使用回数: {template.usageCount}回
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                構成情報
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">カテゴリ数</Typography>
                <Typography variant="h6" color="primary">
                  {template.categories.length}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">評価項目数</Typography>
                <Typography variant="h6" color="primary">
                  {totalCriteria}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" color="text.secondary">
                作成日: {formatDate(template.createdAt)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* タブ */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="評価項目" />
          <Tab label="設定" />
        </Tabs>

        {/* 評価項目タブ */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              評価カテゴリと項目
            </Typography>
            {isEditing && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddCategory}
              >
                カテゴリ追加
              </Button>
            )}
          </Box>

          {editedTemplate.categories.map((category, categoryIndex) => (
            <Accordion key={category.id} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  {isEditing && <DragIndicatorIcon sx={{ color: 'text.secondary' }} />}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{category.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      重み: {category.weight}% | 項目数: {category.criteria.length}
                    </Typography>
                  </Box>
                  {isEditing && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(category.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {isEditing ? (
                  <Box sx={{ mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="カテゴリ名"
                          value={category.name}
                          onChange={(e) => handleCategoryChange(category.id, 'name', e.target.value)}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          label="重み (%)"
                          type="number"
                          value={category.weight}
                          onChange={(e) => handleCategoryChange(category.id, 'weight', parseInt(e.target.value))}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="説明"
                          value={category.description}
                          onChange={(e) => handleCategoryChange(category.id, 'description', e.target.value)}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {category.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">評価項目</Typography>
                  {isEditing && (
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleAddCriterion(category.id)}
                    >
                      項目追加
                    </Button>
                  )}
                </Box>

                <List dense>
                  {category.criteria.map((criterion, criterionIndex) => (
                    <ListItem key={criterion.id} divider>
                      <ListItemText
                        primary={
                          isEditing ? (
                            <TextField
                              value={criterion.name}
                              onChange={(e) => handleCriterionChange(category.id, criterion.id, 'name', e.target.value)}
                              size="small"
                              fullWidth
                            />
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1">{criterion.name}</Typography>
                              {criterion.isRequired && (
                                <Chip label="必須" size="small" color="error" />
                              )}
                            </Box>
                          )
                        }
                        secondary={
                          isEditing ? (
                            <Box sx={{ mt: 1 }}>
                              <TextField
                                label="説明"
                                value={criterion.description}
                                onChange={(e) => handleCriterionChange(category.id, criterion.id, 'description', e.target.value)}
                                size="small"
                                fullWidth
                                sx={{ mb: 1 }}
                              />
                              <Grid container spacing={1}>
                                <Grid item xs={3}>
                                  <TextField
                                    label="重み (%)"
                                    type="number"
                                    value={criterion.weight}
                                    onChange={(e) => handleCriterionChange(category.id, criterion.id, 'weight', parseInt(e.target.value))}
                                    size="small"
                                    fullWidth
                                  />
                                </Grid>
                                <Grid item xs={3}>
                                  <TextField
                                    label="最小値"
                                    type="number"
                                    value={criterion.minScore}
                                    onChange={(e) => handleCriterionChange(category.id, criterion.id, 'minScore', parseInt(e.target.value))}
                                    size="small"
                                    fullWidth
                                  />
                                </Grid>
                                <Grid item xs={3}>
                                  <TextField
                                    label="最大値"
                                    type="number"
                                    value={criterion.maxScore}
                                    onChange={(e) => handleCriterionChange(category.id, criterion.id, 'maxScore', parseInt(e.target.value))}
                                    size="small"
                                    fullWidth
                                  />
                                </Grid>
                                <Grid item xs={3}>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={criterion.isRequired}
                                        onChange={(e) => handleCriterionChange(category.id, criterion.id, 'isRequired', e.target.checked)}
                                        size="small"
                                      />
                                    }
                                    label="必須"
                                  />
                                </Grid>
                              </Grid>
                            </Box>
                          ) : (
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {criterion.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                重み: {criterion.weight}% | 範囲: {criterion.minScore}-{criterion.maxScore}
                              </Typography>
                            </Box>
                          )
                        }
                      />
                      {isEditing && (
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteCriterion(category.id, criterion.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </TabPanel>

        {/* 設定タブ */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            テンプレート設定
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="コメント機能"
                secondary="評価時にタイムライン連動コメントを許可する"
              />
              <ListItemSecondaryAction>
                {isEditing ? (
                  <Switch
                    checked={editedTemplate.settings.allowComments}
                    onChange={(e) => handleSettingChange('allowComments', e.target.checked)}
                  />
                ) : (
                  <Chip
                    label={template.settings.allowComments ? '有効' : '無効'}
                    color={template.settings.allowComments ? 'success' : 'default'}
                    size="small"
                  />
                )}
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="全項目必須"
                secondary="すべての評価項目の入力を必須とする"
              />
              <ListItemSecondaryAction>
                {isEditing ? (
                  <Switch
                    checked={editedTemplate.settings.requireAllCriteria}
                    onChange={(e) => handleSettingChange('requireAllCriteria', e.target.checked)}
                  />
                ) : (
                  <Chip
                    label={template.settings.requireAllCriteria ? '有効' : '無効'}
                    color={template.settings.requireAllCriteria ? 'success' : 'default'}
                    size="small"
                  />
                )}
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="重み表示"
                secondary="評価者に各項目の重みを表示する"
              />
              <ListItemSecondaryAction>
                {isEditing ? (
                  <Switch
                    checked={editedTemplate.settings.showWeights}
                    onChange={(e) => handleSettingChange('showWeights', e.target.checked)}
                  />
                ) : (
                  <Chip
                    label={template.settings.showWeights ? '有効' : '無効'}
                    color={template.settings.showWeights ? 'success' : 'default'}
                    size="small"
                  />
                )}
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="匿名評価"
                secondary="評価者の名前を他の参加者に表示しない"
              />
              <ListItemSecondaryAction>
                {isEditing ? (
                  <Switch
                    checked={editedTemplate.settings.anonymousEvaluation}
                    onChange={(e) => handleSettingChange('anonymousEvaluation', e.target.checked)}
                  />
                ) : (
                  <Chip
                    label={template.settings.anonymousEvaluation ? '有効' : '無効'}
                    color={template.settings.anonymousEvaluation ? 'success' : 'default'}
                    size="small"
                  />
                )}
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </TabPanel>
      </Paper>

      {/* プレビューダイアログ */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>テンプレートプレビュー</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            このテンプレートを使用した評価画面のプレビューです。
          </Typography>
          {/* TODO: 実際の評価フォームのプレビューを実装 */}
          <Alert severity="info">
            プレビュー機能は今後実装予定です。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateDetailPage;