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
import { debounceTime, distinctUntilChanged, catchError, of, Observable } from 'rxjs';
import { MapMarkerService } from 'src/app/services/map-marker.service';
// import { GeocodingService } from 'src/app/services/geocoding.service';

@Component({
  selector: 'map-marker-modal',
  templateUrl: './map-marker-modal.component.html',
  styleUrls: ['./map-marker-modal.component.scss']
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
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private dialogRef: MatDialogRef<MapMarkerModalComponent>,
    private dialog: MatDialog,
    private toastr: ToastrService,
    public authService: AuthService,
    private geocodingService: GeocodingService,
    private mapMarkerService: MapMarkerService,
    private modalGalleryService: ModalGalleryService,
    @Inject(MAT_DIALOG_DATA) public data: MapMarker
  ) {}

  ngOnInit(): void {
    this.getSegmentIds();
    this.isEditMode = !!this.data;
    this.isDisabled = !this.authService.isCM();

    this.mapMarkerForm = this.fb.group({
      id: [this.data?.id || ''],
      segmentId: [this.data?.segmentId || '', Validators.required],
      latitude: [this.data?.latitude || '', Validators.required],  // Add latitude
      longitude: [this.data?.longitude || '', Validators.required], // Add longitude
      dateCreated: [this.data?.dateCreated || new Date().toISOString()],
      isActive: [this.data?.isActive || true, Validators.required]
    });
  }

  getSegmentIds(){
    this.mapMarkerService.getSegmentIds().subscribe(values => {
      this.segmentIds = values;
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
  
    this.mapMarkerForm.patchValue({
      streetAddress: streetAddress,
      city: city,
      state: abbreviatedState
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
    
        const mapMarker = new MapMarker(
          formData.id || uuidv4(),
          formData.segmentId,    
          formData.latitude,    
          formData.longitude,  
          formData.isActive,  
          new Date(formData.dateCreated)
        ); 
      this.dialogRef.close(mapMarker);
    } else {
      console.error('Form is invalid');
      this.toastr.error('Form is invalid');
    }
  }

  
}