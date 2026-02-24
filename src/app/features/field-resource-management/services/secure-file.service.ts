import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environments';

/**
 * Secure File Service
 * 
 * Handles secure file uploads and downloads with proper validation.
 * Uses SAS tokens from backend for secure Azure Blob Storage access.
 * 
 * Requirements: 3.7, 9.3-9.7
 */
@Injectable({
  providedIn: 'root'
})
export class SecureFileService {
  private readonly apiUrl = `${environment.apiUrl}/files`;

  constructor(private http: HttpClient) {}

  /**
   * Upload file securely to Azure Blob Storage
   * Gets SAS token from backend and uploads directly to blob storage
   * 
   * @param file - The file to upload
   * @param jobId - The job ID to associate the file with
   * @returns Observable with upload result containing file URL
   */
  uploadFile(file: File, jobId: string): Observable<{ url: string; fileName: string }> {
    // First, get SAS token from backend
    return this.getSasTokenForUpload(file.name, jobId).pipe(
      map(response => {
        // Upload file to blob storage using SAS token
        this.uploadToBlobStorage(file, response.sasUrl);
        return {
          url: response.blobUrl,
          fileName: file.name
        };
      }),
      catchError(error => {
        console.error('File upload failed:', error);
        return throwError(() => new Error('Failed to upload file. Please try again.'));
      })
    );
  }

  /**
   * Get SAS token for file upload from backend
   * 
   * @param fileName - Name of the file to upload
   * @param jobId - Job ID to associate with the file
   * @returns Observable with SAS URL and blob URL
   */
  private getSasTokenForUpload(
    fileName: string,
    jobId: string
  ): Observable<{ sasUrl: string; blobUrl: string }> {
    return this.http.post<{ sasUrl: string; blobUrl: string }>(
      `${this.apiUrl}/upload-token`,
      { fileName, jobId }
    );
  }

  /**
   * Upload file directly to Azure Blob Storage using SAS URL
   * 
   * @param file - The file to upload
   * @param sasUrl - The SAS URL from backend
   */
  private uploadToBlobStorage(file: File, sasUrl: string): void {
    const headers = new HttpHeaders({
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': file.type
    });

    this.http.put(sasUrl, file, { headers }).subscribe({
      next: () => console.log('File uploaded successfully'),
      error: (error) => console.error('Blob upload failed:', error)
    });
  }

  /**
   * Get secure download URL for a file
   * Backend generates a time-limited SAS token for download
   * 
   * @param fileId - The file ID to download
   * @returns Observable with secure download URL
   */
  getSecureDownloadUrl(fileId: string): Observable<string> {
    return this.http.get<{ downloadUrl: string }>(
      `${this.apiUrl}/download-token/${fileId}`
    ).pipe(
      map(response => response.downloadUrl),
      catchError(error => {
        console.error('Failed to get download URL:', error);
        return throwError(() => new Error('Failed to get download URL. Please try again.'));
      })
    );
  }

  /**
   * Download file securely using SAS token
   * 
   * @param fileId - The file ID to download
   * @param fileName - The name to save the file as
   */
  downloadFile(fileId: string, fileName: string): void {
    this.getSecureDownloadUrl(fileId).subscribe({
      next: (downloadUrl) => {
        // Create temporary link and trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      error: (error) => {
        console.error('Download failed:', error);
      }
    });
  }

  /**
   * Delete file from storage
   * 
   * @param fileId - The file ID to delete
   * @returns Observable indicating success
   */
  deleteFile(fileId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${fileId}`).pipe(
      catchError(error => {
        console.error('File deletion failed:', error);
        return throwError(() => new Error('Failed to delete file. Please try again.'));
      })
    );
  }

  /**
   * Validate file before upload
   * Checks file type, size, and name
   * 
   * @param file - The file to validate
   * @returns Validation result
   */
  validateFileForUpload(file: File): { valid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: JPEG, PNG, HEIC. Received: ${file.type}`
      };
    }

    // Check file size (10 MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds 10 MB limit. File size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`
      };
    }

    // Check file extension
    const extension = this.getFileExtension(file.name);
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'heic'];
    if (!allowedExtensions.includes(extension.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`
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
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Check if filename contains suspicious characters
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

    // Check for executable extensions
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
   * Get human-readable file size
   */
  getFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Check if file is an image
   */
  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Generate safe preview URL for image
   * Uses blob URL for local preview before upload
   */
  generatePreviewUrl(file: File): string {
    if (!this.isImageFile(file)) {
      return '';
    }
    return URL.createObjectURL(file);
  }

  /**
   * Revoke preview URL to free memory
   */
  revokePreviewUrl(url: string): void {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}
