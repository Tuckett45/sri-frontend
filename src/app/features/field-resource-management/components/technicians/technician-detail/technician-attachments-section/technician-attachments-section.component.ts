import { Component, Input, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AttachmentService, Attachment, AttachmentCategory } from '../../../../services/attachment.service';

@Component({
  selector: 'app-technician-attachments-section',
  template: `
    <div class="attachments-section">
      <div class="section-header">
        <h3>Attachments</h3>
        <button class="btn-upload" (click)="showUploadForm = !showUploadForm">
          {{ showUploadForm ? 'Cancel' : '+ Upload' }}
        </button>
      </div>

      <!-- Drag & Drop Zone -->
      <div class="drop-zone"
           [class.drag-over]="isDragOver"
           (dragover)="onDragOver($event)"
           (dragleave)="onDragLeave($event)"
           (drop)="onDrop($event)">
        <div class="drop-zone-content">
          <span class="drop-icon">📂</span>
          <p class="drop-text" *ngIf="!isDragOver">Drag &amp; drop files here to upload</p>
          <p class="drop-text drop-text-active" *ngIf="isDragOver">Drop files to upload</p>
          <p class="drop-hint">PDF, DOC, DOCX, JPG, PNG accepted</p>
        </div>
      </div>

      <!-- Dropped Files Pending Category Selection -->
      <div *ngIf="droppedFiles.length > 0" class="dropped-files-form">
        <h4 class="dropped-files-title">Files ready to upload ({{ droppedFiles.length }})</h4>
        <div class="dropped-file-item" *ngFor="let df of droppedFiles; let i = index">
          <span class="dropped-file-name">{{ df.file.name }} ({{ formatFileSize(df.file.size) }})</span>
          <select [(ngModel)]="df.category" class="category-select">
            <option value="" disabled>Select Category</option>
            <option value="certification">Certification</option>
            <option value="drug_screen">Drug Screen</option>
            <option value="background_check">Background Check</option>
            <option value="other">Other</option>
          </select>
          <button class="btn-remove-file" (click)="removeDroppedFile(i)">&times;</button>
        </div>
        <div class="dropped-files-actions">
          <button class="btn-submit-upload" (click)="uploadDroppedFiles()"
                  [disabled]="!allDroppedFilesHaveCategory() || uploading">
            {{ uploading ? 'Uploading...' : 'Upload All' }}
          </button>
          <button class="btn-clear-dropped" (click)="clearDroppedFiles()">Clear All</button>
        </div>
        <p *ngIf="uploadError" class="upload-error">{{ uploadError }}</p>
      </div>

      <!-- Upload Form (traditional) -->
      <div *ngIf="showUploadForm" class="upload-form">
        <div class="upload-row">
          <select [(ngModel)]="selectedCategory" class="category-select">
            <option value="" disabled>Select Category</option>
            <option value="certification">Certification</option>
            <option value="drug_screen">Drug Screen</option>
            <option value="background_check">Background Check</option>
            <option value="other">Other</option>
          </select>
          <input type="file" #fileInput (change)="onFileSelected($event)"
                 accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="file-input" />
          <button class="btn-submit-upload" (click)="uploadFile()"
                  [disabled]="!selectedFile || !selectedCategory || uploading">
            {{ uploading ? 'Uploading...' : 'Upload' }}
          </button>
        </div>
        <p *ngIf="uploadError" class="upload-error">{{ uploadError }}</p>
      </div>

      <!-- Category Filter -->
      <div class="filter-row">
        <select [(ngModel)]="filterCategory" (ngModelChange)="loadAttachments()" class="filter-select">
          <option value="">All Categories</option>
          <option value="certification">Certification</option>
          <option value="drug_screen">Drug Screen</option>
          <option value="background_check">Background Check</option>
          <option value="other">Other</option>
        </select>
      </div>

      <!-- Attachments List -->
      <div *ngIf="loading" class="loading">Loading attachments...</div>

      <div *ngIf="!loading && attachments.length === 0" class="empty-state">
        No attachments uploaded yet.
      </div>

      <table *ngIf="!loading && attachments.length > 0" class="attachments-table">
        <thead>
          <tr>
            <th>File Name</th>
            <th>Category</th>
            <th>Size</th>
            <th>Uploaded</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let attachment of attachments">
            <td class="file-name-cell">
              <span class="file-icon">{{ getFileIcon(attachment.contentType) }}</span>
              {{ attachment.fileName }}
            </td>
            <td><span class="category-badge" [ngClass]="'cat-' + attachment.category">{{ getCategoryLabel(attachment.category) }}</span></td>
            <td>{{ formatFileSize(attachment.fileSize) }}</td>
            <td>{{ attachment.uploadedAt | date:'short' }}</td>
            <td class="actions-cell">
              <button class="btn-action btn-download" (click)="downloadAttachment(attachment)">Download</button>
              <button class="btn-action btn-delete" (click)="deleteAttachment(attachment)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .attachments-section { margin-bottom: 1.5rem; }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
    .section-header h3 { font-size: 0.875rem; font-weight: 600; text-transform: uppercase; color: #616161; letter-spacing: 0.5px; margin: 0; }
    .btn-upload { padding: 0.375rem 0.75rem; background: #1976d2; color: #fff; border: none; border-radius: 4px; font-size: 0.8125rem; font-weight: 500; cursor: pointer; }
    .btn-upload:hover { background: #1565c0; }

    .upload-form { padding: 0.75rem; background: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 0.75rem; }
    .upload-row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .category-select, .filter-select { padding: 0.375rem 0.5rem; border: 1px solid #bdbdbd; border-radius: 4px; font-size: 0.8125rem; }
    .file-input { font-size: 0.8125rem; }
    .btn-submit-upload { padding: 0.375rem 0.75rem; background: #388e3c; color: #fff; border: none; border-radius: 4px; font-size: 0.8125rem; cursor: pointer; }
    .btn-submit-upload:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-submit-upload:hover:not(:disabled) { background: #2e7d32; }
    .upload-error { color: #c62828; font-size: 0.8125rem; margin: 0.5rem 0 0; }

    .filter-row { margin-bottom: 0.75rem; }
    .loading, .empty-state { padding: 1rem; text-align: center; color: #757575; font-size: 0.875rem; }

    .attachments-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .attachments-table thead th { text-align: left; padding: 0.5rem 0.75rem; background: #f5f5f5; border-bottom: 2px solid #e0e0e0; font-weight: 600; color: #424242; }
    .attachments-table tbody td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #e0e0e0; color: #212121; }

    .file-name-cell { display: flex; align-items: center; gap: 0.375rem; }
    .file-icon { font-size: 1rem; }

    .category-badge { padding: 0.125rem 0.5rem; border-radius: 12px; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; }
    .cat-certification { background: #e3f2fd; color: #1565c0; }
    .cat-drug_screen { background: #f3e5f5; color: #6a1b9a; }
    .cat-background_check { background: #fff3e0; color: #e65100; }
    .cat-other { background: #f5f5f5; color: #616161; }

    .actions-cell { white-space: nowrap; }
    .btn-action { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; cursor: pointer; margin-right: 4px; }
    .btn-download { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
    .btn-download:hover { background: #bbdefb; }
    .btn-delete { background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; }
    .btn-delete:hover { background: #ffcdd2; }

    /* Drag & Drop */
    .drop-zone {
      border: 2px dashed #bdbdbd;
      border-radius: 8px;
      padding: 1.25rem;
      text-align: center;
      margin-bottom: 0.75rem;
      transition: all 0.2s ease;
      cursor: pointer;
      background: #fafafa;
    }
    .drop-zone:hover { border-color: #90caf9; background: #f5faff; }
    .drop-zone.drag-over { border-color: #1976d2; background: #e3f2fd; }
    .drop-zone-content { pointer-events: none; }
    .drop-icon { font-size: 1.5rem; display: block; margin-bottom: 0.25rem; }
    .drop-text { margin: 0; font-size: 0.875rem; font-weight: 500; color: #424242; }
    .drop-text-active { color: #1976d2; }
    .drop-hint { margin: 0.25rem 0 0; font-size: 0.75rem; color: #9e9e9e; }

    /* Dropped files pending upload */
    .dropped-files-form { padding: 0.75rem; background: #f5f7fa; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 0.75rem; }
    .dropped-files-title { font-size: 0.8125rem; font-weight: 600; color: #424242; margin: 0 0 0.5rem; }
    .dropped-file-item { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.375rem; flex-wrap: wrap; }
    .dropped-file-name { font-size: 0.8125rem; color: #212121; min-width: 150px; flex: 1; }
    .btn-remove-file { background: none; border: none; color: #c62828; font-size: 1.125rem; cursor: pointer; padding: 0 0.25rem; line-height: 1; }
    .btn-remove-file:hover { color: #b71c1c; }
    .dropped-files-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .btn-clear-dropped { padding: 0.375rem 0.75rem; background: #f5f5f5; color: #616161; border: 1px solid #bdbdbd; border-radius: 4px; font-size: 0.8125rem; cursor: pointer; }
    .btn-clear-dropped:hover { background: #e0e0e0; }
  `]
})
export class TechnicianAttachmentsSectionComponent implements OnInit {
  @Input() technicianId!: string;

