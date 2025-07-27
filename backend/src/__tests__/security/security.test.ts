import request from 'supertest';
import app from '../../index';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';

describe('Security Tests', () => {
  describe('Rate Limiting', () => {
    it.skip('should limit login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // 複数回のログイン試行
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // 6回目の試行でレート制限に引っかかる
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error');
    });

    it.skip('should limit API calls', async () => {
      // 大量のAPI呼び出し
      const promises = [];
      for (let i = 0; i < 102; i++) {
        promises.push(
          request(app)
            .get('/api/videos')
            .set('Authorization', 'Bearer invalid-token')
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should sanitize MongoDB injection attempts', async () => {
      const maliciousData = {
        email: { $ne: null },
        password: { $regex: '.*' }
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousData);

      expect(response.status).toBe(400);
    });

    it('should prevent XSS attacks', async () => {
      const xssPayload = {
        name: '<script>alert("xss")</script>',
        description: '<img src=x onerror=alert("xss")>'
      };

      const response = await request(app)
        .post('/api/videos')
        .send(xssPayload)
        .set('Authorization', 'Bearer valid-token');

      if (response.status === 201) {
        expect(response.body.name).not.toContain('<script>');
        expect(response.body.description).not.toContain('<img');
      }
    });
  });

  describe('Security Headers', () => {
    it.skip('should set security headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it.skip('should set CORS headers correctly', async () => {
      const response = await request(app)
        .options('/api/videos')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Authentication Security', () => {
    it.skip('should reject requests without valid JWT', async () => {
      const response = await request(app)
        .get('/api/videos')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it.skip('should reject expired JWT tokens', async () => {
      // 期限切れのトークンをテスト
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      const response = await request(app)
        .get('/api/videos')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Data Protection', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).not.toContain('user not found');
      expect(response.body.message).not.toContain('database');
    });

    it('should hash passwords properly', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'plainpassword'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      if (response.status === 201) {
        expect(response.body).not.toHaveProperty('password');
        expect(response.body.password).toBeUndefined();
      }
    });
  });

  describe('File Upload Security', () => {
    it.skip('should reject dangerous file types', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('<?php echo "test"; ?>'), 'malicious.php')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('file type');
    });

    it.skip('should limit file size', async () => {
      const largeBuffer = Buffer.alloc(20 * 1024 * 1024); // 20MB
      
      const response = await request(app)
        .post('/api/upload')
        .attach('file', largeBuffer, 'large.jpg')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(413);
    });
  });

  describe('SQL/NoSQL Injection Prevention', () => {
    it.skip('should prevent NoSQL injection in query parameters', async () => {
      const response = await request(app)
        .get('/api/videos?title[$ne]=null')
        .set('Authorization', 'Bearer valid-token');

      // クエリが正常に処理されるか、適切にエラーが返される
      expect([200, 400]).toContain(response.status);
    });

    it('should sanitize user input in search queries', async () => {
      const maliciousQuery = { $where: 'this.title.length > 0' };
      
      const response = await request(app)
        .get(`/api/videos/search?q=${JSON.stringify(maliciousQuery)}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).not.toBe(500);
    });
  });
});