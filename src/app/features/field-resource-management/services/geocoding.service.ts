import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, forkJoin, of } from 'rxjs';
import { map, retry, catchError } from 'rxjs/operators';
import { Address, Coordinates } from '../models/travel.model';
import { CacheService } from './cache.service';

/** 30 days in milliseconds */
const GEOCODING_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
/** 24 hours in milliseconds */
const DISTANCE_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Service for geocoding addresses and calculating distances using Azure Maps API.
 * Results are cached to reduce API calls:
 * - Geocoding results: 30-day TTL
 * - Distance calculations: 24-hour TTL
 */
@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private readonly azureMapsKey = 'YOUR_AZURE_MAPS_KEY'; // TODO: Move to environment config
  private readonly geocodeUrl = 'https://atlas.microsoft.com/search/address/json';
  private readonly distanceUrl = 'https://atlas.microsoft.com/route/matrix/json';
  
  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {}
  
  /**
   * Geocode an address to coordinates (cached for 30 days)
   * @param address The address to geocode
   * @returns Observable of coordinates
   */
  geocodeAddress(address: Address): Observable<Coordinates> {
    const cacheKey = `geocode:${address.street}:${address.city}:${address.state}:${address.postalCode}`;
    
    return this.cacheService.get(cacheKey, () => {
      const query = `${address.street}, ${address.city}, ${address.state} ${address.postalCode}`;
      
      const params = new HttpParams()
        .set('api-version', '1.0')
        .set('subscription-key', this.azureMapsKey)
        .set('query', query);
      
      return this.http.get<any>(this.geocodeUrl, { params }).pipe(
        map(response => {
          if (response.results && response.results.length > 0) {
            const position = response.results[0].position;
            return {
              latitude: position.lat,
              longitude: position.lon
            };
          }
          throw new Error('Address not found');
        }),
        retry(2),
        catchError(error => {
          console.error('Geocoding error:', error);
          return throwError(() => new Error('Failed to geocode address'));
        })
      );
    }, GEOCODING_CACHE_TTL);
  }
  
  /**
   * Calculate distance between two coordinates (cached for 24 hours)
   * @param origin Origin coordinates
   * @param destination Destination coordinates
   * @returns Observable with distance in miles and driving time in minutes
   */
  calculateDistance(
    origin: Coordinates,
    destination: Coordinates
  ): Observable<{ distanceMiles: number; drivingTimeMinutes: number }> {
    const cacheKey = `distance:${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}`;
    
    return this.cacheService.get(cacheKey, () => {
      const params = new HttpParams()
        .set('api-version', '1.0')
        .set('subscription-key', this.azureMapsKey);
      
      const body = {
        origins: {
          type: 'MultiPoint',
          coordinates: [[origin.longitude, origin.latitude]]
        },
        destinations: {
          type: 'MultiPoint',
          coordinates: [[destination.longitude, destination.latitude]]
        }
      };
      
      return this.http.post<any>(this.distanceUrl, body, { params }).pipe(
        map(response => {
          const summary = response.matrix[0][0].response.routeSummary;
          return {
            distanceMiles: summary.lengthInMeters * 0.000621371, // Convert to miles
            drivingTimeMinutes: summary.travelTimeInSeconds / 60
          };
        }),
        retry(2),
        catchError(error => {
          console.error('Distance calculation error:', error);
          return throwError(() => new Error('Failed to calculate distance'));
        })
      );
    }, DISTANCE_CACHE_TTL);
  }
  
  /**
   * Batch calculate distances from multiple origins to one destination
   * Azure Maps supports up to 700 origins in one request
   * For simplicity, we process in batches of 100
   * @param origins Array of origin coordinates
   * @param destination Destination coordinates
   * @returns Observable array of distance results
   */
  calculateDistancesBatch(
    origins: Coordinates[],
    destination: Coordinates
  ): Observable<{ distanceMiles: number; drivingTimeMinutes: number }[]> {
    if (origins.length === 0) {
      return of([]);
    }
    
    const batchSize = 100;
    const batches: Observable<{ distanceMiles: number; drivingTimeMinutes: number }[]>[] = [];
    
    for (let i = 0; i < origins.length; i += batchSize) {
      const batch = origins.slice(i, i + batchSize);
      batches.push(this.calculateDistanceBatch(batch, destination));
    }
    
    return forkJoin(batches).pipe(
      map(results => results.flat())
    );
  }
  
  /**
   * Calculate distances for a single batch
   * @param origins Array of origin coordinates (max 100)
   * @param destination Destination coordinates
   * @returns Observable array of distance results
   */
  private calculateDistanceBatch(
    origins: Coordinates[],
    destination: Coordinates
  ): Observable<{ distanceMiles: number; drivingTimeMinutes: number }[]> {
    const params = new HttpParams()
      .set('api-version', '1.0')
      .set('subscription-key', this.azureMapsKey);
    
    const body = {
      origins: {
        type: 'MultiPoint',
        coordinates: origins.map(o => [o.longitude, o.latitude])
      },
      destinations: {
        type: 'MultiPoint',
        coordinates: [[destination.longitude, destination.latitude]]
      }
    };
    
    return this.http.post<any>(this.distanceUrl, body, { params }).pipe(
      map(response => {
        return response.matrix.map((row: any) => {
          const summary = row[0].response.routeSummary;
          return {
            distanceMiles: summary.lengthInMeters * 0.000621371,
            drivingTimeMinutes: summary.travelTimeInSeconds / 60
          };
        });
      }),
      retry(2),
      catchError(error => {
        console.error('Batch distance calculation error:', error);
        return throwError(() => new Error('Failed to calculate distances'));
      })
    );
  }
}
