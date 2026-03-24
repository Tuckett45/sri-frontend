import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { AuthService } from '../../../../../services/auth.service';
import { ContactInfoChange } from '../../../models/payroll.models';

@Component({
  selector: 'app-contact-info',
  template: `
    <div class="contact-info">
      <h2>Contact Information Update</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div>
          <label for="employeeId">Employee ID</label>
          <input id="employeeId" formControlName="employeeId" />
        </div>
        <div>
          <label for="address">Address</label>
          <input id="address" formControlName="address" />
        </div>
        <div>
          <label for="phone">Phone</label>
          <input id="phone" formControlName="phone" />
        </div>
        <div>
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" />
        </div>
        <p *ngIf="validationError" class="error-message">{{ validationError }}</p>
        <button type="submit">Save</button>
      </form>
      <p *ngIf="savedRecord" class="success-message">
        Updated by {{ savedRecord.updatedBy }} at {{ savedRecord.updatedAt | date:'short' }}
      </p>
    </div>
  `
})
export class ContactInfoComponent implements OnInit {
  form!: FormGroup;
  savedRecord: ContactInfoChange | null = null;
  validationError: string | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.form = new FormGroup({
      employeeId: new FormControl(''),
      address: new FormControl(''),
      phone: new FormControl(''),
      email: new FormControl('')
    });
  }

  onSubmit(): void {
    this.validationError = null;
    const { address, phone, email } = this.form.value;

    if (!this.hasAtLeastOneChange(address, phone, email)) {
      this.validationError = 'At least one contact field must be changed before saving.';
      return;
    }

    const user = this.authService.getUser();
    this.savedRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      employeeId: this.form.value.employeeId,
      updatedBy: user?.name || user?.id || 'unknown',
      updatedAt: new Date(),
      ...(address ? { address } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {})
    };
  }

  hasAtLeastOneChange(address: string, phone: string, email: string): boolean {
    return !!(address?.trim() || phone?.trim() || email?.trim());
  }
}
