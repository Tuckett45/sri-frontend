import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  workSite: string;
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
  private readonly baseUrl = `${environment.apiUrl}/public/onboarding`;

  constructor(private http: HttpClient) {}

  validateToken(token: string): Observable<TokenValidationResponse> {
    return this.http
      .get<TokenValidationResponse>(`${this.baseUrl}/validate`, {
        params: { token }
      })
      .pipe(catchError(this.handleError('validateToken')));
  }

  submitCandidate(token: string, payload: PublicCandidateSubmissionPayload): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/submit`, payload, {
        params: { token }
      })
      .pipe(catchError(this.handleError('submitCandidate')));
  }

  private handleError(operation: string) {
    return (err: any): Observable<never> => {
      const message = err?.error?.message ?? err?.message ?? 'An unexpected error occurred.';
      return throwError(() => ({ operation, message, statusCode: err?.status ?? 0 }));
    };
  }
}
