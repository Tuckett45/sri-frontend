import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environments';
import { AuthService } from '../../services/auth.service';

/** Request to provision M365/login accounts for an existing technician. */
export interface NewHireOnboardingRequest {
  /** Provide either technicianId or email to identify the technician. */
  technicianId?: string;
  email?: string;
  /** Destination mobile number in E.164 format (e.g. "+15551234567"). Falls back to the tech's number on record. */
  mobilePhone?: string;
  /** Optional ISO 3166-1 alpha-2 usage location override (e.g. "US"). */
  usageLocation?: string;
  /** Also create the sri-backend login so the hire can use the frontend. Defaults to true. */
  createSriLogin?: boolean;
}

/** Per-step outcome returned by the backend. Never contains the temporary password. */
export interface NewHireOnboardingResult {
  technicianId: string;
  technicianName: string;
  userPrincipalName: string;
  m365UserCreated: boolean;
  licenseAssigned: boolean;
  sriLoginCreated: boolean;
  smsSent: boolean;
  messages: string[];
}

/** A subscribed SKU available in the tenant (for identifying the license SKU GUID). */
export interface AvailableLicense {
  skuId: string;
  skuPartNumber: string;
  consumedUnits: number;
  prepaidEnabledUnits?: number;
}

@Injectable()
export class NewHireOnboardingService {
  private readonly baseUrl = `${environment.atlasApiUrl}/onboarding/new-hire`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  /** Wraps a request with the current user's Bearer token (same pattern as FieldResourceService). */
  private withAuth<T>(callback: (options: { headers: HttpHeaders }) => Observable<T>): Observable<T> {
    return from(this.authService.getAccessToken()).pipe(
      switchMap(token => {
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
          const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          headers = headers.set('Authorization', value);
        }
        return callback({ headers });
      })
    );
  }

  provision(request: NewHireOnboardingRequest): Observable<NewHireOnboardingResult> {
    return this.withAuth(options =>
      this.http.post<NewHireOnboardingResult>(this.baseUrl, request, options)
    ).pipe(catchError(this.handleError('provision')));
  }

  getAvailableLicenses(): Observable<AvailableLicense[]> {
    return this.withAuth(options =>
      this.http.get<AvailableLicense[]>(`${this.baseUrl}/available-licenses`, options)
    ).pipe(catchError(this.handleError('getAvailableLicenses')));
  }

  private handleError(operation: string) {
    return (err: any): Observable<never> => {
      const message = err?.error?.message ?? err?.message ?? 'An unexpected error occurred.';
      return throwError(() => ({ operation, message, statusCode: err?.status ?? 0 }));
    };
  }
}
