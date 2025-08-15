import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { templateService, CreateTemplateRequest, CriterionType, Template } from '../../services/templateService';
import { useTemplateOperations } from '../../hooks/useTemplateOperations';
import { OperationFeedback, ValidationErrors } from '../common';

// 評価項目の型定義
interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  type: CriterionType;
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

// テンプレートフォームの型定義
interface TemplateForm {
  name: string;
  description: string;
  isPublic: boolean;
  categories: EvaluationCategory[];
  settings: {
    allowComments: boolean;
    requireAllCriteria: boolean;
    showWeights: boolean;
    anonymousEvaluation: boolean;
  };
  tags: string[];
}

const steps = [
  '基本情報',
  '評価カテゴリ',
  '評価項目',
  '設定',
  '確認',
];

const TemplateEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [originalTemplate, setOriginalTemplate] = useState<Template | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const {
    operationState,
    clearMessages,
    updateTemplate,
    getTemplate,
  } = useTemplateOperations();

  const [templateForm, setTemplateForm] = useState<TemplateForm>({
    name: '',
    description: '',
    isPublic: true,
    categories: [],
    settings: {
      allowComments: true,
      requireAllCriteria: false,
      showWeights: true,
      anonymousEvaluation: false,
    },
    tags: [],
  });

  // テンプレートデータの読み込み
  useEffect(() => {
    const loadTemplate = async () => {
      if (!id) {
        setIsLoadingTemplate(false);
        return;
      }

      setIsLoadingTemplate(true);
      const template = await getTemplate(id);
      if (template) {
        setOriginalTemplate(template);
        
        // テンプレートデータをフォーム形式に変換
        const formData: TemplateForm = {
          name: template.name,
          description: template.description,
          isPublic: template.isPublic,
          categories: template.categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            weight: Math.round(cat.weight * 100), // 小数点を%表記に変換
            criteria: cat.criteria.map(crit => ({
              id: crit.id,
              name: crit.name,
              description: crit.description,
              type: crit.type,
              weight: Math.round(crit.weight * 100), // 小数点を%表記に変換
              minScore: crit.minValue,
              maxScore: crit.maxValue,
              isRequired: crit.allowComments || false, // 適切にマッピング
            })),
          })),
          settings: {
            allowComments: template.allowGeneralComments || false,
            requireAllCriteria: false,
            showWeights: true,
            anonymousEvaluation: false,
          },
          tags: [],
        };
        
        setTemplateForm(formData);
      }
      setIsLoadingTemplate(false);
    };

    loadTemplate();
  }, [id]);

  // 評価タイプのラベル取得
  const getCriterionTypeLabel = (type: CriterionType): string => {
    switch (type) {
      case CriterionType.NUMERIC:
        return '数値入力';
      case CriterionType.SCALE:
        return 'スケール評価';
      case CriterionType.BOOLEAN:
        return 'はい/いいえ';
      default:
        return 'スケール評価';
    }
  };

  // 基本情報の更新
  const handleBasicInfoChange = (field: string, value: any) => {
    setTemplateForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // 設定の更新
  const handleSettingChange = (field: string, value: boolean) => {
    setTemplateForm(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value,
      },
    }));
  };

  // カテゴリの追加
  const handleAddCategory = () => {
    const newCategory: EvaluationCategory = {
      id: `cat_${Date.now()}`,
      name: '',
      description: '',
      weight: 25,
      criteria: [],
    };
    setTemplateForm(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));
  };

  // カテゴリの更新
  const handleCategoryChange = (categoryId: string, field: string, value: any) => {
    setTemplateForm(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, [field]: value } : cat
      ),
    }));
  };

  // カテゴリの削除
  const handleDeleteCategory = (categoryId: string) => {
    setTemplateForm(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.id !== categoryId),
    }));
  };

  // 評価項目の追加
  const handleAddCriterion = (categoryId: string) => {
    const newCriterion: EvaluationCriterion = {
      id: `crit_${Date.now()}`,
      name: '',
      description: '',
      type: CriterionType.SCALE,
      weight: 20,
      minScore: 1,
      maxScore: 5,
      isRequired: false,
    };
    setTemplateForm(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, criteria: [...cat.criteria, newCriterion] }
          : cat
      ),
    }));
  };

  // 評価項目の更新
  const handleCriterionChange = (categoryId: string, criterionId: string, field: string, value: any) => {
    setTemplateForm(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              criteria: cat.criteria.map(crit =>
                crit.id === criterionId ? { ...crit, [field]: value } : crit
              ),
            }
          : cat
      ),
    }));
  };

  // 評価項目の削除
  const handleDeleteCriterion = (categoryId: string, criterionId: string) => {
    setTemplateForm(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, criteria: cat.criteria.filter(crit => crit.id !== criterionId) }
          : cat
      ),
    }));
  };

  // ステップの進行
  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // バリデーション
  const validateStep = (step: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    switch (step) {
      case 0: // 基本情報
        if (!templateForm.name.trim()) {
          errors.push('テンプレート名は必須です');
        }
        if (!templateForm.description.trim()) {
          errors.push('テンプレートの説明は必須です');
        }
        break;
        
      case 1: // カテゴリ
        if (templateForm.categories.length === 0) {
          errors.push('少なくとも1つのカテゴリが必要です');
        }
        
        const categoryWeightSum = templateForm.categories.reduce((sum, cat) => sum + cat.weight, 0);
        if (Math.abs(categoryWeightSum - 100) > 0.1) {
          errors.push('カテゴリの重みの合計は100%である必要があります');
        }
        
        templateForm.categories.forEach((cat, index) => {
          if (!cat.name.trim()) {
            errors.push(`カテゴリ ${index + 1}: 名前は必須です`);
          }
        });
        break;
        
      case 2: // 評価項目
        templateForm.categories.forEach((cat, catIndex) => {
          if (cat.criteria.length === 0) {
            errors.push(`カテゴリ「${cat.name}」: 少なくとも1つの評価項目が必要です`);
          }
          
          const criteriaWeightSum = cat.criteria.reduce((sum, crit) => sum + crit.weight, 0);
          if (Math.abs(criteriaWeightSum - 100) > 0.1) {
            errors.push(`カテゴリ「${cat.name}」: 評価項目の重みの合計は100%である必要があります`);
          }
          
          cat.criteria.forEach((crit, critIndex) => {
            if (!crit.name.trim()) {
              errors.push(`カテゴリ「${cat.name}」の評価項目 ${critIndex + 1}: 名前は必須です`);
            }
            if (crit.maxScore <= crit.minScore) {
              errors.push(`評価項目「${crit.name}」: 最大値は最小値より大きい必要があります`);
            }
          });
        });
        break;
        
      case 3: // 設定
        // 設定に関するバリデーションは特になし
        break;
    }
    
    return { isValid: errors.length === 0, errors };
  };

  // テンプレートの保存
  const handleSave = async () => {
    if (!id || !originalTemplate) {
      return;
    }

    // 最終バリデーション
    const allErrors: string[] = [];
    for (let step = 0; step < 4; step++) {
      const { errors } = validateStep(step);
      allErrors.push(...errors);
    }
    
    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      return;
    }
    
    setValidationErrors([]);
    
    // TemplateFormをCreateTemplateRequestに変換
    const updateRequest: CreateTemplateRequest = {
      name: templateForm.name,
      description: templateForm.description,
      isPublic: templateForm.isPublic,
      categories: templateForm.categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        weight: cat.weight / 100, // %表記を小数点表記に変換
        criteria: cat.criteria.map(crit => ({
          id: crit.id,
          name: crit.name,
          description: crit.description,
          type: crit.type,
          weight: crit.weight / 100, // %表記を小数点表記に変換
          minValue: crit.minScore,
          maxValue: crit.maxScore,
          allowComments: crit.isRequired, // 適切にマッピング
        })),
        allowComments: templateForm.settings.allowComments,
      })),
      allowGeneralComments: templateForm.settings.allowComments,
    };
    
    const result = await updateTemplate(id, updateRequest);
    if (result) {
      navigate('/templates');
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    navigate('/templates');
  };

  // ローディング中の表示
  if (isLoadingTemplate || (operationState.isLoading && !originalTemplate)) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/templates')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">テンプレート編集</Typography>
        </Box>
        
        <OperationFeedback
          isLoading={true}
          loadingMessage="テンプレートデータを読み込み中..."
        />
      </Box>
    );
  }

  // エラー時の表示
  if (operationState.error && !originalTemplate) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/templates')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">テンプレート編集</Typography>
        </Box>
        
        <OperationFeedback
          error={operationState.error}
          onRetry={() => id && loadTemplate()}
          onClearMessages={clearMessages}
        />
        
        <Button variant="contained" onClick={() => navigate('/templates')}>
          テンプレート一覧に戻る
        </Button>
      </Box>
    );
  }

  // ステップコンテンツの描画（TemplateCreatePageと同じ実装を使用）
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // 基本情報
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="テンプレート名"
                  value={templateForm.name}
                  onChange={(e) => handleBasicInfoChange('name', e.target.value)}
                  fullWidth
                  required
                  placeholder="例: 本祭評価テンプレート"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="説明"
                  value={templateForm.description}
                  onChange={(e) => handleBasicInfoChange('description', e.target.value)}
                  multiline
                  rows={3}
                  fullWidth
                  required
                  placeholder="このテンプレートの用途や特徴を説明してください"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={templateForm.isPublic}
                      onChange={(e) => handleBasicInfoChange('isPublic', e.target.checked)}
                    />
                  }
                  label="他のユーザーに公開する"
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1: // カテゴリ
        return (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">評価カテゴリ</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddCategory}
              >
                カテゴリ追加
              </Button>
            </Box>

            {templateForm.categories.map((category, index) => (
              <Card key={category.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">カテゴリ {index + 1}</Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <TextField
                        label="カテゴリ名"
                        value={category.name}
                        onChange={(e) => handleCategoryChange(category.id, 'name', e.target.value)}
                        fullWidth
                        required
                        placeholder="例: 技術面"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="重み (%)"
                        type="number"
                        value={category.weight}
                        onChange={(e) => handleCategoryChange(category.id, 'weight', parseInt(e.target.value) || 0)}
                        fullWidth
                        inputProps={{ min: 0, max: 100 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="説明"
                        value={category.description}
                        onChange={(e) => handleCategoryChange(category.id, 'description', e.target.value)}
                        fullWidth
                        placeholder="このカテゴリで評価する内容を説明してください（任意）"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}

            {templateForm.categories.length === 0 && (
              <Alert severity="info">
                評価カテゴリを追加してください。例: 技術面、表現力、構成など
              </Alert>
            )}
          </Box>
        );

      case 2: // 評価項目
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>評価項目</Typography>
            
            {templateForm.categories.map((category) => (
              <Accordion key={category.id} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
                    {category.name || 'カテゴリ名未設定'} ({category.criteria.length}項目)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {category.description}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleAddCriterion(category.id)}
                    >
                      項目追加
                    </Button>
                  </Box>

                  {category.criteria.map((criterion, index) => (
                    <Card key={criterion.id} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle2">項目 {index + 1}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteCriterion(category.id, criterion.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <TextField
                              label="項目名"
                              value={criterion.name}
                              onChange={(e) => handleCriterionChange(category.id, criterion.id, 'name', e.target.value)}
                              fullWidth
                              required
                              placeholder="例: 基本動作の正確性"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              label="説明"
                              value={criterion.description}
                              onChange={(e) => handleCriterionChange(category.id, criterion.id, 'description', e.target.value)}
                              fullWidth
                              placeholder="この項目で評価する内容を説明してください（任意）"
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <FormControl fullWidth>
                              <InputLabel>評価タイプ</InputLabel>
                              <Select
                                value={criterion.type}
                                label="評価タイプ"
                                onChange={(e) => handleCriterionChange(category.id, criterion.id, 'type', e.target.value)}
                              >
                                {Object.values(CriterionType).map(type => (
                                  <MenuItem key={type} value={type}>
                                    {getCriterionTypeLabel(type)}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              label="重み (%)"
                              type="number"
                              value={criterion.weight}
                              onChange={(e) => handleCriterionChange(category.id, criterion.id, 'weight', parseInt(e.target.value) || 0)}
                              fullWidth
                              inputProps={{ min: 0, max: 100 }}
                            />
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <TextField
                              label="最小値"
                              type="number"
                              value={criterion.minScore}
                              onChange={(e) => handleCriterionChange(category.id, criterion.id, 'minScore', parseInt(e.target.value) || 1)}
                              fullWidth
                              inputProps={{ min: 1 }}
                            />
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <TextField
                              label="最大値"
                              type="number"
                              value={criterion.maxScore}
                              onChange={(e) => handleCriterionChange(category.id, criterion.id, 'maxScore', parseInt(e.target.value) || 5)}
                              fullWidth
                              inputProps={{ min: 1 }}
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={criterion.isRequired}
                                  onChange={(e) => handleCriterionChange(category.id, criterion.id, 'isRequired', e.target.checked)}
                                />
                              }
                              label="必須項目"
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}

                  {category.criteria.length === 0 && (
                    <Alert severity="info">
                      このカテゴリに評価項目を追加してください。
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        );

      case 3: // 設定
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>テンプレート設定</Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="コメント機能"
                  secondary="評価時にタイムライン連動コメントを許可する"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={templateForm.settings.allowComments}
                    onChange={(e) => handleSettingChange('allowComments', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="全項目必須"
                  secondary="すべての評価項目の入力を必須とする"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={templateForm.settings.requireAllCriteria}
                    onChange={(e) => handleSettingChange('requireAllCriteria', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="重み表示"
                  secondary="評価者に各項目の重みを表示する"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={templateForm.settings.showWeights}
                    onChange={(e) => handleSettingChange('showWeights', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="匿名評価"
                  secondary="評価者の名前を他の参加者に表示しない"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={templateForm.settings.anonymousEvaluation}
                    onChange={(e) => handleSettingChange('anonymousEvaluation', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Box>
        );

      case 4: // 確認
        const totalCriteria = templateForm.categories.reduce((sum, cat) => sum + cat.criteria.length, 0);
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>更新内容の確認</Typography>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>基本情報</Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>名前:</strong> {templateForm.name}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>説明:</strong> {templateForm.description}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>公開設定:</strong> {templateForm.isPublic ? '公開' : '非公開'}
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>構成</Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>カテゴリ数:</strong> {templateForm.categories.length}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>評価項目数:</strong> {totalCriteria}
                </Typography>
                
                {templateForm.categories.map((category) => (
                  <Box key={category.id} sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>{category.name}</strong> (重み: {category.weight}%)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {category.criteria.length}項目: {category.criteria.map(c => c.name).join(', ')}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>設定</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label="コメント機能"
                    color={templateForm.settings.allowComments ? 'success' : 'default'}
                    size="small"
                  />
                  <Chip
                    label="全項目必須"
                    color={templateForm.settings.requireAllCriteria ? 'success' : 'default'}
                    size="small"
                  />
                  <Chip
                    label="重み表示"
                    color={templateForm.settings.showWeights ? 'success' : 'default'}
                    size="small"
                  />
                  <Chip
                    label="匿名評価"
                    color={templateForm.settings.anonymousEvaluation ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/templates')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">テンプレート編集</Typography>
        {originalTemplate && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            {originalTemplate.name}
          </Typography>
        )}
      </Box>

      <OperationFeedback
        isLoading={operationState.isLoading}
        error={operationState.error}
        success={operationState.success}
        onClearMessages={clearMessages}
        loadingMessage="テンプレートを更新中..."
      />
      
      <ValidationErrors errors={validationErrors} />

      <Grid container spacing={3}>
        {/* ステッパー */}
        <Grid item xs={12} md={3}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Grid>

        {/* コンテンツ */}
        <Grid item xs={12} md={9}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {steps[activeStep]}
              </Typography>
              
              {renderStepContent(activeStep)}

              {/* ナビゲーションボタン */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                >
                  戻る
                </Button>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                  >
                    キャンセル
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<PreviewIcon />}
                    onClick={() => setPreviewDialogOpen(true)}
                  >
                    プレビュー
                  </Button>
                  
                  {activeStep === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={operationState.isLoading}
                    >
                      テンプレート更新
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={() => {
                        const { isValid, errors } = validateStep(activeStep);
                        if (isValid) {
                          setValidationErrors([]);
                          handleNext();
                        } else {
                          setValidationErrors(errors);
                        }
                      }}
                    >
                      次へ
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
            編集中のテンプレートのプレビューです。
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

export default TemplateEditPage;