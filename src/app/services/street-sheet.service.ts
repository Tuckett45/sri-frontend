import { Injectable, effect } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment, local_environment } from 'src/environments/environments';
import { StreetSheet } from '../models/street-sheet.model';
import { User } from '../models/user.model';
import { OfflineCacheService } from './offline-cache.service';
import { RoleBasedDataService } from './role-based-data.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class StreetSheetService {

  private streetSheetsCache$!: Observable<StreetSheet[]> | null;
  private previousOnline = true;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
      // API subscription key will be added automatically by ConfigurationInterceptor
    })
  };

  constructor(
    private http: HttpClient, 
    private offlineCache: OfflineCacheService,
    private roleBasedDataService: RoleBasedDataService,
    private authService: AuthService
  ) {
    this.streetSheetsCache$ = null;

    this.previousOnline = this.offlineCache.isOnline();

    effect(() => {
      const currentlyOnline = this.offlineCache.online();
      if (currentlyOnline && !this.previousOnline) {
        this.streetSheetsCache$ = null;
      }
      this.previousOnline = currentlyOnline;
    });
  }

  getStreetSheets(user: User, startDate?: Date, endDate?: Date): Observable<StreetSheet[]> {
    const useDefaultRange = !startDate || !endDate;

    const offline$ = from(this.offlineCache.getStreetSheets()).pipe(
      map(sheets => this.filterStreetSheetsForUser(sheets, user, startDate, endDate))
    );

    if (useDefaultRange) {
      if (this.streetSheetsCache$ && this.offlineCache.isOnline()) {
        return this.streetSheetsCache$;
      }
      endDate = new Date();
      startDate = new Date(endDate.getTime() - 10 * 24 * 60 * 60 * 1000);
    }

    if (!this.offlineCache.isOnline()) {
      return offline$;
    }

    const start = startDate!.toISOString();
    const end = endDate!.toISOString();

    let request$;
    // Use RoleBasedDataService for market filtering
    if (this.authService.isCM() && !this.authService.isAdmin()) {
      // CM users: exclude RG markets for street sheets
      const userMarket = user.market;
      request$ = this.http.get<StreetSheet[]>(`${environment.apiUrl}/StreetSheet/${userMarket}?startDate=${start}&endDate=${end}`);
    } else if (this.authService.isAdmin()) {
      // Admin users: get all markets including RG
      request$ = this.http.get<StreetSheet[]>(`${environment.apiUrl}/StreetSheet?startDate=${start}&endDate=${end}`);
    } else {
      // Other roles: use default endpoint
      request$ = this.http.get<StreetSheet[]>(`${environment.apiUrl}/StreetSheet?startDate=${start}&endDate=${end}`);
    }

    const network$ = request$.pipe(
      tap(sheets => { void this.offlineCache.saveStreetSheets(sheets); }),
      map(sheets => this.applyRoleBasedFiltering(sheets, user)),
      map(sheets => this.filterStreetSheetsForUser(sheets, user, startDate, endDate)),
      catchError(error =>
        offline$.pipe(
          catchError(() => throwError(() => error))
        )
      )
    );

    if (useDefaultRange) {
      this.streetSheetsCache$ = network$.pipe(shareReplay(1));
      return this.streetSheetsCache$;
    }

    return network$;
  }

  /**
   * Apply role-based filtering using RoleBasedDataService
   * CM users: exclude RG markets
   * Admin users: include all markets
   */
  private applyRoleBasedFiltering(sheets: StreetSheet[], user: User): StreetSheet[] {
    if (!Array.isArray(sheets)) {
      return [];
    }

    // Admin users get all markets including RG
    if (this.authService.isAdmin()) {
      return sheets;
    }

    // CM users: exclude RG markets for street sheets
    if (this.authService.isCM()) {
      // Map state to market for filtering
      const sheetsWithMarket = sheets.map(s => ({ ...s, market: s.state }));
      const filtered = this.roleBasedDataService.applyMarketFilter(sheetsWithMarket, {
        excludeRGMarkets: true
      });
      // Map back to original StreetSheet objects
      return filtered.map(s => {
        const { market, ...rest } = s as any;
        return rest as StreetSheet;
      });
    }

    // Other roles: apply standard market filtering
    const sheetsWithMarket = sheets.map(s => ({ ...s, market: s.state }));
    const filtered = this.roleBasedDataService.applyMarketFilter(sheetsWithMarket);
    return filtered.map(s => {
      const { market, ...rest } = s as any;
      return rest as StreetSheet;
    });
  }

  private filterStreetSheetsForUser(
    sheets: StreetSheet[] | undefined,
    user: User,
    startDate?: Date,
    endDate?: Date
  ): StreetSheet[] {
    if (!Array.isArray(sheets)) {
      return [];
    }

    let filtered = [...sheets];

    const normalizedMarket = (user.market ?? '').toUpperCase();
    if (user.market !== 'RG' && user.role === 'CM') {
      filtered = filtered.filter(sheet => (sheet.state ?? '').toUpperCase() === normalizedMarket);
    }

    const startTime = startDate ? new Date(startDate).getTime() : undefined;
    const endTime = endDate ? new Date(endDate).getTime() : undefined;

    if (startTime != null || endTime != null) {
      filtered = filtered.filter(sheet => {
        const dateValue = sheet.date instanceof Date ? sheet.date.getTime() : new Date(sheet.date).getTime();
        if (isNaN(dateValue)) {
          return true;
        }
        if (startTime != null && dateValue < startTime) {
          return false;
        }
        if (endTime != null && dateValue > endTime) {
          return false;
        }
        return true;
      });
    }

    return filtered;
  }

  saveStreetSheet(formData: FormData): Observable<any> {
    // API subscription key will be added automatically by ConfigurationInterceptor
    const headers = new HttpHeaders({
      // Don't set Content-Type for FormData - browser will set it with boundary
    });

    // Associate with CM's market if CM user
    const currentUser = this.authService.getUser();
    if (this.authService.isCM() && !this.authService.isAdmin() && currentUser?.market) {
      // Add market to formData if not already present
      if (!formData.has('market') && !formData.has('state')) {
        formData.append('state', currentUser.market);
      }
    }

    this.streetSheetsCache$ = null;
    return this.http.post<any>(`${environment.apiUrl}/StreetSheet`, formData, { headers });
  }

  updateStreetSheet(streetSheet: StreetSheet): Observable<any> {
    // Validate market ownership for CMs
    if (this.authService.isCM() && !this.authService.isAdmin()) {
      if (!this.roleBasedDataService.canAccessMarket(streetSheet.state || '')) {
        return throwError(() => new Error('You do not have permission to update street sheets from other markets'));
      }
    }

    this.streetSheetsCache$ = null;
    return this.http.put<any>(`${environment.apiUrl}/StreetSheet/${streetSheet.segmentId}`, streetSheet, this.httpOptions);
  }

  deleteStreetSheet(streetSheet: StreetSheet): Observable<any> {
    // Validate market ownership for CMs
    if (this.authService.isCM() && !this.authService.isAdmin()) {
      if (!this.roleBasedDataService.canAccessMarket(streetSheet.state || '')) {
        return throwError(() => new Error('You do not have permission to delete street sheets from other markets'));
      }
    }

    this.streetSheetsCache$ = null;
    return this.http.delete<any>(`${environment.apiUrl}/StreetSheet/${streetSheet.id}`, this.httpOptions);
  }

  getCmSubmissionStats(
    startDate: Date,
    endDate: Date,
    filters?: { market?: string; vendor?: string; pm?: string; cmId?: string }
  ): Observable<any> {
    const start = startDate.toISOString();
    const end = endDate.toISOString();

    let params = new HttpParams()
      .set('startDate', start)
      .set('endDate', end);

    if (filters?.market) {
      params = params.set('market', filters.market);
    }
    if (filters?.vendor) {
      params = params.set('vendor', filters.vendor);
    }
    if (filters?.pm) {
      params = params.set('pm', filters.pm);
    }
    if (filters?.cmId) {
      params = params.set('cmId', filters.cmId);
    }

    return this.http.get<any>(`${environment.apiUrl}/StreetSheet/cm-submission-stats`, { params });
  }

  isSegmentIdUnique(segmentId: string): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiUrl}/StreetSheet/segment-id-unique/${segmentId}`);
  }
}
