import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environments';

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
  startDate: string;
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

  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': 'ffd675634ab645d7845640bb88d672d8'
  });

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
    const headers = new HttpHeaders({
      'Ocp-Apim-Subscription-Key': 'ffd675634ab645d7845640bb88d672d8'
    });
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
