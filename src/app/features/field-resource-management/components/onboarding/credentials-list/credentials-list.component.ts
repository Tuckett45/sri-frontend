import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, Subscription, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError, take } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { OnboardingService } from '../../../services/onboarding.service';
import { Candidate } from '../../../models/onboarding.models';
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
import { OnboardingInfoModalComponent } from '../onboarding-info-modal/onboarding-info-modal.component';
import { CredentialFormModalComponent, CredentialFormModalData } from '../credential-form-modal/credential-form-modal.component';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';

interface TechnicianCredentialSummary {
  technician: Technician;
  candidateId?: string;
  offerStatus?: string;
  activeCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  totalCount: number;
  onboardingCompletionPercentage: number;
  prcIndicator: 'upcoming' | 'overdue' | null;
  checklistSummary: ChecklistSummary | null;
}

interface RowActionConfig {
  id: string;
  label: string;
  icon: string;
  tooltip: string;
  ariaLabel: (technician: Technician) => string;
  isVisible: (summary: TechnicianCredentialSummary) => boolean;
  execute: (technicianId: string) => void;
}

interface CredentialListFilters {
  searchTerm: string;
  statusFilter: CertificationStatus | null;
  incompleteOnboarding: boolean;
  missingEquipment: boolean;
  overduePRC: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string;
  direction: SortDirection;
}

