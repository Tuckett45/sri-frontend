import { Component, Inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormGroupDirective } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { v4 as uuidv4 } from 'uuid';

import {
  Expense,
  ExpenseImage,
  ExpenseCategory,
  PaymentMethod,
  EntertainmentDetail,
  ExpenseStatus
} from 'src/app/models/expense.model';
import { AuthService } from 'src/app/services/auth.service';

export interface ExpenseDialogResult {
  expense: Expense;
  file: File | null;
  receiptData: string | null;
}

@Component({
  selector: 'app-expense-report-modal',
  templateUrl: './expense-report-modal.component.html',
  styleUrls: ['./expense-report-modal.component.scss'],
  standalone: false
})
export class ExpenseReportModalComponent implements OnDestroy {
  private readonly currentUserId: string | null;
  expenseForm: FormGroup;
  receiptFile?: File;
  receiptBase64?: string;    
  receiptSafeUrl?: SafeResourceUrl;
  receiptPreviewKind: 'image' | 'pdf' | 'file' | null = null;
  receiptPreviewUrl?: string;
  receiptPreviewName?: string;
  isGalleryVisible = false;
  galleryImages: Array<{ itemImageSrc: string }> = [];
  private receiptObjectUrl?: string;

  jobs: string[] = [
    '23471 - David Nottingham O/H',
    '44346 GFIBER-UT-SLC-RM-OLT',
    '44384 GFIBER-NV-LAS-PERMIT PCKG',
    '44562 GFIBER-UT-SLC-RM-LIGHTC...',
    '44846 GFIBER-UT-SLC-FC-2025',
    '44847 GFIBER-AZ-PHX-FC-2025',
    '44848 GFIBER-CO-DEN-FC-2025',
    '44849 GFIBER-TX-SAT-FC-2025',
    '44850 GFIBER-NV-LAS-FC-2025',
    '44852 GFIBER-R&M-OVH-2025',
    '44853 GFIBER-UT-SLC-RM-FSL-2025',
    '44854 GFIBER-AZ-PHX-RM-FSL-2025',
    '44855 GFIBER-GA-ATL-DPLYMT-2025',
    '44856 GFIBER-TX-AUS-DPLYMT-2025',
    '44857 GFIBER-TX-SAT-DPLYMT-2025',
    '44858 GFIBER-TN-BNA-DPLYMT-2025',
    '44859 GFIBER-NC-CLT-DPLYMT-2025',
    '44860 GFIBER-CA-LAX-DPLYMT-2025',
    '44861 GFIBER-CO-DEN-RM-FSL-2025',
    '44862 GFIBER-UT-LGU-RM-FSL-2025',
    '44863 GFIBER-ID-PIH-RM-FSL-2025'
  ];

  filteredJobs: string[] = [];

  phases: string[] = [
    'Quoting - Site Survey - 100',
    'Quoting - Proposal - 110',
    'Engineering - Site Survey - 200',
    'Engineering - Design - 210',
    'Engineering - Documentation - 220',
    'Mobilization - In - 300',
    'Mobilization - Out - 310',
    'Installation - Infrastructure - 400',
    'Installation - Cabling - 410',
    'Installation - Power - 420',
    'Test & Turn Up - Testing - 500',
    'Test & Turn Up - Migration - 510',
    'PM - Installation - 900',
    'PM - Customer Support - 910',
    'PM - Corporate Related - 920',
    'Admin for O/H Jobs Only - 999'
  ];

  categories = Object.values(ExpenseCategory);
  paymentMethods = Object.values(PaymentMethod);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ExpenseReportModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Partial<Expense> | null,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    
    const initialDateIso = this.toDateInput(data?.date);
    this.currentUserId = this.resolveCurrentUserId();

    this.expenseForm = this.fb.group({
      date: [initialDateIso, Validators.required],             
      projectId: [data?.projectId ?? '', Validators.required],  
      phase: [data?.phase ?? null, Validators.required],
      locationText: [data?.locationText ?? ''],
      vendor: [data?.vendor ?? '', Validators.required],
      amount: [data?.amount ?? 0, [Validators.required, Validators.min(0)]],
      category: [data?.category ?? ExpenseCategory.Other, Validators.required],
      paymentMethod: [data?.paymentMethod ?? PaymentMethod.EmployeePaid, Validators.required],
      mileageMiles: [data?.mileageMiles ?? null],
      descriptionNotes: [data?.descriptionNotes ?? ''],
      isEntertainment: [data?.isEntertainment ?? false],
      entertainment: this.fb.group({
        typeOfEntertainment: [data?.entertainment?.typeOfEntertainment ?? ''],
        nameOfEstablishment: [data?.entertainment?.nameOfEstablishment ?? ''],
        numberInParty: [data?.entertainment?.numberInParty ?? null],
        businessRelationship: [data?.entertainment?.businessRelationship ?? ''],
        businessPurpose: [data?.entertainment?.businessPurpose ?? '']
      })
    });

