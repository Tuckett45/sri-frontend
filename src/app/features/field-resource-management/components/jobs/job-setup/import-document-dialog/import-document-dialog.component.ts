import { Component, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { JobDocumentImportService } from '../../../../services/job-document-import.service';
import { DocumentParserService } from '../../../../services/document-parser.service';
import {
  ParsedJobDocument
} from '../../../../models/job-document-import.model';

export interface ImportDocumentDialogResult {
  parsed: ParsedJobDocument;
  warnings?: string[];
}

/**
 * Dialog for importing job documentation files.
 *
 * Allows users to upload a job one-pager (PDF, DOCX, TXT) which is then
 * parsed by the backend to extract structured job data. The extracted data
 * is returned to the parent component to pre-populate the Job Setup form.
 */
@Component({
  selector: 'app-import-document-dialog',
  template: `
    <h2 mat-dialog-title>Import Job Documentation</h2>

    <mat-dialog-content>
      <p class="description">
        Upload a job one-pager or documentation file to auto-fill the setup form.
        Supported formats: PDF, DOCX, TXT.
      </p>

      <!-- Drop Zone -->
      <div
        class="drop-zone"
        [class.dragging]="isDragging"
        [class.has-file]="selectedFile"
        [class.error]="errorMessage"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
        role="button"
        tabindex="0"
        [attr.aria-label]="selectedFile ? 'File selected: ' + selectedFile.name : 'Click or drag to upload a document'"
        (keydown.enter)="fileInput.click()"
        (keydown.space)="fileInput.click()"
      >
        <input
          #fileInput
          type="file"
          [accept]="acceptedExtensions"
          (change)="onFileSelected($event)"
          hidden
          aria-hidden="true"
        />

        <div *ngIf="!selectedFile && !isUploading" class="drop-zone-content">
          <mat-icon class="upload-icon">cloud_upload</mat-icon>
          <span class="drop-text">Drag & drop your document here</span>
          <span class="drop-subtext">or click to browse</span>
          <span class="file-types">PDF, DOCX, TXT (max 25 MB)</span>
        </div>

        <div *ngIf="selectedFile && !isUploading && !parseComplete" class="file-info">
          <mat-icon class="file-icon">description</mat-icon>
          <div class="file-details">
            <span class="file-name">{{ selectedFile.name }}</span>
            <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
          </div>
          <button
            mat-icon-button
            (click)="removeFile($event)"
            aria-label="Remove file"
            class="remove-btn"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Upload Progress -->
      <div *ngIf="isUploading" class="progress-section">
        <mat-progress-bar
          mode="indeterminate"
        ></mat-progress-bar>
        <span class="progress-text">
          Parsing document...
        </span>
      </div>

      <!-- Parse Complete -->
      <div *ngIf="parseComplete && parsedResult" class="result-section">
        <mat-icon class="success-icon">check_circle</mat-icon>
        <span class="success-text">Document parsed successfully</span>

        <div class="extracted-summary">
          <h4>Extracted Fields:</h4>
          <ul>
            <li *ngIf="parsedResult.clientName">
              <strong>Client:</strong> {{ parsedResult.clientName }}
            </li>
            <li *ngIf="parsedResult.siteName">
              <strong>Site:</strong> {{ parsedResult.siteName }}
            </li>
            <li *ngIf="parsedResult.siteAddress?.city">
              <strong>Location:</strong>
              {{ parsedResult.siteAddress?.city }}, {{ parsedResult.siteAddress?.state }}
            </li>
            <li *ngIf="parsedResult.siteLead?.name">
              <strong>Site Lead:</strong> {{ parsedResult.siteLead?.name }}
            </li>
            <li *ngIf="parsedResult.scopeOfWork">
              <strong>Scope:</strong> {{ parsedResult.scopeOfWork | slice:0:80 }}...
            </li>
            <li *ngIf="parsedResult.perDiem">
              <strong>Per Diem:</strong> \${{ parsedResult.perDiem }}/day
            </li>
            <li *ngIf="parsedResult.contacts?.length">
              <strong>Contacts:</strong> {{ parsedResult.contacts?.length }} found
            </li>
          </ul>
        </div>

        <div *ngIf="warnings.length" class="warnings-section">
          <mat-icon class="warning-icon">warning</mat-icon>
          <div class="warning-list">
            <span *ngFor="let w of warnings" class="warning-item">{{ w }}</span>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div *ngIf="errorMessage" class="error-section">
        <mat-icon class="error-icon">error</mat-icon>
        <span class="error-text">{{ errorMessage }}</span>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="!selectedFile || isUploading || parseComplete"
        (click)="onUpload()"
      >
        <mat-icon>upload</mat-icon>
        Parse Document
      </button>
      <button
        *ngIf="parseComplete"
        mat-raised-button
        color="primary"
        (click)="onApply()"
      >
        <mat-icon>check</mat-icon>
        Apply to Form
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .description {
      color: rgba(0, 0, 0, 0.6);
      margin-bottom: 16px;
      font-size: 14px;
    }

    .drop-zone {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 32px 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .drop-zone:hover,
    .drop-zone.dragging {
      border-color: #3f51b5;
      background-color: rgba(63, 81, 181, 0.04);
    }

    .drop-zone.has-file {
      border-color: #4caf50;
      border-style: solid;
    }

    .drop-zone.error {
      border-color: #f44336;
    }

    .drop-zone-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .upload-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #9e9e9e;
    }

    .drop-text {
      font-size: 16px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.87);
    }

    .drop-subtext {
      font-size: 13px;
      color: rgba(0, 0, 0, 0.54);
    }

    .file-types {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.38);
      margin-top: 4px;
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 0 8px;
    }

    .file-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #3f51b5;
    }

    .file-details {
      display: flex;
      flex-direction: column;
      flex: 1;
      text-align: left;
    }

    .file-name {
      font-weight: 500;
      font-size: 14px;
      word-break: break-all;
    }

    .file-size {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.54);
    }

    .remove-btn {
      color: rgba(0, 0, 0, 0.54);
    }

    .progress-section {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .progress-text {
      font-size: 13px;
      color: rgba(0, 0, 0, 0.6);
      text-align: center;
    }

    .result-section {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .success-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #4caf50;
    }

    .success-text {
      font-size: 16px;
      font-weight: 500;
      color: #4caf50;
    }

    .extracted-summary {
      width: 100%;
      margin-top: 12px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .extracted-summary h4 {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 600;
      color: rgba(0, 0, 0, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .extracted-summary ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .extracted-summary li {
      padding: 4px 0;
      font-size: 14px;
      border-bottom: 1px solid #e0e0e0;
    }

    .extracted-summary li:last-child {
      border-bottom: none;
    }

    .warnings-section {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-top: 12px;
      padding: 8px 12px;
      background: #fff3e0;
      border-radius: 4px;
      width: 100%;
    }

    .warning-icon {
      color: #ff9800;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .warning-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .warning-item {
      font-size: 13px;
      color: rgba(0, 0, 0, 0.7);
    }

    .error-section {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 12px;
      background: #ffebee;
      border-radius: 4px;
    }

    .error-icon {
      color: #f44336;
    }

    .error-text {
      font-size: 14px;
      color: #c62828;
    }

    mat-dialog-actions button mat-icon {
      margin-right: 4px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `]
})
export class ImportDocumentDialogComponent implements OnDestroy {
  selectedFile: File | null = null;
  isDragging = false;
  isUploading = false;
  uploadProgress = 0;
  parseComplete = false;
  parsedResult: ParsedJobDocument | null = null;
  warnings: string[] = [];
  errorMessage: string | null = null;

