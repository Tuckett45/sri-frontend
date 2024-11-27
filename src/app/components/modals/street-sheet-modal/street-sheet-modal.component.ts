import { Component, ElementRef, Inject, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
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

  pmOptions: { name: string, email: string }[] = [];
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
    private http: HttpClient,
    public streetSheetService: StreetSheetService,
    @Inject(MAT_DIALOG_DATA) public data: StreetSheet
  ) {}

  ngOnInit(): void {
    this.fetchPMOptions();
    this.isEditMode = !!this.data;

    this.streetSheetForm = this.fb.group({
      id: [this.data?.id || ''],
      segmentId: [this.data?.segmentId || '', Validators.required],
      pm: [this.data?.pm || '', Validators.required],
      vendorName: [this.data?.vendorName || '', Validators.required],
      streetAddress: [this.data?.streetAddress || '', Validators.required],
      city: [this.data?.city || '', [Validators.required, Validators.pattern('^[a-zA-Z ]*$')]], 
      state: [this.data?.state || '', [Validators.required, Validators.pattern('^[A-Za-z]{2}$')]], 
      deployment: [this.data?.deployment || '', Validators.required],
      date: [this.data?.date || new Date().toISOString(), Validators.required],
      swpppImage: [this.data?.swpppImage || '', Validators.required],
      ppeImage: [this.data?.ppeImage || '', Validators.required],
      trafficControlImage: [this.data?.trafficControlImage || '', Validators.required],
      signageImage: [this.data?.signageImage || '', Validators.required]
    });

    this.streetSheetForm.get('streetAddress')?.valueChanges.pipe(
      debounceTime(300),
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

      const maxFileSizeInMB = 5;
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
    this.pmOptions = [
      { name: 'Austin Tuckett', email: 'pm1@example.com' },
      { name: 'Jake Sergant', email: 'pm2@example.com' },
      { name: 'Britton Mickelson', email: 'pm3@example.com' }
    ];
  }

  onAddressInput(event: any): void {
    const query = event.target.value;
    if (query && query.length > 2) {
      this.isAddressLoading = true;
      this.getAddressSuggestions(query)
        .pipe(
          debounceTime(300), // debounce for better performance
          distinctUntilChanged(),
          catchError(() => {
            this.isAddressLoading = false;
            return of([]); // Return empty if there's an error
          })
        )
        .subscribe(suggestions => {
          // Filter out suggestions with missing required components (house_number, road, city, state)
          this.filteredAddresses = suggestions.filter(suggestion => {
            const address = suggestion.address || {};
            return address.house_number && address.road && address.city && address.state;
          }).map(suggestion => {
            const address = suggestion.address || {};
            // Construct a valid street address
            const streetAddress = address.house_number && address.road 
              ? `${address.house_number} ${address.road}` 
              : address.road || ''; // If no house number, only use road
  
            // Ensure city, state, and abbreviated state are not undefined
            const city = address.city || address.town || '';
            const state = address.state || '';
            const abbreviatedState = this.stateAbbreviations[state] || state || '';
  
            // Construct the formatted address
            const formattedAddress = `${streetAddress}, ${city}, ${abbreviatedState}`.trim();
            return {
              formattedAddress: formattedAddress,  // Ensure empty strings if address is undefined
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
    const streetAddress = suggestion.address.house_number || suggestion.address.house_name ? suggestion.address.house_number + ' ' + suggestion.address.road : suggestion.address.road || suggestion.address.residential;
    const city = suggestion.address.city || suggestion.address.town || suggestion.address.village || suggestion.address.municipality;
    const state = suggestion.address.state;
    const abbreviatedState = this.stateAbbreviations[state] || state;

    this.streetSheetForm.patchValue({
        streetAddress: streetAddress,
        city: city,
        state: abbreviatedState
    });

    this.mapMarker = new MapMarker(
        uuidv4(),
        this.streetSheetForm.controls["id"].value,
        suggestion.lat,
        suggestion.lon,
        true,
        new Date()
    );

    this.filteredAddresses = [];
}
  

//   0:"Object Metal" 
// 1:" 85" 
// 2:" 19th Street" 
// 3:" South Slope" 
// 4:" Sunset Park" 
// 5:" Brooklyn" 
// 6:" Kings County" 
// 7:  " New York" 
// 8:  " 11232" 
// 9:  " United States" 
// length: 10 
// [[Prototype]]
// : 
// Array(0)

  getAddressSuggestions(query: string): Observable<any[]> {
    if (!query) {
      return of([]);
    }
    const url = `https://nominatim.openstreetmap.org/search?addressdetails=1&format=jsonv2&q=${query}&countrycodes=US&layer=address&limit=5`;
    return this.http.get<any[]>(url).pipe(
      catchError((error) => {
        console.error('Error fetching address suggestions:', error);
        return of([]);
      })
    );
  }

  save(): void {
    if (this.streetSheetForm.valid) {
      const streetSheet = this.streetSheetForm.getRawValue();
      if (streetSheet.id === '') {
        streetSheet.id = uuidv4();
        this.mapMarker.streetSheetId = streetSheet.id;
      }
  
      this.streetSheetMap.addMarker(this.mapMarker, streetSheet);

      this.dialogRef.close(streetSheet);
    } else {
      this.toastr.error('Form is invalid');
    }
  }

  closeModal(): void {
    this.dialogRef.close();
  }  
}
