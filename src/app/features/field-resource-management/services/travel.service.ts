import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, switchMap, take, map } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { 
  TravelProfile, 
  Address, 
  Coordinates, 
  GeocodingStatus, 
  TechnicianDistance,
  PerDiemConfig 
} from '../models/travel.model';
import { GeocodingService } from './geocoding.service';
import { selectJobById } from '../state/jobs/job.selectors';
import { selectAllTechnicians } from '../state/technicians/technician.selectors';
import { environment } from '../../../../environments/environments';

/**
 * Service for managing technician travel profiles and distance calculations
 */
@Injectable({
  providedIn: 'root'
})
export class TravelService {
  private readonly apiUrl = `${environment.apiUrl}/travel`;
  
  constructor(
    private http: HttpClient,
    private geocodingService: GeocodingService,
    private store: Store
  ) {}
  
  /**
   * Get travel profile for technician
   * @param technicianId The technician ID
   * @returns Observable of travel profile
   */
  getTravelProfile(technicianId: string): Observable<TravelProfile> {
    return this.http.get<TravelProfile>(`${this.apiUrl}/profiles/${technicianId}`).pipe(
      catchError(this.handleError)
    );
  }
  
  /**
   * Get all travel profiles
   * @returns Observable of all travel profiles
   */
  getAllTravelProfiles(): Observable<TravelProfile[]> {
    return this.http.get<TravelProfile[]>(`${this.apiUrl}/profiles`).pipe(
      catchError(this.handleError)
    );
  }
  
  /**
   * Update travel flag for technician
   * @param technicianId The technician ID
   * @param willing Whether the technician is willing to travel
   * @returns Observable of updated travel profile
   */
  updateTravelFlag(technicianId: string, willing: boolean): Observable<TravelProfile> {
    return this.http.patch<TravelProfile>(
      `${this.apiUrl}/profiles/${technicianId}/flag`,
      { willingToTravel: willing }
    ).pipe(
      catchError(this.handleError)
    );
  }
  
  /**
   * Update home address for technician (triggers geocoding)
   * @param technicianId The technician ID
   * @param address The new home address
   * @returns Observable of updated travel profile
   */
  updateHomeAddress(technicianId: string, address: Address): Observable<TravelProfile> {
    return this.http.patch<TravelProfile>(
      `${this.apiUrl}/profiles/${technicianId}/address`,
      { homeAddress: address }
    ).pipe(
      switchMap(profile => {
        // Trigger geocoding
        return this.geocodingService.geocodeAddress(address).pipe(
          switchMap(coordinates => {
            return this.updateCoordinates(technicianId, coordinates);
          }),
          catchError(error => {
            // Update profile with geocoding error
            return this.updateGeocodingStatus(
              technicianId, 
              GeocodingStatus.Failed, 
              error.message
            );
          })
        );
      }),
      catchError(this.handleError)
    );
  }
  
  /**
   * Update geocoded coordinates for technician
   * @param technicianId The technician ID
   * @param coordinates The geocoded coordinates
   * @returns Observable of updated travel profile
   */
  private updateCoordinates(
    technicianId: string, 
    coordinates: Coordinates
  ): Observable<TravelProfile> {
    return this.http.patch<TravelProfile>(
      `${this.apiUrl}/profiles/${technicianId}/coordinates`,
      { 
        homeCoordinates: coordinates,
        geocodingStatus: GeocodingStatus.Success,
        geocodingError: null,
        lastGeocodedAt: new Date()
      }
    );
  }
  
  /**
   * Update geocoding status for technician
   * @param technicianId The technician ID
   * @param status The geocoding status
   * @param error The error message (if any)
   * @returns Observable of updated travel profile
   */
  private updateGeocodingStatus(
    technicianId: string,
    status: GeocodingStatus,
    error: string | null
  ): Observable<TravelProfile> {
    return this.http.patch<TravelProfile>(
      `${this.apiUrl}/profiles/${technicianId}/geocoding-status`,
      { geocodingStatus: status, geocodingError: error }
    );
  }
  
  /**
   * Calculate distances from technicians to job location
   * This method fetches travel profiles separately and combines them with technician data
   * @param jobId The job ID
   * @returns Observable array of technician distances
   */
  calculateDistancesToJob(jobId: string): Observable<TechnicianDistance[]> {
    // Get job location
    return this.store.select(selectJobById(jobId)).pipe(
      take(1),
      switchMap(job => {
        if (!job || !job.siteAddress.latitude || !job.siteAddress.longitude) {
          return throwError(() => new Error('Job location not available'));
        }
        
        const jobCoords: Coordinates = {
          latitude: job.siteAddress.latitude,
          longitude: job.siteAddress.longitude
        };
        
        // Get all technicians
        return this.store.select(selectAllTechnicians).pipe(
          take(1),
          switchMap(technicians => {
            if (technicians.length === 0) {
              return of([]);
            }
            
            // Fetch travel profiles for all technicians
            const profileRequests = technicians.map(tech => 
              this.getTravelProfile(tech.id).pipe(
                catchError(() => of(null)) // Ignore errors for individual profiles
              )
            );
            
            return forkJoin(profileRequests).pipe(
              switchMap(profiles => {
                // Filter technicians with valid geocoded addresses
                const techniciansWithProfiles = technicians
                  .map((tech, index) => ({ tech, profile: profiles[index] }))
                  .filter(({ profile }) => 
                    profile && 
                    profile.homeCoordinates && 
                    profile.geocodingStatus === GeocodingStatus.Success
                  );
                
                if (techniciansWithProfiles.length === 0) {
                  return of([]);
                }
                
                const origins = techniciansWithProfiles.map(({ profile }) => profile!.homeCoordinates!);
                
                return this.geocodingService.calculateDistancesBatch(origins, jobCoords).pipe(
                  map(distances => {
                    return techniciansWithProfiles.map(({ tech, profile }, index) => ({
                      technicianId: tech.id,
                      technicianName: `${tech.firstName} ${tech.lastName}`,
                      willingToTravel: profile!.willingToTravel,
                      distanceMiles: distances[index].distanceMiles,
                      drivingTimeMinutes: distances[index].drivingTimeMinutes,
                      perDiemEligible: distances[index].distanceMiles >= 50,
                      calculatedAt: new Date()
                    }));
                  })
                );
              })
            );
          })
        );
      }),
      catchError(this.handleError)
    );
  }
  
  /**
   * Calculate per diem amount based on distance
   * @param distanceMiles The distance in miles
   * @param config The per diem configuration
   * @returns The per diem amount
   */
  calculatePerDiem(distanceMiles: number, config: PerDiemConfig): number {
    if (distanceMiles < config.minimumDistanceMiles) {
      return 0;
    }
    
    if (config.flatRateAmount !== null) {
      return config.flatRateAmount;
    }
    
    return distanceMiles * config.ratePerMile;
  }
  
  /**
   * Handle HTTP errors
   * @param error The HTTP error response
   * @returns Observable that throws an error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid travel data';
          break;
        case 403:
          errorMessage = 'Insufficient permissions';
          break;
        case 404:
          errorMessage = 'Travel profile not found';
          break;
        default:
          errorMessage = `Server error: ${error.status}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
