import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environments';
import {
  Referral,
  ReferralFilters,
  CreateReferralPayload,
  UpdateReferralPayload,
  ReferralImportRow,
  ReferralImportResult,
} from '../models/referral.models';

@Injectable({ providedIn: 'root' })
export class ReferralService {
  private readonly baseUrl = `${environment.atlasApiUrl}/onboarding/referrals`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  getReferrals(filters?: ReferralFilters): Observable<Referral[]> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.onboarded != null) params = params.set('onboarded', String(filters.onboarded));
    if (filters?.willingToTravel != null) params = params.set('willingToTravel', String(filters.willingToTravel));

    return this.http
      .get<Referral[]>(this.baseUrl, { params })
      .pipe(catchError(this.mapError('getReferrals')));
  }

  getReferralById(id: string): Observable<Referral> {
    return this.http
      .get<Referral>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.mapError('getReferralById')));
  }

  createReferral(payload: CreateReferralPayload): Observable<Referral> {
    const body = this.withAudit(payload);
    return this.http
      .post<Referral>(this.baseUrl, body)
      .pipe(catchError(this.mapError('createReferral')));
  }

  updateReferral(id: string, payload: UpdateReferralPayload): Observable<Referral> {
    const body = this.withAudit(payload);
    return this.http
      .put<Referral>(`${this.baseUrl}/${id}`, body)
      .pipe(catchError(this.mapError('updateReferral')));
  }

  deleteReferral(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.mapError('deleteReferral')));
  }

  /**
   * Bulk import referrals from parsed spreadsheet rows.
   * Sends all valid rows to the backend in a single request.
   */
  bulkImport(referrals: CreateReferralPayload[]): Observable<Referral[]> {
    const user = this.authService.getUser();
    const body = {
      referrals,
      importedBy: user?.name ?? '',
      importedAt: new Date().toISOString(),
    };
    return this.http
      .post<Referral[]>(`${this.baseUrl}/import`, body)
      .pipe(catchError(this.mapError('bulkImport')));
  }

  // ---------------------------------------------------------------------------
  // Import Parsing (client-side)
  // ---------------------------------------------------------------------------

  /**
   * Parses tab-separated or comma-separated text (from a pasted spreadsheet or CSV)
   * into structured referral rows using the SRI Referral Tracker template format.
   *
   * Expected columns (in order):
   *   First Name | Last Name | Email | Phone Number | City, State | Willing to Travel | Referred From | Onboarded
   */
  parseImportText(text: string): ReferralImportResult {
    const lines = text.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length === 0) {
      return { validRows: [], invalidRows: [], totalRows: 0 };
    }

    // Detect if first row is a header
    const firstLine = lines[0].toLowerCase();
    const isHeader = firstLine.includes('first name') || firstLine.includes('email') || firstLine.includes('referred');
    const dataLines = isHeader ? lines.slice(1) : lines;

    const validRows: CreateReferralPayload[] = [];
    const invalidRows: ReferralImportResult['invalidRows'] = [];

    dataLines.forEach((line, index) => {
      const columns = this.splitRow(line);
      const row: ReferralImportRow = {
        firstName: (columns[0] || '').trim(),
        lastName: (columns[1] || '').trim(),
        email: (columns[2] || '').trim(),
        phone: (columns[3] || '').trim(),
        cityState: (columns[4] || '').trim(),
        willingToTravel: (columns[5] || '').trim(),
        referredFrom: (columns[6] || '').trim(),
        onboarded: (columns[7] || '').trim(),
      };

      const errors = this.validateImportRow(row);

      if (errors.length === 0) {
        validRows.push({
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          cityState: row.cityState || undefined,
          willingToTravel: this.parseWillingToTravel(row.willingToTravel),
          referredFrom: row.referredFrom,
        });
      } else {
        invalidRows.push({ rowIndex: index + (isHeader ? 2 : 1), row, errors });
      }
    });

    return { validRows, invalidRows, totalRows: dataLines.length };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private splitRow(line: string): string[] {
    // Try tab-separated first (Excel paste), fall back to comma-separated
    if (line.includes('\t')) {
      return line.split('\t');
    }
    // Simple CSV split (doesn't handle quoted commas, but sufficient for this template)
    return line.split(',');
  }

  private validateImportRow(row: ReferralImportRow): string[] {
    const errors: string[] = [];
    if (!row.firstName) errors.push('First name is required');
    if (!row.lastName) errors.push('Last name is required');
    if (!row.email) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(row.email)) {
      errors.push('Invalid email format');
    }
    if (!row.phone) errors.push('Phone number is required');
    if (!row.referredFrom) errors.push('Referred from is required');
    return errors;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private parseWillingToTravel(value: string): boolean | null {
    const lower = value.toLowerCase().trim();
    if (lower === 'yes' || lower === 'y' || lower === 'true') return true;
    if (lower === 'no' || lower === 'n' || lower === 'false') return false;
    return null; // "?", empty, or unknown
  }

  private withAudit<T extends object>(payload: T): T & { userName: string; timestamp: string } {
    const user = this.authService.getUser();
    return {
      ...payload,
      userName: user?.name ?? '',
      timestamp: new Date().toISOString(),
    };
  }

  private mapError(operation: string) {
    return (err: any): Observable<never> => {
      const error = {
        statusCode: err?.status ?? 0,
        message: err?.error?.message ?? err?.message ?? 'An unexpected error occurred.',
        operation,
      };
      return throwError(() => error);
    };
  }
}
