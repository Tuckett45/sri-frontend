import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { SanitizationService } from './sanitization.service';

describe('SanitizationService', () => {
  let service: SanitizationService;
  let domSanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SanitizationService, DomSanitizer]
    });
    service = TestBed.inject(SanitizationService);
    domSanitizer = TestBed.inject(DomSanitizer);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sanitizeText', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const result = service.sanitizeText(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should escape angle brackets', () => {
      const input = '<div>Test</div>';
      const result = service.sanitizeText(input);
      expect(result).toBe('&lt;div&gt;Test&lt;/div&gt;');
    });

    it('should handle empty input', () => {
      expect(service.sanitizeText('')).toBe('');
      expect(service.sanitizeText(null as any)).toBe('');
    });

    it('should preserve regular text', () => {
      const input = 'This is a normal note';
      const result = service.sanitizeText(input);
      expect(result).toBe(input);
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script>';
      const result = service.sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Hello</p>');
    });

    it('should remove iframe tags', () => {
      const input = '<p>Content</p><iframe src="evil.com"></iframe>';
      const result = service.sanitizeHtml(input);
      expect(result).not.toContain('<iframe>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(\'XSS\')">Click me</div>';
      const result = service.sanitizeHtml(input);
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Link</a>';
      const result = service.sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    it('should handle empty input', () => {
      expect(service.sanitizeHtml('')).toBe('');
    });
  });

  describe('validateFile', () => {
    it('should accept valid JPEG file', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = service.validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid PNG file', () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const result = service.validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid file type', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = service.validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject file exceeding size limit', () => {
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const result = service.validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds');
    });

    it('should reject file with mismatched extension', () => {
      const file = new File(['content'], 'test.exe', { type: 'image/jpeg' });
      const result = service.validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file extension');
    });

    it('should reject file with path traversal in name', () => {
      const file = new File(['content'], '../../../etc/passwd.jpg', { type: 'image/jpeg' });
      const result = service.validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('suspicious');
    });

    it('should reject file with executable extension in name', () => {
      const file = new File(['content'], 'image.exe.jpg', { type: 'image/jpeg' });
      const result = service.validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('suspicious');
    });
  });

  describe('validateFiles', () => {
    it('should validate multiple files', () => {
      const files = [
        new File(['content'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'test2.png', { type: 'image/png' }),
        new File(['content'], 'test3.pdf', { type: 'application/pdf' })
      ];

      const result = service.validateFiles(files);
      expect(result.validFiles.length).toBe(2);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('test3.pdf');
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove special characters', () => {
      const result = service.sanitizeFileName('test@#$%file.jpg');
      expect(result).toBe('test____file.jpg');
    });

    it('should preserve extension', () => {
      const result = service.sanitizeFileName('myfile.png');
      expect(result).toContain('.png');
      expect(result.endsWith('.png')).toBe(true);
    });

    it('should handle empty filename', () => {
      const result = service.sanitizeFileName('');
      expect(result).toBe('file');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(200) + '.jpg';
      const result = service.sanitizeFileName(longName);
      expect(result.length).toBeLessThan(110); // 100 chars + extension
    });
  });

  describe('validateAndSanitizeText', () => {
    it('should validate and sanitize valid text', () => {
      const input = 'This is a valid note';
      const result = service.validateAndSanitizeText(input);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe(input);
    });

    it('should reject empty text', () => {
      const result = service.validateAndSanitizeText('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject text exceeding max length', () => {
      const longText = 'a'.repeat(2001);
      const result = service.validateAndSanitizeText(longText);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds');
    });

    it('should sanitize HTML in text', () => {
      const input = '<script>alert("XSS")</script>Note';
      const result = service.validateAndSanitizeText(input);
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should respect custom max length', () => {
      const input = 'a'.repeat(150);
      const result = service.validateAndSanitizeText(input, 100);
      expect(result.valid).toBe(false);
    });
  });
});
