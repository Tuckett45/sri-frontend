import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { StreetSheetService } from 'src/app/services/street-sheet.service';
import { StreetSheet } from 'src/app/models/street-sheet.model';
import { v4 as uuidv4 } from 'uuid';
import { debounceTime, switchMap, Observable, of, distinctUntilChanged, catchError } from 'rxjs';
import { MapMarker } from 'src/app/models/map-marker.model';
import { StreetSheetMapComponent } from '../../street-sheet/street-sheet-map.component';
import { GeocodingService } from 'src/app/services/geocoding.service';
import { Image, ModalGalleryRef, ModalGalleryService, ModalImage } from '@ks89/angular-modal-gallery';
import { User } from 'src/app/models/user.model';
import { StateAbbreviation } from 'src/app/models/state-abbreviation.enum';

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

  streetSheet: StreetSheet | null = null;
  pmOptions: User[] = [];
  deploymentOptions: string[] = ['Micro tench', 'Mastech', 'Fiber'];

  vendors: string[] = ['Conguex (SCI)', 'Ervin (ECC)', 'Blue Edge (BE)', 'North Star', 'MasTec', 'Bcomm'];

  stateAbbreviations!: StateAbbreviation;

  private addressCache: { [key: string]: any[] } = {};

  @ViewChild('swpppImageInput') swpppImageInput!: ElementRef;
  @ViewChild('ppeImageInput') ppeImageInput!: ElementRef;
  @ViewChild('trafficControlImageInput') trafficControlImageInput!: ElementRef;
  @ViewChild('signageImageInput') signageImageInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private modalGalleryService: ModalGalleryService,
    public streetSheetService: StreetSheetService,
    private geocodingService: GeocodingService,
    @Inject(MAT_DIALOG_DATA) public data: { streetSheet: StreetSheet, pmOptions: User[] },
    private dialogRef: MatDialogRef<StreetSheetModalComponent>
) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.isEditMode = !!this.data?.streetSheet;
    this.pmOptions = this.data?.pmOptions || [];

    this.streetSheetForm = this.fb.group({
      id: [this.data?.streetSheet?.id || uuidv4()],
      segmentId: [this.data?.streetSheet?.segmentId || '', Validators.required],
      pm: [this.data?.streetSheet?.pm || this.data.pmOptions, Validators.required],
      vendorName: [this.data?.streetSheet?.vendorName || '', Validators.required],
      streetAddress: [this.data?.streetSheet?.streetAddress || '', Validators.required],
      city: [this.data?.streetSheet?.city || '', [Validators.required, Validators.pattern('^[a-zA-Z ]*$')]], 
      state: [this.data?.streetSheet?.state || '', [Validators.required, Validators.pattern('^[A-Za-z]{2}$')]], 
      deployment: [this.data?.streetSheet?.deployment || '', Validators.required],
      date: [this.data?.streetSheet?.date || new Date().toISOString(), Validators.required],
      swpppImage: [this.data?.streetSheet?.swpppImage || ''],
      ppeImage: [this.data?.streetSheet?.ppeImage || ''],
      trafficControlImage: [this.data?.streetSheet?.trafficControlImage || ''],
      signageImage: [this.data?.streetSheet?.signageImage || ''],
      marker: [this.data?.streetSheet?.marker || ''],
      createdBy: [this.data?.streetSheet?.createdBy || ''],
      updatedBy: [this.data?.streetSheet?.updatedBy || ''],
      updatedDate: [this.data?.streetSheet?.updatedDate || '']
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
        this.toastr.error('Error converting image');
      };

      reader.readAsDataURL(file);
    }
  }

  removeImage(field: string): void {
    this.streetSheetForm.patchValue({ [field]: null });
    this.toastr.warning(`${field.replace(/([A-Z])/g, ' $1')} removed`);
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
            const abbreviatedState = StateAbbreviation[state as keyof typeof StateAbbreviation] || state || ''; 
  
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
    const abbreviatedState = StateAbbreviation[state as keyof typeof StateAbbreviation] || state || ''; 
  
    debugger;
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
    }
  }

  save(): void {
    if (this.streetSheetForm.valid) {
      const streetSheet = this.streetSheetForm.getRawValue();

      if(this.isEditMode || streetSheet.updatedBy == null){
        streetSheet.updatedBy = this.userData.id
        streetSheet.updatedDate = new Date().toISOString();
      }else{
        streetSheet.createdBy = this.userData.id
      }
  
      this.streetSheetService.saveStreetSheet(streetSheet).subscribe(
        (response) => {
          this.toastr.success('Street Sheet Saved');
          this.dialogRef.close(streetSheet); 
        },
        (error) => {
          this.toastr.error('Error saving Street Sheet');
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
