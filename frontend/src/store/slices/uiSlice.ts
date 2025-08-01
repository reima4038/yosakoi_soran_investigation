import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// UI状態の型定義
interface UIState {
  // ローディング状態
  loading: {
    global: boolean;
    [key: string]: boolean;
  };
  
  // エラー状態
  errors: {
    global: string | null;
    [key: string]: string | null;
  };
  
  // 通知・スナックバー
  snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
    autoHideDuration?: number;
  };
  
  // モーダル・ダイアログ状態
  modals: {
    [key: string]: boolean;
  };
  
  // サイドバー・ナビゲーション状態
  navigation: {
    sidebarOpen: boolean;
    mobileMenuOpen: boolean;
  };
  
  // テーマ設定
  theme: {
    mode: 'light' | 'dark';
    primaryColor: string;
  };
  
  // フィルター・検索状態
  filters: {
    [key: string]: any;
  };
  
  // ページネーション状態
  pagination: {
    [key: string]: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

// 初期状態
const initialState: UIState = {
  loading: {
    global: false,
  },
  errors: {
    global: null,
  },
  snackbar: {
    open: false,
    message: '',
    severity: 'info',
    autoHideDuration: 6000,
  },
  modals: {},
  navigation: {
    sidebarOpen: false,
    mobileMenuOpen: false,
  },
  theme: {
    mode: 'light',
    primaryColor: '#1976d2',
  },
  filters: {},
  pagination: {},
};

// UIスライス
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // ローディング状態の管理
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      const { key, loading } = action.payload;
      state.loading[key] = loading;
    },
    
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    
    // エラー状態の管理
    setError: (state, action: PayloadAction<{ key: string; error: string | null }>) => {
      const { key, error } = action.payload;
      state.errors[key] = error;
    },
    
    setGlobalError: (state, action: PayloadAction<string | null>) => {
      state.errors.global = action.payload;
    },
    
    clearError: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      state.errors[key] = null;
    },
    
    clearAllErrors: (state) => {
      state.errors = { global: null };
    },
    
    // スナックバーの管理
    showSnackbar: (state, action: PayloadAction<{
      message: string;
      severity?: 'success' | 'error' | 'warning' | 'info';
      autoHideDuration?: number;
    }>) => {
      const { message, severity = 'info', autoHideDuration = 6000 } = action.payload;
      state.snackbar = {
        open: true,
        message,
        severity,
        autoHideDuration,
      };
    },
    
    hideSnackbar: (state) => {
      state.snackbar.open = false;
    },
    
    // モーダル・ダイアログの管理
    openModal: (state, action: PayloadAction<string>) => {
      const modalKey = action.payload;
      state.modals[modalKey] = true;
    },
    
    closeModal: (state, action: PayloadAction<string>) => {
      const modalKey = action.payload;
      state.modals[modalKey] = false;
    },
    
    toggleModal: (state, action: PayloadAction<string>) => {
      const modalKey = action.payload;
      state.modals[modalKey] = !state.modals[modalKey];
    },
    
    // ナビゲーション状態の管理
    toggleSidebar: (state) => {
      state.navigation.sidebarOpen = !state.navigation.sidebarOpen;
    },
    
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.navigation.sidebarOpen = action.payload;
    },
    
    toggleMobileMenu: (state) => {
      state.navigation.mobileMenuOpen = !state.navigation.mobileMenuOpen;
    },
    
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.navigation.mobileMenuOpen = action.payload;
    },
    
    // テーマ設定の管理
    setThemeMode: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme.mode = action.payload;
      // ローカルストレージに保存
      localStorage.setItem('themeMode', action.payload);
    },
    
    setPrimaryColor: (state, action: PayloadAction<string>) => {
      state.theme.primaryColor = action.payload;
      localStorage.setItem('primaryColor', action.payload);
    },
    
    // フィルター状態の管理
    setFilter: (state, action: PayloadAction<{ key: string; value: any }>) => {
      const { key, value } = action.payload;
      state.filters[key] = value;
    },
    
    clearFilter: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      delete state.filters[key];
    },
    
    clearAllFilters: (state) => {
      state.filters = {};
    },
    
    // ページネーション状態の管理
    setPagination: (state, action: PayloadAction<{
      key: string;
      page?: number;
      limit?: number;
      total?: number;
    }>) => {
      const { key, page, limit, total } = action.payload;
      if (!state.pagination[key]) {
        state.pagination[key] = { page: 1, limit: 10, total: 0 };
      }
      if (page !== undefined) state.pagination[key].page = page;
      if (limit !== undefined) state.pagination[key].limit = limit;
      if (total !== undefined) state.pagination[key].total = total;
    },
    
    // 初期化時にローカルストレージから設定を復元
    initializeFromStorage: (state) => {
      const savedThemeMode = localStorage.getItem('themeMode') as 'light' | 'dark' | null;
      const savedPrimaryColor = localStorage.getItem('primaryColor');
      
      if (savedThemeMode) {
        state.theme.mode = savedThemeMode;
      }
      if (savedPrimaryColor) {
        state.theme.primaryColor = savedPrimaryColor;
      }
    },
  },
});

// アクションのエクスポート
export const {
  setLoading,
  setGlobalLoading,
  setError,
  setGlobalError,
  clearError,
  clearAllErrors,
  showSnackbar,
  hideSnackbar,
  openModal,
  closeModal,
  toggleModal,
  toggleSidebar,
  setSidebarOpen,
  toggleMobileMenu,
  setMobileMenuOpen,
  setThemeMode,
  setPrimaryColor,
  setFilter,
  clearFilter,
  clearAllFilters,
  setPagination,
  initializeFromStorage,
} = uiSlice.actions;

// セレクター
export const selectLoading = (state: { ui: UIState }) => state.ui.loading;
export const selectGlobalLoading = (state: { ui: UIState }) => state.ui.loading.global;
export const selectErrors = (state: { ui: UIState }) => state.ui.errors;
export const selectGlobalError = (state: { ui: UIState }) => state.ui.errors.global;
export const selectSnackbar = (state: { ui: UIState }) => state.ui.snackbar;
export const selectModals = (state: { ui: UIState }) => state.ui.modals;
export const selectNavigation = (state: { ui: UIState }) => state.ui.navigation;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectFilters = (state: { ui: UIState }) => state.ui.filters;
export const selectPagination = (state: { ui: UIState }) => state.ui.pagination;

// 特定のキーに対するセレクター
export const selectLoadingByKey = (key: string) => (state: { ui: UIState }) => 
  state.ui.loading[key] || false;

export const selectErrorByKey = (key: string) => (state: { ui: UIState }) => 
  state.ui.errors[key] || null;

export const selectModalByKey = (key: string) => (state: { ui: UIState }) => 
  state.ui.modals[key] || false;

export const selectFilterByKey = (key: string) => (state: { ui: UIState }) => 
  state.ui.filters[key];

export const selectPaginationByKey = (key: string) => (state: { ui: UIState }) => 
  state.ui.pagination[key] || { page: 1, limit: 10, total: 0 };

export default uiSlice.reducer;