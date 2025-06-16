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
  crews: number[] = [1,2,3,4,5,6,7,8,9,10];
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
      materialOrder: [data?.materialOrder || ''],
      date: [data?.date || ''],
      workPackageCreated: [data?.workPackageCreated || ''],
      amount: [data?.amount, Validators.required],
      workPackageAmount: [data?.workPackageAmount],
      workPackageContingency: [data?.workPackageContingency],
      highCostAnalysis: [data?.highCostAnalysis || ''],
      ntp: [data?.ntp || '', Validators.required],
      asbuiltSubmitted: [data?.asbuiltSubmitted || ''],
      coordinatorCloseout: [data?.coordinatorCloseout || ''],
      amendmentVersion: [data?.amendmentVersion],
      newWPLaborAmount: [data?.newWPLaborAmount],
      contingencyAmount: [data?.contingencyAmount],
      amendmentReason: [data?.amendmentReason || ''],
      adminAudit: [data?.adminAudit],
      adminAuditDate: [data?.adminAuditDate || ''],
      pass: [data?.pass ?? true],
      passFailReason: [Array.isArray(data?.passFailReason) ? data?.passFailReason : (data?.passFailReason ? data?.passFailReason.split(',').map(q => q.trim()) : [])]
    });
  }

  save(): void {
    if (this.statForm.valid) {
      const ospEntry: OspCoordinatorItem = this.statForm.getRawValue();
      
      if(ospEntry.id == null){
        ospEntry.id = uuidv4();
        ospEntry.date = new Date().toISOString();
      }

      if (Array.isArray(ospEntry.passFailReason)) {
        ospEntry.passFailReason = ospEntry.passFailReason.join(', ');
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
