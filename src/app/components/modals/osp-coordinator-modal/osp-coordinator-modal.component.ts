import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { OspCoordinatorItem } from 'src/app/models/osp-coordinator-item.model';

@Component({
  selector: 'app-osp-coordinator-modal',
  templateUrl: './osp-coordinator-modal.component.html',
  styleUrls: ['./osp-coordinator-modal.component.scss']
})
export class OspCoordinatorModalComponent {
  statForm: FormGroup;
  vendors: string[] = ['Congruex (SCI)', 'Ervin (ECC)', 'Blue Edge (BE)', 'North Star', 'MasTec', 'Bcomm'];
  amendmentVersions: number[] = [0,1,2,3,4,5];
  amendmentReasons: string[] = ['Scope Add','Scope Delete','Change Order','Other'];
  adminAuditOptions: number[] = [0,1,2,3,4,5];
  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<OspCoordinatorModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: OspCoordinatorItem | null
  ) {
    this.statForm = this.fb.group({
      id: [data?.id],
      segmentId: [data?.segmentId || '', Validators.required],
      vendor: [data?.vendor || '', Validators.required],
      crew: [data?.crew || ''],
      materialOrder: [data?.materialOrder || ''],
      date: [data?.date || ''],
      workPackageCreated: [data?.workPackageCreated || ''],
      amount: [data?.amount],
      workPackageAmount: [data?.workPackageAmount],
      originalContinuingCost: [data?.originalContinuingCost],
      highCostAnalysis: [data?.highCostAnalysis || ''],
      ntp: [data?.ntp || ''],
      asbuiltSubmitted: [data?.asbuiltSubmitted || ''],
      coordinatorCloseout: [data?.coordinatorCloseout || ''],
      amendmentVersion: [data?.amendmentVersion],
      amendmentAmount: [data?.amendmentAmount],
      continuingAmount: [data?.continuingAmount],
      amendmentReason: [data?.amendmentReason || ''],
      adminAudit: [data?.adminAudit],
      adminAuditDate: [data?.adminAuditDate || ''],
      pass: [data?.pass ?? true],
      passFailReason: [data?.passFailReason || '']
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
