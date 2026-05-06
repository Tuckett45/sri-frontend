import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-create-travel-profile-dialog',
  templateUrl: './create-travel-profile-dialog.component.html',
  styleUrls: ['./create-travel-profile-dialog.component.scss']
})
export class CreateTravelProfileDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  travelProfileForm!: FormGroup;

  vehicleTypes = ['Personal Car', 'Company Car', 'Truck', 'Van'];
  hotelChains = ['Marriott', 'Hilton', 'IHG', 'Choice Hotels', 'Best Western', 'No Preference'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateTravelProfileDialogComponent>
  ) {}

  ngOnInit(): void {
    this.travelProfileForm = this.fb.group({
      homeAirport: ['', Validators.required],
      preferredHotelChain: ['No Preference'],
      vehicleType: ['Personal Car', Validators.required],
      licensePlate: [''],
      maxDriveDistance: [100, [Validators.required, Validators.min(0)]]
    });
  }

  onSave(): void {
    if (this.travelProfileForm.valid) {
      this.dialogRef.close(this.travelProfileForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
