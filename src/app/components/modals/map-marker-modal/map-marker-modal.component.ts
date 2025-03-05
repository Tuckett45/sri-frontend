import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { AuthService } from 'src/app/services/auth.service';
import { v4 as uuidv4 } from 'uuid';import { HttpClient } from '@angular/common/http';import { ModalGalleryService } from '@ks89/angular-modal-gallery';
import { User } from 'src/app/models/user.model';
import { MapMarker } from 'src/app/models/map-marker.model';
import { GeocodingService } from 'src/app/services/geocoding.service';
import { debounceTime, distinctUntilChanged, catchError, of, Observable, switchMap } from 'rxjs';
import { MapMarkerService } from 'src/app/services/map-marker.service';
import { StreetSheet } from 'src/app/models/street-sheet.model';
import { StateAbbreviation } from 'src/app/models/state-abbreviation.enum';

@Component({
  selector: 'map-marker-modal',
  templateUrl: './map-marker-modal.component.html',
  styleUrls: ['./map-marker-modal.component.scss'],
  standalone: false
})
export class MapMarkerModalComponent implements OnInit {
  mapMarkerForm!: FormGroup;
  mapMarker!: MapMarker;
  isEditMode: boolean = false;
  isDisabled: boolean = false;
  displayModal: boolean = false;
  userData!: User;
  filteredAddresses: any[] = [];
  isAddressLoading: boolean = false;
  segmentIds: string[] = [];
  vendors: string[] = [];
  createdByUsers: string[] = [];
  streetSheetId!: string;
  reversedAddress: any;

  selectedSegmentId!: string;
  selectedVendor!: string;
  selectedCreatedBy!: string;
  stateAbbreviations!: StateAbbreviation;
  
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private dialogRef: MatDialogRef<MapMarkerModalComponent>,
    private dialog: MatDialog,
    private toastr: ToastrService,
    public authService: AuthService,
    private geocodingService: GeocodingService,
    private mapMarkerService: MapMarkerService,
    @Inject(MAT_DIALOG_DATA) public data: MapMarker,
    @Inject(MAT_DIALOG_DATA) public streetSheets: StreetSheet[]
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.segmentIds = [...new Set(this.streetSheets.map(sheet => sheet.segmentId))].sort();
    this.vendors = this.streetSheets.map(sheet => sheet.vendorName);
    this.createdByUsers = this.streetSheets.map(sheet => sheet.createdBy).filter((createdBy): createdBy is string => createdBy !== undefined);
    this.isEditMode = !!this.data;
    this.isDisabled = !this.authService.isCM();

    this.mapMarkerForm = this.fb.group({
      id: [''],
      segmentId: ['', Validators.required],
      streetSheetId: [''],
      vendor: [''],
      createdBy: [''],
      latitude: ['', Validators.required],  
      longitude: ['', Validators.required], 
      streetAddress: ['', Validators.required], 
      city: ['', Validators.required],  
      state: ['', Validators.required]
    });

    this.mapMarkerForm.get('segmentId')?.valueChanges.subscribe(segmentId => {
      this.selectedSegmentId = segmentId;
      this.updateVendorsAndUsers(); 
    });

    this.mapMarkerForm.get('vendor')?.valueChanges.subscribe(vendor => {
      this.selectedVendor = vendor;
      this.updateStreetSheetId();
    });

    this.mapMarkerForm.get('createdBy')?.valueChanges.subscribe(createdBy => {
      this.selectedCreatedBy = createdBy;
      this.updateStreetSheetId();
    });

