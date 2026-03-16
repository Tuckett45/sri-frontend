import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment, local_environment } from 'src/environments/environments';
import {
  DailyReport,
  DailyReportSubmissionStatus,
  UserSubmissionStatus
} from '../models/daily-report.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class DailyReportService {
  private baseUrl = `${environment.apiUrl}/dailyreport`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private buildHeaders(token?: string | null): HttpHeaders {
    // API subscription key will be added automatically by ConfigurationInterceptor
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const currentUserId = this.authService.getUser()?.id;
    if (currentUserId) {
      headers = headers.set('X-User-Id', currentUserId);
    }

    if (token) {
      const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      headers = headers.set('Authorization', value);
    }
    return headers;
  }

  /**
   * Get the current user's daily report for a given date (defaults to today)
   */
  getMyDailyReport(date?: Date): Observable<DailyReport | null> {
    let url = `${this.baseUrl}/my`;
    if (date) {
      url += `?date=${date.toISOString()}`;
    }

    return this.withAuth(options => this.http.get<DailyReport>(url, options)).pipe(
      map(report => ({
        ...report,
        submittedDate: report.submittedDate ? new Date(report.submittedDate) : undefined,
        validatedDate: report.validatedDate ? new Date(report.validatedDate) : undefined
      })),
      catchError(error => {
        if (error.status === 404) {
          return of(null);
        }
        throw error;
      })
    );
  }

  private withAuth<T>(callback: (options: { headers: HttpHeaders }) => Observable<T>): Observable<T> {
    return from(this.authService.getAccessToken()).pipe(
      switchMap(token => callback({ headers: this.buildHeaders(token) }))
    );
  }

  /**
   * Submit a daily report for the current user
   * @param report - The daily report data to submit
   * @returns Observable with the response message and report ID
   */
  submitDailyReport(report: DailyReport): Observable<{ message: string; reportId: number }> {
    return this.withAuth(options =>
      this.http.post<{ message: string; reportId: number }>(
        this.baseUrl,
        report,
        options
      )
    );
  }

  /**
   * Check if the current user has submitted a report today
   * @returns Observable with submission status
   */
  getSubmissionStatus(): Observable<DailyReportSubmissionStatus> {
    return this.withAuth(options =>
      this.http.get<DailyReportSubmissionStatus>(
        `${this.baseUrl}/submission-status`,
        options
      )
    ).pipe(
      map(status => ({
        ...status,
        lastSubmissionDate: status.lastSubmissionDate
          ? new Date(status.lastSubmissionDate)
          : undefined
      }))
    );
  }

  /**
   * Get all daily reports with optional date filtering (Admin only)
   * @param startDate - Optional start date for filtering
   * @param endDate - Optional end date for filtering
   * @returns Observable with list of daily reports
   */
  getAllReports(startDate?: Date, endDate?: Date): Observable<DailyReport[]> {
    let url = `${this.baseUrl}/admin`;
    const params: string[] = [];

    if (startDate) {
      params.push(`startDate=${startDate.toISOString()}`);
    }
    if (endDate) {
      params.push(`endDate=${endDate.toISOString()}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.withAuth(options => this.http.get<DailyReport[]>(url, options)).pipe(
      map(reports =>
        reports.map(report => ({
          ...report,
          submittedDate: report.submittedDate ? new Date(report.submittedDate) : undefined,
          validatedDate: report.validatedDate ? new Date(report.validatedDate) : undefined
        }))
      )
    );
  }

  /**
   * Get daily reports for a specific date (Admin only)
   * @param date - Date to retrieve reports for (defaults to today)
   * @returns Observable with list of daily reports
   */
  getReportsByDate(date?: Date): Observable<DailyReport[]> {
    let url = `${this.baseUrl}/admin/by-date`;
    if (date) {
      url += `?date=${date.toISOString()}`;
    }

    return this.withAuth(options => this.http.get<DailyReport[]>(url, options)).pipe(
      map(reports =>
        reports.map(report => ({
          ...report,
          submittedDate: report.submittedDate ? new Date(report.submittedDate) : undefined,
          validatedDate: report.validatedDate ? new Date(report.validatedDate) : undefined
        }))
      )
    );
  }

  /**
   * Get user submission status for a specific date (Admin only)
   * @param date - Date to check submission status for (defaults to today)
   * @returns Observable with user submission status list
   */
  getUserSubmissionStatus(date?: Date, market?: string): Observable<UserSubmissionStatus[]> {
    const marketParam = (market && market.trim().toUpperCase() !== 'RG') ? market.trim() : 'all';
    let url = `${this.baseUrl}/admin/user-status/${marketParam}`;
    if (date) {
      url += `?date=${date.toISOString()}`;
    }

    return this.withAuth(options => this.http.get<UserSubmissionStatus[]>(url, options)).pipe(
      map(statuses =>
        statuses.map(status => ({
          ...status,
          lastSubmissionDate: status.lastSubmissionDate
            ? new Date(status.lastSubmissionDate)
            : undefined
        }))
      )
    );
  }

  /**
   * Get a single daily report by ID
   * @param id - The report ID
   * @returns Observable with the daily report details
   */
  getReportById(id: number): Observable<DailyReport> {
    return this.withAuth(options => this.http.get<DailyReport>(`${this.baseUrl}/${id}`, options)).pipe(
      map(report => ({
        ...report,
        submittedDate: report.submittedDate ? new Date(report.submittedDate) : undefined,
        validatedDate: report.validatedDate ? new Date(report.validatedDate) : undefined
      }))
    );
  }

  /**
   * Validate a daily report (Admin only)
   * @param id - The report ID to validate
   * @returns Observable with validation response
   */
  validateReport(id: number): Observable<{ message: string }> {
    return this.withAuth(options =>
      this.http.put<{ message: string }>(
        `${this.baseUrl}/${id}/validate`,
        {},
        options
      )
    );
  }

  /**
   * Get autocomplete lookup options for a specific field
   * @param fieldName - The field name to get options for
   * @returns Observable with array of option values
   */
  getLookupOptions(fieldName: string): Observable<string[]> {
    return this.withAuth(options =>
      this.http.get<string[]>(
        `${this.baseUrl}/lookups/${fieldName}`,
        options
      )
    );
  }
}
