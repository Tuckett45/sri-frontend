import { Injectable } from '@angular/core';
import { Observable, throwError, from, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { GeoLocation } from '../models/time-entry.model';

/**
 * Geolocation error types
 */
export enum GeolocationErrorType {
  PermissionDenied = 'PERMISSION_DENIED',
  PositionUnavailable = 'POSITION_UNAVAILABLE',
  Timeout = 'TIMEOUT',
  NotSupported = 'NOT_SUPPORTED'
}

/**
 * Geolocation error with type and message
 */
export interface GeolocationError {
  type: GeolocationErrorType;
  message: string;
}

/**
 * Manual location entry for fallback
 */
export interface ManualLocation {
  address: string;
  notes?: string;
}

/**
 * Service for managing geolocation operations
 * Handles browser Geolocation API with error handling and fallback options
 */
@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private readonly defaultTimeout = 10000; // 10 seconds
  private readonly highAccuracyOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: this.defaultTimeout,
    maximumAge: 0
  };

  private readonly lowAccuracyOptions: PositionOptions = {
    enableHighAccuracy: false,
    timeout: this.defaultTimeout,
    maximumAge: 60000 // 1 minute
  };

  constructor() {}

  /**
   * Gets the current position using the browser Geolocation API
   * @param highAccuracy Whether to request high accuracy (default: true)
   * @returns Observable of geolocation
   */
  getCurrentPosition(highAccuracy: boolean = true): Observable<GeoLocation> {
    if (!this.isGeolocationSupported()) {
      return throwError(() => ({
        type: GeolocationErrorType.NotSupported,
        message: 'Geolocation is not supported by this browser. Please use a modern browser or enter location manually.'
      } as GeolocationError));
    }

    const options = highAccuracy ? this.highAccuracyOptions : this.lowAccuracyOptions;

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
            reject(this.mapGeolocationError(error));
          },
          options
        );
      })
    ).pipe(
      timeout(this.defaultTimeout),
      catchError((error) => {
        if (error.name === 'TimeoutError') {
          return throwError(() => ({
            type: GeolocationErrorType.Timeout,
            message: 'Location request timed out. Please try again or enter location manually.'
          } as GeolocationError));
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Attempts to get position with fallback to low accuracy if high accuracy fails
   * @returns Observable of geolocation
   */
  getCurrentPositionWithFallback(): Observable<GeoLocation> {
    return this.getCurrentPosition(true).pipe(
      catchError((error: GeolocationError) => {
        // If high accuracy fails due to timeout or unavailable, try low accuracy
        if (error.type === GeolocationErrorType.Timeout || 
            error.type === GeolocationErrorType.PositionUnavailable) {
          console.warn('High accuracy geolocation failed, trying low accuracy', error);
          return this.getCurrentPosition(false);
        }
        // For other errors (permission denied, not supported), don't retry
        return throwError(() => error);
      })
    );
  }

  /**
   * Watches the position for continuous updates
   * @param callback Callback function to handle position updates
   * @param errorCallback Callback function to handle errors
   * @param highAccuracy Whether to request high accuracy (default: true)
   * @returns Watch ID that can be used to clear the watch
   */
  watchPosition(
    callback: (location: GeoLocation) => void,
    errorCallback: (error: GeolocationError) => void,
    highAccuracy: boolean = true
  ): number | null {
    if (!this.isGeolocationSupported()) {
      errorCallback({
        type: GeolocationErrorType.NotSupported,
        message: 'Geolocation is not supported by this browser.'
      });
      return null;
    }

    const options = highAccuracy ? this.highAccuracyOptions : this.lowAccuracyOptions;

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        errorCallback(this.mapGeolocationError(error));
      },
      options
    );
  }

  /**
   * Clears a position watch
   * @param watchId Watch ID returned by watchPosition
   */
  clearWatch(watchId: number): void {
    if (this.isGeolocationSupported()) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Checks if geolocation is supported by the browser
   * @returns True if geolocation is supported
   */
  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Requests permission for geolocation (for browsers that support Permissions API)
   * @returns Observable of permission state
   */
  requestPermission(): Observable<PermissionState> {
    if (!('permissions' in navigator)) {
      // Permissions API not supported, return 'granted' and let actual request handle it
      return of('granted' as PermissionState);
    }

    return from(
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then(result => result.state)
    ).pipe(
      catchError(() => {
        // If permission query fails, return 'prompt'
        return of('prompt' as PermissionState);
      })
    );
  }

  /**
   * Calculates distance between two geolocations using Haversine formula
   * @param location1 First geolocation
   * @param location2 Second geolocation
   * @returns Distance in meters
   */
  calculateDistance(location1: GeoLocation, location2: GeoLocation): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = location1.latitude * Math.PI / 180;
    const φ2 = location2.latitude * Math.PI / 180;
    const Δφ = (location2.latitude - location1.latitude) * Math.PI / 180;
    const Δλ = (location2.longitude - location1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Formats geolocation as a string
   * @param location Geolocation
   * @returns Formatted string (e.g., "37.7749° N, 122.4194° W")
   */
  formatLocation(location: GeoLocation): string {
    const latDirection = location.latitude >= 0 ? 'N' : 'S';
    const lonDirection = location.longitude >= 0 ? 'E' : 'W';
    const lat = Math.abs(location.latitude).toFixed(4);
    const lon = Math.abs(location.longitude).toFixed(4);
    return `${lat}° ${latDirection}, ${lon}° ${lonDirection}`;
  }

  /**
   * Maps browser GeolocationPositionError to our GeolocationError
   * @param error Browser geolocation error
   * @returns Mapped geolocation error
   */
  private mapGeolocationError(error: GeolocationPositionError): GeolocationError {
    let type: GeolocationErrorType;
    let message: string;

    switch (error.code) {
      case error.PERMISSION_DENIED:
        type = GeolocationErrorType.PermissionDenied;
        message = 'Location permission denied. Please enable location services in your browser settings.';
        break;
      case error.POSITION_UNAVAILABLE:
        type = GeolocationErrorType.PositionUnavailable;
        message = 'Location information unavailable. Please check your device settings or enter location manually.';
        break;
      case error.TIMEOUT:
        type = GeolocationErrorType.Timeout;
        message = 'Location request timed out. Please try again or enter location manually.';
        break;
      default:
        type = GeolocationErrorType.PositionUnavailable;
        message = 'Unable to retrieve location. Please try again or enter location manually.';
    }

    return { type, message };
  }
}
