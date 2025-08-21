import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Expense, ExpenseStatus, ExpenseType } from 'src/app/models/expense.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-expense-report-modal',
  templateUrl: './expense-report-modal.component.html',
  styleUrls: ['./expense-report-modal.component.scss'],
  standalone: false
})
export class ExpenseReportModalComponent {
  expenseForm: FormGroup;
  receiptFile?: File;
  receiptBase64?: string;
  isGalleryVisible = false;
  galleryImages: any[] = [];

  jobs: string[] = [
    'JOB # 44346 GFIBER-UT-SLC-RM-OLT',
    'JOB # 44384 GFIBER-NV-LAS-PERMIT PCKG',
    'JOB # 44562 GFIBER-UT-SLC-RM-LIGHTC...',
    'JOB # 44846 GFIBER-UT-SLC-FC-2025',
    'JOB # 44847 GFIBER-AZ-PHX-FC-2025',
    'JOB # 44848 GFIBER-CO-DEN-FC-2025',
    'JOB # 44849 GFIBER-TX-SAT-FC-2025',
    'JOB # 44850 GFIBER-NV-LAS-FC-2025',
    'JOB # 44852 GFIBER-R&M-OVH-2025',
    'JOB # 44853 GFIBER-UT-SLC-RM-FSL-2025',
    'JOB # 44854 GFIBER-AZ-PHX-RM-FSL-2025',
    'JOB # 44855 GFIBER-GA-ATL-DPLYMT-2025',
    'JOB # 44856 GFIBER-TX-AUS-DPLYMT-2025',
    'JOB # 44857 GFIBER-TX-SAT-DPLYMT-2025',
    'JOB # 44858 GFIBER-TN-BNA-DPLYMT-2025',
    'JOB # 44859 GFIBER-NC-CLT-DPLYMT-2025',
    'JOB # 44860 GFIBER-CA-LAX-DPLYMT-2025',
    'JOB # 44861 GFIBER-CO-DEN-RM-FSL-2025',
    'JOB # 44862 GFIBER-UT-LGU-RM-FSL-2025',
    'JOB # 44863 GFIBER-ID-PIH-RM-FSL-2025'
  ];

  phasesByJob: Record<string, string[]> = {};

  expenseTypes: ExpenseType[] = ['Meals', 'Lodging', 'Fuel', 'Mileage', 'Materials', 'Other'];

  get phases(): string[] {
    const job = this.expenseForm.get('job')?.value as string | undefined;
    return job ? (this.phasesByJob[job] ?? []) : [];
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ExpenseReportModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Partial<Expense> | null
  ) {
    this.jobs.forEach(j => (this.phasesByJob[j] = ['Make-Ready', 'Construction', 'Splicing', 'QC']));

    this.expenseForm = this.fb.group({
      job: [data?.job || null, Validators.required],
      phase: [{ value: data?.phase || null, disabled: !data?.job }, Validators.required],
      date: [data?.date || new Date(), Validators.required],
      expenseType: [data?.expenseType || null, Validators.required],
      amount: [data?.amount || 0, [Validators.required, Validators.min(0)]],
      notes: [data?.notes || '']
    });

    this.expenseForm.get('job')?.valueChanges.subscribe(job => {
      const phaseCtrl = this.expenseForm.get('phase');
      phaseCtrl?.reset();
      if (job) {
        phaseCtrl?.enable();
      } else {
        phaseCtrl?.disable();
      }
    });

    if (data?.receiptUrl) {
      this.receiptBase64 = data.receiptUrl;
      this.galleryImages = [{ itemImageSrc: this.receiptBase64 }];
    }
  }

  onFileChange(event: any) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      this.receiptFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.receiptBase64 = reader.result as string;
        this.galleryImages = [{ itemImageSrc: this.receiptBase64 }];
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.receiptFile = undefined;
    this.receiptBase64 = undefined;
    this.galleryImages = [];
  }

  openGallery() {
    if (this.receiptBase64) {
      this.galleryImages = [{ itemImageSrc: this.receiptBase64 }];
      this.isGalleryVisible = true;
    }
  }

  closeImageModal() {
    this.isGalleryVisible = false;
  }

  save() {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    const value = this.expenseForm.value;
    const expense = new Expense({
      id: this.data?.id || uuidv4(),
      job: value.job!,
      phase: value.phase!,
      date: value.date,
      expenseType: value.expenseType!,
      amount: value.amount!,
      notes: value.notes || '',
      receiptUrl: this.receiptBase64,
      status: this.data?.status || ExpenseStatus.Pending
    });

    this.dialogRef.close(expense);
  }

  close() {
    this.dialogRef.close();
  }
}
