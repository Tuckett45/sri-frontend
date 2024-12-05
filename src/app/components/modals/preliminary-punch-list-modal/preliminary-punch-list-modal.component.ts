import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PunchListImages } from 'src/app/models/punch-list-images.model';
import { UserRole } from 'src/app/models/role.enum';
import { AuthService } from 'src/app/services/auth.service';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { v4 as uuidv4 } from 'uuid';
import { DeleteConfirmationModalComponent } from '../delete-confirmation-modal/delete-confirmation-modal.component';
import { HttpClient } from '@angular/common/http';
import { fromEvent, debounceTime, distinctUntilChanged, of, catchError, switchMap, Observable } from 'rxjs';
import { Image, ModalGalleryRef, ModalGalleryService, ModalImage } from '@ks89/angular-modal-gallery';
import { User } from 'src/app/models/user.model';
import { GeocodingService } from 'src/app/services/geocoding.service';

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
  isDisabled: boolean = false;

  @ViewChild('issueImageInput') issueImageInput!: ElementRef;
  @ViewChild('resolutionImageInput') resolutionImageInput!: ElementRef;
  @ViewChild('addressInput') addressInput!: ElementRef;

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
      'Missing sod',
      'Dead sod'
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
      'Trench wider than 4". Should be hot patch, not flowfill',
      'No Signage'
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
    ],
    'Signage':[
      'Missing parking signs',
      'Missing A frame'
    ]
  };

  stateAbbreviations: { [key: string]: string } = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
  };

  isAddressLoading = false;
  filteredAddresses: any[] = [];
  filteredQualityIssues: string[][] = []; 
  galleryImages: Image[] = [];
  userData!: User;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PreliminaryPunchListModalComponent>,
    private dialog: MatDialog,
    private toastr: ToastrService,
    public authService: AuthService,
    private modalGalleryService: ModalGalleryService,
    private geocodingService: GeocodingService,
    @Inject(MAT_DIALOG_DATA) public data: PreliminaryPunchList
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.isEditMode = !!this.data;
    this.isDisabled = !this.authService.isCM();

    this.preliminaryPunchListForm = this.fb.group({
      id: [this.data?.id || ''],
      segmentId: [this.data?.segmentId || '', Validators.required],
      vendorName: [this.data?.vendorName || '', Validators.required],
      streetAddress: [this.data?.streetAddress || '', Validators.required],
      city: [this.data?.city || '', [Validators.required, Validators.pattern('^[a-zA-Z ]*$')]], 
      state: [this.data?.state || '', [Validators.required, Validators.pattern('^[A-Za-z]{2}$')]], 
      issues: this.fb.array(this.getInitialIssueAreas(this.data)),
      additionalConcerns: [this.data?.additionalConcerns || ''],
      createdBy: [this.data?.createdBy || ''],
      dateReported: [this.data?.dateReported ||  new Date().toISOString()],
      issueImageId: [this.data?.issueImageId || null],
      pmResolved: [this.data?.pmResolved || false],
      resolutionImageId: [this.data?.resolutionImageId || null],
      dateResolved: [this.data?.dateResolved || ''],
      cmResolved: [this.data?.cmResolved || false],
      updatedBy: [this.data?.updatedBy || ''],
      updatedDate: [this.data?.updatedDate ||  '']
    });

    this.preliminaryPunchListForm.get('streetAddress')?.valueChanges.pipe(
      debounceTime(300),
      switchMap((value) => this.getAddressSuggestions(value))
    ).subscribe(suggestions => {
      this.filteredAddresses = suggestions;
    });

    if (this.isDisabled) {
      this.preliminaryPunchListForm.get('cmResolved')?.disable();
    }

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

  }

  onAddressInput(event: any): void {
    const query = event.target.value;
    if (query && query.length > 2) {
      this.isAddressLoading = true;
      this.getAddressSuggestions(query)
        .pipe(
          debounceTime(1000),
          distinctUntilChanged(),
          catchError(() => {
            this.isAddressLoading = false;
            return of([]); 
          })
        )
        .subscribe(suggestions => {
          
          this.filteredAddresses = suggestions.filter(suggestion => {
            const address = suggestion.address || {};
            const streetAddress = address.house_number && address.road 
              ? `${address.house_number} ${address.road}` 
              : address.road || '';
  
            const city = address.city || address.town || '';
            const state = address.state || '';
            const abbreviatedState = this.stateAbbreviations[state] || state || '';
  
            const formattedAddress = `${streetAddress}, ${city}, ${abbreviatedState}`.trim();
            return {
              formattedAddress: formattedAddress,  
              original: suggestion
            };
          });
  
          this.isAddressLoading = false;
        });
    } else {
      this.filteredAddresses = [];
    }
  }

  getAddressSuggestions(query: string): Observable<any[]> {
    if (!query) return of([]);
    
    return this.geocodingService.geocodeAddress(query);  // Use Geocoding Service here
  }

  selectAddress(suggestion: any): void {
    const streetAddress = suggestion.address.house_number
      ? suggestion.address.house_number + ' ' + suggestion.address.road
      : suggestion.address.road || suggestion.address.residential;
  
    const city = suggestion.address.city || suggestion.address.town || suggestion.address.village || suggestion.address.municipality;
    const state = suggestion.address.state;
    const abbreviatedState = this.stateAbbreviations[state] || state;
  
    this.preliminaryPunchListForm.patchValue({
      streetAddress: streetAddress,
      city: city,
      state: abbreviatedState
    });

    this.filteredAddresses = [];
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
    if(this.issueAreasFormArray.at(index).get('qualityIssues')?.value){
      this.issueAreasFormArray.at(index).reset;
    }
    const issueArea = this.issueAreasFormArray.at(index).get('area')?.value;
    this.filterQualityIssues(index, issueArea);
  }

  filterQualityIssues(index: number, issueArea?: string): void {
    if (issueArea) {
      this.filteredQualityIssues[index] = this.qualityIssuesMap[issueArea] || [];
    } else {
      this.filteredQualityIssues[index] = [];
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
  
      const maxFileSizeInMB = 15;
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
  
      const maxFileSizeInMB = 15;
      const maxFileSizeInBytes = maxFileSizeInMB * 1024 * 1024;
  
      if (file.size > maxFileSizeInBytes) {
        this.toastr.error(`File size should not exceed ${maxFileSizeInMB} MB`);
        return;
      }
  
      reader.onload = () => {
        if (!this.resolutionImageModel.id) {
          this.resolutionImageModel.id = uuidv4();
        }
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

  openImageModal(imageUrl: string): void {
    const modalImage: ModalImage = {
      img: imageUrl,
      title: 'Full Image',
      alt: 'Full Image'
    };

    const image = new Image(0, modalImage); 

    this.galleryImages = [image]; 

    const currentIndex = 0;

    const dialogRef: ModalGalleryRef = this.modalGalleryService.open({
      id: currentIndex,
      images: this.galleryImages,
      currentImage: this.galleryImages[currentIndex]
    }) as ModalGalleryRef;
  }

  openDeleteConfirmationDialog(index: number): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.removeIssueArea(index);
      }
    });
  }

  loadUserProfile(): void {
    const userString = localStorage.getItem('user');
    if (userString) {
      const userObj = JSON.parse(userString);

      this.userData = new User(
        userObj.id,
        userObj.name,
        userObj.email,
        userObj.password,
        userObj.role,
        new Date(userObj.createdDate)  
      );
    } else {
      console.error('User not found in localStorage');
    }
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

      if(this.isEditMode){
        debugger;
        punchList.updatedBy = this.userData.id
        punchList.updatedDate = new Date().toISOString();
      }else{
        punchList.createdBy = this.userData.id
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