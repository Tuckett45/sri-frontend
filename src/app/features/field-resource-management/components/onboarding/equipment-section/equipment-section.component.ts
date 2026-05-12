import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { TechnicianService } from '../../../services/technician.service';
import { EquipmentAssignment, EquipmentAssetType, EquipmentStatus } from '../../../models/equipment.model';

@Component({
  selector: 'app-equipment-section',
  template: `
    <div class="equipment-section-container">
      <div class="equipment-section-header">
        <h3 class="equipment-section-title">Equipment</h3>
        <button
          class="assign-equipment-button"
          (click)="toggleAssignForm()"
          *ngIf="!showAssignForm"
        >
          Assign Equipment
        </button>
      </div>

      <div *ngIf="errorMessage" class="error-state">
        <p class="error-message">{{ errorMessage }}</p>
        <button class="retry-button" (click)="retryLastAction()">Retry</button>
      </div>

      <div *ngIf="showAssignForm" class="assign-form">
        <h4 class="form-title">Assign New Equipment</h4>
        <div class="form-group">
          <label class="form-label" for="assetType">Asset Type</label>
          <select
            id="assetType"
            class="form-select"
            [(ngModel)]="assetType"
          >
            <option value="" disabled>Select asset type</option>
            <option value="badge">Badge</option>
            <option value="laptop">Laptop</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="assetIdentifier">Asset Identifier</label>
          <input
            id="assetIdentifier"
            type="text"
            class="form-input"
            [(ngModel)]="assetIdentifier"
            placeholder="Enter asset identifier"
          />
        </div>
        <div *ngIf="validationError" class="validation-error">
          {{ validationError }}
        </div>
        <div class="form-actions">
          <button
            class="submit-button"
            (click)="submitAssignment()"
            [disabled]="isSubmitting"
          >
            {{ isSubmitting ? 'Assigning...' : 'Assign' }}
          </button>
          <button class="cancel-button" (click)="cancelAssignForm()">Cancel</button>
        </div>
      </div>

      <div *ngIf="equipmentAssignments.length === 0 && !showAssignForm" class="empty-state">
        <p>No equipment assigned</p>
      </div>

      <div *ngIf="equipmentAssignments.length > 0" class="equipment-list">
        <div
          *ngFor="let assignment of equipmentAssignments"
          class="equipment-card"
          [ngClass]="getStatusClass(assignment.status)"
        >
          <div class="equipment-card-header">
            <span class="asset-type-badge">{{ formatAssetType(assignment.assetType) }}</span>
            <span class="status-badge" [ngClass]="getStatusBadgeClass(assignment.status)">
              {{ assignment.status }}
            </span>
          </div>
          <div class="equipment-card-body">
            <div class="equipment-field">
              <span class="field-label">Asset ID</span>
              <span class="field-value">{{ assignment.assetIdentifier }}</span>
            </div>
            <div class="equipment-field">
              <span class="field-label">Assigned</span>
              <span class="field-value">{{ formatDate(assignment.assignmentDate) }}</span>
            </div>
            <div class="equipment-field" *ngIf="assignment.returnDate">
              <span class="field-label">Returned</span>
              <span class="field-value">{{ formatDate(assignment.returnDate) }}</span>
            </div>
          </div>
          <div class="equipment-card-actions" *ngIf="assignment.status === 'assigned'">
            <button class="return-button" (click)="markAsReturned(assignment)">Mark as Returned</button>
            <button class="lost-button" (click)="markAsLost(assignment)">Mark as Lost</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .equipment-section-container {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .equipment-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .equipment-section-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #212121;
    }

    .assign-equipment-button {
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

    .assign-equipment-button:hover {
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

    .assign-form {
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

    .form-select:focus,
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

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      color: #616161;
    }

    .empty-state p {
      margin: 0;
    }

    .equipment-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .equipment-card {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1rem;
      border-left: 4px solid #e0e0e0;
      transition: box-shadow 0.2s;
    }

    .equipment-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .equipment-card.status-assigned {
      border-left-color: #4caf50;
    }

    .equipment-card.status-returned {
      border-left-color: #9e9e9e;
    }

    .equipment-card.status-lost {
      border-left-color: #f44336;
    }

    .equipment-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .asset-type-badge {
      font-size: 0.875rem;
      font-weight: 600;
      color: #212121;
      text-transform: capitalize;
    }

    .status-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .status-badge.badge-assigned {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .status-badge.badge-returned {
      background-color: #f5f5f5;
      color: #616161;
    }

    .status-badge.badge-lost {
      background-color: #ffebee;
      color: #c62828;
    }

    .equipment-card-body {
      margin-bottom: 0.75rem;
    }

    .equipment-field {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.25rem 0;
    }

    .field-label {
      font-size: 0.75rem;
      color: #616161;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .field-value {
      font-size: 0.875rem;
      color: #212121;
    }

    .equipment-card-actions {
      display: flex;
      gap: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f0f0f0;
    }

    .return-button {
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

    .return-button:hover {
      background-color: rgba(25, 118, 210, 0.04);
    }

    .lost-button {
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

    .lost-button:hover {
      background-color: rgba(211, 47, 47, 0.04);
    }

    @media (max-width: 768px) {
      .equipment-section-container {
        padding: 1rem;
      }

      .equipment-list {
        grid-template-columns: 1fr;
      }

      .equipment-card-actions {
        flex-direction: column;
      }
    }
  `]
})
export class EquipmentSectionComponent implements OnDestroy {
  @Input() technicianId: string = '';
  @Input() equipmentAssignments: EquipmentAssignment[] = [];
  @Output() equipmentChanged = new EventEmitter<void>();

