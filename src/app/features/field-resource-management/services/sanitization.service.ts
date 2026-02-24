import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Sanitization Service
 * 
 * Provides methods for sanitizing user inputs to prevent XSS attacks.
 * Handles HTML escaping, file validation, and safe HTML rendering.
 * 
 * Requirements: 9.2, 25.2
 */
@Injectable({
  providedIn: 'root'
})
export class SanitizationService {
  // Allowed file MIME types for uploads
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic'
  ];

  // Maximum file size in bytes (10 MB)
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  // Dangerous HTML tags to strip
  private readonly DANGEROUS_TAGS = [
    'script',
    'iframe',
    'object',
    'embed',
    'link',
    'style',
    'meta',
    'base',
    'form'
  ];

  constructor(private domSanitizer: DomSanitizer) {}

  /**
   * Sanitize user input text by escaping HTML special characters
   * Use this for displaying user-generated content like notes and descriptions
   * 
   * @param input - The user input to sanitize
   * @returns Sanitized text with HTML entities escaped
   */
  sanitizeText(input: string): string {
    if (!input) {
      return '';
    }

    // Create a temporary element to leverage browser's built-in HTML escaping
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Sanitize HTML content by removing dangerous tags and attributes
   * Use this when you need to allow some HTML but want to prevent XSS
   * 
   * @param html - The HTML content to sanitize
   * @returns Sanitized HTML with dangerous elements removed
   */
  sanitizeHtml(html: string): string {
    if (!html) {
      return '';
    }

    // Remove dangerous tags
    let sanitized = html;
    this.DANGEROUS_TAGS.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi');
      sanitized = sanitized.replace(regex, '');
      // Also remove self-closing tags
      const selfClosingRegex = new RegExp(`<${tag}[^>]*/>`, 'gi');
      sanitized = sanitized.replace(selfClosingRegex, '');
    });

    // Remove event handlers (onclick, onerror, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove data: protocol (can be used for XSS)
    sanitized = sanitized.replace(/data:text\/html/gi, '');

    return sanitized;
  }

  /**
   * Sanitize and return safe HTML for Angular binding
   * Use this with [innerHTML] binding after sanitizing
   * 
   * @param html - The HTML content to make safe
   * @returns SafeHtml that can be used with [innerHTML]
   */
  getSafeHtml(html: string): SafeHtml {
    const sanitized = this.sanitizeHtml(html);
    return this.domSanitizer.sanitize(1, sanitized) || ''; // 1 = SecurityContext.HTML
  }

  /**
   * Validate file for upload
   * Checks file type, size, and basic security properties
   * 
   * @param file - The file to validate
   * @returns Validation result with valid flag and error message
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    // Check file type by MIME type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: JPEG, PNG, HEIC. Received: ${file.type}`
      };
    }

    // Check file extension as additional validation
    const extension = this.getFileExtension(file.name);
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'heic'];
    if (!allowedExtensions.includes(extension.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`
      };
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      const maxSizeMB = this.MAX_FILE_SIZE / (1024 * 1024);
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB} MB limit. File size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`
      };
    }

    // Check for suspicious file names
    if (this.hasSuspiciousFileName(file.name)) {
      return {
        valid: false,
        error: 'File name contains suspicious characters'
      };
    }

    return { valid: true };
  }

  /**
   * Validate multiple files for upload
   * 
   * @param files - Array of files to validate
   * @returns Validation result with valid files and errors
   */
  validateFiles(files: File[]): {
    validFiles: File[];
    errors: string[];
  } {
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const validation = this.validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    return { validFiles, errors };
  }

  /**
   * Get file extension from filename
   * 
   * @param filename - The filename to extract extension from
   * @returns File extension without the dot
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Check if filename contains suspicious characters
   * 
   * @param filename - The filename to check
   * @returns True if filename is suspicious
   */
  private hasSuspiciousFileName(filename: string): boolean {
    // Check for null bytes
    if (filename.includes('\0')) {
      return true;
    }

    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return true;
    }

    // Check for executable extensions hidden in the name
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js'];
    const lowerFilename = filename.toLowerCase();
    for (const ext of dangerousExtensions) {
      if (lowerFilename.includes(ext)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sanitize filename for safe storage
   * Removes special characters and limits length
   * 
   * @param filename - The filename to sanitize
   * @returns Sanitized filename
   */
  sanitizeFileName(filename: string): string {
    if (!filename) {
      return 'file';
    }

    // Get extension
    const extension = this.getFileExtension(filename);
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;

    // Remove special characters, keep only alphanumeric, dash, underscore
    const sanitized = nameWithoutExt
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 100); // Limit length

    return extension ? `${sanitized}.${extension}` : sanitized;
  }

  /**
   * Validate and sanitize text input
   * Checks length and sanitizes content
   * 
   * @param input - The text input to validate
   * @param maxLength - Maximum allowed length
   * @returns Validation result with sanitized text
   */
  validateAndSanitizeText(
    input: string,
    maxLength: number = 2000
  ): { valid: boolean; sanitized: string; error?: string } {
    if (!input || !input.trim()) {
      return {
        valid: false,
        sanitized: '',
        error: 'Input cannot be empty'
      };
    }

    if (input.length > maxLength) {
      return {
        valid: false,
        sanitized: '',
        error: `Input exceeds maximum length of ${maxLength} characters`
      };
    }

    const sanitized = this.sanitizeText(input.trim());

    return {
      valid: true,
      sanitized
    };
  }
}
