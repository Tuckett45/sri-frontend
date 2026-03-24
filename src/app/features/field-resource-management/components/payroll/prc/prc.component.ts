import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../../../../../services/auth.service';
import { PrcSignature } from '../../../models/payroll.models';

@Component({
  selector: 'app-prc',
  template: `
    <div class="prc">
      <h2>Personnel Record Change (PRC) Signing</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div>
          <label for="employeeId">Employee ID</label>
          <input id="employeeId" formControlName="employeeId" />
        </div>
        <div>
          <label for="documentRef">Document Reference</label>
          <input id="documentRef" formControlName="documentRef" />
        </div>
        <div>
          <label for="signature">Signature</label>
          <input id="signature" formControlName="signature" />
        </div>
        <p *ngIf="validationError" class="error-message">{{ validationError }}</p>
        <button type="submit">Sign</button>
      </form>
      <p *ngIf="signedRecord" class="success-message">
        Signed by {{ signedRecord.signedBy }} at {{ signedRecord.signedAt | date:'short' }}
      </p>
    </div>
  `
})
export class PrcComponent implements OnInit {
  form!: FormGroup;
  signedRecord: PrcSignature | null = null;
  validationError: string | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.form = new FormGroup({
      employeeId: new FormControl('', Validators.required),
      documentRef: new FormControl('', Validators.required),
      signature: new FormControl('', Validators.required)
    });
  }

  onSubmit(): void {
    this.validationError = null;
    const signature = this.form.value.signature?.trim();

    if (!signature) {
      this.validationError = 'Signature cannot be empty.';
      return;
    }

    const user = this.authService.getUser();
    this.signedRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      employeeId: this.form.value.employeeId,
      signedBy: user?.name || user?.id || 'unknown',
      signedAt: new Date(),
      documentRef: this.form.value.documentRef
    };
  }
}
