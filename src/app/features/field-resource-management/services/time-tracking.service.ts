import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, retry, map, switchMap } from 'rxjs/operators';
import { TimeEntry, GeoLocation } from '../models/time-entry.model';
import { 
  ClockInDto, 
  ClockOutDto, 
  UpdateTimeEntryDto, 
  TimeEntryFilters 
} from '../models/dtos';
import { DateRange } from '../models/assignment.model';
import { environment } from '../../../../environments/environments';

/**
 * Labor summary for a job
 */
export interface LaborSummary {
  jobId: string;
  totalHours: number;
  totalMileage: number;
  technicianCount: number;
  estimatedHours: number;
  variance: number;
}

/**
 * Service for managing time tracking and geolocation operations
 * Handles HTTP communication with the backend API for time entry operations
 */
@Injectable({
  providedIn: 'root'
})
export class TimeTrackingService {
  private readonly apiUrl = `${environment.apiUrl}/time-entries`;
  private readonly retryCount = 2;

  constructor(private http: HttpClient) {}

  /**
   * Clocks in a technician to a job with optional geolocation
   * @param jobId Job ID
   * @param technicianId Technician ID
   * @param captureLocation Whether to capture geolocation (default: true)
   * @returns Observable of created time entry
   */
  clockIn(jobId: string, technicianId: string, captureLocation: boolean = true): Observable<TimeEntry> {
    if (captureLocation) {
      return this.getCurrentPosition().pipe(
        switchMap(location => {
          const dto: ClockInDto = {
            jobId,
            technicianId,
            clockInTime: new Date(),
            clockInLocation: location
          };
          return this.http.post<TimeEntry>(`${this.apiUrl}/clock-in`, dto);
        }),
        catchError(error => {
          // If geolocation fails, clock in without location
          console.warn('Geolocation failed, clocking in without location', error);
          const dto: ClockInDto = {
            jobId,
            technicianId,
            clockInTime: new Date()
          };
          return this.http.post<TimeEntry>(`${this.apiUrl}/clock-in`, dto);
        })
      );
    } else {
      const dto: ClockInDto = {
        jobId,
        technicianId,
        clockInTime: new Date()
      };
      return this.http.post<TimeEntry>(`${this.apiUrl}/clock-in`, dto)
        .pipe(
          catchError(this.handleError)
        );
    }
  }

  /**
   * Clocks out a technician from a job with optional geolocation
   * @param timeEntryId Time entry ID
   * @param captureLocation Whether to capture geolocation (default: true)
   * @param manualMileage Optional manual mileage entry
   * @returns Observable of updated time entry
   */
  clockOut(timeEntryId: string, captureLocation: boolean = true, manualMileage?: number): Observable<TimeEntry> {
    if (captureLocation) {
      return this.getCurrentPosition().pipe(
        switchMap(location => {
          const dto: ClockOutDto = {
            timeEntryId,
            clockOutTime: new Date(),
            clockOutLocation: location,
            mileage: manualMileage
          };
          return this.http.post<TimeEntry>(`${this.apiUrl}/clock-out`, dto);
        }),
        catchError(error => {
          // If geolocation fails, clock out without location
          console.warn('Geolocation failed, clocking out without location', error);
          const dto: ClockOutDto = {
            timeEntryId,
            clockOutTime: new Date(),
            mileage: manualMileage
          };
          return this.http.post<TimeEntry>(`${this.apiUrl}/clock-out`, dto);
        })
      );
    } else {
      const dto: ClockOutDto = {
        timeEntryId,
        clockOutTime: new Date(),
        mileage: manualMileage
      };
      return this.http.post<TimeEntry>(`${this.apiUrl}/clock-out`, dto)
        .pipe(
          catchError(this.handleError)
        );
    }
  }

  /**
   * Retrieves time entries with optional filtering
   * @param filters Optional filters to apply to the time entry list
   * @returns Observable of time entry array
   */
  getTimeEntries(filters?: TimeEntryFilters): Observable<TimeEntry[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.technicianId) {
        params = params.set('technicianId', filters.technicianId);
      }
      if (filters.jobId) {
        params = params.set('jobId', filters.jobId);
      }
      if (filters.dateRange) {
        params = params.set('startDate', filters.dateRange.startDate.toISOString());
        params = params.set('endDate', filters.dateRange.endDate.toISOString());
      }
      if (filters.isManuallyAdjusted !== undefined) {
        params = params.set('isManuallyAdjusted', filters.isManuallyAdjusted.toString());
      }
      if (filters.page !== undefined) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.pageSize !== undefined) {
        params = params.set('pageSize', filters.pageSize.toString());
      }
    }

    return this.http.get<TimeEntry[]>(this.apiUrl, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Updates an existing time entry (admin override)
   * @param id Time entry ID
   * @param entry Updated time entry data
   * @returns Observable of updated time entry
   */
  updateTimeEntry(id: string, entry: UpdateTimeEntryDto): Observable<TimeEntry> {
    return this.http.put<TimeEntry>(`${this.apiUrl}/${id}`, entry)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves the active time entry for a technician (currently clocked in)
   * @param technicianId Technician ID
   * @returns Observable of time entry or null
   */
  getActiveTimeEntry(technicianId: string): Observable<TimeEntry | null> {
    const params = new HttpParams().set('technicianId', technicianId);
    return this.http.get<TimeEntry | null>(`${this.apiUrl}/active`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves time entries for a specific job
   * @param jobId Job ID
   * @returns Observable of time entry array
   */
  getTimeEntriesByJob(jobId: string): Observable<TimeEntry[]> {
    return this.http.get<TimeEntry[]>(`${this.apiUrl}/by-job/${jobId}`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves time entries for a specific technician within a date range
   * @param technicianId Technician ID
   * @param dateRange Date range to query
   * @returns Observable of time entry array
   */
  getTimeEntriesByTechnician(technicianId: string, dateRange: DateRange): Observable<TimeEntry[]> {
    const params = new HttpParams()
      .set('startDate', dateRange.startDate.toISOString())
      .set('endDate', dateRange.endDate.toISOString());

    return this.http.get<TimeEntry[]>(`${this.apiUrl}/by-technician/${technicianId}`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Calculates labor hours summary for a job
   * @param jobId Job ID
   * @returns Observable of labor summary
   */
  calculateLaborHours(jobId: string): Observable<LaborSummary> {
    return this.http.get<LaborSummary>(`${this.apiUrl}/labor-summary/${jobId}`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Gets the current geolocation using the browser Geolocation API
   * @returns Observable of geolocation
   */
  private getCurrentPosition(): Observable<GeoLocation> {
    if (!navigator.geolocation) {
      return throwError(() => new Error('Geolocation is not supported by this browser'));
    }

    return from(
      new Promise<GeoLocation>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
          },
          (error) => {
            let errorMessage = 'Unable to retrieve location';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location permission denied. Please enable location services.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable.';
                break;
              case error.TIMEOUT:
                errorMessage = 'Location request timed out.';
                break;
            }
            reject(new Error(errorMessage));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      })
    );
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
          errorMessage = 'Time entry not found.';
          break;
        case 409:
          errorMessage = 'Conflict. Technician is already clocked in to another job.';
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
