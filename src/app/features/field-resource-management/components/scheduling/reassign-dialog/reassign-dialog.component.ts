import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-reassign-dialog',
  templateUrl: './reassign-dialog.component.html',
  styleUrls: ['./reassign-dialog.component.scss']
})
export class ReassignDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  technicians: any[] = [];
  filteredTechnicians: any[] = [];
  searchTerm = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    public dialogRef: MatDialogRef<ReassignDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { assignment: any; currentTechnicianId: string }
  ) {
    this.form = this.fb.group({
      newTechnicianId: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.filteredTechnicians = this.technicians.filter(
      t => t.id !== this.data?.currentTechnicianId
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  filterTechnicians(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredTechnicians = this.technicians.filter(
      t => t.id !== this.data?.currentTechnicianId &&
        t.name.toLowerCase().includes(term)
    );
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
