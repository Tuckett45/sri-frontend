import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-technician-travel-profile',
  templateUrl: './technician-travel-profile.component.html',
  styleUrls: ['./technician-travel-profile.component.scss']
})
export class TechnicianTravelProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  @Input() technicianId = '';

  isEditing = false;
  profileForm!: FormGroup;

  profile = {
    homeAirport: '',
    preferredHotelChain: '',
    vehicleType: '',
    licensePlate: '',
    maxDriveDistance: 0
  };

  vehicleTypes = ['Personal Car', 'Company Car', 'Truck', 'Van'];
  hotelChains = ['Marriott', 'Hilton', 'IHG', 'Choice Hotels', 'Best Western', 'No Preference'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      homeAirport: [this.profile.homeAirport],
      preferredHotelChain: [this.profile.preferredHotelChain],
      vehicleType: [this.profile.vehicleType],
      licensePlate: [this.profile.licensePlate],
      maxDriveDistance: [this.profile.maxDriveDistance]
    });
  }

  startEdit(): void {
    this.profileForm.patchValue(this.profile);
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
  }

  saveProfile(): void {
    if (this.profileForm.valid) {
      this.profile = { ...this.profileForm.value };
      this.isEditing = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
