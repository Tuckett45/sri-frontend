import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { v4 as uuidv4 } from 'uuid';
import { OspCoordinatorItem } from 'src/app/models/osp-coordinator-item.model';
import { OspCoordinatorService } from 'src/app/services/osp-coordinator.service';

@Component({
  selector: 'app-osp-coordinator-modal',
  templateUrl: './osp-coordinator-modal.component.html',
  styleUrls: ['./osp-coordinator-modal.component.scss']
})
export class OspCoordinatorModalComponent {
  statForm: FormGroup;
  vendors: string[] = ['Congruex (SCI)', 'Ervin (ECC)', 'Blue Edge (BE)', 'North Star', 'MasTec', 'Bcomm'];
  amendmentVersions: number[] = [1,2,3,4,5,6,7,8,9,10];
  amendmentReasons: string[] = ['Version Error','Final True Up to Conlog','Engineered Units differ from Field','City Change Request/Need', 'Date Change', 'PO Change', 'Other'];
  failedReasons: string[] = [
    'No Splicing Schematic',
    'No Fiber Design',
    'No City Permits',
    'No Engineering Units',
    'No RFC ENG Delivery Comment in Bug',
    'No Trench Photos',
    'No Placing As Builts',
    'No Construction BOM',
    'No Permits',
    'No PRG COA',
    'No Inspection Gig List',
    'No Substancial Certificate of Completion',
    'No QC Photos',
    'No Splicing/Test Accept Doc',
    'No Inspection 2 Gig List',
    'No Lien Release',
    'No Placing Asbuilts',
    'No Splicing Asbuilts',
    'No OTDR Results',
    'No City Permits Closure',
    'No FINAL BOM',
    'No  Invoice Tally Sheet',
    'ConLog does not Match Invcoicing/No Var.',
    'WP Dates do not Match Conlog and SLCW.  EXECUTED WP PO Value do not match',
    'No Final Certificate of Completion'
    ]
  adminAuditOptions: number[] = [1,2,3,4,5,6,7,8,9,10];
  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private ospService: OspCoordinatorService,
    private dialogRef: MatDialogRef<OspCoordinatorModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: OspCoordinatorItem | null
  ) {
    this.statForm = this.fb.group({
      id: [data?.id],
      segmentId: [data?.segmentId || '', Validators.required],
      vendor: [data?.vendor || '', Validators.required],
      crew: [data?.crew || '', Validators.required],
      materialOrder: [data?.materialOrder || '', Validators.required],
      date: [data?.date || ''],
      workPackageCreated: [data?.workPackageCreated || '', Validators.required],
      amount: [data?.amount, Validators.required],
      workPackageAmount: [data?.workPackageAmount, Validators.required],
      originalContinuingCost: [data?.originalContinuingCost, Validators.required],
      highCostAnalysis: [data?.highCostAnalysis || '', Validators.required],
      ntp: [data?.ntp || '', Validators.required],
      asbuiltSubmitted: [data?.asbuiltSubmitted || '', Validators.required],
      coordinatorCloseout: [data?.coordinatorCloseout || '', Validators.required],
      amendmentVersion: [data?.amendmentVersion, Validators.required],
      amendmentAmount: [data?.amendmentAmount, Validators.required],
      continuingAmount: [data?.continuingAmount, Validators.required],
      amendmentReason: [data?.amendmentReason || '', Validators.required],
      adminAudit: [data?.adminAudit, Validators.required],
      adminAuditDate: [data?.adminAuditDate || '', Validators.required],
      pass: [data?.pass ?? true, Validators.required],
      passFailReason: [data?.passFailReason || '']
    });
  }

  save(): void {
    if (this.statForm.valid) {
      const ospEntry: OspCoordinatorItem = this.statForm.getRawValue();
      
      if(ospEntry.id == null){
        ospEntry.id = uuidv4();
      }
      
      this.dialogRef.close(ospEntry);
    }
    else{
      this.toastr.error('Form is invalid. Check all form fields');
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
