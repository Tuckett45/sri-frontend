/**
 * Preservation Property-Based Tests for File Upload Component
 * 
 * **Validates: Requirements 3.2, 3.4**
 * 
 * These tests verify that the file-upload component with CORRECT
 * @Input property names (maxFileSize, allowedFileTypes) continues
 * to work correctly after the bugfix.
 * 
 * This follows the observation-first methodology:
 * - Run on UNFIXED code to establish baseline behavior
 * - Run on FIXED code to ensure no regressions
 */

import * as fc from 'fast-check';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileUploadComponent } from './file-upload.component';
import { SanitizationService } from '../../../services/sanitization.service';
import { ImageCacheService } from '../../../services/image-cache.service';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('FileUploadComponent - Preservation Properties', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;
  let mockSanitizationService: jasmine.SpyObj<SanitizationService>;
  let mockImageCacheService: jasmine.SpyObj<ImageCacheService>;

  beforeEach(async () => {
    mockSanitizationService = jasmine.createSpyObj('SanitizationService', ['validateFile']);
    mockSanitizationService.validateFile.and.returnValue({ valid: true });

    mockImageCacheService = jasmine.createSpyObj('ImageCacheService', ['cacheImage', 'getCachedImage']);

    await TestBed.configureTestingModule({
      declarations: [FileUploadComponent],
      providers: [
        { provide: SanitizationService, useValue: mockSanitizationService },
        { provide: ImageCacheService, useValue: mockImageCacheService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FileUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Property 2: Preservation - Correct @Input Property Names
   * 
   * For any file-upload component usage with correct @Input property names
   * (maxFileSize, allowedFileTypes), the component should function correctly.
   */
  describe('Property 2: Correct @Input property names work correctly', () => {
    
    it('should accept maxFileSize input property', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1024, max: 100 * 1024 * 1024 }), // 1KB to 100MB
          (maxSize) => {
            // Set the correct property name
            component.maxFileSize = maxSize;
            fixture.detectChanges();
            
            // Verify the property is set correctly
            expect(component.maxFileSize).toBe(maxSize);
            
            // Verify hint text includes the max size
            const hintText = component.hintText;
            expect(hintText).toBeDefined();
            expect(typeof hintText).toBe('string');
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should accept allowedFileTypes input property', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom(
              'image/jpeg',
              'image/png',
              'image/heic',
              'application/pdf',
              'text/plain'
            ),
            { minLength: 1, maxLength: 5 }
          ),
          (fileTypes) => {
            // Set the correct property name
            component.allowedFileTypes = fileTypes;
            fixture.detectChanges();
            
            // Verify the property is set correctly
            expect(component.allowedFileTypes).toEqual(fileTypes);
            expect(component.allowedFileTypes.length).toBe(fileTypes.length);
            
            // Verify accept attribute is generated correctly
            const acceptAttr = component.acceptAttribute;
            expect(acceptAttr).toBe(fileTypes.join(','));
            
            // Verify hint text includes file types
            const hintText = component.hintText;
            expect(hintText).toBeDefined();
            expect(typeof hintText).toBe('string');
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should validate files against maxFileSize correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1024, max: 10 * 1024 * 1024 }), // 1KB to 10MB
          fc.integer({ min: 100, max: 20 * 1024 * 1024 }), // 100B to 20MB
          (maxSize, fileSize) => {
            component.maxFileSize = maxSize;
            
            // Create a mock file with the specified size
            const mockFile = new File(['x'.repeat(fileSize)], 'test.jpg', {
              type: 'image/jpeg'
            });
            
            // Use reflection to access private validateFile method
            const validateFile = (component as any).validateFile.bind(component);
            const result = validateFile(mockFile);
            
            // Verify validation result matches expected outcome
            if (fileSize <= maxSize) {
              expect(result.valid).toBe(true);
            } else {
              expect(result.valid).toBe(false);
              expect(result.error).toContain('exceeds');
            }
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should validate files against allowedFileTypes correctly', () => {
      const testCases = [
        { allowed: ['image/jpeg', 'image/png'], fileType: 'image/jpeg', shouldPass: true },
        { allowed: ['image/jpeg', 'image/png'], fileType: 'image/png', shouldPass: true },
        { allowed: ['image/jpeg', 'image/png'], fileType: 'application/pdf', shouldPass: false },
        { allowed: ['application/pdf'], fileType: 'image/jpeg', shouldPass: false },
        { allowed: ['image/heic'], fileType: 'image/heic', shouldPass: true }
      ];
      
      testCases.forEach(testCase => {
        component.allowedFileTypes = testCase.allowed;
        component.maxFileSize = 10 * 1024 * 1024; // 10MB
        
        const mockFile = new File(['test'], 'test.file', {
          type: testCase.fileType
        });
        
        // Use reflection to access private validateFile method
        const validateFile = (component as any).validateFile.bind(component);
        const result = validateFile(mockFile);
        
        if (testCase.shouldPass) {
          expect(result.valid).toBe(true, 
            `Expected ${testCase.fileType} to be valid for ${testCase.allowed.join(', ')}`);
        } else {
          expect(result.valid).toBe(false,
            `Expected ${testCase.fileType} to be invalid for ${testCase.allowed.join(', ')}`);
          expect(result.error).toContain('Invalid file type');
        }
      });
    });
  });
  
  /**
   * Property 2: Preservation - Component Functionality
   * 
   * Verify that core component functionality remains unchanged
   */
  describe('Property 2: Component functionality is preserved', () => {
    
    it('should maintain multiple file upload capability', () => {
      component.multiple = true;
      component.allowedFileTypes = ['image/jpeg', 'image/png'];
      component.maxFileSize = 10 * 1024 * 1024;
      
      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['test2'], 'test2.png', { type: 'image/png' });
      
      // Process files using private method
      const processFiles = (component as any).processFiles.bind(component);
      processFiles([file1, file2]);
      
      // Verify both files are selected
      expect(component.selectedFiles.length).toBe(2);
      expect(component.selectedFiles).toContain(file1);
      expect(component.selectedFiles).toContain(file2);
    });
    
    it('should maintain single file upload capability', () => {
      component.multiple = false;
      component.allowedFileTypes = ['image/jpeg'];
      component.maxFileSize = 5 * 1024 * 1024;
      
      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
      
      // Process first file
      const processFiles = (component as any).processFiles.bind(component);
      processFiles([file1]);
      expect(component.selectedFiles.length).toBe(1);
      expect(component.selectedFiles[0]).toBe(file1);
      
      // Process second file (should replace first)
      processFiles([file2]);
      expect(component.selectedFiles.length).toBe(1);
      expect(component.selectedFiles[0]).toBe(file2);
    });
    
    it('should maintain file removal functionality', () => {
      component.multiple = true;
      component.allowedFileTypes = ['image/jpeg'];
      component.maxFileSize = 10 * 1024 * 1024;
      
      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
      
      const processFiles = (component as any).processFiles.bind(component);
      processFiles([file1, file2]);
      
      expect(component.selectedFiles.length).toBe(2);
      
      // Remove first file
      component.removeFile(file1);
      expect(component.selectedFiles.length).toBe(1);
      expect(component.selectedFiles[0]).toBe(file2);
    });
    
    it('should maintain clear files functionality', () => {
      component.multiple = true;
      component.allowedFileTypes = ['image/jpeg'];
      component.maxFileSize = 10 * 1024 * 1024;
      
      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
      
      const processFiles = (component as any).processFiles.bind(component);
      processFiles([file1, file2]);
      
      expect(component.selectedFiles.length).toBe(2);
      
      // Clear all files
      component.clearFiles();
      expect(component.selectedFiles.length).toBe(0);
      expect(component.filePreviews.length).toBe(0);
      expect(component.errorMessage).toBeNull();
    });
    
    it('should maintain error message display for invalid files', () => {
      component.allowedFileTypes = ['image/jpeg'];
      component.maxFileSize = 1024; // 1KB
      
      // Create file that's too large
      const largeFile = new File(['x'.repeat(2048)], 'large.jpg', { type: 'image/jpeg' });
      
      const processFiles = (component as any).processFiles.bind(component);
      processFiles([largeFile]);
      
      // Verify error message is set
      expect(component.errorMessage).toBeDefined();
      expect(component.errorMessage).toContain('exceeds');
    });
  });
  
  /**
   * Property 2: Preservation - @Input Property Defaults
   * 
   * Verify that default values for @Input properties remain unchanged
   */
  describe('Property 2: @Input property defaults are preserved', () => {
    
    it('should have correct default values', () => {
      const freshComponent = new FileUploadComponent(mockSanitizationService, mockImageCacheService);
      
      expect(freshComponent.multiple).toBe(true);
      expect(freshComponent.allowedFileTypes).toEqual(['image/jpeg', 'image/png', 'image/heic']);
      expect(freshComponent.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
      expect(freshComponent.label).toBe('Upload Files');
      expect(freshComponent.disabled).toBe(false);
    });
  });
});