  attachments: Attachment[] = [];
  loading = false;
  uploading = false;
  showUploadForm = false;
  selectedCategory: AttachmentCategory | '' = '';
  selectedFile: File | null = null;
  filterCategory: AttachmentCategory | '' = '';
  uploadError = '';

  // Drag & drop state
  isDragOver = false;
  droppedFiles: { file: File; category: AttachmentCategory | '' }[] = [];

  private readonly allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ];

  constructor(private attachmentService: AttachmentService) {}

  ngOnInit(): void {
    this.loadAttachments();
  }

  // ---------------------------------------------------------------------------
  // Drag & Drop
  // ---------------------------------------------------------------------------

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    this.uploadError = '';

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (this.isFileTypeAllowed(file)) {
        this.droppedFiles.push({ file, category: '' });
      }
    }

    if (this.droppedFiles.length === 0) {
      this.uploadError = 'No valid files detected. Accepted: PDF, DOC, DOCX, JPG, PNG.';
    }
  }

  removeDroppedFile(index: number): void {
    this.droppedFiles.splice(index, 1);
  }

  clearDroppedFiles(): void {
    this.droppedFiles = [];
    this.uploadError = '';
  }

  allDroppedFilesHaveCategory(): boolean {
    return this.droppedFiles.length > 0 && this.droppedFiles.every(df => !!df.category);
  }

  uploadDroppedFiles(): void {
    if (!this.allDroppedFilesHaveCategory()) return;
    this.uploading = true;
    this.uploadError = '';

    const uploads = this.droppedFiles.map(df =>
      this.attachmentService.uploadTechnicianAttachment(this.technicianId, df.file, df.category as AttachmentCategory)
    );

    forkJoin(uploads).subscribe({
      next: () => {
        this.uploading = false;
        this.droppedFiles = [];
        this.loadAttachments();
      },
      error: (err) => {
        this.uploading = false;
        this.uploadError = err?.message || 'One or more uploads failed. Please try again.';
        this.loadAttachments();
      }
    });
  }

  private isFileTypeAllowed(file: File): boolean {
    if (this.allowedTypes.includes(file.type)) return true;
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(ext || '');
  }

  loadAttachments(): void {
    this.loading = true;
    const category = this.filterCategory || undefined;
    this.attachmentService.getTechnicianAttachments(this.technicianId, category).subscribe({
      next: (attachments) => {
        this.attachments = attachments;
        this.loading = false;
      },
      error: () => {
        this.attachments = [];
        this.loading = false;
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
    this.uploadError = '';
  }

  uploadFile(): void {
    if (!this.selectedFile || !this.selectedCategory) return;
    this.uploading = true;
    this.uploadError = '';

    this.attachmentService.uploadTechnicianAttachment(this.technicianId, this.selectedFile, this.selectedCategory as AttachmentCategory).subscribe({
      next: () => {
        this.uploading = false;
        this.showUploadForm = false;
        this.selectedFile = null;
        this.selectedCategory = '';
        this.loadAttachments();
      },
      error: (err) => {
        this.uploading = false;
        this.uploadError = err?.message || 'Upload failed. Please try again.';
      }
    });
  }

  downloadAttachment(attachment: Attachment): void {
    this.attachmentService.downloadTechnicianAttachment(this.technicianId, attachment.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert('Failed to download file.')
    });
  }

  deleteAttachment(attachment: Attachment): void {
    if (!confirm(`Delete "${attachment.fileName}"? This cannot be undone.`)) return;
    this.attachmentService.deleteTechnicianAttachment(this.technicianId, attachment.id).subscribe({
      next: () => this.loadAttachments(),
      error: () => alert('Failed to delete attachment.')
    });
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      certification: 'Certification',
      drug_screen: 'Drug Screen',
      background_check: 'Background Check',
      other: 'Other'
    };
    return labels[category] || category;
  }

  getFileIcon(contentType: string): string {
    if (contentType?.includes('pdf')) return '📄';
    if (contentType?.includes('image')) return '🖼️';
    if (contentType?.includes('word') || contentType?.includes('doc')) return '📝';
    return '📎';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
