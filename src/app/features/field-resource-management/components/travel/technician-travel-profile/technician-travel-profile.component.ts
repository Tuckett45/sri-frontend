import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import { TravelProfile, GeocodingStatus, Address, Coordinates } from '../../../models/travel.model';
import * as TravelActions from '../../../state/travel/travel.actions';
import {
  selectTravelProfile,
  selectGeocodingStatus,
  selectIsGeocodingInProgress,
  selectTravelLoading,
  selectTravelError
} from '../../../state/travel/travel.selectors';
import { PermissionService } from '../../../../../services/permission.service';

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
  canEdit = false;

  readonly GeocodingStatus = GeocodingStatus;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private fb: FormBuilder,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadProfile();
    this.setupObservables();
    this.checkPermissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.addressForm = this.fb.group({
      street: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      state: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}$/)]],
      postalCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]]
    });
  }

  private loadProfile(): void {
    this.store.dispatch(TravelActions.loadTravelProfile({ technicianId: this.technicianId }));
  }

  private setupObservables(): void {
    this.travelProfile$ = this.store.select(selectTravelProfile(this.technicianId));
    this.geocodingStatus$ = this.store.select(selectGeocodingStatus(this.technicianId));
    this.geocodingInProgress$ = this.store.select(selectIsGeocodingInProgress(this.technicianId));
    this.loading$ = this.store.select(selectTravelLoading);
    this.error$ = this.store.select(selectTravelError);

    // Populate form when profile loads
    this.travelProfile$.pipe(
      takeUntil(this.destroy$),
      filter(profile => profile !== null)
    ).subscribe(profile => {
      if (profile?.homeAddress) {
        this.addressForm.patchValue(profile.homeAddress, { emitEvent: false });
      }
    });
  }

  private checkPermissions(): void {
    this.permissionService.getCurrentUser().pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      // Admin can edit any profile, technicians can edit their own
      const isAdmin = this.permissionService.checkPermission(user, 'technicians', 'update');
      const isOwnProfile = user?.id === this.technicianId;
      this.canEdit = isAdmin || isOwnProfile;
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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
