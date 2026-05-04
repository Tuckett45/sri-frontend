import { Component, Input, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { PayrollService } from '../../../../services/payroll.service';
import {
  PayStub, W2Document, W4Change, DirectDepositChange,
  FilingStatus
} from '../../../../models/payroll.models';
import { triggerBlobDownload } from '../../../../utils/download.util';

@Component({
  selector: 'app-technician-financial-tab',
  templateUrl: './technician-financial-tab.component.html',
  styleUrls: ['./technician-financial-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TechnicianFinancialTabComponent implements OnInit {
  @Input() technicianId!: string;

  activeSection: 'pay-stubs' | 'w2' | 'w4' | 'direct-deposit' = 'pay-stubs';

  // Pay Stubs
  payStubs: PayStub[] = [];
  payStubsLoaded = false;
  payStubsError = '';

  // W-2
  w2Documents: W2Document[] = [];
  w2Loaded = false;
  w2Error = '';
  selectedTaxYear = '';
  availableTaxYears: number[] = [];

  // W-4
  w4History: W4Change[] = [];
  w4Loaded = false;
  w4Error = '';
  w4Success = '';
  w4Form!: FormGroup;
  showW4Form = false;
  w4Submitting = false;

  filingStatusOptions: { value: FilingStatus; label: string }[] = [
    { value: 'single_or_married_filing_separately', label: 'Single / Married Filing Separately' },
    { value: 'married_filing_jointly', label: 'Married Filing Jointly' },
    { value: 'head_of_household', label: 'Head of Household' }
  ];

  // Direct Deposit
  ddHistory: DirectDepositChange[] = [];
  ddLoaded = false;
  ddError = '';
  ddSuccess = '';
  ddForm!: FormGroup;
  showDDForm = false;
  ddSubmitting = false;

  constructor(
    private payrollService: PayrollService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initW4Form();
    this.initDDForm();
    this.loadPayStubs();
  }

  switchSection(section: typeof this.activeSection): void {
    this.activeSection = section;
    if (section === 'pay-stubs' && !this.payStubsLoaded) this.loadPayStubs();
    if (section === 'w2' && !this.w2Loaded) this.loadTaxYears();
    if (section === 'w4' && !this.w4Loaded) this.loadW4History();
    if (section === 'direct-deposit' && !this.ddLoaded) this.loadDDHistory();
  }

  // --- Pay Stubs ---
  loadPayStubs(): void {
    this.payStubsError = '';
    this.payrollService.getPayStubs(this.technicianId).subscribe({
      next: stubs => {
        this.payStubs = stubs.sort((a, b) =>
          new Date(b.payPeriodEnd).getTime() - new Date(a.payPeriodEnd).getTime()
        );
        this.payStubsLoaded = true;
        this.cdr.markForCheck();
      },
      error: err => {
        this.payStubsError = err?.message || 'Failed to load pay stubs.';
        this.payStubsLoaded = true;
        this.cdr.markForCheck();
      }
    });
  }

  downloadPayStub(stub: PayStub): void {
    const period = `${stub.payPeriodStart}_${stub.payPeriodEnd}`;
    this.payrollService.getPayStubPdf(this.technicianId, period).subscribe({
      next: blob => triggerBlobDownload(blob, `paystub_${this.technicianId}_${period}.pdf`),
      error: err => { this.payStubsError = err?.message || 'Download failed.'; this.cdr.markForCheck(); }
    });
  }

  // --- W-2 ---
  loadTaxYears(): void {
    this.w2Error = '';
    this.payrollService.getAvailableTaxYears(this.technicianId).subscribe({
      next: years => {
        this.availableTaxYears = years.sort((a, b) => b - a);
        if (this.availableTaxYears.length > 0) {
          this.selectedTaxYear = String(this.availableTaxYears[0]);
          this.loadW2Documents();
        } else {
          this.w2Loaded = true;
          this.cdr.markForCheck();
        }
      },
      error: err => {
        this.w2Error = err?.message || 'Failed to load tax years.';
        this.w2Loaded = true;
        this.cdr.markForCheck();
      }
    });
  }

  loadW2Documents(): void {
    if (!this.selectedTaxYear) return;
    this.w2Error = '';
    this.payrollService.getW2Documents(this.technicianId, Number(this.selectedTaxYear)).subscribe({
      next: docs => { this.w2Documents = docs; this.w2Loaded = true; this.cdr.markForCheck(); },
      error: err => { this.w2Error = err?.message || 'Failed to load W-2 documents.'; this.w2Loaded = true; this.cdr.markForCheck(); }
    });
  }

  downloadW2(doc: W2Document): void {
    this.payrollService.getW2Pdf(this.technicianId, doc.taxYear).subscribe({
      next: blob => triggerBlobDownload(blob, `w2_${this.technicianId}_${doc.taxYear}.pdf`),
      error: err => { this.w2Error = err?.message || 'Download failed.'; this.cdr.markForCheck(); }
    });
  }

  // --- W-4 ---
  private initW4Form(): void {
    this.w4Form = this.fb.group({
      filingStatus: ['single_or_married_filing_separately', Validators.required],
      multipleJobsOrSpouseWorks: [false],
      claimDependents: [0, [Validators.required, Validators.min(0)]],
      otherIncome: [0, [Validators.required, Validators.min(0)]],
      deductions: [0, [Validators.required, Validators.min(0)]],
      extraWithholding: [0, [Validators.required, Validators.min(0)]]
    });
  }

  loadW4History(): void {
    this.w4Error = '';
    this.payrollService.getW4History(this.technicianId).subscribe({
      next: records => {
        this.w4History = records.sort((a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        this.w4Loaded = true;
        // Pre-fill form with latest W-4 if exists
        if (this.w4History.length > 0) {
          const latest = this.w4History[0];
          this.w4Form.patchValue({
            filingStatus: latest.filingStatus,
            multipleJobsOrSpouseWorks: latest.multipleJobsOrSpouseWorks,
            claimDependents: latest.claimDependents,
            otherIncome: latest.otherIncome,
            deductions: latest.deductions,
            extraWithholding: latest.extraWithholding
          }, { emitEvent: false });
        }
        this.cdr.markForCheck();
      },
      error: err => {
        this.w4Error = err?.message || 'Failed to load W-4 history.';
        this.w4Loaded = true;
        this.cdr.markForCheck();
      }
    });
  }

  submitW4(): void {
    if (this.w4Form.invalid) { this.w4Form.markAllAsTouched(); return; }
    this.w4Submitting = true;
    this.w4Error = '';
    this.w4Success = '';
    const val = this.w4Form.value;
    this.payrollService.submitW4Change({
      employeeId: this.technicianId,
      filingStatus: val.filingStatus,
      multipleJobsOrSpouseWorks: val.multipleJobsOrSpouseWorks,
      claimDependents: val.claimDependents,
      otherIncome: val.otherIncome,
      deductions: val.deductions,
      extraWithholding: val.extraWithholding
    }).subscribe({
      next: () => {
        this.w4Submitting = false;
        this.w4Success = 'W-4 updated successfully.';
        this.showW4Form = false;
        this.w4Loaded = false;
        this.loadW4History();
      },
      error: err => {
        this.w4Submitting = false;
        this.w4Error = err?.message || 'Failed to submit W-4 change.';
        this.cdr.markForCheck();
      }
    });
  }

  // --- Direct Deposit ---
  private initDDForm(): void {
    this.ddForm = this.fb.group({
      bankName: ['', Validators.required],
      accountType: ['checking', Validators.required],
      routingNumber: ['', Validators.required],
      accountNumber: ['', Validators.required],
      accountNumberConfirm: ['', Validators.required]
    }, { validators: this.accountNumberMatchValidator });
  }

  private accountNumberMatchValidator(control: AbstractControl): ValidationErrors | null {
    const acct = control.get('accountNumber')?.value;
    const confirm = control.get('accountNumberConfirm')?.value;
    if (acct && confirm && acct !== confirm) return { accountNumberMismatch: true };
    return null;
  }

  loadDDHistory(): void {
    this.ddError = '';
    this.payrollService.getDirectDepositHistory(this.technicianId).subscribe({
      next: records => {
        this.ddHistory = records.sort((a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        this.ddLoaded = true;
        this.cdr.markForCheck();
      },
      error: err => {
        this.ddError = err?.message || 'Failed to load direct deposit history.';
        this.ddLoaded = true;
        this.cdr.markForCheck();
      }
    });
  }

  submitDD(): void {
    if (this.ddForm.invalid) { this.ddForm.markAllAsTouched(); return; }
    this.ddSubmitting = true;
    this.ddError = '';
    this.ddSuccess = '';
    const val = this.ddForm.value;
    this.payrollService.submitDirectDepositChange({
      employeeId: this.technicianId,
      bankName: val.bankName,
      accountType: val.accountType,
      routingNumber: val.routingNumber,
      accountNumber: val.accountNumber,
      accountNumberConfirm: val.accountNumberConfirm
    }).subscribe({
      next: () => {
        this.ddSubmitting = false;
        this.ddSuccess = 'Direct deposit updated successfully.';
        this.showDDForm = false;
        this.ddForm.reset({ bankName: '', accountType: 'checking', routingNumber: '', accountNumber: '', accountNumberConfirm: '' });
        this.ddLoaded = false;
        this.loadDDHistory();
      },
      error: err => {
        this.ddSubmitting = false;
        this.ddError = err?.message || 'Failed to submit direct deposit change.';
        this.cdr.markForCheck();
      }
    });
  }

  getFilingStatusLabel(status: FilingStatus): string {
    return this.filingStatusOptions.find(o => o.value === status)?.label || status;
  }
}
