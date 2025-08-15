import { useState, useCallback } from 'react';
import { templateService, Template } from '../services/templateService';

export interface OperationState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

export interface UseTemplateOperationsReturn {
  operationState: OperationState;
  clearMessages: () => void;
  createTemplate: (templateData: any) => Promise<Template | null>;
  updateTemplate: (id: string, templateData: any) => Promise<Template | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  duplicateTemplate: (id: string) => Promise<Template | null>;
  toggleVisibility: (id: string, isPublic: boolean) => Promise<Template | null>;
  getTemplate: (id: string) => Promise<Template | null>;
  getTemplates: () => Promise<Template[]>;
}

export const useTemplateOperations = (): UseTemplateOperationsReturn => {
  const [operationState, setOperationState] = useState<OperationState>({
    isLoading: false,
    error: null,
    success: null,
  });

  const clearMessages = useCallback(() => {
    setOperationState(prev => ({
      ...prev,
      error: null,
      success: null,
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setOperationState(prev => ({
      ...prev,
      isLoading: loading,
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setOperationState(prev => ({
      ...prev,
      isLoading: false,
      error,
      success: null,
    }));
  }, []);

  const setSuccess = useCallback((success: string) => {
    setOperationState(prev => ({
      ...prev,
      isLoading: false,
      error: null,
      success,
    }));
  }, []);

  const createTemplate = useCallback(async (templateData: any): Promise<Template | null> => {
    try {
      setLoading(true);
      clearMessages();
      
      console.log('Creating template:', templateData);
      const result = await templateService.createTemplate(templateData);
      console.log('Template created successfully:', result);
      
      setSuccess('テンプレートが正常に作成されました');
      return result;
    } catch (error: any) {
      console.error('Template creation error:', error);
      setError(error.message || 'テンプレートの作成に失敗しました');
      return null;
    }
  }, [setLoading, clearMessages, setError, setSuccess]);

  const updateTemplate = useCallback(async (id: string, templateData: any): Promise<Template | null> => {
    try {
      setLoading(true);
      clearMessages();
      
      console.log('Updating template:', id, templateData);
      const result = await templateService.updateTemplate(id, templateData);
      console.log('Template updated successfully:', result);
      
      setSuccess('テンプレートが正常に更新されました');
      return result;
    } catch (error: any) {
      console.error('Template update error:', error);
      setError(error.message || 'テンプレートの更新に失敗しました');
      return null;
    }
  }, [setLoading, clearMessages, setError, setSuccess]);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      clearMessages();
      
      console.log('Deleting template:', id);
      await templateService.deleteTemplate(id);
      console.log('Template deleted successfully');
      
      setSuccess('テンプレートが正常に削除されました');
      return true;
    } catch (error: any) {
      console.error('Template deletion error:', error);
      setError(error.message || 'テンプレートの削除に失敗しました');
      return false;
    }
  }, [setLoading, clearMessages, setError, setSuccess]);

  const duplicateTemplate = useCallback(async (id: string): Promise<Template | null> => {
    try {
      setLoading(true);
      clearMessages();
      
      console.log('Duplicating template:', id);
      const result = await templateService.duplicateTemplate(id);
      console.log('Template duplicated successfully:', result);
      
      setSuccess('テンプレートが正常に複製されました');
      return result;
    } catch (error: any) {
      console.error('Template duplication error:', error);
      setError(error.message || 'テンプレートの複製に失敗しました');
      return null;
    }
  }, [setLoading, clearMessages, setError, setSuccess]);

  const toggleVisibility = useCallback(async (id: string, isPublic: boolean): Promise<Template | null> => {
    try {
      setLoading(true);
      clearMessages();
      
      console.log('Toggling template visibility:', id, 'to:', isPublic);
      const result = await templateService.toggleTemplateVisibility(id, isPublic);
      console.log('Template visibility updated successfully:', result);
      
      setSuccess(`テンプレートが${isPublic ? '公開' : '非公開'}に設定されました`);
      return result;
    } catch (error: any) {
      console.error('Template visibility toggle error:', error);
      setError(error.message || 'テンプレートの可視性変更に失敗しました');
      return null;
    }
  }, [setLoading, clearMessages, setError, setSuccess]);

  const getTemplate = useCallback(async (id: string): Promise<Template | null> => {
    try {
      setLoading(true);
      clearMessages();
      
      console.log('Fetching template:', id);
      const result = await templateService.getTemplate(id);
      console.log('Template fetched successfully:', result);
      
      setOperationState(prev => ({ ...prev, isLoading: false }));
      return result;
    } catch (error: any) {
      console.error('Template fetch error:', error);
      setError(error.message || 'テンプレートの取得に失敗しました');
      return null;
    }
  }, [setLoading, clearMessages, setError]);

  const getTemplates = useCallback(async (): Promise<Template[]> => {
    try {
      setLoading(true);
      clearMessages();
      
      console.log('Fetching templates');
      const result = await templateService.getTemplates();
      console.log('Templates fetched successfully:', result);
      
      setOperationState(prev => ({ ...prev, isLoading: false }));
      return result;
    } catch (error: any) {
      console.error('Templates fetch error:', error);
      setError(error.message || 'テンプレート一覧の取得に失敗しました');
      return [];
    }
  }, [setLoading, clearMessages, setError]);

  return {
    operationState,
    clearMessages,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    toggleVisibility,
    getTemplate,
    getTemplates,
  };
};