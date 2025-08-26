import { Component, Inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Expense, ExpenseStatus, ExpenseType } from 'src/app/models/expense.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-expense-report-modal',
  templateUrl: './expense-report-modal.component.html',
  styleUrls: ['./expense-report-modal.component.scss'],
  standalone: false
})
export class ExpenseReportModalComponent {
  expenseForm: FormGroup;

  // file/preview state
  receiptFile?: File;
  receiptBase64?: string;          // raw data URL for saving (receiptData)
  receiptSafeUrl?: SafeResourceUrl; // sanitized for <img [src]>
  isGalleryVisible = false;
  galleryImages: Array<{ itemImageSrc: string }> = [];

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
  expenseTypes: ExpenseType[] = ['Meals', 'Lodging', 'Fuel', 'Materials', 'Other'];

  get phases(): string[] {
    const job = this.expenseForm.get('job')?.value as string | undefined;
    return job ? (this.phasesByJob[job] ?? []) : [];
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ExpenseReportModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Partial<Expense> | null,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {
    // seed phases per job
    this.jobs.forEach(j => (this.phasesByJob[j] = ['Make-Ready', 'Construction', 'Splicing', 'QC', 'Other']));

    // ensure date is Date
    const initialDate = (data?.date instanceof Date) ? data.date : new Date(data?.date ?? new Date());

    this.expenseForm = this.fb.group({
      job: [data?.job ?? null, Validators.required],
      phase: [{ value: data?.phase ?? null, disabled: !data?.job }, Validators.required],
      date: [initialDate, Validators.required],
      expenseType: [data?.expenseType ?? null, Validators.required],
      amount: [data?.amount ?? 0, [Validators.required, Validators.min(0)]],
      notes: [data?.notes ?? '']
    });

    // enable/disable phase when job changes
    this.expenseForm.get('job')?.valueChanges.subscribe(job => {
      const phaseCtrl = this.expenseForm.get('phase');
      phaseCtrl?.reset();
      job ? phaseCtrl?.enable() : phaseCtrl?.disable();
    });

    // existing image: prefer images[0].blobUrl, fallback to receiptUrl; pass contentType if present
    const img0 = (data as any)?.images?.[0];
    const existingUrl = img0?.blobUrl ?? (data as any)?.receiptUrl;
    const existingType = img0?.contentType as string | undefined;

    if (existingUrl) {
      this.setPreviewFromUrl(existingUrl, existingType);
    }
  }

  /** Handle <input type="file"> change */
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files && input.files[0];
    if (!file) return;

    // Only preview images
    if (!file.type.startsWith('image/')) {
      this.removeImage();
      return;
    }

    this.receiptFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // data URL (e.g. data:image/png;base64,....)
      this.receiptBase64 = result;
      this.receiptSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(result);
      this.galleryImages = [{ itemImageSrc: result }];
      this.cdr.detectChanges(); // ensure view updates inside dialog
    };
    reader.readAsDataURL(file);
  }

  private setPreviewFromUrl(url?: string, contentType?: string) {
    if (!url) {
      this.receiptBase64 = undefined;
      this.receiptSafeUrl = undefined as any;
      this.galleryImages = [];
      return;
    }

    const isHttp = /^https?:\/\//i.test(url);
    const isData = /^data:/i.test(url);
    const looksLikeBase64 = /^[A-Za-z0-9+/=\s]+$/.test(url) && !isHttp && !isData;

    const guessedType =
      contentType ||
      (/\.(jpe?g)(\?|$)/i.test(url) ? 'image/jpeg'
        : /\.(png)(\?|$)/i.test(url) ? 'image/png'
        : 'image/jpeg');

    const dataUrl = looksLikeBase64
      ? `data:${guessedType};base64,${url.replace(/\s+/g, '')}`
      : url;

    this.receiptBase64 = dataUrl; // keep around if you re-POST it
    this.receiptSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl);
    this.galleryImages = [{ itemImageSrc: dataUrl }];
  }

  removeImage() {
    this.receiptFile = undefined;
    this.receiptBase64 = undefined;
    this.receiptSafeUrl = undefined as any;
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
      date: value.date instanceof Date ? value.date : new Date(value.date),
      expenseType: value.expenseType!,
      amount: Number(value.amount ?? 0),
      notes: value.notes || '',
      // front-end sends both: API will consume receiptData (base64) or ignore if null
      receiptData: this.receiptBase64,   // base64 data URL for POST/PUT
      receiptUrl: this.receiptBase64,    // keeps preview in calling component after close
      status: this.data?.status || ExpenseStatus.Pending
    } as any);

    this.dialogRef.close(expense);
  }

  close() {
    this.dialogRef.close();
  }
}
