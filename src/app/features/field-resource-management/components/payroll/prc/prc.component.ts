import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { PrcSignature } from '../../../models/payroll.models';
import { PayrollService } from '../../../services/payroll.service';
import { FrmPermissionService } from '../../../services/frm-permission.service';
import { AuthService } from '../../../../../services/auth.service';
import { HasUnsavedChanges } from '../../../guards/unsaved-changes.guard';

@Component({
  selector: 'app-prc',
  styleUrls: ['../payroll-shared.scss'],
  template: `
    <div class="boes-container prc">
      <h2>Personnel Record Change (PRC) Signing</h2>

      <!-- Error Banner -->
      <div class="error-banner" *ngIf="errorMessage">
        <span>{{ errorMessage }}</span>
        <button type="button" (click)="errorMessage = ''">Dismiss</button>
      </div>

      <!-- Success Banner -->
      <div class="success-banner" *ngIf="successMessage">
        <span>{{ successMessage }}</span>
        <button type="button" (click)="successMessage = ''">Dismiss</button>
      </div>

      <!-- Existing Signature Notice -->
      <div class="existing-signature" *ngIf="existingSignature">
        <h3>Existing PRC Signature Found</h3>
        <p>This document has already been signed.</p>
        <table>
          <tr><th>Employee ID</th><td>{{ existingSignature.employeeId }}</td></tr>
          <tr><th>Document Ref</th><td>{{ existingSignature.documentRef }}</td></tr>
          <tr><th>Signed By</th><td>{{ existingSignature.signedBy }}</td></tr>
          <tr><th>Signed At</th><td>{{ existingSignature.signedAt | date:'short' }}</td></tr>
        </table>
      </div>

      <!-- Submit Form -->
      <form [formGroup]="prcForm"
            (ngSubmit)="onSubmit()"
            class="create-form">
        <h3>Sign PRC Document</h3>

        <div class="form-field">
          <label for="employeeId">Employee ID *</label>
          <input id="employeeId" formControlName="employeeId" placeholder="Enter Employee ID" />
          <span class="field-error"
                *ngIf="prcForm.get('employeeId')?.invalid && prcForm.get('employeeId')?.touched">
            Employee ID is required.
          </span>
        </div>

        <div class="form-field">
          <label for="documentRef">Document Reference *</label>
          <input id="documentRef" formControlName="documentRef" placeholder="Enter Document Reference" />
          <span class="field-error"
                *ngIf="prcForm.get('documentRef')?.invalid && prcForm.get('documentRef')?.touched">
            Document reference is required.
          </span>
        </div>

        <!-- PRC Document Content / Reference Link -->
        <div class="prc-document-preview" *ngIf="prcForm.get('documentRef')?.value">
          <p>PRC Document: <strong>{{ prcForm.get('documentRef')?.value }}</strong></p>
          <p>Please review the document before signing below.</p>
        </div>

        <div class="form-field">
          <label for="signature">Signature *</label>
          <input id="signature" formControlName="signature" placeholder="Enter your signature" />
          <span class="field-error"
                *ngIf="prcForm.get('signature')?.hasError('required') && prcForm.get('signature')?.touched">
            Signature is required.
          </span>
          <span class="field-error"
                *ngIf="prcForm.get('signature')?.hasError('whitespaceOnly') && prcForm.get('signature')?.touched">
            Signature cannot be empty or whitespace only.
          </span>
        </div>

        <button type="button" (click)="checkExistingSignature()"
                [disabled]="!prcForm.get('employeeId')?.value || !prcForm.get('documentRef')?.value">
          Check Existing Signature
        </button>

        <button type="submit"
                [disabled]="prcForm.invalid || submitting || !!existingSignature">
          <span *ngIf="submitting">Submitting...</span>
          <span *ngIf="!submitting">Sign PRC</span>
        </button>
      </form>

      <!-- History Section -->
      <div class="history-section">
        <h3>PRC Signature History</h3>
        <div class="history-lookup" [formGroup]="historyForm">
          <div class="form-field">
            <label for="historyEmployeeId">Employee ID</label>
            <input id="historyEmployeeId" formControlName="employeeId" placeholder="Enter Employee ID" />
          </div>
          <button type="button" (click)="loadHistory()" [disabled]="!historyForm.get('employeeId')?.value">
            Load History
          </button>
        </div>

        <table *ngIf="history.length > 0">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Document Ref</th>
              <th>Signed By</th>
              <th>Signed At</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let record of history">
              <td>{{ record.employeeId }}</td>
              <td>{{ record.documentRef }}</td>
              <td>{{ record.signedBy }}</td>
              <td>{{ record.signedAt | date:'short' }}</td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="historyLoaded && history.length === 0">No PRC signature history found.</p>
      </div>
    </div>
  `
})
export class PrcComponent implements OnInit, HasUnsavedChanges {
  history: PrcSignature[] = [];
  historyLoaded = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  existingSignature: PrcSignature | null = null;

  prcForm!: FormGroup;
  historyForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private permissionService: FrmPermissionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    if (!this.permissionService.hasPermission(role, 'canSignPRC')) {
      this.errorMessage = 'You do not have permission to sign PRC documents.';
    }

    this.prcForm = this.fb.group({
      employeeId: ['', Validators.required],
      documentRef: ['', Validators.required],
      signature: ['', [Validators.required, PrcComponent.noWhitespaceValidator]]
    });

    this.historyForm = this.fb.group({
      employeeId: ['']
    });
  }

  static noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (typeof value === 'string' && value.trim().length === 0) {
      return { whitespaceOnly: true };
    }
    return null;
  }

  hasUnsavedChanges(): boolean {
    return this.prcForm.dirty;
  }

  checkExistingSignature(): void {
    const employeeId = this.prcForm.get('employeeId')?.value?.trim();
    const documentRef = this.prcForm.get('documentRef')?.value?.trim();
    if (!employeeId || !documentRef) return;

    this.errorMessage = '';
    this.existingSignature = null;

    this.payrollService.getPrcByDocRef(employeeId, documentRef).subscribe({
      next: (signature) => {
        if (signature) {
          this.existingSignature = signature;
          this.prcForm.disable();
        }
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to check existing signature.';
      }
    });
  }

  loadHistory(): void {
    const employeeId = this.historyForm.get('employeeId')?.value?.trim();
    if (!employeeId) return;

    this.errorMessage = '';
    this.payrollService.getPrcHistory(employeeId).subscribe({
      next: (records) => {
        this.history = records.sort(
          (a, b) => new Date(b.signedAt).getTime() - new Date(a.signedAt).getTime()
        );
        this.historyLoaded = true;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load PRC history.';
        this.historyLoaded = true;
      }
    });
  }

  onSubmit(): void {
    if (this.prcForm.invalid) {
      this.prcForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.prcForm.value;
    const payload = {
      employeeId: formValue.employeeId,
      documentRef: formValue.documentRef,
      signature: formValue.signature
    };

    this.payrollService.signPrc(payload).subscribe({
      next: () => {
        this.submitting = false;
        const user = this.authService.getUser();
        const signerName = user?.name || 'Unknown';
        const timestamp = new Date().toLocaleString();
        this.successMessage = `PRC signed by ${signerName} for document ${formValue.documentRef} at ${timestamp}.`;
        this.prcForm.reset({ employeeId: '', documentRef: '', signature: '' });
        this.existingSignature = null;
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.message || 'Failed to sign PRC document.';
      }
    });
  }
}
