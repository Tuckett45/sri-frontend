import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { forkJoin, Observable, from, of } from 'rxjs';
import { concatMap, delay, catchError, toArray, tap } from 'rxjs/operators';
import { OnboardingService } from '../../../services/onboarding.service';
import { OnboardingLinkService } from '../../../services/onboarding-link.service';
import { CandidateListStateService } from '../../../services/candidate-list-state.service';
import { Candidate, CreateCandidatePayload, UpdateCandidatePayload, OfferStatus, ExperienceLevel } from '../../../models/onboarding.models';
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
  application_reviewed: 'Application Reviewed',
  vetted_available: 'Vetted/Available',
  offer_extended: 'Offer Extended',
  offer_accepted_onboarding: 'Offer Accepted/Onboarding',
  hired_assigned: 'Hired/Assigned',
  onboarded: 'Onboarded',
  do_not_hire: 'Do Not Hire',
  turned_down_hold: 'Turned Down/Hold for Later',
};

const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  management: 'Management',
  no_experience_green: 'No Experience',
  level_1_green: 'Level 1/Green',
  level_2: 'Level 2',
  level_3: 'Level 3',
  level_4: 'Level 4',
  it_testing: 'IT/Testing',
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

      <!-- Bulk Conversion Progress -->
      <div class="progress-banner" *ngIf="bulkConverting" role="status" aria-live="polite">
        <div class="progress-text">
          Converting candidates... {{ bulkConvertProgress }} / {{ bulkConvertTotal }}
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" [style.width.%]="(bulkConvertProgress / bulkConvertTotal) * 100"></div>
        </div>
      </div>

      <!-- Bulk Conversion Failures Detail -->
      <div class="failures-banner" *ngIf="bulkConvertFailures.length > 0" role="alert">
        <div class="failures-header">
          <strong>{{ bulkConvertFailures.length }} conversion{{ bulkConvertFailures.length > 1 ? 's' : '' }} failed:</strong>
          <button type="button" (click)="bulkConvertFailures = []" aria-label="Dismiss failures">Dismiss</button>
        </div>
        <ul class="failures-list">
          <li *ngFor="let failure of bulkConvertFailures">
            <span class="failure-name">{{ failure.techName }}</span> &mdash;
            <span class="failure-reason">{{ failure.reason }}</span>
          </li>
        </ul>
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
            <option value="application_reviewed">Application Reviewed</option>
            <option value="vetted_available">Vetted/Available</option>
            <option value="offer_extended">Offer Extended</option>
            <option value="offer_accepted_onboarding">Offer Accepted/Onboarding</option>
            <option value="hired_assigned">Hired/Assigned</option>
            <option value="onboarded">Onboarded</option>
            <option value="do_not_hire">Do Not Hire</option>
            <option value="turned_down_hold">Turned Down/Hold for Later</option>
          </select>
        </div>
        <div class="filter-field">
          <label for="experienceFilter">Experience Level</label>
          <select id="experienceFilter"
                  [(ngModel)]="experienceLevelFilter"
                  (ngModelChange)="onExperienceLevelFilterChange()">
            <option value="">All Levels</option>
            <option value="management">Management</option>
            <option value="no_experience_green">No Experience</option>
            <option value="level_1_green">Level 1/Green</option>
            <option value="level_2">Level 2</option>
            <option value="level_3">Level 3</option>
            <option value="level_4">Level 4</option>
            <option value="it_testing">IT/Testing</option>
            <option value="none">— (No Level Set)</option>
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
      <div class="bulk-action-bar" *ngIf="selectedCandidateIds.size > 0 || getAllEligibleCount() > 0">
        <button type="button"
                class="bulk-select-all-btn"
                (click)="onSelectAllEligible()"
                *ngIf="getAllEligibleCount() > 0 && selectedCandidateIds.size < getAllEligibleCount()"
                [disabled]="bulkConverting">
          <mat-icon class="bulk-icon">select_all</mat-icon>
          Select All {{ getAllEligibleCount() }} Eligible Candidates
        </button>
        <span class="bulk-selection-count" *ngIf="selectedCandidateIds.size > 0">{{ selectedCandidateIds.size }} candidate{{ selectedCandidateIds.size > 1 ? 's' : '' }} selected</span>
        <button type="button"
                class="bulk-convert-btn"
                (click)="onBulkConvert()"
                [disabled]="bulkConverting || selectedCandidateIds.size === 0">
          <mat-icon class="bulk-icon">group_add</mat-icon>
          {{ bulkConverting ? 'Converting...' : 'Convert Selected to Technicians' }}
        </button>
        <button type="button" class="bulk-clear-btn" (click)="clearSelection()" *ngIf="selectedCandidateIds.size > 0">
          Clear Selection
        </button>
      </div>

      <!-- Candidate Table -->
      <div class="table-wrapper" *ngIf="filteredCandidates.length > 0">
      <table class="candidate-table">
        <colgroup>
          <col class="col-checkbox">
          <col class="col-name">
          <col class="col-email">
          <col class="col-phone">
          <col class="col-state">
          <col class="col-referred">
          <col class="col-start">
          <col class="col-status">
          <col class="col-experience">
          <col class="col-actions">
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
            <th (click)="onSort('homeState')" class="sortable center-col">
              State <span class="sort-icon">{{ getSortIcon('homeState') }}</span>
            </th>
            <th (click)="onSort('referredBy')" class="sortable">
              Referred By <span class="sort-icon">{{ getSortIcon('referredBy') }}</span>
            </th>
            <th (click)="onSort('startDate')" class="sortable">
              Start Date <span class="sort-icon">{{ getSortIcon('startDate') }}</span>
            </th>
            <th (click)="onSort('offerStatus')" class="sortable">
              Status <span class="sort-icon">{{ getSortIcon('offerStatus') }}</span>
            </th>
            <th (click)="onSort('experienceLevel')" class="sortable">
              Experience <span class="sort-icon">{{ getSortIcon('experienceLevel') }}</span>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let candidate of paginatedCandidates"
              (click)="onRowClick(candidate)"
              class="candidate-row"
              [class.selected-row]="selectedCandidateIds.has(candidate.candidateId)"
              [class.needs-review-row]="candidate.offerStatus === 'needs_review'"
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
            <td class="center-col">{{ candidate.homeState || extractState(candidate.homeAddress) || '—' }}</td>
            <td>{{ candidate.referredBy || '—' }}</td>
            <td>{{ candidate.startDate | date:'MMM d, yyyy' }}</td>
            <td class="status-cell" (click)="$event.stopPropagation()">
              <select class="inline-status-select"
                      [class.needs-review]="candidate.offerStatus === 'needs_review'"
                      [value]="candidate.offerStatus"
                      (change)="onInlineStatusChange(candidate, $event)"
                      [attr.aria-label]="'Change offer status for ' + candidate.techName">
                <option value="needs_review">Needs Review</option>
                <option value="application_reviewed">Application Reviewed</option>
                <option value="vetted_available">Vetted/Available</option>
                <option value="offer_extended">Offer Extended</option>
                <option value="offer_accepted_onboarding">Offer Accepted/Onboarding</option>
                <option value="hired_assigned">Hired/Assigned</option>
                <option value="onboarded">Onboarded</option>
                <option value="do_not_hire">Do Not Hire</option>
                <option value="turned_down_hold">Turned Down/Hold</option>
              </select>
            </td>
            <td class="experience-cell" (click)="$event.stopPropagation()">
              <select class="inline-experience-select"
                      [value]="candidate.experienceLevel || ''"
                      (change)="onInlineExperienceChange(candidate, $event)"
                      [attr.aria-label]="'Change experience level for ' + candidate.techName">
                <option value="">—</option>
                <option value="management">Management</option>
                <option value="no_experience_green">No Experience</option>
                <option value="level_1_green">Level 1/Green</option>
                <option value="level_2">Level 2</option>
                <option value="level_3">Level 3</option>
                <option value="level_4">Level 4</option>
                <option value="it_testing">IT/Testing</option>
              </select>
            </td>
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
              <button class="icon-btn icon-view"
                      (click)="onRowClick(candidate); $event.stopPropagation()"
                      [attr.aria-label]="'View ' + candidate.techName"
                      title="View">
                <mat-icon class="action-icon">visibility</mat-icon>
              </button>
              <button class="icon-btn icon-edit"
                      (click)="onEditCandidate(candidate); $event.stopPropagation()"
                      [attr.aria-label]="'Edit ' + candidate.techName"
                      title="Edit">
                <mat-icon class="action-icon">edit</mat-icon>
              </button>
              <span class="badge-promoted" *ngIf="isPromoted(candidate)">Promoted</span>
              <button class="icon-btn icon-convert"
                      *ngIf="canConvert(candidate)"
                      (click)="onConvertToTechnician(candidate); $event.stopPropagation()"
                      [disabled]="convertingId === candidate.candidateId"
                      [attr.aria-label]="'Convert ' + candidate.techName + ' to technician'"
                      title="Convert to Technician">
                <mat-icon class="action-icon">person_add</mat-icon>
              </button>
              <button class="icon-btn icon-delete"
                      (click)="onDeleteCandidate(candidate); $event.stopPropagation()"
                      [attr.aria-label]="'Delete ' + candidate.techName"
                      title="Delete">
                <mat-icon class="action-icon">delete</mat-icon>
              </button>
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
      margin: 0.75rem;
      padding: 0.75rem;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      max-width: 100%;
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

    .progress-banner {
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      background: #e3f2fd;
      border: 1px solid #90caf9;
      border-radius: 4px;
      color: #0d47a1;
      font-size: 0.875rem;
    }

    .progress-text {
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .progress-bar-container {
      width: 100%;
      height: 8px;
      background: #bbdefb;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: #1976d2;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .failures-banner {
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      background: #fff3e0;
      border: 1px solid #ffcc80;
      border-radius: 4px;
      color: #e65100;
      font-size: 0.875rem;
    }

    .failures-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .failures-header button {
      background: none;
      border: none;
      color: #e65100;
      cursor: pointer;
      font-weight: 600;
      text-decoration: underline;
    }

    .failures-list {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 200px;
      overflow-y: auto;
    }

    .failures-list li {
      padding: 0.25rem 0;
      border-bottom: 1px solid #ffe0b2;
    }

    .failures-list li:last-child {
      border-bottom: none;
    }

    .failure-name {
      font-weight: 500;
    }

    .failure-reason {
      font-style: italic;
      color: #bf360c;
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

    .status-cell {
      padding: 0.2rem 0.25rem !important;
    }

    .inline-status-select {
      padding: 0.25rem 0.4rem;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      font-size: 0.75rem;
      color: #212121;
      cursor: pointer;
      transition: border-color 0.15s, background-color 0.15s;
      max-width: 170px;
    }

    .inline-status-select:hover {
      border-color: #bdbdbd;
      background: #fafafa;
    }

    .inline-status-select:focus {
      outline: none;
      border-color: #1976d2;
      background: #ffffff;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
    }

    .inline-status-select.needs-review {
      background: #fff3e0;
      border-color: #ffb74d;
      color: #e65100;
      font-weight: 600;
    }

    .inline-status-select.needs-review:hover {
      background: #ffe0b2;
      border-color: #ff9800;
    }

    .inline-experience-select {
      padding: 0.25rem 0.4rem;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      font-size: 0.75rem;
      color: #212121;
      cursor: pointer;
      transition: border-color 0.15s, background-color 0.15s;
      max-width: 140px;
    }

    .inline-experience-select:hover {
      border-color: #bdbdbd;
      background: #fafafa;
    }

    .inline-experience-select:focus {
      outline: none;
      border-color: #1976d2;
      background: #ffffff;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
    }

    .table-wrapper {
      overflow-x: auto;
      width: 100%;
      -webkit-overflow-scrolling: touch;
    }

    .candidate-table {
      width: max-content;
      min-width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 0.75rem;
    }

    .candidate-table colgroup .col-checkbox { width: 20px; }
    .candidate-table colgroup .col-name { min-width: 90px; }
    .candidate-table colgroup .col-email { min-width: 120px; }
    .candidate-table colgroup .col-phone { min-width: 100px; }
    .candidate-table colgroup .col-state { min-width: 36px; }
    .candidate-table colgroup .col-referred { min-width: 75px; }
    .candidate-table colgroup .col-start { min-width: 72px; }
    .candidate-table colgroup .col-status { min-width: 80px; }
    .candidate-table colgroup .col-experience { min-width: 80px; }
    .candidate-table colgroup .col-actions { min-width: 100px; }

    .candidate-table thead th {
      text-align: left;
      padding: 0.375rem 0.4rem;
      background: #f5f5f5;
      border-bottom: 2px solid #e0e0e0;
      font-weight: 600;
      color: #424242;
      white-space: nowrap;
      font-size: 0.7rem;
      letter-spacing: 0.02em;
    }

    .candidate-table thead th.sortable {
      cursor: pointer;
      user-select: none;
    }

    .candidate-table thead th.sortable:hover {
      background: #eeeeee;
    }

    .sort-icon {
      font-size: 0.7rem;
      margin-left: 0.2rem;
    }

    .candidate-table tbody td {
      padding: 0.3rem 0.4rem;
      border-bottom: 1px solid #e0e0e0;
      color: #212121;
      white-space: nowrap;
    }

    .candidate-table thead th.center-col,
    .candidate-table tbody td.center-col {
      text-align: center;
    }

    .candidate-table tbody td:last-child {
      /* Actions — allow wrapping for buttons */
      white-space: normal;
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

    .candidate-row.needs-review-row {
      border-left: 3px solid #ff9800;
      background-color: rgba(255, 152, 0, 0.04);
    }

    .candidate-row.needs-review-row:hover {
      background-color: rgba(255, 152, 0, 0.08);
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

    .bulk-select-all-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      background-color: #1565c0;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .bulk-select-all-btn:hover:not(:disabled) {
      background-color: #0d47a1;
    }

    .bulk-select-all-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .bulk-select-all-btn .bulk-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .action-btn {
      display: none;
    }

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
      margin: 0px;
      transition: background-color 0.15s, opacity 0.15s, color 0.15s;
      vertical-align: middle;
      padding: 0;
    }

    .icon-btn .action-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .icon-btn:disabled {
      cursor: not-allowed;
      opacity: 0.25;
    }

    /* Resume icon */
    .icon-btn.icon-resume {
      color: #9e9e9e;
      opacity: 0.5;
    }

    .icon-btn.icon-resume.has-file {
      opacity: 1;
      color: #1565c0;
    }

    .icon-btn.icon-resume:not(:disabled):hover {
      background: #e3f2fd;
      border-color: #90caf9;
      color: #1565c0;
      opacity: 1;
    }

    /* Notes icon */
    .icon-btn.icon-notes {
      color: #9e9e9e;
      opacity: 0.5;
    }

    .icon-btn.icon-notes.has-notes {
      opacity: 1;
      color: #e65100;
    }

    .icon-btn.icon-notes:hover {
      background: #fff3e0;
      border-color: #ffcc80;
      color: #e65100;
      opacity: 1;
    }

    /* View icon */
    .icon-btn.icon-view {
      color: #1976d2;
      opacity: 1;
    }

    .icon-btn.icon-view:hover {
      background: #e3f2fd;
      border-color: #90caf9;
      color: #1565c0;
    }

    /* Edit icon */
    .icon-btn.icon-edit {
      color: #f57c00;
      opacity: 1;
    }

    .icon-btn.icon-edit:hover {
      background: #fff3e0;
      border-color: #ffcc80;
      color: #e65100;
    }

    /* Convert icon */
    .icon-btn.icon-convert {
      color: #7b1fa2;
      opacity: 1;
    }

    .icon-btn.icon-convert:hover:not(:disabled) {
      background: #f3e5f5;
      border-color: #ce93d8;
      color: #6a1b9a;
    }

    .icon-btn.icon-convert:disabled {
      opacity: 0.3;
    }

    /* Delete icon */
    .icon-btn.icon-delete {
      color: #d32f2f;
      opacity: 1;
    }

    .icon-btn.icon-delete:hover {
      background: #ffebee;
      border-color: #ef9a9a;
      color: #b71c1c;
    }

    .badge-promoted {
      display: inline-block;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 600;
      background: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #a5d6a7;
      margin: 1px;
      vertical-align: middle;
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
        margin: 0.5rem;
        padding: 0.5rem;
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

export class CandidateListComponent implements OnInit, OnDestroy {
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
  bulkConvertProgress = 0;
  bulkConvertTotal = 0;
  bulkConvertFailures: { candidateId: string; techName: string; reason: string }[] = [];

  searchText = '';
  statusFilter = '';
  homeStateFilter = '';
  referredByFilter = '';
  experienceLevelFilter: ExperienceLevel | 'none' | '' = '';
  incompleteCertsFilter = false;
  sortState: SortState | null = { column: 'createdAt', direction: 'desc' };
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
    private onboardingLinkService: OnboardingLinkService,
    private listStateService: CandidateListStateService
  ) {}

  ngOnInit(): void {
    // Check for cached state from a previous visit (e.g., user returning from detail view)
    const savedState = this.listStateService.restore();

    // Read query params for pre-filtering (from pipeline dashboard navigation)
    const params = this.route.snapshot.queryParams;
    const hasQueryParams = params['offerStatus'] || params['search'] || params['incompleteCerts'] || params['experienceLevel'];

    if (savedState && !hasQueryParams) {
      // Restore previous UI state
      this.searchText = savedState.searchText;
      this.statusFilter = savedState.statusFilter;
      this.homeStateFilter = savedState.homeStateFilter;
      this.referredByFilter = savedState.referredByFilter;
      this.experienceLevelFilter = (savedState.experienceLevelFilter || '') as ExperienceLevel | 'none' | '';
      this.incompleteCertsFilter = savedState.incompleteCertsFilter;
      this.sortState = savedState.sortColumn
        ? { column: savedState.sortColumn, direction: savedState.sortDirection }
        : null;
      this.pageIndex = savedState.pageIndex;
      this.pageSize = savedState.pageSize;

      if (savedState.candidates.length > 0) {
        // Use cached data — no API call needed
        this.candidates = savedState.candidates;
        this.updateAvailableStates();
        this.applyFiltersAndSort(this.pageIndex);
      } else {
        // Data was invalidated (add/edit/delete happened) — reload but keep position
        this.loadCandidates(true);
      }
    } else {
      // Fresh load (first visit or navigating from pipeline dashboard with query params)
      if (params['offerStatus']) {
        this.statusFilter = params['offerStatus'];
      }
      if (params['search']) {
        this.searchText = params['search'];
      }
      if (params['incompleteCerts'] === 'true') {
        this.incompleteCertsFilter = true;
      }
      if (params['experienceLevel']) {
        this.experienceLevelFilter = params['experienceLevel'] as ExperienceLevel | 'none';
      }

      this.loadCandidates();
    }
  }

  ngOnDestroy(): void {
    // Persist state whenever the component is destroyed (navigating away)
    if (this.candidates.length > 0) {
      this.saveListState();
    }
  }

  onSearchChange(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
    this.pageIndex = 0;
    this.applyFiltersAndSort();
  }

  onStatusFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.statusFilter = value;
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

  onExperienceLevelFilterChange(): void {
    this.pageIndex = 0;
    this.applyFiltersAndSort();
  }

  onInlineExperienceChange(candidate: Candidate, event: Event): void {
    const newValue = (event.target as HTMLSelectElement).value as ExperienceLevel | '';
    const payload: UpdateCandidatePayload = {
      experienceLevel: newValue || null,
    };

    this.onboardingService.updateCandidate(candidate.candidateId, payload).subscribe({
      next: () => {
        candidate.experienceLevel = newValue || undefined;
        this.applyFiltersAndSort(this.pageIndex);
      },
      error: () => {
        this.errorMessage = `Failed to update experience level for ${candidate.techName}.`;
      }
    });
  }

  onInlineStatusChange(candidate: Candidate, event: Event): void {
    const newValue = (event.target as HTMLSelectElement).value as OfferStatus;
    const previousValue = candidate.offerStatus;
    const payload: UpdateCandidatePayload = {
      offerStatus: newValue,
    };
    // Optimistically update UI
    candidate.offerStatus = newValue;
    this.applyFiltersAndSort(this.pageIndex);

    this.onboardingService.updateCandidate(candidate.candidateId, payload).subscribe({
      error: () => {
        // Revert on failure
        candidate.offerStatus = previousValue;
        this.applyFiltersAndSort(this.pageIndex);
        this.errorMessage = `Failed to update offer status for ${candidate.techName}.`;
      }
    });
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

  getExperienceLevelLabel(level: ExperienceLevel | undefined): string {
    if (!level) return '\u2014';
    return EXPERIENCE_LEVEL_LABELS[level] ?? level;
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
    this.saveListState();
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
          experienceLevel: result.basicInfo.experienceLevel || undefined,
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
            this.uploadCandidateFiles(candidate.candidateId, result.files, () => this.loadCandidates(true));
          },
          error: () => {
            this.errorMessage = 'Failed to update candidate. Please try again.';
            this.loadCandidates(true);
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
          experienceLevel: result.basicInfo.experienceLevel || undefined,
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
            this.uploadCandidateFiles(createdCandidate.candidateId, result.files, () => this.loadCandidates(true));
          },
          error: () => {
            this.submitting = false;
            this.errorMessage = 'Failed to create candidate. Please try again.';
            this.loadCandidates(true);
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
        this.loadCandidates(true);
      },
      error: () => {
        this.errorMessage = 'Failed to delete candidate. Please try again.';
      }
    });
  }

  // ─── Convert to Technician ────────────────────────────────────────────────

  canConvert(candidate: Candidate): boolean {
    // Already promoted candidates cannot be converted again
    if (candidate.promotedToTechnicianId) return false;
    // Only Hired/Assigned candidates are eligible for conversion
    return candidate.offerStatus === 'hired_assigned';
  }

  isPromoted(candidate: Candidate): boolean {
    return !!candidate.promotedToTechnicianId;
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

  /**
   * Returns the total number of eligible candidates across ALL pages (not just current page).
   * A candidate is eligible if canConvert() returns true (hired_assigned or offer_accepted_onboarding with OSHA).
   */
  getAllEligibleCount(): number {
    return this.filteredCandidates.filter(c => this.canConvert(c)).length;
  }

  /**
   * Selects ALL eligible candidates across every page, not just the current page.
   * This allows bulk conversion of all hired candidates in a single operation.
   */
  onSelectAllEligible(): void {
    const allEligible = this.filteredCandidates.filter(c => this.canConvert(c));
    allEligible.forEach(c => this.selectedCandidateIds.add(c.candidateId));
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
    this.successMessage = '';
    this.bulkConvertProgress = 0;
    this.bulkConvertTotal = selectedCandidates.length;
    this.bulkConvertFailures = [];

    // Process sequentially with a small delay between requests to avoid
    // rate limiting and race conditions on unique constraints.
    from(selectedCandidates).pipe(
      concatMap(candidate =>
        this.onboardingService.convertToTechnician(candidate.candidateId).pipe(
          delay(150), // Small delay between requests to avoid overwhelming the API
          tap(() => this.bulkConvertProgress++),
          catchError(err => {
            this.bulkConvertProgress++;
            // Handle "already promoted" gracefully — backend auto-repairs the status
            if (err?.statusCode === 400 && err?.message?.includes('already been promoted')) {
              return of({
                alreadyPromoted: true as const,
                candidateId: candidate.candidateId,
                techName: candidate.techName,
              });
            }
            // Isolate individual failures — don't abort the whole batch
            return of({
              error: true as const,
              candidateId: candidate.candidateId,
              techName: candidate.techName,
              reason: err?.message || 'Unknown error'
            });
          })
        )
      ),
      toArray()
    ).subscribe(results => {
      this.bulkConverting = false;
      this.selectedCandidateIds.clear();

      const failures = results.filter((r: any) => r?.error === true) as { error: boolean; candidateId: string; techName: string; reason: string }[];
      const alreadyPromotedCount = results.filter((r: any) => r?.alreadyPromoted === true).length;
      const successCount = results.length - failures.length - alreadyPromotedCount;

      this.bulkConvertFailures = failures;

      if (failures.length === 0 && alreadyPromotedCount === 0) {
        this.successMessage = `Successfully converted ${successCount} candidate${successCount > 1 ? 's' : ''} to technicians.`;
      } else if (failures.length === 0) {
        this.successMessage = `Converted ${successCount} candidate${successCount > 1 ? 's' : ''} to technicians.${alreadyPromotedCount > 0 ? ` ${alreadyPromotedCount} already promoted (status auto-repaired).` : ''}`;
      } else if (successCount === 0 && alreadyPromotedCount === 0) {
        this.errorMessage = `All ${failures.length} conversions failed. Please review the errors below.`;
      } else {
        this.successMessage = `Converted ${successCount} of ${results.length} candidates.${alreadyPromotedCount > 0 ? ` ${alreadyPromotedCount} already promoted.` : ''} ${failures.length} failed — see details below.`;
      }

      this.loadCandidates(true);
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
        this.loadCandidates(true);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Persists current list UI state so it can be restored when the user navigates back.
   */
  private saveListState(): void {
    this.listStateService.save({
      searchText: this.searchText,
      statusFilter: this.statusFilter,
      homeStateFilter: this.homeStateFilter,
      referredByFilter: this.referredByFilter,
      experienceLevelFilter: this.experienceLevelFilter,
      incompleteCertsFilter: this.incompleteCertsFilter,
      sortColumn: this.sortState?.column ?? null,
      sortDirection: this.sortState?.direction ?? 'asc',
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      candidates: this.candidates,
    });
  }

  /**
   * Reloads candidates from the API.
   * @param preservePosition If true, preserves the current page index after reload.
   */
  private loadCandidates(preservePosition = false): void {
    this.loading = true;
    this.errorMessage = '';
    const savedPageIndex = this.pageIndex;

    this.onboardingService.getCandidates().subscribe({
      next: (candidates) => {
        this.candidates = candidates;
        this.loading = false;
        this.updateAvailableStates();
        this.applyFiltersAndSort(preservePosition ? savedPageIndex : undefined);
        // Update cached state with fresh data
        this.saveListState();
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

  /**
   * Applies current filters and sorting to the candidates list.
   * @param restorePageIndex If provided, restores this page index instead of resetting to 0.
   */
  private applyFiltersAndSort(restorePageIndex?: number): void {
    let result = [...this.candidates];

    // Only clear selection when filters actually change (not on data reload)
    if (restorePageIndex === undefined) {
      this.selectedCandidateIds.clear();
    }

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

    // Experience level filter
    if (this.experienceLevelFilter) {
      if (this.experienceLevelFilter === 'none') {
        result = result.filter((c) => !c.experienceLevel);
      } else {
        result = result.filter((c) => c.experienceLevel === this.experienceLevelFilter);
      }
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

    // Restore page index if specified (e.g., after data reload), otherwise keep current
    if (restorePageIndex !== undefined) {
      // Clamp to valid range in case filtered results have fewer pages now
      const maxPage = Math.max(0, Math.ceil(this.filteredCandidates.length / this.pageSize) - 1);
      this.pageIndex = Math.min(restorePageIndex, maxPage);
    }
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
