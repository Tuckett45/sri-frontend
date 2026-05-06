import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { TechnicianService } from '../../../services/technician.service';
import { PRC, PRCGoal, PRCGoalStatus, PRCRecordStatus } from '../../../models/prc.model';
import { computePRCStatus } from '../../../utils/prc-timer.util';

@Component({
  selector: 'app-prc-section',
  template: `
    <div class="prc-section-container">
      <div class="prc-section-header">
        <h3 class="prc-section-title">Performance Review Cycle (PRC)</h3>
        <button
          class="add-goal-button"
          (click)="toggleAddGoalForm()"
          *ngIf="prc && !showAddGoalForm"
        >
          Add Goal
        </button>
      </div>

      <div *ngIf="errorMessage" class="error-state">
        <p class="error-message">{{ errorMessage }}</p>
        <button class="retry-button" (click)="retryLastAction()">Retry</button>
      </div>

      <div *ngIf="!prc" class="empty-state">
        <p>No PRC scheduled</p>
      </div>

      <div *ngIf="prc" class="prc-content">
        <div class="prc-status-section">
          <div class="prc-status-row">
            <span class="prc-status-label">Status</span>
            <span class="prc-status-badge" [ngClass]="getStatusBadgeClass(displayStatus)">
              {{ formatStatus(displayStatus) }}
            </span>
          </div>
          <div class="prc-status-row" *ngIf="isUpcoming">
            <span class="prc-indicator-badge badge-upcoming">Upcoming PRC</span>
          </div>
          <div class="prc-status-row" *ngIf="isOverdue">
            <span class="prc-indicator-badge badge-overdue">Overdue PRC</span>
          </div>
          <div class="prc-status-row">
            <span class="prc-field-label">Due Date</span>
            <span class="prc-field-value">{{ formatDate(prc.dueDate) }}</span>
          </div>
          <div class="prc-status-row" *ngIf="prc.completionDate">
            <span class="prc-field-label">Completion Date</span>
            <span class="prc-field-value">{{ formatDate(prc.completionDate) }}</span>
          </div>
        </div>

        <div class="prc-actions" *ngIf="displayStatus !== 'completed'">
          <button
            class="complete-prc-button"
            (click)="markPRCComplete()"
            [disabled]="isCompletingPRC"
          >
            {{ isCompletingPRC ? 'Completing...' : 'Mark PRC Complete' }}
          </button>
        </div>

        <div class="prc-goals-section">
          <h4 class="goals-title">Goals</h4>

          <div *ngIf="showAddGoalForm" class="add-form">
            <h4 class="form-title">Add New Goal</h4>
            <div class="form-group">
              <label class="form-label" for="goalDescription">Description</label>
              <input
                id="goalDescription"
                type="text"
                class="form-input"
                [(ngModel)]="goalDescription"
                placeholder="Enter goal description"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="goalTargetDate">Target Date</label>
              <input
                id="goalTargetDate"
                type="date"
                class="form-input"
                [(ngModel)]="goalTargetDate"
              />
            </div>
            <div *ngIf="validationError" class="validation-error">
              {{ validationError }}
            </div>
            <div class="form-actions">
              <button
                class="submit-button"
                (click)="submitGoal()"
                [disabled]="isSubmitting"
              >
                {{ isSubmitting ? 'Adding...' : 'Add' }}
              </button>
              <button class="cancel-button" (click)="cancelAddGoalForm()">Cancel</button>
            </div>
          </div>

          <div *ngIf="prc.goals.length === 0 && !showAddGoalForm" class="empty-goals">
            <p>No goals defined</p>
          </div>

          <div *ngIf="prc.goals.length > 0" class="goals-list">
            <div
              *ngFor="let goal of prc.goals"
              class="goal-card"
              [ngClass]="getGoalStatusClass(goal.status)"
            >
              <div class="goal-card-header">
                <span class="goal-description">{{ goal.description }}</span>
                <span class="goal-status-badge" [ngClass]="getGoalStatusBadgeClass(goal.status)">
                  {{ formatGoalStatus(goal.status) }}
                </span>
              </div>
              <div class="goal-card-body">
                <div class="goal-field">
                  <span class="field-label">Target Date</span>
                  <span class="field-value">{{ formatDate(goal.targetDate) }}</span>
                </div>
                <div class="goal-field" *ngIf="goal.completionNotes">
                  <span class="field-label">Notes</span>
                  <span class="field-value notes-value">{{ goal.completionNotes }}</span>
                </div>
              </div>
              <div class="goal-card-actions">
                <div *ngIf="completionNotesGoalId === goal.id" class="completion-notes-form">
                  <input
                    type="text"
                    class="form-input"
                    [(ngModel)]="completionNotes"
                    placeholder="Completion notes (optional)"
                  />
                  <div class="form-actions">
                    <button class="submit-button" (click)="confirmGoalComplete(goal)">Confirm</button>
                    <button class="cancel-button" (click)="cancelCompletionNotes()">Cancel</button>
                  </div>
                </div>
                <button
                  *ngIf="goal.status !== 'completed' && completionNotesGoalId !== goal.id"
                  class="update-status-button"
                  (click)="updateGoalStatus(goal)"
                >
                  Update Goal Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .prc-section-container {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .prc-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .prc-section-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #212121;
    }

    .add-goal-button {
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

    .add-goal-button:hover {
      background-color: #1565c0;
    }

    .error-state {
      padding: 1rem;
      margin-bottom: 1rem;
      background: #ffebee;
      border: 1px solid #ef9a9a;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .error-message {
      color: #c62828;
      margin: 0;
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
      white-space: nowrap;
    }

    .retry-button:hover {
      background-color: #1565c0;
    }

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      color: #616161;
    }

    .empty-state p {
      margin: 0;
    }

    .prc-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .prc-status-section {
      background: #f5f7fa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1rem;
    }

    .prc-status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.25rem 0;
    }

    .prc-status-label {
      font-size: 0.75rem;
      color: #616161;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .prc-field-label {
      font-size: 0.75rem;
      color: #616161;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .prc-field-value {
      font-size: 0.875rem;
      color: #212121;
    }

    .prc-status-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .prc-status-badge.badge-status-upcoming {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .prc-status-badge.badge-status-overdue {
      background-color: #ffebee;
      color: #c62828;
    }

    .prc-status-badge.badge-status-completed {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .prc-indicator-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .prc-indicator-badge.badge-upcoming {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .prc-indicator-badge.badge-overdue {
      background-color: #ffebee;
      color: #c62828;
    }

    .prc-actions {
      display: flex;
      gap: 0.5rem;
    }

    .complete-prc-button {
      padding: 0.5rem 1.25rem;
      background-color: #388e3c;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .complete-prc-button:hover:not(:disabled) {
      background-color: #2e7d32;
    }

    .complete-prc-button:disabled {
      background-color: #a5d6a7;
      cursor: not-allowed;
    }

    .prc-goals-section {
      margin-top: 0.5rem;
    }

    .goals-title {
      margin: 0 0 0.75rem 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #212121;
    }

    .add-form {
      background: #f5f7fa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1.25rem;
      margin-bottom: 1rem;
    }

    .form-title {
      margin: 0 0 1rem 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #212121;
    }

    .form-group {
      margin-bottom: 0.75rem;
    }

    .form-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      color: #616161;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 0.25rem;
    }

    .form-input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #bdbdbd;
      border-radius: 4px;
      font-size: 0.875rem;
      color: #212121;
      background-color: #ffffff;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
    }

    .validation-error {
      color: #d32f2f;
      font-size: 0.8125rem;
      margin-bottom: 0.75rem;
    }

    .form-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .submit-button {
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

    .submit-button:hover:not(:disabled) {
      background-color: #1565c0;
    }

    .submit-button:disabled {
      background-color: #90caf9;
      cursor: not-allowed;
    }

    .cancel-button {
      padding: 0.5rem 1.25rem;
      background-color: transparent;
      color: #616161;
      border: 1px solid #bdbdbd;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .cancel-button:hover {
      background-color: #f5f5f5;
    }

    .empty-goals {
      text-align: center;
      padding: 1rem;
      color: #616161;
    }

    .empty-goals p {
      margin: 0;
      font-size: 0.875rem;
    }

    .goals-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .goal-card {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1rem;
      border-left: 4px solid #e0e0e0;
      transition: box-shadow 0.2s;
    }

    .goal-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .goal-card.goal-status-not_started {
      border-left-color: #9e9e9e;
    }

    .goal-card.goal-status-in_progress {
      border-left-color: #f9a825;
    }

    .goal-card.goal-status-completed {
      border-left-color: #388e3c;
    }

    .goal-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .goal-description {
      font-size: 0.875rem;
      font-weight: 600;
      color: #212121;
    }

    .goal-status-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .goal-status-badge.badge-goal-not_started {
      background-color: #f5f5f5;
      color: #616161;
    }

    .goal-status-badge.badge-goal-in_progress {
      background-color: #fff8e1;
      color: #f57f17;
    }

    .goal-status-badge.badge-goal-completed {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .goal-card-body {
      margin-bottom: 0.75rem;
    }

    .goal-field {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0.25rem 0;
    }

    .field-label {
      font-size: 0.75rem;
      color: #616161;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      flex-shrink: 0;
    }

    .field-value {
      font-size: 0.875rem;
      color: #212121;
      text-align: right;
    }

    .notes-value {
      max-width: 200px;
      word-wrap: break-word;
    }

    .goal-card-actions {
      padding-top: 0.75rem;
      border-top: 1px solid #f0f0f0;
    }

    .completion-notes-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .update-status-button {
      padding: 0.375rem 0.875rem;
      background-color: transparent;
      color: #1976d2;
      border: 1px solid #1976d2;
      border-radius: 4px;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .update-status-button:hover {
      background-color: rgba(25, 118, 210, 0.04);
    }

    @media (max-width: 768px) {
      .prc-section-container {
        padding: 1rem;
      }

      .goal-card-actions {
        flex-direction: column;
      }
    }
  `]
})
export class PRCSectionComponent implements OnDestroy, OnChanges {
  @Input() technicianId: string = '';
  @Input() prc: PRC | null = null;
  @Output() prcChanged = new EventEmitter<void>();

