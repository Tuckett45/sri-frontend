import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface TravelProfileDialogData {
  technicianId: string;
}

@Component({
  selector: 'app-travel-profile-dialog',
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="dialog-title-icon">person_pin</mat-icon>
      Travel Profile — {{ data.technicianId }}
    </h2>
    <mat-dialog-content>
      <app-technician-travel-profile [technicianId]="data.technicianId"></app-technician-travel-profile>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; }
    .dialog-title {
      display: flex;
      align-items: center;
      color: #1976d2;
      margin: 0;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
    }
    .dialog-title-icon {
      margin-right: 8px;
      color: #1976d2;
    }
    mat-dialog-content {
      min-width: 480px;
      max-height: 70vh;
      padding: 16px 24px;
    }
    ::ng-deep .travel-flag-card {
      border-left: 4px solid #1976d2;
    }
    ::ng-deep .travel-flag-card .travel-willing {
      color: #4caf50;
    }
    ::ng-deep .travel-flag-card .travel-not-willing {
      color: #9e9e9e;
    }
    ::ng-deep .travel-flag-card mat-slide-toggle.mat-mdc-slide-toggle .mdc-switch--selected .mdc-switch__handle::after {
      background-color: #1976d2;
    }
    ::ng-deep .travel-flag-card mat-slide-toggle.mat-mdc-slide-toggle .mdc-switch--selected .mdc-switch__track::after {
      background-color: rgba(25, 118, 210, 0.38);
    }
    mat-dialog-actions {
      padding: 8px 24px 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TravelProfileDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<TravelProfileDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TravelProfileDialogData
  ) {}
}