@Component({
  selector: 'app-credentials-list',
  template: `
    <div class="credentials-list-container">
      <div class="credentials-list-header">
        <h2 class="credentials-list-title">Tech Credentials</h2>
        <div class="header-stats" *ngIf="!isLoading && technicians.length > 0">
          <span class="stat-badge stat-total">{{ technicians.length }} Total</span>
          <span class="stat-badge stat-onboarded">{{ getOnboardedCount() }} Onboarded</span>
          <span class="stat-badge stat-hired">{{ getHiredAssignedCount() }} Hired/Assigned</span>
          <span class="stat-badge stat-review">{{ getNeedsReviewCount() }} In Review</span>
        </div>
      </div>

      <!-- Filters Row -->
      <div class="credentials-list-filters">
        <div class="search-field">
          <mat-icon class="search-icon">search</mat-icon>
          <input
            type="text"
            class="search-input"
            placeholder="Search by name, email, or region..."
            [value]="filters.searchTerm"
            (input)="onSearchInput($event)"
            aria-label="Search technicians by name, email, or region"
          />
        </div>
        <div class="filter-field">
          <select
            class="filter-select"
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
        <div class="filter-field">
          <select
            class="filter-select"
            [value]="regionFilter"
            (change)="onRegionFilterChange($event)"
            aria-label="Filter by region"
          >
            <option value="">All Regions</option>
            <option *ngFor="let region of availableRegions" [value]="region">{{ region }}</option>
          </select>
        </div>
        <div class="filter-field">
          <select
            class="filter-select"
            [value]="completionFilter"
            (change)="onCompletionFilterChange($event)"
            aria-label="Filter by completion"
          >
            <option value="">All Completion</option>
            <option value="complete">100% Complete</option>
            <option value="above75">75%+ Complete</option>
            <option value="above50">50%+ Complete</option>
            <option value="below50">Below 50%</option>
          </select>
        </div>
        <div class="filter-field">
          <select
            class="filter-select"
            [value]="offerStatusFilter"
            (change)="onOfferStatusFilterChange($event)"
            aria-label="Filter by offer status"
          >
            <option value="">All Offer Statuses</option>
            <option value="needs_review">Needs Review</option>
            <option value="application_reviewed">Application Reviewed</option>
            <option value="vetted_available">Vetted/Available</option>
            <option value="offer_extended">Offer Extended</option>
            <option value="offer_accepted_onboarding">Offer Accepted/Onboarding</option>
            <option value="hired_assigned">Hired/Assigned</option>
            <option value="onboarded">Onboarded</option>
            <option value="do_not_hire">Do Not Hire</option>
            <option value="turned_down_hold">Turned Down/Hold</option>
            <option value="needs_sponsorship">Needs Sponsorship</option>
          </select>
        </div>
      </div>

      <!-- Toggle Filters -->
      <div class="filter-toggles">
        <label class="filter-toggle" [class.active]="filters.incompleteOnboarding">
          <input
            type="checkbox"
            [checked]="filters.incompleteOnboarding"
            (change)="onIncompleteOnboardingToggle($event)"
          />
          <mat-icon class="toggle-icon">pending_actions</mat-icon>
          <span>Incomplete Onboarding</span>
        </label>
        <label class="filter-toggle" [class.active]="filters.missingEquipment">
          <input
            type="checkbox"
            [checked]="filters.missingEquipment"
            (change)="onMissingEquipmentToggle($event)"
          />
          <mat-icon class="toggle-icon">inventory_2</mat-icon>
          <span>Missing Equipment</span>
        </label>
        <label class="filter-toggle" [class.active]="filters.overduePRC">
          <input
            type="checkbox"
            [checked]="filters.overduePRC"
            (change)="onOverduePRCToggle($event)"
          />
          <mat-icon class="toggle-icon">warning</mat-icon>
          <span>Overdue PRC</span>
        </label>
        <button class="clear-filters-btn" *ngIf="hasActiveFilters()" (click)="clearAllFilters()">
          <mat-icon>clear</mat-icon> Clear Filters
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading technicians...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage" class="error-state">
        <mat-icon class="error-icon">error_outline</mat-icon>
        <p class="error-message">{{ errorMessage }}</p>
        <button class="retry-button" (click)="loadTechnicians()">
          <mat-icon>refresh</mat-icon> Retry
        </button>
      </div>

      <div *ngIf="!isLoading && !errorMessage">
        <!-- Empty State -->
        <div *ngIf="filteredTechnicians.length === 0" class="empty-state">
          <mat-icon class="empty-icon">person_search</mat-icon>
          <p>No technicians match the current filters.</p>
          <button class="clear-filters-btn" *ngIf="hasActiveFilters()" (click)="clearAllFilters()">Clear Filters</button>
        </div>

        <div *ngIf="filteredTechnicians.length > 0" class="tabbed-tables">
          <!-- Sub-tabs -->
          <div class="sub-tabs">
            <button class="sub-tab" [class.active]="activeSubTab === 'core'" (click)="activeSubTab = 'core'">
              <mat-icon class="tab-icon">verified_user</mat-icon> Core Qualifications
            </button>
            <button class="sub-tab" [class.active]="activeSubTab === 'badges'" (click)="activeSubTab = 'badges'">
              <mat-icon class="tab-icon">badge</mat-icon> Badges & Access
            </button>
            <button class="sub-tab" [class.active]="activeSubTab === 'training'" (click)="activeSubTab = 'training'">
              <mat-icon class="tab-icon">school</mat-icon> Training & Certs
            </button>
            <button class="sub-tab" [class.active]="activeSubTab === 'equipment'" (click)="activeSubTab = 'equipment'">
              <mat-icon class="tab-icon">build</mat-icon> Equipment Kits
            </button>
          </div>

          <!-- Core Qualifications Table -->
          <div class="table-wrapper">
          <table *ngIf="activeSubTab === 'core'" class="credentials-table">
            <thead>
              <tr>
                <th class="sortable" (click)="onSort('name')">Name <span class="sort-indicator">{{ getSortIcon('name') }}</span></th>
                <th class="sortable" (click)="onSort('region')">Region <span class="sort-indicator">{{ getSortIcon('region') }}</span></th>
                <th class="sortable center-col" (click)="onSort('completion')">Completion <span class="sort-indicator">{{ getSortIcon('completion') }}</span></th>
                <th class="center-col">Fiber Exp</th>
                <th class="center-col">OSHA</th>
                <th class="center-col">Scissor Cert</th>
                <th class="center-col">Travel</th>
                <th class="center-col">Shift</th>
                <th class="center-col">BG/Drug</th>
                <th class="center-col">Military</th>
                <th class="center-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let summary of pagedTechnicians" class="technician-row" (click)="navigateToDetail(summary.technician.id)" tabindex="0" (keydown.enter)="navigateToDetail(summary.technician.id)">
                <td class="name-cell">
                  <span class="tech-name">{{ summary.technician.firstName }} {{ summary.technician.lastName }}</span>
                </td>
                <td>{{ summary.technician.region || '\u2014' }}</td>
                <td class="center-col">
                  <div class="completion-cell">
                    <div class="mini-progress-bar">
                      <div class="mini-progress-fill" [class.complete]="summary.onboardingCompletionPercentage === 100" [class.high]="summary.onboardingCompletionPercentage >= 75 && summary.onboardingCompletionPercentage < 100" [class.medium]="summary.onboardingCompletionPercentage >= 50 && summary.onboardingCompletionPercentage < 75" [class.low]="summary.onboardingCompletionPercentage < 50" [style.width.%]="summary.onboardingCompletionPercentage"></div>
                    </div>
                    <span class="completion-pct">{{ summary.onboardingCompletionPercentage }}%</span>
                  </div>
                </td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.fiberExperience && summary.technician.fiberExperience !== 'none')">{{ getYesNoIcon(summary.technician.fiberExperience && summary.technician.fiberExperience !== 'none') }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.oshaCertified)">{{ getYesNoIcon(summary.technician.oshaCertified) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.scissorLiftCertified)">{{ getYesNoIcon(summary.technician.scissorLiftCertified) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.willingToTravel)">{{ getYesNoIcon(summary.technician.willingToTravel) }}</span></td>
                <td class="yn-cell center-col"><span class="shift-label">{{ getShiftLabel(summary.technician.shiftAvailability) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.backgroundCheckStatus === 'pass' && summary.technician.drugScreenStatus === 'pass')">{{ getYesNoIcon(summary.technician.backgroundCheckStatus === 'pass' && summary.technician.drugScreenStatus === 'pass') }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.isVeteran)">{{ getYesNoIcon(summary.technician.isVeteran) }}</span></td>
                <td class="actions-cell" (click)="$event.stopPropagation()">
                  <button class="icon-action-btn" (click)="openOnboardingInfoModal(summary)" title="Edit" aria-label="Edit credentials">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button class="icon-action-btn" (click)="navigateToDetail(summary.technician.id)" title="View Detail" aria-label="View detail">
                    <mat-icon>visibility</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Badges & Access Table -->
          <table *ngIf="activeSubTab === 'badges'" class="credentials-table">
            <thead>
              <tr>
                <th class="sortable" (click)="onSort('name')">Name <span class="sort-indicator">{{ getSortIcon('name') }}</span></th>
                <th class="sortable" (click)="onSort('region')">Region <span class="sort-indicator">{{ getSortIcon('region') }}</span></th>
                <th class="center-col">AT&T Badge</th>
                <th class="center-col">Comcast Badge</th>
                <th class="center-col">AT&T Supplier</th>
                <th class="center-col">Ciena Basic</th>
                <th class="center-col">Google Red</th>
                <th class="center-col">Google LDAP</th>
                <th class="center-col">Meta Green</th>
                <th class="center-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let summary of pagedTechnicians" class="technician-row" (click)="navigateToDetail(summary.technician.id)" tabindex="0" (keydown.enter)="navigateToDetail(summary.technician.id)">
                <td class="name-cell"><span class="tech-name">{{ summary.technician.firstName }} {{ summary.technician.lastName }}</span></td>
                <td>{{ summary.technician.region || '\u2014' }}</td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.attBadge)">{{ getYesNoIcon(summary.technician.attBadge) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.comcastBadge)">{{ getYesNoIcon(summary.technician.comcastBadge) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.attSupplierTraining)">{{ getYesNoIcon(summary.technician.attSupplierTraining) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.cienaBasicTraining)">{{ getYesNoIcon(summary.technician.cienaBasicTraining) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.googleRedBadge)">{{ getYesNoIcon(summary.technician.googleRedBadge) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.googleLdap)">{{ getYesNoIcon(summary.technician.googleLdap) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.metaGreenListing)">{{ getYesNoIcon(summary.technician.metaGreenListing) }}</span></td>
                <td class="actions-cell" (click)="$event.stopPropagation()">
                  <button class="icon-action-btn" (click)="openOnboardingInfoModal(summary)" title="Edit" aria-label="Edit badges">
                    <mat-icon>edit</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Training & Certs Table -->
          <table *ngIf="activeSubTab === 'training'" class="credentials-table">
            <thead>
              <tr>
                <th class="sortable" (click)="onSort('name')">Name <span class="sort-indicator">{{ getSortIcon('name') }}</span></th>
                <th class="sortable" (click)="onSort('region')">Region <span class="sort-indicator">{{ getSortIcon('region') }}</span></th>
                <th class="center-col">OBS Training</th>
                <th class="center-col">Scissor Lift</th>
                <th class="center-col">OSHA 10</th>
                <th class="center-col">OSHA 30</th>
                <th class="center-col">Hand Tools</th>
                <th class="center-col">BIISCI</th>
                <th class="center-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let summary of pagedTechnicians" class="technician-row" (click)="navigateToDetail(summary.technician.id)" tabindex="0" (keydown.enter)="navigateToDetail(summary.technician.id)">
                <td class="name-cell"><span class="tech-name">{{ summary.technician.firstName }} {{ summary.technician.lastName }}</span></td>
                <td>{{ summary.technician.region || '\u2014' }}</td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.obsTraining)">{{ getYesNoIcon(summary.technician.obsTraining) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.scissorLiftCertified)">{{ getYesNoIcon(summary.technician.scissorLiftCertified) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.osha10)">{{ getYesNoIcon(summary.technician.osha10) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.osha30)">{{ getYesNoIcon(summary.technician.osha30) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.techHandTools)">{{ getYesNoIcon(summary.technician.techHandTools) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.biisciCertified)">{{ getYesNoIcon(summary.technician.biisciCertified) }}</span></td>
                <td class="actions-cell" (click)="$event.stopPropagation()">
                  <button class="icon-action-btn" (click)="openOnboardingInfoModal(summary)" title="Edit" aria-label="Edit training">
                    <mat-icon>edit</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Equipment Kits Table -->
          <table *ngIf="activeSubTab === 'equipment'" class="credentials-table">
            <thead>
              <tr>
                <th class="sortable" (click)="onSort('name')">Name <span class="sort-indicator">{{ getSortIcon('name') }}</span></th>
                <th class="sortable" (click)="onSort('region')">Region <span class="sort-indicator">{{ getSortIcon('region') }}</span></th>
                <th class="center-col">CI Kit</th>
                <th class="center-col">Fiber Kit</th>
                <th class="center-col">Labeling Kit</th>
                <th class="center-col">Power Kit</th>
                <th class="center-col">Testing Eqpt</th>
                <th class="center-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let summary of pagedTechnicians" class="technician-row" (click)="navigateToDetail(summary.technician.id)" tabindex="0" (keydown.enter)="navigateToDetail(summary.technician.id)">
                <td class="name-cell"><span class="tech-name">{{ summary.technician.firstName }} {{ summary.technician.lastName }}</span></td>
                <td>{{ summary.technician.region || '\u2014' }}</td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.ciKitAssigned)">{{ getYesNoIcon(summary.technician.ciKitAssigned) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.fiberKitAssigned)">{{ getYesNoIcon(summary.technician.fiberKitAssigned) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.labelingKitAssigned)">{{ getYesNoIcon(summary.technician.labelingKitAssigned) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.powerKitAssigned)">{{ getYesNoIcon(summary.technician.powerKitAssigned) }}</span></td>
                <td class="yn-cell center-col"><span [class]="getYesNoClass(summary.technician.testingEqptAssigned)">{{ getYesNoIcon(summary.technician.testingEqptAssigned) }}</span></td>
                <td class="actions-cell" (click)="$event.stopPropagation()">
                  <button class="icon-action-btn" (click)="openOnboardingInfoModal(summary)" title="Edit" aria-label="Edit equipment">
                    <mat-icon>edit</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          </div>

          <!-- Pagination -->
          <div class="pagination-controls">
            <div class="pagination-info">
              Showing {{ ((currentPage - 1) * pageSize) + 1 }}&ndash;{{ currentPage * pageSize > filteredTechnicians.length ? filteredTechnicians.length : currentPage * pageSize }} of {{ filteredTechnicians.length }}
            </div>
            <div class="pagination-actions">
              <select class="page-size-select" [value]="pageSize" (change)="onPageSizeChange($event)">
                <option *ngFor="let size of pageSizeOptions" [value]="size">{{ size }} per page</option>
              </select>
              <button class="page-btn" [disabled]="currentPage === 1" (click)="goToPage(1)" title="First page" aria-label="First page">
                <mat-icon>first_page</mat-icon>
              </button>
              <button class="page-btn" [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)" title="Previous page" aria-label="Previous page">
                <mat-icon>chevron_left</mat-icon>
              </button>
              <span class="page-indicator">{{ currentPage }} / {{ totalPages }}</span>
              <button class="page-btn" [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)" title="Next page" aria-label="Next page">
                <mat-icon>chevron_right</mat-icon>
              </button>
              <button class="page-btn" [disabled]="currentPage === totalPages" (click)="goToPage(totalPages)" title="Last page" aria-label="Last page">
                <mat-icon>last_page</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .credentials-list-container {
      padding: 1.25rem;
      background-color: #f8fafc;
      min-height: 100%;
      overflow: hidden;
      max-width: 100%;
    }

    .credentials-list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .credentials-list-title {
      margin: 0;
      font-size: 1.375rem;
      font-weight: 700;
      color: #1e293b;
    }

    .header-stats {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .stat-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .stat-total { background: #e2e8f0; color: #475569; }
    .stat-onboarded { background: #dcfce7; color: #166534; }
    .stat-hired { background: #dbeafe; color: #1e40af; }
    .stat-review { background: #fef3c7; color: #92400e; }

    /* Filters */
    .credentials-list-filters {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }

    .search-field {
      flex: 1;
      min-width: 220px;
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #94a3b8;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 0.5rem 0.75rem 0.5rem 2.25rem;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 0.8125rem;
      background: #ffffff;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }

    .search-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .filter-field {
      min-width: 140px;
    }

    .filter-select {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 0.8125rem;
      background: #ffffff;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .filter-select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    /* Toggle Filters */
    .filter-toggles {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .filter-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
      color: #64748b;
      background: #ffffff;
      transition: all 0.2s;
      user-select: none;
    }

    .filter-toggle:hover {
      border-color: #3b82f6;
      color: #3b82f6;
    }

    .filter-toggle.active {
      background: #eff6ff;
      border-color: #3b82f6;
      color: #1d4ed8;
    }

    .filter-toggle input[type="checkbox"] {
      display: none;
    }

    .toggle-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .clear-filters-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.375rem 0.75rem;
      border: 1px solid #fecaca;
      border-radius: 20px;
      background: #fef2f2;
      color: #dc2626;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .clear-filters-btn mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .clear-filters-btn:hover {
      background: #fee2e2;
    }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1rem;
      color: #64748b;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Error */
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .error-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ef4444;
      margin-bottom: 0.75rem;
    }

    .error-message {
      color: #dc2626;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .retry-button {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1.25rem;
      background-color: #3b82f6;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .retry-button:hover { background-color: #2563eb; }

    .retry-button mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* Empty */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1rem;
      color: #64748b;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #cbd5e1;
      margin-bottom: 0.75rem;
    }

    /* Sub-tabs */
    .tabbed-tables { margin-top: 0.25rem; }

    .sub-tabs {
      display: flex;
      gap: 0;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 0;
      overflow-x: auto;
    }

    .sub-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.625rem 1rem;
      border: none;
      background: transparent;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #64748b;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: color 0.2s, border-color 0.2s;
      white-space: nowrap;
    }

    .sub-tab:hover { color: #3b82f6; }

    .sub-tab.active {
      color: #1d4ed8;
      border-bottom-color: #3b82f6;
      font-weight: 600;
    }

    .tab-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* Table */
    .table-wrapper {
      overflow-x: auto;
      width: 100%;
      -webkit-overflow-scrolling: touch;
    }

    .credentials-table {
      width: 100%;
      min-width: 700px;
      border-collapse: collapse;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 8px 8px;
      overflow: hidden;
      font-size: 0.8rem;
    }

    .credentials-table thead {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .credentials-table th {
      padding: 0.625rem 0.75rem;
      text-align: left;
      font-size: 0.7rem;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      white-space: nowrap;
      user-select: none;
    }

    .credentials-table th.sortable {
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .credentials-table th.sortable:hover {
      background: #f1f5f9;
    }

    .sort-indicator {
      font-size: 0.65rem;
      margin-left: 2px;
      opacity: 0.6;
    }

    .credentials-table th.center-col,
    .credentials-table td.center-col {
      text-align: center;
    }

    .credentials-table td {
      padding: 0.5rem 0.75rem;
      font-size: 0.8125rem;
      color: #334155;
      border-bottom: 1px solid #f1f5f9;
      white-space: nowrap;
    }

    .technician-row {
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .technician-row:hover { background-color: #f8fafc; }
    .technician-row:focus { outline: 2px solid #3b82f6; outline-offset: -2px; }

    .name-cell { font-weight: 500; }
    .tech-name { color: #1e293b; }

    /* Completion cell */
    .completion-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: center;
    }

    .mini-progress-bar {
      width: 48px;
      height: 5px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }

    .mini-progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .mini-progress-fill.complete { background: #22c55e; }
    .mini-progress-fill.high { background: #3b82f6; }
    .mini-progress-fill.medium { background: #f59e0b; }
    .mini-progress-fill.low { background: #ef4444; }

    .completion-pct {
      font-size: 0.7rem;
      font-weight: 600;
      color: #64748b;
      min-width: 28px;
    }

    /* Yes/No cells */
    .yn-cell {
      text-align: center;
      font-size: 1rem;
      font-weight: 600;
    }

    .yn-yes { color: #16a34a; }
    .yn-no { color: #dc2626; }

    .shift-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: #3b82f6;
    }

    /* Action buttons */
    .actions-cell {
      text-align: center;
      white-space: nowrap;
    }

    .icon-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: 1px solid transparent;
      border-radius: 6px;
      background: none;
      cursor: pointer;
      color: #64748b;
      transition: all 0.15s;
      padding: 0;
      margin: 0 2px;
    }

    .icon-action-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .icon-action-btn:hover {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #2563eb;
    }

    /* Pagination */
    .pagination-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0;
      margin-top: 0.75rem;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .pagination-info {
      font-size: 0.75rem;
      color: #64748b;
    }

    .pagination-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .page-size-select {
      padding: 4px 8px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      margin-right: 8px;
    }

    .page-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      color: #475569;
      transition: background-color 0.15s;
    }

    .page-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .page-btn:hover:not(:disabled) { background-color: #f1f5f9; }
    .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    .page-indicator {
      font-size: 0.75rem;
      color: #475569;
      font-weight: 500;
      padding: 0 6px;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .credentials-list-filters { gap: 0.5rem; }
      .filter-field { min-width: 120px; }
    }

    @media (max-width: 768px) {
      .credentials-list-container { padding: 0.75rem; }
      .credentials-list-filters { flex-direction: column; }
      .filter-field { min-width: 100%; }
      .filter-toggles { gap: 0.5rem; }
      .sub-tabs { gap: 0; }
      .sub-tab { padding: 0.5rem 0.75rem; font-size: 0.75rem; }
      .credentials-table th, .credentials-table td { padding: 0.4rem 0.5rem; }
    }
  `]
})
export class CredentialsListComponent implements OnInit, OnDestroy {
  technicians: TechnicianCredentialSummary[] = [];
  filteredTechnicians: TechnicianCredentialSummary[] = [];
  pagedTechnicians: TechnicianCredentialSummary[] = [];
  searchTerm = '';
  statusFilter = 'All';
  regionFilter = '';
  completionFilter = '';
  offerStatusFilter = '';
  isLoading = false;
  errorMessage = '';
  activeSubTab: 'core' | 'badges' | 'training' | 'equipment' = 'core';
  availableRegions: string[] = [];

