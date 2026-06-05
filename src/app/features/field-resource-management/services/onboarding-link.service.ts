import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environments';

export interface OnboardingLinkResponse {
  id: string;
  token: string;
  url: string;
  createdByUserName: string;
  createdBy: string;
  status: 'active' | 'expired' | 'used' | 'revoked';
  notes?: string;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
  isRevoked: boolean;
  candidateId?: string;
}

@Injectable({ providedIn: 'root' })
export class OnboardingLinkService {
  private readonly baseUrl = `${environment.atlasApiUrl}/onboarding/links`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // ---------------------------------------------------------------------------
  // Audit helpers
  // ---------------------------------------------------------------------------

  private withAudit<T extends object>(payload: T): T & { userName: string; timestamp: string } {
    const user = this.authService.getUser();
    return {
      ...payload,
      userName: user?.name ?? '',
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Error mapping
  // ---------------------------------------------------------------------------

  private mapError(operation: string) {
    return (err: any): Observable<never> => {
      const message = err?.error?.message ?? err?.message ?? 'An unexpected error occurred.';
      return throwError(() => ({ statusCode: err?.status ?? 0, message, operation }));
    };
  }

  // ---------------------------------------------------------------------------
  // API methods
  // ---------------------------------------------------------------------------

  generateLink(notes?: string, expiresInHours?: number): Observable<OnboardingLinkResponse> {
    const body = this.withAudit({ notes, expiresInHours });
    return this.http
      .post<OnboardingLinkResponse>(this.baseUrl, body)
      .pipe(catchError(this.mapError('generateLink')));
  }

  getLinks(): Observable<OnboardingLinkResponse[]> {
    return this.http
      .get<OnboardingLinkResponse[]>(this.baseUrl)
      .pipe(catchError(this.mapError('getLinks')));
  }

  revokeLink(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/${id}/revoke`, {})
      .pipe(catchError(this.mapError('revokeLink')));
  }
}
