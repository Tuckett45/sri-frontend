import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-assignment-dialog',
  templateUrl: './assignment-dialog.component.html',
  styleUrls: ['./assignment-dialog.component.scss']
})
export class AssignmentDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  technicians: any[] = [];
  jobs: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    public dialogRef: MatDialogRef<AssignmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { date?: Date; technicianId?: string }
  ) {
    this.form = this.fb.group({
      technicianId: [data?.technicianId || '', Validators.required],
      jobId: ['', Validators.required],
      startDate: [data?.date || new Date(), Validators.required],
      endDate: [data?.date || new Date(), Validators.required],
      startTime: ['08:00', Validators.required],
      endTime: ['17:00', Validators.required]
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
