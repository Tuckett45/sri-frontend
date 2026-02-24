import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SanitizationService } from '../../../services/sanitization.service';

/**
 * File Upload Component
 * 
 * A reusable file upload component with drag-and-drop support, validation, and preview.
 * 
 * Features:
 * - Drag-and-drop file upload
 * - File type validation (JPEG, PNG, HEIC)
 * - File size validation (10 MB limit)
 * - Upload progress indicator
 * - Image preview for uploaded images
 * - Multiple file uploads
 * - Error message display
 * - Security validation for malicious content
 * 
 * Requirements: 3.7, 9.3-9.7
 * 
 * @example
 * <frm-file-upload
 *   [multiple]="true"
 *   (filesSelected)="onFilesSelected($event)">
 * </frm-file-upload>
 */
@Component({
  selector: 'frm-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
  @Input() multiple = true;
  @Input() acceptedTypes = ['image/jpeg', 'image/png', 'image/heic'];
  @Input() maxSizeBytes = 10 * 1024 * 1024; // 10 MB
  @Input() label = 'Upload Files';
  
  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() uploadProgress = new EventEmitter<number>();
  @Output() uploadError = new EventEmitter<string>();

  selectedFiles: File[] = [];
  filePreviews: { file: File; preview: string }[] = [];
  isDragging = false;
  errorMessage: string | null = null;
  uploadProgressValue = 0;

  constructor(private sanitizationService: SanitizationService) {}

  /**
   * Handle file selection from input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(Array.from(input.files));
    }
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  /**
   * Handle file drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files) {
      this.processFiles(Array.from(event.dataTransfer.files));
    }
  }

  /**
   * Process and validate selected files
   */
  private processFiles(files: File[]): void {
    this.errorMessage = null;
    
    // Use sanitization service to validate all files
    const validation = this.sanitizationService.validateFiles(files);

    if (validation.errors.length > 0) {
      // Show first error
      this.errorMessage = validation.errors[0];
      this.uploadError.emit(this.errorMessage);
      return;
    }

    if (validation.validFiles.length > 0) {
      // Generate previews for valid files
      validation.validFiles.forEach(file => this.generatePreview(file));
      
      this.selectedFiles = this.multiple 
        ? [...this.selectedFiles, ...validation.validFiles]
        : validation.validFiles;
      this.filesSelected.emit(this.selectedFiles);
    }
  }

  /**
   * Validate file type and size (legacy method - now uses sanitization service)
   * @deprecated Use sanitizationService.validateFile instead
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    return this.sanitizationService.validateFile(file);
  }

  /**
   * Generate preview for image files
   */
  private generatePreview(file: File): void {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.filePreviews.push({
          file,
          preview: e.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Remove file from selection
   */
  removeFile(file: File): void {
    this.selectedFiles = this.selectedFiles.filter(f => f !== file);
    this.filePreviews = this.filePreviews.filter(p => p.file !== file);
    this.filesSelected.emit(this.selectedFiles);
  }

  /**
   * Clear all selected files
   */
  clearFiles(): void {
    this.selectedFiles = [];
    this.filePreviews = [];
    this.errorMessage = null;
    this.uploadProgressValue = 0;
    this.filesSelected.emit([]);
  }

  /**
   * Check if file has a preview
   */
  hasPreview(file: File): boolean {
    return this.filePreviews.some(p => p.file === file);
  }

  /**
   * Get preview for file
   */
  getPreview(file: File): string | null {
    const preview = this.filePreviews.find(p => p.file === file);
    return preview ? preview.preview : null;
  }

  /**
   * Get file size in human-readable format
   */
  getFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Simulate upload progress (for demonstration)
   * In real implementation, this would be driven by actual upload progress
   */
  simulateUploadProgress(): void {
    this.uploadProgressValue = 0;
    const interval = setInterval(() => {
      this.uploadProgressValue += 10;
      this.uploadProgress.emit(this.uploadProgressValue);
      if (this.uploadProgressValue >= 100) {
        clearInterval(interval);
      }
    }, 200);
  }
}
