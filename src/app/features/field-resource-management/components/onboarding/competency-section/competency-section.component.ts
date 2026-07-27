import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { TechnicianService } from '../../../services/technician.service';
import { TechnicalCompetency, ProficiencyLevel, PREDEFINED_COMPETENCIES } from '../../../models/competency.model';

@Component({
  selector: 'app-competency-section',
  template: `
    <div class="competency-section-container">
      <div class="competency-section-header">
        <h3 class="competency-section-title">Technical Competencies</h3>
        <button
          class="add-competency-button"
          (click)="toggleAddForm()"
          *ngIf="!showAddForm"
        >
          Add Competency
        </button>
      </div>

      <div *ngIf="errorMessage" class="error-state">
        <p class="error-message">{{ errorMessage }}</p>
        <button class="retry-button" (click)="retryLastAction()">Retry</button>
      </div>

      <div *ngIf="showAddForm" class="add-form">
        <h4 class="form-title">Add New Competency</h4>
        <div class="form-group">
          <label class="form-label" for="competencyName">Competency Name</label>
          <select
            id="competencyName"
            class="form-select"
            [(ngModel)]="selectedCompetency"
            (ngModelChange)="onCompetencySelectionChange()"
          >
            <option value="" disabled>Select competency</option>
            <option *ngFor="let name of predefinedCompetencies" [value]="name">{{ name }}</option>
            <option value="custom">Custom...</option>
          </select>
        </div>
        <div class="form-group" *ngIf="selectedCompetency === 'custom'">
          <label class="form-label" for="customCompetencyName">Custom Competency Name</label>
          <input
            id="customCompetencyName"
            type="text"
            class="form-input"
            [(ngModel)]="customCompetencyName"
            placeholder="Enter custom competency name"
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="verificationDate">Verification Date</label>
          <input
            id="verificationDate"
            type="date"
            class="form-input"
            [(ngModel)]="verificationDate"
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="verifiedBy">Verified By</label>
          <input
            id="verifiedBy"
            type="text"
            class="form-input"
            [(ngModel)]="verifiedBy"
            placeholder="Enter verifier name"
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="proficiencyLevel">Proficiency Level</label>
          <select
            id="proficiencyLevel"
            class="form-select"
            [(ngModel)]="proficiencyLevel"
          >
            <option value="" disabled>Select proficiency level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="notes">Notes (optional)</label>
          <textarea
            id="notes"
            class="form-textarea"
            [(ngModel)]="notes"
            placeholder="Enter any additional notes"
            rows="3"
          ></textarea>
        </div>
        <div *ngIf="validationError" class="validation-error">
          {{ validationError }}
        </div>
        <div class="form-actions">
          <button
            class="submit-button"
            (click)="submitCompetency()"
            [disabled]="isSubmitting"
          >
            {{ isSubmitting ? 'Adding...' : 'Add' }}
          </button>
          <button class="cancel-button" (click)="cancelAddForm()">Cancel</button>
        </div>
      </div>

      <div *ngIf="sortedCompetencies.length === 0 && !showAddForm" class="empty-state">
        <p>No competencies recorded</p>
      </div>

      <div *ngIf="sortedCompetencies.length > 0" class="competency-list">
        <div
          *ngFor="let competency of sortedCompetencies"
          class="competency-card"
          [ngClass]="getProficiencyClass(competency.proficiencyLevel)"
        >
          <div class="competency-card-header">
            <span class="competency-name">{{ competency.competencyName }}</span>
            <span class="proficiency-badge" [ngClass]="getProficiencyBadgeClass(competency.proficiencyLevel)">
              {{ formatProficiencyLevel(competency.proficiencyLevel) }}
            </span>
          </div>
          <div class="competency-card-body">
            <div class="competency-field">
              <span class="field-label">Verified</span>
              <span class="field-value">{{ formatDate(competency.verificationDate) }}</span>
            </div>
            <div class="competency-field">
              <span class="field-label">Verified By</span>
              <span class="field-value">{{ competency.verifiedBy }}</span>
            </div>
            <div class="competency-field" *ngIf="competency.notes">
              <span class="field-label">Notes</span>
              <span class="field-value notes-value">{{ competency.notes }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .competency-section-container {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .competency-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .competency-section-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #212121;
    }

    .add-competency-button {
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

    .add-competency-button:hover {
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

    .form-select,
    .form-input,
    .form-textarea {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #bdbdbd;
      border-radius: 4px;
      font-size: 0.875rem;
      color: #212121;
      background-color: #ffffff;
      box-sizing: border-box;
      font-family: inherit;
    }

    .form-textarea {
      resize: vertical;
      min-height: 60px;
    }

    .form-select:focus,
    .form-input:focus,
    .form-textarea:focus {
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

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      color: #616161;
    }

    .empty-state p {
      margin: 0;
    }

    .competency-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .competency-card {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1rem;
      border-left: 4px solid #e0e0e0;
      transition: box-shadow 0.2s;
    }

    .competency-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .competency-card.proficiency-expert {
      border-left-color: #7b1fa2;
    }

    .competency-card.proficiency-advanced {
      border-left-color: #1976d2;
    }

    .competency-card.proficiency-intermediate {
      border-left-color: #388e3c;
    }

    .competency-card.proficiency-beginner {
      border-left-color: #9e9e9e;
    }

    .competency-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .competency-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #212121;
    }

    .proficiency-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .proficiency-badge.badge-expert {
      background-color: #f3e5f5;
      color: #6a1b9a;
    }

    .proficiency-badge.badge-advanced {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .proficiency-badge.badge-intermediate {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .proficiency-badge.badge-beginner {
      background-color: #f5f5f5;
      color: #616161;
    }

    .competency-card-body {
      margin-bottom: 0;
    }

    .competency-field {
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
      max-width: 180px;
      word-wrap: break-word;
    }

    @media (max-width: 768px) {
      .competency-section-container {
        padding: 1rem;
      }

      .competency-list {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CompetencySectionComponent implements OnDestroy {
  @Input() technicianId: string = '';
  @Input() set competencies(value: TechnicalCompetency[]) {
    this._competencies = value || [];
    this.sortedCompetencies = this.sortByProficiency(this._competencies);
  }
  get competencies(): TechnicalCompetency[] {
    return this._competencies;
  }
  @Output() competencyChanged = new EventEmitter<void>();

  sortedCompetencies: TechnicalCompetency[] = [];
  predefinedCompetencies = PREDEFINED_COMPETENCIES;

  showAddForm = false;
  selectedCompetency = '';
  customCompetencyName = '';
  verificationDate = '';
  verifiedBy = '';
  proficiencyLevel: ProficiencyLevel | '' = '';
  notes = '';
  validationError = '';
  errorMessage = '';
  isSubmitting = false;

  private _competencies: TechnicalCompetency[] = [];
  private lastAction: (() => void) | null = null;
  private subscriptions: Subscription[] = [];

  constructor(private technicianService: TechnicianService) {}

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleAddForm(): void {
    this.showAddForm = true;
    this.resetForm();
  }

  cancelAddForm(): void {
    this.showAddForm = false;
    this.resetForm();
  }

  onCompetencySelectionChange(): void {
    if (this.selectedCompetency !== 'custom') {
      this.customCompetencyName = '';
    }
  }

  submitCompetency(): void {
    this.validationError = '';
    this.errorMessage = '';

    const competencyName = this.selectedCompetency === 'custom'
      ? this.customCompetencyName.trim()
      : this.selectedCompetency;

    if (!competencyName) {
      this.validationError = 'Please select or enter a competency name.';
      return;
    }

    if (!this.verificationDate) {
      this.validationError = 'Please enter a verification date.';
      return;
    }

    if (!this.verifiedBy.trim()) {
      this.validationError = 'Please enter who verified this competency.';
      return;
    }

    if (!this.proficiencyLevel) {
      this.validationError = 'Please select a proficiency level.';
      return;
    }

    this.isSubmitting = true;
    this.lastAction = () => this.submitCompetency();

    const competency: Omit<TechnicalCompetency, 'id'> = {
      technicianId: this.technicianId,
      competencyName,
      verificationDate: this.verificationDate,
      verifiedBy: this.verifiedBy.trim(),
      proficiencyLevel: this.proficiencyLevel as ProficiencyLevel,
      notes: this.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const addSub = this.technicianService.addTechnicianCompetency(this.technicianId, competency).subscribe({
      next: () => {
        this.showAddForm = false;
        this.resetForm();
        this.isSubmitting = false;
        this.competencyChanged.emit();
      },
      error: () => {
        this.errorMessage = 'Failed to add competency. Please try again.';
        this.isSubmitting = false;
      }
    });

    this.subscriptions.push(addSub);
  }

  retryLastAction(): void {
    this.errorMessage = '';
    if (this.lastAction) {
      this.lastAction();
    }
  }

  getProficiencyClass(level: ProficiencyLevel): string {
    switch (level) {
      case 'expert':
        return 'proficiency-expert';
      case 'advanced':
        return 'proficiency-advanced';
      case 'intermediate':
        return 'proficiency-intermediate';
      case 'beginner':
        return 'proficiency-beginner';
      default:
        return '';
    }
  }

  getProficiencyBadgeClass(level: ProficiencyLevel): string {
    switch (level) {
      case 'expert':
        return 'badge-expert';
      case 'advanced':
        return 'badge-advanced';
      case 'intermediate':
        return 'badge-intermediate';
      case 'beginner':
        return 'badge-beginner';
      default:
        return '';
    }
  }

  formatProficiencyLevel(level: ProficiencyLevel): string {
    return level.charAt(0).toUpperCase() + level.slice(1);
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private sortByProficiency(competencies: TechnicalCompetency[]): TechnicalCompetency[] {
    const order: Record<ProficiencyLevel, number> = {
      expert: 0,
      advanced: 1,
      intermediate: 2,
      beginner: 3
    };

    return [...competencies].sort((a, b) => {
      return (order[a.proficiencyLevel] ?? 4) - (order[b.proficiencyLevel] ?? 4);
    });
  }

  private resetForm(): void {
    this.selectedCompetency = '';
    this.customCompetencyName = '';
    this.verificationDate = '';
    this.verifiedBy = '';
    this.proficiencyLevel = '';
    this.notes = '';
    this.validationError = '';
  }
}