  displayStatus: PRCRecordStatus = 'upcoming';
  isUpcoming = false;
  isOverdue = false;

  showAddGoalForm = false;
  goalDescription = '';
  goalTargetDate = '';
  validationError = '';
  errorMessage = '';
  isSubmitting = false;
  isCompletingPRC = false;

  completionNotesGoalId: string | null = null;
  completionNotes = '';

  private lastAction: (() => void) | null = null;
  private subscriptions: Subscription[] = [];

  constructor(private technicianService: TechnicianService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prc']) {
      this.computeDisplayStatus();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleAddGoalForm(): void {
    this.showAddGoalForm = true;
    this.resetGoalForm();
  }

  cancelAddGoalForm(): void {
    this.showAddGoalForm = false;
    this.resetGoalForm();
  }

  submitGoal(): void {
    this.validationError = '';
    this.errorMessage = '';

    if (!this.goalDescription.trim()) {
      this.validationError = 'Please enter a goal description.';
      return;
    }

    if (!this.goalTargetDate) {
      this.validationError = 'Please enter a target date.';
      return;
    }

    if (!this.prc) {
      return;
    }

    this.isSubmitting = true;
    this.lastAction = () => this.submitGoal();

    const goal: Omit<PRCGoal, 'id'> = {
      prcId: this.prc.id,
      description: this.goalDescription.trim(),
      targetDate: this.goalTargetDate,
      status: 'not_started',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const addSub = this.technicianService.addPRCGoal(this.technicianId, this.prc.id, goal).subscribe({
      next: () => {
        this.showAddGoalForm = false;
        this.resetGoalForm();
        this.isSubmitting = false;
        this.prcChanged.emit();
      },
      error: () => {
        this.errorMessage = 'Failed to add goal. Please try again.';
        this.isSubmitting = false;
      }
    });

    this.subscriptions.push(addSub);
  }

  updateGoalStatus(goal: PRCGoal): void {
    if (!this.prc) {
      return;
    }

    const nextStatus = this.getNextGoalStatus(goal.status);

    if (nextStatus === 'completed') {
      this.completionNotesGoalId = goal.id;
      this.completionNotes = '';
      return;
    }

    this.errorMessage = '';
    this.lastAction = () => this.updateGoalStatus(goal);

    const updateSub = this.technicianService.updatePRCGoal(
      this.technicianId,
      this.prc.id,
      goal.id,
      { status: nextStatus, updatedAt: new Date().toISOString() }
    ).subscribe({
      next: () => {
        this.prcChanged.emit();
      },
      error: () => {
        this.errorMessage = 'Failed to update goal status. Please try again.';
      }
    });

    this.subscriptions.push(updateSub);
  }

  confirmGoalComplete(goal: PRCGoal): void {
    if (!this.prc) {
      return;
    }

    this.errorMessage = '';
    this.lastAction = () => this.confirmGoalComplete(goal);

    const update: Partial<PRCGoal> = {
      status: 'completed',
      completionNotes: this.completionNotes.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    const updateSub = this.technicianService.updatePRCGoal(
      this.technicianId,
      this.prc.id,
      goal.id,
      update
    ).subscribe({
      next: () => {
        this.completionNotesGoalId = null;
        this.completionNotes = '';
        this.prcChanged.emit();
      },
      error: () => {
        this.errorMessage = 'Failed to complete goal. Please try again.';
      }
    });

    this.subscriptions.push(updateSub);
  }

  cancelCompletionNotes(): void {
    this.completionNotesGoalId = null;
    this.completionNotes = '';
  }

  markPRCComplete(): void {
    if (!this.prc) {
      return;
    }

    this.errorMessage = '';
    this.isCompletingPRC = true;
    this.lastAction = () => this.markPRCComplete();

    const completeSub = this.technicianService.completePRC(
      this.technicianId,
      this.prc.id,
      new Date()
    ).subscribe({
      next: () => {
        this.isCompletingPRC = false;
        this.prcChanged.emit();
      },
      error: () => {
        this.errorMessage = 'Failed to complete PRC. Please try again.';
        this.isCompletingPRC = false;
      }
    });

    this.subscriptions.push(completeSub);
  }

  retryLastAction(): void {
    this.errorMessage = '';
    if (this.lastAction) {
      this.lastAction();
    }
  }

  getStatusBadgeClass(status: PRCRecordStatus): string {
    switch (status) {
      case 'upcoming':
        return 'badge-status-upcoming';
      case 'overdue':
        return 'badge-status-overdue';
      case 'completed':
        return 'badge-status-completed';
      default:
        return '';
    }
  }

  formatStatus(status: PRCRecordStatus): string {
    switch (status) {
      case 'upcoming':
        return 'Upcoming';
      case 'overdue':
        return 'Overdue';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  }

  getGoalStatusClass(status: PRCGoalStatus): string {
    return `goal-status-${status}`;
  }

  getGoalStatusBadgeClass(status: PRCGoalStatus): string {
    return `badge-goal-${status}`;
  }

  formatGoalStatus(status: PRCGoalStatus): string {
    switch (status) {
      case 'not_started':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private computeDisplayStatus(): void {
    if (!this.prc) {
      this.displayStatus = 'upcoming';
      this.isUpcoming = false;
      this.isOverdue = false;
      return;
    }

    const dueDate = new Date(this.prc.dueDate);
    const completionDate = this.prc.completionDate ? new Date(this.prc.completionDate) : null;
    const now = new Date();

    this.displayStatus = computePRCStatus(dueDate, completionDate, now);

    // Upcoming indicator: due date within 14 days and not completed
    if (!completionDate) {
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      this.isUpcoming = daysUntilDue >= 0 && daysUntilDue <= 14;
      this.isOverdue = now > dueDate;
    } else {
      this.isUpcoming = false;
      this.isOverdue = false;
    }
  }

  private getNextGoalStatus(currentStatus: PRCGoalStatus): PRCGoalStatus {
    switch (currentStatus) {
      case 'not_started':
        return 'in_progress';
      case 'in_progress':
        return 'completed';
      default:
        return currentStatus;
    }
  }

  private resetGoalForm(): void {
    this.goalDescription = '';
    this.goalTargetDate = '';
    this.validationError = '';
  }
}
