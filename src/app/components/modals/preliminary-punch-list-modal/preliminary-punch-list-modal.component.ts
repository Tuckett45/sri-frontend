import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PunchListImages } from 'src/app/models/punch-list-images.model';
import { AuthService } from 'src/app/services/auth.service';
import { v4 as uuidv4 } from 'uuid';
import { DeleteConfirmationModalComponent } from '../delete-confirmation-modal/delete-confirmation-modal.component';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, of, catchError, switchMap } from 'rxjs';
import { Image, ModalGalleryService } from '@ks89/angular-modal-gallery';
import { User } from 'src/app/models/user.model';
// import { GeocodingService } from 'src/app/services/geocoding.service';

@Component({
  selector: 'app-preliminary-punch-list-modal',
  templateUrl: './preliminary-punch-list-modal.component.html',
  styleUrls: ['./preliminary-punch-list-modal.component.scss']
})
export class PreliminaryPunchListModalComponent implements OnInit {
  preliminaryPunchListForm!: FormGroup;
  isEditMode: boolean = false;
  isDisabled: boolean = false;
  displayModal: boolean = false;
  currentImage: string = '';
  currentImageIndex: number = 0;

  @ViewChild('issueImageInput') issueImageInput!: ElementRef;
  @ViewChild('resolutionImageInput') resolutionImageInput!: ElementRef;
  @ViewChild('addressInput') addressInput!: ElementRef;

  issueAreaList: string[] = ['Vault', 'DB', 'Trench', 'Site Clean Up', 'Sidewalk Panels', 'Sealant', 'Signage', 'Safety Concern'];
  qualityIssuesMap: { [key: string]: string[] } = {
    'Vault': [
      'Cable Management',
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
    ],
    'Safety Concern':[
      'Public Safety issue',
      'Crew Safety issue',
      'Public and Crew Safety issue'
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

  vendors: string[] = ['Conguex (SCI)', 'Ervin (ECC)', 'Blue Edge (BE)', 'North Star', 'MasTec', 'Bcomm'];

  isAddressLoading = false;
  filteredAddresses: any[] = [];
  filteredQualityIssues: string[][] = []; 
  isIssueGalleryVisible: boolean = false;
  isResolutionGalleryVisible: boolean = false;

  issueGalleryImages: Image[] = [];
  resolutionGalleryImages: Image[] = [];

  responsiveOptions: any[] = [
    {
      breakpoint: '1024px',
      numVisible: 5,
      rows: 1
    },
    {
      breakpoint: '768px',
      numVisible: 3,
      rows: 1
    },
    {
      breakpoint: '560px',
      numVisible: 1,
      rows: 1
    }
  ];

  position: string = 'bottom';


  currentIssueImageIndex: number = 0;
  currentResolutionImageIndex: number = 0;
  userData!: User;
  galleryImages: any[] = [];

  get issueImagesFormArray(): FormArray {
    return this.preliminaryPunchListForm.get('issueImages') as FormArray;
  }
  
  get resolutionImagesFormArray(): FormArray {
    return this.preliminaryPunchListForm.get('resolutionImages') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private dialogRef: MatDialogRef<PreliminaryPunchListModalComponent>,
    private dialog: MatDialog,
    private toastr: ToastrService,
    public authService: AuthService,
    private modalGalleryService: ModalGalleryService,
    // private geocodingService: GeocodingService,
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
      state: [this.data?.state.toUpperCase() || '', [Validators.required, Validators.pattern('^[A-Za-z]{2}$')]], 
      issues: this.fb.array(this.getInitialIssueAreas(this.data)),
      additionalConcerns: [this.data?.additionalConcerns || ''],
      createdBy: [this.data?.createdBy || null],
      dateReported: [this.data?.dateReported ||  new Date().toISOString()],
      issueImages: this.fb.array(this.data?.issueImages || []),
      resolutionImages: this.fb.array(this.data?.resolutionImages || []), 
      pmResolved: [this.data?.pmResolved || false],
      resolvedDate: [this.data?.resolvedDate || null],
      cmResolved: [this.data?.cmResolved || false],
      updatedBy: [this.data?.updatedBy || null],
      updatedDate: [this.data?.updatedDate || null]
    });

    this.preliminaryPunchListForm.get('streetAddress')?.valueChanges.pipe(
      debounceTime(300),
      switchMap((value) => this.getAddressSuggestions(value))
    ).subscribe(suggestions => {
      this.filteredAddresses = suggestions;
    });

    if (this.isDisabled) {
      this.preliminaryPunchListForm.get('segmentId')?.disable();
      this.preliminaryPunchListForm.get('vendorName')?.disable();
      this.preliminaryPunchListForm.get('streetAddress')?.disable();
      this.preliminaryPunchListForm.get('city')?.disable();
      this.preliminaryPunchListForm.get('state')?.disable();
      this.preliminaryPunchListForm.get('issues')?.disable();
      this.preliminaryPunchListForm.get('additionalConcerns')?.disable();
      this.preliminaryPunchListForm.get('cmResolved')?.disable();
    }

    if (this.isEditMode) {
      this.initializeImages(this.data.issueImages || [], 'issueImages');
      this.initializeImages(this.data.resolutionImages || [], 'resolutionImages');
    }

    this.preliminaryPunchListForm.get('pmResolved')?.valueChanges.subscribe((pmResolved: boolean) => {
      if (pmResolved) {
        this.preliminaryPunchListForm.patchValue({ resolvedDate: new Date().toISOString() });
      } else {
        this.preliminaryPunchListForm.patchValue({ resolvedDate: null });
        this.preliminaryPunchListForm.patchValue({ resolutionImages: [] });
        this.preliminaryPunchListForm.get('resolutionImages')?.clearValidators();
      }
      this.preliminaryPunchListForm.get('resolutionImages')?.updateValueAndValidity();
    });

  }

