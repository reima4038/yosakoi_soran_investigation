import request from 'supertest';
import app from '../../index';

describe('Timestamps API', () => {
  describe('POST /api/timestamps', () => {
    it('should return 401 without authentication', async () => {
      const timestampData = {
        videoId: 'test-video-id',
        title: 'テストタイムスタンプ',
        startTime: 60
      };

      await request(app)
        .post('/api/timestamps')
        .send(timestampData)
        .expect(401);
    });
  });

  describe('GET /api/timestamps', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/timestamps')
        .expect(401);
    });
  });

  describe('GET /api/timestamps/:token', () => {
    it('should return 404 for non-existent token', async () => {
      await request(app)
        .get('/api/timestamps/non-existent-token')
        .expect(404);
    });
  });

  describe('POST /api/timestamps/:token/view', () => {
    it('should return 404 for non-existent token', async () => {
      await request(app)
        .post('/api/timestamps/non-existent-token/view')
        .expect(404);
    });
  });

  describe('GET /api/timestamps/:token/embed', () => {
    it('should return 404 for non-existent token', async () => {
      await request(app)
        .get('/api/timestamps/non-existent-token/embed')
        .expect(404);
    });
  });
});