  // Sorting
  sortState: SortState = { column: 'name', direction: 'asc' };

  // Pagination
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalPages = 1;

  filters: CredentialListFilters = {
    searchTerm: '',
    statusFilter: null,
    incompleteOnboarding: false,
    missingEquipment: false,
    overduePRC: false
  };

  rowActions: RowActionConfig[] = [
    {
      id: 'view-detail',
      label: 'View',
      icon: '👁',
      tooltip: 'View onboarding detail',
      ariaLabel: (tech) => `View onboarding detail for ${tech.firstName} ${tech.lastName}`,
      isVisible: () => true,
      execute: (id) => this.navigateToDetail(id)
    },
    {
      id: 'view-checklist',
      label: 'Checklist',
      icon: '✓',
      tooltip: 'View onboarding checklist',
      ariaLabel: (tech) => `View onboarding checklist for ${tech.firstName} ${tech.lastName}`,
      isVisible: () => true,
      execute: (id) => this.navigateToChecklist(id)
    },
    {
      id: 'add-credential',
      label: 'Add Credential',
      icon: '+',
      tooltip: 'Add a new credential',
      ariaLabel: (tech) => `Add credential for ${tech.firstName} ${tech.lastName}`,
      isVisible: (summary) => summary.onboardingCompletionPercentage < 100,
      execute: (id) => this.navigateToAddCredential(id)
    },
    {
      id: 'assign-equipment',
      label: 'Equipment',
      icon: '🔧',
      tooltip: 'Assign equipment',
      ariaLabel: (tech) => `Assign equipment to ${tech.firstName} ${tech.lastName}`,
      isVisible: (summary) => summary.onboardingCompletionPercentage < 100,
      execute: (id) => this.navigateToAssignEquipment(id)
    }
  ];

  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];

  constructor(
    private onboardingService: OnboardingService,
    private technicianService: TechnicianService,
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
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

  // ─── Stats ─────────────────────────────────────────────────────────────────

  getOnboardedCount(): number {
    return this.technicians.filter(t => t.offerStatus === 'onboarded').length;
  }

  getHiredAssignedCount(): number {
    return this.technicians.filter(t => t.offerStatus === 'hired_assigned').length;
  }

  getNeedsReviewCount(): number {
    return this.technicians.filter(t => t.offerStatus === 'needs_review').length;
  }

  // ─── Sorting ───────────────────────────────────────────────────────────────

  onSort(column: string): void {
    if (this.sortState.column === column) {
      // Cycle: asc -> desc -> null -> asc
      if (this.sortState.direction === 'asc') {
        this.sortState = { column, direction: 'desc' };
      } else if (this.sortState.direction === 'desc') {
        this.sortState = { column, direction: null };
      } else {
        this.sortState = { column, direction: 'asc' };
      }
    } else {
      this.sortState = { column, direction: 'asc' };
    }
    this.applyFilters();
  }

  getSortIcon(column: string): string {
    if (this.sortState.column !== column || !this.sortState.direction) return '';
    return this.sortState.direction === 'asc' ? '▲' : '▼';
  }

  private applySorting(data: TechnicianCredentialSummary[]): TechnicianCredentialSummary[] {
    if (!this.sortState.direction) return data;

    const { column, direction } = this.sortState;
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...data].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (column) {
        case 'name':
          aVal = `${a.technician.firstName} ${a.technician.lastName}`.toLowerCase();
          bVal = `${b.technician.firstName} ${b.technician.lastName}`.toLowerCase();
          break;
        case 'region':
          aVal = (a.technician.region || '').toLowerCase();
          bVal = (b.technician.region || '').toLowerCase();
          break;
        case 'completion':
          aVal = a.onboardingCompletionPercentage;
          bVal = b.onboardingCompletionPercentage;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * multiplier;
      }
      return (aVal - bVal) * multiplier;
    });
  }

  // ─── Filters ───────────────────────────────────────────────────────────────

  hasActiveFilters(): boolean {
    return !!(
      this.filters.searchTerm ||
      this.statusFilter !== 'All' ||
      this.regionFilter ||
      this.completionFilter ||
      this.offerStatusFilter ||
      this.filters.incompleteOnboarding ||
      this.filters.missingEquipment ||
      this.filters.overduePRC
    );
  }

  clearAllFilters(): void {
    this.filters = {
      searchTerm: '',
      statusFilter: null,
      incompleteOnboarding: false,
      missingEquipment: false,
      overduePRC: false
    };
    this.searchTerm = '';
    this.statusFilter = 'All';
    this.regionFilter = '';
    this.completionFilter = '';
    this.offerStatusFilter = '';
    this.applyFilters();
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

  onRegionFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.regionFilter = select.value;
    this.applyFilters();
  }

  onCompletionFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.completionFilter = select.value;
    this.applyFilters();
  }

  onOfferStatusFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.offerStatusFilter = select.value;
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

    // Text search
    if (this.filters.searchTerm.trim()) {
      const term = this.filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(summary => {
        const fullName = `${summary.technician.firstName} ${summary.technician.lastName}`.toLowerCase();
        const email = summary.technician.email.toLowerCase();
        const region = (summary.technician.region || '').toLowerCase();
        return fullName.includes(term) || email.includes(term) || region.includes(term);
      });
    }

    // Status filter
    if (this.statusFilter !== 'All') {
      filtered = filtered.filter(summary => {
        switch (this.statusFilter) {
          case 'Active': return summary.activeCount > 0;
          case 'ExpiringSoon': return summary.expiringSoonCount > 0;
          case 'Expired': return summary.expiredCount > 0;
          default: return true;
        }
      });
    }

    // Region filter
    if (this.regionFilter) {
      filtered = filtered.filter(summary =>
        (summary.technician.region || '') === this.regionFilter
      );
    }

    // Completion filter
    if (this.completionFilter) {
      filtered = filtered.filter(summary => {
        const pct = summary.onboardingCompletionPercentage;
        switch (this.completionFilter) {
          case 'complete': return pct === 100;
          case 'above75': return pct >= 75;
          case 'above50': return pct >= 50;
          case 'below50': return pct < 50;
          default: return true;
        }
      });
    }

    // Offer status filter
    if (this.offerStatusFilter) {
      filtered = filtered.filter(summary => summary.offerStatus === this.offerStatusFilter);
    }

    // Toggle filters
    if (this.filters.incompleteOnboarding) {
      filtered = filtered.filter(summary => summary.onboardingCompletionPercentage < 100);
    }

    if (this.filters.missingEquipment) {
      filtered = filtered.filter(summary => {
        const t = summary.technician;
        return !t.ciKitAssigned || !t.fiberKitAssigned || !t.labelingKitAssigned ||
               !t.powerKitAssigned || !t.testingEqptAssigned;
      });
    }

    if (this.filters.overduePRC) {
      filtered = filtered.filter(summary => summary.prcIndicator === 'overdue');
    }

    // Apply sorting
    filtered = this.applySorting(filtered);

    this.filteredTechnicians = filtered;
    this.currentPage = 1;
    this.updatePagination();
  }

  // ─── Data Loading ──────────────────────────────────────────────────────────

  loadTechnicians(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const sub = this.onboardingService.getCandidates().subscribe({
      next: (candidates) => {
        if (candidates && candidates.length > 0) {
          this.loadAllDataFromCandidates(candidates);
        } else {
          this.technicians = [];
          this.filteredTechnicians = [];
          this.pagedTechnicians = [];
          this.isLoading = false;
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Unable to load candidates. Please try again.';
      }
    });

    this.subscriptions.push(sub);
  }

  private loadAllDataFromCandidates(candidates: Candidate[]): void {
    const summaries: TechnicianCredentialSummary[] = candidates.map(candidate => {
      const nameParts = (candidate.techName || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const technicianView: Technician = {
        id: candidate.candidateId,
        firstName,
        lastName,
        email: candidate.techEmail || '',
        phone: candidate.techPhone || '',
        role: '' as any,
        region: candidate.workSite || '',
        isAvailable: true,
        isActive: true,
        fiberExperience: candidate.fiberExperience ? '1-2_years' : undefined,
        oshaCertified: candidate.oshaCertified || false,
        scissorLiftCertified: candidate.scissorLiftCertified || false,
        willingToTravel: candidate.travelAvailability || undefined,
        shiftAvailability: candidate.shiftAvailability ? ['day'] : undefined,
        backgroundCheckStatus: candidate.backgroundCheckComplete ? 'pass' : undefined,
        drugScreenStatus: candidate.drugTestComplete ? 'pass' : 'not_started',
        isVeteran: candidate.militaryBackground || undefined,
        attBadge: candidate.attBadge || false,
        comcastBadge: undefined,
        attSupplierTraining: candidate.attSupplierTraining || false,
        cienaBasicTraining: candidate.cienaBasicTraining || false,
        googleRedBadge: candidate.googleRedBadge || false,
        googleLdap: candidate.googleLdap || false,
        metaGreenListing: candidate.metaGreenListing || false,
        obsTraining: candidate.obsTraining || false,
        osha10: candidate.osha10 || false,
        osha30: candidate.osha30 || false,
        techHandTools: candidate.techHandTools || false,
        biisciCertified: candidate.biisciCertified || false,
        ciKitAssigned: candidate.ciKitAssigned || false,
        fiberKitAssigned: candidate.fiberKitAssigned || false,
        labelingKitAssigned: candidate.labelingKitAssigned || false,
        powerKitAssigned: candidate.powerKitAssigned || false,
        testingEqptAssigned: candidate.testingEqptAssigned || false,
        createdAt: new Date(candidate.createdAt),
        updatedAt: new Date(candidate.updatedAt)
      };

      return {
        technician: technicianView,
        candidateId: candidate.candidateId,
        offerStatus: candidate.offerStatus,
        activeCount: 0,
        expiringSoonCount: 0,
        expiredCount: 0,
        totalCount: 0,
        onboardingCompletionPercentage: this.computeCandidateOnboardingPercentage(candidate),
        prcIndicator: null,
        checklistSummary: null
      } as TechnicianCredentialSummary;
    });

    this.technicians = summaries;
    this.updateAvailableRegions();
    this.applyFilters();
    this.isLoading = false;
  }

  private updateAvailableRegions(): void {
    const regions = this.technicians
      .map(t => t.technician.region || '')
      .filter(r => r.length > 0);
    this.availableRegions = [...new Set(regions)].sort();
  }

  private computeCandidateOnboardingPercentage(candidate: Candidate): number {
    const items = [
      candidate.drugTestComplete,
      candidate.oshaCertified,
      candidate.scissorLiftCertified,
      candidate.osha10,
      candidate.osha30,
      candidate.ciKitAssigned,
      candidate.fiberKitAssigned,
      candidate.labelingKitAssigned,
      candidate.powerKitAssigned,
      candidate.testingEqptAssigned,
      !!candidate.attBadge,
      !!candidate.attSupplierTraining,
      !!candidate.cienaBasicTraining,
      !!candidate.obsTraining,
      !!candidate.techHandTools,
    ];
    const completed = items.filter(Boolean).length;
    return Math.round((completed / items.length) * 100);
  }

  // ─── Pagination ────────────────────────────────────────────────────────────

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredTechnicians.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedTechnicians = this.filteredTechnicians.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  onPageSizeChange(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.currentPage = 1;
    this.updatePagination();
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  navigateToDetail(candidateId: string): void {
    this.router.navigate([candidateId], { relativeTo: this.route });
  }

  navigateToChecklist(candidateId: string): void {
    this.router.navigate([candidateId, 'checklist'], { relativeTo: this.route });
  }

  navigateToAddCredential(technicianId: string): void {
    const summary = this.filteredTechnicians.find(s => s.technician.id === technicianId);
    const dialogData: CredentialFormModalData = {
      technicianId,
      technician: summary?.technician
    };

    const dialogRef = this.dialog.open(CredentialFormModalComponent, {
      width: '560px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTechnicians();
      }
    });
  }

  navigateToAssignEquipment(technicianId: string): void {
    this.router.navigate([technicianId], { relativeTo: this.route, queryParams: { section: 'equipment' } });
  }

  // ─── Display Helpers ───────────────────────────────────────────────────────

  getYesNoClass(value: any): string {
    return value ? 'yn-yes' : 'yn-no';
  }

  getYesNoIcon(value: any): string {
    return value ? '\u2714' : '\u2014';
  }

  getShiftLabel(shiftAvailability: any): string {
    if (!shiftAvailability || (Array.isArray(shiftAvailability) && shiftAvailability.length === 0)) return '\u2014';
    if (Array.isArray(shiftAvailability)) {
      if (shiftAvailability.includes('day') && shiftAvailability.includes('night')) return 'Day/Night';
      if (shiftAvailability.includes('day')) return 'Day';
      if (shiftAvailability.includes('night')) return 'Night';
      return shiftAvailability.join(', ');
    }
    const val = String(shiftAvailability).toLowerCase();
    if (val === 'day') return 'Day';
    if (val === 'night') return 'Night';
    if (val === 'both' || val === 'day/night') return 'Day/Night';
    return String(shiftAvailability);
  }

  getVisibleRowActions(summary: TechnicianCredentialSummary): RowActionConfig[] {
    return this.rowActions.filter(action => action.isVisible(summary));
  }

  openOnboardingInfoModal(summary: TechnicianCredentialSummary): void {
    const dialogRef = this.dialog.open(OnboardingInfoModalComponent, {
      width: '560px',
      data: { technician: summary.technician }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const candidateId = summary.candidateId || summary.technician.id;
        this.onboardingService.updateCandidate(candidateId, result).subscribe({
          next: () => {
            const idx = this.technicians.findIndex(t => t.technician.id === summary.technician.id);
            if (idx >= 0) {
              this.technicians[idx] = {
                ...this.technicians[idx],
                technician: { ...this.technicians[idx].technician, ...result }
              };
              this.applyFilters();
            }
          },
          error: (err) => {
            console.error('Failed to update onboarding info:', err);
          }
        });
      }
    });
  }
}
