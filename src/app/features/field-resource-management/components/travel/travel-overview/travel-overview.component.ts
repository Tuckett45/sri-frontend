import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { TravelProfile, GeocodingStatus, PerDiemConfig } from '../../../models/travel.model';
import {
  selectAllTravelProfiles,
  selectTravelStatistics,
  selectTravelLoading,
  selectTravelError,
  selectPerDiemConfig
} from '../../../state/travel/travel.selectors';
import { updatePerDiemConfig, updateTravelFlag } from '../../../state/travel/travel.actions';
import { TravelProfileDialogComponent } from '../travel-profile-dialog/travel-profile-dialog.component';
import { CreateTravelProfileDialogComponent } from '../create-travel-profile-dialog/create-travel-profile-dialog.component';

interface TravelProfileRow {
  technicianId: string;
  address: string;
  city: string;
  willingToTravel: boolean;
  geocodingStatus: GeocodingStatus;
  hasCoordinates: boolean;
}

@Component({
  selector: 'app-travel-overview',
  templateUrl: './travel-overview.component.html',
  styleUrls: ['./travel-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TravelOverviewComponent implements OnInit {
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  stats$!: Observable<any>;
  filteredProfiles$!: Observable<TravelProfileRow[]>;
  perDiemConfig$!: Observable<PerDiemConfig>;

  searchTerm = '';
  statusFilter = '';
  searchTerm$ = new BehaviorSubject<string>('');
  statusFilter$ = new BehaviorSubject<string>('');

  displayedColumns = ['technicianId', 'address', 'city', 'willingToTravel', 'geocodingStatus', 'actions'];

  configForm!: FormGroup;
  editingConfig = false;
  configSaved = false;

  constructor(private store: Store, private fb: FormBuilder, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loading$ = this.store.select(selectTravelLoading);
    this.error$ = this.store.select(selectTravelError);
    this.stats$ = this.store.select(selectTravelStatistics);
    this.perDiemConfig$ = this.store.select(selectPerDiemConfig);

    this.configForm = this.fb.group({
      minimumDistanceMiles: [50, [Validators.required, Validators.min(0)]],
      ratePerMile: [0.655, [Validators.required, Validators.min(0)]],
      flatRateAmount: [null]
    });

    // Sync form with store
    this.perDiemConfig$.pipe(map(c => c)).subscribe(config => {
      if (!this.editingConfig) {
        this.configForm.patchValue({
          minimumDistanceMiles: config.minimumDistanceMiles,
          ratePerMile: config.ratePerMile,
          flatRateAmount: config.flatRateAmount
        }, { emitEvent: false });
      }
    });

    const profiles$ = this.store.select(selectAllTravelProfiles);

    this.filteredProfiles$ = combineLatest([
      profiles$,
      this.searchTerm$,
      this.statusFilter$
    ]).pipe(
      map(([profiles, search, status]) => this.applyFilters(profiles, search, status))
    );
  }

  private applyFilters(profiles: TravelProfile[], search: string, status: string): TravelProfileRow[] {
    let filtered = profiles;

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.technicianId.toLowerCase().includes(term) ||
        p.homeAddress.city.toLowerCase().includes(term) ||
        p.homeAddress.street.toLowerCase().includes(term)
      );
    }

    if (status === 'willing') {
      filtered = filtered.filter(p => p.willingToTravel);
    } else if (status === 'not-willing') {
      filtered = filtered.filter(p => !p.willingToTravel);
    } else if (status === 'geocoded') {
      filtered = filtered.filter(p => p.geocodingStatus === GeocodingStatus.Success);
    } else if (status === 'needs-geocoding') {
      filtered = filtered.filter(p =>
        p.geocodingStatus === GeocodingStatus.NotGeocoded ||
        p.geocodingStatus === GeocodingStatus.Failed
      );
    }

    return filtered.map(p => ({
      technicianId: p.technicianId,
      address: p.homeAddress.street,
      city: `${p.homeAddress.city}, ${p.homeAddress.state} ${p.homeAddress.postalCode}`,
      willingToTravel: p.willingToTravel,
      geocodingStatus: p.geocodingStatus,
      hasCoordinates: p.homeCoordinates !== null
    }));
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.searchTerm$.next(value);
  }

  onStatusFilter(value: string): void {
    this.statusFilter = value;
    this.statusFilter$.next(value);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.searchTerm$.next('');
    this.statusFilter$.next('');
  }

  get hasActiveFilters(): boolean {
    return this.searchTerm !== '' || this.statusFilter !== '';
  }

  startEditConfig(): void {
    this.editingConfig = true;
    this.configSaved = false;
  }

  cancelEditConfig(): void {
    this.editingConfig = false;
    // Reset form to store values
    this.perDiemConfig$.pipe(map(c => c)).subscribe(config => {
      this.configForm.patchValue({
        minimumDistanceMiles: config.minimumDistanceMiles,
        ratePerMile: config.ratePerMile,
        flatRateAmount: config.flatRateAmount
      });
    });
  }

  saveConfig(): void {
    if (this.configForm.valid) {
      const val = this.configForm.value;
      this.store.dispatch(updatePerDiemConfig({
        config: {
          minimumDistanceMiles: val.minimumDistanceMiles,
          ratePerMile: val.ratePerMile,
          flatRateAmount: val.flatRateAmount || null
        }
      }));
      this.editingConfig = false;
      this.configSaved = true;
      setTimeout(() => this.configSaved = false, 3000);
    }
  }

  toggleTravelFlag(row: TravelProfileRow): void {
    this.store.dispatch(updateTravelFlag({
      technicianId: row.technicianId,
      willing: !row.willingToTravel
    }));
  }

  openProfileDialog(row: TravelProfileRow): void {
    this.dialog.open(TravelProfileDialogComponent, {
      data: { technicianId: row.technicianId },
      width: '600px',
      autoFocus: false
    });
  }

  openCreateDialog(): void {
    this.dialog.open(CreateTravelProfileDialogComponent, {
      width: '640px',
      autoFocus: false,
      disableClose: true
    });
  }
}
