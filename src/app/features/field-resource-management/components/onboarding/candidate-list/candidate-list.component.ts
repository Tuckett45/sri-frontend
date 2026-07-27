import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OnboardingService } from '../../../services/onboarding.service';
import { Candidate, OfferStatus } from '../../../models/onboarding.models';

type SortDirection = 'asc' | 'desc';

interface SortState {
  column: keyof Candidate;
  direction: SortDirection;
}

const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pre_offer: 'Pre Offer',
  offer: 'Offer',
  offer_acceptance: 'Offer Acceptance',
};

@Component({
  selector: 'app-candidate-list',
  template: `
    <div class="candidate-list-container">
      <div class="header-row">
        <h2>Candidates</h2>
        <button type="button" class="add-candidate-btn" (click)="onAddCandidate()" aria-label="Add new candidate">
          + Add Candidate
        </button>
      </div>

      <!-- Error Banner -->
      <div class="error-banner" *ngIf="errorMessage" role="alert">
        <span>{{ errorMessage }}</span>
        <button type="button" (click)="errorMessage = ''" aria-label="Dismiss error">Dismiss</button>
      </div>

      <!-- Filters -->
      <div class="filters-row">
        <div class="filter-field">
          <label for="searchInput">Search</label>
          <input id="searchInput"
                 type="text"
                 [value]="searchText"
                 (input)="onSearchChange($event)"
                 placeholder="Search by name, email, or work site" />
        </div>
        <div class="filter-field">
          <label for="statusFilter">Offer Status</label>
          <select id="statusFilter"
                  [value]="statusFilter"
                  (change)="onStatusFilterChange($event)">
            <option value="">All Statuses</option>
            <option value="pre_offer">Pre Offer</option>
            <option value="offer">Offer</option>
            <option value="offer_acceptance">Offer Acceptance</option>
          </select>
        </div>
      </div>

      <!-- Candidate Table -->
      <table *ngIf="filteredCandidates.length > 0" class="candidate-table">
        <thead>
          <tr>
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
            <th (click)="onSort('biisciCertified')" class="sortable">
              BIISCI <span class="sort-icon">{{ getSortIcon('biisciCertified') }}</span>
            </th>
            <th (click)="onSort('workSite')" class="sortable">
              Work Site <span class="sort-icon">{{ getSortIcon('workSite') }}</span>
            </th>
            <th (click)="onSort('startDate')" class="sortable">
              Start Date <span class="sort-icon">{{ getSortIcon('startDate') }}</span>
            </th>
            <th (click)="onSort('offerStatus')" class="sortable">
              Offer Status <span class="sort-icon">{{ getSortIcon('offerStatus') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let candidate of filteredCandidates"
              (click)="onRowClick(candidate)"
              class="candidate-row"
              tabindex="0"
              (keydown.enter)="onRowClick(candidate)"
              [attr.aria-label]="'Edit candidate ' + candidate.techName">
            <td>{{ candidate.techName }}</td>
            <td>{{ candidate.techEmail }}</td>
            <td>{{ candidate.techPhone }}</td>
            <td>{{ candidate.vestSize }}</td>
            <td class="bool-cell">{{ candidate.drugTestComplete ? '✓' : '—' }}</td>
            <td class="bool-cell">{{ candidate.oshaCertified ? '✓' : '—' }}</td>
            <td class="bool-cell">{{ candidate.scissorLiftCertified ? '✓' : '—' }}</td>
            <td class="bool-cell">{{ candidate.biisciCertified ? '✓' : '—' }}</td>
            <td>{{ candidate.workSite }}</td>
            <td>{{ candidate.startDate }}</td>
            <td>{{ getStatusLabel(candidate.offerStatus) }}</td>
          </tr>
        </tbody>
      </table>

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

    .candidate-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .candidate-table thead th {
      text-align: left;
      padding: 0.625rem 0.75rem;
      background: #f5f5f5;
      border-bottom: 2px solid #e0e0e0;
      font-weight: 600;
      color: #424242;
      white-space: nowrap;
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
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #e0e0e0;
      color: #212121;
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
      font-size: 1rem;
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
  loading = false;
  errorMessage = '';

  searchText = '';
  statusFilter = '';
  incompleteCertsFilter = false;
  sortState: SortState | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private onboardingService: OnboardingService
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
    this.applyFiltersAndSort();
  }

  onStatusFilterChange(event: Event): void {
    this.statusFilter = (event.target as HTMLSelectElement).value;
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

  onRowClick(candidate: Candidate): void {
    this.router.navigate(['candidates', candidate.candidateId], {
      relativeTo: this.route.parent,
    });
  }

  onAddCandidate(): void {
    this.router.navigate(['candidates', 'new'], {
      relativeTo: this.route.parent,
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

  private applyFiltersAndSort(): void {
    let result = [...this.candidates];

    // Text search filter
    if (this.searchText.trim()) {
      const term = this.searchText.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.techName.toLowerCase().includes(term) ||
          c.techEmail.toLowerCase().includes(term) ||
          c.workSite.toLowerCase().includes(term)
      );
    }

    // Offer status filter
    if (this.statusFilter) {
      result = result.filter((c) => c.offerStatus === this.statusFilter);
    }

    // Incomplete certifications filter
    if (this.incompleteCertsFilter) {
      result = result.filter(
        (c) => !c.oshaCertified || !c.scissorLiftCertified || !c.biisciCertified
      );
    }

    // Sort
    if (this.sortState) {
      const { column, direction } = this.sortState;
      result.sort((a, b) => {
        const aVal = a[column];
        const bVal = b[column];

        let comparison = 0;
        if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          comparison = (aVal === bVal) ? 0 : aVal ? -1 : 1;
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return direction === 'asc' ? comparison : -comparison;
      });
    }

    this.filteredCandidates = result;
  }
}
