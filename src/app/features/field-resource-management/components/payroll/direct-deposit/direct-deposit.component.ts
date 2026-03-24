import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../../../../../services/auth.service';
import { DirectDepositChange } from '../../../models/payroll.models';

@Component({
  selector: 'app-direct-deposit',
  template: `
    <div class="direct-deposit">
      <h2>Direct Deposit Change</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div>
          <label for="employeeId">Employee ID</label>
          <input id="employeeId" formControlName="employeeId" />
        </div>
        <div>
          <label for="bankAccountLast4">Bank Account (Last 4)</label>
          <input id="bankAccountLast4" formControlName="bankAccountLast4" maxlength="4" />
        </div>
        <div>
          <label for="routingNumberLast4">Routing Number (Last 4)</label>
          <input id="routingNumberLast4" formControlName="routingNumberLast4" maxlength="4" />
        </div>
        <button type="submit" [disabled]="form.invalid">Submit</button>
      </form>
      <p *ngIf="submittedRecord" class="success-message">
        Submitted by {{ submittedRecord.submittedBy }} at {{ submittedRecord.submittedAt | date:'short' }}
      </p>
    </div>
  `
})
export class DirectDepositComponent implements OnInit {
  form!: FormGroup;
  submittedRecord: DirectDepositChange | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.form = new FormGroup({
      employeeId: new FormControl('', Validators.required),
      bankAccountLast4: new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(4)]),
      routingNumberLast4: new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(4)])
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
      bankAccountLast4: this.form.value.bankAccountLast4,
      routingNumberLast4: this.form.value.routingNumberLast4
    };
  }
}
