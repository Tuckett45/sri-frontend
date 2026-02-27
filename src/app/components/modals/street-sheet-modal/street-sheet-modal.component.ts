import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { StreetSheetService } from 'src/app/services/street-sheet.service';
import { StreetSheet } from 'src/app/models/street-sheet.model';
import { v4 as uuidv4 } from 'uuid';
import { debounceTime, switchMap, Observable, of, distinctUntilChanged, catchError, startWith, map } from 'rxjs';
import { MapMarker } from 'src/app/models/map-marker.model';
import { StreetSheetMapComponent } from '../../street-sheet/street-sheet-map.component';
import { GeocodingService } from 'src/app/services/geocoding.service';
import { Image, ModalGalleryRef, ModalGalleryService, ModalImage } from '@ks89/angular-modal-gallery';
import { User } from 'src/app/models/user.model';
import { StateAbbreviation } from 'src/app/models/state-abbreviation.enum';

@Component({
  selector: 'app-street-sheet-modal',
  templateUrl: './street-sheet-modal.component.html',
  styleUrls: ['./street-sheet-modal.component.scss'],
  standalone: false
})
export class StreetSheetModalComponent implements OnInit {
  streetSheetMap!: StreetSheetMapComponent;
  streetSheetForm!: FormGroup;
  mapMarker!: MapMarker;
  isEditMode: boolean = false;
  filteredAddresses: any[] = [];
  isAddressLoading: boolean = false;
  isDisabled: boolean = false;
  isLocating = false;

  galleryImages: Image[] = [];
  imageFiles: { [key: string]: File } = {};               // actual files for submission
  imagePreviews: { [key: string]: string } = {}; 
  userData!: User;
  filteredPmOptions!: Observable<{ name: string }[]>;

  streetSheet: StreetSheet | null = null;
  pmOptions: User[] = [];

  deploymentOptions: string[] = ['Fiber Installation', 'Prelim Walk', 'Micro-trench', 'Mastic/Sealant', 'Bore', 'Vault Installation', 'DB Installation', 'Other'];

  equipmentOptions: string[] = ['Saws', 'Bore Rigs', 'Splicing equipment', 'Mini Excavators', 'Dump Trailers', 'TCP Equipment', 'Box Crew Equipment', 'Other'];

  vendors: string[] = ['Congruex (SCI)', 'Ervin (ECC)', 'Blue Edge (BE)', 'North Star', 'MasTec', 'Bcomm', 'M&J Enterprises Construction'];

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

    // ✅ Create the form first
    this.streetSheetForm = this.fb.group({
      id: [this.data?.streetSheet?.id || uuidv4()],
      segmentId: [this.data?.streetSheet?.segmentId || '', Validators.required],
      pm: [this.data?.streetSheet?.pm || ''],
      vendorName: [this.data?.streetSheet?.vendorName || '', Validators.required],
      streetAddress: [this.data?.streetSheet?.streetAddress || '', Validators.required],
      city: [this.data?.streetSheet?.city || '', [Validators.required, Validators.pattern('^[a-zA-Z ]*$')]], 
      state: [this.data?.streetSheet?.state || '', [Validators.required, Validators.pattern('^[A-Za-z]{2}$')]], 
      deployment: [this.data?.streetSheet?.deployment || '', Validators.required],
      equipment: [
        this.data?.streetSheet?.equipment 
          ? this.data.streetSheet.equipment.split(',').map((e: string) => e.trim()) 
          : [], 
        Validators.required
      ],
      date: [this.data?.streetSheet?.date ? new Date(this.data.streetSheet.date) : new Date(), Validators.required],
      additionalConcerns: [this.data?.streetSheet?.additionalConcerns || ''],
      swpppImage: [this.data?.streetSheet?.swpppImage || ''],
      ppeImage: [this.data?.streetSheet?.ppeImage || ''],
      trafficControlImage: [this.data?.streetSheet?.trafficControlImage || ''],
      signageImage: [this.data?.streetSheet?.signageImage || ''],
      marker: [this.data?.streetSheet?.marker || ''],
      createdBy: [this.data?.streetSheet?.createdBy || ''],
      updatedBy: [this.data?.streetSheet?.updatedBy || ''],
      updatedDate: [this.data?.streetSheet?.updatedDate || '']
    });

