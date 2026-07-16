import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { forkJoin, Observable } from 'rxjs';
import { OnboardingService } from '../../../services/onboarding.service';
import { OnboardingLinkService } from '../../../services/onboarding-link.service';
import { Candidate, CreateCandidatePayload, UpdateCandidatePayload, OfferStatus } from '../../../models/onboarding.models';
import { AddCandidateModalComponent } from '../add-candidate-modal/add-candidate-modal.component';
import { GenerateLinkDialogComponent } from '../generate-link-dialog/generate-link-dialog.component';
import { CandidateNotesDialogComponent } from '../candidate-notes-dialog/candidate-notes-dialog.component';

type SortDirection = 'asc' | 'desc';

interface SortState {
  column: keyof Candidate;
  direction: SortDirection;
}

const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  needs_review: 'Needs Review',
  vetted_available: 'Vetted/Available',
  offer_extended: 'Offer Extended',
  offer_accepted_onboarding: 'Offer Accepted/Onboarding',
  hired_assigned: 'Hired/Assigned',
  do_not_hire: 'Do Not Hire',
  turned_down_hold: 'Turned Down/Hold for Later',
};

@Component({
  selector: 'app-candidate-list',
  template: `
    <div class="candidate-list-container">
      <div class="header-row">
        <h2>Candidates</h2>
        <div class="header-actions">
          <button type="button" class="generate-link-btn" (click)="onGenerateLink()" aria-label="Generate candidate information sheet link">
            Generate Info Sheet Link
          </button>
          <button type="button" class="add-candidate-btn" (click)="onAddCandidate()" aria-label="Add new candidate">
            + Add Candidate
          </button>
        </div>
      </div>

      <!-- Error Banner -->
      <div class="error-banner" *ngIf="errorMessage" role="alert">
        <span>{{ errorMessage }}</span>
        <button type="button" (click)="errorMessage = ''" aria-label="Dismiss error">Dismiss</button>
      </div>

      <!-- Success Banner -->
      <div class="success-banner" *ngIf="successMessage" role="status">
        <span>{{ successMessage }}</span>
        <button type="button" (click)="successMessage = ''" aria-label="Dismiss message">Dismiss</button>
      </div>

      <!-- Filters -->
      <div class="filters-row">
        <div class="filter-field">
          <label for="searchInput">Search</label>
          <input id="searchInput"
                 type="text"
                 [value]="searchText"
                 (input)="onSearchChange($event)"
                 placeholder="Search by name, email, or home state" />
        </div>
        <div class="filter-field">
          <label for="statusFilter">Offer Status</label>
          <select id="statusFilter"
                  [value]="statusFilter"
                  (change)="onStatusFilterChange($event)">
            <option value="">All Statuses</option>
            <option value="needs_review">Needs Review</option>
            <option value="vetted_available">Vetted/Available</option>
            <option value="offer_extended">Offer Extended</option>
            <option value="offer_accepted_onboarding">Offer Accepted/Onboarding</option>
            <option value="hired_assigned">Hired/Assigned</option>
            <option value="do_not_hire">Do Not Hire</option>
            <option value="turned_down_hold">Turned Down/Hold for Later</option>
          </select>
        </div>
        <div class="filter-field">
          <label for="homeStateFilter">Home State</label>
          <select id="homeStateFilter"
                  [(ngModel)]="homeStateFilter"
                  (ngModelChange)="onHomeStateFilterChange()">
            <option value="">All States</option>
            <option *ngFor="let state of availableStates" [value]="state">{{ state }}</option>
          </select>
        </div>
        <div class="filter-field">
          <label for="referredByFilter">Referred By</label>
          <select id="referredByFilter"
                  [(ngModel)]="referredByFilter"
                  (ngModelChange)="onReferredByFilterChange()">
            <option value="">All Referrers</option>
            <option *ngFor="let referrer of availableReferrers" [value]="referrer">{{ referrer }}</option>
          </select>
        </div>
      </div>

      <!-- Bulk Action Bar -->
      <div class="bulk-action-bar" *ngIf="selectedCandidateIds.size > 0">
        <span class="bulk-selection-count">{{ selectedCandidateIds.size }} candidate{{ selectedCandidateIds.size > 1 ? 's' : '' }} selected</span>
        <button type="button"
                class="bulk-convert-btn"
                (click)="onBulkConvert()"
                [disabled]="bulkConverting">
          <mat-icon class="bulk-icon">group_add</mat-icon>
          {{ bulkConverting ? 'Converting...' : 'Convert Selected to Technicians' }}
        </button>
        <button type="button" class="bulk-clear-btn" (click)="clearSelection()">
          Clear Selection
        </button>
      </div>

      <!-- Candidate Table -->
      <div class="table-wrapper" *ngIf="filteredCandidates.length > 0">
      <table class="candidate-table">
        <colgroup>
          <col style="width: 3%;">
          <col style="width: 9%;">
          <col style="width: 13%;">
          <col style="width: 8%;">
          <col style="width: 5%;">
          <col style="width: 5%;">
          <col style="width: 5%;">
          <col style="width: 5%;">
          <col style="width: 5%;">
          <col style="width: 7%;">
          <col style="width: 7%;">
          <col style="width: 10%;">
          <col style="width: 18%;">
        </colgroup>
        <thead>
          <tr>
            <th class="checkbox-col">
              <input type="checkbox"
                     [checked]="isAllPageSelected()"
                     [indeterminate]="isSomePageSelected()"
                     (change)="onToggleSelectAll($event)"
                     aria-label="Select all eligible candidates on this page"
                     title="Select all eligible candidates on this page" />
            </th>
            <th (click)="onSort('techName')" class="sortable">
              Tech Name <span class="sort-icon">{{ getSortIcon('techName') }}</span>
            </th>
            <th (click)="onSort('techEmail')" class="sortable">
              Tech Email <span class="sort-icon">{{ getSortIcon('techEmail') }}</span>
            </th>
            <th (click)="onSort('techPhone')" class="sortable">
              Tech Phone <span class="sort-icon">{{ getSortIcon('techPhone') }}</span>
            </th>
            <th (click)="onSort('vestSize')" class="sortable">
              Vest Size <span class="sort-icon">{{ getSortIcon('vestSize') }}</span>
            </th>
            <th (click)="onSort('drugTestComplete')" class="sortable">
              Drug Test <span class="sort-icon">{{ getSortIcon('drugTestComplete') }}</span>
            </th>
            <th (click)="onSort('oshaCertified')" class="sortable">
              OSHA <span class="sort-icon">{{ getSortIcon('oshaCertified') }}</span>
            </th>
            <th (click)="onSort('scissorLiftCertified')" class="sortable">
              Scissor Lift <span class="sort-icon">{{ getSortIcon('scissorLiftCertified') }}</span>
            </th>
            <th (click)="onSort('homeState')" class="sortable">
              Home State <span class="sort-icon">{{ getSortIcon('homeState') }}</span>
            </th>
            <th (click)="onSort('referredBy')" class="sortable">
              Referred By <span class="sort-icon">{{ getSortIcon('referredBy') }}</span>
            </th>
            <th (click)="onSort('startDate')" class="sortable">
              Start Date <span class="sort-icon">{{ getSortIcon('startDate') }}</span>
            </th>
            <th (click)="onSort('offerStatus')" class="sortable">
              Offer Status <span class="sort-icon">{{ getSortIcon('offerStatus') }}</span>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let candidate of paginatedCandidates"
              (click)="onRowClick(candidate)"
              class="candidate-row"
              [class.selected-row]="selectedCandidateIds.has(candidate.candidateId)"
              tabindex="0"
              (keydown.enter)="onRowClick(candidate)"
              [attr.aria-label]="'Edit candidate ' + candidate.techName">
            <td class="checkbox-col" (click)="$event.stopPropagation()">
              <input type="checkbox"
                     *ngIf="canConvert(candidate)"
                     [checked]="selectedCandidateIds.has(candidate.candidateId)"
                     (change)="onToggleSelect(candidate, $event)"
                     [attr.aria-label]="'Select ' + candidate.techName + ' for bulk conversion'" />
            </td>
            <td>{{ candidate.techName }}</td>
            <td>{{ candidate.techEmail }}</td>
            <td>{{ candidate.techPhone }}</td>
            <td>{{ candidate.vestSize }}</td>
            <td class="bool-cell"><span [class]="candidate.drugTestComplete ? 'yn-yes' : 'yn-no'">{{ candidate.drugTestComplete ? '\u2714' : '\u2014' }}</span></td>
            <td class="bool-cell"><span [class]="candidate.oshaCertified ? 'yn-yes' : 'yn-no'">{{ candidate.oshaCertified ? '\u2714' : '\u2014' }}</span></td>
            <td class="bool-cell"><span [class]="candidate.scissorLiftCertified ? 'yn-yes' : 'yn-no'">{{ candidate.scissorLiftCertified ? '\u2714' : '\u2014' }}</span></td>
            <td>{{ candidate.homeState || extractState(candidate.homeAddress) || '—' }}</td>
            <td>{{ candidate.referredBy || '—' }}</td>
            <td>{{ candidate.startDate | date:'MMM d, yyyy' }}</td>
            <td>{{ getStatusLabel(candidate.offerStatus) }}</td>
            <td class="actions-cell">
              <button class="icon-btn icon-resume"
                      [class.has-file]="candidate.resumeUrl"
                      [disabled]="!candidate.resumeUrl"
                      (click)="onViewResume(candidate); $event.stopPropagation()"
                      [attr.aria-label]="candidate.resumeUrl ? 'View resume for ' + candidate.techName : 'No resume uploaded'"
                      [title]="candidate.resumeUrl ? 'View Resume' : 'No resume uploaded'">
                <mat-icon class="action-icon">description</mat-icon>
              </button>
              <button class="icon-btn icon-notes"
                      [class.has-notes]="candidate.notes"
                      (click)="onViewNotes(candidate); $event.stopPropagation()"
                      [attr.aria-label]="'Notes for ' + candidate.techName"
                      [title]="candidate.notes ? 'View/Edit Notes' : 'Add Notes'">
                <mat-icon class="action-icon">sticky_note_2</mat-icon>
              </button>
              <button class="action-btn btn-view" (click)="onRowClick(candidate); $event.stopPropagation()">View</button>
              <button class="action-btn btn-edit-action" (click)="onEditCandidate(candidate); $event.stopPropagation()">Edit</button>
              <button class="action-btn btn-convert"
                      *ngIf="canConvert(candidate)"
                      (click)="onConvertToTechnician(candidate); $event.stopPropagation()"
                      [disabled]="convertingId === candidate.candidateId">
                {{ convertingId === candidate.candidateId ? 'Converting...' : 'Convert to Tech' }}
              </button>
              <button class="action-btn btn-delete" (click)="onDeleteCandidate(candidate); $event.stopPropagation()">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <mat-paginator *ngIf="filteredCandidates.length > 0"
                     [length]="filteredCandidates.length"
                     [pageSize]="pageSize"
                     [pageSizeOptions]="pageSizeOptions"
                     [pageIndex]="pageIndex"
                     (page)="onPageChange($event)"
                     showFirstLastButtons
                     aria-label="Select page of candidates">
      </mat-paginator>

      <!-- Empty State -->
      <p *ngIf="!loading && filteredCandidates.length === 0 && !errorMessage" class="empty-state">
        No candidates match the current filters.
      </p>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-indicator">
        <span>Loading candidates...</span>
      </div>
    </div>
  `,
  styles: [`
    .candidate-list-container {
      margin: 1.5rem;
      padding: 1.5rem;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #212121;
    }

    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .generate-link-btn {
      padding: 0.5rem 1rem;
      background-color: #7b1fa2;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .generate-link-btn:hover {
      background-color: #6a1b9a;
    }

    .generate-link-btn:focus {
      outline: 2px solid #7b1fa2;
      outline-offset: 2px;
    }

    .add-candidate-btn {
      padding: 0.5rem 1rem;
      background-color: #1976d2;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .add-candidate-btn:hover {
      background-color: #1565c0;
    }

    .add-candidate-btn:focus {
      outline: 2px solid #1976d2;
      outline-offset: 2px;
    }

    .error-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      background: #fdecea;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      color: #b71c1c;
      font-size: 0.875rem;
    }

    .error-banner button {
      background: none;
      border: none;
      color: #b71c1c;
      cursor: pointer;
      font-weight: 600;
      text-decoration: underline;
    }

    .success-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      background: #e8f5e9;
      border: 1px solid #a5d6a7;
      border-radius: 4px;
      color: #1b5e20;
      font-size: 0.875rem;
    }

    .success-banner button {
      background: none;
      border: none;
      color: #1b5e20;
      cursor: pointer;
      font-weight: 600;
      text-decoration: underline;
    }

    .filters-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .filter-field label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #424242;
    }

    .filter-field input,
    .filter-field select {
      padding: 0.5rem 0.75rem;
      border: 1px solid #bdbdbd;
      border-radius: 4px;
      font-size: 0.875rem;
      min-width: 200px;
    }

    .filter-field input:focus,
    .filter-field select:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
    }

    .table-wrapper {
      overflow-x: auto;
      width: 100%;
    }

    .candidate-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      table-layout: fixed;
    }

    .candidate-table thead th {
      text-align: left;
      padding: 0.5rem 0.5rem;
      background: #f5f5f5;
      border-bottom: 2px solid #e0e0e0;
      font-weight: 600;
      color: #424242;
      white-space: nowrap;
      font-size: 0.8rem;
    }

    .candidate-table thead th.sortable {
      cursor: pointer;
      user-select: none;
    }

    .candidate-table thead th.sortable:hover {
      background: #eeeeee;
    }

    .sort-icon {
      font-size: 0.75rem;
      margin-left: 0.25rem;
    }

    .candidate-table tbody td {
      padding: 0.4rem 0.5rem;
      border-bottom: 1px solid #e0e0e0;
      color: #212121;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .candidate-row {
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .candidate-row:hover {
      background-color: rgba(25, 118, 210, 0.04);
    }

    .candidate-row:focus {
      outline: 2px solid #1976d2;
      outline-offset: -2px;
    }

    .bool-cell {
      text-align: center;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .yn-yes {
      color: #2e7d32;
    }

    .yn-no {
      color: #c62828;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: #757575;
      font-size: 0.875rem;
    }

    .loading-indicator {
      text-align: center;
      padding: 2rem;
      color: #757575;
    }

    .actions-cell {
      white-space: normal;
      text-align: center;
      min-width: 180px;
    }

    .checkbox-col {
      text-align: center;
      width: 36px;
      padding: 0.25rem !important;
    }

    .checkbox-col input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: #7b1fa2;
    }

    .selected-row {
      background-color: rgba(123, 31, 162, 0.06) !important;
    }

    .selected-row:hover {
      background-color: rgba(123, 31, 162, 0.1) !important;
    }

    .bulk-action-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      margin-bottom: 0.75rem;
      background: #f3e5f5;
      border: 1px solid #ce93d8;
      border-radius: 6px;
      animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .bulk-selection-count {
      font-size: 0.875rem;
      font-weight: 600;
      color: #4a148c;
    }

    .bulk-convert-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      background-color: #7b1fa2;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .bulk-convert-btn:hover:not(:disabled) {
      background-color: #6a1b9a;
    }

    .bulk-convert-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .bulk-convert-btn .bulk-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .bulk-clear-btn {
      padding: 0.4rem 0.75rem;
      background: none;
      border: 1px solid #9c27b0;
      border-radius: 4px;
      color: #7b1fa2;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .bulk-clear-btn:hover {
      background-color: rgba(123, 31, 162, 0.08);
    }

    .action-btn {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 500;
      cursor: pointer;
      margin: 2px;
      transition: background-color 0.2s;
      display: inline-block;
    }

    .btn-view {
      background: #e3f2fd;
      color: #1565c0;
      border: 1px solid #90caf9;
    }

    .btn-view:hover { background: #bbdefb; }

    .btn-edit-action {
      background: #fff3e0;
      color: #e65100;
      border: 1px solid #ffcc80;
    }

    .btn-edit-action:hover { background: #ffe0b2; }

    .btn-delete {
      background: #ffebee;
      color: #c62828;
      border: 1px solid #ef9a9a;
    }

    .btn-delete:hover { background: #ffcdd2; }

    .btn-convert {
      background: #f3e5f5;
      color: #7b1fa2;
      border: 1px solid #ce93d8;
    }

    .btn-convert:hover:not(:disabled) { background: #e1bee7; }
    .btn-convert:disabled { opacity: 0.6; cursor: not-allowed; }

    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 4px;
      border: 1px solid transparent;
      background: none;
      cursor: pointer;
      margin: 2px;
      transition: background-color 0.15s, opacity 0.15s, color 0.15s;
      vertical-align: middle;
      opacity: 0.4;
      color: #757575;
      padding: 0;
    }

    .icon-btn .action-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .icon-btn:disabled {
      cursor: not-allowed;
      opacity: 0.2;
    }

    .icon-btn.has-file {
      opacity: 1;
      color: #1565c0;
    }

    .icon-btn.has-notes {
      opacity: 1;
      color: #e65100;
    }

    .icon-btn.icon-resume:not(:disabled):hover {
      background: #e3f2fd;
      border-color: #90caf9;
      color: #1565c0;
      opacity: 1;
    }

    .icon-btn.icon-notes:hover {
      background: #fff3e0;
      border-color: #ffcc80;
      color: #e65100;
      opacity: 1;
    }

    :host ::ng-deep .mat-mdc-paginator {
      border-top: 1px solid #e0e0e0;
      background: #fafafa;
      border-radius: 0 0 8px 8px;
      color: #000000;
    }

    :host ::ng-deep .mat-mdc-paginator .mat-mdc-paginator-range-label,
    :host ::ng-deep .mat-mdc-paginator .mat-mdc-select-value-text {
      color: #000000;
    }

    :host ::ng-deep .mat-mdc-paginator .mat-mdc-icon-button {
      color: #000000;
    }

    :host ::ng-deep .mat-mdc-paginator .mat-mdc-icon-button svg {
      fill: #000000;
    }

    :host ::ng-deep .mat-mdc-paginator .mat-mdc-icon-button[disabled] {
      color: rgba(0, 0, 0, 0.38);
    }

    :host ::ng-deep .mat-mdc-paginator .mat-mdc-icon-button[disabled] svg {
      fill: rgba(0, 0, 0, 0.38);
    }

    @media (max-width: 768px) {
      .candidate-list-container {
        margin: 1rem;
        padding: 1rem;
        overflow-x: auto;
      }

      .filters-row {
        flex-direction: column;
      }

      .filter-field input,
      .filter-field select {
        min-width: unset;
        width: 100%;
      }
    }
  `]
})

