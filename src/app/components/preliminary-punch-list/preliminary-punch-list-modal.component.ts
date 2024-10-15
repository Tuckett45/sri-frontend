import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-preliminary-punch-list-modal',
  templateUrl: './preliminary-punch-list-modal.component.html',
  styleUrls: ['./preliminary-punch-list-modal.component.scss']
})
export class PreliminaryPunchListModalComponent implements OnInit {
  preliminaryPunchListForm!: FormGroup;
  isEditMode: boolean = false;

  @ViewChild('issueImageInput') issueImageInput!: ElementRef;
  @ViewChild('resolutionImageInput') resolutionImageInput!: ElementRef;

  issueAreaList: string[] = ['Vault', 'DB', 'Trench', 'Site Clean Up', 'Sidewalk Panels', 'Sealant'];
  qualityIssuesMap: { [key: string]: string[] } = {
    'Vault': ['Broken vault lid', 'Missing bolt(s)', 'Raised vault - trip hazard'],
    'DB': ['Raised DB - trip hazard', 'Open DB', 'Missing sod/dead sod'],
    'Trench': ['Sunken Core', 'Missing cones', 'Low flowfill'],
    'Site Clean Up': ['Debris', 'Materials left behind', 'Oil spill on the road'],
    'Sidewalk Panels': ['Panel removed', 'Open panel exceeded time', 'Not covered properly'],
    'Sealant': ['Missing sealant', 'Sealant peeling up', 'Cracks in sealant']
  };

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PreliminaryPunchListModalComponent>,
    private punchListService: PreliminaryPunchListService,
    private toastr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: PreliminaryPunchList
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.data;

    this.preliminaryPunchListForm = this.fb.group({
      id: [this.data?.id || ''],
      segmentId: [this.data?.segmentId || '', Validators.required],
      vendorName: [this.data?.vendorName || '', Validators.required],
      streetAddress: [this.data?.streetAddress || '', Validators.required],
      city: [this.data?.city || '', [Validators.required, Validators.pattern('^[a-zA-Z ]*$')]], 
      state: [this.data?.state || '', [Validators.required, Validators.pattern('^[A-Za-z]{2}$')]], 
      issues: this.fb.array(this.getInitialIssueAreas(this.data)),
      additionalConcerns: [this.data?.additionalConcerns || ''],
      dateReported: [this.data?.dateReported || new Date],
      issueImage: [this.data?.issueImage || null],
      pmResolved: [this.data?.pmResolved || false],
      resolutionImage: [this.data?.resolutionImage || null],
      dateResolved: [this.data?.dateResolved || ''],
      cmResolved: [this.data?.cmResolved || false]
    });

    this.preliminaryPunchListForm.get('pmResolved')?.valueChanges.subscribe((pmResolved: boolean) => {
      if (pmResolved) {
        this.preliminaryPunchListForm.patchValue({ dateResolved: new Date() });
        this.preliminaryPunchListForm.get('resolutionImage')?.setValidators(Validators.required);
      } else {
        this.preliminaryPunchListForm.patchValue({ dateResolved: '' });
        this.preliminaryPunchListForm.patchValue({ resolutionImage: null });
        this.preliminaryPunchListForm.get('resolutionImage')?.clearValidators();
      }
      this.preliminaryPunchListForm.get('resolutionImage')?.updateValueAndValidity();
    });
  }

  triggerIssueImageUpload(): void {
    this.issueImageInput.nativeElement.click();
  }

  triggerResolutionImageUpload(): void {
    this.resolutionImageInput.nativeElement.click();
  }

  removeIssueImage(): void {
    this.preliminaryPunchListForm.patchValue({ issueImage: null });
    this.preliminaryPunchListForm.get('issueImage')?.updateValueAndValidity();
    this.toastr.warning('Image removed');
  }
  
  removeResolutionImage(): void {
    this.preliminaryPunchListForm.patchValue({ resolutionImage: null });
    this.preliminaryPunchListForm.get('resolutionImage')?.updateValueAndValidity();
    this.toastr.warning('Image removed');
  }

  getInitialIssueAreas(data: PreliminaryPunchList | null): FormGroup[] {
    if (!data?.issues) return [];
    
    return data.issues.map(issueArea => this.fb.group({
      id: [issueArea.id],
      area: [issueArea.area, Validators.required],
      qualityIssues: [Array.isArray(issueArea.qualityIssues) ? issueArea.qualityIssues : issueArea.qualityIssues.split(',') || []],
      preliminaryPunchListId: [issueArea.preliminaryPunchListId]
    }));
  }

  get issueAreasFormArray(): FormArray {
    return this.preliminaryPunchListForm.get('issues') as FormArray;
  }

  addIssueArea(): void {
    this.issueAreasFormArray.push(this.fb.group({
      id: [uuidv4()],
      area: ['', Validators.required],
      qualityIssues: [[]],
      preliminaryPunchListId: [this.preliminaryPunchListForm.get('id')?.value]
    }));
  }

  removeIssueArea(index: number): void {
    this.issueAreasFormArray.removeAt(index);
  }

  onIssueAreaChange(index: number): void {
    const issueAreaControl = this.issueAreasFormArray.at(index).get('area')?.value;
    if (issueAreaControl?.value) {
      const qualityIssuesControl = this.issueAreasFormArray.at(index).get('qualityIssues');
      qualityIssuesControl?.reset(); 
    }
  }

  getQualityIssues(index: number): string[] {
    const selectedArea = this.issueAreasFormArray.at(index).get('area')?.value;
    return this.qualityIssuesMap[selectedArea] || [];
  }

  uploadIssueImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];
      this.preliminaryPunchListForm.patchValue({ issueImage: file });
      this.preliminaryPunchListForm.get('issueImage')?.updateValueAndValidity();
      this.toastr.success('Image added');
    }
  }

  uploadResolutionImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];
      this.preliminaryPunchListForm.patchValue({ resolutionImage: file });
      this.preliminaryPunchListForm.get('resolutionImage')?.updateValueAndValidity();
      this.toastr.success('Image added');
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.preliminaryPunchListForm.valid) {
      const formValue = this.preliminaryPunchListForm.value;
    
      const issues = formValue.issues.map((issue: any) => ({
        ...issue,
        qualityIssues: Array.isArray(issue.qualityIssues) ? issue.qualityIssues.join(',') : issue.qualityIssues
      }));
    
      const updatedFormValue = {
        ...formValue,
        issues: issues
      };
  
      const formData = new FormData();
      formData.append('punchList', JSON.stringify(updatedFormValue));
  
      if (formValue.issueImage instanceof File) {
        formData.append('issueImage', formValue.issueImage);
      }
  
      if (formValue.resolutionImage instanceof File) {
        formData.append('resolutionImage', formValue.resolutionImage);
      }
  
      this.dialogRef.close(formData);
    } else {
      console.error('Form is invalid');
    }
  }
}