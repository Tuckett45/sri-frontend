import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, Subscription, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError, take } from 'rxjs/operators';
import { TechnicianService } from '../../../services/technician.service';
import { Technician, Certification, CertificationStatus } from '../../../models/technician.model';
import { computeCredentialStatus } from '../../../utils/credential-status.util';
import { computeChecklistDelta, ChecklistSummary } from '../../../utils/checklist-delta.util';
import { computePRCStatus, PRCStatus } from '../../../utils/prc-timer.util';
import { TypedCredential } from '../../../models/credential-types.model';
import { EquipmentAssignment } from '../../../models/equipment.model';
import { TechnicalCompetency } from '../../../models/competency.model';
import { PRC } from '../../../models/prc.model';
import { RoleCredentialTemplate } from '../../../models/role-credential-template.model';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';

interface TechnicianCredentialSummary {
  technician: Technician;
  activeCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  totalCount: number;
  onboardingCompletionPercentage: number;
  prcIndicator: 'upcoming' | 'overdue' | null;
  checklistSummary: ChecklistSummary | null;
}

interface CredentialListFilters {
  searchTerm: string;
  statusFilter: CertificationStatus | null;
  incompleteOnboarding: boolean;
  missingEquipment: boolean;
  overduePRC: boolean;
}

@Component({
  selector: 'app-credentials-list',
  template: `
    <div class="credentials-list-container">
      <div class="credentials-list-header">
        <h2 class="credentials-list-title">Tech Credentials</h2>
      </div>

      <div class="credentials-list-filters">
        <div class="search-field">
          <input
            type="text"
            class="search-input"
            placeholder="Search by name or email..."
            [value]="filters.searchTerm"
            (input)="onSearchInput($event)"
            aria-label="Search technicians by name or email"
          />
        </div>
        <div class="status-filter-field">
          <select
            class="status-filter-select"
            [value]="statusFilter"
            (change)="onStatusFilterChange($event)"
            aria-label="Filter by credential status"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="ExpiringSoon">Expiring Soon</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      <div class="filter-toggles">
        <label class="filter-toggle">
          <input
            type="checkbox"
            [checked]="filters.incompleteOnboarding"
            (change)="onIncompleteOnboardingToggle($event)"
            aria-label="Filter by incomplete onboarding"
          />
          <span class="filter-toggle-label">Incomplete Onboarding</span>
        </label>
        <label class="filter-toggle">
          <input
            type="checkbox"
            [checked]="filters.missingEquipment"
            (change)="onMissingEquipmentToggle($event)"
            aria-label="Filter by missing equipment"
          />
          <span class="filter-toggle-label">Missing Equipment</span>
        </label>
        <label class="filter-toggle">
          <input
            type="checkbox"
            [checked]="filters.overduePRC"
            (change)="onOverduePRCToggle($event)"
            aria-label="Filter by overdue PRC"
          />
          <span class="filter-toggle-label">Overdue PRC</span>
        </label>
      </div>

      <div *ngIf="isLoading" class="loading-state">
        <p>Loading technicians...</p>
      </div>

      <div *ngIf="errorMessage" class="error-state">
        <p class="error-message">{{ errorMessage }}</p>
        <button class="retry-button" (click)="loadTechnicians()">Retry</button>
      </div>

      <div *ngIf="!isLoading && !errorMessage">
        <div *ngIf="filteredTechnicians.length === 0" class="empty-state">
          <p>No technicians match the current filters.</p>
        </div>

        <table *ngIf="filteredTechnicians.length > 0" class="credentials-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Region</th>
              <th>Onboarding</th>
              <th>Active</th>
              <th>Expiring Soon</th>
              <th>Expired</th>
              <th>PRC</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let summary of filteredTechnicians"
              class="technician-row"
              (click)="navigateToDetail(summary.technician.id)"
              tabindex="0"
              (keydown.enter)="navigateToDetail(summary.technician.id)"
            >
              <td class="name-cell">
                {{ summary.technician.firstName }} {{ summary.technician.lastName }}
                <span *ngIf="summary.totalCount === 0" class="no-credentials-badge">No Credentials</span>
              </td>
              <td>{{ summary.technician.email }}</td>
              <td>{{ summary.technician.region }}</td>
              <td>
                <div class="onboarding-progress">
                  <div class="progress-bar-container">
                    <div
                      class="progress-bar-fill"
                      [style.width.%]="summary.onboardingCompletionPercentage"
                      [class.progress-complete]="summary.onboardingCompletionPercentage === 100"
                      [class.progress-incomplete]="summary.onboardingCompletionPercentage < 100"
                    ></div>
                  </div>
                  <span class="progress-text">{{ summary.onboardingCompletionPercentage | number:'1.0-0' }}%</span>
                </div>
              </td>
              <td><span class="status-count active-count">{{ summary.activeCount }}</span></td>
              <td><span class="status-count expiring-soon-count">{{ summary.expiringSoonCount }}</span></td>
              <td><span class="status-count expired-count">{{ summary.expiredCount }}</span></td>
              <td>
                <span *ngIf="summary.prcIndicator === 'upcoming'" class="prc-badge prc-upcoming">Upcoming PRC</span>
                <span *ngIf="summary.prcIndicator === 'overdue'" class="prc-badge prc-overdue">Overdue PRC</span>
              </td>
              <td class="actions-cell" (click)="$event.stopPropagation()">
                <button
                  class="checklist-button"
                  (click)="navigateToChecklist(summary.technician.id)"
                  title="View Onboarding Checklist"
                  [attr.aria-label]="'View onboarding checklist for ' + summary.technician.firstName + ' ' + summary.technician.lastName"
                >
                  &#9776;
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .credentials-list-container {
      padding: 1.5rem;
      background-color: #f5f7fa;
      min-height: 100%;
    }

    .credentials-list-header {
      margin-bottom: 1.5rem;
    }

    .credentials-list-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #212121;
    }

    .credentials-list-filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .search-field {
      flex: 1;
      min-width: 200px;
    }

    .search-input {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 0.875rem;
      background: #ffffff;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .search-input:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
    }

    .status-filter-field {
      min-width: 160px;
    }

    .status-filter-select {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 0.875rem;
      background: #ffffff;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .status-filter-select:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
    }

    .filter-toggles {
      display: flex;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .filter-toggle {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      cursor: pointer;
      font-size: 0.8125rem;
      color: #424242;
      user-select: none;
    }

    .filter-toggle input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: #1976d2;
    }

    .filter-toggle-label {
      font-weight: 500;
    }

    .loading-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #616161;
    }

    .error-state {
      text-align: center;
      padding: 3rem 1rem;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .error-message {
      color: #d32f2f;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .retry-button {
      padding: 0.5rem 1.25rem;
      background-color: #1976d2;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .retry-button:hover {
      background-color: #1565c0;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #616161;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .credentials-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .credentials-table thead {
      background: #fafafa;
      border-bottom: 2px solid #e0e0e0;
    }

    .credentials-table th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 600;
      color: #616161;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .credentials-table td {
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      color: #212121;
      border-bottom: 1px solid #f0f0f0;
    }

    .technician-row {
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .technician-row:hover {
      background-color: rgba(25, 118, 210, 0.04);
    }

    .technician-row:focus {
      outline: 2px solid #1976d2;
      outline-offset: -2px;
    }

    .name-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .no-credentials-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      background-color: #f5f5f5;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      font-size: 0.6875rem;
      color: #9e9e9e;
      font-weight: 500;
    }

    .status-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 0.375rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .active-count {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .expiring-soon-count {
      background-color: #fff3e0;
      color: #e65100;
    }

    .expired-count {
      background-color: #ffebee;
      color: #c62828;
    }

    .onboarding-progress {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .progress-bar-container {
      width: 60px;
      height: 6px;
      background-color: #e0e0e0;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .progress-complete {
      background-color: #4caf50;
    }

    .progress-incomplete {
      background-color: #ff9800;
    }

    .progress-text {
      font-size: 0.75rem;
      font-weight: 600;
      color: #616161;
      min-width: 32px;
    }

    .prc-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.6875rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .prc-upcoming {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .prc-overdue {
      background-color: #ffebee;
      color: #c62828;
    }

    .actions-cell {
      text-align: center;
    }

    .checklist-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #ffffff;
      cursor: pointer;
      font-size: 0.875rem;
      color: #616161;
      transition: background-color 0.15s, border-color 0.15s;
    }

    .checklist-button:hover {
      background-color: #f5f5f5;
      border-color: #bdbdbd;
      color: #1976d2;
    }

    .checklist-button:focus {
      outline: 2px solid #1976d2;
      outline-offset: 1px;
    }

    @media (max-width: 768px) {
      .credentials-list-container {
        padding: 1rem;
      }

      .credentials-list-filters {
        flex-direction: column;
      }

      .status-filter-field {
        min-width: 100%;
      }

      .filter-toggles {
        flex-direction: column;
        gap: 0.75rem;
      }

      .credentials-table th,
      .credentials-table td {
        padding: 0.5rem 0.625rem;
        font-size: 0.8125rem;
      }
    }
  `]
})
export class CredentialsListComponent implements OnInit, OnDestroy {
  technicians: TechnicianCredentialSummary[] = [];
  filteredTechnicians: TechnicianCredentialSummary[] = [];
  searchTerm = '';
  statusFilter = 'All';
  isLoading = false;
  errorMessage = '';

