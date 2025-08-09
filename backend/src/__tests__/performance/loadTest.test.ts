import request from 'supertest';
import app from '../../index';
import { connectDB, disconnectDB } from '../setup';
import { User } from '../../models/User';
import { Video } from '../../models/Video';
import { Session } from '../../models/Session';
import { Template } from '../../models/Template';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

describe('Performance Load Tests', () => {
  let authTokens: string[] = [];
  let testUsers: any[] = [];
  let testVideo: any;
  let testTemplate: any;
  let testSession: any;

  beforeAll(async () => {
    await connectDB();
    
    // Create mock test users directly in database
    const userPromises = Array.from({ length: 10 }, async (_, i) => {
      const hashedPassword = await bcrypt.hash('LoadTest123', 10);
      const user = new User({
        username: `loadtest${i}`,
        email: `loadtest${i}@example.com`,
        passwordHash: hashedPassword,
        role: 'user'
      });
      await user.save();
      
      // Create JWT token
      const token = jwt.sign(
        { userId: user._id, username: user.username, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'test-secret-key-for-testing',
        { 
          expiresIn: '1h',
          issuer: 'yosakoi-evaluation-system',
          audience: 'yosakoi-users'
        }
      );
      authTokens.push(token);
      testUsers.push(user);
      return user;
    });

    await Promise.all(userPromises);

    // Create test video
    testVideo = new Video({
      youtubeId: 'loadtest123',
      title: 'Load Test Video',
      channelName: 'Load Test Channel',
      uploadDate: new Date(),
      thumbnailUrl: 'https://example.com/thumb.jpg',
      createdBy: testUsers[0]._id
    });
    await testVideo.save();

    // Create test template
    testTemplate = new Template({
      name: 'Load Test Template',
      description: 'Template for load testing',
      creatorId: testUsers[0]._id,
      categories: [{
        name: 'Performance',
        description: 'Performance evaluation',
        weight: 1.0,
        criteria: [{
          name: 'Overall',
          description: 'Overall performance',
          type: 'numeric',
          minValue: 0,
          maxValue: 100,
          weight: 1.0
        }]
      }]
    });
    await testTemplate.save();

    // Create test session
    const sessionResponse = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${authTokens[0]}`)
      .send({
        name: 'Load Test Session',
        description: 'Session for load testing',
        startDate: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        endDate: new Date(Date.now() + 86400000).toISOString(),
        videoId: testVideo._id,
        templateId: testTemplate._id
      });

    testSession = sessionResponse.body.data;

    // Activate session and add all users as evaluators
    const session = await Session.findById(testSession._id);
    if (session) {
      session.status = 'active' as any;
      session.evaluators = testUsers.map(user => user._id);
      await session.save();
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Video.deleteMany({});
    await Session.deleteMany({});
    await Template.deleteMany({});
    await disconnectDB();
  });

  describe('Concurrent User Load Tests', () => {
    it('should handle concurrent authentication requests', async () => {
      const startTime = Date.now();
      const concurrentRequests = 20;
      
      // Test concurrent JWT token validation instead of login
      const promises = Array.from({ length: concurrentRequests }, async (_, i) => {
        return request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${authTokens[i % authTokens.length]}`);
      });

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      console.log(`Concurrent auth test: ${concurrentRequests} requests in ${duration}ms`);
      console.log(`Average response time: ${duration / concurrentRequests}ms`);
    });

    it('should handle concurrent session access', async () => {
      const startTime = Date.now();
      const concurrentRequests = 15;
      
      const promises = Array.from({ length: concurrentRequests }, async (_, i) => {
        return request(app)
          .get(`/api/sessions/${testSession._id}`)
          .set('Authorization', `Bearer ${authTokens[i % authTokens.length]}`);
      });

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('Load Test Session');
      });

      expect(duration).toBeLessThan(3000); // 3 seconds
      
      console.log(`Concurrent session access: ${concurrentRequests} requests in ${duration}ms`);
    });

    it('should handle concurrent evaluation submissions', async () => {
      const startTime = Date.now();
      const concurrentEvaluations = 8; // Fewer to avoid conflicts
      
      const promises = Array.from({ length: concurrentEvaluations }, async (_, i) => {
        const token = authTokens[i];
        
        // Start evaluation
        await request(app)
          .get(`/api/evaluations/session/${testSession._id}`)
          .set('Authorization', `Bearer ${token}`);
        
        // Submit scores
        const criterionId = testTemplate.categories[0].criteria[0].id;
        await request(app)
          .put(`/api/evaluations/session/${testSession._id}/scores`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            scores: [{
              criterionId: criterionId,
              score: 80 + i,
              comment: `Load test evaluation ${i}`
            }]
          });
        
        // Submit evaluation
        return request(app)
          .post(`/api/evaluations/session/${testSession._id}/submit`)
          .set('Authorization', `Bearer ${token}`);
      });

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All submissions should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.evaluation.isComplete).toBe(true);
      });

      expect(duration).toBeLessThan(10000); // 10 seconds
      
      console.log(`Concurrent evaluations: ${concurrentEvaluations} submissions in ${duration}ms`);
    });
  });

  describe('Database Performance Tests', () => {
    it('should handle large dataset queries efficiently', async () => {
      // Create many videos for testing
      const videoPromises = Array.from({ length: 100 }, async (_, i) => {
        return new Video({
          youtubeId: `dQw4w9WgX${i.toString().padStart(2, '0')}`,
          title: `Performance Test Video ${i}`,
          channelName: 'Performance Test Channel',
          uploadDate: new Date(Date.now() - i * 86400000), // Different dates
          thumbnailUrl: 'https://example.com/thumb.jpg',
          metadata: {
            teamName: `Team ${i % 10}`,
            year: 2020 + (i % 4),
            eventName: `Event ${i % 5}`
          },
          tags: [`tag${i % 3}`, `category${i % 5}`],
          createdBy: testUsers[i % testUsers.length]._id
        }).save();
      });

      await Promise.all(videoPromises);

      // Test pagination performance
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/videos')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .query({
          page: 1,
          limit: 20,
          search: 'Performance',
          year: 2023
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.videos).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      
      // Should respond quickly even with large dataset
      expect(duration).toBeLessThan(1000); // 1 second
      
      console.log(`Large dataset query: ${duration}ms for 100+ videos`);
    });

    it('should handle complex aggregation queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/videos/stats/summary')
        .set('Authorization', `Bearer ${authTokens[0]}`);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.totalVideos).toBeGreaterThan(0);
      expect(response.body.data.yearStats).toBeDefined();
      expect(response.body.data.teamStats).toBeDefined();
      
      // Aggregation should be reasonably fast
      expect(duration).toBeLessThan(2000); // 2 seconds
      
      console.log(`Aggregation query: ${duration}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 50; i++) {
        await request(app)
          .get('/api/videos')
          .set('Authorization', `Bearer ${authTokens[i % authTokens.length]}`)
          .query({ page: 1, limit: 10 });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Memory usage - Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`Memory usage - Final: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      
      // Memory increase should be reasonable (adjust threshold as needed)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });

  describe('Response Time Benchmarks', () => {
    it('should meet response time requirements for critical endpoints', async () => {
      const benchmarks = [
        { endpoint: '/api/auth/me', method: 'GET', maxTime: 200 },
        { endpoint: `/api/sessions/${testSession._id}`, method: 'GET', maxTime: 500 },
        { endpoint: '/api/videos', method: 'GET', maxTime: 1000 },
        { endpoint: '/api/templates', method: 'GET', maxTime: 500 }
      ];

      for (const benchmark of benchmarks) {
        const startTime = Date.now();
        
        let response;
        if (benchmark.method === 'GET') {
          response = await request(app)
            .get(benchmark.endpoint)
            .set('Authorization', `Bearer ${authTokens[0]}`);
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(response!.status).toBeLessThan(400);
        expect(duration).toBeLessThan(benchmark.maxTime);
        
        console.log(`${benchmark.method} ${benchmark.endpoint}: ${duration}ms (max: ${benchmark.maxTime}ms)`);
      }
    });
  });
});