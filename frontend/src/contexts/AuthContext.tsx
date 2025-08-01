import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { apiClient } from '../utils/api';

// ユーザーロールの定義
export enum UserRole {
  ADMIN = 'admin',
  EVALUATOR = 'evaluator',
  USER = 'user',
}

// ユーザー情報の型定義
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  profile: {
    displayName?: string;
    avatar?: string;
    bio?: string;
    expertise?: string[];
  };
}

// 認証状態の型定義
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// 認証アクションの型定義
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// 認証コンテキストの型定義
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  clearError: () => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

// 登録データの型定義
interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

// 初期状態
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// リデューサー
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// 認証コンテキストの作成
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 認証プロバイダーコンポーネント
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 初期化時にトークンから認証状態を復元
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      console.log('Auth initialization - token:', token ? 'exists' : 'none');
      
      if (token) {
        try {
          dispatch({ type: 'AUTH_START' });
          const response = await apiClient.get('/auth/me');
          console.log('Auth success:', response.data);
          dispatch({ type: 'AUTH_SUCCESS', payload: response.data.data?.user || response.data });
        } catch (error) {
          console.log('Auth failed, removing token');
          localStorage.removeItem('authToken');
          dispatch({ type: 'AUTH_FAILURE', payload: '認証に失敗しました' });
        }
      } else {
        console.log('No token, setting unauthenticated');
        dispatch({ type: 'AUTH_FAILURE', payload: '' });
      }
    };

    initializeAuth();
  }, []);

  // ログイン処理
  const login = async (email: string, password: string): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });
      const { token, user } = response.data.data || response.data;

      localStorage.setItem('authToken', token);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'ログインに失敗しました';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // ログアウト処理
  const logout = (): void => {
    localStorage.removeItem('authToken');
    dispatch({ type: 'LOGOUT' });
  };

  // ユーザー登録処理
  const register = async (userData: RegisterData): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await apiClient.post('/auth/register', userData);
      const { token, user } = response.data.data || response.data;

      localStorage.setItem('authToken', token);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'ユーザー登録に失敗しました';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // エラークリア処理
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // ロール確認処理
  const hasRole = (role: UserRole): boolean => {
    return state.user?.role === role;
  };

  // 複数ロール確認処理
  const hasAnyRole = (roles: UserRole[]): boolean => {
    return state.user ? roles.includes(state.user.role) : false;
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    register,
    clearError,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 認証フック
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
