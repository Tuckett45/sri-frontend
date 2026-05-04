import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { environment, local_environment } from '../../../../environments/environments';
import {
  Candidate,
  CandidateFilters,
  CreateCandidatePayload,
  UpdateCandidatePayload,
  OnboardingServiceError,
} from '../models/onboarding.models';
import { AuditMetadata } from '../models/payroll.models';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly baseUrl = `${local_environment.apiUrl}/onboarding`;

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
      const error: OnboardingServiceError = {
        statusCode: err?.status ?? 0,
        message: err?.error?.message ?? err?.message ?? 'An unexpected error occurred.',
        operation,
      };
      return throwError(() => error);
    };
  }

  // ---------------------------------------------------------------------------
  // Candidates
  // ---------------------------------------------------------------------------

  getCandidates(filters?: CandidateFilters): Observable<Candidate[]> {
    let params = new HttpParams();
    if (filters?.offerStatus) params = params.set('offerStatus', filters.offerStatus);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.incompleteCerts != null) params = params.set('incompleteCerts', String(filters.incompleteCerts));

    return this.http
      .get<Candidate[]>(`${this.baseUrl}/candidates`, { params })
      .pipe(catchError(this.mapError('getCandidates')));
  }

  getCandidateById(id: string): Observable<Candidate> {
    return this.http
      .get<Candidate>(`${this.baseUrl}/candidates/${id}`)
      .pipe(catchError(this.mapError('getCandidateById')));
  }

  createCandidate(payload: CreateCandidatePayload): Observable<Candidate> {
    const body = this.withAudit(payload);
    return this.http
      .post<Candidate>(`${this.baseUrl}/candidates`, body)
      .pipe(catchError(this.mapError('createCandidate')));
  }

  updateCandidate(id: string, payload: UpdateCandidatePayload): Observable<Candidate> {
    const body = this.withAudit(payload);
    return this.http
      .put<Candidate>(`${this.baseUrl}/candidates/${id}`, body)
      .pipe(catchError(this.mapError('updateCandidate')));
  }

  deleteCandidateById(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/candidates/${id}`)
      .pipe(catchError(this.mapError('deleteCandidateById')));
  }
}
