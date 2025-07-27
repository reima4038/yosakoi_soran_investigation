import { offlineService } from '../offlineService';

// Mock IndexedDB
const mockDB = {
  put: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  getAllFromIndex: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
};

// Mock IDB
jest.mock('idb', () => ({
  openDB: jest.fn(() => Promise.resolve(mockDB)),
}));

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
    serviceWorker: {
      ready: Promise.resolve({
        sync: {
          register: jest.fn(),
        },
      }),
      addEventListener: jest.fn(),
      register: jest.fn(),
    },
    storage: {
      estimate: jest.fn(() => Promise.resolve({ usage: 1000, quota: 10000 })),
    },
  },
  writable: true,
});

// Mock window events
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(window, 'removeEventListener', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(window, 'dispatchEvent', {
  value: jest.fn(),
  writable: true,
});

describe('OfflineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDB.getAllFromIndex.mockResolvedValue([]);
    mockDB.getAll.mockResolvedValue([]);
  });

  describe('Online Status', () => {
    it('should return current online status', () => {
      const isOnline = offlineService.getOnlineStatus();
      expect(typeof isOnline).toBe('boolean');
    });

    it('should add and remove online listeners', () => {
      const listener = jest.fn();
      const unsubscribe = offlineService.addOnlineListener(listener);
      
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('Data Storage', () => {
    it('should save evaluation data', async () => {
      mockDB.put.mockResolvedValue(undefined);
      
      await offlineService.saveEvaluation('session1', { score: 85 });
      
      expect(mockDB.put).toHaveBeenCalledWith('evaluations', expect.objectContaining({
        sessionId: 'session1',
        data: { score: 85 },
        synced: expect.any(Boolean),
      }));
    });

    it('should save comment data', async () => {
      mockDB.put.mockResolvedValue(undefined);
      
      await offlineService.saveComment('session1', { text: 'Great performance!' });
      
      expect(mockDB.put).toHaveBeenCalledWith('comments', expect.objectContaining({
        sessionId: 'session1',
        data: { text: 'Great performance!' },
        synced: expect.any(Boolean),
      }));
    });
  });

  describe('Cache Management', () => {
    it('should cache session data', async () => {
      mockDB.put.mockResolvedValue(undefined);
      
      const sessionData = { id: 'session1', name: 'Test Session' };
      await offlineService.cacheSession(sessionData);
      
      expect(mockDB.put).toHaveBeenCalledWith('sessions', expect.objectContaining({
        id: 'session1',
        data: sessionData,
        cached: true,
      }));
    });

    it('should retrieve cached session', async () => {
      const cachedData = { id: 'session1', data: { name: 'Test Session' } };
      mockDB.get.mockResolvedValue(cachedData);
      
      const result = await offlineService.getCachedSession('session1');
      
      expect(mockDB.get).toHaveBeenCalledWith('sessions', 'session1');
      expect(result).toEqual(cachedData.data);
    });

    it('should clear cache', async () => {
      mockDB.clear.mockResolvedValue(undefined);
      
      await offlineService.clearCache();
      
      expect(mockDB.clear).toHaveBeenCalledWith('sessions');
      expect(mockDB.clear).toHaveBeenCalledWith('videos');
      expect(mockDB.clear).toHaveBeenCalledWith('templates');
    });
  });

  describe('Sync Status', () => {
    it('should get sync status', async () => {
      mockDB.getAllFromIndex.mockResolvedValue([{ id: '1' }, { id: '2' }]);
      mockDB.getAll.mockResolvedValue([{ id: '3' }]);
      
      const status = await offlineService.getSyncStatus();
      
      expect(status).toEqual({
        unsyncedEvaluations: 2,
        unsyncedComments: 2,
        queuedItems: 1,
      });
    });
  });

  describe('Notification Settings', () => {
    it('should get notification settings', () => {
      const settings = offlineService.getNotificationSettings();
      
      expect(settings).toHaveProperty('offlineMode');
      expect(settings).toHaveProperty('syncCompleted');
      expect(settings).toHaveProperty('syncFailed');
      expect(settings).toHaveProperty('dataSaved');
    });

    it('should update notification settings', () => {
      const newSettings = { offlineMode: false };
      
      offlineService.updateNotificationSettings(newSettings);
      
      const settings = offlineService.getNotificationSettings();
      expect(settings.offlineMode).toBe(false);
    });
  });

  describe('Offline Notifications', () => {
    it('should add offline notification', () => {
      offlineService.addOfflineNotification('data_saved', 'Data saved locally');
      
      const notifications = offlineService.getOfflineNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'data_saved',
        message: 'Data saved locally',
      });
    });

    it('should clear offline notifications', () => {
      offlineService.addOfflineNotification('data_saved', 'Test message');
      offlineService.clearOfflineNotifications();
      
      const notifications = offlineService.getOfflineNotifications();
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Storage Usage', () => {
    it('should get storage usage', async () => {
      const usage = await offlineService.getStorageUsage();
      
      expect(usage).toEqual({
        used: 1000,
        quota: 10000,
      });
    });
  });

  describe('Network Quality', () => {
    it('should get network quality', () => {
      const quality = offlineService.getNetworkQuality();
      expect(['good', 'poor', 'offline']).toContain(quality);
    });

    it('should determine if sync should happen now', () => {
      const shouldSync = offlineService.shouldSyncNow();
      expect(typeof shouldSync).toBe('boolean');
    });
  });
});