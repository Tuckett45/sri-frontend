import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environments';
import {
  IncidentReport,
  IncidentReportFilters,
  CreateIncidentReportPayload,
  DirectDepositChange,
  DirectDepositPayload,
  W4Change,
  W4Payload,
  ContactInfoChange,
  ContactInfoPayload,
  PrcSignature,
  PrcPayload,
  PayStub,
  PayStubFilters,
  W2Document,
  PayrollServiceError,
  AuditMetadata,
} from '../models/payroll.models';

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly baseUrl = `${environment.apiUrl}/payroll`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // ---------------------------------------------------------------------------
  // Audit helpers
  // ---------------------------------------------------------------------------

  private getAuditMetadata(): AuditMetadata {
    const user = this.authService.getUser();
    return {
      userId: user?.id ?? '',
      userName: user?.name ?? '',
      userRole: user?.role ?? '',
      timestamp: new Date().toISOString(),
    };
  }

  private withAudit<T extends object>(payload: T): T & AuditMetadata {
    return { ...payload, ...this.getAuditMetadata() };
  }

  // ---------------------------------------------------------------------------
  // Error mapping
  // ---------------------------------------------------------------------------

  private mapError(operation: string) {
    return (err: any): Observable<never> => {
      const error: PayrollServiceError = {
        statusCode: err?.status ?? 0,
        message: err?.error?.message ?? err?.message ?? 'An unexpected error occurred.',
        operation,
      };
      return throwError(() => error);
    };
  }

  // ---------------------------------------------------------------------------
  // Incident Reports
  // ---------------------------------------------------------------------------

  getIncidentReports(filters?: IncidentReportFilters): Observable<IncidentReport[]> {
    let params = new HttpParams();
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.employeeId) params = params.set('employeeId', filters.employeeId);
    if (filters?.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params = params.set('dateTo', filters.dateTo);

    return this.http
      .get<IncidentReport[]>(`${this.baseUrl}/incident-reports`, { params })
      .pipe(catchError(this.mapError('getIncidentReports')));
  }

  createIncidentReport(payload: CreateIncidentReportPayload): Observable<IncidentReport> {
    const body = this.withAudit(payload);
    return this.http
      .post<IncidentReport>(`${this.baseUrl}/incident-reports`, body)
      .pipe(catchError(this.mapError('createIncidentReport')));
  }

  // ---------------------------------------------------------------------------
  // Direct Deposit
  // ---------------------------------------------------------------------------

  submitDirectDepositChange(payload: DirectDepositPayload): Observable<DirectDepositChange> {
    const body = this.withAudit(payload);
    return this.http
      .post<DirectDepositChange>(`${this.baseUrl}/direct-deposit`, body)
      .pipe(catchError(this.mapError('submitDirectDepositChange')));
  }

  getDirectDepositHistory(employeeId: string): Observable<DirectDepositChange[]> {
    return this.http
      .get<DirectDepositChange[]>(`${this.baseUrl}/direct-deposit/${employeeId}`)
      .pipe(catchError(this.mapError('getDirectDepositHistory')));
  }

  // ---------------------------------------------------------------------------
  // W-4 Changes
  // ---------------------------------------------------------------------------

  submitW4Change(payload: W4Payload): Observable<W4Change> {
    const body = this.withAudit(payload);
    return this.http
      .post<W4Change>(`${this.baseUrl}/w4`, body)
      .pipe(catchError(this.mapError('submitW4Change')));
  }

  getW4History(employeeId: string): Observable<W4Change[]> {
    return this.http
      .get<W4Change[]>(`${this.baseUrl}/w4/${employeeId}`)
      .pipe(catchError(this.mapError('getW4History')));
  }

  // ---------------------------------------------------------------------------
  // Contact Info Changes
  // ---------------------------------------------------------------------------

  submitContactInfoChange(payload: ContactInfoPayload): Observable<ContactInfoChange> {
    const body = this.withAudit(payload);
    return this.http
      .post<ContactInfoChange>(`${this.baseUrl}/contact-info`, body)
      .pipe(catchError(this.mapError('submitContactInfoChange')));
  }

  getContactInfoHistory(employeeId: string): Observable<ContactInfoChange[]> {
    return this.http
      .get<ContactInfoChange[]>(`${this.baseUrl}/contact-info/${employeeId}`)
      .pipe(catchError(this.mapError('getContactInfoHistory')));
  }

  // ---------------------------------------------------------------------------
  // PRC Signing
  // ---------------------------------------------------------------------------

  signPrc(payload: PrcPayload): Observable<PrcSignature> {
    const body = this.withAudit(payload);
    return this.http
      .post<PrcSignature>(`${this.baseUrl}/prc`, body)
      .pipe(catchError(this.mapError('signPrc')));
  }

  getPrcHistory(employeeId: string): Observable<PrcSignature[]> {
    return this.http
      .get<PrcSignature[]>(`${this.baseUrl}/prc/${employeeId}`)
      .pipe(catchError(this.mapError('getPrcHistory')));
  }

  getPrcByDocRef(employeeId: string, documentRef: string): Observable<PrcSignature | null> {
    const params = new HttpParams().set('documentRef', documentRef);
    return this.http
      .get<PrcSignature | null>(`${this.baseUrl}/prc/${employeeId}/doc-ref`, { params })
      .pipe(catchError(this.mapError('getPrcByDocRef')));
  }

  // ---------------------------------------------------------------------------
  // Pay Stubs
  // ---------------------------------------------------------------------------

  getPayStubs(employeeId: string, params?: PayStubFilters): Observable<PayStub[]> {
    let httpParams = new HttpParams();
    if (params?.year != null) httpParams = httpParams.set('year', String(params.year));
    if (params?.payPeriod) httpParams = httpParams.set('payPeriod', params.payPeriod);

    return this.http
      .get<PayStub[]>(`${this.baseUrl}/pay-stubs/${employeeId}`, { params: httpParams })
      .pipe(catchError(this.mapError('getPayStubs')));
  }

  getPayStubPdf(employeeId: string, payPeriod: string): Observable<Blob> {
    const params = new HttpParams().set('payPeriod', payPeriod);
    return this.http
      .get(`${this.baseUrl}/pay-stubs/${employeeId}/pdf`, { params, responseType: 'blob' })
      .pipe(catchError(this.mapError('getPayStubPdf')));
  }

  // ---------------------------------------------------------------------------
  // W-2 Documents
  // ---------------------------------------------------------------------------

  getW2Documents(employeeId: string, taxYear?: number): Observable<W2Document[]> {
    let params = new HttpParams();
    if (taxYear != null) params = params.set('taxYear', String(taxYear));

    return this.http
      .get<W2Document[]>(`${this.baseUrl}/w2/${employeeId}`, { params })
      .pipe(catchError(this.mapError('getW2Documents')));
  }

  getW2Pdf(employeeId: string, taxYear: number): Observable<Blob> {
    const params = new HttpParams().set('taxYear', String(taxYear));
    return this.http
      .get(`${this.baseUrl}/w2/${employeeId}/pdf`, { params, responseType: 'blob' })
      .pipe(catchError(this.mapError('getW2Pdf')));
  }

  getAvailableTaxYears(employeeId: string): Observable<number[]> {
    return this.http
      .get<number[]>(`${this.baseUrl}/w2/${employeeId}/tax-years`)
      .pipe(catchError(this.mapError('getAvailableTaxYears')));
  }
}
