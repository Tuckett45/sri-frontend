import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter, take } from 'rxjs/operators';

import {
  TravelProfile,
  GeocodingStatus,
  Address,
  Coordinates,
  TravelPreferences,
  TransportationMode
} from '../../../models/travel.model';
import * as TravelActions from '../../../state/travel/travel.actions';
import {
  selectTravelProfile,
  selectGeocodingStatus,
  selectIsGeocodingInProgress,
  selectTravelLoading,
  selectTravelError
} from '../../../state/travel/travel.selectors';
import { PermissionService } from '../../../../../services/permission.service';
import { CreateTravelProfileDialogComponent } from '../create-travel-profile-dialog/create-travel-profile-dialog.component';

@Component({
  selector: 'app-technician-travel-profile',
  templateUrl: './technician-travel-profile.component.html',
  styleUrls: ['./technician-travel-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TechnicianTravelProfileComponent implements OnInit, OnDestroy {
  @Input() technicianId!: string;

  travelProfile$!: Observable<TravelProfile | null>;
  geocodingStatus$!: Observable<GeocodingStatus>;
  geocodingInProgress$!: Observable<boolean>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;

  addressForm!: FormGroup;
  preferencesForm!: FormGroup;
  canEdit = false;
  creating = false;
  isProfileNotFound = false;

  readonly GeocodingStatus = GeocodingStatus;
  readonly TransportationMode = TransportationMode;

  historyColumns = ['travelDate', 'clientName', 'destination', 'distanceMiles', 'drivingTimeMinutes', 'perDiem'];

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private fb: FormBuilder,
    private permissionService: PermissionService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadProfile();
    this.setupObservables();
    this.checkPermissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    this.addressForm = this.fb.group({
      street: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      state: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}$/)]],
      postalCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]]
    });

    this.preferencesForm = this.fb.group({
      maxTravelRadiusMiles: [null],
      preferredTransportation: [TransportationMode.Any],
      notes: ['']
    });
  }

  private loadProfile(): void {
    this.store.select(selectTravelProfile(this.technicianId)).pipe(
      take(1)
    ).subscribe(profile => {
      if (!profile) {
        this.store.dispatch(TravelActions.loadTravelProfile({ technicianId: this.technicianId }));
      }
    });
  }

  private setupObservables(): void {
    this.travelProfile$ = this.store.select(selectTravelProfile(this.technicianId));
    this.geocodingStatus$ = this.store.select(selectGeocodingStatus(this.technicianId));
    this.geocodingInProgress$ = this.store.select(selectIsGeocodingInProgress(this.technicianId));
    this.loading$ = this.store.select(selectTravelLoading);
    this.error$ = this.store.select(selectTravelError);

    // Track 404 errors to show create CTA
    this.error$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      this.isProfileNotFound = error === 'Travel profile not found';
      this.cdr.markForCheck();
    });

    // Populate forms when profile loads
    this.travelProfile$.pipe(
      takeUntil(this.destroy$),
      filter(profile => profile !== null)
    ).subscribe(profile => {
      this.isProfileNotFound = false;
      if (profile?.homeAddress) {
        this.addressForm.patchValue(profile.homeAddress, { emitEvent: false });
      }
      if (profile?.preferences) {
        this.preferencesForm.patchValue(profile.preferences, { emitEvent: false });
      }
      this.cdr.markForCheck();
    });
  }

  private checkPermissions(): void {
    this.permissionService.getCurrentUser().pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      const isAdmin = this.permissionService.checkPermission(user, 'technicians', 'update');
      const isOwnProfile = user?.id === this.technicianId;
      this.canEdit = isAdmin || isOwnProfile;
    });
  }

  createProfile(): void {
    const dialogRef = this.dialog.open(CreateTravelProfileDialogComponent, {
      width: '640px',
      autoFocus: false,
      disableClose: true,
      data: { technicianId: this.technicianId }
    });

    dialogRef.afterClosed().pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result) {
        // Reload the profile after dialog closes with success
        this.store.dispatch(TravelActions.loadTravelProfile({ technicianId: this.technicianId }));
      }
    });
  }

  toggleTravelFlag(profile: TravelProfile): void {
    if (!this.canEdit) return;
    this.store.dispatch(TravelActions.updateTravelFlag({
      technicianId: this.technicianId,
      willing: !profile.willingToTravel
    }));
  }

  updateHomeAddress(): void {
    if (!this.canEdit || this.addressForm.invalid) return;
    const address: Address = this.addressForm.value;
    this.store.dispatch(TravelActions.updateHomeAddress({
      technicianId: this.technicianId,
      address
    }));
  }

  updatePreferences(): void {
    if (!this.canEdit || this.preferencesForm.invalid) return;
    const preferences: TravelPreferences = this.preferencesForm.value;
    this.store.dispatch(TravelActions.updateTravelPreferences({
      technicianId: this.technicianId,
      preferences
    }));
  }

  // --- Stats helpers ---

  getTotalTrips(profile: TravelProfile): number {
    return profile.travelHistory?.length || 0;
  }

  getTotalMiles(profile: TravelProfile): number {
    return (profile.travelHistory || []).reduce((sum, e) => sum + (e.distanceMiles || 0), 0);
  }

  getPerDiemEligibleCount(profile: TravelProfile): number {
    return (profile.travelHistory || []).filter(e => e.perDiemEligible).length;
  }

  getTotalPerDiem(profile: TravelProfile): number {
    return (profile.travelHistory || []).reduce((sum, e) => sum + (e.perDiemAmount || 0), 0);
  }

  formatDriveTime(minutes: number): string {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // --- Existing helpers ---

  getGeocodingStatusLabel(status: GeocodingStatus): string {
    switch (status) {
      case GeocodingStatus.NotGeocoded: return 'Not Geocoded';
      case GeocodingStatus.Pending: return 'Geocoding...';
      case GeocodingStatus.Success: return 'Geocoded';
      case GeocodingStatus.Failed: return 'Geocoding Failed';
      default: return 'Unknown';
    }
  }

  getGeocodingStatusClass(status: GeocodingStatus): string {
    switch (status) {
      case GeocodingStatus.Success: return 'success';
      case GeocodingStatus.Pending: return 'pending';
      case GeocodingStatus.Failed: return 'error';
      default: return 'not-geocoded';
    }
  }

  formatCoordinates(coords: Coordinates | null): string {
    if (!coords) return 'N/A';
    return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
  }

  formatDate(date: Date | null): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.addressForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';
    if (control.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
    if (control.errors['minlength']) return `${this.getFieldLabel(fieldName)} is too short`;
    if (control.errors['pattern']) {
      if (fieldName === 'state') return 'State must be 2 uppercase letters (e.g., CA)';
      if (fieldName === 'postalCode') return 'Invalid postal code format (e.g., 12345 or 12345-6789)';
    }
    return 'Invalid value';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      street: 'Street address',
      city: 'City',
      state: 'State',
      postalCode: 'Postal code'
    };
    return labels[fieldName] || fieldName;
  }
}
