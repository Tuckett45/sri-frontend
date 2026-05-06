import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-inventory-assignment-dialog',
  templateUrl: './inventory-assignment-dialog.component.html',
  styleUrls: ['./inventory-assignment-dialog.component.scss']
})
export class InventoryAssignmentDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  assignmentForm!: FormGroup;

  technicians: any[] = [];
  jobs: any[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InventoryAssignmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.assignmentForm = this.fb.group({
      technicianId: ['', Validators.required],
      jobId: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      notes: ['']
    });
  }

  onConfirm(): void {
    if (this.assignmentForm.valid) {
      this.dialogRef.close(this.assignmentForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
