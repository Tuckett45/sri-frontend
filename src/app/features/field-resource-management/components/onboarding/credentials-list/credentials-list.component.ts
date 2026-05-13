import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, Subscription, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError, take } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
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

        <div *ngIf="filteredTechnicians.length > 0" class="tabbed-tables">
          <!-- Sub-tabs -->
          <div class="sub-tabs">
            <button class="sub-tab" [class.active]="activeSubTab === 'core'" (click)="activeSubTab = 'core'">Core Qualifications</button>
            <button class="sub-tab" [class.active]="activeSubTab === 'badges'" (click)="activeSubTab = 'badges'">Badges & Access</button>
            <button class="sub-tab" [class.active]="activeSubTab === 'training'" (click)="activeSubTab = 'training'">Training & Certs</button>
            <button class="sub-tab" [class.active]="activeSubTab === 'equipment'" (click)="activeSubTab = 'equipment'">Equipment Kits</button>
          </div>

          <!-- Core Qualifications Table -->
          <table *ngIf="activeSubTab === 'core'" class="credentials-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Region</th>
                <th>Fiber Exp</th>
                <th>OSHA</th>
                <th>Scissor Cert</th>
                <th>Travel</th>
                <th>Shift</th>
                <th>BG/Drug</th>
                <th>Military</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let summary of pagedTechnicians" class="technician-row" (click)="navigateToDetail(summary.technician.id)" tabindex="0" (keydown.enter)="navigateToDetail(summary.technician.id)">
                <td class="name-cell">{{ summary.technician.firstName }} {{ summary.technician.lastName }}</td>
                <td>{{ summary.technician.region }}</td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.fiberExperience && summary.technician.fiberExperience !== 'none')">{{ getYesNoIcon(summary.technician.fiberExperience && summary.technician.fiberExperience !== 'none') }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.oshaCertified)">{{ getYesNoIcon(summary.technician.oshaCertified) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.scissorLiftCertified)">{{ getYesNoIcon(summary.technician.scissorLiftCertified) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.willingToTravel)">{{ getYesNoIcon(summary.technician.willingToTravel) }}</span></td>
                <td class="yn-cell"><span class="shift-label">{{ getShiftLabel(summary.technician.shiftAvailability) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.backgroundCheckStatus === 'pass' && summary.technician.drugScreenStatus === 'pass')">{{ getYesNoIcon(summary.technician.backgroundCheckStatus === 'pass' && summary.technician.drugScreenStatus === 'pass') }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.isVeteran)">{{ getYesNoIcon(summary.technician.isVeteran) }}</span></td>
                <td class="actions-cell" (click)="$event.stopPropagation()">
                  <button class="action-button edit-button" (click)="openOnboardingInfoModal(summary)" title="Edit">&#9998; Edit</button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Badges & Access Table -->
          <table *ngIf="activeSubTab === 'badges'" class="credentials-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>AT&T Badge</th>
                <th>Comcast Badge</th>
                <th>AT&T Supplier Training</th>
                <th>Ciena Basic Training</th>
                <th>Google Red Badge</th>
                <th>Google LDAP</th>
                <th>Meta Green Listing</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let summary of pagedTechnicians" class="technician-row" (click)="navigateToDetail(summary.technician.id)" tabindex="0" (keydown.enter)="navigateToDetail(summary.technician.id)">
                <td class="name-cell">{{ summary.technician.firstName }} {{ summary.technician.lastName }}</td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.attBadge)">{{ getYesNoIcon(summary.technician.attBadge) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.comcastBadge)">{{ getYesNoIcon(summary.technician.comcastBadge) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.attSupplierTraining)">{{ getYesNoIcon(summary.technician.attSupplierTraining) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.cienaBasicTraining)">{{ getYesNoIcon(summary.technician.cienaBasicTraining) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.googleRedBadge)">{{ getYesNoIcon(summary.technician.googleRedBadge) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.googleLdap)">{{ getYesNoIcon(summary.technician.googleLdap) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.metaGreenListing)">{{ getYesNoIcon(summary.technician.metaGreenListing) }}</span></td>
                <td class="actions-cell" (click)="$event.stopPropagation()">
                  <button class="action-button edit-button" (click)="openOnboardingInfoModal(summary)" title="Edit">&#9998; Edit</button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Training & Certs Table -->
          <table *ngIf="activeSubTab === 'training'" class="credentials-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>OBS Training</th>
                <th>Scissor Lift</th>
                <th>OSHA 10</th>
                <th>OSHA 30</th>
                <th>Tech Hand Tools</th>
                <th>BIISCI</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let summary of pagedTechnicians" class="technician-row" (click)="navigateToDetail(summary.technician.id)" tabindex="0" (keydown.enter)="navigateToDetail(summary.technician.id)">
                <td class="name-cell">{{ summary.technician.firstName }} {{ summary.technician.lastName }}</td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.obsTraining)">{{ getYesNoIcon(summary.technician.obsTraining) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.scissorLiftCertified)">{{ getYesNoIcon(summary.technician.scissorLiftCertified) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.osha10)">{{ getYesNoIcon(summary.technician.osha10) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.osha30)">{{ getYesNoIcon(summary.technician.osha30) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.techHandTools)">{{ getYesNoIcon(summary.technician.techHandTools) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.biisciCertified)">{{ getYesNoIcon(summary.technician.biisciCertified) }}</span></td>
                <td class="actions-cell" (click)="$event.stopPropagation()">
                  <button class="action-button edit-button" (click)="openOnboardingInfoModal(summary)" title="Edit">&#9998; Edit</button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Equipment Kits Table -->
          <table *ngIf="activeSubTab === 'equipment'" class="credentials-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>CI Kit</th>
                <th>Fiber Kit</th>
                <th>Labeling Kit</th>
                <th>Power Kit</th>
                <th>Testing Eqpt</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let summary of pagedTechnicians" class="technician-row" (click)="navigateToDetail(summary.technician.id)" tabindex="0" (keydown.enter)="navigateToDetail(summary.technician.id)">
                <td class="name-cell">{{ summary.technician.firstName }} {{ summary.technician.lastName }}</td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.ciKitAssigned)">{{ getYesNoIcon(summary.technician.ciKitAssigned) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.fiberKitAssigned)">{{ getYesNoIcon(summary.technician.fiberKitAssigned) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.labelingKitAssigned)">{{ getYesNoIcon(summary.technician.labelingKitAssigned) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.powerKitAssigned)">{{ getYesNoIcon(summary.technician.powerKitAssigned) }}</span></td>
                <td class="yn-cell"><span [class]="getYesNoClass(summary.technician.testingEqptAssigned)">{{ getYesNoIcon(summary.technician.testingEqptAssigned) }}</span></td>
                <td class="actions-cell" (click)="$event.stopPropagation()">
                  <button class="action-button edit-button" (click)="openOnboardingInfoModal(summary)" title="Edit">&#9998; Edit</button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination Controls -->
          <div class="pagination-controls">
            <div class="pagination-info">
              Showing {{ ((currentPage - 1) * pageSize) + 1 }}�{{ currentPage * pageSize > filteredTechnicians.length ? filteredTechnicians.length : currentPage * pageSize }} of {{ filteredTechnicians.length }}
            </div>
            <div class="pagination-actions">
              <select class="page-size-select" [value]="pageSize" (change)="onPageSizeChange($event)">
                <option *ngFor="let size of pageSizeOptions" [value]="size">{{ size }} per page</option>
              </select>
              <button class="page-btn" [disabled]="currentPage === 1" (click)="goToPage(1)" title="First page">&laquo;</button>
              <button class="page-btn" [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)" title="Previous page">&lsaquo;</button>
              <span class="page-indicator">Page {{ currentPage }} of {{ totalPages }}</span>
              <button class="page-btn" [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)" title="Next page">&rsaquo;</button>
              <button class="page-btn" [disabled]="currentPage === totalPages" (click)="goToPage(totalPages)" title="Last page">&raquo;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .credentials-list-container {
      padding: 1.5rem;
      background-color: #f5f7fa;
      min-height: 100%;
      overflow-x: auto;
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

    .yn-cell {
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

    .shift-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #1976d2;
    }

    .tabbed-tables {
      margin-top: 0.5rem;
    }

    .sub-tabs {
      display: flex;
      gap: 0;
      border-bottom: 2px solid #e0e0e0;
      margin-bottom: 1rem;
    }

    .sub-tab {
      padding: 0.625rem 1.25rem;
      border: none;
      background: transparent;
      font-size: 0.875rem;
      font-weight: 500;
      color: #616161;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: color 0.2s, border-color 0.2s;
    }

    .sub-tab:hover {
      color: #1976d2;
    }

    .sub-tab.active {
      color: #1976d2;
      border-bottom-color: #1976d2;
    }

    .actions-cell {
      text-align: center;
      white-space: nowrap;
    }

    .row-action-button {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 4px 10px;
      border: 1px solid #1976d2;
      border-radius: 4px;
      background: #ffffff;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
      color: #1976d2;
      margin-right: 4px;
      transition: background-color 0.15s, border-color 0.15s;
    }

    .row-action-button:last-child {
      margin-right: 0;
    }

    .row-action-button:hover {
      background-color: #e3f2fd;
      border-color: #1565c0;
    }

    .row-action-button:focus {
      outline: 2px solid #1976d2;
      outline-offset: 1px;
    }

    .action-icon {
      font-size: 0.8125rem;
      line-height: 1;
    }

    .action-label {
      line-height: 1;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      margin-top: 12px;
      border-top: 1px solid #e0e0e0;
    }

    .pagination-info {
      font-size: 0.8125rem;
      color: #616161;
    }

    .pagination-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .page-size-select {
      padding: 4px 8px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 0.8125rem;
      cursor: pointer;
    }

    .page-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #fff;
      cursor: pointer;
      font-size: 0.875rem;
      color: #424242;
      transition: background-color 0.15s;
    }

    .page-btn:hover:not(:disabled) {
      background-color: #f5f5f5;
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .page-indicator {
      font-size: 0.8125rem;
      color: #424242;
      font-weight: 500;
      padding: 0 4px;
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
  pagedTechnicians: TechnicianCredentialSummary[] = [];
  searchTerm = '';
  statusFilter = 'All';
  isLoading = false;
  errorMessage = '';
  activeSubTab: 'core' | 'badges' | 'training' | 'equipment' = 'core';

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
      icon: '??',
      tooltip: 'View onboarding detail',
      ariaLabel: (tech) => `View onboarding detail for ${tech.firstName} ${tech.lastName}`,
      isVisible: () => true,
      execute: (id) => this.navigateToDetail(id)
    },
    {
      id: 'view-checklist',
      label: 'Checklist',
      icon: '?',
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
      icon: '??',
      tooltip: 'Assign equipment',
      ariaLabel: (tech) => `Assign equipment to ${tech.firstName} ${tech.lastName}`,
      isVisible: (summary) => summary.onboardingCompletionPercentage < 100,
      execute: (id) => this.navigateToAssignEquipment(id)
    }
  ];

  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];

  constructor(
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

  loadTechnicians(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const sub = this.technicianService.getTechnicians({}).subscribe({
      next: (technicians) => {
        if (technicians && technicians.length > 0) {
          this.loadAllDataForTechnicians(technicians);
        } else {
          this.technicians = [];
          this.filteredTechnicians = [];
          this.pagedTechnicians = [];
          this.isLoading = false;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Unable to load technicians. Please try again.';
      }
    });

    this.subscriptions.push(sub);
  }

  private loadDummyData(): void {
    const dummyTechnicians: TechnicianCredentialSummary[] = [
      {
        technician: { id: 'tech-001', firstName: 'Marcus', lastName: 'Rivera', email: 'marcus.rivera@fieldops.com', phone: '214-555-2001', role: 'Lead' as any, region: 'Dallas', isAvailable: true, isActive: true, fiberExperience: '5+_years', oshaCertified: true, scissorLiftCertified: true, willingToTravel: true, shiftAvailability: ['day', 'night'], backgroundCheckStatus: 'pass', drugScreenStatus: 'pass', isVeteran: true, attBadge: true, comcastBadge: true, attSupplierTraining: true, cienaBasicTraining: true, googleRedBadge: true, googleLdap: false, metaGreenListing: false, obsTraining: true, osha10: true, osha30: true, techHandTools: true, ciKitAssigned: true, fiberKitAssigned: true, labelingKitAssigned: true, powerKitAssigned: true, testingEqptAssigned: true, createdAt: new Date(), updatedAt: new Date() },
        activeCount: 3, expiringSoonCount: 0, expiredCount: 0, totalCount: 3,
        onboardingCompletionPercentage: 95, prcIndicator: 'upcoming', checklistSummary: null
      },
      {
        technician: { id: 'tech-002', firstName: 'Priya', lastName: 'Patel', email: 'priya.patel@fieldops.com', phone: '214-555-2002', role: 'Installer' as any, region: 'Plano', isAvailable: true, isActive: true, fiberExperience: '1-2_years', oshaCertified: true, scissorLiftCertified: false, willingToTravel: true, shiftAvailability: ['day'], backgroundCheckStatus: 'pass', drugScreenStatus: 'pending', isVeteran: false, attBadge: true, comcastBadge: false, attSupplierTraining: true, cienaBasicTraining: false, googleRedBadge: false, googleLdap: false, metaGreenListing: false, obsTraining: true, osha10: true, osha30: false, techHandTools: false, ciKitAssigned: true, fiberKitAssigned: true, labelingKitAssigned: false, powerKitAssigned: false, testingEqptAssigned: false, createdAt: new Date(), updatedAt: new Date() },
        activeCount: 2, expiringSoonCount: 1, expiredCount: 0, totalCount: 3,
        onboardingCompletionPercentage: 55, prcIndicator: 'overdue', checklistSummary: null
      },
      {
        technician: { id: 'tech-003', firstName: 'James', lastName: 'O\'Connor', email: 'james.oconnor@fieldops.com', phone: '972-555-2003', role: 'Level2' as any, region: 'Irving', isAvailable: false, isActive: true, fiberExperience: '3-5_years', oshaCertified: true, scissorLiftCertified: true, willingToTravel: false, shiftAvailability: ['day', 'swing'], backgroundCheckStatus: 'pass', drugScreenStatus: 'pass', isVeteran: true, attBadge: true, comcastBadge: true, attSupplierTraining: true, cienaBasicTraining: true, googleRedBadge: false, googleLdap: false, metaGreenListing: true, obsTraining: true, osha10: true, osha30: true, techHandTools: true, ciKitAssigned: true, fiberKitAssigned: true, labelingKitAssigned: true, powerKitAssigned: true, testingEqptAssigned: false, createdAt: new Date(), updatedAt: new Date() },
        activeCount: 1, expiringSoonCount: 0, expiredCount: 1, totalCount: 2,
        onboardingCompletionPercentage: 80, prcIndicator: null, checklistSummary: null
      },
      {
        technician: { id: 'tech-004', firstName: 'Aisha', lastName: 'Johnson', email: 'aisha.johnson@fieldops.com', phone: '469-555-2004', role: 'Level3' as any, region: 'Fort Worth', isAvailable: true, isActive: true, fiberExperience: '1-2_years', oshaCertified: false, scissorLiftCertified: false, willingToTravel: true, shiftAvailability: ['night', 'weekends'], backgroundCheckStatus: 'pending', drugScreenStatus: 'not_started', isVeteran: false, attBadge: false, comcastBadge: false, attSupplierTraining: false, cienaBasicTraining: false, googleRedBadge: false, googleLdap: false, metaGreenListing: false, obsTraining: false, osha10: false, osha30: false, techHandTools: false, ciKitAssigned: false, fiberKitAssigned: false, labelingKitAssigned: false, powerKitAssigned: false, testingEqptAssigned: false, createdAt: new Date(), updatedAt: new Date() },
        activeCount: 2, expiringSoonCount: 1, expiredCount: 1, totalCount: 4,
        onboardingCompletionPercentage: 20, prcIndicator: null, checklistSummary: null
      },
      {
        technician: { id: 'tech-005', firstName: 'Carlos', lastName: 'Mendez', email: 'carlos.mendez@fieldops.com', phone: '214-555-2005', role: 'Level1' as any, region: 'McKinney', isAvailable: true, isActive: true, fiberExperience: 'none', oshaCertified: false, scissorLiftCertified: false, willingToTravel: false, shiftAvailability: [], backgroundCheckStatus: 'not_started', drugScreenStatus: 'not_started', isVeteran: false, attBadge: false, comcastBadge: false, attSupplierTraining: false, cienaBasicTraining: false, googleRedBadge: false, googleLdap: false, metaGreenListing: false, obsTraining: false, osha10: false, osha30: false, techHandTools: false, ciKitAssigned: false, fiberKitAssigned: false, labelingKitAssigned: false, powerKitAssigned: false, testingEqptAssigned: false, createdAt: new Date(), updatedAt: new Date() },
        activeCount: 0, expiringSoonCount: 0, expiredCount: 0, totalCount: 0,
        onboardingCompletionPercentage: 0, prcIndicator: null, checklistSummary: null
      },
      {
        technician: { id: 'tech-006', firstName: 'Sarah', lastName: 'Kim', email: 'sarah.kim@fieldops.com', phone: '972-555-2006', role: 'Level4' as any, region: 'Richardson', isAvailable: true, isActive: true, fiberExperience: '5+_years', oshaCertified: true, scissorLiftCertified: true, willingToTravel: true, shiftAvailability: ['day', 'night', 'weekends'], backgroundCheckStatus: 'pass', drugScreenStatus: 'pass', isVeteran: false, attBadge: true, comcastBadge: true, attSupplierTraining: true, cienaBasicTraining: true, googleRedBadge: true, googleLdap: true, metaGreenListing: true, obsTraining: true, osha10: true, osha30: true, techHandTools: true, ciKitAssigned: true, fiberKitAssigned: true, labelingKitAssigned: true, powerKitAssigned: true, testingEqptAssigned: true, createdAt: new Date(), updatedAt: new Date() },
        activeCount: 4, expiringSoonCount: 0, expiredCount: 0, totalCount: 4,
        onboardingCompletionPercentage: 100, prcIndicator: 'upcoming', checklistSummary: null
      }
    ];

    this.technicians = dummyTechnicians;
    this.applyFilters();
    this.isLoading = false;
  }

  private loadAllDataForTechnicians(technicians: Technician[]): void {
    if (technicians.length === 0) {
      this.technicians = [];
      this.filteredTechnicians = [];
      this.pagedTechnicians = [];
      this.isLoading = false;
      return;
    }

    // The backend returns sub-resource data inline with each technician
    // No need for separate API calls
    const summaries: TechnicianCredentialSummary[] = technicians.map(technician => {
      const techAny = technician as any;
      const certifications = techAny.technicianCredentials || techAny.typedCredentials || techAny.certifications || [];
      const equipment = techAny.equipmentAssignments || [];
      const competencies = techAny.technicalCompetencies || [];
      const prcs = techAny.performanceReviewCycles || [];
      const prc = prcs.length > 0 ? prcs[0] : null;

      return this.computeFullSummary(technician, certifications, equipment, competencies, prc, null);
    });

    this.technicians = summaries;
    this.applyFilters();
    this.isLoading = false;
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
    this.currentPage = 1;
    this.updatePagination();
  }

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

  navigateToDetail(technicianId: string): void {
    this.router.navigate([technicianId], { relativeTo: this.route });
  }

  navigateToChecklist(technicianId: string): void {
    this.router.navigate([technicianId, 'checklist'], { relativeTo: this.route });
  }

  getYesNoClass(value: any): string {
    return value ? 'yn-yes' : 'yn-no';
  }

  getYesNoIcon(value: any): string {
    return value ? '\u2714' : '\u2014';
  }

  getShiftLabel(shiftAvailability: any): string {
    if (!shiftAvailability || shiftAvailability.length === 0) return '\u2014';
    if (Array.isArray(shiftAvailability)) {
      if (shiftAvailability.includes('day') && shiftAvailability.includes('night')) return 'Day/Night';
      if (shiftAvailability.includes('day')) return 'Day';
      if (shiftAvailability.includes('night')) return 'Night';
      return shiftAvailability.join(', ');
    }
    // Handle string value from backend
    const val = String(shiftAvailability).toLowerCase();
    if (val === 'day') return 'Day';
    if (val === 'night') return 'Night';
    if (val === 'both' || val === 'day/night') return 'Day/Night';
    return String(shiftAvailability);
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
        // Update the technician with the new onboarding info
        this.technicianService.updateTechnician(summary.technician.id, result).subscribe({
          next: () => {
            // Update local data
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
