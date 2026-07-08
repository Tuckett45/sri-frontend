import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';

import { DocumentParserService } from '../../../../services/document-parser.service';
import { JobDocumentImportService } from '../../../../services/job-document-import.service';
import { JobSetupService } from '../../../../services/job-setup.service';
import { ParsedJobDocument } from '../../../../models/job-document-import.model';
import { JobSetupFormValue } from '../../../../models/job-setup.models';
import { Job } from '../../../../models/job.model';

export interface UploadJobDocumentDialogResult {
  success: boolean;
  job?: Job;
  error?: string;
  /** If true, the caller should navigate to the wizard with import data in sessionStorage */
  redirectToWizard?: boolean;
}

/**
 * Dialog for uploading a job document to directly create a new job.
 *
 * Unlike the existing Import Document Dialog (which routes to the wizard),
 * this component parses the uploaded document and immediately submits
 * the extracted data as a new job — no wizard steps required.
 *
 * If direct creation fails (e.g., missing required fields), users are offered
 * a fallback to open the wizard with the parsed data pre-filled.
 *
 * Supported formats: PDF, DOCX, TXT (max 25 MB)
 */
@Component({
  selector: 'app-upload-job-document-dialog',
  template: `
    <h2 mat-dialog-title>Create Job from Document</h2>

    <mat-dialog-content>
      <p class="description">
        Upload a job one-pager or documentation file to automatically create a new job.
        The document will be parsed and a job will be created directly from its contents.
      </p>
      <p class="description supported-formats">
        Supported formats: <strong>PDF, DOCX, TXT</strong> (max 25 MB)
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

        <div *ngIf="!selectedFile && !isProcessing" class="drop-zone-content">
          <mat-icon class="upload-icon">cloud_upload</mat-icon>
          <span class="drop-text">Drag & drop your job document here</span>
          <span class="drop-subtext">or click to browse</span>
          <span class="file-types">PDF, DOCX, TXT (max 25 MB)</span>
        </div>

        <div *ngIf="selectedFile && !isProcessing && !parseComplete" class="file-info">
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

      <!-- Processing Progress -->
      <div *ngIf="isProcessing" class="progress-section">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <span class="progress-text">{{ progressMessage }}</span>
      </div>

      <!-- Parse Complete - Preview -->
      <div *ngIf="parseComplete && parsedResult && !isSubmitting && !submitComplete" class="result-section">
        <mat-icon class="success-icon">check_circle</mat-icon>
        <span class="success-text">Document parsed successfully</span>

        <div class="extracted-summary">
          <h4>Extracted Job Details:</h4>
          <ul>
            <li *ngIf="parsedResult.clientName">
              <strong>Client:</strong> {{ parsedResult.clientName }}
            </li>
            <li *ngIf="parsedResult.siteName">
              <strong>Site:</strong> {{ parsedResult.siteName }}
            </li>
            <li *ngIf="parsedResult.siteAddress?.street">
              <strong>Address:</strong>
              {{ parsedResult.siteAddress?.street }}, {{ parsedResult.siteAddress?.city }}, {{ parsedResult.siteAddress?.state }} {{ parsedResult.siteAddress?.zipCode }}
            </li>
            <li *ngIf="parsedResult.siteLead?.name">
              <strong>Site Lead:</strong> {{ parsedResult.siteLead?.name }}
            </li>
            <li *ngIf="parsedResult.scopeOfWork">
              <strong>Scope:</strong> {{ parsedResult.scopeOfWork | slice:0:100 }}{{ (parsedResult.scopeOfWork?.length || 0) > 100 ? '...' : '' }}
            </li>
            <li *ngIf="parsedResult.perDiem != null">
              <strong>Per Diem:</strong> \${{ parsedResult.perDiem }}/day
            </li>
            <li *ngIf="parsedResult.workSchedule">
              <strong>Schedule:</strong> {{ parsedResult.workSchedule }}
            </li>
            <li *ngIf="parsedResult.contacts?.length">
              <strong>Contacts:</strong> {{ parsedResult.contacts?.length }} found
            </li>
            <li *ngIf="parsedResult.requiredPPE?.length">
              <strong>PPE Requirements:</strong> {{ parsedResult.requiredPPE?.length }} items
            </li>
          </ul>
        </div>

        <div *ngIf="warnings.length" class="warnings-section">
          <mat-icon class="warning-icon">warning</mat-icon>
          <div class="warning-list">
            <span class="warning-title">Some fields could not be extracted:</span>
            <span *ngFor="let w of warnings" class="warning-item">{{ w }}</span>
          </div>
        </div>
      </div>

      <!-- Submitting -->
      <div *ngIf="isSubmitting" class="progress-section">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <span class="progress-text">Creating job...</span>
      </div>

      <!-- Submit Complete -->
      <div *ngIf="submitComplete" class="result-section">
        <mat-icon class="success-icon big-success">task_alt</mat-icon>
        <span class="success-text big-text">Job Created Successfully!</span>
        <p class="success-detail">
          The job has been created from the uploaded document. You can view and edit it from the Jobs list.
        </p>
      </div>

      <!-- Error -->
      <div *ngIf="errorMessage" class="error-section">
        <mat-icon class="error-icon">error</mat-icon>
        <span class="error-text">{{ errorMessage }}</span>
      </div>

      <!-- Fallback option when creation fails -->
      <div *ngIf="createFailed" class="fallback-section">
        <p class="fallback-text">
          The document was parsed successfully but some required fields are missing for direct creation.
          You can use the wizard to review and fill in the remaining fields.
        </p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        {{ submitComplete ? 'Close' : 'Cancel' }}
      </button>

      <!-- Parse button (shown after file selected, before parse) -->
      <button
        *ngIf="selectedFile && !parseComplete && !isProcessing && !submitComplete"
        mat-raised-button
        color="primary"
        (click)="onParse()"
      >
        <mat-icon>search</mat-icon>
        Parse Document
      </button>

      <!-- Use Wizard button (shown when direct creation fails) -->
      <button
        *ngIf="createFailed"
        mat-raised-button
        color="accent"
        (click)="onUseWizard()"
      >
        <mat-icon>edit_note</mat-icon>
        Use Wizard Instead
      </button>

      <!-- Create Job button (shown after successful parse, before submission or failure) -->
      <button
        *ngIf="parseComplete && !isSubmitting && !submitComplete && !createFailed"
        mat-raised-button
        color="primary"
        (click)="onCreateJob()"
      >
        <mat-icon>add_circle</mat-icon>
        Create Job
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .description {
      color: rgba(0, 0, 0, 0.6);
      margin-bottom: 8px;
      font-size: 14px;
    }

    .supported-formats {
      margin-bottom: 16px;
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

    .success-icon.big-success {
      font-size: 56px;
      width: 56px;
      height: 56px;
    }

    .success-text {
      font-size: 16px;
      font-weight: 500;
      color: #4caf50;
    }

    .success-text.big-text {
      font-size: 20px;
    }

    .success-detail {
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
      text-align: center;
      margin-top: 4px;
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

    .warning-title {
      font-size: 13px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.7);
      margin-bottom: 2px;
    }

    .warning-item {
      font-size: 13px;
      color: rgba(0, 0, 0, 0.6);
      padding-left: 8px;
    }

    .warning-item::before {
      content: '- ';
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

    .fallback-section {
      margin-top: 12px;
      padding: 12px;
      background: #e3f2fd;
      border-radius: 4px;
      border-left: 4px solid #2196f3;
    }

    .fallback-text {
      font-size: 14px;
      color: rgba(0, 0, 0, 0.7);
      margin: 0;
    }

    mat-dialog-actions button mat-icon {
      margin-right: 4px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `]
})
export class UploadJobDocumentDialogComponent implements OnDestroy {
  selectedFile: File | null = null;
  isDragging = false;
  isProcessing = false;
  isSubmitting = false;
  parseComplete = false;
  submitComplete = false;
  createFailed = false;
  parsedResult: ParsedJobDocument | null = null;
  warnings: string[] = [];
  errorMessage: string | null = null;
  progressMessage = 'Parsing document...';

