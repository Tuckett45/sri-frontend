import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Certification, CertificationStatus } from '../../../../models/technician.model';
import { AttachmentService, Attachment } from '../../../../services/attachment.service';

export interface AddCertificationDialogData {
  technicianId: string;
  existingCertification?: Certification; // If provided, we're editing
}

export interface AddCertificationDialogResult {
  certification: Certification;
  attachmentId?: string;
}

@Component({
  selector: 'app-add-certification-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.existingCertification ? 'Edit Certification' : 'Add Certification' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="cert-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Certification Name</mat-label>
          <input matInput formControlName="name" />
          <mat-error *ngIf="form.get('name')?.hasError('required')">Certification name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Issue Date</mat-label>
          <input matInput [matDatepicker]="issuePicker" formControlName="issueDate" />
          <mat-datepicker-toggle matIconSuffix [for]="issuePicker"></mat-datepicker-toggle>
          <mat-datepicker #issuePicker></mat-datepicker>
          <mat-error *ngIf="form.get('issueDate')?.hasError('required')">Issue date is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Expiration Date</mat-label>
          <input matInput [matDatepicker]="expPicker" formControlName="expirationDate" />
          <mat-datepicker-toggle matIconSuffix [for]="expPicker"></mat-datepicker-toggle>
          <mat-datepicker #expPicker></mat-datepicker>
          <mat-error *ngIf="form.get('expirationDate')?.hasError('required')">Expiration date is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            <mat-option *ngFor="let status of statuses" [value]="status.value">
              {{ status.label }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('status')?.hasError('required')">Status is required</mat-error>
        </mat-form-field>

        <!-- Document Linking Section -->
        <div class="document-section">
          <label class="document-label">Link Document (optional)</label>

          <!-- Toggle between existing document and new upload -->
          <mat-radio-group [(ngModel)]="documentMode" [ngModelOptions]="{standalone: true}" class="document-mode-toggle">
            <mat-radio-button value="existing">Select Existing</mat-radio-button>
            <mat-radio-button value="upload">Upload New</mat-radio-button>
            <mat-radio-button value="none">None</mat-radio-button>
          </mat-radio-group>

          <!-- Select from existing documents -->
          <div *ngIf="documentMode === 'existing'" class="existing-documents">
            <mat-form-field appearance="outline" class="full-width" *ngIf="availableAttachments.length > 0">
              <mat-label>Select Document</mat-label>
              <mat-select [(ngModel)]="selectedAttachmentId" [ngModelOptions]="{standalone: true}">
                <mat-option *ngFor="let att of availableAttachments" [value]="att.id">
                  <span class="doc-option">
                    <span class="doc-name">{{ att.fileName }}</span>
                    <span class="doc-meta">({{ formatFileSize(att.fileSize) }} &middot; {{ att.category }})</span>
                  </span>
                </mat-option>
              </mat-select>
            </mat-form-field>
            <p *ngIf="availableAttachments.length === 0" class="no-docs-hint">
              No documents uploaded yet. Switch to "Upload New" or add documents in the Documents tab first.
            </p>
          </div>

          <!-- Upload new document -->
          <div *ngIf="documentMode === 'upload'" class="upload-section">
            <div class="file-input-row">
              <button mat-stroked-button type="button" (click)="fileInput.click()">
                <mat-icon>upload_file</mat-icon>
                {{ selectedFile ? 'Change File' : 'Choose File' }}
              </button>
              <span class="file-name" *ngIf="selectedFile">{{ selectedFile.name }}</span>
              <button mat-icon-button color="warn" *ngIf="selectedFile" (click)="clearSelectedFile()" matTooltip="Remove">
                <mat-icon>close</mat-icon>
              </button>
              <input #fileInput type="file" hidden accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                     (change)="onFileSelected($event)" />
            </div>
            <p class="upload-hint">File will be uploaded to the Documents tab with "Certification" category.</p>
          </div>

          <!-- Currently linked document indicator (when editing) -->
          <div *ngIf="currentLinkedName && documentMode !== 'none'" class="current-link">
            <mat-icon>link</mat-icon>
            <span>Currently linked: <strong>{{ currentLinkedName }}</strong></span>
          </div>

          <div *ngIf="uploadError" class="upload-error">{{ uploadError }}</div>
          <div *ngIf="uploading" class="upload-progress">
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            <span>Uploading document...</span>
          </div>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="uploading">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || uploading">
        {{ data.existingCertification ? 'Update' : 'Add' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .cert-form { display: flex; flex-direction: column; min-width: 380px; gap: 0.25rem; }
    .full-width { width: 100%; }
    .document-section { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e0e0e0; }
    .document-label { font-size: 0.875rem; font-weight: 500; color: #424242; display: block; margin-bottom: 0.5rem; }
    .document-mode-toggle { display: flex; gap: 1rem; margin-bottom: 0.75rem; }
    ::ng-deep .document-mode-toggle .mat-mdc-radio-button .mdc-label { font-size: 0.8125rem; }
    .existing-documents { margin-top: 0.25rem; }
    .doc-option { display: flex; align-items: baseline; gap: 0.375rem; }
    .doc-name { font-weight: 500; }
    .doc-meta { font-size: 0.75rem; color: #757575; }
    .no-docs-hint { font-size: 0.8125rem; color: #757575; font-style: italic; margin: 0; }
    .upload-section { margin-top: 0.25rem; }
    .file-input-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .file-name { font-size: 0.8125rem; color: #424242; word-break: break-all; }
    .upload-hint { font-size: 0.75rem; color: #9e9e9e; margin: 0.375rem 0 0; }
    .current-link { display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; color: #1976d2; margin-top: 0.5rem; }
    .upload-error { color: #c62828; font-size: 0.8125rem; margin-top: 0.375rem; }
    .upload-progress { margin-top: 0.375rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: #616161; }
    .upload-progress mat-progress-bar { flex: 1; }
  `]
})
export class AddCertificationDialogComponent implements OnInit {
  form: FormGroup;
  documentMode: 'existing' | 'upload' | 'none' = 'none';
  availableAttachments: Attachment[] = [];
  selectedAttachmentId: string | null = null;
  selectedFile: File | null = null;
  uploading = false;
  uploadError = '';
  currentLinkedName: string | null = null;

  statuses = [
    { value: CertificationStatus.Active, label: 'Active' },
    { value: CertificationStatus.ExpiringSoon, label: 'Expiring Soon' },
    { value: CertificationStatus.Expired, label: 'Expired' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddCertificationDialogComponent>,
    private attachmentService: AttachmentService,
    @Inject(MAT_DIALOG_DATA) public data: AddCertificationDialogData
  ) {
    const cert = data.existingCertification;
    this.form = this.fb.group({
      name: [cert?.name || '', Validators.required],
      issueDate: [cert?.issueDate ? new Date(cert.issueDate) : null, Validators.required],
      expirationDate: [cert?.expirationDate ? new Date(cert.expirationDate) : null, Validators.required],
      status: [cert?.status || CertificationStatus.Active, Validators.required]
    });

    // If editing with a linked attachment, pre-select it
    if (cert?.attachmentId) {
      this.selectedAttachmentId = cert.attachmentId;
      this.documentMode = 'existing';
    }
  }

  ngOnInit(): void {
    // Load all existing documents for this technician so user can pick one
    this.attachmentService.getTechnicianAttachments(this.data.technicianId).subscribe({
      next: (attachments) => {
        this.availableAttachments = attachments;
        // If editing with a linked attachment, show its name
        if (this.data.existingCertification?.attachmentId) {
          const linked = attachments.find(a => a.id === this.data.existingCertification!.attachmentId);
          if (linked) {
            this.currentLinkedName = linked.fileName;
          }
        }
      },
      error: () => {
        this.availableAttachments = [];
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFile = file;
      this.uploadError = '';
    }
  }

  clearSelectedFile(): void {
    this.selectedFile = null;
  }

  save(): void {
    if (this.form.invalid) return;

    if (this.documentMode === 'upload' && this.selectedFile) {
      // Upload the file first, then close with the new attachment ID
      this.uploading = true;
      this.uploadError = '';
      this.attachmentService.uploadTechnicianAttachment(this.data.technicianId, this.selectedFile, 'certification').subscribe({
        next: (attachment) => {
          this.uploading = false;
          this.closeWithResult(attachment.id);
        },
        error: (err) => {
          this.uploading = false;
          this.uploadError = err?.message || 'Upload failed. Please try again.';
        }
      });
    } else if (this.documentMode === 'existing' && this.selectedAttachmentId) {
      // Link to existing document
      this.closeWithResult(this.selectedAttachmentId);
    } else {
      // No document linked
      this.closeWithResult(undefined);
    }
  }

  private closeWithResult(attachmentId?: string): void {
    const result: AddCertificationDialogResult = {
      certification: {
        id: this.data.existingCertification?.id || '',
        ...this.form.value,
        attachmentId: attachmentId || undefined
      },
      attachmentId
    };
    this.dialogRef.close(result);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
