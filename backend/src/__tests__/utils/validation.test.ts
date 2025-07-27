// Unit tests for validation utilities
describe('Validation Utilities', () => {
  describe('Email validation', () => {
    it('should validate correct email formats', () => {
      const validateEmail = (email: string): boolean => {
        const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
      };

      const validEmails = [
        'test@example.com',
        'user.name@domain.co.jp',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        'test@.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('Username validation', () => {
    it('should validate username format and length', () => {
      const validateUsername = (username: string): { valid: boolean; error?: string } => {
        if (!username || username.length < 3) {
          return { valid: false, error: 'Username must be at least 3 characters' };
        }
        if (username.length > 30) {
          return { valid: false, error: 'Username must be 30 characters or less' };
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
          return { valid: false, error: 'Username can only contain letters, numbers, underscore, and hyphen' };
        }
        return { valid: true };
      };

      expect(validateUsername('validuser')).toEqual({ valid: true });
      expect(validateUsername('user_123')).toEqual({ valid: true });
      expect(validateUsername('user-name')).toEqual({ valid: true });
      
      expect(validateUsername('ab')).toEqual({ 
        valid: false, 
        error: 'Username must be at least 3 characters' 
      });
      expect(validateUsername('a'.repeat(31))).toEqual({ 
        valid: false, 
        error: 'Username must be 30 characters or less' 
      });
      expect(validateUsername('user name')).toEqual({ 
        valid: false, 
        error: 'Username can only contain letters, numbers, underscore, and hyphen' 
      });
    });
  });

  describe('Password validation', () => {
    it('should validate password strength', () => {
      const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        
        if (password.length < 8) {
          errors.push('Password must be at least 8 characters');
        }
        if (!/[A-Z]/.test(password)) {
          errors.push('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
          errors.push('Password must contain at least one lowercase letter');
        }
        if (!/\d/.test(password)) {
          errors.push('Password must contain at least one number');
        }
        
        return { valid: errors.length === 0, errors };
      };

      expect(validatePassword('Password123')).toEqual({ valid: true, errors: [] });
      
      expect(validatePassword('pass')).toEqual({ 
        valid: false, 
        errors: [
          'Password must be at least 8 characters',
          'Password must contain at least one uppercase letter',
          'Password must contain at least one number'
        ]
      });
      
      expect(validatePassword('password123')).toEqual({ 
        valid: false, 
        errors: ['Password must contain at least one uppercase letter']
      });
    });
  });

  describe('YouTube URL validation', () => {
    it('should validate YouTube URL formats', () => {
      const validateYouTubeUrl = (url: string): boolean => {
        const patterns = [
          /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/,
          /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(\S*)?$/
        ];
        return patterns.some(pattern => pattern.test(url));
      };

      const validUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ'
      ];

      const invalidUrls = [
        'https://vimeo.com/123456789',
        'https://youtube.com/watch?v=invalid',
        'not-a-url',
        'https://youtube.com/watch?v=',
        'https://youtube.com/watch?v=short' // Too short
      ];

      validUrls.forEach(url => {
        expect(validateYouTubeUrl(url)).toBe(true);
      });

      invalidUrls.forEach(url => {
        expect(validateYouTubeUrl(url)).toBe(false);
      });
    });
  });

  describe('Score validation', () => {
    it('should validate evaluation scores', () => {
      const validateScore = (score: any): { valid: boolean; error?: string } => {
        if (typeof score !== 'number') {
          return { valid: false, error: 'Score must be a number' };
        }
        if (score < 0) {
          return { valid: false, error: 'Score must be 0 or greater' };
        }
        if (score > 100) {
          return { valid: false, error: 'Score must be 100 or less' };
        }
        return { valid: true };
      };

      expect(validateScore(85)).toEqual({ valid: true });
      expect(validateScore(0)).toEqual({ valid: true });
      expect(validateScore(100)).toEqual({ valid: true });
      
      expect(validateScore(-1)).toEqual({ 
        valid: false, 
        error: 'Score must be 0 or greater' 
      });
      expect(validateScore(101)).toEqual({ 
        valid: false, 
        error: 'Score must be 100 or less' 
      });
      expect(validateScore('85')).toEqual({ 
        valid: false, 
        error: 'Score must be a number' 
      });
    });
  });

  describe('Date validation', () => {
    it('should validate date ranges', () => {
      const validateDateRange = (startDate: string, endDate: string): { valid: boolean; error?: string } => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return { valid: false, error: 'Invalid date format' };
        }
        
        if (start >= end) {
          return { valid: false, error: 'Start date must be before end date' };
        }
        
        const now = new Date();
        if (end < now) {
          return { valid: false, error: 'End date must be in the future' };
        }
        
        return { valid: true };
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      expect(validateDateRange(
        tomorrow.toISOString(),
        dayAfter.toISOString()
      )).toEqual({ valid: true });
      
      expect(validateDateRange('invalid', dayAfter.toISOString())).toEqual({ 
        valid: false, 
        error: 'Invalid date format' 
      });
      
      expect(validateDateRange(
        dayAfter.toISOString(),
        tomorrow.toISOString()
      )).toEqual({ 
        valid: false, 
        error: 'Start date must be before end date' 
      });
    });
  });
});