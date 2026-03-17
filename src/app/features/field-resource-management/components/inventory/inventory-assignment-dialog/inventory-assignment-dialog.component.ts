import { Component, Inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  InventoryItem,
  InventoryLocationHistory,
  LocationType,
  InventoryStatus
} from '../../../models/inventory.model';
import * as InventoryActions from '../../../state/inventory/inventory.actions';
import { selectLocationHistory } from '../../../state/inventory/inventory.selectors';
import { InventoryService } from '../../../services/inventory.service';

export interface InventoryAssignmentDialogData {
  item: InventoryItem;
}

@Component({
  selector: 'app-inventory-assignment-dialog',
  templateUrl: './inventory-assignment-dialog.component.html',
  styleUrls: ['./inventory-assignment-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryAssignmentDialogComponent implements OnInit, OnDestroy {
  assignmentForm: FormGroup;
  locationHistory$!: Observable<InventoryLocationHistory[]>;
  isAvailable = true;
  checkingAvailability = false;

  readonly locationTypes = [
    { value: LocationType.Job, label: 'Job', icon: 'work' },
    { value: LocationType.Technician, label: 'Technician', icon: 'person' },
    { value: LocationType.Vendor, label: 'Vendor', icon: 'store' },
    { value: LocationType.Warehouse, label: 'Warehouse', icon: 'warehouse' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<InventoryAssignmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InventoryAssignmentDialogData,
    private fb: FormBuilder,
    private store: Store,
    private inventoryService: InventoryService
  ) {
    this.assignmentForm = this.fb.group({
      locationType: ['', Validators.required],
      locationId: ['', Validators.required],
      reason: ['']
    });
  }

  ngOnInit(): void {
    // Load location history
    this.store.dispatch(InventoryActions.loadLocationHistory({ itemId: this.data.item.id }));
    this.locationHistory$ = this.store.select(selectLocationHistory(this.data.item.id));

    // Check availability
    this.checkingAvailability = true;
    this.inventoryService.checkAvailability(this.data.item.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (available) => {
        this.isAvailable = available;
        this.checkingAvailability = false;
      },
      error: () => {
        this.isAvailable = false;
        this.checkingAvailability = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get locationTypeControl() {
    return this.assignmentForm.get('locationType');
  }

  get locationIdControl() {
    return this.assignmentForm.get('locationId');
  }

  get canAssign(): boolean {
    return this.isAvailable &&
           this.data.item.status !== InventoryStatus.Retired &&
           this.data.item.status !== InventoryStatus.Maintenance;
  }

  getLocationIcon(type: string): string {
    const found = this.locationTypes.find(lt => lt.value === type);
    return found ? found.icon : 'place';
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  submit(): void {
    if (this.assignmentForm.valid && this.canAssign) {
      this.dialogRef.close(this.assignmentForm.value);
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
