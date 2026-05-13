import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TechnicianService } from '../../../services/technician.service';
import { EquipmentAssignment, EquipmentAssetType, EquipmentStatus } from '../../../models/equipment.model';
import { EquipmentEditModalComponent, EquipmentEditModalData } from '../equipment-edit-modal/equipment-edit-modal.component';
import { ConfirmDeleteModalComponent, ConfirmDeleteModalData } from '../confirm-delete-modal/confirm-delete-modal.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-equipment-section',
  template: `
    <div class="equipment-section-container">
      <div class="equipment-section-header">
        <h3 class="equipment-section-title">Equipment</h3>
        <button
          class="assign-equipment-button"
          (click)="openAddModal()"
        >
          Assign Equipment
        </button>
      </div>

      <div *ngIf="errorMessage" class="error-state">
        <p class="error-message">{{ errorMessage }}</p>
        <button class="retry-button" (click)="retryLastAction()">Retry</button>
      </div>

      <div *ngIf="equipmentAssignments.length === 0" class="empty-state">
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
            <div class="equipment-field" *ngIf="assignment.notes">
              <span class="field-label">Notes</span>
              <span class="field-value">{{ assignment.notes }}</span>
            </div>
          </div>
          <div class="equipment-card-actions">
            <button class="edit-button" (click)="openEditModal(assignment)">Edit</button>
            <button class="delete-button" (click)="deleteEquipment(assignment)">Delete</button>
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
      .equipment-section-container {
        padding: 1rem;
      }

      .equipment-list {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EquipmentSectionComponent implements OnDestroy {
  @Input() technicianId: string = '';
  @Input() equipmentAssignments: EquipmentAssignment[] = [];
  @Output() equipmentChanged = new EventEmitter<void>();

  errorMessage = '';

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
    const dialogData: EquipmentEditModalData = {
      mode: 'add',
      technicianId: this.technicianId
    };

    const dialogRef = this.dialog.open(EquipmentEditModalComponent, {
      width: '480px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performAssignment(result);
      }
    });
  }

  openEditModal(assignment: EquipmentAssignment): void {
    const dialogData: EquipmentEditModalData = {
      mode: 'edit',
      technicianId: this.technicianId,
      equipment: assignment
    };

    const dialogRef = this.dialog.open(EquipmentEditModalComponent, {
      width: '480px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performUpdate(assignment.id, result);
      }
    });
  }

  retryLastAction(): void {
    this.errorMessage = '';
    if (this.lastAction) {
      this.lastAction();
    }
  }

  deleteEquipment(assignment: EquipmentAssignment): void {
    const dialogData: ConfirmDeleteModalData = {
      title: 'Delete Equipment',
      message: 'Are you sure you want to delete this equipment assignment?',
      itemName: `${this.formatAssetType(assignment.assetType)} — ${assignment.assetIdentifier}`
    };

    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '420px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.errorMessage = '';
        this.technicianService.deleteEquipmentAssignment(this.technicianId, assignment.id).subscribe({
          next: () => {
            this.toastr.success('Equipment deleted successfully', 'Deleted');
            this.equipmentChanged.emit();
          },
          error: () => {
            this.toastr.error('Failed to delete equipment. Please try again.', 'Error');
          }
        });
      }
    });
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

  private performAssignment(formData: any): void {
    this.errorMessage = '';
    this.lastAction = () => this.performAssignment(formData);

    const equipment: Omit<EquipmentAssignment, 'id'> = {
      technicianId: this.technicianId,
      assetType: formData.assetType,
      assetIdentifier: formData.assetIdentifier,
      assignmentDate: new Date().toISOString().split('T')[0],
      status: 'assigned',
      notes: formData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const assignSub = this.technicianService.assignEquipment(this.technicianId, equipment).subscribe({
      next: () => {
        this.equipmentChanged.emit();
      },
      error: () => {
        this.errorMessage = 'Failed to assign equipment. Please try again.';
      }
    });

    this.subscriptions.push(assignSub);
  }

  private performUpdate(equipmentId: string, formData: any): void {
    this.errorMessage = '';
    this.lastAction = () => this.performUpdate(equipmentId, formData);

    const update: Partial<EquipmentAssignment> = {
      assetType: formData.assetType,
      assetIdentifier: formData.assetIdentifier,
      status: formData.status,
      notes: formData.notes,
      updatedAt: new Date().toISOString()
    };

    if (formData.returnDate) {
      update.returnDate = formData.returnDate;
    }

    const updateSub = this.technicianService.updateEquipmentAssignment(
      this.technicianId,
      equipmentId,
      update
    ).subscribe({
      next: () => {
        this.equipmentChanged.emit();
      },
      error: () => {
        this.errorMessage = 'Failed to update equipment. Please try again.';
      }
    });

    this.subscriptions.push(updateSub);
  }
}
