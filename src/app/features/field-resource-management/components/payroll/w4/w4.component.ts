import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-w4',
  templateUrl: './w4.component.html',
  styleUrls: ['./w4.component.scss']
})
export class W4Component implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  w4Form!: FormGroup;
  isSaving = false;

  filingStatuses = ['Single', 'Married Filing Jointly', 'Head of Household'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.w4Form = this.fb.group({
      filingStatus: ['Single', Validators.required],
      dependentsAmount: [0, [Validators.min(0)]],
      otherAdjustments: [0, [Validators.min(0)]],
      extraWithholding: [0, [Validators.min(0)]]
    });
  }

  onSubmit(): void {
    if (this.w4Form.valid) {
      this.isSaving = true;
      // Submit logic here
      setTimeout(() => { this.isSaving = false; }, 1000);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
