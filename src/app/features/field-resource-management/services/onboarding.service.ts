import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environments';
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
  private readonly baseUrl = `${environment.atlasApiUrl}/onboarding`;

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
      .get<any>(`${this.baseUrl}/candidates`, { params })
      .pipe(
        map(response => {
          // Handle paginated response { items: [...] } or flat array
          if (Array.isArray(response)) return response;
          if (response && Array.isArray(response.items)) return response.items;
          return [];
        }),
        catchError(this.mapError('getCandidates'))
      );
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

  /**
   * Converts a candidate to a technician.
   * Creates a Technician record from the candidate data and links them via CandidateId.
   * @param candidateId The candidate to convert
   * @returns Observable with the new technician's ID
   */
  convertToTechnician(candidateId: string): Observable<{ technicianId: string }> {
    return this.http
      .post<{ technicianId: string }>(`${this.baseUrl}/candidates/${candidateId}/convert-to-technician`, {})
      .pipe(catchError(this.mapError('convertToTechnician')));
  }

  // ---------------------------------------------------------------------------
  // File Uploads
  // ---------------------------------------------------------------------------

  /**
   * Uploads a resume file for a candidate.
   * @param candidateId The candidate's ID
   * @param file The resume file (PDF, DOC, DOCX, max 10MB)
   * @returns Observable with the upload response containing the URL
   */
  uploadResume(candidateId: string, file: File): Observable<{ url: string; originalFileName: string; fileSizeBytes: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userName', this.getAuditMetadata().userName);

    return this.http
      .post<{ url: string; originalFileName: string; fileSizeBytes: number }>(
        `${this.baseUrl}/candidates/${candidateId}/resume`, formData)
      .pipe(catchError(this.mapError('uploadResume')));
  }

  /**
   * Uploads a headshot image for a candidate.
   * @param candidateId The candidate's ID
   * @param file The headshot file (JPG, PNG, max 5MB)
   * @returns Observable with the upload response containing the URL
   */
  uploadHeadshot(candidateId: string, file: File): Observable<{ url: string; originalFileName: string; fileSizeBytes: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userName', this.getAuditMetadata().userName);

    return this.http
      .post<{ url: string; originalFileName: string; fileSizeBytes: number }>(
        `${this.baseUrl}/candidates/${candidateId}/headshot`, formData)
      .pipe(catchError(this.mapError('uploadHeadshot')));
  }
}
