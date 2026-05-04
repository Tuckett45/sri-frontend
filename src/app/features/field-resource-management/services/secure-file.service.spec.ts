import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { SecureFileService } from './secure-file.service';
import { environment } from '../../../../environments/environments';

describe('SecureFileService', () => {
  let service: SecureFileService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/files`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SecureFileService]
    });
    service = TestBed.inject(SecureFileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateFileForUpload', () => {
    it('should accept valid JPEG file', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = service.validateFileForUpload(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid PNG file', () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const result = service.validateFileForUpload(file);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid file type', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = service.validateFileForUpload(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject file exceeding size limit', () => {
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const result = service.validateFileForUpload(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds');
    });

    it('should reject file with invalid extension', () => {
      const file = new File(['content'], 'test.exe', { type: 'image/jpeg' });
      const result = service.validateFileForUpload(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file extension');
    });

    it('should reject file with path traversal in name', () => {
      const file = new File(['content'], '../../../etc/passwd.jpg', { type: 'image/jpeg' });
      const result = service.validateFileForUpload(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('suspicious');
    });

    it('should reject file with executable extension in name', () => {
      const file = new File(['content'], 'image.exe.jpg', { type: 'image/jpeg' });
      const result = service.validateFileForUpload(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('suspicious');
    });
  });

  describe('getSecureDownloadUrl', () => {
    it('should get secure download URL', () => {
      const fileId = 'file123';
      const mockResponse = { downloadUrl: 'https://blob.storage/file?sas=token' };

      service.getSecureDownloadUrl(fileId).subscribe(url => {
        expect(url).toBe(mockResponse.downloadUrl);
      });

      const req = httpMock.expectOne(`${apiUrl}/download-token/${fileId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle error when getting download URL', () => {
      const fileId = 'file123';

      service.getSecureDownloadUrl(fileId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Failed to get download URL');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/download-token/${fileId}`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('deleteFile', () => {
    it('should delete file', () => {
      const fileId = 'file123';

      service.deleteFile(fileId).subscribe(() => {
        expect(true).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/${fileId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle error when deleting file', () => {
      const fileId = 'file123';

      service.deleteFile(fileId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Failed to delete file');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${fileId}`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('utility methods', () => {
    it('should get file size in human-readable format', () => {
      expect(service.getFileSize(500)).toBe('500 B');
      expect(service.getFileSize(1024)).toBe('1.0 KB');
      expect(service.getFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(service.getFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    });

    it('should check if file is an image', () => {
      const imageFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      expect(service.isImageFile(imageFile)).toBe(true);
      expect(service.isImageFile(pdfFile)).toBe(false);
    });

    it('should generate preview URL for image', () => {
      const imageFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const url = service.generatePreviewUrl(imageFile);
      
      expect(url).toContain('blob:');
      
      // Clean up
      service.revokePreviewUrl(url);
    });

    it('should not generate preview URL for non-image', () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const url = service.generatePreviewUrl(pdfFile);
      
      expect(url).toBe('');
    });
  });
});
