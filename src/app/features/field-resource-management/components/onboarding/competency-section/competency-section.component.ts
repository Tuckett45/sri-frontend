import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TechnicianService } from '../../../services/technician.service';
import { TechnicalCompetency, ProficiencyLevel, PREDEFINED_COMPETENCIES } from '../../../models/competency.model';
import { CompetencyEditModalComponent, CompetencyEditModalData } from '../competency-edit-modal/competency-edit-modal.component';
import { ConfirmDeleteModalComponent, ConfirmDeleteModalData } from '../confirm-delete-modal/confirm-delete-modal.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-competency-section',
  template: `
    <div class="competency-section-container">
      <div class="competency-section-header">
        <h3 class="competency-section-title">Technical Competencies</h3>
        <button
          class="add-competency-button"
          (click)="openAddModal()"
        >
          Add Competency
        </button>
      </div>

      <div *ngIf="errorMessage" class="error-state">
        <p class="error-message">{{ errorMessage }}</p>
        <button class="retry-button" (click)="retryLastAction()">Retry</button>
      </div>

      <div *ngIf="sortedCompetencies.length === 0" class="empty-state">
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
          <div class="competency-card-actions">
            <button class="edit-button" (click)="openEditModal(competency)">Edit</button>
            <button class="delete-button" (click)="deleteCompetency(competency)">Delete</button>
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
      margin-bottom: 0.75rem;
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

    .competency-card-actions {
      display: flex;
      gap: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f0f0f0;
    }

    .edit-button {
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

    .edit-button:hover {
      background-color: rgba(25, 118, 210, 0.04);
    }

    .delete-button {
      padding: 0.375rem 0.875rem;
      background-color: transparent;
      color: #d32f2f;
      border: 1px solid #d32f2f;
      border-radius: 4px;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .delete-button:hover {
      background-color: rgba(211, 47, 47, 0.04);
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
  errorMessage = '';

  private _competencies: TechnicalCompetency[] = [];
  private lastAction: (() => void) | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private technicianService: TechnicianService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  openAddModal(): void {
    const dialogData: CompetencyEditModalData = {
      mode: 'add',
      technicianId: this.technicianId
    };

    const dialogRef = this.dialog.open(CompetencyEditModalComponent, {
      width: '480px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performAdd(result);
      }
    });
  }

  openEditModal(competency: TechnicalCompetency): void {
    const dialogData: CompetencyEditModalData = {
      mode: 'edit',
      technicianId: this.technicianId,
      competency
    };

    const dialogRef = this.dialog.open(CompetencyEditModalComponent, {
      width: '480px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performUpdate(competency.id, result);
      }
    });
  }

  retryLastAction(): void {
    this.errorMessage = '';
    if (this.lastAction) {
      this.lastAction();
    }
  }

  deleteCompetency(competency: TechnicalCompetency): void {
    const dialogData: ConfirmDeleteModalData = {
      title: 'Delete Competency',
      message: 'Are you sure you want to delete this competency?',
      itemName: competency.competencyName
    };

    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '420px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.errorMessage = '';
        this.technicianService.deleteTechnicianCompetency(this.technicianId, competency.id).subscribe({
          next: () => {
            this.toastr.success('Competency deleted successfully', 'Deleted');
            this.competencyChanged.emit();
          },
          error: () => {
            this.toastr.error('Failed to delete competency. Please try again.', 'Error');
          }
        });
      }
    });
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

  private performAdd(formData: any): void {
    this.errorMessage = '';
    this.lastAction = () => this.performAdd(formData);

    const competency: Omit<TechnicalCompetency, 'id'> = {
      technicianId: this.technicianId,
      competencyName: formData.competencyName,
      verificationDate: formData.verificationDate,
      verifiedBy: formData.verifiedBy,
      proficiencyLevel: formData.proficiencyLevel,
      notes: formData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const addSub = this.technicianService.addTechnicianCompetency(this.technicianId, competency).subscribe({
      next: () => {
        this.competencyChanged.emit();
      },
      error: () => {
        this.errorMessage = 'Failed to add competency. Please try again.';
      }
    });

    this.subscriptions.push(addSub);
  }

  private performUpdate(competencyId: string, formData: any): void {
    this.errorMessage = '';
    this.lastAction = () => this.performUpdate(competencyId, formData);

    const update: Partial<TechnicalCompetency> = {
      competencyName: formData.competencyName,
      verificationDate: formData.verificationDate,
      verifiedBy: formData.verifiedBy,
      proficiencyLevel: formData.proficiencyLevel,
      notes: formData.notes,
      updatedAt: new Date().toISOString()
    };

    const updateSub = this.technicianService.updateTechnicianCompetency(
      this.technicianId,
      competencyId,
      update
    ).subscribe({
      next: () => {
        this.competencyChanged.emit();
      },
      error: () => {
        this.errorMessage = 'Failed to update competency. Please try again.';
      }
    });

    this.subscriptions.push(updateSub);
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
}
