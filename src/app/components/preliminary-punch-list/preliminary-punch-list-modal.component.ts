import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PunchListImages } from 'src/app/models/punch-list-images.model';
import { UserRole } from 'src/app/models/role.enum';
import { AuthService } from 'src/app/services/auth.service';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-preliminary-punch-list-modal',
  templateUrl: './preliminary-punch-list-modal.component.html',
  styleUrls: ['./preliminary-punch-list-modal.component.scss']
})
export class PreliminaryPunchListModalComponent implements OnInit {
  issueImageModel!: PunchListImages;
  resolutionImageModel!: PunchListImages; 
  preliminaryPunchListForm!: FormGroup;
  isEditMode: boolean = false;

  @ViewChild('issueImageInput') issueImageInput!: ElementRef;
  @ViewChild('resolutionImageInput') resolutionImageInput!: ElementRef;

  issueAreaList: string[] = ['Vault', 'DB', 'Trench', 'Site Clean Up', 'Sidewalk Panels', 'Sealant'];
  qualityIssuesMap: { [key: string]: string[] } = {
    'Vault': [
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
      'Missing wire nut on tracer wire', 
      'Need to seal the unused conduits', 
      'Missing vault lid anchor hardware'
    ],
    'DB': [
      'Raised DB - trip hazard', 
      'Sunken DB - trip hazard', 
      'Raised Core', 
      'Sunken Core', 
      'Softscape restoration', 
      'DB not covered to google standards', 
      'Open DB', 
      'Drops related', 
      'Missing sod/dead sod'
    ],
    'Trench': [
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
    ],
    'Sealant': [
      'Car skip', 
      'Missing sealant', 
      'Sealant is peeling up',
      'Cracks in sealant'
    ],
    'Sidewalk Panels': [
      'Panel removed (timestamp)', 
      'Open panel has exceeded Google\'s turn around time', 
      'Open panel has exceeded city\'s turn around time', 
      'Panel not covered/secured properly', 
      'Missing sidewalk closed signage', 
      'Panel needs restoration (trip hazard, wrong color, not meeting spec, etc.)'
    ],
    'Site Clean Up': [
      'Core(s)', 
      'Materials', 
      'Debris', 
      'Dirt', 
      'Equipment', 
      'Oil spill on the road from equipment', 
      'Flowfill washout on the road'
    ]
  };
  

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PreliminaryPunchListModalComponent>,
    private punchListService: PreliminaryPunchListService,
    private toastr: ToastrService,
    public authService: AuthService,
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
      dateReported: [this.data?.dateReported ||  new Date().toISOString()],
      issueImageId: [this.data?.issueImageId || null],
      pmResolved: [this.data?.pmResolved || false],
      resolutionImageId: [this.data?.resolutionImageId || null],
      dateResolved: [this.data?.dateResolved || ''],
      cmResolved: [this.data?.cmResolved || false]
    });

    if (this.isEditMode) {
      this.issueImageModel = new PunchListImages(this.data.id || '', 'issueImage', this.data.issueImageId);
      this.resolutionImageModel = new PunchListImages(this.data.id || '', 'resolutionImage', this.data.resolutionImageId);
    } else {
      this.issueImageModel = new PunchListImages('', 'issueImage');
      this.resolutionImageModel = new PunchListImages('', 'resolutionImage');
    }

    this.preliminaryPunchListForm.get('pmResolved')?.valueChanges.subscribe((pmResolved: boolean) => {
      if (pmResolved) {
        this.preliminaryPunchListForm.patchValue({ dateResolved: new Date().toISOString() });
        this.preliminaryPunchListForm.get('resolutionImageId')?.setValidators(Validators.required);
      } else {
        this.preliminaryPunchListForm.patchValue({ dateResolved: '' });
        this.preliminaryPunchListForm.patchValue({ resolutionImageId: null });
        this.preliminaryPunchListForm.get('resolutionImageId')?.clearValidators();
      }
      this.preliminaryPunchListForm.get('resolutionImageId')?.updateValueAndValidity();
    });

    this.setFormState();
  }

  setFormState(): void {
    if (this.authService.isUserInRole([UserRole.PM])) {
      this.preliminaryPunchListForm.controls['segmentId'].disable(); 
      this.preliminaryPunchListForm.controls["segmentId"].disable();
      this.preliminaryPunchListForm.controls["vendorName"].disable();
      this.preliminaryPunchListForm.controls["streetAddress"].disable();
      this.preliminaryPunchListForm.controls["city"].disable();
      this.preliminaryPunchListForm.controls["state"].disable();
      this.preliminaryPunchListForm.controls["qualityIssues"].disable();
      this.preliminaryPunchListForm.controls["additionalConcerns"].disable();
      this.preliminaryPunchListForm.controls["cmResolved"]?.disable();
    }
  }

  triggerIssueImageUpload(): void {
    this.issueImageInput.nativeElement.click();
  }

  triggerResolutionImageUpload(): void {
    this.resolutionImageInput.nativeElement.click();
  }

  getInitialIssueAreas(data: PreliminaryPunchList | null): FormGroup[] {
    if (!data?.issues) return [];
    
    return data.issues.map(issueArea => this.fb.group({
      id: [issueArea.id],
      area: [issueArea.area, Validators.required],
      qualityIssues: [Array.isArray(issueArea.qualityIssues) ? issueArea.qualityIssues : issueArea.qualityIssues.split(',').map(q => q.trim()) || []],
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
      const reader = new FileReader();
  
      const maxFileSizeInMB = 5;
      const maxFileSizeInBytes = maxFileSizeInMB * 1024 * 1024;
  
      if (file.size > maxFileSizeInBytes) {
        this.toastr.error(`File size should not exceed ${maxFileSizeInMB} MB`);
        return;
      }
  
      reader.onload = () => {
        const base64String = reader.result as string; 
        this.preliminaryPunchListForm.patchValue({ issueImageId: base64String });
        this.issueImageModel.image = file; 
        this.toastr.success('Issue image uploaded');
      };
  
      reader.onerror = (error) => {
        console.error('Error converting image: ', error);
      };
  
      reader.readAsDataURL(file);
    }
  }
  
  uploadResolutionImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
  
      const maxFileSizeInMB = 5;
      const maxFileSizeInBytes = maxFileSizeInMB * 1024 * 1024;
  
      if (file.size > maxFileSizeInBytes) {
        this.toastr.error(`File size should not exceed ${maxFileSizeInMB} MB`);
        return;
      }
  
      reader.onload = () => {
        const base64String = reader.result as string; 
        this.preliminaryPunchListForm.patchValue({ resolutionImageId: base64String });
        this.resolutionImageModel.image = file;
        this.toastr.success('Resolution image uploaded');
      };
  
      reader.onerror = (error) => {
        console.error('Error converting image: ', error);
      };
  
      reader.readAsDataURL(file);
    }
  }
  
  removeIssueImage(): void {
    this.issueImageModel.image = null;
    this.preliminaryPunchListForm.patchValue({ issueImageId: null });
    this.toastr.warning('Issue image removed');
  }

  removeResolutionImage(): void {
    this.resolutionImageModel.image = null;
    this.preliminaryPunchListForm.patchValue({ resolutionImageId: null });
    this.toastr.warning('Resolution image removed');
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    
    if (this.preliminaryPunchListForm.valid) {
      const punchList = this.preliminaryPunchListForm.getRawValue();

      punchList.issues = punchList.issues.map((issue: any) => ({
        ...issue,
        qualityIssues: Array.isArray(issue.qualityIssues) ? issue.qualityIssues.join(',') : issue.qualityIssues
      }));
  
      if (punchList.id === '') {
        punchList.id = uuidv4();
      }
  
      if (this.issueImageModel.image != null) {
        if (!this.issueImageModel.id) {
          this.issueImageModel.id = uuidv4();
        }
        this.issueImageModel.preliminaryPunchListId = punchList.id;
      }
  
      if (this.resolutionImageModel.image != null) {
        if (!this.resolutionImageModel.id) {
          this.resolutionImageModel.id = uuidv4();
        }
        this.resolutionImageModel.preliminaryPunchListId = punchList.id;
      }
  
      // Return the punchList and the images
      const result = {
        punchList,
        issueImage: this.issueImageModel.image instanceof File ? this.issueImageModel.image : null,
        resolutionImage: this.resolutionImageModel.image instanceof File ? this.resolutionImageModel.image : null
      };
  
      this.dialogRef.close(result);
    } else {
      console.error('Form is invalid');
    }
  }
}