    const projectControl = this.expenseForm.get('projectId');
    this.filteredJobs = this.filterJobs(projectControl?.value);
    projectControl?.valueChanges.subscribe(value => {
      this.filteredJobs = this.filterJobs(value);
    });

    // Toggle validators for entertainment group
    this.expenseForm.get('isEntertainment')?.valueChanges.subscribe((v: boolean) => {
      const g = this.expenseForm.get('entertainment') as FormGroup;
      if (v) {
        g.get('typeOfEntertainment')?.setValidators([Validators.required]);
        g.get('nameOfEstablishment')?.setValidators([Validators.required]);
        g.get('numberInParty')?.setValidators([Validators.required, Validators.min(1)]);
        g.get('businessRelationship')?.setValidators([Validators.required]);
        g.get('businessPurpose')?.setValidators([Validators.required]);
      } else {
        g.reset();
        g.get('typeOfEntertainment')?.clearValidators();
        g.get('nameOfEstablishment')?.clearValidators();
        g.get('numberInParty')?.clearValidators();
        g.get('businessRelationship')?.clearValidators();
        g.get('businessPurpose')?.clearValidators();
      }
      g.updateValueAndValidity();
    });

    // Auto-switch entertainment + clear mileage when category changes
    this.expenseForm.get('category')?.valueChanges.subscribe((cat: ExpenseCategory) => {
      const isEnt = cat === ExpenseCategory.Entertainment;
      if (this.expenseForm.get('isEntertainment')?.value !== isEnt) {
        this.expenseForm.get('isEntertainment')?.setValue(isEnt);
      }
      if (cat !== ExpenseCategory.Mileage) {
        this.expenseForm.get('mileageMiles')?.setValue(null);
      }
    });