    // ✅ THEN define your filter observable
    this.filteredPmOptions = this.streetSheetForm.get('pm')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || ''))
    );
  }

  private _filter(value: string): User[] {
    const filterValue = value.toLowerCase();
    return this.pmOptions.filter(pm =>
      pm.name?.toLowerCase().includes(filterValue)
    );
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
  
      const maxFileSizeInMB = 15;
      const maxFileSizeInBytes = maxFileSizeInMB * 1024 * 1024;
  
      if (file.size > maxFileSizeInBytes) {
        this.toastr.error(`File size should not exceed ${maxFileSizeInMB} MB`);
        return;
      }
  
      this.imageFiles[field] = file;
  
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviews[field] = reader.result as string; 
      };
      reader.readAsDataURL(file);
  
      this.toastr.success(`${field.replace(/([A-Z])/g, ' $1')} uploaded`);
    }
  }
  
  removeImage(field: string): void {
    this.streetSheetForm.patchValue({ [field]: null });
    delete this.imagePreviews[field];
    delete this.imageFiles[field];
    this.toastr.warning(`${field.replace(/([A-Z])/g, ' $1')} removed`);
  }

  onAddressInput(event: any): void {
    const query = event.target.value;
    
    // Debug logging for iOS issues
    console.log('Address input event:', { 
      type: event.type, 
      value: query, 
      length: query?.length,
      userAgent: navigator.userAgent 
    });
    
    // Reduced minimum length from 14 to 5 characters for better mobile UX
    if (query && query.length > 5) {
      this.isAddressLoading = true;
      this.geocodingService.geocodeAddress(query).pipe(
        debounceTime(800), // Reduced from 4000ms to 800ms for faster response
        distinctUntilChanged(),
        catchError((err) => {
          console.error('Address search error:', err);
          this.isAddressLoading = false;
          this.toastr.warning('Unable to search addresses. Please try again or enter manually.');
          return of({ results: [], status: 'ERROR' });
        })
      ).subscribe(suggestions => {
        this.isAddressLoading = false;
        
        console.log('Address suggestions received:', suggestions);
        
        // Check if we got valid results
        if (suggestions && suggestions.results && suggestions.results.length > 0) {
          this.filteredAddresses = suggestions.results.map((result: { address_components: any[]; geometry: { location: { lat: any; lng: any; }; }; }) => {
            
            const address = result.address_components || [];
            const streetAddress = address.find((component: { types: string | string[]; }) => component.types.includes('street_number'))?.long_name 
                                  + ' ' + 
                                  address.find((component: { types: string | string[]; }) => component.types.includes('route'))?.long_name || '';
            
            const city = address.find((component: { types: string | string[]; }) => component.types.includes('locality'))?.long_name || ''; 
            const state = address.find((component: { types: string | string[]; }) => component.types.includes('administrative_area_level_1'))?.long_name || '';  
            const abbreviatedState = StateAbbreviation[state as keyof typeof StateAbbreviation] || state || ''; 
            
            const formattedAddress = `${streetAddress}, ${city}, ${abbreviatedState}`.trim();
            
            return {
              formattedAddress: formattedAddress,
              original: result,
              lat: result.geometry.location.lat,
              lon: result.geometry.location.lng
            };
          });
          
          console.log('Filtered addresses:', this.filteredAddresses.length);
        } else {
          // No results found
          this.filteredAddresses = [];
          if (suggestions.status === 'ZERO_RESULTS') {
            // Don't show error for zero results, just clear suggestions
            console.log('No address suggestions found for:', query);
          } else if (suggestions.status === 'ERROR') {
            console.error('Geocoding API error:', suggestions.error);
          }
        }
      });
    } else {
      this.filteredAddresses = [];
      this.isAddressLoading = false;
    }
  }
  
  
  trackByFn(index: number, item: any): any {
    return item.formattedAddress;
  }

  selectAddress(suggestion: any): void {
    const address = suggestion.original.address_components || [];
    const streetAddress = address.find((component: { types: string | string[]; }) => component.types.includes('street_number'))?.long_name
                          + ' ' + 
                          address.find((component: { types: string | string[]; }) => component.types.includes('route'))?.long_name || '';
  
    const city = address.find((component: { types: string | string[]; }) => component.types.includes('locality'))?.long_name || ''; 
    const state = address.find((component: { types: string | string[]; }) => component.types.includes('administrative_area_level_1'))?.long_name || '';  
    const abbreviatedState = StateAbbreviation[state as keyof typeof StateAbbreviation] || state || ''; 
  
    this.streetSheetForm.patchValue({
      streetAddress: streetAddress.trim(),
      city: city,
      state: abbreviatedState
    });
  
    const mapMarker = new MapMarker(
      uuidv4(),
      this.streetSheetForm.controls["id"].value,
      this.streetSheetForm.controls["segmentId"].value,
      suggestion.lat,
      suggestion.lon,
      true,
      new Date(),
      this.userData.id
    );
  
    this.mapMarker = mapMarker;
  
    this.streetSheetForm.patchValue({
      marker: [mapMarker]
    });
  
    this.filteredAddresses = [];
  }

  getAddressSuggestions(query: string): Observable<any[]> {
    if (!query) return of([]);
    
    return this.geocodingService.geocodeAddress(query);
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
        new Date(userObj.createdDate),
        userObj.isApproved,
        userObj.approvalToken 
      );
    }
  }

  autofillLocationFromBrowser(): void {
    if (!navigator.geolocation) {
      this.toastr.warning('Geolocation is not supported in this browser.');
      return;
    }

    this.isLocating = true;
    this.toastr.info('Getting your location...', '', { timeOut: 2000 });
    
    // Add timeout and high accuracy options for better mobile performance
    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 second timeout
      maximumAge: 0 // Don't use cached position
    };

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        this.geocodingService.reverseGeocode(latitude, longitude).subscribe({
          next: response => {
            this.isLocating = false;
            const parts = this.extractAddressParts(response);
            if (parts) {
              this.streetSheetForm.patchValue({
                streetAddress: parts.street,
                city: parts.city,
                state: parts.state
              });
              this.attachMarkerFromCoords(latitude, longitude);
              this.toastr.success('Location filled successfully!');
            } else {
              this.toastr.warning('Could not determine your address. Please enter manually.');
            }
          },
          error: (err) => {
            this.isLocating = false;
            console.error('Geocoding error:', err);
            this.toastr.error('Unable to fetch your location. Please try again or enter manually.');
          }
        });
      },
      (error) => {
        this.isLocating = false;
        let errorMessage = 'Location access was denied.';
        
        // Provide specific error messages based on error code
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access was denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your device settings.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
        
        this.toastr.warning(errorMessage, '', { timeOut: 5000 });
      },
      options
    );
  }

  private extractAddressParts(geoResponse: any): { street: string; city: string; state: string } | null {
    const candidates = geoResponse?.results || [];
    if (!candidates.length) {
      return null;
    }

    const bestResult = candidates.find((result: any) => (result.geometry?.location_type || '') === 'ROOFTOP') || candidates[0];
    const address = bestResult.address_components || [];

    const streetAddress =
      (address.find((component: any) => (component.types || []).includes('street_number'))?.long_name || '') +
      ' ' +
      (address.find((component: any) => (component.types || []).includes('route'))?.long_name || '');
    const city = address.find((component: any) => (component.types || []).includes('locality'))?.long_name || '';
    const stateName =
      address.find((component: any) => (component.types || []).includes('administrative_area_level_1'))?.long_name || '';
    const abbreviatedState = StateAbbreviation[stateName as keyof typeof StateAbbreviation] || stateName || '';

    if (!streetAddress.trim() && !city && !abbreviatedState) {
      return null;
    }

    return {
      street: streetAddress.trim(),
      city,
      state: abbreviatedState
    };
  }

  private attachMarkerFromCoords(latitude: number, longitude: number): void {
    const segmentId = this.streetSheetForm.controls['segmentId'].value || 'Pending Segment';
    const marker = new MapMarker(
      uuidv4(),
      this.streetSheetForm.controls['id'].value,
      segmentId,
      latitude,
      longitude,
      true,
      new Date(),
      this.userData?.id
    );

    this.mapMarker = marker;
    this.streetSheetForm.patchValue({
      marker: [marker]
    });
  }

  save(): void {
    console.log('💾 Save button clicked');
    console.log('📋 Form valid:', this.streetSheetForm.valid);
    console.log('📋 Form errors:', this.getFormValidationErrors());
    
    if (this.streetSheetForm.valid) {

      const streetSheet = {
        ...this.streetSheetForm.value,
        equipment: Array.isArray(this.streetSheetForm.value.equipment) && this.streetSheetForm.value.equipment.length > 0
          ? this.streetSheetForm.value.equipment.join(', ')
          : this.streetSheetForm.value.equipment // Keep as-is if already a string or empty
      };

      if(Array.isArray(streetSheet.pm)){
        streetSheet.pm = null;
      }

      if(this.isEditMode || streetSheet.updatedBy == null){
        streetSheet.updatedBy = this.userData.id
        streetSheet.updatedDate = new Date().toISOString();
      }else{
        streetSheet.createdBy = this.userData.id
        // Always set updatedDate to avoid backend validation error
        streetSheet.updatedDate = new Date().toISOString();
      }
  
      const formData = new FormData();
  
      const formValue = streetSheet;
      
      // Validate that we have required data
      if (!formValue.id || !formValue.segmentId || !formValue.vendorName || 
          !formValue.streetAddress || !formValue.city || !formValue.state || 
          !formValue.deployment || !formValue.equipment || !formValue.date) {
        console.error('❌ Missing required fields:', {
          id: !!formValue.id,
          segmentId: !!formValue.segmentId,
          vendorName: !!formValue.vendorName,
          streetAddress: !!formValue.streetAddress,
          city: !!formValue.city,
          state: !!formValue.state,
          deployment: !!formValue.deployment,
          equipment: !!formValue.equipment,
          date: !!formValue.date
        });
        this.toastr.error('Please fill in all required fields');
        return;
      }
      
      const normalizedMarkers = Array.isArray(formValue.marker)
        ? formValue.marker.map((marker: MapMarker) => ({
            ...marker,
            segmentId: formValue.segmentId || marker.segmentId || 'Pending Segment',
            streetSheetId: formValue.id
          }))
        : [];
      // Append text fields (case-sensitive field names for backend)
      // All required fields must be present
      formData.append('Id', formValue.id);
      formData.append('SegmentId', formValue.segmentId);
      formData.append('PM', formValue.pm || ''); // Can be empty
      formData.append('VendorName', formValue.vendorName);
      formData.append('StreetAddress', formValue.streetAddress);
      formData.append('City', formValue.city);
      formData.append('State', formValue.state);
      formData.append('Deployment', formValue.deployment);
      formData.append('Equipment', formValue.equipment);
      formData.append('Date', formValue.date.toISOString());
      formData.append('AdditionalConcerns', formValue.additionalConcerns || '');
      formData.append('CreatedBy', formValue.createdBy || this.userData.id);
      
      // UpdatedBy and UpdatedDate - backend tries to parse UpdatedDate even if nullable
      // So we must always send a valid date
      formData.append('UpdatedBy', formValue.updatedBy || '');
      formData.append('UpdatedDate', formValue.updatedDate || new Date().toISOString());
      
      // MarkerJson is required
      formData.append('MarkerJson', JSON.stringify(normalizedMarkers));
      
      // Append files only if they exist (avoid appending undefined)
      if (this.imageFiles['SWPPPImage']) {
        formData.append('SWPPPImage', this.imageFiles['SWPPPImage']);
      }
      if (this.imageFiles['PPEImage']) {
        formData.append('PPEImage', this.imageFiles['PPEImage']);
      }
      if (this.imageFiles['TrafficControlImage']) {
        formData.append('TrafficControlImage', this.imageFiles['TrafficControlImage']);
      }
      if (this.imageFiles['SignageImage']) {
        formData.append('SignageImage', this.imageFiles['SignageImage']);
      }
  
      console.log('📤 Submitting street sheet:', {
        segmentId: formValue.segmentId,
        pm: formValue.pm,
        vendorName: formValue.vendorName,
        streetAddress: formValue.streetAddress,
        city: formValue.city,
        state: formValue.state,
        deployment: formValue.deployment,
        equipment: formValue.equipment,
        hasMarker: normalizedMarkers.length > 0,
        markerDetails: normalizedMarkers,
        imageCount: Object.keys(this.imageFiles).length,
        createdBy: formValue.createdBy || this.userData.id,
        updatedBy: formValue.updatedBy || ''
      });

      // Log FormData contents for debugging
      console.log('📦 FormData contents:');
      formData.forEach((value, key) => {
        if (value instanceof File) {
          console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });

      this.streetSheetService.saveStreetSheet(formData).subscribe(
        (response: StreetSheet) => {
          console.log('✅ Street sheet saved successfully:', response);
          this.toastr.success('Street Sheet Saved');
          this.dialogRef.close(response); 
        },
        (error) => {
          console.error('❌ Error saving street sheet:', error);
          console.error('Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });
          this.toastr.error(`Error saving Street Sheet: ${error.message || 'Unknown error'}`);
        }
      );
    } else {
      console.warn('⚠️ Form is invalid - cannot save');
      this.toastr.error('Please fill in all required fields');
      this.markFormGroupTouched(this.streetSheetForm);
    }
  }

  // Helper method to get form validation errors
  private getFormValidationErrors(): any {
    const errors: any = {};
    Object.keys(this.streetSheetForm.controls).forEach(key => {
      const control = this.streetSheetForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  // Helper method to mark all fields as touched to show validation errors
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  

  closeModal(): void {
    this.dialogRef.close();
  }  
}
