import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SanitizationService } from '../../../services/sanitization.service';
import { ImageCacheService } from '../../../services/image-cache.service';

/**
 * File Upload Component
 * 
 * A reusable file upload component with drag-and-drop support, validation, and preview.
 * Implements ControlValueAccessor for seamless integration with Angular forms.
 * 
 * Features:
 * - Drag-and-drop file upload
 * - Click-to-browse file selection
 * - File type validation (configurable)
 * - File size validation (configurable)
 * - Upload progress indicator
 * - Image preview/thumbnail for uploaded images
 * - Multiple file uploads (configurable)
 * - Error message display
 * - Security validation for malicious content
 * - Form control integration (ControlValueAccessor)
 * - Accessible keyboard navigation
 * - ARIA labels for screen readers
 * 
 * Requirements: 1.2.4, 3.7, 9.3-9.7
 * 
 * @example
 * // Standalone usage
 * <frm-file-upload
 *   [multiple]="true"
 *   [allowedFileTypes]="['image/jpeg', 'image/png']"
 *   [maxFileSize]="5242880"
 *   (filesSelected)="onFilesSelected($event)">
 * </frm-file-upload>
 * 
 * @example
 * // Form control usage
 * <frm-file-upload
 *   formControlName="certificationDocuments"
 *   [multiple]="true">
 * </frm-file-upload>
 */
@Component({
  selector: 'frm-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUploadComponent),
      multi: true
    }
  ]
})
export class FileUploadComponent implements ControlValueAccessor {
  @Input() multiple = true;
  @Input() allowedFileTypes = ['image/jpeg', 'image/png', 'image/heic'];
  @Input() maxFileSize = 10 * 1024 * 1024; // 10 MB
  @Input() label = 'Upload Files';
  @Input() disabled = false;
  
  @Output() fileSelected = new EventEmitter<File>();
  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() uploadProgress = new EventEmitter<number>();
  @Output() uploadError = new EventEmitter<string>();

  selectedFiles: File[] = [];
  filePreviews: { file: File; preview: string }[] = [];
  isDragging = false;
  errorMessage: string | null = null;
  uploadProgressValue = 0;

  private onChange: (value: File[] | File | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private sanitizationService: SanitizationService,
    private imageCacheService: ImageCacheService
  ) {}

  /**
   * Handle file selection from input
   */
  onFileSelected(event: Event): void {
    if (this.disabled) return;
    
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(Array.from(input.files));
    }
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    if (this.disabled) return;
    
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
    if (this.disabled) return;
    
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files) {
      this.processFiles(Array.from(event.dataTransfer.files));
    }
  }

  /**
   * Handle keyboard activation (Enter/Space on dropzone)
   */
  onKeyDown(event: KeyboardEvent, fileInput: HTMLInputElement): void {
    if (this.disabled) return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  }

  /**
   * Process and validate selected files
   */
  private processFiles(files: File[]): void {
    this.errorMessage = null;
    
    // Validate files using custom validation
    const validationResults = files.map(file => this.validateFile(file));
    const errors = validationResults
      .filter(result => !result.valid)
      .map(result => result.error!);
    
    if (errors.length > 0) {
      // Show first error
      this.errorMessage = errors[0];
      this.uploadError.emit(this.errorMessage);
      return;
    }

    const validFiles = files.filter((_, index) => validationResults[index].valid);

    if (validFiles.length > 0) {
      // Generate previews for valid files
      validFiles.forEach(file => this.generatePreview(file));
      
      if (this.multiple) {
        this.selectedFiles = [...this.selectedFiles, ...validFiles];
      } else {
        // Single file mode: replace existing file
        this.selectedFiles = [validFiles[0]];
        this.filePreviews = [];
        this.generatePreview(validFiles[0]);
      }
      
      this.emitChanges();
    }
  }

  /**
   * Emit changes to parent and form control
   */
  private emitChanges(): void {
    const value = this.multiple ? this.selectedFiles : (this.selectedFiles[0] || null);
    
    this.onChange(value);
    this.onTouched();
    
    // Emit individual events for backward compatibility
    if (!this.multiple && this.selectedFiles[0]) {
      this.fileSelected.emit(this.selectedFiles[0]);
    }
    this.filesSelected.emit(this.selectedFiles);
  }

  /**
   * Validate file type and size
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    // Check file type
    if (!this.allowedFileTypes.includes(file.type.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid file type: ${file.name}. Allowed types: ${this.getAllowedTypesDisplay()}`
      };
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      const maxSizeMB = (this.maxFileSize / (1024 * 1024)).toFixed(1);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB} MB limit: ${file.name} (${fileSizeMB} MB)`
      };
    }

    // Use sanitization service for additional security checks
    const sanitizationResult = this.sanitizationService.validateFile(file);
    if (!sanitizationResult.valid) {
      return sanitizationResult;
    }

    return { valid: true };
  }

  /**
   * Get display string for allowed file types
   */
  private getAllowedTypesDisplay(): string {
    return this.allowedFileTypes
      .map(type => type.split('/')[1].toUpperCase())
      .join(', ');
  }

  /**
   * Generate preview for image files and cache them
   */
  private generatePreview(file: File): void {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        this.filePreviews.push({
          file,
          preview
        });
        
        // Cache the image for offline access
        const identifier = `upload-${Date.now()}-${file.name}`;
        this.imageCacheService.cacheFile(file, identifier).subscribe({
          next: () => {
            console.log(`[FileUpload] Cached image: ${file.name}`);
          },
          error: (err) => {
            console.warn(`[FileUpload] Failed to cache image: ${file.name}`, err);
          }
        });
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Remove file from selection
   */
  removeFile(file: File): void {
    if (this.disabled) return;
    
    this.selectedFiles = this.selectedFiles.filter(f => f !== file);
    this.filePreviews = this.filePreviews.filter(p => p.file !== file);
    this.emitChanges();
  }

  /**
   * Clear all selected files
   */
  clearFiles(): void {
    if (this.disabled) return;
    
    this.selectedFiles = [];
    this.filePreviews = [];
    this.errorMessage = null;
    this.uploadProgressValue = 0;
    this.emitChanges();
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
   * Get accepted file types for input element
   */
  get acceptAttribute(): string {
    return this.allowedFileTypes.join(',');
  }

  /**
   * Get hint text for allowed file types and size
   */
  get hintText(): string {
    const types = this.getAllowedTypesDisplay();
    const maxSize = this.getFileSize(this.maxFileSize);
    return `Accepted: ${types} (Max ${maxSize})`;
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

  // ControlValueAccessor implementation
  writeValue(value: File[] | File | null): void {
    if (value === null || value === undefined) {
      this.selectedFiles = [];
      this.filePreviews = [];
    } else if (Array.isArray(value)) {
      this.selectedFiles = value;
      this.filePreviews = [];
      value.forEach(file => this.generatePreview(file));
    } else {
      this.selectedFiles = [value];
      this.filePreviews = [];
      this.generatePreview(value);
    }
  }

  registerOnChange(fn: (value: File[] | File | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
