import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';
import { environment, local_environment } from '../../../../environments/environments';
import { HierarchyApiService, DirectReport as HierarchyDirectReport } from './hierarchy-api.service';

/**
 * Lightweight technician info returned by the direct-reports endpoint.
 */
export interface DirectReport {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
  region?: string;
  isAvailable: boolean;
  isActive: boolean;
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  locationUpdatedAt?: string;
  userId?: string;
}

/**
 * Response shape from GET /v1/managers/{id}/direct-reports
 */
export interface DirectReportsResponse {
  managerId: string;
  directReports: DirectReport[];
  totalCount: number;
}

/**
 * Response shape from GET /v1/managers/{id}/team-ids
 */
export interface TeamIdsResponse {
  managerId: string;
  technicianIds: string[];
  count: number;
}

/**
 * Team member status (from GET /v1/managers/{id}/team-status)
 */
export interface TeamMemberStatus {
  id: string;
  firstName: string;
  lastName: string;
  isAvailable: boolean;
  isClockedIn: boolean;
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  locationUpdatedAt?: string;
}

/**
 * Active time entry for a team member
 */
export interface TeamActiveEntry {
  id: string;
  technicianId: string;
  technicianName: string;
  jobId: string;
  jobTitle?: string;
  clockInTime: string;
  clockInLatitude?: number;
  clockInLongitude?: number;
  timeCategory?: string;
}

/**
 * Response shape from GET /v1/managers/{id}/team-status
 */
export interface TeamStatusResponse {
  managerId: string;
  teamSize: number;
  clockedInCount: number;
  availableCount: number;
  activeEntries: TeamActiveEntry[];
  teamMembers: TeamMemberStatus[];
}

/**
 * Service for querying a manager's direct reports and team status.
 *
 * Provides:
 * - getDirectReports(): Full team list with details
 * - getTeamIds(): Lightweight ID list (for use as filter input elsewhere)
 * - getTeamStatus(): Real-time who's clocked in / available
 * - Caching: team IDs are cached per session so repeated calls don't re-fetch
 * - myTeamEnabled$: Observable toggle state for "My Team" filter
 */
@Injectable({
  providedIn: 'root'
})
export class ManagerTeamService {
  private readonly baseUrl = `${local_environment.atlasApiUrl}/managers`;

  /** Cached team technician IDs (invalidated on toggle or page refresh) */
  private cachedTeamIds: string[] | null = null;
  private cachedManagerId: string | null = null;

  /** Observable toggle for "My Team" filter — persisted in sessionStorage */
  private readonly _myTeamEnabled = new BehaviorSubject<boolean>(this.loadToggleState());
  public readonly myTeamEnabled$ = this._myTeamEnabled.asObservable();

  constructor(
    private http: HttpClient,
    private hierarchyApi: HierarchyApiService
  ) {}

  /**
   * Get whether the "My Team" filter is currently active.
   */
  get isMyTeamEnabled(): boolean {
    return this._myTeamEnabled.value;
  }

  /**
   * Toggle the "My Team" filter on/off.
   */
  setMyTeamEnabled(enabled: boolean): void {
    this._myTeamEnabled.next(enabled);
    this.persistToggleState(enabled);
  }

  /**
   * Get full direct reports list for a manager.
   */
  getDirectReports(managerId: string, includeInactive = false): Observable<DirectReportsResponse> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', 'true');
    return this.http.get<DirectReportsResponse>(
      `${this.baseUrl}/${managerId}/direct-reports`, { params }
    ).pipe(
      catchError((err: HttpErrorResponse) => {
        // The /managers/{id}/direct-reports endpoint isn't available on all
        // environments. Fall back to the hierarchy service, which resolves
        // reports via /hierarchy/reports/{userId}.
        if (err.status === 404) {
          console.warn(
            '[ManagerTeam] /managers/%s/direct-reports returned 404, falling back to /hierarchy/reports',
            managerId
          );
          return this.getDirectReportsFromHierarchy(managerId);
        }
        throw err;
      })
    );
  }

  /**
   * Fallback resolver: builds a DirectReportsResponse from the hierarchy
   * service when the dedicated managers endpoint is unavailable.
   */
  private getDirectReportsFromHierarchy(managerId: string): Observable<DirectReportsResponse> {
    return this.hierarchyApi.getReportsForUser(managerId).pipe(
      map(reports => this.mapHierarchyReports(managerId, reports)),
      catchError((err: HttpErrorResponse) => {
        // Propagate 404 so callers can distinguish "not a manager / no hierarchy"
        // from a genuine empty team and show the appropriate message.
        if (err.status === 404) {
          throw err;
        }
        console.error('[ManagerTeam] Hierarchy fallback failed:', err);
        return of<DirectReportsResponse>({ managerId, directReports: [], totalCount: 0 });
      })
    );
  }

  /**
   * Maps hierarchy DirectReport entries into the DirectReportsResponse shape.
   */
  private mapHierarchyReports(
    managerId: string,
    reports: HierarchyDirectReport[]
  ): DirectReportsResponse {
    const directReports: DirectReport[] = reports.map(r => {
      const [firstName, ...rest] = (r.fullName ?? '').trim().split(' ');
      return {
        id: r.userId,
        userId: r.userId,
        firstName: firstName || '',
        lastName: rest.join(' '),
        email: r.email ?? '',
        role: r.role ?? undefined,
        region: r.market ?? undefined,
        isAvailable: true,
        isActive: true
      };
    });
    return { managerId, directReports, totalCount: directReports.length };
  }

  /**
   * Get just the technician IDs for a manager's team.
   * Cached per manager ID so subsequent calls in the same session are instant.
   */
  getTeamIds(managerId: string): Observable<string[]> {
    // Return cache if same manager
    if (this.cachedManagerId === managerId && this.cachedTeamIds) {
      return of(this.cachedTeamIds);
    }

    return this.http.get<TeamIdsResponse>(`${this.baseUrl}/${managerId}/team-ids`).pipe(
      map(response => response.technicianIds),
      tap(ids => {
        this.cachedTeamIds = ids;
        this.cachedManagerId = managerId;
      }),
      catchError(err => {
        console.error('Failed to load team IDs:', err);
        return of([]);
      })
    );
  }

  /**
   * Get real-time team status (who's clocked in, available, etc.)
   */
  getTeamStatus(managerId: string): Observable<TeamStatusResponse> {
    return this.http.get<TeamStatusResponse>(`${this.baseUrl}/${managerId}/team-status`);
  }

  /**
   * Invalidate the cached team IDs (e.g., when team composition changes).
   */
  clearCache(): void {
    this.cachedTeamIds = null;
    this.cachedManagerId = null;
  }

  /**
   * Check if a given technician ID is in the manager's team.
   * Uses cache if available, otherwise fetches.
   */
  isTechnicianInTeam(managerId: string, technicianId: string): Observable<boolean> {
    return this.getTeamIds(managerId).pipe(
      map(ids => ids.includes(technicianId))
    );
  }

  private loadToggleState(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('sri-my-team-filter') === 'true';
  }

  private persistToggleState(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('sri-my-team-filter', enabled ? 'true' : 'false');
  }
}
