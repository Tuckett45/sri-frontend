import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-direct-deposit',
  templateUrl: './direct-deposit.component.html',
  styleUrls: ['./direct-deposit.component.scss']
})
export class DirectDepositComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  directDepositForm!: FormGroup;
  showForm = false;
  isEdit = false;

  existingSetup: any = null;

  accountTypes = ['Checking', 'Savings'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.directDepositForm = this.fb.group({
      bankName: ['', Validators.required],
      accountType: ['Checking', Validators.required],
      routingNumber: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
      accountNumber: ['', Validators.required],
      confirmAccountNumber: ['', Validators.required]
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.directDepositForm.reset({ accountType: 'Checking' });
    }
  }

  onSubmit(): void {
    if (this.directDepositForm.valid) {
      const { confirmAccountNumber, ...data } = this.directDepositForm.value;
      this.existingSetup = { ...data, maskedAccount: '****' + data.accountNumber.slice(-4) };
      this.isEdit = true;
      this.showForm = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
