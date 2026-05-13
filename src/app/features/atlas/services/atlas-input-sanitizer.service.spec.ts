import { TestBed } from '@angular/core/testing';
import { AtlasInputSanitizerService } from './atlas-input-sanitizer.service';

describe('AtlasInputSanitizerService', () => {
  let service: AtlasInputSanitizerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AtlasInputSanitizerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags by default', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = service.sanitizeString(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should remove XSS patterns', () => {
      const input = 'Hello<iframe src="evil.com"></iframe>';
      const result = service.sanitizeString(input);
      expect(result).not.toContain('<iframe>');
      expect(result).not.toContain('</iframe>');
    });

    it('should remove control characters', () => {
      const input = 'Hello\x00\x1FWorld';
      const result = service.sanitizeString(input);
      expect(result).toBe('HelloWorld');
    });

    it('should truncate to max length', () => {
      const input = 'This is a very long string';
      const result = service.sanitizeString(input, { maxLength: 10 });
      expect(result.length).toBe(10);
    });

    it('should allow HTML when specified', () => {
      const input = '<b>Bold</b>';
      const result = service.sanitizeString(input, { allowHtml: true });
      expect(result).toContain('<b>');
    });

    it('should return empty string for null or undefined', () => {
      expect(service.sanitizeString(null as any)).toBe('');
      expect(service.sanitizeString(undefined as any)).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string properties', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com'
      };
      const result = service.sanitizeObject(input);
      expect(result.name).not.toContain('<script>');
      expect(result.email).toBe('john@example.com');
    });

    it('should recursively sanitize nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          profile: {
            bio: '<script>evil()</script>Bio'
          }
        }
      };
      const result = service.sanitizeObject(input);
      expect(result.user.name).not.toContain('<b>');
      expect(result.user.profile.bio).not.toContain('<script>');
    });

    it('should sanitize arrays', () => {
      const input = {
        tags: ['<script>tag1</script>', 'tag2', '<b>tag3</b>']
      };
      const result = service.sanitizeObject(input);
      expect(result.tags[0]).not.toContain('<script>');
      expect(result.tags[2]).not.toContain('<b>');
    });

    it('should exclude specified keys from sanitization', () => {
      const input = {
        name: '<b>John</b>',
        html: '<b>Keep this</b>'
      };
      const result = service.sanitizeObject(input, { excludeKeys: ['html'] });
      expect(result.name).not.toContain('<b>');
      expect(result.html).toContain('<b>');
    });

    it('should preserve non-string primitives', () => {
      const input = {
        name: 'John',
        age: 30,
        active: true,
        score: null
      };
      const result = service.sanitizeObject(input);
      expect(result.age).toBe(30);
      expect(result.active).toBe(true);
      expect(result.score).toBeNull();
    });
  });

  describe('sanitizeSqlParameter', () => {
    it('should throw error for SQL injection patterns', () => {
      const maliciousInputs = [
        "'; DROP TABLE users--",
        "1' OR '1'='1",
        "admin'--",
        "1 UNION SELECT * FROM users"
      ];

      maliciousInputs.forEach(input => {
        expect(() => service.sanitizeSqlParameter(input)).toThrow();
      });
    });

    it('should allow safe input', () => {
      const safeInput = 'John Doe';
      const result = service.sanitizeSqlParameter(safeInput);
      expect(result).toBe('John Doe');
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove path traversal patterns', () => {
      const input = '../../../etc/passwd';
      const result = service.sanitizeFileName(input);
      expect(result).not.toContain('..');
      expect(result).not.toContain('/');
    });

    it('should remove special characters', () => {
      const input = 'file<>:"|?*.txt';
      const result = service.sanitizeFileName(input);
      expect(result).toBe('file.txt');
    });

    it('should return default name for empty result', () => {
      const input = '../../../';
      const result = service.sanitizeFileName(input);
      expect(result).toBe('file');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid HTTPS URLs', () => {
      const input = 'https://example.com/api';
      const result = service.sanitizeUrl(input);
      expect(result).toBe(input);
    });

    it('should throw error for disallowed protocols', () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'file:///etc/passwd',
        'ftp://example.com'
      ];

      maliciousUrls.forEach(url => {
        expect(() => service.sanitizeUrl(url)).toThrow();
      });
    });

    it('should block localhost URLs', () => {
      const localhostUrls = [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://[::1]:8080'
      ];

      localhostUrls.forEach(url => {
        expect(() => service.sanitizeUrl(url)).toThrow();
      });
    });

    it('should block private IP ranges', () => {
      const privateIps = [
        'http://10.0.0.1',
        'http://172.16.0.1',
        'http://192.168.1.1',
        'http://169.254.1.1'
      ];

      privateIps.forEach(url => {
        expect(() => service.sanitizeUrl(url)).toThrow();
      });
    });

    it('should throw error for invalid URL format', () => {
      expect(() => service.sanitizeUrl('not a url')).toThrow();
    });
  });

  describe('sanitizeEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@company.co.uk',
        'test+tag@domain.com'
      ];

      validEmails.forEach(email => {
        const result = service.sanitizeEmail(email);
        expect(result).toBe(email.toLowerCase());
      });
    });

    it('should throw error for invalid email formats', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com'
      ];

      invalidEmails.forEach(email => {
        expect(() => service.sanitizeEmail(email)).toThrow();
      });
    });

    it('should convert email to lowercase', () => {
      const input = 'User@Example.COM';
      const result = service.sanitizeEmail(input);
      expect(result).toBe('user@example.com');
    });
  });

  describe('encodeHtml', () => {
    it('should encode HTML entities', () => {
      const input = '<script>alert("xss")</script>';
      const result = service.encodeHtml(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should encode all special characters', () => {
      const input = '& < > " \' /';
      const result = service.encodeHtml(input);
      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&#x27;');
      expect(result).toContain('&#x2F;');
    });
  });

  describe('sanitizeJson', () => {
    it('should parse and sanitize valid JSON', () => {
      const input = '{"name": "<script>alert()</script>John"}';
      const result = service.sanitizeJson(input);
      expect(result.name).not.toContain('<script>');
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = '{invalid json}';
      expect(() => service.sanitizeJson(invalidJson)).toThrow();
    });

    it('should recursively sanitize nested JSON', () => {
      const input = '{"user": {"name": "<b>John</b>", "tags": ["<script>tag</script>"]}}';
      const result = service.sanitizeJson(input);
      expect(result.user.name).not.toContain('<b>');
      expect(result.user.tags[0]).not.toContain('<script>');
    });
  });
});
