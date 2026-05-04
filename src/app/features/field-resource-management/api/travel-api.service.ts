/**
 * Travel API Service
 * 
 * Provides a validated API integration layer for travel management operations.
 * Wraps HTTP calls with request validation, geocoding integration, and error handling.
 * 
 * Endpoints:
 * - GET   /api/travel/profiles/:technicianId          - Get travel profile
 * - PATCH /api/travel/profiles/:technicianId/flag      - Update travel flag
 * - PATCH /api/travel/profiles/:technicianId/address   - Update home address
 * - POST  /api/travel/calculate-distances              - Calculate distances
 * 
 * Requirements: 4.1-4.7, 5.1-5.9, 9.1-9.6
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import {
  TravelProfile,
  Address,
  Coordinates,
  GeocodingStatus,
  TechnicianDistance
} from '../models/travel.model';
import { TRAVEL_ENDPOINTS } from './api-endpoints';
import { validateAddress, validateId } from './api-validators';
import { GeocodingService } from '../services/geocoding.service';

@Injectable({
  providedIn: 'root'
})
export class TravelApiService {

  constructor(
    private http: HttpClient,
    private geocodingService: GeocodingService
  ) {}

  /**
   * GET /api/travel/profiles/:technicianId
   * Retrieve travel profile for a technician
   * Requirements: 4.1, 4.5
   */
  getProfile(technicianId: string): Observable<TravelProfile> {
    const idValidation = validateId(technicianId, 'technicianId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    return this.http.get<TravelProfile>(TRAVEL_ENDPOINTS.getProfile(technicianId)).pipe(
      catchError(error => this.handleError(error, 'getProfile'))
    );
  }

  /**
   * PATCH /api/travel/profiles/:technicianId/flag
   * Update travel willingness flag
   * Requirements: 4.2, 4.3, 4.4
   */
  updateTravelFlag(technicianId: string, willing: boolean): Observable<TravelProfile> {
    const idValidation = validateId(technicianId, 'technicianId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    if (typeof willing !== 'boolean') {
      return throwError(() => new Error('willing must be a boolean'));
    }

    return this.http.patch<TravelProfile>(
      TRAVEL_ENDPOINTS.updateFlag(technicianId),
      { willingToTravel: willing }
    ).pipe(
      catchError(error => this.handleError(error, 'updateTravelFlag'))
    );
  }

  /**
   * PATCH /api/travel/profiles/:technicianId/address
   * Update home address with automatic geocoding
   * Requirements: 5.1-5.5
   */
  updateHomeAddress(technicianId: string, address: Address): Observable<TravelProfile> {
    const idValidation = validateId(technicianId, 'technicianId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    const addressValidation = validateAddress(address);
    if (!addressValidation.valid) {
      return throwError(() => new Error(`Address validation failed: ${addressValidation.errors.join('; ')}`));
    }

    return this.http.patch<TravelProfile>(
      TRAVEL_ENDPOINTS.updateAddress(technicianId),
      { homeAddress: address }
    ).pipe(
      switchMap(() => {
        // Trigger geocoding after address update
        return this.geocodingService.geocodeAddress(address).pipe(
          switchMap(coordinates => this.updateCoordinates(technicianId, coordinates)),
          catchError(geocodeError => {
            // Update profile with geocoding failure status
            return this.updateGeocodingStatus(
              technicianId,
              GeocodingStatus.Failed,
              geocodeError.message
            );
          })
        );
      }),
      catchError(error => this.handleError(error, 'updateHomeAddress'))
    );
  }

  /**
   * POST /api/travel/calculate-distances
   * Calculate distances from technicians to a job location
   * Requirements: 5.6, 9.2, 9.4, 9.6
   */
  calculateDistances(
    jobId: string,
    jobCoordinates: Coordinates,
    technicianProfiles: { technicianId: string; technicianName: string; willingToTravel: boolean; homeCoordinates: Coordinates }[]
  ): Observable<TechnicianDistance[]> {
    const idValidation = validateId(jobId, 'jobId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    if (!technicianProfiles || technicianProfiles.length === 0) {
      return throwError(() => new Error('At least one technician profile is required'));
    }

    return this.http.post<TechnicianDistance[]>(
      TRAVEL_ENDPOINTS.calculateDistances(),
      { jobId, jobCoordinates, technicianProfiles }
    ).pipe(
      catchError(error => this.handleError(error, 'calculateDistances'))
    );
  }

  /**
   * Update geocoded coordinates for a technician (internal)
   */
  private updateCoordinates(technicianId: string, coordinates: Coordinates): Observable<TravelProfile> {
    return this.http.patch<TravelProfile>(
      TRAVEL_ENDPOINTS.updateCoordinates(technicianId),
      {
        homeCoordinates: coordinates,
        geocodingStatus: GeocodingStatus.Success,
        geocodingError: null,
        lastGeocodedAt: new Date()
      }
    );
  }

  /**
   * Update geocoding status for a technician (internal)
   */
  private updateGeocodingStatus(
    technicianId: string,
    status: GeocodingStatus,
    error: string | null
  ): Observable<TravelProfile> {
    return this.http.patch<TravelProfile>(
      TRAVEL_ENDPOINTS.updateGeocodingStatus(technicianId),
      { geocodingStatus: status, geocodingError: error }
    );
  }

  private handleError(error: HttpErrorResponse, operation: string): Observable<never> {
    let message = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      message = `Client error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400: message = 'Invalid travel data'; break;
        case 403: message = 'Insufficient permissions'; break;
        case 404: message = 'Travel profile not found'; break;
        default: message = `Server error: ${error.status}`;
      }
    }

    console.error(`TravelApiService.${operation}:`, message, error);
    return throwError(() => new Error(message));
  }
}
