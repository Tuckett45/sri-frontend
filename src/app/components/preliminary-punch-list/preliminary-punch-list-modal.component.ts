import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model'; // Import the model


@Component({
  selector: 'app-preliminary-punch-list-modal',
  templateUrl: './preliminary-punch-list-modal.component.html',
  styleUrls: ['./preliminary-punch-list-modal.component.scss']
})
export class PreliminaryPunchListModalComponent {
  preliminaryPunchListForm: FormGroup;

  // Options for each of the issue fields
  vaultIssuesList: string[] = ['Broken Vault', 'Damaged Lid', 'Corrosion', 'Water Leakage'];
  dbIssuesList: string[] = ['Database Sync', 'Connection Failure', 'Outdated Records'];
  trenchIssuesList: string[] = ['Poor Excavation', 'Water Ingress', 'Cracking'];
  siteCleanUpList: string[] = ['Debris Left', 'Oil Spills', 'Incomplete Work'];
  sidewalkPanelsList: string[] = ['Panel A', 'Panel B', 'Panel C', 'Panel D'];
  sealantIssuesList: string[] = ['Cracks in Sealant', 'Sealant Peeling', 'Water Leakage'];


  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PreliminaryPunchListModalComponent>
  ) {  

    this.preliminaryPunchListForm = this.fb.group({
      segmentId: ['', Validators.required],
      streetAddress: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      vaultIssues: [[]],
      dbIssues: [[]],
      trenchIssues: [[]],
      siteCleanUp: [[]],
      sidewalkPanels: [[]],
      sealantIssues: [[]],
      additionalConcerns: [''],
      notifiedTo: ['', Validators.required],
      notifiedHow: ['', Validators.required],
      issueImage: []
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