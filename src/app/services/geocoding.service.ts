import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, retry, throwError, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private apiKey: string;
  private geocodeCache: { [key: string]: any } = {};
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_RETRIES = 2;

  constructor(private http: HttpClient) {
    this.apiKey = 'AIzaSyArUJ7zFSO2eI-Prkkvkr_3kNZdDebmVt4';
  }

  geocodeAddress(query: string): Observable<any> {
    // Return cached result if available
    if (this.geocodeCache[query]) {
      return new Observable((observer) => {
        observer.next(this.geocodeCache[query]);
        observer.complete();
      });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${this.apiKey}`;
    
    return this.http.get<any>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      retry(this.MAX_RETRIES),
      map((response: any) => {
        // Check if the response is valid
        if (response.status === 'OK' && response.results && response.results.length > 0) {
          this.geocodeCache[query] = response;
          return response;
        } else if (response.status === 'ZERO_RESULTS') {
          // Return empty results instead of error
          return { results: [], status: 'ZERO_RESULTS' };
        } else {
          throw new Error(`Geocoding failed: ${response.status}`);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Geocoding error:', error);
        
        // Return empty results instead of throwing error
        // This prevents the UI from breaking
        return of({ results: [], status: 'ERROR', error: error.message });
      })
    );
  }

  // Reverse geocode with caching and error handling
  reverseGeocode(latitude: number, longitude: number): Observable<any> {
    const key = `${latitude},${longitude}`;
    
    // Return cached result if available
    if (this.geocodeCache[key]) {
      return new Observable((observer) => {
        observer.next(this.geocodeCache[key]);
        observer.complete();
      });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}`;
    
    return this.http.get<any>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      retry(this.MAX_RETRIES),
      map((response: any) => {
        // Check if the response is valid
        if (response.status === 'OK' && response.results && response.results.length > 0) {
          this.geocodeCache[key] = response;
          return response;
        } else if (response.status === 'ZERO_RESULTS') {
          return { results: [], status: 'ZERO_RESULTS' };
        } else {
          throw new Error(`Reverse geocoding failed: ${response.status}`);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Reverse geocoding error:', error);
        
        // Return empty results instead of throwing error
        return of({ results: [], status: 'ERROR', error: error.message });
      })
    );
  }

  // Clear cache (useful for testing or memory management)
  clearCache(): void {
    this.geocodeCache = {};
  }
}
