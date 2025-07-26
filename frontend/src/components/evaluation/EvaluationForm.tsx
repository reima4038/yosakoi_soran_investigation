import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Slider,
  TextField,
  Button,
  LinearProgress,
  Alert,
  Grid,
  Chip,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Assignment as AssignmentIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import {
  EvaluationData,
  EvaluationScore,
  evaluationService,
} from '../../services/evaluationService';

interface EvaluationFormProps {
  sessionId: string;
  onEvaluationSubmitted?: () => void;
}

interface FormScore extends EvaluationScore {
  criterionName?: string;
  categoryName?: string;
}

const EvaluationForm: React.FC<EvaluationFormProps> = ({
  sessionId,
  onEvaluationSubmitted,
}) => {
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(
    null
  );
  const [scores, setScores] = useState<Map<string, FormScore>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [submissionSummary, setSubmissionSummary] = useState<any>(null);
  const [showCompletionCheck, setShowCompletionCheck] = useState(false);

  // 評価データの読み込み
  useEffect(() => {
    const loadEvaluation = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await evaluationService.getEvaluation(sessionId);
        setEvaluationData(data);

        // 既存のスコアをマップに設定
        const scoreMap = new Map<string, FormScore>();
        data.evaluation.scores.forEach(score => {
          const criterion = findCriterionById(
            data.session.template,
            score.criterionId
          );
          const category = findCategoryByCriterionId(
            data.session.template,
            score.criterionId
          );

          scoreMap.set(score.criterionId, {
            ...score,
            criterionName: criterion?.name,
            categoryName: category?.name,
          });
        });
        setScores(scoreMap);

        // 最初のカテゴリを展開
        if (data.session.template.categories.length > 0) {
          setExpandedCategories(
            new Set([data.session.template.categories[0].id])
          );
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message || '評価データの読み込みに失敗しました'
        );
      } finally {
        setLoading(false);
      }
    };

    loadEvaluation();
  }, [sessionId]);

  // ヘルパー関数
  const findCriterionById = (
    template: EvaluationData['session']['template'],
    criterionId: string
  ) => {
    for (const category of template.categories) {
      const criterion = category.criteria.find(c => c.id === criterionId);
      if (criterion) return criterion;
    }
    return null;
  };

  const findCategoryByCriterionId = (
    template: EvaluationData['session']['template'],
    criterionId: string
  ) => {
    for (const category of template.categories) {
      if (category.criteria.some(c => c.id === criterionId)) {
        return category;
      }
    }
    return null;
  };

  // スコア更新処理
  const handleScoreChange = useCallback(
    async (criterionId: string, score: number, comment?: string) => {
      if (!evaluationData) return;

      const criterion = findCriterionById(
        evaluationData.session.template,
        criterionId
      );
      const category = findCategoryByCriterionId(
        evaluationData.session.template,
        criterionId
      );

      const newScore: FormScore = {
        criterionId,
        score,
        comment: comment || '',
        criterionName: criterion?.name,
        categoryName: category?.name,
      };

      // ローカル状態を更新
      setScores(prev => new Map(prev.set(criterionId, newScore)));

      // 自動保存
      try {
        setSaving(true);
        const scoresArray = Array.from(scores.values()).map(s => ({
          criterionId: s.criterionId,
          score: s.score,
          comment: s.comment,
        }));

        // 新しいスコアを追加
        const updatedScores = scoresArray.filter(
          s => s.criterionId !== criterionId
        );
        updatedScores.push({ criterionId, score, comment: comment || '' });

        await evaluationService.debouncedSaveScores(sessionId, updatedScores);
        setSuccess('評価が自動保存されました');
        setTimeout(() => setSuccess(null), 2000);
      } catch (err: any) {
        setError(err.response?.data?.message || '自動保存に失敗しました');
      } finally {
        setSaving(false);
      }
    },
    [sessionId, scores, evaluationData]
  );

  // カテゴリの展開/折りたたみ
  const handleCategoryToggle = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // 進捗計算
  const getProgress = () => {
    if (!evaluationData)
      return { progressPercentage: 0, completedCriteria: 0, totalCriteria: 0 };
    return evaluationService.calculateProgress(
      evaluationData.evaluation,
      evaluationData.session.template
    );
  };

  // 詳細な完了チェック
  const getDetailedCompletionCheck = () => {
    if (!evaluationData) return null;

    const template = evaluationData.session.template;
    const evaluation = evaluationData.evaluation;
    const scoredCriteriaIds = evaluation.scores.map(score => score.criterionId);

    const categoryChecks = template.categories.map(category => {
      const criteriaChecks = category.criteria.map(criterion => {
        const hasScore = scoredCriteriaIds.includes(criterion.id);
        const score = evaluation.scores.find(
          s => s.criterionId === criterion.id
        );

        return {
          id: criterion.id,
          name: criterion.name,
          hasScore,
          score: score?.score,
          comment: score?.comment,
          isValid: hasScore && score?.score !== undefined,
        };
      });

      const completedCriteria = criteriaChecks.filter(c => c.isValid).length;
      const totalCriteria = criteriaChecks.length;

      return {
        id: category.id,
        name: category.name,
        weight: category.weight,
        criteria: criteriaChecks,
        completedCriteria,
        totalCriteria,
        isComplete: completedCriteria === totalCriteria,
        completionPercentage:
          totalCriteria > 0 ? (completedCriteria / totalCriteria) * 100 : 0,
      };
    });

    const totalCriteria = categoryChecks.reduce(
      (sum, cat) => sum + cat.totalCriteria,
      0
    );
    const completedCriteria = categoryChecks.reduce(
      (sum, cat) => sum + cat.completedCriteria,
      0
    );
    const allComplete = categoryChecks.every(cat => cat.isComplete);

    return {
      categories: categoryChecks,
      totalCriteria,
      completedCriteria,
      allComplete,
      completionPercentage:
        totalCriteria > 0 ? (completedCriteria / totalCriteria) * 100 : 0,
      commentsCount: evaluation.comments.length,
    };
  };

  // 提出前の確認
  const handleSubmitClick = () => {
    const completionCheck = getDetailedCompletionCheck();
    if (!completionCheck?.allComplete) {
      setShowCompletionCheck(true);
      return;
    }
    setShowSubmissionDialog(true);
  };

  // 評価提出
  const handleSubmit = async () => {
    if (!evaluationData) return;

    try {
      setSubmitting(true);
      setError(null);

      const completionCheck = getDetailedCompletionCheck();
      if (!completionCheck?.allComplete) {
        setError('すべての評価項目を入力してください');
        return;
      }

      const result = await evaluationService.submitEvaluation(sessionId);

      // 提出サマリーを生成
      const summary = {
        submittedAt: result.submittedAt,
        totalScores: result.scores.length,
        totalComments: result.comments.length,
        completionCheck,
        sessionName: evaluationData.session.name,
        videoTitle: evaluationData.session.video.title,
      };

      setSubmissionSummary(summary);
      setShowSubmissionDialog(false);
      setSuccess('評価が提出されました');

      if (onEvaluationSubmitted) {
        onEvaluationSubmitted();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '評価の提出に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  // 評価項目のレンダリング
  const renderCriterion = (criterion: any, categoryWeight: number) => {
    const currentScore = scores.get(criterion.id);
    const isCompleted = currentScore !== undefined;

    return (
      <Box key={criterion.id} sx={{ mb: 3 }}>
        <Box display='flex' alignItems='center' gap={1} mb={1}>
          <Typography variant='subtitle1' fontWeight='medium'>
            {criterion.name}
          </Typography>
          {isCompleted && <CheckCircleIcon color='success' fontSize='small' />}
          <Chip
            label={`重み: ${(criterion.weight * categoryWeight * 100).toFixed(0)}%`}
            size='small'
            variant='outlined'
          />
        </Box>

        {criterion.description && (
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            {criterion.description}
          </Typography>
        )}

        {criterion.type === 'numeric' || criterion.type === 'scale' ? (
          <Box>
            <Box display='flex' alignItems='center' gap={2} mb={1}>
              <Typography variant='body2' sx={{ minWidth: 60 }}>
                {criterion.minValue}
              </Typography>
              <Slider
                value={currentScore?.score || criterion.minValue}
                min={criterion.minValue}
                max={criterion.maxValue}
                step={1}
                onChange={(_, value) =>
                  handleScoreChange(
                    criterion.id,
                    value as number,
                    currentScore?.comment
                  )
                }
                valueLabelDisplay='on'
                sx={{ flex: 1 }}
              />
              <Typography variant='body2' sx={{ minWidth: 60 }}>
                {criterion.maxValue}
              </Typography>
            </Box>
            <Typography variant='h6' textAlign='center' color='primary'>
              {currentScore?.score || criterion.minValue} / {criterion.maxValue}
            </Typography>
          </Box>
        ) : criterion.type === 'boolean' ? (
          <FormControl component='fieldset'>
            <RadioGroup
              value={currentScore?.score?.toString() || ''}
              onChange={e =>
                handleScoreChange(
                  criterion.id,
                  parseInt(e.target.value),
                  currentScore?.comment
                )
              }
              row
            >
              <FormControlLabel value='1' control={<Radio />} label='はい' />
              <FormControlLabel value='0' control={<Radio />} label='いいえ' />
            </RadioGroup>
          </FormControl>
        ) : null}

        <TextField
          fullWidth
          multiline
          rows={2}
          label='コメント（任意）'
          value={currentScore?.comment || ''}
          onChange={e =>
            handleScoreChange(
              criterion.id,
              currentScore?.score || criterion.minValue,
              e.target.value
            )
          }
          sx={{ mt: 2 }}
          placeholder='この項目に関するコメントを入力してください'
        />
      </Box>
    );
  };

  if (loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='400px'
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!evaluationData) {
    return <Alert severity='error'>評価データを読み込めませんでした</Alert>;
  }

  const progress = getProgress();
  const isSubmitted = evaluationData.evaluation.submittedAt;

  return (
    <Box>
      {/* ヘッダー情報 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={evaluationData.session.name}
          subheader={`動画: ${evaluationData.session.video.title}`}
        />
        <CardContent>
          {evaluationData.session.description && (
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              {evaluationData.session.description}
            </Typography>
          )}

          {/* 進捗表示 */}
          <Box sx={{ mb: 2 }}>
            <Box
              display='flex'
              justifyContent='space-between'
              alignItems='center'
              mb={1}
            >
              <Typography variant='body2'>
                評価進捗: {progress.completedCriteria} /{' '}
                {progress.totalCriteria} 項目完了
              </Typography>
              <Typography variant='body2' fontWeight='bold'>
                {progress.progressPercentage.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={progress.progressPercentage}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* 提出状態 */}
          {isSubmitted ? (
            <Alert severity='success' icon={<CheckCircleIcon />}>
              評価は {new Date(isSubmitted).toLocaleString('ja-JP')}{' '}
              に提出済みです
            </Alert>
          ) : (
            <Alert severity='info'>
              評価は自動保存されます。すべての項目を入力後、提出してください。
            </Alert>
          )}

          {/* エラー・成功メッセージ */}
          {error && (
            <Alert
              severity='error'
              sx={{ mt: 1 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity='success'
              sx={{ mt: 1 }}
              onClose={() => setSuccess(null)}
            >
              {success}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 評価フォーム */}
      {evaluationData.session.template.categories.map(category => (
        <Accordion
          key={category.id}
          expanded={expandedCategories.has(category.id)}
          onChange={() => handleCategoryToggle(category.id)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display='flex' alignItems='center' gap={2} width='100%'>
              <Typography variant='h6'>{category.name}</Typography>
              <Chip
                label={`重み: ${(category.weight * 100).toFixed(0)}%`}
                size='small'
                color='primary'
                variant='outlined'
              />
              <Box sx={{ ml: 'auto' }}>
                {category.criteria.every(c => scores.has(c.id)) && (
                  <CheckCircleIcon color='success' />
                )}
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {category.description && (
              <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                {category.description}
              </Typography>
            )}

            {category.criteria.map(criterion =>
              renderCriterion(criterion, category.weight)
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* アクションボタン */}
      {!isSubmitted && (
        <Paper sx={{ p: 2, mt: 3, position: 'sticky', bottom: 0, zIndex: 1 }}>
          <Box
            display='flex'
            justifyContent='space-between'
            alignItems='center'
          >
            <Box display='flex' alignItems='center' gap={1}>
              {saving && <CircularProgress size={20} />}
              <Typography variant='body2' color='text.secondary'>
                {saving ? '保存中...' : '自動保存済み'}
              </Typography>
            </Box>

            <Button
              variant='contained'
              size='large'
              startIcon={
                submitting ? <CircularProgress size={20} /> : <SendIcon />
              }
              onClick={handleSubmitClick}
              disabled={submitting}
            >
              {submitting ? '提出中...' : '評価を提出'}
            </Button>
          </Box>

          {progress.progressPercentage < 100 && (
            <Alert severity='warning' sx={{ mt: 2 }}>
              <Typography variant='body2'>
                未入力の項目: {progress.missingCriteria.join(', ')}
              </Typography>
            </Alert>
          )}
        </Paper>
      )}

      {/* 完了チェックダイアログ */}
      <Dialog
        open={showCompletionCheck}
        onClose={() => setShowCompletionCheck(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Box display='flex' alignItems='center' gap={1}>
            <WarningIcon color='warning' />
            評価の完了状況
          </Box>
        </DialogTitle>
        <DialogContent>
          {(() => {
            const completionCheck = getDetailedCompletionCheck();
            if (!completionCheck) return null;

            return (
              <Box>
                <Alert severity='warning' sx={{ mb: 3 }}>
                  すべての評価項目を入力してから提出してください。
                </Alert>

                <Typography variant='h6' gutterBottom>
                  進捗状況: {completionCheck.completedCriteria} /{' '}
                  {completionCheck.totalCriteria} 項目完了
                </Typography>

                <LinearProgress
                  variant='determinate'
                  value={completionCheck.completionPercentage}
                  sx={{ mb: 3, height: 8, borderRadius: 4 }}
                />

                {completionCheck.categories.map(category => (
                  <Accordion
                    key={category.id}
                    defaultExpanded={!category.isComplete}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box
                        display='flex'
                        alignItems='center'
                        gap={2}
                        width='100%'
                      >
                        <Typography variant='subtitle1'>
                          {category.name}
                        </Typography>
                        {category.isComplete ? (
                          <CheckCircleIcon color='success' />
                        ) : (
                          <ErrorIcon color='error' />
                        )}
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          sx={{ ml: 'auto' }}
                        >
                          {category.completedCriteria} /{' '}
                          {category.totalCriteria}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {category.criteria.map(criterion => (
                          <ListItem key={criterion.id}>
                            <ListItemIcon>
                              {criterion.isValid ? (
                                <CheckCircleIcon
                                  color='success'
                                  fontSize='small'
                                />
                              ) : (
                                <ErrorIcon color='error' fontSize='small' />
                              )}
                            </ListItemIcon>
                            <ListItemText
                              primary={criterion.name}
                              secondary={
                                criterion.isValid
                                  ? `スコア: ${criterion.score}${criterion.comment ? ' (コメント付き)' : ''}`
                                  : '未入力'
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCompletionCheck(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 提出確認ダイアログ */}
      <Dialog
        open={showSubmissionDialog}
        onClose={() => setShowSubmissionDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box display='flex' alignItems='center' gap={1}>
            <SendIcon color='primary' />
            評価の提出確認
          </Box>
        </DialogTitle>
        <DialogContent>
          {(() => {
            const completionCheck = getDetailedCompletionCheck();
            if (!completionCheck) return null;

            return (
              <Box>
                <Alert severity='info' sx={{ mb: 3 }}>
                  評価を提出すると、その後は変更できません。内容を確認してください。
                </Alert>

                <Typography variant='h6' gutterBottom>
                  提出内容の確認
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant='body2' color='text.secondary'>
                    セッション: {evaluationData?.session.name}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    動画: {evaluationData?.session.video.title}
                  </Typography>
                </Box>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={4}>
                    <Card variant='outlined'>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <AssignmentIcon
                          color='primary'
                          sx={{ fontSize: 40, mb: 1 }}
                        />
                        <Typography variant='h6'>
                          {completionCheck.completedCriteria}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          評価項目
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card variant='outlined'>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <CommentIcon
                          color='primary'
                          sx={{ fontSize: 40, mb: 1 }}
                        />
                        <Typography variant='h6'>
                          {completionCheck.commentsCount}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          コメント
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card variant='outlined'>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <CheckCircleIcon
                          color='success'
                          sx={{ fontSize: 40, mb: 1 }}
                        />
                        <Typography variant='h6'>
                          {completionCheck.completionPercentage.toFixed(0)}%
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          完了率
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Typography variant='body2' color='text.secondary'>
                  提出後は評価内容の変更はできません。よろしいですか？
                </Typography>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmissionDialog(false)}>
            キャンセル
          </Button>
          <Button
            variant='contained'
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={
              submitting ? <CircularProgress size={20} /> : <SendIcon />
            }
          >
            {submitting ? '提出中...' : '提出する'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提出完了サマリーダイアログ */}
      <Dialog
        open={!!submissionSummary}
        onClose={() => setSubmissionSummary(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box display='flex' alignItems='center' gap={1}>
            <CheckCircleIcon color='success' />
            評価提出完了
          </Box>
        </DialogTitle>
        <DialogContent>
          {submissionSummary && (
            <Box>
              <Alert severity='success' sx={{ mb: 3 }}>
                評価が正常に提出されました。ありがとうございました。
              </Alert>

              <Typography variant='h6' gutterBottom>
                提出サマリー
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant='body2' color='text.secondary'>
                  セッション: {submissionSummary.sessionName}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  動画: {submissionSummary.videoTitle}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  提出日時:{' '}
                  {new Date(submissionSummary.submittedAt).toLocaleString(
                    'ja-JP'
                  )}
                </Typography>
              </Box>

              <Stepper orientation='vertical'>
                <Step completed>
                  <StepLabel>
                    <Typography variant='body1'>評価項目の入力</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant='body2' color='text.secondary'>
                      {submissionSummary.totalScores} 項目の評価を完了しました
                    </Typography>
                  </StepContent>
                </Step>

                <Step completed>
                  <StepLabel>
                    <Typography variant='body1'>コメントの追加</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant='body2' color='text.secondary'>
                      {submissionSummary.totalComments}{' '}
                      件のコメントを追加しました
                    </Typography>
                  </StepContent>
                </Step>

                <Step completed>
                  <StepLabel>
                    <Typography variant='body1'>評価の提出</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant='body2' color='text.secondary'>
                      評価が正常に提出され、システムに保存されました
                    </Typography>
                  </StepContent>
                </Step>
              </Stepper>

              <Alert severity='info' sx={{ mt: 3 }}>
                提出された評価は変更できません。評価結果は管理者によって集計され、
                適切なタイミングで共有されます。
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='contained'
            onClick={() => setSubmissionSummary(null)}
          >
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EvaluationForm;
