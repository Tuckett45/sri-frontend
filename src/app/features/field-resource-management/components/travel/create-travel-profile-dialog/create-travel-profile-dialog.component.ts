import { Component, OnInit, Inject, Optional, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { Technician } from '../../../models/technician.model';
import { Address, TransportationMode } from '../../../models/travel.model';
import { selectAllTechnicians } from '../../../state/technicians/technician.selectors';
import { selectTechnicianById } from '../../../state/technicians/technician.selectors';
import { selectAllTravelProfiles, selectTravelLoading } from '../../../state/travel/travel.selectors';
import * as TravelActions from '../../../state/travel/travel.actions';
import * as TechnicianActions from '../../../state/technicians/technician.actions';

export interface CreateTravelProfileDialogData {
  technicianId?: string;
}

interface TechnicianOption {
  id: string;
  name: string;
  region: string;
}

@Component({
  selector: 'app-create-travel-profile-dialog',
  templateUrl: './create-travel-profile-dialog.component.html',
  styleUrls: ['./create-travel-profile-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateTravelProfileDialogComponent implements OnInit {
  profileForm!: FormGroup;
  availableTechnicians$!: Observable<TechnicianOption[]>;
  loading$!: Observable<boolean>;
  preselectedTechnicianId: string | null = null;
  preselectedTechnicianName: string | null = null;

  readonly TransportationMode = TransportationMode;

  constructor(
    private dialogRef: MatDialogRef<CreateTravelProfileDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: CreateTravelProfileDialogData | null,
    private store: Store,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.preselectedTechnicianId = data?.technicianId || null;
  }

  ngOnInit(): void {
    this.loading$ = this.store.select(selectTravelLoading);
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));
    this.initForm();
    this.loadAvailableTechnicians();
    this.resolvePreselectedName();
  }

  private initForm(): void {
    this.profileForm = this.fb.group({
      technicianId: [this.preselectedTechnicianId || '', Validators.required],
      willingToTravel: [true],
      street: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      state: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}$/)]],
      postalCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]],
      maxTravelRadiusMiles: [null],
      preferredTransportation: [TransportationMode.Any],
      notes: ['']
    });
  }

  private loadAvailableTechnicians(): void {
    const allTechnicians$ = this.store.select(selectAllTechnicians);
    const existingProfiles$ = this.store.select(selectAllTravelProfiles);

    this.availableTechnicians$ = combineLatest([allTechnicians$, existingProfiles$]).pipe(
      map(([technicians, profiles]) => {
        const existingIds = new Set(profiles.map(p => p.technicianId));
        return technicians
          .filter(t => t.isActive && !existingIds.has(t.id))
          .map(t => ({
            id: t.id,
            name: `${t.firstName} ${t.lastName}`,
            region: t.region
          }));
      })
    );
  }

  private resolvePreselectedName(): void {
    if (!this.preselectedTechnicianId) return;
    this.store.select(selectTechnicianById(this.preselectedTechnicianId)).pipe(
      map(tech => tech ? `${tech.firstName} ${tech.lastName}` : null)
    ).subscribe(name => {
      this.preselectedTechnicianName = name;
      this.cdr.markForCheck();
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) return;

    const val = this.profileForm.value;

    // Dispatch create action — the backend will create the full profile
    this.store.dispatch(TravelActions.createTravelProfile({
      technicianId: val.technicianId
    }));

    // After creation, dispatch updates for address, flag, and preferences
    this.store.dispatch(TravelActions.updateTravelFlag({
      technicianId: val.technicianId,
      willing: val.willingToTravel
    }));

    const address: Address = {
      street: val.street,
      city: val.city,
      state: val.state,
      postalCode: val.postalCode
    };
    this.store.dispatch(TravelActions.updateHomeAddress({
      technicianId: val.technicianId,
      address
    }));

    if (val.maxTravelRadiusMiles || val.preferredTransportation !== TransportationMode.Any || val.notes) {
      this.store.dispatch(TravelActions.updateTravelPreferences({
        technicianId: val.technicianId,
        preferences: {
          maxTravelRadiusMiles: val.maxTravelRadiusMiles,
          preferredTransportation: val.preferredTransportation,
          notes: val.notes || ''
        }
      }));
    }

    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getFieldError(fieldName: string): string {
    const control = this.profileForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';
    if (control.errors['required']) return 'Required';
    if (control.errors['minlength']) return 'Too short';
    if (control.errors['pattern']) {
      if (fieldName === 'state') return '2 uppercase letters (e.g., CA)';
      if (fieldName === 'postalCode') return 'Format: 12345 or 12345-6789';
    }
    return 'Invalid';
  }
}
