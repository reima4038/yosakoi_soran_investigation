import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as FileCopyIcon,
  MoreVert as MoreVertIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
  GetApp as GetAppIcon,
} from '@mui/icons-material';
import { Template, templateService } from '../../services/templateService';
import TemplateCreationForm from './TemplateCreationForm';

const TemplateManagement: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ダイアログ状態
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(
    null
  );

  // メニュー状態
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );

  // インポート状態
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  // テンプレート一覧の取得
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const fetchedTemplates = await templateService.getTemplates();
      setTemplates(fetchedTemplates);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'テンプレート一覧の取得に失敗しました'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // テンプレート作成/更新の処理
  const handleSaveTemplate = async (template: Template) => {
    try {
      if (editingTemplate) {
        // 更新
        const updatedTemplate = await templateService.updateTemplate(
          editingTemplate.id!,
          {
            name: template.name,
            description: template.description,
            categories: template.categories,
          }
        );
        setTemplates(prev =>
          prev.map(t => (t.id === updatedTemplate.id ? updatedTemplate : t))
        );
        setSuccess('テンプレートが正常に更新されました');
      } else {
        // 新規作成
        const newTemplate = await templateService.createTemplate({
          name: template.name,
          description: template.description,
          categories: template.categories,
        });
        setTemplates(prev => [newTemplate, ...prev]);
        setSuccess('テンプレートが正常に作成されました');
      }

      setCreateDialogOpen(false);
      setEditingTemplate(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'テンプレートの保存に失敗しました'
      );
    }
  };

  // テンプレート削除の処理
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      await templateService.deleteTemplate(templateToDelete.id!);
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      setSuccess('テンプレートが正常に削除されました');
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'テンプレートの削除に失敗しました'
      );
    }
  };

  // テンプレート複製の処理
  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const duplicatedTemplate = await templateService.duplicateTemplate(
        template.id!
      );
      setTemplates(prev => [duplicatedTemplate, ...prev]);
      setSuccess('テンプレートが正常に複製されました');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'テンプレートの複製に失敗しました'
      );
    }
  };

  // メニューを開く
  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    template: Template
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedTemplate(template);
  };

  // メニューを閉じる
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTemplate(null);
  };

  // 編集ダイアログを開く
  const handleEditClick = () => {
    if (selectedTemplate) {
      setEditingTemplate(selectedTemplate);
      setCreateDialogOpen(true);
    }
    handleMenuClose();
  };

  // 削除確認ダイアログを開く
  const handleDeleteClick = () => {
    if (selectedTemplate) {
      setTemplateToDelete(selectedTemplate);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  // 複製処理
  const handleDuplicateClick = () => {
    if (selectedTemplate) {
      handleDuplicateTemplate(selectedTemplate);
    }
    handleMenuClose();
  };

  // エクスポート処理
  const handleExportClick = () => {
    if (selectedTemplate) {
      templateService.exportTemplate(selectedTemplate);
      setSuccess('テンプレートをエクスポートしました');
    }
    handleMenuClose();
  };

  // 複数テンプレートエクスポート処理
  const handleExportSelected = () => {
    const templatesToExport = templates.filter(t =>
      selectedTemplates.includes(t.id!)
    );
    if (templatesToExport.length > 0) {
      templateService.exportMultipleTemplates(templatesToExport);
      setSuccess(
        `${templatesToExport.length}個のテンプレートをエクスポートしました`
      );
      setSelectedTemplates([]);
    }
  };

  // インポート処理
  const handleImportTemplate = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedTemplate = await templateService.importTemplate(file);
      const newTemplate =
        await templateService.createTemplate(importedTemplate);
      setTemplates(prev => [newTemplate, ...prev]);
      setSuccess('テンプレートをインポートしました');
      setImportDialogOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'テンプレートのインポートに失敗しました'
      );
    }

    // ファイル入力をリセット
    event.target.value = '';
  };

  // テンプレート選択の切り替え
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  // 全選択/全解除
  const handleSelectAll = () => {
    if (selectedTemplates.length === templates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(templates.map(t => t.id!));
    }
  };

  // 新規作成ダイアログを開く
  const handleCreateNew = () => {
    setEditingTemplate(null);
    setCreateDialogOpen(true);
  };

  // ダイアログをキャンセル
  const handleDialogCancel = () => {
    setCreateDialogOpen(false);
    setEditingTemplate(null);
  };

  // カテゴリ数の計算
  const getCategoryCount = (template: Template): number => {
    return template.categories.length;
  };

  // 評価基準数の計算
  const getCriterionCount = (template: Template): number => {
    return template.categories.reduce(
      (total, category) => total + category.criteria.length,
      0
    );
  };

  // 作成日のフォーマット
  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 400,
        }}
      >
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant='h4'>評価テンプレート管理</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<FileUploadIcon />}
            onClick={() => setImportDialogOpen(true)}
            variant='outlined'
          >
            インポート
          </Button>
          {selectedTemplates.length > 0 && (
            <Button
              startIcon={<GetAppIcon />}
              onClick={handleExportSelected}
              variant='outlined'
              color='secondary'
            >
              選択をエクスポート ({selectedTemplates.length})
            </Button>
          )}
          <Button
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            variant='contained'
            color='primary'
          >
            新規作成
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding='checkbox'>
                <Checkbox
                  indeterminate={
                    selectedTemplates.length > 0 &&
                    selectedTemplates.length < templates.length
                  }
                  checked={
                    templates.length > 0 &&
                    selectedTemplates.length === templates.length
                  }
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>テンプレート名</TableCell>
              <TableCell>説明</TableCell>
              <TableCell align='center'>カテゴリ数</TableCell>
              <TableCell align='center'>評価基準数</TableCell>
              <TableCell>作成者</TableCell>
              <TableCell>作成日</TableCell>
              <TableCell align='center'>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align='center'>
                  <Typography color='text.secondary'>
                    テンプレートがありません。新規作成してください。
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              templates.map(template => (
                <TableRow key={template.id} hover>
                  <TableCell padding='checkbox'>
                    <Checkbox
                      checked={selectedTemplates.includes(template.id!)}
                      onChange={() => handleTemplateSelect(template.id!)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant='subtitle2'>{template.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' color='text.secondary'>
                      {template.description.length > 100
                        ? `${template.description.substring(0, 100)}...`
                        : template.description}
                    </Typography>
                  </TableCell>
                  <TableCell align='center'>
                    <Chip label={getCategoryCount(template)} size='small' />
                  </TableCell>
                  <TableCell align='center'>
                    <Chip
                      label={getCriterionCount(template)}
                      size='small'
                      color='primary'
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>
                      {template.creatorId || 'Unknown'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>
                      {template.createdAt
                        ? formatDate(template.createdAt)
                        : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align='center'>
                    <Tooltip title='操作メニュー'>
                      <IconButton
                        onClick={e => handleMenuOpen(e, template)}
                        size='small'
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 操作メニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <EditIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>編集</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicateClick}>
          <ListItemIcon>
            <FileCopyIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>複製</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExportClick}>
          <ListItemIcon>
            <FileDownloadIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>エクスポート</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>削除</ListItemText>
        </MenuItem>
      </Menu>

      {/* 作成/編集ダイアログ */}
      <Dialog
        open={createDialogOpen}
        onClose={handleDialogCancel}
        maxWidth='lg'
        fullWidth
        PaperProps={{
          sx: { height: '90vh' },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <TemplateCreationForm
            initialTemplate={editingTemplate || undefined}
            onSave={handleSaveTemplate}
            onCancel={handleDialogCancel}
          />
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>テンプレートの削除</DialogTitle>
        <DialogContent>
          <Typography>
            「{templateToDelete?.name}」を削除してもよろしいですか？
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
            この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleDeleteTemplate}
            color='error'
            variant='contained'
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>

      {/* インポートダイアログ */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>テンプレートのインポート</DialogTitle>
        <DialogContent>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            JSONファイルからテンプレートをインポートできます。
          </Typography>
          <input
            accept='.json'
            style={{ display: 'none' }}
            id='import-file-input'
            type='file'
            onChange={handleImportTemplate}
          />
          <label htmlFor='import-file-input'>
            <Button
              variant='outlined'
              component='span'
              startIcon={<FileUploadIcon />}
              fullWidth
              sx={{ mt: 1 }}
            >
              ファイルを選択
            </Button>
          </label>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>キャンセル</Button>
        </DialogActions>
      </Dialog>

      {/* 成功メッセージ */}
      <Snackbar
        open={Boolean(success)}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert onClose={() => setSuccess(null)} severity='success'>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TemplateManagement;
