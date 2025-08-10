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
  Settings as SettingsIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { templateService, Template } from '../../services/templateService';

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
  const { user, hasAnyRole } = useAuth();
  const [templates, setTemplates] = useState<TemplateDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TemplateDisplay | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDisplay | null>(null);

  // APIデータを表示用に変換
  const convertToDisplayTemplate = (template: any): TemplateDisplay => {
    const categoryCount = template.categories?.length || 0;
    const criteriaCount = template.categories?.reduce((total: number, cat: any) => total + (cat.criteria?.length || 0), 0) || 0;
    
    return {
      id: template._id || template.id,
      name: template.name || 'Untitled',
      description: template.description || '',
      isDefault: template.isDefault || false,
      isPublic: template.isPublic !== false, // デフォルトはtrue
      categoryCount,
      criteriaCount,
      usageCount: template.usageCount || 0,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt || template.createdAt,
      creatorName: template.creatorId?.username || template.creatorId?.displayName || 'Unknown',
      creatorAvatar: template.creatorId?.avatar,
      tags: template.tags || [],
    };
  };

  // テンプレート一覧の取得
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('Fetching templates...');
      const apiTemplates = await templateService.getTemplates();
      console.log('Templates loaded:', apiTemplates);
      
      const displayTemplates = apiTemplates.map(convertToDisplayTemplate);
      setTemplates(displayTemplates);
    } catch (error: any) {
      console.error('Template fetch error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'テンプレート一覧の取得に失敗しました';
      setError(errorMessage);
      
      // エラー時はモックデータを使用
      const mockTemplates: TemplateDisplay[] = [
        {
          id: '1',
          name: '本祭評価テンプレート',
          description: '本祭での演舞評価用の標準テンプレート。技術面、表現力、構成などを総合的に評価します。',
          isDefault: true,
          isPublic: true,
          categoryCount: 4,
          criteriaCount: 12,
          usageCount: 25,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-07-20T14:30:00Z',
          creatorName: 'システム管理者',
          tags: ['本祭', '標準', '総合評価'],
        },
        {
          id: '2',
          name: '地方車評価テンプレート',
          description: '地方車での演舞パフォーマンスを評価するためのテンプレート。',
          isDefault: false,
          isPublic: true,
          categoryCount: 3,
          criteriaCount: 8,
          usageCount: 12,
          createdAt: '2024-02-10T09:30:00Z',
          updatedAt: '2024-06-15T16:45:00Z',
          creatorName: '田中審査員',
          tags: ['地方車', 'パフォーマンス'],
        },
        {
          id: '3',
          name: '新人チーム評価テンプレート',
          description: '新人チームの演舞技術向上のための評価テンプレート。基礎技術に重点を置いています。',
          isDefault: false,
          isPublic: true,
          categoryCount: 5,
          criteriaCount: 15,
          usageCount: 8,
          createdAt: '2024-03-05T11:15:00Z',
          updatedAt: '2024-07-10T13:20:00Z',
          creatorName: '佐藤指導者',
          tags: ['新人', '基礎技術', '指導'],
        },
        {
          id: '4',
          name: 'カスタム評価テンプレート',
          description: '特定のイベント用にカスタマイズされた評価テンプレート。',
          isDefault: false,
          isPublic: false,
          categoryCount: 6,
          criteriaCount: 18,
          usageCount: 3,
          createdAt: '2024-07-01T15:45:00Z',
          updatedAt: '2024-07-25T10:30:00Z',
          creatorName: user?.profile?.displayName || user?.username || 'あなた',
          tags: ['カスタム', 'イベント'],
        },
      ];
      setTemplates(mockTemplates);
    } finally {
      setIsLoading(false);
    }
  };

  // メニューの制御
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: TemplateDisplay) => {
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

    try {
      // TODO: API呼び出し
      // await apiClient.delete(`/api/templates/${templateToDelete.id}`);
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error: any) {
      setError('テンプレートの削除に失敗しました');
    }
  };

  // テンプレート複製
  const handleDuplicate = async (template: TemplateDisplay) => {
    try {
      // TODO: API呼び出し
      // const response = await apiClient.post(`/api/templates/${template.id}/duplicate`);
      // const newTemplate = response.data;
      
      // モック処理
      const newTemplate: TemplateDisplay = {
        ...template,
        id: `${template.id}_copy_${Date.now()}`,
        name: `${template.name} のコピー`,
        isDefault: false,
        isPublic: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creatorName: user?.profile?.displayName || user?.username || 'あなた',
      };
      
      setTemplates(prev => [newTemplate, ...prev]);
      handleMenuClose();
    } catch (error: any) {
      setError('テンプレートの複製に失敗しました');
    }
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

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          テンプレート一覧を読み込み中...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">評価テンプレート管理</Typography>
        {canCreateTemplate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/templates/create')}
          >
            新規テンプレート作成
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* テンプレート一覧 */}
      <Grid container spacing={3}>
        {templates.map((template) => (
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
                  <Tooltip title="デフォルトテンプレート">
                    <StarIcon sx={{ color: 'warning.main' }} />
                  </Tooltip>
                </Box>
              )}

              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                {/* ヘッダー */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={template.isPublic ? '公開' : '非公開'}
                      color={template.isPublic ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  {canCreateTemplate && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, template)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                </Box>

                {/* テンプレート名と説明 */}
                <Typography variant="h6" gutterBottom noWrap>
                  {template.name}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
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
                    <Typography variant="h6" color="primary">
                      {template.categoryCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      カテゴリ
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary">
                      {template.criteriaCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      評価項目
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary">
                      {template.usageCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      使用回数
                    </Typography>
                  </Box>
                </Box>

                {/* タグ */}
                {template.tags.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {template.tags.slice(0, 3).map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                    {template.tags.length > 3 && (
                      <Chip
                        label={`+${template.tags.length - 3}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                )}

                {/* 作成者と日付 */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      src={template.creatorAvatar}
                      sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                    >
                      {template.creatorName[0]}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary">
                      {template.creatorName}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(template.updatedAt)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {templates.length === 0 && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SettingsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            評価テンプレートがありません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            新しい評価テンプレートを作成して、評価基準を設定しましょう。
          </Typography>
          {canCreateTemplate && (
            <Button
              variant="contained"
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
        <MenuItem onClick={() => {
          navigate(`/templates/${selectedTemplate?.id}`);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <VisibilityIcon />
          </ListItemIcon>
          <ListItemText primary="詳細表示" />
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/templates/${selectedTemplate?.id}/edit`);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText primary="編集" />
        </MenuItem>
        <MenuItem onClick={() => selectedTemplate && handleDuplicate(selectedTemplate)}>
          <ListItemIcon>
            <CopyIcon />
          </ListItemIcon>
          <ListItemText primary="複製" />
        </MenuItem>
        {selectedTemplate && !selectedTemplate.isDefault && (
          <MenuItem onClick={() => selectedTemplate && handleDeleteClick(selectedTemplate)}>
            <ListItemIcon>
              <DeleteIcon />
            </ListItemIcon>
            <ListItemText primary="削除" />
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
            <Alert severity="warning" sx={{ mt: 2 }}>
              このテンプレートは{templateToDelete.usageCount}回使用されています。
              削除すると関連するセッションに影響する可能性があります。
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateList;