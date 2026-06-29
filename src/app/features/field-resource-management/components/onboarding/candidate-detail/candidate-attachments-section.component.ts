import { Component, Input, OnInit } from '@angular/core';
import { AttachmentService, Attachment, AttachmentCategory } from '../../../services/attachment.service';

@Component({
  selector: 'app-candidate-attachments-section',
  template: `
    <div class="attachments-section">
      <div class="section-header">
        <h3>Attachments</h3>
        <button class="btn-upload" (click)="showUploadForm = !showUploadForm">
          {{ showUploadForm ? 'Cancel' : '+ Upload' }}
        </button>
      </div>

      <!-- Upload Form -->
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
  `]
})
export class CandidateAttachmentsSectionComponent implements OnInit {
  @Input() candidateId!: string;

  attachments: Attachment[] = [];
  loading = false;
  uploading = false;
  showUploadForm = false;
  selectedCategory: AttachmentCategory | '' = '';
  selectedFile: File | null = null;
  filterCategory: AttachmentCategory | '' = '';
  uploadError = '';

  constructor(private attachmentService: AttachmentService) {}

  ngOnInit(): void {
    this.loadAttachments();
  }

  loadAttachments(): void {
    this.loading = true;
    const category = this.filterCategory || undefined;
    this.attachmentService.getCandidateAttachments(this.candidateId, category).subscribe({
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

    this.attachmentService.uploadCandidateAttachment(this.candidateId, this.selectedFile, this.selectedCategory as AttachmentCategory).subscribe({
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
    this.attachmentService.downloadCandidateAttachment(this.candidateId, attachment.id).subscribe({
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
    this.attachmentService.deleteCandidateAttachment(this.candidateId, attachment.id).subscribe({
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
