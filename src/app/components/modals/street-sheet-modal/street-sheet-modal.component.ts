import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { StreetSheetService } from 'src/app/services/street-sheet.service';
import { StreetSheet } from 'src/app/models/street-sheet.model';
import { v4 as uuidv4 } from 'uuid';
import { debounceTime, switchMap, Observable, of, distinctUntilChanged, catchError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { MapMarker } from 'src/app/models/map-marker.model';
import { StreetSheetMapComponent } from '../../street-sheet/street-sheet-map.component';
import { GeocodingService } from 'src/app/services/geocoding.service';
import { Image, ModalGalleryRef, ModalGalleryService, ModalImage } from '@ks89/angular-modal-gallery';
import { User } from 'src/app/models/user.model';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-street-sheet-modal',
  templateUrl: './street-sheet-modal.component.html',
  styleUrls: ['./street-sheet-modal.component.scss']
})
export class StreetSheetModalComponent implements OnInit {
  streetSheetMap!: StreetSheetMapComponent;
  streetSheetForm!: FormGroup;
  mapMarker!: MapMarker;
  isEditMode: boolean = false;
  filteredAddresses: any[] = [];
  isAddressLoading: boolean = false;
  isDisabled: boolean = false;

  galleryImages: Image[] = [];
  userData!: User;

  pmOptions: User[] = [];
  deploymentOptions: string[] = ['Micro tench', 'Mastech', 'Fiber'];

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

  private addressCache: { [key: string]: any[] } = {};

  @ViewChild('swpppImageInput') swpppImageInput!: ElementRef;
  @ViewChild('ppeImageInput') ppeImageInput!: ElementRef;
  @ViewChild('trafficControlImageInput') trafficControlImageInput!: ElementRef;
  @ViewChild('signageImageInput') signageImageInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<StreetSheetModalComponent>,
    private toastr: ToastrService,
    private modalGalleryService: ModalGalleryService,
    public streetSheetService: StreetSheetService,
    private geocodingService: GeocodingService,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: StreetSheet
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.fetchPMOptions();
    this.isEditMode = !!this.data;

    this.streetSheetForm = this.fb.group({
      id: [this.data?.id || uuidv4()],
      segmentId: [this.data?.segmentId || '', Validators.required],
      pm: [this.data?.pm || '', Validators.required],
      vendorName: [this.data?.vendorName || '', Validators.required],
      streetAddress: [this.data?.streetAddress || '', Validators.required],
      city: [this.data?.city || '', [Validators.required, Validators.pattern('^[a-zA-Z ]*$')]], 
      state: [this.data?.state || '', [Validators.required, Validators.pattern('^[A-Za-z]{2}$')]], 
      deployment: [this.data?.deployment || '', Validators.required],
      date: [this.data?.date || new Date().toISOString(), Validators.required],
      swpppImage: [this.data?.swpppImage || ''],
      ppeImage: [this.data?.ppeImage || ''],
      trafficControlImage: [this.data?.trafficControlImage || ''],
      signageImage: [this.data?.signageImage || ''],
      marker: [this.data?.marker || ''],
      createdBy: [this.data?.createdBy || ''],
      updatedBy: [this.data?.updatedBy || ''],
      updatedDate: [this.data?.updatedDate || '']
    });

    this.streetSheetForm.get('streetAddress')?.valueChanges.pipe(
      debounceTime(1000),
      switchMap((value) => this.getAddressSuggestions(value))
    ).subscribe(suggestions => {
      this.filteredAddresses = suggestions;
    });
  }

  triggerSWPPPImageUpload(): void {
    this.swpppImageInput.nativeElement.click();
  }

  triggerPPEImageUpload(): void {
    this.ppeImageInput.nativeElement.click();
  }

  triggerTrafficControlImageUpload(): void {
    this.trafficControlImageInput.nativeElement.click();
  }

  triggerSignageImageUpload(): void {
    this.signageImageInput.nativeElement.click();
  }

  uploadImage(event: Event, field: string): void {
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
        this.streetSheetForm.patchValue({ [field]: base64String });
        this.toastr.success(`${field.replace(/([A-Z])/g, ' $1')} uploaded`);
      };

      reader.onerror = (error) => {
        console.error('Error converting image: ', error);
      };

      reader.readAsDataURL(file);
    }
  }

  removeImage(field: string): void {
    this.streetSheetForm.patchValue({ [field]: null });
    this.toastr.warning(`${field.replace(/([A-Z])/g, ' $1')} removed`);
  }

  fetchPMOptions() {
    this.authService.getUserByRole('PM').subscribe(users => {
      this.pmOptions = users;
    })
  }

  onAddressInput(event: any): void {
    const query = event.target.value;
    if (query && query.length > 2) {
      this.isAddressLoading = true;
      this.getAddressSuggestions(query)
        .pipe(
          debounceTime(300),
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
  
  trackByFn(index: number, item: any): any {
    return item.formattedAddress;
  }

  selectAddress(suggestion: any): void {
    const streetAddress = suggestion.address.house_number
      ? suggestion.address.house_number + ' ' + suggestion.address.road
      : suggestion.address.road || suggestion.address.residential;
  
    const city = suggestion.address.city || suggestion.address.town || suggestion.address.village || suggestion.address.municipality;
    const state = suggestion.address.state;
    const abbreviatedState = this.stateAbbreviations[state] || state;
  
    this.streetSheetForm.patchValue({
      streetAddress: streetAddress,
      city: city,
      state: abbreviatedState
    });
  
    const mapMarker = new MapMarker(
      uuidv4(),
      this.streetSheetForm.controls["segmentId"].value,
      suggestion.lat,
      suggestion.lon,
      true,
      new Date()
    );

    this.mapMarker = mapMarker;
    this.streetSheetForm.patchValue({
      marker: [mapMarker]
    });

    this.filteredAddresses = [];
  }
  

  getAddressSuggestions(query: string): Observable<any[]> {
    if (!query) return of([]);
    
    return this.geocodingService.geocodeAddress(query);  // Use Geocoding Service here
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

  save(): void {
    if (this.streetSheetForm.valid) {
      const streetSheet = this.streetSheetForm.getRawValue();

      if(this.isEditMode || streetSheet.createdBy == null){
        streetSheet.updatedBy = this.userData.id
        streetSheet.updatedDate = new Date().toISOString();
      }else{
        streetSheet.createdBy = this.userData.id
      }
  
      this.streetSheetService.saveStreetSheet(streetSheet).subscribe(
        (response) => {
          this.toastr.success('Street Sheet saved');
          this.dialogRef.close(streetSheet); 
        },
        (error) => {
          this.toastr.error('Error saving Street Sheet');
          console.error(error);
        }
      );
    } else {
      this.toastr.error('Form is invalid');
    }
  }
  

  closeModal(): void {
    this.dialogRef.close();
  }  
}
