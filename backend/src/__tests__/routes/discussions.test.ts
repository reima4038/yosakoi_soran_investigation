import request from 'supertest';
import app from '../../index';

describe('Discussions API', () => {
  describe('POST /api/discussions/threads', () => {
    it('should return 401 without authentication', async () => {
      const threadData = {
        shareId: 'test-share-id',
        type: 'share_comment'
      };

      await request(app)
        .post('/api/discussions/threads')
        .send(threadData)
        .expect(401);
    });
  });

  describe('GET /api/discussions/threads', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/discussions/threads')
        .expect(401);
    });
  });
});