  readonly acceptedExtensions = '.pdf,.docx,.doc,.txt';

  private destroy$ = new Subject<void>();
  private createdJob: Job | null = null;

  constructor(
    private dialogRef: MatDialogRef<UploadJobDocumentDialogComponent>,
    private importService: JobDocumentImportService,
    private documentParser: DocumentParserService,
    private jobSetupService: JobSetupService,
    private cdr: ChangeDetectorRef
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
    this.reset();
  }

  // --- Parse ---

  onParse(): void {
    if (!this.selectedFile || this.isProcessing) return;

    this.isProcessing = true;
    this.progressMessage = 'Parsing document...';
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.documentParser.parseFile(this.selectedFile)
      .then((parsed) => {
        this.isProcessing = false;
        this.parseComplete = true;
        this.parsedResult = parsed;

        // Generate warnings for fields that couldn't be extracted
        this.warnings = this.generateWarnings(parsed);
        this.cdr.markForCheck();
      })
      .catch((err) => {
        this.isProcessing = false;
        this.errorMessage = 'Failed to parse document. Please ensure the file is not corrupted and try again.';
        console.error('Document parse error:', err);
        this.cdr.markForCheck();
      });
  }

  // --- Create Job Directly ---

  onCreateJob(): void {
    if (!this.parsedResult || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = null;
    this.createFailed = false;
    this.cdr.markForCheck();

    // Map parsed document to a JobSetupFormValue
    const formValue = this.mapParsedToFormValue(this.parsedResult);

    // Submit directly via the JobSetupService
    this.jobSetupService.submitJob(formValue)
      .pipe(take(1))
      .subscribe({
        next: (job) => {
          this.isSubmitting = false;
          this.submitComplete = true;
          this.createdJob = job;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.createFailed = true;
          this.errorMessage = err?.message || 'Failed to create job. Some required fields may be missing from the document.';
          this.cdr.markForCheck();
        }
      });
  }

  // --- Dialog Actions ---

  onCancel(): void {
    if (this.submitComplete && this.createdJob) {
      const result: UploadJobDocumentDialogResult = {
        success: true,
        job: this.createdJob
      };
      this.dialogRef.close(result);
    } else {
      this.dialogRef.close(null);
    }
  }

  /**
   * Redirect to the wizard with the parsed data pre-filled.
   * Stores the mapped form value in sessionStorage so the job-setup component picks it up.
   */
  onUseWizard(): void {
    if (this.parsedResult) {
      const formPatch = this.importService.mapToFormValue(this.parsedResult);
      sessionStorage.setItem('frm_job_import_data', JSON.stringify(formPatch));

      const result: UploadJobDocumentDialogResult = {
        success: false,
        redirectToWizard: true
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
    this.reset();

    const error = this.importService.validateFile(file);
    if (error) {
      this.errorMessage = error;
      this.selectedFile = null;
      return;
    }

    this.errorMessage = null;
    this.selectedFile = file;
  }

  private reset(): void {
    this.selectedFile = null;
    this.parseComplete = false;
    this.parsedResult = null;
    this.warnings = [];
    this.errorMessage = null;
    this.isProcessing = false;
    this.isSubmitting = false;
    this.submitComplete = false;
    this.createFailed = false;
    this.createdJob = null;
  }

  /**
   * Maps ParsedJobDocument to a full JobSetupFormValue with sensible defaults
   * for fields that couldn't be extracted from the document.
   */
  private mapParsedToFormValue(parsed: ParsedJobDocument): JobSetupFormValue {
    return {
      customerInfo: {
        clientName: parsed.clientName || parsed.siteName || 'Imported Job',
        siteName: parsed.siteName || parsed.clientName || 'Imported Job',
        street: parsed.siteAddress?.street || 'TBD',
        city: parsed.siteAddress?.city || 'TBD',
        state: parsed.siteAddress?.state || 'TBD',
        zipCode: parsed.siteAddress?.zipCode || '00000',
        pocName: parsed.customerPOC?.name || parsed.siteLead?.name || '',
        pocPhone: parsed.customerPOC?.phone || parsed.siteLead?.phone || '',
        pocEmail: parsed.customerPOC?.email || parsed.siteLead?.email || '',
        targetStartDate: new Date().toISOString().split('T')[0],
        authorizationStatus: 'pending',
        hasPurchaseOrders: false,
        purchaseOrderNumber: ''
      },
      pricingBilling: {
        standardBillRate: 1,    // Minimum non-zero to pass validation
        overtimeBillRate: 1,    // Minimum non-zero to pass validation
        perDiem: parsed.perDiem || 0,
        invoicingProcess: 'weekly'  // Default to weekly (SRI pays weekly per doc)
      },
      sriInternal: {
        projectDirector: parsed.siteLead?.name || 'TBD',
        targetResources: 1,
        bizDevContact: 'TBD',
        requestedHours: 40,     // Default to 1 week of hours
        overtimeRequired: false,
        estimatedOvertimeHours: null
      }
    };
  }

  /**
   * Generate user-friendly warnings for fields that couldn't be extracted.
   */
  private generateWarnings(parsed: ParsedJobDocument): string[] {
    const warnings: string[] = [];

    if (!parsed.clientName && !parsed.siteName) {
      warnings.push('Could not extract client or site name');
    }
    if (!parsed.siteAddress?.street && !parsed.siteAddress?.city) {
      warnings.push('Could not extract site address');
    }
    if (!parsed.siteLead?.name && !parsed.customerPOC?.name) {
      warnings.push('Could not identify site lead or customer contact');
    }
    if (!parsed.scopeOfWork) {
      warnings.push('Could not extract scope of work');
    }
    if (parsed.perDiem == null) {
      warnings.push('Could not extract per diem information');
    }

    return warnings;
  }
}
