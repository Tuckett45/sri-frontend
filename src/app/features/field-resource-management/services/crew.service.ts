/**
 * Crew Service
 * Handles HTTP communication with the backend API for crew-related operations
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { Crew } from '../models/crew.model';
import { CreateCrewDto, UpdateCrewDto } from '../models/dtos/crew.dto';
import { CrewFilters } from '../models/dtos/filters.dto';
import { GeoLocation } from '../models/time-entry.model';
import { LocationHistoryEntry, LocationHistoryFilters } from '../models/location-history.model';
import { environment } from '../../../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class CrewService {
  private readonly apiUrl = `${environment.atlasApiUrl}/crews`;
  private readonly retryCount = 2;

  constructor(private http: HttpClient) {}

  /**
   * Retrieves a list of crews with optional filtering
   * @param filters Optional filters to apply to the crew list
   * @returns Observable of crew array
   */
  getCrews(filters?: CrewFilters): Observable<Crew[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.market) {
        params = params.set('market', filters.market);
      }
      if (filters.company) {
        params = params.set('company', filters.company);
      }
      if (filters.searchTerm) {
        params = params.set('searchTerm', filters.searchTerm);
      }
      if (filters.leadTechnicianId) {
        params = params.set('leadTechnicianId', filters.leadTechnicianId);
      }
      if (filters.page !== undefined) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.pageSize !== undefined) {
        params = params.set('pageSize', filters.pageSize.toString());
      }
    }

    return this.http.get<any[]>(this.apiUrl, { params }).pipe(
      retry(this.retryCount),
      map(crews => crews.map(crew => this.normalizeCrew(crew))),
      catchError(this.handleError)
    );
  }

  /**
   * Retrieves a single crew by ID
   * @param id Crew ID
   * @returns Observable of crew
   */
  getCrewById(id: string): Observable<Crew> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      retry(this.retryCount),
      map(crew => this.normalizeCrew(crew)),
      catchError(this.handleError)
    );
  }

  /**
   * Creates a new crew
   * @param crew Crew data to create
   * @returns Observable of created crew
   */
  createCrew(crew: CreateCrewDto): Observable<Crew> {
    return this.http.post<any>(this.apiUrl, crew).pipe(
      map(c => this.normalizeCrew(c)),
      catchError(this.handleError)
    );
  }

  /**
   * Updates an existing crew
   * @param id Crew ID
   * @param crew Updated crew data
   * @returns Observable of updated crew
   */
  updateCrew(id: string, crew: UpdateCrewDto): Observable<Crew> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, crew).pipe(
      map(c => this.normalizeCrew(c)),
      catchError(this.handleError)
    );
  }

  /**
   * Deletes a crew
   * @param id Crew ID
   * @returns Observable of void
   */
  deleteCrew(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Updates crew location
   * @param crewId Crew ID
   * @param location New location coordinates
   * @returns Observable of updated crew
   */
  updateCrewLocation(crewId: string, location: GeoLocation): Observable<Crew> {
    return this.http.patch<any>(`${this.apiUrl}/${crewId}/location`, location).pipe(
      map(c => this.normalizeCrew(c)),
      catchError(this.handleError)
    );
  }

  /**
   * Assigns a job to a crew
   * @param crewId Crew ID
   * @param jobId Job ID to assign
   * @returns Observable of updated crew
   */
  assignJobToCrew(crewId: string, jobId: string): Observable<Crew> {
    return this.http.post<any>(`${this.apiUrl}/${crewId}/assign-job`, { jobId }).pipe(
      map(c => this.normalizeCrew(c)),
      catchError(this.handleError)
    );
  }

  /**
   * Unassigns the current job from a crew
   * @param crewId Crew ID
   * @returns Observable of updated crew
   */
  unassignJobFromCrew(crewId: string): Observable<Crew> {
    return this.http.post<any>(`${this.apiUrl}/${crewId}/unassign-job`, {}).pipe(
      map(c => this.normalizeCrew(c)),
      catchError(this.handleError)
    );
  }

  /**
   * Adds a member to a crew
   * @param crewId Crew ID
   * @param technicianId Technician ID to add
   * @returns Observable of updated crew
   */
  addCrewMember(crewId: string, technicianId: string): Observable<Crew> {
    return this.http.post<any>(`${this.apiUrl}/${crewId}/members`, { technicianId }).pipe(
      map(c => this.normalizeCrew(c)),
      catchError(this.handleError)
    );
  }

  /**
   * Removes a member from a crew
   * @param crewId Crew ID
   * @param technicianId Technician ID to remove
   * @returns Observable of updated crew
   */
  removeCrewMember(crewId: string, technicianId: string): Observable<Crew> {
    return this.http.delete<any>(`${this.apiUrl}/${crewId}/members/${technicianId}`).pipe(
      map(c => this.normalizeCrew(c)),
      catchError(this.handleError)
    );
  }

  /**
   * Retrieves location history for a crew
   * @param filters Location history filters (entityId, date range, limit)
   * @returns Observable of location history entries
   */
  getCrewLocationHistory(filters: LocationHistoryFilters): Observable<LocationHistoryEntry[]> {
    let params = new HttpParams();

    if (filters.startDate) {
      params = params.set('startDate', filters.startDate.toISOString());
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate.toISOString());
    }
    if (filters.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<LocationHistoryEntry[]>(
      `${this.apiUrl}/${filters.entityId}/location-history`,
      { params }
    ).pipe(
      retry(this.retryCount),
      catchError(this.handleError)
    );
  }

  /**
   * Normalizes crew data from API response.
   * Handles cases where the API may return:
   * - `members` (array of objects) instead of `memberIds` (array of strings)
   * - `memberCount` instead of actual member IDs
   * - `null` or `undefined` for memberIds
   */
  private normalizeCrew(crew: any): Crew {
    let memberIds: string[] = crew.memberIds || [];

    // If API returns `members` as an array of objects, extract technician IDs
    if ((!memberIds || memberIds.length === 0) && Array.isArray(crew.members)) {
      memberIds = crew.members.map((m: any) =>
        typeof m === 'string' ? m : m.technicianId || m.id
      ).filter(Boolean);
    }

    return {
      ...crew,
      memberIds,
      // Ensure dates are present
      createdAt: crew.createdAt || new Date(),
      updatedAt: crew.updatedAt || new Date()
    };
  }

  /**
   * Handles HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;

      // Provide more specific error messages based on status code
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid request. Please check your input.';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in.';
          break;
        case 403:
          errorMessage = 'Access denied. You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'Crew not found.';
          break;
        case 409:
          errorMessage = 'Conflict. A crew with this ID already exists.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
      }
    }

    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
