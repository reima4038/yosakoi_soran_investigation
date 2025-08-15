import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Settings as SettingsIcon,
  Star as StarIcon,
  Public as PublicIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { Template } from '../../services/templateService';
import { useTemplateOperations } from '../../hooks/useTemplateOperations';
import { OperationFeedback } from '../common';

// テンプレート表示用の型定義
interface TemplateDisplay {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isPublic: boolean;
  categoryCount: number;
  criteriaCount: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  creatorName: string;
  creatorAvatar?: string;
  tags: string[];
}

const TemplateList: React.FC = () => {
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();
  const [templates, setTemplates] = useState<TemplateDisplay[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] =
    useState<TemplateDisplay | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateDisplay | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  const {
    operationState,
    clearMessages,
    deleteTemplate,
    duplicateTemplate,
    toggleVisibility,
    getTemplates,
  } = useTemplateOperations();

  // APIデータを表示用に変換
  const convertToDisplayTemplate = (template: Template): TemplateDisplay => {
    const categoryCount = template.categories?.length || 0;
    const criteriaCount =
      template.categories?.reduce(
        (total: number, cat: any) => total + (cat.criteria?.length || 0),
        0
      ) || 0;

    return {
      id: template.id,
      name: template.name || 'Untitled',
      description: template.description || '',
      isDefault: false, // APIから取得する場合はデフォルトテンプレートの概念はない
      isPublic: template.isPublic,
      categoryCount,
      criteriaCount,
      usageCount: 0, // 使用回数はAPIから取得していない
      createdAt: template.createdAt,
      updatedAt: template.updatedAt || template.createdAt,
      creatorName:
        typeof template.creatorId === 'string'
          ? 'Unknown'
          : (template.creatorId as any)?.username || 'Unknown',
      creatorAvatar:
        typeof template.creatorId === 'string'
          ? undefined
          : (template.creatorId as any)?.avatar,
      tags: [], // タグはAPIから取得していない
    };
  };

  // テンプレート一覧の取得
  const fetchTemplates = useCallback(async () => {
    const apiTemplates = await getTemplates();
    const displayTemplates = apiTemplates.map(convertToDisplayTemplate);
    setTemplates(displayTemplates);
  }, [getTemplates]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // メニューの制御
  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    template: TemplateDisplay
  ) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedTemplate(null);
  };

  // テンプレート削除の確認
  const handleDeleteClick = (template: TemplateDisplay) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  // テンプレート削除の実行
  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    const success = await deleteTemplate(templateToDelete.id);
    if (success) {
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  // テンプレート複製
  const handleDuplicate = async (template: TemplateDisplay) => {
    const duplicatedTemplate = await duplicateTemplate(template.id);
    if (duplicatedTemplate) {
      const newDisplayTemplate = convertToDisplayTemplate(duplicatedTemplate);
      setTemplates(prev => [newDisplayTemplate, ...prev]);
      handleMenuClose();
    }
  };

  // 可視性切り替え
  const handleToggleVisibility = async (template: TemplateDisplay) => {
    setIsToggling(template.id);

    const updatedTemplate = await toggleVisibility(
      template.id,
      !template.isPublic
    );
    if (updatedTemplate) {
      const updatedDisplayTemplate = convertToDisplayTemplate(updatedTemplate);
      setTemplates(prev =>
        prev.map(t => (t.id === template.id ? updatedDisplayTemplate : t))
      );
      handleMenuClose();
    }

    setIsToggling(null);
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // テンプレート作成権限の確認
  const canCreateTemplate = hasAnyRole([UserRole.ADMIN, UserRole.EVALUATOR]);

  if (operationState.isLoading && templates.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography variant='h4'>評価テンプレート管理</Typography>
          {canCreateTemplate && (
            <Button variant='contained' startIcon={<AddIcon />} disabled>
              新規テンプレート作成
            </Button>
          )}
        </Box>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography
          variant='body2'
          sx={{ textAlign: 'center', color: 'text.secondary' }}
        >
          テンプレート一覧を読み込み中...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant='h4'>評価テンプレート管理</Typography>
        {canCreateTemplate && (
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => navigate('/templates/create')}
          >
            新規テンプレート作成
          </Button>
        )}
      </Box>

      <OperationFeedback
        isLoading={operationState.isLoading && templates.length > 0}
        error={operationState.error}
        success={operationState.success}
        onRetry={fetchTemplates}
        onClearMessages={clearMessages}
        loadingMessage='処理中...'
        showAsSnackbar={true}
      />

      {/* テンプレート一覧 */}
      <Grid container spacing={3}>
        {templates.map(template => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': {
                  boxShadow: 4,
                },
                cursor: 'pointer',
                position: 'relative',
              }}
              onClick={() => navigate(`/templates/${template.id}`)}
            >
              {/* デフォルトテンプレートのマーク */}
              {template.isDefault && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 1,
                  }}
                >
                  <Tooltip title='デフォルトテンプレート'>
                    <StarIcon sx={{ color: 'warning.main' }} />
                  </Tooltip>
                </Box>
              )}

              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                {/* ヘッダー */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      icon={template.isPublic ? <PublicIcon /> : <LockIcon />}
                      label={template.isPublic ? '公開' : '非公開'}
                      color={template.isPublic ? 'success' : 'default'}
                      size='small'
                      variant={template.isPublic ? 'filled' : 'outlined'}
                    />
                  </Box>
                  {canCreateTemplate && (
                    <IconButton
                      size='small'
                      onClick={e => handleMenuOpen(e, template)}
                      disabled={isToggling === template.id}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                </Box>

                {/* テンプレート名と説明 */}
                <Typography variant='h6' gutterBottom noWrap>
                  {template.name}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '3.6em',
                  }}
                >
                  {template.description}
                </Typography>

                {/* 統計情報 */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h6' color='primary'>
                      {template.categoryCount}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      カテゴリ
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h6' color='primary'>
                      {template.criteriaCount}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      評価項目
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h6' color='primary'>
                      {template.usageCount}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      使用回数
                    </Typography>
                  </Box>
                </Box>

                {/* タグ */}
                {template.tags.length > 0 && (
                  <Box
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}
                  >
                    {template.tags.slice(0, 3).map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                    {template.tags.length > 3 && (
                      <Chip
                        label={`+${template.tags.length - 3}`}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                )}

                {/* 作成者と日付 */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      src={template.creatorAvatar}
                      sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                    >
                      {template.creatorName[0]}
                    </Avatar>
                    <Typography variant='caption' color='text.secondary'>
                      {template.creatorName}
                    </Typography>
                  </Box>
                  <Typography variant='caption' color='text.secondary'>
                    {formatDate(template.updatedAt)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {templates.length === 0 && !operationState.isLoading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SettingsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant='h6' color='text.secondary' gutterBottom>
            評価テンプレートがありません
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
            新しい評価テンプレートを作成して、評価基準を設定しましょう。
          </Typography>
          {canCreateTemplate && (
            <Button
              variant='contained'
              startIcon={<AddIcon />}
              onClick={() => navigate('/templates/create')}
            >
              最初のテンプレートを作成
            </Button>
          )}
        </Box>
      )}

      {/* テンプレートメニュー */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            navigate(`/templates/${selectedTemplate?.id}`);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <VisibilityIcon />
          </ListItemIcon>
          <ListItemText primary='詳細表示' />
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate(`/templates/${selectedTemplate?.id}/edit`);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText primary='編集' />
        </MenuItem>
        <MenuItem
          onClick={() => selectedTemplate && handleDuplicate(selectedTemplate)}
        >
          <ListItemIcon>
            <CopyIcon />
          </ListItemIcon>
          <ListItemText primary='複製' />
        </MenuItem>
        <MenuItem
          onClick={() =>
            selectedTemplate && handleToggleVisibility(selectedTemplate)
          }
          disabled={isToggling === selectedTemplate?.id}
        >
          <ListItemIcon>
            {selectedTemplate?.isPublic ? (
              <VisibilityOffIcon />
            ) : (
              <VisibilityIcon />
            )}
          </ListItemIcon>
          <ListItemText
            primary={selectedTemplate?.isPublic ? '非公開にする' : '公開する'}
          />
        </MenuItem>
        {selectedTemplate && !selectedTemplate.isDefault && (
          <MenuItem
            onClick={() =>
              selectedTemplate && handleDeleteClick(selectedTemplate)
            }
          >
            <ListItemIcon>
              <DeleteIcon />
            </ListItemIcon>
            <ListItemText primary='削除' />
          </MenuItem>
        )}
      </Menu>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>テンプレートの削除</DialogTitle>
        <DialogContent>
          <Typography>
            「{templateToDelete?.name}」を削除しますか？
            この操作は取り消すことができません。
          </Typography>
          {templateToDelete && templateToDelete.usageCount > 0 && (
            <Alert severity='warning' sx={{ mt: 2 }}>
              このテンプレートは{templateToDelete.usageCount}
              回使用されています。
              削除すると関連するセッションに影響する可能性があります。
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleDeleteConfirm}
            color='error'
            variant='contained'
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateList;
