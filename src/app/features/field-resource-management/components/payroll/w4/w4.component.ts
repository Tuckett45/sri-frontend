import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../../../../../services/auth.service';
import { W4Change } from '../../../models/payroll.models';

@Component({
  selector: 'app-w4',
  template: `
    <div class="w4">
      <h2>W-4 Change</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div>
          <label for="employeeId">Employee ID</label>
          <input id="employeeId" formControlName="employeeId" />
        </div>
        <div>
          <label for="filingStatus">Filing Status</label>
          <select id="filingStatus" formControlName="filingStatus">
            <option value="">Select...</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="head_of_household">Head of Household</option>
          </select>
        </div>
        <div>
          <label for="allowances">Allowances</label>
          <input id="allowances" type="number" formControlName="allowances" min="0" />
        </div>
        <button type="submit" [disabled]="form.invalid">Submit</button>
      </form>
      <p *ngIf="submittedRecord" class="success-message">
        Submitted by {{ submittedRecord.submittedBy }} at {{ submittedRecord.submittedAt | date:'short' }}
      </p>
    </div>
  `
})
export class W4Component implements OnInit {
  form!: FormGroup;
  submittedRecord: W4Change | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.form = new FormGroup({
      employeeId: new FormControl('', Validators.required),
      filingStatus: new FormControl('', Validators.required),
      allowances: new FormControl(0, [Validators.required, Validators.min(0)])
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    const user = this.authService.getUser();
    this.submittedRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      employeeId: this.form.value.employeeId,
      submittedBy: user?.name || user?.id || 'unknown',
      submittedAt: new Date(),
      filingStatus: this.form.value.filingStatus,
      allowances: this.form.value.allowances
    };
  }
}
