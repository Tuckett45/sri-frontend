import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ReferralService } from '../../../services/referral.service';
import {
  Referral,
  ReferralFilters,
  ReferralStatus,
  CreateReferralPayload,
  ReferralImportResult,
} from '../../../models/referral.models';

@Component({
  selector: 'app-referral-tracker',
  template: `
    <div class="referral-tracker-container">
      <div class="referral-header">
        <h2 class="referral-title">Referral Tracker</h2>
        <div class="header-actions">
          <button class="btn-import" (click)="showImportPanel = !showImportPanel">
            {{ showImportPanel ? 'Close Import' : 'Import Referrals' }}
          </button>
          <button class="btn-add" (click)="showAddForm = !showAddForm">
            {{ showAddForm ? 'Cancel' : 'Add Referral' }}
          </button>
        </div>
      </div>

      <!-- Import Panel -->
      <div *ngIf="showImportPanel" class="import-panel">
        <h3>Import from Spreadsheet</h3>
        <p class="import-instructions">
          Paste data from your referral spreadsheet below. Expected columns (tab or comma separated):
        </p>
        <p class="import-columns">
          First Name | Last Name | Email | Phone Number | City, State | Willing to Travel | Referred From | Onboarded
        </p>
        <textarea
          class="import-textarea"
          [(ngModel)]="importText"
          placeholder="Paste spreadsheet rows here..."
          rows="8"
        ></textarea>
        <div class="import-actions">
          <button class="btn-parse" (click)="parseImport()" [disabled]="!importText.trim()">
            Preview Import
          </button>
          <button
            class="btn-confirm-import"
            *ngIf="importResult && importResult.validRows.length > 0"
            (click)="confirmImport()"
            [disabled]="isImporting"
          >
            {{ isImporting ? 'Importing...' : 'Import ' + importResult.validRows.length + ' Referrals' }}
          </button>
        </div>

        <!-- Import Preview -->
        <div *ngIf="importResult" class="import-preview">
          <div class="import-summary">
            <span class="summary-valid">{{ importResult.validRows.length }} valid</span>
            <span class="summary-invalid" *ngIf="importResult.invalidRows.length > 0">
              {{ importResult.invalidRows.length }} invalid
            </span>
            <span class="summary-total">of {{ importResult.totalRows }} total rows</span>
          </div>

          <div *ngIf="importResult.invalidRows.length > 0" class="invalid-rows">
            <h4>Rows with errors:</h4>
            <div *ngFor="let invalid of importResult.invalidRows" class="invalid-row">
              <span class="row-number">Row {{ invalid.rowIndex }}:</span>
              <span class="row-name">{{ invalid.row.firstName }} {{ invalid.row.lastName }}</span>
              <span class="row-errors">{{ invalid.errors.join(', ') }}</span>
            </div>
          </div>
        </div>

        <div *ngIf="importSuccess" class="import-success">
          Successfully imported {{ importedCount }} referrals.
        </div>
        <div *ngIf="importError" class="import-error">
          {{ importError }}
        </div>
      </div>

      <!-- Add Form -->
      <div *ngIf="showAddForm" class="add-form">
        <h3>Add New Referral</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="firstName">First Name *</label>
            <input id="firstName" type="text" [(ngModel)]="newReferral.firstName" placeholder="First name" />
          </div>
          <div class="form-group">
            <label for="lastName">Last Name *</label>
            <input id="lastName" type="text" [(ngModel)]="newReferral.lastName" placeholder="Last name" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="email">Email *</label>
            <input id="email" type="email" [(ngModel)]="newReferral.email" placeholder="Email address" />
          </div>
          <div class="form-group">
            <label for="phone">Phone *</label>
            <input id="phone" type="text" [(ngModel)]="newReferral.phone" placeholder="Phone number" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="cityState">City, State</label>
            <input id="cityState" type="text" [(ngModel)]="newReferral.cityState" placeholder="City, State" />
          </div>
          <div class="form-group">
            <label for="referredFrom">Referred From *</label>
            <input id="referredFrom" type="text" [(ngModel)]="newReferral.referredFrom" placeholder="Who referred them" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="willingToTravel">Willing to Travel</label>
            <select id="willingToTravel" [(ngModel)]="newReferral.willingToTravel">
              <option [ngValue]="null">Unknown</option>
              <option [ngValue]="true">Yes</option>
              <option [ngValue]="false">No</option>
            </select>
          </div>
        </div>
        <div *ngIf="addFormError" class="form-error">{{ addFormError }}</div>
        <div class="form-actions">
          <button class="btn-save" (click)="submitReferral()" [disabled]="isSaving">
            {{ isSaving ? 'Saving...' : 'Save Referral' }}
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="referral-filters">
        <input
          type="text"
          class="search-input"
          placeholder="Search by name, email, or referrer..."
          (input)="onSearchInput($event)"
          aria-label="Search referrals"
        />
        <select class="status-filter" (change)="onStatusFilter($event)" aria-label="Filter by status">
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="onboarded">Onboarded</option>
          <option value="declined">Declined</option>
        </select>
        <label class="travel-filter">
          <input type="checkbox" (change)="onTravelFilter($event)" />
          Willing to Travel
        </label>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="loading-state">Loading referrals...</div>

      <!-- Error -->
      <div *ngIf="errorMessage" class="error-state">
        <p>{{ errorMessage }}</p>
        <button class="btn-retry" (click)="loadReferrals()">Retry</button>
      </div>

      <!-- Empty -->
      <div *ngIf="!isLoading && !errorMessage && filteredReferrals.length === 0" class="empty-state">
        <p>No referrals found. Add one manually or import from a spreadsheet.</p>
      </div>

      <!-- Referral Table -->
      <table *ngIf="filteredReferrals.length > 0" class="referral-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>City, State</th>
            <th>Travel</th>
            <th>Referred From</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let referral of filteredReferrals">
            <td>{{ referral.firstName }} {{ referral.lastName }}</td>
            <td><a [href]="'mailto:' + referral.email">{{ referral.email }}</a></td>
            <td>{{ referral.phone }}</td>
            <td>{{ referral.cityState || '—' }}</td>
            <td>
              <span class="travel-badge" [ngClass]="getTravelClass(referral.willingToTravel)">
                {{ getTravelLabel(referral.willingToTravel) }}
              </span>
            </td>
            <td>{{ referral.referredFrom }}</td>
            <td>
              <select
                class="status-select"
                [ngModel]="referral.status"
                (ngModelChange)="updateStatus(referral, $event)"
                [attr.aria-label]="'Update status for ' + referral.firstName + ' ' + referral.lastName"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="onboarded">Onboarded</option>
                <option value="declined">Declined</option>
              </select>
            </td>
            <td>
              <button
                class="btn-convert"
                *ngIf="referral.status !== 'onboarded'"
                (click)="convertToCandidate(referral)"
                title="Convert to Candidate"
              >
                &#x2192; Candidate
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .referral-tracker-container {
      padding: 1.5rem;
      background-color: #f5f7fa;
      min-height: 100%;
    }

    .referral-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .referral-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #212121;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn-import, .btn-add, .btn-parse, .btn-confirm-import, .btn-save, .btn-retry, .btn-convert {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn-import { background: #7b1fa2; color: #fff; }
    .btn-import:hover { background: #6a1b9a; }
    .btn-add { background: #1976d2; color: #fff; }
    .btn-add:hover { background: #1565c0; }
    .btn-parse { background: #f57c00; color: #fff; }
    .btn-parse:hover:not(:disabled) { background: #ef6c00; }
    .btn-confirm-import { background: #388e3c; color: #fff; }
    .btn-confirm-import:hover:not(:disabled) { background: #2e7d32; }
    .btn-save { background: #1976d2; color: #fff; }
    .btn-save:hover:not(:disabled) { background: #1565c0; }
    .btn-retry { background: #1976d2; color: #fff; }
    .btn-convert { background: transparent; color: #1976d2; border: 1px solid #1976d2; font-size: 0.75rem; padding: 0.25rem 0.5rem; }
    .btn-convert:hover { background: rgba(25, 118, 210, 0.04); }

    button:disabled { opacity: 0.5; cursor: not-allowed; }

    .import-panel {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .import-panel h3 { margin: 0 0 0.5rem; font-size: 1.1rem; color: #212121; }
    .import-instructions { font-size: 0.875rem; color: #616161; margin: 0 0 0.25rem; }
    .import-columns { font-size: 0.8rem; color: #9e9e9e; font-family: monospace; margin: 0 0 0.75rem; }

    .import-textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #bdbdbd;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.8125rem;
      resize: vertical;
      box-sizing: border-box;
    }

    .import-textarea:focus { outline: none; border-color: #1976d2; box-shadow: 0 0 0 2px rgba(25,118,210,0.1); }

    .import-actions { display: flex; gap: 0.75rem; margin-top: 0.75rem; }

    .import-preview { margin-top: 1rem; }
    .import-summary { display: flex; gap: 1rem; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
    .summary-valid { color: #2e7d32; }
    .summary-invalid { color: #c62828; }
    .summary-total { color: #616161; }

    .invalid-rows { background: #fff3e0; border: 1px solid #ffcc02; border-radius: 4px; padding: 0.75rem; }
    .invalid-rows h4 { margin: 0 0 0.5rem; font-size: 0.875rem; color: #e65100; }
    .invalid-row { display: flex; gap: 0.5rem; font-size: 0.8125rem; padding: 0.25rem 0; flex-wrap: wrap; }
    .row-number { font-weight: 600; color: #424242; }
    .row-name { color: #616161; }
    .row-errors { color: #c62828; }

    .import-success { margin-top: 0.75rem; padding: 0.75rem; background: #e8f5e9; border-radius: 4px; color: #2e7d32; font-size: 0.875rem; }
    .import-error { margin-top: 0.75rem; padding: 0.75rem; background: #ffebee; border-radius: 4px; color: #c62828; font-size: 0.875rem; }

    .add-form {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .add-form h3 { margin: 0 0 1rem; font-size: 1.1rem; color: #212121; }

    .form-row { display: flex; gap: 1rem; margin-bottom: 0.75rem; }
    .form-group { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
    .form-group label { font-size: 0.75rem; font-weight: 500; color: #616161; text-transform: uppercase; }
    .form-group input, .form-group select {
      padding: 0.5rem 0.75rem;
      border: 1px solid #bdbdbd;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #1976d2; box-shadow: 0 0 0 2px rgba(25,118,210,0.1); }

    .form-error { color: #c62828; font-size: 0.8125rem; margin-bottom: 0.5rem; }
    .form-actions { margin-top: 0.5rem; }

    .referral-filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .search-input {
      flex: 1;
      min-width: 200px;
      padding: 0.5rem 0.75rem;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .search-input:focus { outline: none; border-color: #1976d2; }

    .status-filter {
      padding: 0.5rem 0.75rem;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .travel-filter {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      color: #424242;
      cursor: pointer;
    }

    .loading-state, .empty-state { text-align: center; padding: 2rem; color: #616161; }
    .error-state { text-align: center; padding: 2rem; background: #ffebee; border-radius: 4px; }
    .error-state p { color: #c62828; margin: 0 0 0.75rem; }

    .referral-table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .referral-table thead { background: #fafafa; border-bottom: 2px solid #e0e0e0; }
    .referral-table th { padding: 0.75rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #616161; text-transform: uppercase; }
    .referral-table td { padding: 0.75rem; font-size: 0.875rem; color: #212121; border-bottom: 1px solid #f0f0f0; }
    .referral-table a { color: #1976d2; text-decoration: none; }
    .referral-table a:hover { text-decoration: underline; }

    .travel-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.6875rem;
      font-weight: 600;
    }

    .travel-yes { background: #e8f5e9; color: #2e7d32; }
    .travel-no { background: #ffebee; color: #c62828; }
    .travel-unknown { background: #f5f5f5; color: #9e9e9e; }

    .status-select {
      padding: 0.25rem 0.5rem;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 0.8125rem;
      cursor: pointer;
    }

    @media (max-width: 768px) {
      .referral-tracker-container { padding: 1rem; }
      .referral-header { flex-direction: column; gap: 0.75rem; align-items: flex-start; }
      .form-row { flex-direction: column; }
      .referral-filters { flex-direction: column; }
      .referral-table { font-size: 0.8125rem; }
      .referral-table th, .referral-table td { padding: 0.5rem; }
    }
  `]
})
export class ReferralTrackerComponent implements OnInit, OnDestroy {
  referrals: Referral[] = [];
  filteredReferrals: Referral[] = [];
  isLoading = false;
  errorMessage = '';

