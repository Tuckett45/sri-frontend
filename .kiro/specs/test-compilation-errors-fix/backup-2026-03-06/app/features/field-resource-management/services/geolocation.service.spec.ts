import { TestBed } from '@angular/core/testing';
import { GeolocationService, GeolocationErrorType, GeolocationError } from './geolocation.service';
import { GeoLocation } from '../models/time-entry.model';

describe('GeolocationService', () => {
  let service: GeolocationService;
  let mockGeolocation: jasmine.SpyObj<Geolocation>;
  let mockPermissions: jasmine.SpyObj<Permissions>;

  const mockPosition: GeolocationPosition = {
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({})
    },
    timestamp: Date.now(),
    toJSON: () => ({})
  };

  const mockGeoLocation: GeoLocation = {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10
  };

  beforeEach(() => {
    // Create mock geolocation object
    mockGeolocation = jasmine.createSpyObj('Geolocation', [
      'getCurrentPosition',
      'watchPosition',
      'clearWatch'
    ]);

    // Create mock permissions object
    mockPermissions = jasmine.createSpyObj('Permissions', ['query']);

    // Mock navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true
    });

    // Mock navigator.permissions
    Object.defineProperty(navigator, 'permissions', {
      value: mockPermissions,
      configurable: true,
      writable: true
    });

    TestBed.configureTestingModule({
      providers: [GeolocationService]
    });

    service = TestBed.inject(GeolocationService);
  });

  afterEach(() => {
    // Clean up mocks
    delete (navigator as any).geolocation;
    delete (navigator as any).permissions;
  });

  describe('isGeolocationSupported', () => {
    it('should return true when geolocation is supported', () => {
      expect(service.isGeolocationSupported()).toBe(true);
    });

    it('should return false when geolocation is not supported', () => {
      delete (navigator as any).geolocation;
      expect(service.isGeolocationSupported()).toBe(false);
    });
  });

  describe('getCurrentPosition', () => {
    it('should get current position with high accuracy', (done) => {
      mockGeolocation.getCurrentPosition.and.callFake((success) => {
        success(mockPosition);
      });

      service.getCurrentPosition(true).subscribe({
        next: (location) => {
          expect(location.latitude).toBe(37.7749);
          expect(location.longitude).toBe(-122.4194);
          expect(location.accuracy).toBe(10);
          expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
          done();
        },
        error: () => fail('Should not error')
      });
    });

    it('should get current position with low accuracy', (done) => {
      mockGeolocation.getCurrentPosition.and.callFake((success) => {
        success(mockPosition);
      });

      service.getCurrentPosition(false).subscribe({
        next: (location) => {
          expect(location.latitude).toBe(37.7749);
          expect(location.longitude).toBe(-122.4194);
          expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
          done();
        },
        error: () => fail('Should not error')
      });
    });

    it('should handle permission denied error', (done) => {
      const positionError: GeolocationPositionError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      mockGeolocation.getCurrentPosition.and.callFake((success, error) => {
        error!(positionError);
      });

      service.getCurrentPosition().subscribe({
        next: () => fail('Should not succeed'),
        error: (error: GeolocationError) => {
          expect(error.type).toBe(GeolocationErrorType.PermissionDenied);
          expect(error.message).toContain('permission denied');
          done();
        }
      });
    });

    it('should handle position unavailable error', (done) => {
      const positionError: GeolocationPositionError = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      mockGeolocation.getCurrentPosition.and.callFake((success, error) => {
        error!(positionError);
      });

      service.getCurrentPosition().subscribe({
        next: () => fail('Should not succeed'),
        error: (error: GeolocationError) => {
          expect(error.type).toBe(GeolocationErrorType.PositionUnavailable);
          expect(error.message).toContain('unavailable');
          done();
        }
      });
    });

    it('should handle timeout error', (done) => {
      const positionError: GeolocationPositionError = {
        code: 3, // TIMEOUT
        message: 'Timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      mockGeolocation.getCurrentPosition.and.callFake((success, error) => {
        error!(positionError);
      });

      service.getCurrentPosition().subscribe({
        next: () => fail('Should not succeed'),
        error: (error: GeolocationError) => {
          expect(error.type).toBe(GeolocationErrorType.Timeout);
          expect(error.message).toContain('timed out');
          done();
        }
      });
    });

    it('should return error when geolocation is not supported', (done) => {
      delete (navigator as any).geolocation;

      service.getCurrentPosition().subscribe({
        next: () => fail('Should not succeed'),
        error: (error: GeolocationError) => {
          expect(error.type).toBe(GeolocationErrorType.NotSupported);
          expect(error.message).toContain('not supported');
          done();
        }
      });
    });
  });

  describe('getCurrentPositionWithFallback', () => {
    it('should return high accuracy position on first attempt', (done) => {
      mockGeolocation.getCurrentPosition.and.callFake((success) => {
        success(mockPosition);
      });

      service.getCurrentPositionWithFallback().subscribe({
        next: (location) => {
          expect(location.latitude).toBe(37.7749);
          expect(location.longitude).toBe(-122.4194);
          expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
          done();
        },
        error: () => fail('Should not error')
      });
    });

    it('should fallback to low accuracy on timeout', (done) => {
      let callCount = 0;
      mockGeolocation.getCurrentPosition.and.callFake((success, error) => {
        callCount++;
        if (callCount === 1) {
          // First call (high accuracy) times out
          const timeoutError: GeolocationPositionError = {
            code: 3,
            message: 'Timeout',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3
          };
          error!(timeoutError);
        } else {
          // Second call (low accuracy) succeeds
          success(mockPosition);
        }
      });

      service.getCurrentPositionWithFallback().subscribe({
        next: (location) => {
          expect(location.latitude).toBe(37.7749);
          expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
          done();
        },
        error: () => fail('Should not error')
      });
    });

    it('should fallback to low accuracy on position unavailable', (done) => {
      let callCount = 0;
      mockGeolocation.getCurrentPosition.and.callFake((success, error) => {
        callCount++;
        if (callCount === 1) {
          const unavailableError: GeolocationPositionError = {
            code: 2,
            message: 'Position unavailable',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3
          };
          error!(unavailableError);
        } else {
          success(mockPosition);
        }
      });

      service.getCurrentPositionWithFallback().subscribe({
        next: (location) => {
          expect(location.latitude).toBe(37.7749);
          expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
          done();
        },
        error: () => fail('Should not error')
      });
    });

    it('should not fallback on permission denied', (done) => {
      const permissionError: GeolocationPositionError = {
        code: 1,
        message: 'Permission denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      mockGeolocation.getCurrentPosition.and.callFake((success, error) => {
        error!(permissionError);
      });

      service.getCurrentPositionWithFallback().subscribe({
        next: () => fail('Should not succeed'),
        error: (error: GeolocationError) => {
          expect(error.type).toBe(GeolocationErrorType.PermissionDenied);
          expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
          done();
        }
      });
    });
  });

  describe('watchPosition', () => {
    it('should watch position with high accuracy', () => {
      const callback = jasmine.createSpy('callback');
      const errorCallback = jasmine.createSpy('errorCallback');
      const watchId = 123;

      mockGeolocation.watchPosition.and.returnValue(watchId);

      const result = service.watchPosition(callback, errorCallback, true);

      expect(result).toBe(watchId);
      expect(mockGeolocation.watchPosition).toHaveBeenCalled();
    });

    it('should watch position with low accuracy', () => {
      const callback = jasmine.createSpy('callback');
      const errorCallback = jasmine.createSpy('errorCallback');
      const watchId = 456;

      mockGeolocation.watchPosition.and.returnValue(watchId);

      const result = service.watchPosition(callback, errorCallback, false);

      expect(result).toBe(watchId);
      expect(mockGeolocation.watchPosition).toHaveBeenCalled();
    });

    it('should call callback on position update', () => {
      const callback = jasmine.createSpy('callback');
      const errorCallback = jasmine.createSpy('errorCallback');

      mockGeolocation.watchPosition.and.callFake((success) => {
        success(mockPosition);
        return 123;
      });

      service.watchPosition(callback, errorCallback);

      expect(callback).toHaveBeenCalledWith({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10
      });
      expect(errorCallback).not.toHaveBeenCalled();
    });

    it('should call error callback on error', () => {
      const callback = jasmine.createSpy('callback');
      const errorCallback = jasmine.createSpy('errorCallback');
      const positionError: GeolocationPositionError = {
        code: 1,
        message: 'Permission denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      mockGeolocation.watchPosition.and.callFake((success, error) => {
        error!(positionError);
        return 123;
      });

      service.watchPosition(callback, errorCallback);

      expect(callback).not.toHaveBeenCalled();
      expect(errorCallback).toHaveBeenCalledWith({
        type: GeolocationErrorType.PermissionDenied,
        message: jasmine.stringContaining('permission denied')
      });
    });

    it('should return null when geolocation is not supported', () => {
      delete (navigator as any).geolocation;
      const callback = jasmine.createSpy('callback');
      const errorCallback = jasmine.createSpy('errorCallback');

      const result = service.watchPosition(callback, errorCallback);

      expect(result).toBeNull();
      expect(errorCallback).toHaveBeenCalledWith({
        type: GeolocationErrorType.NotSupported,
        message: jasmine.stringContaining('not supported')
      });
    });
  });

  describe('clearWatch', () => {
    it('should clear watch with valid watch ID', () => {
      const watchId = 123;

      service.clearWatch(watchId);

      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(watchId);
    });

    it('should not throw error when geolocation is not supported', () => {
      delete (navigator as any).geolocation;

      expect(() => service.clearWatch(123)).not.toThrow();
    });
  });

  describe('requestPermission', () => {
    it('should return permission state when Permissions API is supported', (done) => {
      const mockPermissionStatus: PermissionStatus = {
        name: 'geolocation' as PermissionName,
        state: 'granted',
        onchange: null,
        addEventListener: jasmine.createSpy(),
        removeEventListener: jasmine.createSpy(),
        dispatchEvent: jasmine.createSpy().and.returnValue(true)
      };

      mockPermissions.query.and.returnValue(Promise.resolve(mockPermissionStatus));

      service.requestPermission().subscribe({
        next: (state) => {
          expect(state).toBe('granted');
          expect(mockPermissions.query).toHaveBeenCalled();
          done();
        },
        error: () => fail('Should not error')
      });
    });

    it('should return granted when Permissions API is not supported', (done) => {
      delete (navigator as any).permissions;

      service.requestPermission().subscribe({
        next: (state) => {
          expect(state).toBe('granted');
          done();
        },
        error: () => fail('Should not error')
      });
    });

    it('should return prompt on permission query error', (done) => {
      mockPermissions.query.and.returnValue(Promise.reject('Error'));

      service.requestPermission().subscribe({
        next: (state) => {
          expect(state).toBe('prompt');
          done();
        },
        error: () => fail('Should not error')
      });
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two locations', () => {
      const location1: GeoLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10
      };
      const location2: GeoLocation = {
        latitude: 34.0522,
        longitude: -118.2437,
        accuracy: 10
      };

      const distance = service.calculateDistance(location1, location2);

      // Distance between San Francisco and Los Angeles is approximately 559 km
      expect(distance).toBeGreaterThan(500000); // > 500 km
      expect(distance).toBeLessThan(600000); // < 600 km
    });

    it('should return 0 for same location', () => {
      const location: GeoLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10
      };

      const distance = service.calculateDistance(location, location);

      expect(distance).toBeCloseTo(0, 0);
    });

    it('should calculate distance for nearby locations', () => {
      const location1: GeoLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10
      };
      const location2: GeoLocation = {
        latitude: 37.7750,
        longitude: -122.4195,
        accuracy: 10
      };

      const distance = service.calculateDistance(location1, location2);

      // Very close locations should have small distance
      expect(distance).toBeLessThan(20); // < 20 meters
    });

    it('should handle locations across the equator', () => {
      const location1: GeoLocation = {
        latitude: 10,
        longitude: 0,
        accuracy: 10
      };
      const location2: GeoLocation = {
        latitude: -10,
        longitude: 0,
        accuracy: 10
      };

      const distance = service.calculateDistance(location1, location2);

      // 20 degrees of latitude is approximately 2222 km
      expect(distance).toBeGreaterThan(2000000);
      expect(distance).toBeLessThan(2500000);
    });

    it('should handle locations across the prime meridian', () => {
      const location1: GeoLocation = {
        latitude: 0,
        longitude: 10,
        accuracy: 10
      };
      const location2: GeoLocation = {
        latitude: 0,
        longitude: -10,
        accuracy: 10
      };

      const distance = service.calculateDistance(location1, location2);

      // 20 degrees of longitude at equator is approximately 2226 km
      expect(distance).toBeGreaterThan(2000000);
      expect(distance).toBeLessThan(2500000);
    });
  });

  describe('formatLocation', () => {
    it('should format location in northern and western hemisphere', () => {
      const location: GeoLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10
      };

      const formatted = service.formatLocation(location);

      expect(formatted).toBe('37.7749° N, 122.4194° W');
    });

    it('should format location in southern and eastern hemisphere', () => {
      const location: GeoLocation = {
        latitude: -33.8688,
        longitude: 151.2093,
        accuracy: 10
      };

      const formatted = service.formatLocation(location);

      expect(formatted).toBe('33.8688° S, 151.2093° E');
    });

    it('should format location at equator', () => {
      const location: GeoLocation = {
        latitude: 0,
        longitude: 0,
        accuracy: 10
      };

      const formatted = service.formatLocation(location);

      expect(formatted).toBe('0.0000° N, 0.0000° E');
    });

    it('should format location with 4 decimal places', () => {
      const location: GeoLocation = {
        latitude: 37.774912345,
        longitude: -122.419415678,
        accuracy: 10
      };

      const formatted = service.formatLocation(location);

      expect(formatted).toContain('37.7749°');
      expect(formatted).toContain('122.4194°');
    });
  });
});
