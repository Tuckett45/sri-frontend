import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PayStub, PayStubFilters } from '../../../models/payroll.models';
import { PayrollService } from '../../../services/payroll.service';
import { FrmPermissionService } from '../../../services/frm-permission.service';
import { AuthService } from '../../../../../services/auth.service';
import { triggerBlobDownload } from '../../../utils/download.util';

@Component({
  selector: 'app-pay-stubs',
  styleUrls: ['../payroll-shared.scss'],
  template: `
    <div class="boes-container pay-stubs">
      <h2>Pay Stubs</h2>

      <!-- Error Banner -->
      <div class="error-banner" *ngIf="errorMessage">
        <span>{{ errorMessage }}</span>
        <button type="button" (click)="errorMessage = ''">Dismiss</button>
      </div>

      <!-- Filters -->
      <div class="pay-stub-filters" [formGroup]="filterForm">
        <div class="filter-row">
          <div class="filter-field">
            <label for="employeeId">Employee ID</label>
            <input id="employeeId" formControlName="employeeId"
                   placeholder="Enter Employee ID" />
          </div>
          <div class="filter-field">
            <label for="year">Year</label>
            <select id="year" formControlName="year" (change)="loadPayStubs()">
              <option value="">All Years</option>
              <option *ngFor="let y of availableYears" [value]="y">{{ y }}</option>
            </select>
          </div>
          <div class="filter-field">
            <button type="button" (click)="loadPayStubs()"
                    [disabled]="!filterForm.get('employeeId')?.value">
              Search
            </button>
          </div>
        </div>
      </div>

      <!-- Pay Stubs List -->
      <table *ngIf="payStubs.length > 0" class="print-table">
        <thead>
          <tr>
            <th>Pay Period</th>
            <th>Gross Pay</th>
            <th>Deductions</th>
            <th>Total Deductions</th>
            <th>Net Pay</th>
            <th>Payment Date</th>
            <th class="no-print">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let stub of payStubs">
            <td>{{ stub.payPeriodStart }} &ndash; {{ stub.payPeriodEnd }}</td>
            <td>{{ stub.grossPay | currency }}</td>
            <td>
              <ul class="deduction-list">
                <li *ngFor="let d of stub.deductions">
                  {{ d.name }}: {{ d.amount | currency }}
                </li>
              </ul>
            </td>
            <td>{{ stub.totalDeductions | currency }}</td>
            <td>{{ stub.netPay | currency }}</td>
            <td>{{ stub.paymentDate | date:'shortDate' }}</td>
            <td class="no-print">
              <button type="button" (click)="printStub()">Print</button>
              <button type="button" (click)="downloadStub(stub)">Download</button>
            </td>
          </tr>
        </tbody>
      </table>

      <p *ngIf="searched && payStubs.length === 0">No records found.</p>
    </div>
  `
})
export class PayStubsComponent implements OnInit {
  payStubs: PayStub[] = [];
  readOnly = false;
  errorMessage = '';
  searched = false;

  filterForm!: FormGroup;
  availableYears: number[] = [];

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private permissionService: FrmPermissionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    this.readOnly = !this.permissionService.hasPermission(role, 'canViewPayStubs');

    this.filterForm = this.fb.group({
      employeeId: [''],
      year: ['']
    });

    // Build available years (current year down to 10 years ago)
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 10; y--) {
      this.availableYears.push(y);
    }
  }

  loadPayStubs(): void {
    const employeeId = (this.filterForm.get('employeeId')?.value || '').trim();
    if (!employeeId) {
      return;
    }

    this.errorMessage = '';
    this.searched = true;

    const params: PayStubFilters = {};
    const yearVal = this.filterForm.get('year')?.value;
    if (yearVal) {
      params.year = Number(yearVal);
    }

    this.payrollService.getPayStubs(employeeId, params).subscribe({
      next: (stubs) => {
        this.payStubs = stubs.sort(
          (a, b) => new Date(b.payPeriodEnd).getTime() - new Date(a.payPeriodEnd).getTime()
        );
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load pay stubs.';
        this.payStubs = [];
      }
    });
  }

  printStub(): void {
    window.print();
  }

  downloadStub(stub: PayStub): void {
    const employeeId = (this.filterForm.get('employeeId')?.value || '').trim();
    const payPeriod = `${stub.payPeriodStart}_${stub.payPeriodEnd}`;

    this.payrollService.getPayStubPdf(employeeId, payPeriod).subscribe({
      next: (blob) => {
        const filename = `paystub_${employeeId}_${payPeriod}.pdf`;
        triggerBlobDownload(blob, filename);
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to download pay stub PDF.';
      }
    });
  }
}
