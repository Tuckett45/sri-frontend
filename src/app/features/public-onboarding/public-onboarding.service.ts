import { Injectable } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environments';
import { ApiHeadersService } from '../../services/api-headers.service';

export type VestSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';

export interface TokenValidationResponse {
  isValid: boolean;
  reason?: string;
}

export interface PublicCandidateSubmissionPayload {
  techName: string;
  middleName?: string;
  techEmail: string;
  techPhone: string;
  vestSize: VestSize;
  homeAddress: string;
  homeState: string;
  workSite?: string;
  referredBy?: string;
  facebookProfileUrl?: string;
  startDate: string;
  experienceLevel?: string;
  drugTestComplete: boolean;
  oshaCertified: boolean;
  scissorLiftCertified: boolean;
  biisciCertified: boolean;
  osha10: boolean;
  osha30: boolean;
  ciKitAssigned: boolean;
  fiberKitAssigned: boolean;
  labelingKitAssigned: boolean;
  powerKitAssigned: boolean;
  testingEqptAssigned: boolean;
}

@Injectable()
export class PublicOnboardingService {
  private readonly baseUrl = `${environment.atlasApiUrl}/public/onboarding`;
  private readonly apiHeadersService = inject(ApiHeadersService);

  /** Subscription key is resolved at runtime from backend config — never hardcoded. */
  private get headers(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const key = this.apiHeadersService.getApiSubscriptionKey();
    if (key) {
      headers = headers.set('Ocp-Apim-Subscription-Key', key);
    }
    return headers;
  }

  constructor(private http: HttpClient) {}

  validateToken(token: string): Observable<TokenValidationResponse> {
    return this.http
      .get<TokenValidationResponse>(`${this.baseUrl}/validate`, {
        headers: this.headers,
        params: { token }
      })
      .pipe(catchError(this.handleError('validateToken')));
  }

  submitCandidate(token: string, payload: PublicCandidateSubmissionPayload): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/submit`, payload, {
        headers: this.headers,
        params: { token }
      })
      .pipe(catchError(this.handleError('submitCandidate')));
  }

  uploadCandidateFile(token: string, candidateId: string, fileType: 'resume' | 'headshot', file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    // Do not set Content-Type header for multipart; browser handles boundary
    let headers = new HttpHeaders();
    const key = this.apiHeadersService.getApiSubscriptionKey();
    if (key) {
      headers = headers.set('Ocp-Apim-Subscription-Key', key);
    }
    return this.http
      .post<{ url: string }>(`${this.baseUrl}/candidates/${candidateId}/${fileType}`, formData, {
        headers,
        params: { token }
      })
      .pipe(catchError(this.handleError(`upload${fileType}`)));
  }

  startSession(): Observable<{ token: string }> {
    return this.http
      .post<{ token: string }>(`${this.baseUrl}/start`, {}, {
        headers: this.headers
      })
      .pipe(catchError(this.handleError('startSession')));
  }

  private handleError(operation: string) {
    return (err: any): Observable<never> => {
      const message = err?.error?.message ?? err?.message ?? 'An unexpected error occurred.';
      return throwError(() => ({ operation, message, statusCode: err?.status ?? 0 }));
    };
  }
}
