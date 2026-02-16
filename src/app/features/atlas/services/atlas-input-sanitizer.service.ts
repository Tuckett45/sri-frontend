import { Injectable } from '@angular/core';

/**
 * AtlasInputSanitizerService
 * 
 * Provides input sanitization for all user input before sending to ATLAS APIs.
 * Prevents XSS, SQL injection, and other injection attacks by sanitizing
 * strings, objects, and arrays.
 * 
 * Requirements: 12.4
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasInputSanitizerService {
  // Patterns for detecting potentially malicious input
  private readonly SQL_INJECTION_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)|(-{2})|(\*\/)|(\bOR\b.*=.*)|(\bAND\b.*=.*)/gi;
  private readonly XSS_PATTERN = /<script[^>]*>.*?<\/script>|<iframe[^>]*>.*?<\/iframe>|javascript:|onerror=|onload=|onclick=/gi;
  private readonly HTML_TAG_PATTERN = /<[^>]+>/g;
  private readonly CONTROL_CHAR_PATTERN = /[\x00-\x1F\x7F]/g;

  /**
   * Sanitize a string value
   * Requirements: 12.4
   * 
   * @param value - String to sanitize
   * @param options - Sanitization options
   * @returns Sanitized string
   */
  sanitizeString(value: string, options?: {
    allowHtml?: boolean;
    maxLength?: number;
    removeControlChars?: boolean;
  }): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    let sanitized = value;

    // Remove control characters by default
    if (options?.removeControlChars !== false) {
      sanitized = sanitized.replace(this.CONTROL_CHAR_PATTERN, '');
    }

    // Remove HTML tags unless explicitly allowed
    if (!options?.allowHtml) {
      sanitized = sanitized.replace(this.HTML_TAG_PATTERN, '');
    }

    // Remove XSS patterns
    sanitized = sanitized.replace(this.XSS_PATTERN, '');

    // Truncate to max length if specified
    if (options?.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * Sanitize an object by sanitizing all string properties
   * Requirements: 12.4
   * 
   * @param obj - Object to sanitize
   * @param options - Sanitization options
   * @returns Sanitized object
   */
  sanitizeObject<T extends Record<string, any>>(obj: T, options?: {
    allowHtml?: boolean;
    maxLength?: number;
    excludeKeys?: string[];
  }): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized: any = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) {
        continue;
      }

      // Skip excluded keys
      if (options?.excludeKeys?.includes(key)) {
        sanitized[key] = obj[key];
        continue;
      }

      const value = obj[key];

      if (typeof value === 'string') {
        // Sanitize string values
        sanitized[key] = this.sanitizeString(value, {
          allowHtml: options?.allowHtml,
          maxLength: options?.maxLength
        });
      } else if (Array.isArray(value)) {
        // Recursively sanitize arrays
        sanitized[key] = value.map((item: any) => 
          typeof item === 'object' ? this.sanitizeObject(item, options) : 
          typeof item === 'string' ? this.sanitizeString(item, options) : 
          item
        );
      } else if (value !== null && typeof value === 'object') {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeObject(value, options);
      } else {
        // Keep non-string primitives as-is
        sanitized[key] = value;
      }
    }

    return sanitized as T;
  }

  /**
   * Validate and sanitize SQL query parameters
   * Requirements: 12.4
   * 
   * @param value - Value to check for SQL injection
   * @returns Sanitized value
   * @throws Error if SQL injection pattern detected
   */
  sanitizeSqlParameter(value: string): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    // Check for SQL injection patterns
    if (this.SQL_INJECTION_PATTERN.test(value)) {
      console.warn('Potential SQL injection detected and blocked:', value);
      throw new Error('Invalid input: potential SQL injection detected');
    }

    return this.sanitizeString(value);
  }

  /**
   * Sanitize file name to prevent path traversal attacks
   * Requirements: 12.4
   * 
   * @param fileName - File name to sanitize
   * @returns Sanitized file name
   */
  sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') {
      return '';
    }

    // Remove path traversal patterns
    let sanitized = fileName.replace(/\.\./g, '');
    sanitized = sanitized.replace(/[\/\\]/g, '');

    // Remove special characters that could cause issues
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, '');

    // Ensure file name is not empty after sanitization
    if (!sanitized.trim()) {
      return 'file';
    }

    return sanitized.trim();
  }

  /**
   * Sanitize URL to prevent SSRF and open redirect attacks
   * Requirements: 12.4
   * 
   * @param url - URL to sanitize
   * @param allowedProtocols - Allowed URL protocols (default: http, https)
   * @returns Sanitized URL
   * @throws Error if URL is invalid or uses disallowed protocol
   */
  sanitizeUrl(url: string, allowedProtocols: string[] = ['http:', 'https:']): string {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL: empty or non-string value');
    }

    try {
      const urlObj = new URL(url);

      // Check protocol
      if (!allowedProtocols.includes(urlObj.protocol)) {
        throw new Error(`Invalid URL protocol: ${urlObj.protocol}. Allowed: ${allowedProtocols.join(', ')}`);
      }

      // Block localhost and private IP ranges for SSRF protection
      const hostname = urlObj.hostname.toLowerCase();
      if (this.isPrivateOrLocalhost(hostname)) {
        throw new Error('Invalid URL: localhost and private IPs are not allowed');
      }

      return urlObj.toString();
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Invalid URL format');
      }
      throw error;
    }
  }

  /**
   * Sanitize email address
   * Requirements: 12.4
   * 
   * @param email - Email address to sanitize
   * @returns Sanitized email address
   * @throws Error if email format is invalid
   */
  sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email: empty or non-string value');
    }

    // Basic email validation pattern
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const sanitized = this.sanitizeString(email, { maxLength: 254 });

    if (!emailPattern.test(sanitized)) {
      throw new Error('Invalid email format');
    }

    return sanitized.toLowerCase();
  }

  /**
   * Check if hostname is localhost or private IP
   * 
   * @param hostname - Hostname to check
   * @returns True if hostname is localhost or private IP
   */
  private isPrivateOrLocalhost(hostname: string): boolean {
    // Check for localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // Check for private IP ranges (IPv4)
    const privateIpPatterns = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^169\.254\./               // 169.254.0.0/16 (link-local)
    ];

    return privateIpPatterns.some(pattern => pattern.test(hostname));
  }

  /**
   * Encode HTML entities to prevent XSS
   * Requirements: 12.4
   * 
   * @param value - String to encode
   * @returns HTML-encoded string
   */
  encodeHtml(value: string): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return value.replace(/[&<>"'\/]/g, char => htmlEntities[char] || char);
  }

  /**
   * Sanitize JSON string to prevent injection
   * Requirements: 12.4
   * 
   * @param jsonString - JSON string to sanitize
   * @returns Sanitized and parsed JSON object
   * @throws Error if JSON is invalid
   */
  sanitizeJson(jsonString: string): any {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Invalid JSON: empty or non-string value');
    }

    try {
      // Parse JSON to validate structure
      const parsed = JSON.parse(jsonString);

      // Recursively sanitize the parsed object
      return this.sanitizeObject(parsed);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }
}