  // Import
  showImportPanel = false;
  importText = '';
  importResult: ReferralImportResult | null = null;
  isImporting = false;
  importSuccess = false;
  importedCount = 0;
  importError = '';

  // Add form
  showAddForm = false;
  isSaving = false;
  addFormError = '';
  newReferral: CreateReferralPayload = this.emptyReferral();

  // Filters
  private searchSubject = new Subject<string>();
  private filters: ReferralFilters = {};
  private destroy$ = new Subject<void>();

  constructor(private referralService: ReferralService) {}

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.filters.search = term || undefined;
      this.applyFilters();
    });

    this.loadReferrals();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReferrals(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.referralService.getReferrals().subscribe({
      next: (referrals) => {
        this.referrals = referrals;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load referrals.';
        this.isLoading = false;
      }
    });
  }

  // --- Import ---

  parseImport(): void {
    this.importResult = this.referralService.parseImportText(this.importText);
    this.importSuccess = false;
    this.importError = '';
  }

  confirmImport(): void {
    if (!this.importResult || this.importResult.validRows.length === 0) return;

    this.isImporting = true;
    this.importError = '';
    this.referralService.bulkImport(this.importResult.validRows).subscribe({
      next: (imported) => {
        this.importedCount = imported.length;
        this.importSuccess = true;
        this.isImporting = false;
        this.importText = '';
        this.importResult = null;
        this.loadReferrals();
      },
      error: (err) => {
        this.importError = err?.message || 'Import failed. Please try again.';
        this.isImporting = false;
      }
    });
  }

  // --- Add Form ---

  submitReferral(): void {
    this.addFormError = '';
    if (!this.newReferral.firstName || !this.newReferral.lastName || !this.newReferral.email || !this.newReferral.phone || !this.newReferral.referredFrom) {
      this.addFormError = 'Please fill in all required fields.';
      return;
    }

    this.isSaving = true;
    this.referralService.createReferral(this.newReferral).subscribe({
      next: () => {
        this.isSaving = false;
        this.showAddForm = false;
        this.newReferral = this.emptyReferral();
        this.loadReferrals();
      },
      error: (err) => {
        this.addFormError = err?.message || 'Failed to save referral.';
        this.isSaving = false;
      }
    });
  }

  // --- Filters ---

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }

  onStatusFilter(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filters.status = (select.value as ReferralStatus) || undefined;
    this.applyFilters();
  }

  onTravelFilter(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.filters.willingToTravel = checkbox.checked ? true : undefined;
    this.applyFilters();
  }

  // --- Table Actions ---

  updateStatus(referral: Referral, newStatus: ReferralStatus): void {
    this.referralService.updateReferral(referral.id, {
      status: newStatus,
      onboarded: newStatus === 'onboarded'
    }).subscribe({
      next: (updated) => {
        const idx = this.referrals.findIndex(r => r.id === referral.id);
        if (idx >= 0) {
          this.referrals[idx] = updated;
          this.applyFilters();
        }
      }
    });
  }

  convertToCandidate(referral: Referral): void {
    // Navigate to the candidate form pre-filled with referral data
    // For now, we'll use a simple approach of opening the form with query params
    const params = new URLSearchParams({
      techName: `${referral.firstName} ${referral.lastName}`,
      techEmail: referral.email,
      techPhone: referral.phone,
      workSite: referral.cityState || '',
      referralId: referral.id
    });
    window.location.href = `#/onboarding/candidates/new?${params.toString()}`;
  }

  // --- Helpers ---

  getTravelLabel(value: boolean | null): string {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return '?';
  }

  getTravelClass(value: boolean | null): string {
    if (value === true) return 'travel-yes';
    if (value === false) return 'travel-no';
    return 'travel-unknown';
  }

  private applyFilters(): void {
    let filtered = [...this.referrals];

    if (this.filters.search) {
      const term = this.filters.search.toLowerCase();
      filtered = filtered.filter(r =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        r.referredFrom.toLowerCase().includes(term)
      );
    }

    if (this.filters.status) {
      filtered = filtered.filter(r => r.status === this.filters.status);
    }

    if (this.filters.willingToTravel != null) {
      filtered = filtered.filter(r => r.willingToTravel === this.filters.willingToTravel);
    }

    this.filteredReferrals = filtered;
  }

  private emptyReferral(): CreateReferralPayload {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      cityState: '',
      willingToTravel: null,
      referredFrom: '',
    };
  }
}
