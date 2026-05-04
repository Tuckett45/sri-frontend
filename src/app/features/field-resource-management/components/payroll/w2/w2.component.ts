import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { W2Document } from '../../../models/payroll.models';
import { PayrollService } from '../../../services/payroll.service';
import { FrmPermissionService } from '../../../services/frm-permission.service';
import { AuthService } from '../../../../../services/auth.service';
import { triggerBlobDownload } from '../../../utils/download.util';

@Component({
  selector: 'app-w2',
  styleUrls: ['../payroll-shared.scss'],
  template: `
    <div class="boes-container w2">
      <h2>W-2 Documents</h2>

      <!-- Error Banner -->
      <div class="error-banner" *ngIf="errorMessage">
        <span>{{ errorMessage }}</span>
        <button type="button" (click)="errorMessage = ''">Dismiss</button>
      </div>

      <!-- Filters -->
      <div class="w2-filters" [formGroup]="filterForm">
        <div class="filter-row">
          <div class="filter-field">
            <label for="employeeId">Employee ID</label>
            <input id="employeeId" formControlName="employeeId"
                   placeholder="Enter Employee ID"
                   (blur)="onEmployeeIdChange()" />
          </div>
          <div class="filter-field">
            <label for="taxYear">Tax Year</label>
            <select id="taxYear" formControlName="taxYear">
              <option value="">Select Year</option>
              <option *ngFor="let y of availableTaxYears" [value]="y">{{ y }}</option>
            </select>
          </div>
          <div class="filter-field">
            <button type="button" (click)="loadW2Documents()"
                    [disabled]="!filterForm.get('employeeId')?.value || !filterForm.get('taxYear')?.value">
              Search
            </button>
          </div>
        </div>
      </div>

      <!-- W-2 Documents List -->
      <table *ngIf="w2Documents.length > 0" class="print-table">
        <thead>
          <tr>
            <th>Tax Year</th>
            <th>Employer Name</th>
            <th>Employee Name</th>
            <th>Wages &amp; Tips</th>
            <th>Federal Income Tax Withheld</th>
            <th>Social Security Wages</th>
            <th>Social Security Tax Withheld</th>
            <th>Medicare Wages</th>
            <th>Medicare Tax Withheld</th>
            <th class="no-print">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let doc of w2Documents">
            <td>{{ doc.taxYear }}</td>
            <td>{{ doc.employerName }}</td>
            <td>{{ doc.employeeName }}</td>
            <td>{{ doc.wagesTips | currency }}</td>
            <td>{{ doc.federalIncomeTaxWithheld | currency }}</td>
            <td>{{ doc.socialSecurityWages | currency }}</td>
            <td>{{ doc.socialSecurityTaxWithheld | currency }}</td>
            <td>{{ doc.medicareWages | currency }}</td>
            <td>{{ doc.medicareTaxWithheld | currency }}</td>
            <td class="no-print">
              <button type="button" (click)="printW2()">Print</button>
              <button type="button" (click)="downloadW2(doc)"
                      *ngIf="!readOnly">Download</button>
            </td>
          </tr>
        </tbody>
      </table>

      <p *ngIf="searched && w2Documents.length === 0">No records found.</p>
    </div>
  `
})
export class W2Component implements OnInit {
  w2Documents: W2Document[] = [];
  readOnly = false;
  errorMessage = '';
  searched = false;
  loading = false;

  filterForm!: FormGroup;
  availableTaxYears: number[] = [];

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private permissionService: FrmPermissionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    this.readOnly = !this.permissionService.hasPermission(role, 'canViewW2');

    this.filterForm = this.fb.group({
      employeeId: [''],
      taxYear: ['']
    });
  }

  onEmployeeIdChange(): void {
    const employeeId = (this.filterForm.get('employeeId')?.value || '').trim();
    if (!employeeId) {
      this.availableTaxYears = [];
      this.filterForm.get('taxYear')?.setValue('');
      return;
    }

    this.payrollService.getAvailableTaxYears(employeeId).subscribe({
      next: (years) => {
        this.availableTaxYears = years.sort((a, b) => b - a);
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load available tax years.';
        this.availableTaxYears = [];
      }
    });
  }

  loadW2Documents(): void {
    const employeeId = (this.filterForm.get('employeeId')?.value || '').trim();
    const taxYearVal = this.filterForm.get('taxYear')?.value;
    if (!employeeId || !taxYearVal) {
      return;
    }

    this.errorMessage = '';
    this.searched = true;
    this.loading = true;

    const taxYear = Number(taxYearVal);

    this.payrollService.getW2Documents(employeeId, taxYear).subscribe({
      next: (docs) => {
        this.w2Documents = docs;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load W-2 documents.';
        this.w2Documents = [];
        this.loading = false;
      }
    });
  }

  printW2(): void {
    window.print();
  }

  downloadW2(doc: W2Document): void {
    const employeeId = (this.filterForm.get('employeeId')?.value || '').trim();

    this.payrollService.getW2Pdf(employeeId, doc.taxYear).subscribe({
      next: (blob) => {
        const filename = `w2_${employeeId}_${doc.taxYear}.pdf`;
        triggerBlobDownload(blob, filename);
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to download W-2 PDF.';
      }
    });
  }
}
