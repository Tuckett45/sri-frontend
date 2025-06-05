import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CoordinatorStat } from 'src/app/services/osp-coordinator.service';

@Component({
  selector: 'app-osp-coordinator-modal',
  templateUrl: './osp-coordinator-modal.component.html',
  styleUrls: ['./osp-coordinator-modal.component.scss']
})
export class OspCoordinatorModalComponent {
  statForm: FormGroup;
  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<OspCoordinatorModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CoordinatorStat | null
  ) {
    this.statForm = this.fb.group({
      id: [data?.id],
      description: [data?.description || '', Validators.required],
      value: [data?.value ?? 0, [Validators.required, Validators.min(0)]]
    });
  }

  save(): void {
    if (this.statForm.valid) {
      this.dialogRef.close(this.statForm.value);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
