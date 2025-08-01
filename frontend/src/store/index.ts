// Redux store configuration
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice } from './api/apiSlice';
import uiReducer, { initializeFromStorage } from './slices/uiSlice';
import cacheReducer, { restoreFromStorage, cleanExpiredCache } from './slices/cacheSlice';

// ストアの設定
export const store = configureStore({
  reducer: {
    // RTK Query API
    [apiSlice.reducerPath]: apiSlice.reducer,
    // UI状態管理
    ui: uiReducer,
    // キャッシュ管理
    cache: cacheReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // RTK Queryのアクションを除外
        ignoredActions: [apiSlice.util.resetApiState.type],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['api'],
      },
    }).concat(apiSlice.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// RTK Queryのリスナーを設定（自動的な再フェッチなど）
setupListeners(store.dispatch);

// 初期化処理
store.dispatch(initializeFromStorage());
store.dispatch(restoreFromStorage());

// 定期的な期限切れキャッシュのクリーンアップ（5分ごと）
setInterval(() => {
  store.dispatch(cleanExpiredCache());
}, 5 * 60 * 1000);

// 型定義
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// カスタムフック用の型付きフック
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// エラーハンドリング用のミドルウェア
const errorHandlingMiddleware = (store: any) => (next: any) => (action: any) => {
  try {
    return next(action);
  } catch (error) {
    console.error('Redux action error:', error);
    // グローバルエラーハンドリング
    store.dispatch({
      type: 'ui/setGlobalError',
      payload: 'アプリケーションエラーが発生しました',
    });
    throw error;
  }
};

// パフォーマンス監視用のミドルウェア
const performanceMiddleware = (store: any) => (next: any) => (action: any) => {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    const result = next(action);
    const end = performance.now();
    
    if (end - start > 10) { // 10ms以上かかった場合は警告
      console.warn(`Slow action detected: ${action.type} took ${end - start}ms`);
    }
    
    return result;
  }
  return next(action);
};
