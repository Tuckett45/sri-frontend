import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IncidentReport, IncidentType } from '../../../models/payroll.models';
import { PayrollService } from '../../../services/payroll.service';
import { FrmPermissionService } from '../../../services/frm-permission.service';
import { AuthService } from '../../../../../services/auth.service';
import { HasUnsavedChanges } from '../../../guards/unsaved-changes.guard';

@Component({
  selector: 'app-incident-reports',
  styleUrls: ['../payroll-shared.scss'],
  template: `
    <div class="boes-container incident-reports">
      <h2>Incident Reports</h2>

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

      <!-- Create Form (hidden for read-only / HR_Group) -->
      <form *ngIf="!readOnly"
            [formGroup]="reportForm"
            (ngSubmit)="onSubmit()"
            class="create-form">
        <h3>Create Incident Report</h3>

        <div class="form-field">
          <label for="employeeId">Employee ID *</label>
          <input id="employeeId" formControlName="employeeId" placeholder="Enter Employee ID" />
          <span class="field-error"
                *ngIf="reportForm.get('employeeId')?.invalid && reportForm.get('employeeId')?.touched">
            Employee ID is required.
          </span>
        </div>

        <div class="form-field">
          <label for="type">Incident Type *</label>
          <select id="type" formControlName="type">
            <option value="" disabled>Select type</option>
            <option value="auto_accident">Auto Accident</option>
            <option value="work_injury">Work Injury</option>
            <option value="other">Other</option>
          </select>
          <span class="field-error"
                *ngIf="reportForm.get('type')?.invalid && reportForm.get('type')?.touched">
            Incident type is required.
          </span>
        </div>

        <div class="form-field">
          <label for="incidentDate">Incident Date *</label>
          <input id="incidentDate" type="date" formControlName="incidentDate" />
          <span class="field-error"
                *ngIf="reportForm.get('incidentDate')?.invalid && reportForm.get('incidentDate')?.touched">
            Incident date is required.
          </span>
        </div>

        <div class="form-field">
          <label for="description">Description *</label>
          <textarea id="description" formControlName="description" rows="4"
                    placeholder="Describe the incident"></textarea>
          <span class="field-error"
                *ngIf="reportForm.get('description')?.invalid && reportForm.get('description')?.touched">
            Description is required.
          </span>
        </div>

        <button type="submit"
                [disabled]="reportForm.invalid || submitting">
          <span *ngIf="submitting">Submitting...</span>
          <span *ngIf="!submitting">Submit Report</span>
        </button>
      </form>

      <!-- Filters -->
      <div class="report-filters" [formGroup]="filterForm">
        <h3>Filter Reports</h3>
        <div class="filter-row">
          <div class="filter-field">
            <label for="filterType">Type</label>
            <select id="filterType" formControlName="type" (change)="applyFilter()">
              <option value="">All Types</option>
              <option value="auto_accident">Auto Accident</option>
              <option value="work_injury">Work Injury</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="filter-field">
            <label for="filterDateFrom">Date From</label>
            <input id="filterDateFrom" type="date" formControlName="dateFrom" (change)="applyFilter()" />
          </div>
          <div class="filter-field">
            <label for="filterDateTo">Date To</label>
            <input id="filterDateTo" type="date" formControlName="dateTo" (change)="applyFilter()" />
          </div>
          <div class="filter-field">
            <label for="filterEmployeeId">Employee ID</label>
            <input id="filterEmployeeId" formControlName="employeeId"
                   placeholder="Filter by Employee ID" (input)="applyFilter()" />
          </div>
        </div>
      </div>

      <!-- Reports List -->
      <table *ngIf="filteredReports.length > 0">
        <thead>
          <tr>
            <th>Type</th>
            <th>Employee ID</th>
            <th>Incident Date</th>
            <th>Reported By</th>
            <th>Reported At</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let report of filteredReports">
            <td>{{ report.type }}</td>
            <td>{{ report.employeeId }}</td>
            <td>{{ report.incidentDate }}</td>
            <td>{{ report.reportedBy }}</td>
            <td>{{ report.reportedAt | date:'short' }}</td>
            <td>{{ report.description }}</td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="filteredReports.length === 0">No incident reports found.</p>
    </div>
  `
})
export class IncidentReportsComponent implements OnInit, HasUnsavedChanges {
  reports: IncidentReport[] = [];
  filteredReports: IncidentReport[] = [];
  readOnly = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  reportForm!: FormGroup;
  filterForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private permissionService: FrmPermissionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    this.readOnly = !this.permissionService.hasPermission(role, 'canManageIncidentReports');

    this.reportForm = this.fb.group({
      employeeId: ['', Validators.required],
      type: ['', Validators.required],
      incidentDate: ['', Validators.required],
      description: ['', Validators.required]
    });

    this.filterForm = this.fb.group({
      type: [''],
      dateFrom: [''],
      dateTo: [''],
      employeeId: ['']
    });

    this.loadReports();
  }

  hasUnsavedChanges(): boolean {
    return this.reportForm.dirty;
  }

  loadReports(): void {
    this.payrollService.getIncidentReports().subscribe({
      next: (reports) => {
        this.reports = reports.sort(
          (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
        );
        this.applyFilter();
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load incident reports.';
      }
    });
  }

  applyFilter(): void {
    const filterType = this.filterForm.get('type')?.value as IncidentType | '';
    const dateFrom = this.filterForm.get('dateFrom')?.value as string;
    const dateTo = this.filterForm.get('dateTo')?.value as string;
    const employeeId = (this.filterForm.get('employeeId')?.value as string || '').trim();

    this.filteredReports = this.reports.filter(r => {
      if (filterType && r.type !== filterType) return false;
      if (employeeId && r.employeeId !== employeeId) return false;
      if (dateFrom && r.incidentDate < dateFrom) return false;
      if (dateTo && r.incidentDate > dateTo) return false;
      return true;
    });
  }

  onSubmit(): void {
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.reportForm.value;

    this.payrollService.createIncidentReport(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = 'Incident report submitted successfully.';
        this.reportForm.reset({ employeeId: '', type: '', incidentDate: '', description: '' });
        this.loadReports();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.message || 'Failed to submit incident report.';
      }
    });
  }
}
