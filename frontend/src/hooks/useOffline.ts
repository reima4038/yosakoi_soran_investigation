import { useState, useEffect, useCallback } from 'react';
import { offlineService } from '../services/offlineService';

interface OfflineState {
  isOnline: boolean;
  networkQuality: 'good' | 'poor' | 'offline';
  syncStatus: {
    unsyncedEvaluations: number;
    unsyncedComments: number;
    queuedItems: number;
  };
  storageUsage: {
    used: number;
    quota: number;
  } | null;
  isSyncing: boolean;
  lastSyncTime: number | null;
}

interface OfflineActions {
  sync: () => Promise<void>;
  clearCache: () => Promise<void>;
  saveEvaluation: (sessionId: string, data: any) => Promise<void>;
  saveComment: (sessionId: string, data: any) => Promise<void>;
  getCachedSession: (sessionId: string) => Promise<any | null>;
  getCachedVideo: (videoId: string) => Promise<any | null>;
  getCachedTemplate: (templateId: string) => Promise<any | null>;
  updateNotificationSettings: (settings: any) => void;
  getNotificationSettings: () => any;
}

export const useOffline = (): [OfflineState, OfflineActions] => {
  const [state, setState] = useState<OfflineState>({
    isOnline: offlineService.getOnlineStatus(),
    networkQuality: offlineService.getNetworkQuality(),
    syncStatus: {
      unsyncedEvaluations: 0,
      unsyncedComments: 0,
      queuedItems: 0,
    },
    storageUsage: null,
    isSyncing: false,
    lastSyncTime: null,
  });

  // 状態の更新
  const updateState = useCallback(async () => {
    try {
      const [syncStatus, storageUsage] = await Promise.all([
        offlineService.getSyncStatus(),
        offlineService.getStorageUsage(),
      ]);

      setState(prev => ({
        ...prev,
        isOnline: offlineService.getOnlineStatus(),
        networkQuality: offlineService.getNetworkQuality(),
        syncStatus,
        storageUsage,
      }));
    } catch (error) {
      console.error('Failed to update offline state:', error);
    }
  }, []);

  // オンライン状態の監視
  useEffect(() => {
    const unsubscribe = offlineService.addOnlineListener((isOnline) => {
      setState(prev => ({ ...prev, isOnline }));
      if (isOnline) {
        updateState();
      }
    });

    return unsubscribe;
  }, [updateState]);

  // Service Worker メッセージの監視
  useEffect(() => {
    const handleSyncEvaluations = () => {
      setState(prev => ({ ...prev, isSyncing: true }));
      offlineService.syncWhenOnline().finally(() => {
        setState(prev => ({ 
          ...prev, 
          isSyncing: false, 
          lastSyncTime: Date.now() 
        }));
        updateState();
      });
    };

    const handleNetworkStatus = (event: CustomEvent) => {
      setState(prev => ({ 
        ...prev, 
        isOnline: event.detail.online 
      }));
    };

    window.addEventListener('sw-sync-evaluations', handleSyncEvaluations);
    window.addEventListener('sw-network-status', handleNetworkStatus as EventListener);

    return () => {
      window.removeEventListener('sw-sync-evaluations', handleSyncEvaluations);
      window.removeEventListener('sw-network-status', handleNetworkStatus as EventListener);
    };
  }, [updateState]);

  // 定期的な状態更新
  useEffect(() => {
    updateState();
    
    const interval = setInterval(updateState, 10000); // 10秒ごと
    return () => clearInterval(interval);
  }, [updateState]);

  // アクション
  const actions: OfflineActions = {
    sync: async () => {
      setState(prev => ({ ...prev, isSyncing: true }));
      try {
        await offlineService.syncWhenOnline();
        setState(prev => ({ 
          ...prev, 
          lastSyncTime: Date.now() 
        }));
      } finally {
        setState(prev => ({ ...prev, isSyncing: false }));
        await updateState();
      }
    },

    clearCache: async () => {
      await offlineService.clearCache();
      await updateState();
    },

    saveEvaluation: async (sessionId: string, data: any) => {
      await offlineService.saveEvaluation(sessionId, data);
      await updateState();
    },

    saveComment: async (sessionId: string, data: any) => {
      await offlineService.saveComment(sessionId, data);
      await updateState();
    },

    getCachedSession: (sessionId: string) => {
      return offlineService.getCachedSession(sessionId);
    },

    getCachedVideo: (videoId: string) => {
      return offlineService.getCachedVideo(videoId);
    },

    getCachedTemplate: (templateId: string) => {
      return offlineService.getCachedTemplate(templateId);
    },

    updateNotificationSettings: (settings: any) => {
      offlineService.updateNotificationSettings(settings);
    },

    getNotificationSettings: () => {
      return offlineService.getNotificationSettings();
    },
  };

  return [state, actions];
};

export default useOffline;