  readonly acceptedExtensions = '.pdf,.docx,.doc,.txt';

  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<ImportDocumentDialogComponent>,
    private importService: JobDocumentImportService,
    private documentParser: DocumentParserService
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Drag & Drop ---

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  // --- File Selection ---

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.errorMessage = null;
    this.parseComplete = false;
    this.parsedResult = null;
    this.warnings = [];
  }

  // --- Upload & Parse ---

  onUpload(): void {
    if (!this.selectedFile || this.isUploading) return;

    this.isUploading = true;
    this.uploadProgress = 0;
    this.errorMessage = null;

    // Client-side parsing — no backend needed
    this.uploadProgress = 30;

    this.documentParser.parseFile(this.selectedFile)
      .then((parsed) => {
        this.uploadProgress = 100;
        this.isUploading = false;
        this.parseComplete = true;
        this.parsedResult = parsed;

        // Generate warnings for fields we couldn't extract
        this.warnings = [];
        if (!parsed.siteAddress?.city) {
          this.warnings.push('Could not extract full site address');
        }
        if (!parsed.siteLead?.name) {
          this.warnings.push('Could not identify site lead');
        }
        if (!parsed.scopeOfWork) {
          this.warnings.push('Could not extract scope of work');
        }
      })
      .catch((err) => {
        this.isUploading = false;
        this.errorMessage = 'Failed to parse document. Please ensure the file is not corrupted and try again.';
        console.error('Document parse error:', err);
      });
  }

  // --- Dialog Actions ---

  onCancel(): void {
    this.dialogRef.close();
  }

  onApply(): void {
    if (this.parsedResult) {
      const result: ImportDocumentDialogResult = {
        parsed: this.parsedResult,
        warnings: this.warnings
      };
      this.dialogRef.close(result);
    }
  }

  // --- Helpers ---

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private handleFile(file: File): void {
    this.parseComplete = false;
    this.parsedResult = null;
    this.warnings = [];

    const error = this.importService.validateFile(file);
    if (error) {
      this.errorMessage = error;
      this.selectedFile = null;
      return;
    }

    this.errorMessage = null;
    this.selectedFile = file;
  }
}