  showAssignForm = false;
  assetType: EquipmentAssetType | '' = '';
  assetIdentifier = '';
  validationError = '';
  errorMessage = '';
  isSubmitting = false;

  private lastAction: (() => void) | null = null;
  private subscriptions: Subscription[] = [];

  constructor(private technicianService: TechnicianService) {}

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleAssignForm(): void {
    this.showAssignForm = true;
    this.resetForm();
  }

  cancelAssignForm(): void {
    this.showAssignForm = false;
    this.resetForm();
  }

  submitAssignment(): void {
    this.validationError = '';
    this.errorMessage = '';

    if (!this.assetType) {
      this.validationError = 'Please select an asset type.';
      return;
    }

    if (!this.assetIdentifier.trim()) {
      this.validationError = 'Please enter an asset identifier.';
      return;
    }

    this.isSubmitting = true;
    this.lastAction = () => this.submitAssignment();

    const validateSub = this.technicianService.validateAssetUniqueness(
      this.assetIdentifier.trim(),
      this.technicianId
    ).subscribe({
      next: (isUnique) => {
        if (!isUnique) {
          this.validationError = 'This asset is currently assigned to another technician.';
          this.isSubmitting = false;
        } else {
          this.performAssignment();
        }
      },
      error: () => {
        this.errorMessage = 'Failed to validate asset uniqueness. Please try again.';
        this.isSubmitting = false;
      }
    });

    this.subscriptions.push(validateSub);
  }

  markAsReturned(assignment: EquipmentAssignment): void {
    this.errorMessage = '';
    this.lastAction = () => this.markAsReturned(assignment);

    const today = new Date().toISOString().split('T')[0];
    const updateSub = this.technicianService.updateEquipmentAssignment(
      this.technicianId,
      assignment.id,
      { status: 'returned', returnDate: today }
    ).subscribe({
      next: () => {
        this.equipmentChanged.emit();
      },
      error: () => {
        this.errorMessage = 'Failed to update equipment status. Please try again.';
      }
    });

    this.subscriptions.push(updateSub);
  }

  markAsLost(assignment: EquipmentAssignment): void {
    this.errorMessage = '';
    this.lastAction = () => this.markAsLost(assignment);

    const updateSub = this.technicianService.updateEquipmentAssignment(
      this.technicianId,
      assignment.id,
      { status: 'lost' }
    ).subscribe({
      next: () => {
        this.equipmentChanged.emit();
      },
      error: () => {
        this.errorMessage = 'Failed to update equipment status. Please try again.';
      }
    });

    this.subscriptions.push(updateSub);
  }

  retryLastAction(): void {
    this.errorMessage = '';
    if (this.lastAction) {
      this.lastAction();
    }
  }

  getStatusClass(status: EquipmentStatus): string {
    switch (status) {
      case 'assigned':
        return 'status-assigned';
      case 'returned':
        return 'status-returned';
      case 'lost':
        return 'status-lost';
      default:
        return '';
    }
  }

  getStatusBadgeClass(status: EquipmentStatus): string {
    switch (status) {
      case 'assigned':
        return 'badge-assigned';
      case 'returned':
        return 'badge-returned';
      case 'lost':
        return 'badge-lost';
      default:
        return '';
    }
  }

  formatAssetType(type: EquipmentAssetType): string {
    switch (type) {
      case 'badge':
        return 'Badge';
      case 'laptop':
        return 'Laptop';
      case 'other':
        return 'Other';
      default:
        return type;
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

  private performAssignment(): void {
    const equipment: Omit<EquipmentAssignment, 'id'> = {
      technicianId: this.technicianId,
      assetType: this.assetType as EquipmentAssetType,
      assetIdentifier: this.assetIdentifier.trim(),
      assignmentDate: new Date().toISOString().split('T')[0],
      status: 'assigned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const assignSub = this.technicianService.assignEquipment(this.technicianId, equipment).subscribe({
      next: () => {
        this.showAssignForm = false;
        this.resetForm();
        this.isSubmitting = false;
        this.equipmentChanged.emit();
      },
      error: () => {
        this.errorMessage = 'Failed to assign equipment. Please try again.';
        this.isSubmitting = false;
      }
    });

    this.subscriptions.push(assignSub);
  }

  private resetForm(): void {
    this.assetType = '';
    this.assetIdentifier = '';
    this.validationError = '';
  }
}