export class CandidateListComponent implements OnInit {
  candidates: Candidate[] = [];
  filteredCandidates: Candidate[] = [];
  paginatedCandidates: Candidate[] = [];
  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  convertingId: string | null = null;

  // Bulk selection
  selectedCandidateIds = new Set<string>();
  bulkConverting = false;

  searchText = '';
  statusFilter = '';
  homeStateFilter = '';
  referredByFilter = '';
  incompleteCertsFilter = false;
  sortState: SortState | null = null;
  availableStates: string[] = [];
  availableReferrers: string[] = [];

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private onboardingService: OnboardingService,
    private onboardingLinkService: OnboardingLinkService
  ) {}

  ngOnInit(): void {
    // Read query params for pre-filtering (from pipeline dashboard navigation)
    const params = this.route.snapshot.queryParams;
    if (params['offerStatus']) {
      this.statusFilter = params['offerStatus'];
    }
    if (params['search']) {
      this.searchText = params['search'];
    }
    if (params['incompleteCerts'] === 'true') {
      this.incompleteCertsFilter = true;
    }

    this.loadCandidates();
  }

  onSearchChange(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
    this.pageIndex = 0;
    this.applyFiltersAndSort();
  }

  onStatusFilterChange(event: Event): void {
    this.statusFilter = (event.target as HTMLSelectElement).value;
    this.pageIndex = 0;
    this.applyFiltersAndSort();
  }

  onHomeStateFilterChange(): void {
    this.pageIndex = 0;
    this.applyFiltersAndSort();
  }

  onReferredByFilterChange(): void {
    this.pageIndex = 0;
    this.applyFiltersAndSort();
  }

  onSort(column: keyof Candidate): void {
    if (this.sortState?.column === column) {
      this.sortState = {
        column,
        direction: this.sortState.direction === 'asc' ? 'desc' : 'asc',
      };
    } else {
      this.sortState = { column, direction: 'asc' };
    }
    this.applyFiltersAndSort();
  }

  getSortIcon(column: keyof Candidate): string {
    if (this.sortState?.column !== column) return '';
    return this.sortState.direction === 'asc' ? '▲' : '▼';
  }

  getStatusLabel(status: OfferStatus): string {
    return OFFER_STATUS_LABELS[status] ?? status;
  }

  extractState(address: string | undefined): string {
    if (!address) return '';
    const match = address.match(/,\s*([A-Z]{2})[\s.]*(\d{5})?[.\s]*$/);
    return match ? match[1] : '';
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedCandidates();
  }

  onRowClick(candidate: Candidate): void {
    this.router.navigate(['candidates', candidate.candidateId], {
      relativeTo: this.route.parent,
    });
  }

  onEditCandidate(candidate: Candidate): void {
    const dialogRef = this.dialog.open(AddCandidateModalComponent, {
      width: '780px',
      maxWidth: '90vw',
      disableClose: true,
      data: { candidate }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const payload: UpdateCandidatePayload = {
          techName: `${result.basicInfo.firstName} ${result.basicInfo.lastName}`,
          middleName: result.basicInfo.middleName,
          techEmail: result.basicInfo.email,
          techPhone: result.basicInfo.phone,
          vestSize: result.basicInfo.vestSize,
          homeAddress: result.basicInfo.homeAddress,
          workSite: result.basicInfo.workSite || undefined,
          homeState: result.basicInfo.homeState || undefined,
          startDate: result.basicInfo.startDate,
          offerStatus: result.basicInfo.offerStatus,
          referredBy: result.basicInfo.referredBy || undefined,
          biisciCertified: result.coreQualifications.fiberExperience,
          backgroundCheckComplete: result.coreQualifications.backgroundCheckComplete,
          drugTestComplete: result.coreQualifications.drugScreenComplete,
          oshaCertified: result.coreQualifications.oshaCertification,
          scissorLiftCertified: result.coreQualifications.liftCertification,
          fiberExperience: result.coreQualifications.fiberExperience,
          liftCertification: result.coreQualifications.liftCertification,
          travelAvailability: result.coreQualifications.travelAvailability,
          shiftAvailability: result.coreQualifications.shiftAvailability,
          militaryBackground: result.coreQualifications.militaryBackground,
          attBadge: result.badgesAccess.attBadge,
          lumenBadge: result.badgesAccess.lumenBadge,
          attSupplierTraining: result.badgesAccess.attSupplierTraining,
          cienaBasicTraining: result.badgesAccess.cienaBasicTraining,
          googleRedBadge: result.badgesAccess.googleRedBadge,
          googleLdap: result.badgesAccess.googleLdap,
          metaGreenListing: result.badgesAccess.metaGreenListing,
          obsTraining: result.trainingCerts.obsTraining,
          osha10: result.trainingCerts.osha10,
          osha30: result.trainingCerts.osha30,
          techHandTools: result.trainingCerts.techHandTools,
          ciKitAssigned: result.equipmentKits.ciKitAssigned,
          fiberKitAssigned: result.equipmentKits.fiberKitAssigned,
          labelingKitAssigned: result.equipmentKits.labelingKitAssigned,
          powerKitAssigned: result.equipmentKits.powerKitAssigned,
          testingEqptAssigned: result.equipmentKits.testingEquipmentAssigned
        };
        this.onboardingService.updateCandidate(candidate.candidateId, payload).subscribe({
          next: () => {
            this.uploadCandidateFiles(candidate.candidateId, result.files, () => this.loadCandidates());
          },
          error: () => {
            this.errorMessage = 'Failed to update candidate. Please try again.';
            this.loadCandidates();
          }
        });
      }
    });
  }

  onGenerateLink(): void {
    this.dialog.open(GenerateLinkDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
    });
  }

  onAddCandidate(): void {
    if (this.submitting) return;

    const dialogRef = this.dialog.open(AddCandidateModalComponent, {
      width: '780px',
      maxWidth: '90vw',
      disableClose: true,
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.submitting = true;
        const payload: CreateCandidatePayload = {
          techName: `${result.basicInfo.firstName} ${result.basicInfo.lastName}`,
          middleName: result.basicInfo.middleName,
          techEmail: result.basicInfo.email,
          techPhone: result.basicInfo.phone,
          vestSize: result.basicInfo.vestSize,
          homeAddress: result.basicInfo.homeAddress,
          workSite: result.basicInfo.workSite || undefined,
          homeState: result.basicInfo.homeState || undefined,
          startDate: result.basicInfo.startDate,
          offerStatus: result.basicInfo.offerStatus,
          referredBy: result.basicInfo.referredBy || undefined,
          biisciCertified: result.coreQualifications.fiberExperience,
          backgroundCheckComplete: result.coreQualifications.backgroundCheckComplete,
          drugTestComplete: result.coreQualifications.drugScreenComplete,
          oshaCertified: result.coreQualifications.oshaCertification,
          scissorLiftCertified: result.coreQualifications.liftCertification,
          fiberExperience: result.coreQualifications.fiberExperience,
          liftCertification: result.coreQualifications.liftCertification,
          travelAvailability: result.coreQualifications.travelAvailability,
          shiftAvailability: result.coreQualifications.shiftAvailability,
          militaryBackground: result.coreQualifications.militaryBackground,
          attBadge: result.badgesAccess.attBadge,
          lumenBadge: result.badgesAccess.lumenBadge,
          attSupplierTraining: result.badgesAccess.attSupplierTraining,
          cienaBasicTraining: result.badgesAccess.cienaBasicTraining,
          googleRedBadge: result.badgesAccess.googleRedBadge,
          googleLdap: result.badgesAccess.googleLdap,
          metaGreenListing: result.badgesAccess.metaGreenListing,
          obsTraining: result.trainingCerts.obsTraining,
          osha10: result.trainingCerts.osha10,
          osha30: result.trainingCerts.osha30,
          techHandTools: result.trainingCerts.techHandTools,
          ciKitAssigned: result.equipmentKits.ciKitAssigned,
          fiberKitAssigned: result.equipmentKits.fiberKitAssigned,
          labelingKitAssigned: result.equipmentKits.labelingKitAssigned,
          powerKitAssigned: result.equipmentKits.powerKitAssigned,
          testingEqptAssigned: result.equipmentKits.testingEquipmentAssigned
        };

        this.onboardingService.createCandidate(payload).subscribe({
          next: (createdCandidate) => {
            this.submitting = false;
            this.uploadCandidateFiles(createdCandidate.candidateId, result.files, () => this.loadCandidates());
          },
          error: () => {
            this.submitting = false;
            this.errorMessage = 'Failed to create candidate. Please try again.';
            this.loadCandidates();
          }
        });
      }
    });
  }

  onDeleteCandidate(candidate: Candidate): void {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${candidate.techName}? This cannot be undone.`
    );
    if (!confirmed) return;

    this.onboardingService.deleteCandidateById(candidate.candidateId).subscribe({
      next: () => {
        this.loadCandidates();
      },
      error: () => {
        this.errorMessage = 'Failed to delete candidate. Please try again.';
      }
    });
  }

  // ─── Convert to Technician ────────────────────────────────────────────────

  canConvert(candidate: Candidate): boolean {
    return (candidate.offerStatus === 'offer_accepted_onboarding' || candidate.offerStatus === 'hired_assigned') &&
           candidate.oshaCertified;
  }

  onConvertToTechnician(candidate: Candidate): void {
    if (this.convertingId) return;

    const confirmed = window.confirm(
      `Convert ${candidate.techName} to an active Technician? This will create a new technician record.`
    );
    if (!confirmed) return;

    this.convertingId = candidate.candidateId;
    this.onboardingService.convertToTechnician(candidate.candidateId).subscribe({
      next: (result) => {
        this.convertingId = null;
        this.router.navigate(['/field-resource-management/onboarding/credentials', result.technicianId]);
      },
      error: () => {
        this.convertingId = null;
        this.errorMessage = 'Failed to convert candidate to technician. Please try again.';
      }
    });
  }

  // ─── Bulk Selection & Conversion ──────────────────────────────────────────

  onToggleSelect(candidate: Candidate, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedCandidateIds.add(candidate.candidateId);
    } else {
      this.selectedCandidateIds.delete(candidate.candidateId);
    }
  }

  onToggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const eligibleOnPage = this.paginatedCandidates.filter(c => this.canConvert(c));
    if (checked) {
      eligibleOnPage.forEach(c => this.selectedCandidateIds.add(c.candidateId));
    } else {
      eligibleOnPage.forEach(c => this.selectedCandidateIds.delete(c.candidateId));
    }
  }

  isAllPageSelected(): boolean {
    const eligibleOnPage = this.paginatedCandidates.filter(c => this.canConvert(c));
    if (eligibleOnPage.length === 0) return false;
    return eligibleOnPage.every(c => this.selectedCandidateIds.has(c.candidateId));
  }

  isSomePageSelected(): boolean {
    const eligibleOnPage = this.paginatedCandidates.filter(c => this.canConvert(c));
    if (eligibleOnPage.length === 0) return false;
    const selectedCount = eligibleOnPage.filter(c => this.selectedCandidateIds.has(c.candidateId)).length;
    return selectedCount > 0 && selectedCount < eligibleOnPage.length;
  }

  clearSelection(): void {
    this.selectedCandidateIds.clear();
  }

  onBulkConvert(): void {
    if (this.bulkConverting || this.selectedCandidateIds.size === 0) return;

    const selectedCandidates = this.candidates.filter(
      c => this.selectedCandidateIds.has(c.candidateId) && this.canConvert(c)
    );

    if (selectedCandidates.length === 0) {
      this.errorMessage = 'No eligible candidates selected for conversion.';
      return;
    }

    const names = selectedCandidates.map(c => c.techName).join(', ');
    const confirmed = window.confirm(
      `Convert ${selectedCandidates.length} candidate${selectedCandidates.length > 1 ? 's' : ''} to Technicians?\n\n${names}\n\nThis will create new technician records for each.`
    );
    if (!confirmed) return;

    this.bulkConverting = true;
    this.errorMessage = '';

    const conversions = selectedCandidates.map(c =>
      this.onboardingService.convertToTechnician(c.candidateId)
    );

    forkJoin(conversions).subscribe({
      next: (results) => {
        this.bulkConverting = false;
        this.selectedCandidateIds.clear();
        const count = results.length;
        this.errorMessage = ''; // Clear any previous errors
        // Show success message briefly using the error banner style (we'll reuse it)
        this.successMessage = `Successfully converted ${count} candidate${count > 1 ? 's' : ''} to technicians.`;
        this.loadCandidates();
      },
      error: (err) => {
        this.bulkConverting = false;
        this.errorMessage = `Some conversions failed. ${err?.message || 'Please review the candidate list and try again.'}`;
        this.selectedCandidateIds.clear();
        this.loadCandidates();
      }
    });
  }

  onViewResume(candidate: Candidate): void {
    if (candidate.resumeUrl) {
      window.open(candidate.resumeUrl, '_blank', 'noopener,noreferrer');
    }
  }

  onViewNotes(candidate: Candidate): void {
    const dialogRef = this.dialog.open(CandidateNotesDialogComponent, {
      width: '480px',
      maxWidth: '90vw',
      data: { candidate },
    });

    dialogRef.afterClosed().subscribe((notesChanged: boolean) => {
      if (notesChanged) {
        this.loadCandidates();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private loadCandidates(): void {
    this.loading = true;
    this.errorMessage = '';

    this.onboardingService.getCandidates().subscribe({
      next: (candidates) => {
        this.candidates = candidates;
        this.loading = false;
        this.updateAvailableStates();
        this.applyFiltersAndSort();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.message || 'Failed to load candidates.';
        this.candidates = [];
        this.filteredCandidates = [];
      },
    });
  }

  private getDummyCandidates(): Candidate[] {
    const dateOnly = (daysOffset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString().split('T')[0];
    };
    const iso = (daysOffset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString();
    };

    return [
      { candidateId: 'cand-001', techName: 'Marcus Rivera', techEmail: 'marcus.rivera@fieldops.com', techPhone: '214-555-2001', vestSize: 'L', backgroundCheckComplete: true, drugTestComplete: true, oshaCertified: true, scissorLiftCertified: true, workSite: 'Dallas HQ', homeState: 'TX', startDate: dateOnly(5), offerStatus: 'offer_accepted_onboarding', createdBy: 'system', createdAt: iso(-30), updatedBy: 'system', updatedAt: iso(-5) },
      { candidateId: 'cand-002', techName: 'Priya Patel', techEmail: 'priya.patel@fieldops.com', techPhone: '214-555-2002', vestSize: 'S', backgroundCheckComplete: true, drugTestComplete: true, oshaCertified: true, scissorLiftCertified: false, workSite: 'Plano Tech Center', homeState: 'CA', startDate: dateOnly(10), offerStatus: 'offer_extended', createdBy: 'system', createdAt: iso(-25), updatedBy: 'system', updatedAt: iso(-3) },
      { candidateId: 'cand-003', techName: 'James O\'Connor', techEmail: 'james.oconnor@fieldops.com', techPhone: '972-555-2003', vestSize: 'XL', backgroundCheckComplete: true, drugTestComplete: false, oshaCertified: true, scissorLiftCertified: true, workSite: 'Irving Business Park', homeState: 'FL', startDate: dateOnly(3), offerStatus: 'offer_accepted_onboarding', createdBy: 'system', createdAt: iso(-20), updatedBy: 'system', updatedAt: iso(-2) },
      { candidateId: 'cand-004', techName: 'Aisha Johnson', techEmail: 'aisha.johnson@fieldops.com', techPhone: '469-555-2004', vestSize: 'M', backgroundCheckComplete: false, drugTestComplete: true, oshaCertified: false, scissorLiftCertified: false, workSite: 'Fort Worth DC', homeState: 'NY', startDate: dateOnly(18), offerStatus: 'needs_review', createdBy: 'system', createdAt: iso(-15), updatedBy: 'system', updatedAt: iso(-1) },
      { candidateId: 'cand-005', techName: 'Carlos Mendez', techEmail: 'carlos.mendez@fieldops.com', techPhone: '214-555-2005', vestSize: 'L', backgroundCheckComplete: true, drugTestComplete: true, oshaCertified: true, scissorLiftCertified: true, workSite: 'McKinney Site A', homeState: 'GA', startDate: dateOnly(7), offerStatus: 'vetted_available', createdBy: 'system', createdAt: iso(-10), updatedBy: 'system', updatedAt: iso(-1) },
      { candidateId: 'cand-006', techName: 'Sarah Kim', techEmail: 'sarah.kim@fieldops.com', techPhone: '972-555-2006', vestSize: 'S', backgroundCheckComplete: false, drugTestComplete: false, oshaCertified: true, scissorLiftCertified: true, workSite: 'Richardson Data Center', homeState: 'CO', startDate: dateOnly(12), offerStatus: 'needs_review', createdBy: 'system', createdAt: iso(-8), updatedBy: 'system', updatedAt: iso(-1) }
    ];
  }

  private updateAvailableStates(): void {
    const states = this.candidates
      .map(c => c.homeState || this.extractState(c.homeAddress) || '')
      .filter(s => s.length > 0);
    this.availableStates = [...new Set(states)].sort();

    const referrers = this.candidates
      .map(c => c.referredBy || '')
      .filter(r => r.length > 0);
    this.availableReferrers = [...new Set(referrers)].sort();
  }

  private applyFiltersAndSort(): void {
    let result = [...this.candidates];

    // Clear selection when filters change to avoid stale selections
    this.selectedCandidateIds.clear();

    // Text search filter
    if (this.searchText.trim()) {
      const term = this.searchText.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.techName.toLowerCase().includes(term) ||
          c.techEmail.toLowerCase().includes(term) ||
          (c.homeState || this.extractState(c.homeAddress) || '').toLowerCase().includes(term)
      );
    }

    // Offer status filter
    if (this.statusFilter) {
      result = result.filter((c) => c.offerStatus === this.statusFilter);
    }

    // Home state filter
    if (this.homeStateFilter) {
      result = result.filter(
        (c) => (c.homeState || this.extractState(c.homeAddress) || '') === this.homeStateFilter
      );
    }

    // Referred by filter
    if (this.referredByFilter) {
      result = result.filter((c) => c.referredBy === this.referredByFilter);
    }

    // Incomplete certifications filter
    if (this.incompleteCertsFilter) {
      result = result.filter(
        (c) => !c.oshaCertified || !c.scissorLiftCertified
      );
    }

    // Sort
    if (this.sortState) {
      const { column, direction } = this.sortState;
      result.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // For homeState, fall back to extracted state from address
        if (column === 'homeState') {
          aVal = (aVal as string) || this.extractState(a.homeAddress) || '';
          bVal = (bVal as string) || this.extractState(b.homeAddress) || '';
        }

        let comparison = 0;
        if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          comparison = (aVal === bVal) ? 0 : aVal ? -1 : 1;
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else {
          comparison = (aVal ?? '').toString().localeCompare((bVal ?? '').toString());
        }

        return direction === 'asc' ? comparison : -comparison;
      });
    }

    this.filteredCandidates = result;
    this.updatePaginatedCandidates();
  }

  private updatePaginatedCandidates(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedCandidates = this.filteredCandidates.slice(startIndex, endIndex);
  }

  private uploadCandidateFiles(candidateId: string, files: { resume?: File | null; headshot?: File | null }, reloadFn: () => void): void {
    const uploads: Observable<any>[] = [];
    if (files?.resume) {
      uploads.push(this.onboardingService.uploadResume(candidateId, files.resume));
    }
    if (files?.headshot) {
      uploads.push(this.onboardingService.uploadHeadshot(candidateId, files.headshot));
    }
    if (uploads.length > 0) {
      forkJoin(uploads).subscribe({
        next: () => reloadFn(),
        error: () => {
          this.errorMessage = 'Candidate saved, but one or more file uploads failed. Please try re-uploading.';
          reloadFn();
        }
      });
    } else {
      reloadFn();
    }
  }
}
