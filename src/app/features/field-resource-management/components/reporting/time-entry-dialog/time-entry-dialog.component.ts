import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-time-entry-dialog',
  templateUrl: './time-entry-dialog.component.html',
  styleUrls: ['./time-entry-dialog.component.scss']
})
export class TimeEntryDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  jobs: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    public dialogRef: MatDialogRef<TimeEntryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      date: [new Date(), Validators.required],
      startTime: ['08:00', Validators.required],
      endTime: ['17:00', Validators.required],
      breakDuration: [30, [Validators.min(0)]],
      jobId: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get calculatedHours(): number {
    const start = this.form.get('startTime')?.value as string;
    const end = this.form.get('endTime')?.value as string;
    const breakMin = this.form.get('breakDuration')?.value as number || 0;
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const totalMin = (eh * 60 + em) - (sh * 60 + sm) - breakMin;
    return Math.max(0, Math.round(totalMin / 60 * 10) / 10);
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