  initializeImages(imageIds: PunchListImages[], formArrayName: 'issueImages' | 'resolutionImages') {
    if (imageIds?.length) {
      imageIds.forEach(id => {
        (this.preliminaryPunchListForm.get(formArrayName) as FormArray).push(this.fb.control(id));
      });
    }
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

  getAddressSuggestions(query: string) {
    const url = `https://nominatim.openstreetmap.org/search?addressdetails=1&format=jsonv2&q=${query}&countrycodes=US&layer=address&limit=5`;
    return this.http.get<any[]>(url); 
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

  removeImages(images: any, type: string){
    if(type == 'issueImages'){
      this.issueImagesFormArray.clear();
      this.preliminaryPunchListForm.get('issueImages')?.reset;
    } else {
      this.resolutionImagesFormArray.clear();
      this.preliminaryPunchListForm.get('resolutionImages')?.reset;
    }
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

  triggerImageUpload(imageType: 'issueImages' | 'resolutionImages'): void {
    if (imageType === 'issueImages' && this.issueImageInput) {
      this.issueImageInput.nativeElement.click();
    } else if (imageType === 'resolutionImages' && this.resolutionImageInput) {
      this.resolutionImageInput.nativeElement.click();
    }
  }

  uploadImage(event: Event, imageType: 'issueImages' | 'resolutionImages'): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        const formArray = imageType === 'issueImages' ? this.issueImagesFormArray : this.resolutionImagesFormArray;
        formArray.push(this.fb.control(reader.result as string));
        this.toastr.success('Image uploaded');
      };

      reader.readAsDataURL(file);
    }
  }
  
  openGallery(imageType: 'issueImages' | 'resolutionImages', images: any[]): void {
    this.galleryImages = images.map(img => ({
      itemImageSrc: img
    }));
  
    if(imageType == 'issueImages'){
      this.isIssueGalleryVisible = true;
    }else{
      this.isResolutionGalleryVisible = true;
    }
  }

  closeImageModal(): void {
    this.isIssueGalleryVisible = false;
    this.isResolutionGalleryVisible = false;
  }

  openDeleteConfirmationDialog(index: number): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.removeIssueArea(index);
      }
    });
  }

  openDeleteConfirmationDialogImages(images: any, type: string): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.removeImages(images, type);
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
        userObj.market,
        userObj.company,
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
  
      if (this.isEditMode) {
        punchList.updatedBy = this.userData.id;
        punchList.updatedDate = new Date().toISOString();
      }

      if(!punchList.createdBy || punchList.createdBy == null)
      {
        punchList.createdBy = this.userData.id;
      }

      if(!punchList.id){
        punchList.id = uuidv4();
      }
  
      this.dialogRef.close(punchList);
    } else {
      console.error('Form is invalid');
      this.toastr.error('Form is invalid. Check required fields');
    }
  }
  
}