    if (this.data.latitude !== undefined) {
      this.reverseGeocode(this.data.latitude, this.data.longitude);
    }
  }

  // loadMapMarkerData(mapMarker: MapMarker): void {
  //   this.mapMarkerForm.patchValue({
  //     id: mapMarker.id,
  //     segmentId: mapMarker.segmentId,
  //     latitude: mapMarker.latitude,
  //     longitude: mapMarker.longitude,
  //     isActive: mapMarker.isActive,
  //     dateCreated: mapMarker.dateCreated.toISOString(),
  //   });    
  //   this.reverseGeocode(mapMarker.latitude, mapMarker.longitude);
  // }

  updateVendorsAndUsers(): void {
    const filteredStreetSheets = this.streetSheets.filter(sheet => sheet.segmentId === this.selectedSegmentId);

    this.vendors = filteredStreetSheets.map(sheet => sheet.vendorName);
    this.createdByUsers = filteredStreetSheets
      .map(sheet => sheet.createdBy)
      .filter((createdBy): createdBy is string => createdBy !== undefined);
  }

  updateStreetSheetId(): void {
    if (this.selectedSegmentId && this.selectedVendor && this.selectedCreatedBy) {
      const matchingSheet = this.streetSheets.find(sheet =>
        sheet.segmentId === this.selectedSegmentId &&
        sheet.vendorName === this.selectedVendor &&
        sheet.createdBy === this.selectedCreatedBy
      );
      this.streetSheetId = matchingSheet ? matchingSheet.id : '';
    } else {
      this.streetSheetId = '';
    }
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
  
  reverseGeocode(latitude: number, longitude: number): void {
    this.geocodingService.reverseGeocode(latitude, longitude).subscribe(suggestion => {
        const address = suggestion.address || {};
        const streetAddress = address.house_number && address.road 
          ? `${address.house_number} ${address.road}` 
          : address.road || '';

        const city = address.city || address.town || '';
        const state = address.state || '';
        const abbreviatedState = StateAbbreviation[state as keyof typeof StateAbbreviation] || state || ''; 

        const formattedAddress = `${streetAddress}, ${city}, ${abbreviatedState}`.trim();
        this.reversedAddress = formattedAddress;
        return this.reversedAddress;
      });
  }

  onAddressInput(event: any): void {
    const query = event.target.value;
    if (query && query.length > 14) {
      this.isAddressLoading = true;
      this.geocodingService.geocodeAddress(query).pipe(
        debounceTime(4000),
        distinctUntilChanged(),
        catchError(() => {
          this.isAddressLoading = false;
          return of([]);
        })
      ).subscribe(suggestions => {
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
  
        this.isAddressLoading = false;
      });
    } else {
      this.filteredAddresses = [];
    }
  }

  selectAddress(suggestion: any): void {
    const address = suggestion.original.address_components || [];
    const streetAddress = address.find((component: { types: string | string[]; }) => component.types.includes('street_number'))?.long_name
                          + ' ' + 
                          address.find((component: { types: string | string[]; }) => component.types.includes('route'))?.long_name || '';
  
    const city = address.find((component: { types: string | string[]; }) => component.types.includes('locality'))?.long_name || ''; 
    const state = address.find((component: { types: string | string[]; }) => component.types.includes('administrative_area_level_1'))?.long_name || '';  
    const abbreviatedState = StateAbbreviation[state as keyof typeof StateAbbreviation] || state || ''; 
  
    this.mapMarkerForm.patchValue({
      streetAddress: streetAddress.trim(),
      city: city,
      state: abbreviatedState,
      latitude: suggestion.lat,
      longitude: suggestion.lon,
    });
  
    const mapMarker = new MapMarker(
      uuidv4(),
      this.streetSheetId,
      this.mapMarkerForm.controls["segmentId"].value,
      suggestion.lat,
      suggestion.lon,
      true,
      new Date(),
      this.userData.id
    );
  
    this.mapMarker = mapMarker;
    this.filteredAddresses = [];
  }
  
  

  getAddressSuggestions(query: string): Observable<any[]> {
    if (!query) return of([]);
    
    return this.geocodingService.geocodeAddress(query);  
  }

  close(): void {
    this.dialogRef.close();
  }

  checkValidForm(): void {
    if(this.mapMarker == undefined){
      this.geocodingService.geocodeAddress(this.mapMarkerForm.controls["streetAddress"].value + this.mapMarkerForm.controls["city"].value + this.mapMarkerForm.controls["state"].value)
      .subscribe(suggestions => {
        this.filteredAddresses = suggestions.results.map((result: { address_components: any[]; geometry: { location: { lat: any; lng: any; }; }; }) => {
          const address = result.address_components || [];
          const streetAddress = address.find((component: { types: string | string[]; }) => component.types.includes('street_number'))?.long_name 
                                + ' ' + 
                                address.find((component: { types: string | string[]; }) => component.types.includes('route'))?.long_name || '';
  
          const city = address.find((component: { types: string | string[]; }) => component.types.includes('locality'))?.long_name || ''; 
          const state = address.find((component: { types: string | string[]; }) => component.types.includes('administrative_area_level_1'))?.long_name || '';  
          const abbreviatedState = StateAbbreviation[state as keyof typeof StateAbbreviation] || state || ''; 
  
          const formattedAddress = `${streetAddress}, ${city}, ${abbreviatedState}`.trim();
          
          this.mapMarkerForm.patchValue({
            streetAddress: formattedAddress.trim(),
            city: city,
            state: abbreviatedState,
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
          });
        
          const mapMarker = new MapMarker(
            uuidv4(),
            this.streetSheetId,
            this.mapMarkerForm.controls["segmentId"].value,
            result.geometry.location.lat,
            result.geometry.location.lng,
            true,
            new Date(),
            this.userData.id
          );

          this.mapMarker = mapMarker;

          this.save();
        });
      });
    }
    else{
      this.save();
    }
  }

  save(): void {
    if (this.mapMarkerForm.valid) {
      if(this.mapMarker.createdBy == '' || this.mapMarker.createdBy == null){
        this.mapMarker.createdBy = this.userData.id;
      }

      this.mapMarkerService.addMapMarker(this.mapMarker).subscribe(
        () => {
          this.toastr.success('Map Marker Added');
          this.dialogRef.close(this.mapMarker);
        },
        (error) => {
          this.toastr.error('Error adding Map Marker');
        }
      )
    } else {
      this.toastr.error('Form is invalid');
    }
  }  
}