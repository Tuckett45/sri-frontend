import { DatePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model'; // Import the model


@Component({
  selector: 'app-preliminary-punch-list-modal',
  templateUrl: './preliminary-punch-list-modal.component.html',
  styleUrls: ['./preliminary-punch-list-modal.component.scss']
})
export class PreliminaryPunchListModalComponent {
  preliminaryPunchListForm: FormGroup;

  // Options for each of the issue fields

  vaultIssuesList: string[] = [
    'Broken vault lid',
    'Missing bolt(s)',
    'Softscape restoration around vault',
    'Tracer connected improperly',
    'Raised vault - trip hazard',
    'Sunken vault - trip hazard',
    'Missing ground rod',
    'Drops related',
    'Missing 5 post ground connector',
    'Missing directional tape',
    'Fiber tags',
    'Trim conduit',
    'Missing stub out',
    'Missing gravel',
    'Need to seal sidewalls',
    'Missing wire nut on tracer wire'
  ];

  dbIssuesList: string[] = [
    'Raised DB - trip hazard',
    'Sunken DB - trip hazard',
    'Raised Core',
    'Sunken Core',
    'Softscape restoration',
    'DB not covered to google standards',
    'Open DB',
    'Drops related',
    'Missing sod/dead sod'
  ];

  trenchIssuesList: string[] = [
    'Sunken Core',
    'Raised Core',
    'Low flowfill',
    'Trip hazard',
    'SWPPP',
    'Missing cones',
    'Road fell apart',
    'Hot patch',
    'Missing backer rod',
    'Trench wider than 4". Should be hot patch, not flowfill'
  ];

  siteCleanUpList: string[] = [
    'Core(s)',
    'Materials',
    'Debris',
    'Dirt',
    'Equipment',
    'Oil spill on the road from equipment',
    'Flowfill washout on the road'
  ];

  sidewalkPanelsList: string[] = [
    'Panel removed (timestamp)',
    'Open panel has exceeded Google`s turn around time',
    'Open panel has exceeded city`s turn around time',
    'Panel not covered/secured properly',
    'Missing sidewalk closed signage',
    'Panel needs restoration (trip hazard, wrong color, not meeting spec, etc.)'
  ];


  sealantIssuesList: string[] = [
    'Car skip',
    'Missing sealan',
    'Sealant is peeling up'
  ];


  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PreliminaryPunchListModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PreliminaryPunchList 
  ) {  

    this.preliminaryPunchListForm = this.fb.group({
      segmentId: [data?.segmentId || '', Validators.required],
      streetAddress: [data?.streetAddress || '', Validators.required],
      city: [data?.city || '', Validators.required],
      state: [data?.state || '', Validators.required],
      vaultIssues: [data?.vaultIssues || []],
      dbIssues: [data?.dbIssues || []],
      trenchIssues: [data?.trenchIssues || []],
      siteCleanUp: [data?.siteCleanUp || []],
      sidewalkPanels: [data?.sidewalkPanels || []],
      sealantIssues: [data?.sealantIssues || []],
      additionalConcerns: [data?.additionalConcerns || ''],
      notifiedTo: [data?.notifiedTo || '', Validators.required],
      notifiedHow: [data?.notifiedHow || '', Validators.required],
      issueImage: [data?.issueImage || null]
    });
  }

  createIssuesFormArray(issues: string[]): FormArray {
    return this.fb.array(issues.map(() => new FormControl(false)));
  }

  // Utility getters to access form arrays easily
  get vaultIssuesFormArray(): FormArray {
    return this.preliminaryPunchListForm.get('vaultIssues') as FormArray;
  }

  get dbIssuesFormArray(): FormArray {
    return this.preliminaryPunchListForm.get('dbIssues') as FormArray;
  }

  get trenchIssuesFormArray(): FormArray {
    return this.preliminaryPunchListForm.get('trenchIssues') as FormArray;
  }

  get siteCleanUpFormArray(): FormArray {
    return this.preliminaryPunchListForm.get('siteCleanUp') as FormArray;
  }

  get sidewalkPanelsFormArray(): FormArray {
    return this.preliminaryPunchListForm.get('sidewalkPanels') as FormArray;
  }

  get sealantIssuesFormArray(): FormArray {
    return this.preliminaryPunchListForm.get('sealantIssues') as FormArray;
  }


  // Handle file selection for issueImage
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];
      this.preliminaryPunchListForm.patchValue({ issueImage: file });
      this.preliminaryPunchListForm.get('issueImage')?.updateValueAndValidity();
    }
  }

  // Method to close the modal
  close(): void {
    this.dialogRef.close();
  }

  // Method to save form data and close the modal
  save(): void {
    if (this.preliminaryPunchListForm.valid) {
      // Gather selected issues from all checkbox groups
      const formData: PreliminaryPunchList = {
        segmentId: this.preliminaryPunchListForm.get('segmentId')?.value,
        streetAddress: this.preliminaryPunchListForm.get('streetAddress')?.value,
        city: this.preliminaryPunchListForm.get('city')?.value,
        state: this.preliminaryPunchListForm.get('state')?.value,
        vaultIssues: this.preliminaryPunchListForm.get('vaultIssues')?.value,
        dbIssues: this.preliminaryPunchListForm.get('dbIssues')?.value,
        trenchIssues: this.preliminaryPunchListForm.get('trenchIssues')?.value,
        siteCleanUp: this.preliminaryPunchListForm.get('siteCleanUp')?.value,
        sidewalkPanels: this.preliminaryPunchListForm.get('sidewalkPanels')?.value,
        sealantIssues: this.preliminaryPunchListForm.get('sealantIssues')?.value,
        additionalConcerns: this.preliminaryPunchListForm.get('additionalConcerns')?.value,
        notifiedTo: this.preliminaryPunchListForm.get('notifiedTo')?.value,
        notifiedHow: this.preliminaryPunchListForm.get('notifiedHow')?.value,
        issueImage: this.preliminaryPunchListForm.get('issueImage')?.value,
        dateReported: new Date,
        pmResolved: false,
        cmResolved: false,
        resolvedDate: null
      };
      
      console.log('Form Data:', formData);

      // You can send this data to a service to save it to a database or handle it as needed
      this.dialogRef.close(formData);
    } else {
      console.error('Form is invalid');
    }
  }
}