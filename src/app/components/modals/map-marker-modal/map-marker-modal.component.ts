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
// import { GeocodingService } from 'src/app/services/geocoding.service';

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
  reversedAddress: any;

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
    this.segmentIds = this.streetSheets.map(sheet => sheet.segmentId);
    this.isEditMode = !!this.data;
    this.isDisabled = !this.authService.isCM();

    this.mapMarkerForm = this.fb.group({
      id: [''],
      segmentId: ['', Validators.required],
      latitude: ['', Validators.required],  
      longitude: ['', Validators.required], 
      streetAddress: ['', Validators.required], 
      city: ['', Validators.required],  
      state: ['', Validators.required],  
      isActive: [true, Validators.required],
      dateCreated: [new Date().toISOString()],
    });

    this.mapMarkerForm.get('streetAddress')?.valueChanges.pipe(
      debounceTime(1000),
      switchMap((value) => this.getAddressSuggestions(value))
    ).subscribe(suggestions => {
      this.filteredAddresses = suggestions;
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
  
    this.mapMarkerForm.patchValue({
      streetAddress: streetAddress,
      city: city,
      state: abbreviatedState,
      latitude: suggestion.lat,
      longitude: suggestion.lon,
    });
  
    const mapMarker = new MapMarker(
      uuidv4(),
      this.mapMarkerForm.controls["segmentId"].value,
      suggestion.lat,
      suggestion.lon,
      true,
      new Date()
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

  save(): void {
    if (this.mapMarkerForm.valid) {
        const formData = this.mapMarkerForm.value;
    
        if(!this.mapMarker || this.mapMarker == null){
          this.mapMarker = new MapMarker(
            formData.id || uuidv4(),
            formData.segmentId,    
            formData.latitude,    
            formData.longitude,  
            formData.isActive,  
            new Date(formData.dateCreated)); 
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