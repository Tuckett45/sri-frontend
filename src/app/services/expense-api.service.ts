// src/app/services/expense-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment, local_environment } from 'src/environments/environments';
import {
  Expense,
  ExpenseListResponse,
  ExpenseListItem,
  ExpenseCategory,
  PaymentMethod,
  ExpenseImage,
  ExpenseStatus
} from '../models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpenseApiService {
  private jsonOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  // For multipart, do not set Content-Type (browser sets boundary)
  private authOnlyOptions = {
    headers: new HttpHeaders({
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  private baseUrl = `${environment.apiUrl}/expenses`;

  constructor(private http: HttpClient) {}

  // --- helpers ---------------------------------------------------------------
  private toDateInput(value: unknown): string {
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

  private toFormData(e: Expense & { id?: string }, file?: File): FormData {
    const fd = new FormData();
    if (e.id) fd.append('Id', e.id);
    fd.append('ProjectId', e.projectId ?? '');
    fd.append('Phase', e.phase ?? '');
    fd.append('Date', this.toDateInput(e.date));
    if (e.locationText) fd.append('LocationText', e.locationText);
    fd.append('Vendor', e.vendor ?? '');
    fd.append('Amount', String(e.amount ?? 0));
    fd.append('Category', e.category as unknown as string);
    fd.append('PaymentMethod', e.paymentMethod as unknown as string);

    if (e.category === ExpenseCategory.Mileage && e.mileageMiles != null) {
      fd.append('MileageMiles', String(e.mileageMiles));
    }
    // If your backend expects DescriptionNotes for form, keep this:
    if ((e as any).descriptionNotes) fd.append('DescriptionNotes', (e as any).descriptionNotes);
    // If you standardized on `description`, map it:
    if ((e as any).description) fd.append('DescriptionNotes', (e as any).description);

    const isEnt = !!e.isEntertainment || e.category === ExpenseCategory.Entertainment;
    fd.append('IsEntertainment', String(isEnt));
    if (isEnt && e.entertainment) {
      if (e.entertainment.typeOfEntertainment) fd.append('TypeOfEntertainment', e.entertainment.typeOfEntertainment);
      if (e.entertainment.nameOfEstablishment) fd.append('NameOfEstablishment', e.entertainment.nameOfEstablishment);
      if (e.entertainment.numberInParty != null) fd.append('NumberInParty', String(e.entertainment.numberInParty));
      if (e.entertainment.businessRelationship) fd.append('BusinessRelationship', e.entertainment.businessRelationship);
      if (e.entertainment.businessPurpose) fd.append('BusinessPurpose', e.entertainment.businessPurpose);
    }

    // NEW: pass status when present
    if ((e as any).status) fd.append('Status', (e as any).status as unknown as string);
    if (e.createdBy) fd.append('CreatedBy', e.createdBy);

    if (file) fd.append('Attachment', file, file.name);
    return fd;
  }

  // --- create/update/delete --------------------------------------------------
  submitExpense(expense: Expense, file?: File, receiptData?: string): Observable<Expense> {
    if (file) {
      const fd = this.toFormData(expense, file);
      return this.http.post<Expense>(`${this.baseUrl}/form`, fd, this.authOnlyOptions);
    } else {
      const payload: any = {
        projectId: expense.projectId,
        phase: expense.phase ?? null,
        date: this.toDateInput(expense.date),
        locationText: expense.locationText || null,
        vendor: expense.vendor,
        amount: expense.amount,
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        mileageMiles: expense.mileageMiles ?? null,
        // If you renamed to `description` in JSON, prefer that:
        description: (expense as any).description ?? (expense as any).descriptionNotes ?? null,
        // If not renamed, keep descriptionNotes instead:
        // descriptionNotes: (expense as any).descriptionNotes ?? null,
        isEntertainment: !!expense.isEntertainment || expense.category === ExpenseCategory.Entertainment,
        entertainment: expense.isEntertainment && expense.entertainment ? {
          typeOfEntertainment: expense.entertainment.typeOfEntertainment,
          nameOfEstablishment: expense.entertainment.nameOfEstablishment,
          numberInParty: expense.entertainment.numberInParty,
          businessRelationship: expense.entertainment.businessRelationship,
          businessPurpose: expense.entertainment.businessPurpose
        } : null
      };
      if (expense.createdBy) payload.createdBy = expense.createdBy;
      // NEW: send status if set
      if ((expense as any).status) payload.status = (expense as any).status;

      if (receiptData) payload.receiptData = receiptData;
      return this.http.post<Expense>(this.baseUrl, payload, this.jsonOptions);
    }
  }

  updateExpense(expense: Expense, file?: File, receiptData?: string): Observable<Expense> {
    if (!expense.id) throw new Error('Expense id is required for update');

    if (file) {
      const fd = this.toFormData(expense, file);
      return this.http.put<Expense>(`${this.baseUrl}/form/${expense.id}`, fd, this.authOnlyOptions);
    } else {
      const payload: any = {
        id: expense.id,
        projectId: expense.projectId,
        phase: expense.phase ?? null,
        date: this.toDateInput(expense.date),
        locationText: expense.locationText || null,
        vendor: expense.vendor,
        amount: expense.amount,
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        mileageMiles: expense.mileageMiles ?? null,
        // JSON name�prefer `description` if backend exposes it:
        description: (expense as any).description ?? (expense as any).descriptionNotes ?? null,
        // Or keep descriptionNotes if you didn�t switch controller JSON:
        // descriptionNotes: (expense as any).descriptionNotes ?? null,
        isEntertainment: !!expense.isEntertainment || expense.category === ExpenseCategory.Entertainment,
        entertainment: expense.isEntertainment && expense.entertainment ? {
          typeOfEntertainment: expense.entertainment.typeOfEntertainment,
          nameOfEstablishment: expense.entertainment.nameOfEstablishment,
          numberInParty: expense.entertainment.numberInParty,
          businessRelationship: expense.entertainment.businessRelationship,
          businessPurpose: expense.entertainment.businessPurpose
        } : null
      };
      if (expense.createdBy) payload.createdBy = expense.createdBy;
      // NEW: send status if set
      if ((expense as any).status) payload.status = (expense as any).status;
      payload.updatedBy = expense.updatedBy ?? '';
      if (receiptData) payload.receiptData = receiptData;
      return this.http.put<Expense>(`${this.baseUrl}/${expense.id}`, payload, this.jsonOptions);
    }
  }

  deleteExpense(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, this.authOnlyOptions);
  }

  // --- images ----------------------------------------------------------------
  addImage(expenseId: string, file: File): Observable<ExpenseImage> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<ExpenseImage>(`${this.baseUrl}/${expenseId}/images`, fd, this.authOnlyOptions);
  }

  removeImage(imageId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/images/${imageId}`, this.authOnlyOptions);
  }

  // --- reads: HR (paged) + personal (flat) -----------------------------------
  getExpenses(opts: {
    from?: string;
    to?: string;
    projectIds?: string;
    category?: ExpenseCategory;
    paymentMethod?: PaymentMethod;
    hasEntertainment?: boolean;
    withReceipts?: boolean;
    createdBy?: string;
    page?: number;
    pageSize?: number;
    includeImages?: boolean;
    status?: ExpenseStatus; // NEW filter
  } = {}): Observable<ExpenseListResponse> {
    let params = new HttpParams();
    Object.entries(opts).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<ExpenseListResponse>(this.baseUrl, { ...this.authOnlyOptions, params });
  }

  getExpensesFlat(opts: Parameters<ExpenseApiService['getExpenses']>[0] = {}) {
    return this.getExpenses(opts).pipe(map(res => res.items));
  }

  /** Personal view: flat list filtered by the specified user (email/UPN/id). */
  getMyExpenses(
    createdBy: string,
    opts: {
      from?: string; to?: string;
      page?: number; pageSize?: number;
      includeImages?: boolean;
      status?: ExpenseStatus;
    } = { page: 1, pageSize: 10}
  ): Observable<ExpenseListItem> {
    const merged = { ...opts, createdBy };
    return this.getExpenses(merged).pipe(map(res => (res) as unknown as ExpenseListItem));
  }

  
  getTeamExpenses(opts: Parameters<ExpenseApiService['getExpenses']>[0] = {}): Observable<ExpenseListResponse> {
    return this.getExpenses(opts);
  }
}