    // Seed preview from existing image (if present)
    const img0: ExpenseImage | undefined = (data as any)?.images?.[0];
    const existingUrl = img0?.blobUrl;
    const existingType = img0?.contentType as string | undefined;
    if (existingUrl) {
      this.receiptPreviewName = img0?.fileName ?? undefined;
      this.setPreviewFromUrl(existingUrl, existingType);
    }
  }
  private resolveCurrentUserId(): string | null {
    const current = this.authService.getUser();
    if (current?.id) {
      return typeof current.id === 'string' ? current.id.trim() || current.id : current.id;
    }

    try {
      const stored = localStorage.getItem('user');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      const id = typeof parsed?.id === 'string' ? parsed.id.trim() : '';
      return id ? id : null;
    } catch (error) {
      console.warn('Failed to resolve user id from storage', error);
      return null;
    }
  }

  private filterJobs(value: unknown): string[] {
    const search = (value ?? '').toString().trim().toLowerCase();
    if (!search) {
      return [...this.jobs];
    }

    return this.jobs.filter(job => job.toLowerCase().includes(search));
  }
  toDateInput(value: unknown): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    if (typeof value === 'string') {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }
    }

    if (value instanceof Date) {
      return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    }

    const t = new Date();
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  }


  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files && input.files[0];
    if (!file) return;
    this.receiptPreviewName = file.name;
    this.receiptFile = file;
    this.revokeObjectUrl();

    const type = (file.type || '').toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isImage = type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'].includes(ext);
    const isPdf = type === 'application/pdf' || ext === 'pdf';

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        this.receiptPreviewKind = 'image';
        this.receiptBase64 = result;
        this.receiptPreviewUrl = result;
        this.receiptSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(result);
        this.galleryImages = [{ itemImageSrc: result }];
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    this.receiptObjectUrl = objectUrl;
    this.receiptBase64 = undefined;
    this.receiptPreviewUrl = objectUrl;
    this.receiptSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
    this.galleryImages = [];
    this.receiptPreviewKind = isPdf ? 'pdf' : 'file';
    this.cdr.detectChanges();
  }

  private setPreviewFromUrl(url?: string, contentType?: string) {
    if (!url) {
      this.receiptBase64 = undefined;
      this.receiptSafeUrl = undefined;
      this.receiptPreviewUrl = undefined;
      this.receiptPreviewKind = null;
      this.galleryImages = [];
      return;
    }
    const isHttp = /^https?:\/\//i.test(url);
    const isData = /^data:/i.test(url);
    const looksLikeBase64 = /^[A-Za-z0-9+/=\s]+$/.test(url) && !isHttp && !isData;

    const guessedType = (contentType || '').toLowerCase();
    const isPdf = guessedType === 'application/pdf' || /\.pdf(\?|$)/i.test(url);
    const isImage = !isPdf && (/^image\//i.test(guessedType)
      || /\.(jpe?g|png|gif|webp|bmp|heic|heif)(\?|$)/i.test(url));

    const effectiveType = guessedType || (isPdf ? 'application/pdf' : (isImage ? 'image/jpeg' : 'application/octet-stream'));

    const dataUrl = looksLikeBase64
      ? `data:${effectiveType};base64,${url.replace(/\s+/g, '')}`
      : url;

    this.receiptBase64 = isImage ? dataUrl : undefined;
    this.receiptSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl);
    this.receiptPreviewUrl = dataUrl;
    if (isImage) {
      this.receiptPreviewKind = 'image';
      this.galleryImages = [{ itemImageSrc: dataUrl }];
    } else if (isPdf) {
      this.receiptPreviewKind = 'pdf';
      this.galleryImages = [];
    } else {
      this.receiptPreviewKind = 'file';
      this.galleryImages = [];
    }
  }

  removeImage() {
    this.revokeObjectUrl();
    this.receiptFile = undefined;
    this.receiptBase64 = undefined;
    this.receiptSafeUrl = undefined;
    this.receiptPreviewUrl = undefined;
    this.receiptPreviewKind = null;
    this.receiptPreviewName = undefined;
    this.galleryImages = [];
  }

  private revokeObjectUrl() {
    if (this.receiptObjectUrl) {
      URL.revokeObjectURL(this.receiptObjectUrl);
      this.receiptObjectUrl = undefined;
    }
  }

  openGallery() {
    if (this.receiptPreviewKind === 'image' && this.receiptBase64) {
      this.galleryImages = [{ itemImageSrc: this.receiptBase64 }];
      this.isGalleryVisible = true;
    }
  }

  closeImageModal() { 
    this.isGalleryVisible = false; 
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }

  save() {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    const v = this.expenseForm.value;

    const resolvedCreatedBy = (() => {
      const fromData = typeof this.data?.createdBy === 'string' ? this.data.createdBy.trim() : '';
      if (fromData) return fromData;
      return this.currentUserId;
    })();

    const exp: Expense = {
      id: this.data?.id || uuidv4(),
      date: this.toDateInput(v.date),
      projectId: v.projectId!,
      phase: v.phase ?? null,
      locationText: v.locationText || '',
      vendor: v.vendor!,
      amount: Number(v.amount ?? 0),
      category: v.category!,
      paymentMethod: v.paymentMethod!,
      mileageMiles: v.category === ExpenseCategory.Mileage ? (v.mileageMiles ?? null) : null,
      descriptionNotes: v.descriptionNotes || '',
      isEntertainment: !!v.isEntertainment || v.category === ExpenseCategory.Entertainment,
      status: this.data?.status || ExpenseStatus.Pending,
      entertainment: (!!v.isEntertainment || v.category === ExpenseCategory.Entertainment)
        ? {
            typeOfEntertainment: v.entertainment?.typeOfEntertainment || '',
            nameOfEstablishment: v.entertainment?.nameOfEstablishment || '',
            numberInParty: Number(v.entertainment?.numberInParty ?? 0),
            businessRelationship: v.entertainment?.businessRelationship || '',
            businessPurpose: v.entertainment?.businessPurpose || ''
          } as EntertainmentDetail
        : null,
      images: (this.data?.images as ExpenseImage[]) ?? [],
      createdBy: resolvedCreatedBy ?? undefined,
      createdDate: this.data?.createdDate || new Date().toISOString(),
      updatedBy: this.data?.updatedBy,
      updatedDate: new Date().toISOString()
    };

    const result: ExpenseDialogResult = {
      expense: exp,
      file: this.receiptFile ?? null,
      receiptData: this.receiptBase64 ?? null
    };
    this.dialogRef.close(result);
  }

  close() { 
    this.dialogRef.close(); 
  }
}


























