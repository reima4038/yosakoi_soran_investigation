import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Tooltip,
  FormControlLabel,
  Switch,
  LinearProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Balance as BalanceIcon,
} from '@mui/icons-material';
import {
  Template,
  Category,
  Criterion,
  CriterionType,
  templateService,
  CreateTemplateRequest,
} from '../../services/templateService';

interface TemplateCreationFormProps {
  initialTemplate?: Template;
  onSave: (template: Template) => void;
  onCancel: () => void;
}

const TemplateCreationForm: React.FC<TemplateCreationFormProps> = ({
  initialTemplate,
  onSave,
  onCancel,
}) => {
  const [template, setTemplate] = useState<CreateTemplateRequest>(() => ({
    name: initialTemplate?.name || '',
    description: initialTemplate?.description || '',
    categories: initialTemplate?.categories || [
      templateService.createNewCategory(),
    ],
    allowGeneralComments: initialTemplate?.allowGeneralComments ?? true,
  }));

  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  // const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  // const [currentCategoryIndex, setCurrentCategoryIndex] = useState<
  //   number | null
  // >(null);
  const [advancedWeightDialogOpen, setAdvancedWeightDialogOpen] =
    useState(false);

  // テンプレート基本情報の更新
  const updateTemplate = useCallback(
    (field: keyof CreateTemplateRequest, value: any) => {
      setTemplate(prev => ({ ...prev, [field]: value }));
      setErrors([]);
    },
    []
  );

  // カテゴリの追加
  const addCategory = useCallback(() => {
    setTemplate(prev => ({
      ...prev,
      categories: [...prev.categories, templateService.createNewCategory()],
    }));
  }, []);

  // カテゴリの削除
  const removeCategory = useCallback((index: number) => {
    setTemplate(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  }, []);

  // カテゴリの更新
  const updateCategory = useCallback(
    (index: number, field: keyof Category, value: any) => {
      setTemplate(prev => ({
        ...prev,
        categories: prev.categories.map((category, i) =>
          i === index ? { ...category, [field]: value } : category
        ),
      }));
      setErrors([]);
    },
    []
  );

  // 評価基準の追加
  const addCriterion = useCallback((categoryIndex: number) => {
    setTemplate(prev => ({
      ...prev,
      categories: prev.categories.map((category, i) =>
        i === categoryIndex
          ? {
              ...category,
              criteria: [
                ...category.criteria,
                templateService.createNewCriterion(),
              ],
            }
          : category
      ),
    }));
  }, []);

  // 評価基準の削除
  const removeCriterion = useCallback(
    (categoryIndex: number, criterionIndex: number) => {
      setTemplate(prev => ({
        ...prev,
        categories: prev.categories.map((category, i) =>
          i === categoryIndex
            ? {
                ...category,
                criteria: category.criteria.filter(
                  (_, j) => j !== criterionIndex
                ),
              }
            : category
        ),
      }));
    },
    []
  );

  // 評価基準の更新
  const updateCriterion = useCallback(
    (
      categoryIndex: number,
      criterionIndex: number,
      field: keyof Criterion,
      value: any
    ) => {
      setTemplate(prev => ({
        ...prev,
        categories: prev.categories.map((category, i) =>
          i === categoryIndex
            ? {
                ...category,
                criteria: category.criteria.map((criterion, j) =>
                  j === criterionIndex
                    ? { ...criterion, [field]: value }
                    : criterion
                ),
              }
            : category
        ),
      }));
      setErrors([]);
    },
    []
  );

  // 重みの自動調整
  const autoAdjustWeights = useCallback((categoryIndex?: number) => {
    setTemplate(prev => {
      const newTemplate = { ...prev };

      if (categoryIndex !== undefined) {
        // 特定のカテゴリ内の評価基準の重みを調整
        const category = newTemplate.categories[categoryIndex];
        const normalizedCriteria = templateService.normalizeWeights(
          category.criteria
        );
        newTemplate.categories[categoryIndex] = {
          ...category,
          criteria: normalizedCriteria as Criterion[],
        };
      } else {
        // カテゴリの重みを調整
        const normalizedCategories = templateService.normalizeWeights(
          newTemplate.categories
        );
        newTemplate.categories = normalizedCategories as Category[];
      }

      return newTemplate;
    });
  }, []);

  // 保存処理
  const handleSave = async () => {
    const validationErrors = templateService.validateTemplate(template);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      let savedTemplate: Template;
      if (initialTemplate?.id) {
        savedTemplate = await templateService.updateTemplate(
          initialTemplate.id,
          template
        );
      } else {
        savedTemplate = await templateService.createTemplate(template);
      }
      onSave(savedTemplate);
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : 'テンプレートの保存に失敗しました',
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 重み調整ダイアログを開く（将来の機能拡張用）
  // const openWeightDialog = (categoryIndex: number) => {
  //   setCurrentCategoryIndex(categoryIndex);
  //   setWeightDialogOpen(true);
  // };

  // 重み調整ダイアログでの重み更新（将来の機能拡張用）
  // const updateWeightInDialog = (criterionIndex: number, weight: number) => {
  //   if (currentCategoryIndex !== null) {
  //     updateCriterion(
  //       currentCategoryIndex,
  //       criterionIndex,
  //       'weight',
  //       weight / 100
  //     );
  //   }
  // };

  const getCriterionTypeLabel = (type: CriterionType): string => {
    switch (type) {
      case CriterionType.NUMERIC:
        return '数値入力';
      case CriterionType.SCALE:
        return 'スケール評価';
      case CriterionType.BOOLEAN:
        return 'はい/いいえ';
      default:
        return type;
    }
  };

  const getTotalWeight = (items: { weight: number }[]): number => {
    return items.reduce((sum, item) => sum + item.weight, 0);
  };

  // 重みの状態を取得
  const getWeightStatus = (
    items: { weight: number }[]
  ): 'perfect' | 'warning' | 'error' => {
    const total = getTotalWeight(items);
    if (Math.abs(total - 1) < 0.001) return 'perfect';
    if (Math.abs(total - 1) < 0.1) return 'warning';
    return 'error';
  };

  // 重みの色を取得
  const getWeightColor = (status: 'perfect' | 'warning' | 'error'): string => {
    switch (status) {
      case 'perfect':
        return 'success.main';
      case 'warning':
        return 'warning.main';
      case 'error':
        return 'error.main';
      default:
        return 'primary.main';
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant='h4' gutterBottom>
          {initialTemplate ? 'テンプレート編集' : 'テンプレート作成'}
        </Typography>

        {errors.length > 0 && (
          <Alert severity='error' sx={{ mb: 3 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* 基本情報 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant='h6' gutterBottom>
            基本情報
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label='テンプレート名'
                value={template.name}
                onChange={e => updateTemplate('name', e.target.value)}
                required
                error={errors.some(error => error.includes('テンプレート名'))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='説明'
                value={template.description}
                onChange={e => updateTemplate('description', e.target.value)}
                multiline
                rows={3}
                required
                error={errors.some(error => error.includes('説明'))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={template.allowGeneralComments || false}
                    onChange={e =>
                      updateTemplate('allowGeneralComments', e.target.checked)
                    }
                  />
                }
                label='全体的なコメント入力を許可する'
              />
              <Typography variant='body2' color='text.secondary'>
                評価者がテンプレート全体に対する自由記述コメントを入力できるようになります
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* カテゴリ一覧 */}
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant='h6'>
              カテゴリ ({template.categories.length})
            </Typography>
            <Box>
              <Tooltip title='カテゴリの重みを自動調整'>
                <IconButton onClick={() => autoAdjustWeights()} color='primary'>
                  <BalanceIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant='outlined'
                size='small'
                onClick={() => setAdvancedWeightDialogOpen(true)}
                sx={{ ml: 1 }}
              >
                詳細調整
              </Button>
              <Button
                startIcon={<AddIcon />}
                onClick={addCategory}
                variant='outlined'
                size='small'
              >
                カテゴリ追加
              </Button>
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant='body2' color='text.secondary'>
              カテゴリ重み合計: {getTotalWeight(template.categories).toFixed(3)}
              {Math.abs(getTotalWeight(template.categories) - 1) > 0.001 && (
                <Chip
                  label='要調整'
                  color='warning'
                  size='small'
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>

            {/* 重み分布の視覚化 */}
            <Card variant='outlined' sx={{ mt: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant='subtitle2' gutterBottom>
                  カテゴリ重み分布
                </Typography>
                {template.categories.map((category, index) => (
                  <Box key={category.id} sx={{ mb: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 0.5,
                      }}
                    >
                      <Typography variant='caption'>
                        {category.name || `カテゴリ ${index + 1}`}
                      </Typography>
                      <Typography variant='caption'>
                        {(category.weight * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant='determinate'
                      value={category.weight * 100}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getWeightColor(
                            getWeightStatus(template.categories)
                          ),
                        },
                      }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Box>

          {template.categories.map((category, categoryIndex) => (
            <Accordion key={category.id} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', width: '100%' }}
                >
                  <Typography sx={{ flexGrow: 1 }}>
                    {category.name || `カテゴリ ${categoryIndex + 1}`}
                  </Typography>
                  <Chip
                    label={`重み: ${(category.weight * 100).toFixed(1)}%`}
                    size='small'
                    sx={{ mr: 2 }}
                  />
                  <Chip
                    label={`${category.criteria.length}項目`}
                    size='small'
                    sx={{ mr: 2 }}
                  />
                  <IconButton
                    size='small'
                    onClick={e => {
                      e.stopPropagation();
                      removeCategory(categoryIndex);
                    }}
                    disabled={template.categories.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label='カテゴリ名'
                      value={category.name}
                      onChange={e =>
                        updateCategory(categoryIndex, 'name', e.target.value)
                      }
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label='重み'
                      type='number'
                      value={category.weight}
                      onChange={e =>
                        updateCategory(
                          categoryIndex,
                          'weight',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      inputProps={{ min: 0, max: 1, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label='説明'
                      value={category.description}
                      onChange={e =>
                        updateCategory(
                          categoryIndex,
                          'description',
                          e.target.value
                        )
                      }
                      multiline
                      rows={2}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={category.allowComments || false}
                          onChange={e =>
                            updateCategory(
                              categoryIndex,
                              'allowComments',
                              e.target.checked
                            )
                          }
                        />
                      }
                      label='このカテゴリでコメント入力を許可する'
                    />
                  </Grid>
                </Grid>

                {/* 評価基準 */}
                <Box sx={{ mt: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant='subtitle1'>
                      評価基準 ({category.criteria.length})
                    </Typography>
                    <Box>
                      <Tooltip title='評価基準の重みを自動調整'>
                        <IconButton
                          onClick={() => autoAdjustWeights(categoryIndex)}
                          color='primary'
                          size='small'
                        >
                          <BalanceIcon />
                        </IconButton>
                      </Tooltip>
                      <Button
                        startIcon={<AddIcon />}
                        onClick={() => addCriterion(categoryIndex)}
                        variant='outlined'
                        size='small'
                      >
                        評価基準追加
                      </Button>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant='body2' color='text.secondary'>
                      評価基準重み合計:{' '}
                      {getTotalWeight(category.criteria).toFixed(3)}
                      {Math.abs(getTotalWeight(category.criteria) - 1) >
                        0.001 && (
                        <Chip
                          label='要調整'
                          color='warning'
                          size='small'
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>

                    {/* 評価基準重み分布の視覚化 */}
                    {category.criteria.length > 1 && (
                      <Card variant='outlined' sx={{ mt: 2 }}>
                        <CardContent sx={{ py: 2 }}>
                          <Typography variant='caption' gutterBottom>
                            評価基準重み分布
                          </Typography>
                          {category.criteria.map((criterion, index) => (
                            <Box key={criterion.id} sx={{ mb: 1 }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  mb: 0.5,
                                }}
                              >
                                <Typography variant='caption'>
                                  {criterion.name || `評価基準 ${index + 1}`}
                                </Typography>
                                <Typography variant='caption'>
                                  {(criterion.weight * 100).toFixed(1)}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant='determinate'
                                value={criterion.weight * 100}
                                sx={{
                                  height: 4,
                                  borderRadius: 2,
                                  backgroundColor: 'grey.200',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: getWeightColor(
                                      getWeightStatus(category.criteria)
                                    ),
                                  },
                                }}
                              />
                            </Box>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </Box>

                  {category.criteria.map((criterion, criterionIndex) => (
                    <Paper
                      key={criterion.id}
                      variant='outlined'
                      sx={{ p: 2, mb: 2 }}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label='評価基準名'
                            value={criterion.name}
                            onChange={e =>
                              updateCriterion(
                                categoryIndex,
                                criterionIndex,
                                'name',
                                e.target.value
                              )
                            }
                            required
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <FormControl fullWidth>
                            <InputLabel>評価タイプ</InputLabel>
                            <Select
                              value={criterion.type}
                              onChange={e =>
                                updateCriterion(
                                  categoryIndex,
                                  criterionIndex,
                                  'type',
                                  e.target.value
                                )
                              }
                              label='評価タイプ'
                            >
                              {Object.values(CriterionType).map(type => (
                                <MenuItem key={type} value={type}>
                                  {getCriterionTypeLabel(type)}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6} md={1}>
                          <TextField
                            fullWidth
                            label='最小値'
                            type='number'
                            value={criterion.minValue}
                            onChange={e =>
                              updateCriterion(
                                categoryIndex,
                                criterionIndex,
                                'minValue',
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                        </Grid>
                        <Grid item xs={6} md={1}>
                          <TextField
                            fullWidth
                            label='最大値'
                            type='number'
                            value={criterion.maxValue}
                            onChange={e =>
                              updateCriterion(
                                categoryIndex,
                                criterionIndex,
                                'maxValue',
                                parseInt(e.target.value) || 1
                              )
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label='重み'
                            type='number'
                            value={criterion.weight}
                            onChange={e =>
                              updateCriterion(
                                categoryIndex,
                                criterionIndex,
                                'weight',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            inputProps={{ min: 0, max: 1, step: 0.01 }}
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              height: '100%',
                              alignItems: 'center',
                            }}
                          >
                            <IconButton
                              onClick={() =>
                                removeCriterion(categoryIndex, criterionIndex)
                              }
                              disabled={category.criteria.length === 1}
                              color='error'
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label='説明'
                            value={criterion.description}
                            onChange={e =>
                              updateCriterion(
                                categoryIndex,
                                criterionIndex,
                                'description',
                                e.target.value
                              )
                            }
                            multiline
                            rows={2}
                            required
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={criterion.allowComments || false}
                                onChange={e =>
                                  updateCriterion(
                                    categoryIndex,
                                    criterionIndex,
                                    'allowComments',
                                    e.target.checked
                                  )
                                }
                              />
                            }
                            label='この評価基準でコメント入力を許可する'
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        {/* アクションボタン */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            startIcon={<PreviewIcon />}
            onClick={() => setPreviewOpen(true)}
            variant='outlined'
          >
            プレビュー
          </Button>
          <Box>
            <Button onClick={onCancel} sx={{ mr: 2 }}>
              キャンセル
            </Button>
            <Button
              startIcon={<SaveIcon />}
              onClick={handleSave}
              variant='contained'
              disabled={loading}
            >
              {loading ? '保存中...' : '保存'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* プレビューダイアログ */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>テンプレートプレビュー</DialogTitle>
        <DialogContent>
          <Typography variant='h6' gutterBottom>
            {template.name}
          </Typography>
          <Typography variant='body2' color='text.secondary' paragraph>
            {template.description}
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Chip
              label={
                template.allowGeneralComments
                  ? '全体コメント: 有効'
                  : '全体コメント: 無効'
              }
              color={template.allowGeneralComments ? 'success' : 'default'}
              size='small'
            />
          </Box>

          {template.categories.map((category, _categoryIndex) => (
            <Box key={category.id} sx={{ mb: 3 }}>
              <Typography variant='subtitle1' gutterBottom>
                {category.name} (重み: {(category.weight * 100).toFixed(1)}%)
                {category.allowComments && (
                  <Chip
                    label='コメント可'
                    color='info'
                    size='small'
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
              <Typography variant='body2' color='text.secondary' paragraph>
                {category.description}
              </Typography>

              {category.criteria.map((criterion, _criterionIndex) => (
                <Box key={criterion.id} sx={{ ml: 2, mb: 1 }}>
                  <Typography variant='body2'>
                    • {criterion.name} ({getCriterionTypeLabel(criterion.type)}:{' '}
                    {criterion.minValue}-{criterion.maxValue}, 重み:{' '}
                    {(criterion.weight * 100).toFixed(1)}%)
                    {criterion.allowComments && (
                      <Chip
                        label='コメント可'
                        color='info'
                        size='small'
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ ml: 2 }}
                  >
                    {criterion.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 詳細重み調整ダイアログ */}
      <Dialog
        open={advancedWeightDialogOpen}
        onClose={() => setAdvancedWeightDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>詳細重み調整</DialogTitle>
        <DialogContent>
          <Typography variant='body2' color='text.secondary' paragraph>
            各カテゴリの重みを詳細に調整できます。合計が1.0になるように調整してください。
          </Typography>

          {template.categories.map((category, categoryIndex) => (
            <Box key={category.id} sx={{ mb: 3 }}>
              <Typography variant='subtitle2' gutterBottom>
                {category.name || `カテゴリ ${categoryIndex + 1}`}
              </Typography>
              <Grid container spacing={2} alignItems='center'>
                <Grid item xs={8}>
                  <Slider
                    value={category.weight * 100}
                    onChange={(_, value) =>
                      updateCategory(
                        categoryIndex,
                        'weight',
                        (value as number) / 100
                      )
                    }
                    min={0}
                    max={100}
                    step={1}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 25, label: '25%' },
                      { value: 50, label: '50%' },
                      { value: 75, label: '75%' },
                      { value: 100, label: '100%' },
                    ]}
                    valueLabelDisplay='on'
                    valueLabelFormat={value => `${value}%`}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    type='number'
                    value={(category.weight * 100).toFixed(1)}
                    onChange={e =>
                      updateCategory(
                        categoryIndex,
                        'weight',
                        parseFloat(e.target.value) / 100 || 0
                      )
                    }
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    size='small'
                    label='%'
                  />
                </Grid>
              </Grid>
            </Box>
          ))}

          <Box
            sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}
          >
            <Typography variant='body2'>
              合計: {(getTotalWeight(template.categories) * 100).toFixed(1)}%
              {Math.abs(getTotalWeight(template.categories) - 1) > 0.001 && (
                <Chip
                  label='要調整'
                  color='warning'
                  size='small'
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => autoAdjustWeights()}>自動調整</Button>
          <Button onClick={() => setAdvancedWeightDialogOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateCreationForm;