  filters: CredentialListFilters = {
    searchTerm: '',
    statusFilter: null,
    incompleteOnboarding: false,
    missingEquipment: false,
    overduePRC: false
  };

  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];

  constructor(
    private technicianService: TechnicianService,
    private store: Store,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const searchSub = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(term => {
        this.filters.searchTerm = term;
        this.searchTerm = term;
        this.applyFilters();
      });

    this.subscriptions.push(searchSub);
    this.loadTechnicians();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.searchSubject.complete();
  }

  loadTechnicians(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Dispatch load action to ensure technicians are in the store
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));

    // Wait for loading to complete (loading goes true -> false after effect finishes)
    let hasBeenLoading = false;
    const sub = this.store.select(TechnicianSelectors.selectTechniciansLoading)
      .subscribe(loading => {
        if (loading) {
          hasBeenLoading = true;
        }
        // Only process when loading transitions from true to false
        if (hasBeenLoading && !loading) {
          this.store.select(TechnicianSelectors.selectTechniciansError)
            .pipe(take(1))
            .subscribe(error => {
              if (error) {
                this.isLoading = false;
                this.errorMessage = 'Unable to load technicians. Please try again.';
              } else {
                this.store.select(TechnicianSelectors.selectAllTechnicians)
                  .pipe(take(1))
                  .subscribe(technicians => {
                    if (technicians.length > 0) {
                      this.loadAllDataForTechnicians(technicians);
                    } else {
                      this.technicians = [];
                      this.filteredTechnicians = [];
                      this.isLoading = false;
                    }
                  });
              }
            });
        }
      });

    this.subscriptions.push(sub);
  }

  private loadAllDataForTechnicians(technicians: Technician[]): void {
    if (technicians.length === 0) {
      this.technicians = [];
      this.filteredTechnicians = [];
      this.isLoading = false;
      return;
    }

    let completedCount = 0;
    const summaries: TechnicianCredentialSummary[] = [];

    technicians.forEach(technician => {
      const data$ = forkJoin({
        certifications: this.technicianService.getTechnicianCertifications(technician.id).pipe(
          catchError(() => of([] as Certification[]))
        ),
        equipment: this.technicianService.getTechnicianEquipment(technician.id).pipe(
          catchError(() => of([] as EquipmentAssignment[]))
        ),
        competencies: this.technicianService.getTechnicianCompetencies(technician.id).pipe(
          catchError(() => of([] as TechnicalCompetency[]))
        ),
        prc: this.technicianService.getTechnicianPRC(technician.id).pipe(
          catchError(() => of(null as PRC | null))
        ),
        template: this.technicianService.getRoleCredentialTemplate(technician.role).pipe(
          catchError(() => of(null as RoleCredentialTemplate | null))
        )
      });

      const dataSub = data$.subscribe({
        next: (result) => {
          const summary = this.computeFullSummary(
            technician,
            result.certifications,
            result.equipment,
            result.competencies,
            result.prc,
            result.template
          );
          summaries.push(summary);
          completedCount++;

          if (completedCount === technicians.length) {
            this.technicians = summaries;
            this.applyFilters();
            this.isLoading = false;
          }
        },
        error: () => {
          // Fallback: show technician with zero counts
          const summary = this.computeFullSummary(technician, [], [], [], null, null);
          summaries.push(summary);
          completedCount++;

          if (completedCount === technicians.length) {
            this.technicians = summaries;
            this.applyFilters();
            this.isLoading = false;
          }
        }
      });

      this.subscriptions.push(dataSub);
    });
  }

  private computeFullSummary(
    technician: Technician,
    certifications: Certification[],
    equipment: EquipmentAssignment[],
    competencies: TechnicalCompetency[],
    prc: PRC | null,
    template: RoleCredentialTemplate | null
  ): TechnicianCredentialSummary {
    // Compute credential status counts
    let activeCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;

    certifications.forEach(cert => {
      const status = computeCredentialStatus(new Date(cert.expirationDate));
      switch (status) {
        case CertificationStatus.Active:
          activeCount++;
          break;
        case CertificationStatus.ExpiringSoon:
          expiringSoonCount++;
          break;
        case CertificationStatus.Expired:
          expiredCount++;
          break;
      }
    });

    // Compute checklist delta and onboarding completion percentage
    let onboardingCompletionPercentage = 0;
    let checklistSummary: ChecklistSummary | null = null;

    if (template) {
      // Convert certifications to TypedCredential-like objects for the delta computation
      const typedCredentials = certifications as unknown as TypedCredential[];
      checklistSummary = computeChecklistDelta(
        template,
        typedCredentials,
        equipment,
        competencies,
        prc
      );
      onboardingCompletionPercentage = checklistSummary.completionPercentage;
    }

    // Compute PRC indicator
    let prcIndicator: 'upcoming' | 'overdue' | null = null;
    if (prc) {
      const dueDate = new Date(prc.dueDate);
      const completionDate = prc.completionDate ? new Date(prc.completionDate) : null;
      const now = new Date();
      const prcStatus = computePRCStatus(dueDate, completionDate, now);

      if (prcStatus === 'overdue') {
        prcIndicator = 'overdue';
      } else if (prcStatus === 'upcoming') {
        // Only show "upcoming" if within 14 days
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 14) {
          prcIndicator = 'upcoming';
        }
      }
    }

    return {
      technician,
      activeCount,
      expiringSoonCount,
      expiredCount,
      totalCount: certifications.length,
      onboardingCompletionPercentage,
      prcIndicator,
      checklistSummary
    };
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }

  onStatusFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.statusFilter = select.value;
    this.applyFilters();
  }

  onIncompleteOnboardingToggle(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.filters.incompleteOnboarding = checkbox.checked;
    this.applyFilters();
  }

  onMissingEquipmentToggle(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.filters.missingEquipment = checkbox.checked;
    this.applyFilters();
  }

  onOverduePRCToggle(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.filters.overduePRC = checkbox.checked;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.technicians];

    // Apply text search filter
    if (this.filters.searchTerm.trim()) {
      const term = this.filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(summary => {
        const fullName = `${summary.technician.firstName} ${summary.technician.lastName}`.toLowerCase();
        const email = summary.technician.email.toLowerCase();
        return fullName.includes(term) || email.includes(term);
      });
    }

    // Apply status filter
    if (this.statusFilter !== 'All') {
      filtered = filtered.filter(summary => {
        switch (this.statusFilter) {
          case 'Active':
            return summary.activeCount > 0;
          case 'ExpiringSoon':
            return summary.expiringSoonCount > 0;
          case 'Expired':
            return summary.expiredCount > 0;
          default:
            return true;
        }
      });
    }

    // Apply "Incomplete Onboarding" filter
    if (this.filters.incompleteOnboarding) {
      filtered = filtered.filter(summary => {
        if (!summary.checklistSummary) return false;
        return summary.checklistSummary.missingCount > 0 || summary.checklistSummary.expiredCount > 0;
      });
    }

    // Apply "Missing Equipment" filter
    if (this.filters.missingEquipment) {
      filtered = filtered.filter(summary => {
        if (!summary.checklistSummary) return false;
        return summary.checklistSummary.items.some(
          item => item.category === 'equipment' && item.status === 'missing'
        );
      });
    }

    // Apply "Overdue PRC" filter
    if (this.filters.overduePRC) {
      filtered = filtered.filter(summary => summary.prcIndicator === 'overdue');
    }

    this.filteredTechnicians = filtered;
  }

  navigateToDetail(technicianId: string): void {
    this.router.navigate([technicianId], { relativeTo: this.route });
  }

  navigateToChecklist(technicianId: string): void {
    this.router.navigate([technicianId, 'checklist'], { relativeTo: this.route });
  }
}
