import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GeocodingService } from './geocoding.service';
import { CacheService } from './cache.service';
import { Address, Coordinates } from '../models/travel.model';

describe('GeocodingService', () => {
  let service: GeocodingService;
  let httpMock: HttpTestingController;
  let cacheService: CacheService;
  
  const mockAddress: Address = {
    street: '123 Main St',
    city: 'Austin',
    state: 'TX',
    postalCode: '78701'
  };
  
  const mockCoordinates: Coordinates = {
    latitude: 30.2672,
    longitude: -97.7431
  };
  
  const mockAzureGeocodeResponse = {
    results: [
      {
        position: {
          lat: 30.2672,
          lon: -97.7431
        }
      }
    ]
  };
  
  const mockAzureDistanceResponse = {
    matrix: [
      [
        {
          response: {
            routeSummary: {
              lengthInMeters: 80467.2, // ~50 miles
              travelTimeInSeconds: 3600 // 60 minutes
            }
          }
        }
      ]
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GeocodingService, CacheService]
    });
    service = TestBed.inject(GeocodingService);
    httpMock = TestBed.inject(HttpTestingController);
    cacheService = TestBed.inject(CacheService);
  });

  afterEach(() => {
    cacheService.clearAll();
    httpMock.verify();
  });

  describe('geocodeAddress', () => {
    it('should geocode a valid address successfully', (done) => {
      service.geocodeAddress(mockAddress).subscribe({
        next: (coordinates) => {
          expect(coordinates.latitude).toBe(30.2672);
          expect(coordinates.longitude).toBe(-97.7431);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/search/address/json')
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('query')).toContain('123 Main St');
      expect(req.request.params.get('query')).toContain('Austin');
      expect(req.request.params.get('api-version')).toBe('1.0');
      
      req.flush(mockAzureGeocodeResponse);
    });

    it('should handle address not found error', (done) => {
      service.geocodeAddress(mockAddress).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to geocode address');
          done();
        }
      });

      // retry(2) means 3 total attempts (initial + 2 retries)
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne((request) => 
          request.url.includes('atlas.microsoft.com/search/address/json')
        );
        req.flush({ results: [] });
      }
    });

    it('should retry on network error', (done) => {
      let attemptCount = 0;
      
      service.geocodeAddress(mockAddress).subscribe({
        next: (coordinates) => {
          expect(attemptCount).toBe(3); // Initial + 2 retries
          expect(coordinates.latitude).toBe(30.2672);
          done();
        },
        error: done.fail
      });

      // First attempt fails
      const req1 = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/search/address/json')
      );
      attemptCount++;
      req1.error(new ProgressEvent('Network error'));

      // Second attempt fails
      const req2 = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/search/address/json')
      );
      attemptCount++;
      req2.error(new ProgressEvent('Network error'));

      // Third attempt succeeds
      const req3 = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/search/address/json')
      );
      attemptCount++;
      req3.flush(mockAzureGeocodeResponse);
    });

    it('should handle HTTP error responses', (done) => {
      service.geocodeAddress(mockAddress).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to geocode address');
          done();
        }
      });

      // retry(2) means 3 total attempts
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne((request) => 
          request.url.includes('atlas.microsoft.com/search/address/json')
        );
        req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      }
    });

    it('should format address query correctly with all fields', (done) => {
      const fullAddress: Address = {
        street: '456 Oak Avenue',
        city: 'Dallas',
        state: 'TX',
        postalCode: '75201'
      };

      service.geocodeAddress(fullAddress).subscribe({
        next: () => done(),
        error: done.fail
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/search/address/json')
      );
      const query = req.request.params.get('query');
      expect(query).toBe('456 Oak Avenue, Dallas, TX 75201');
      
      req.flush(mockAzureGeocodeResponse);
    });
  });

  describe('calculateDistance', () => {
    const origin: Coordinates = { latitude: 30.2672, longitude: -97.7431 };
    const destination: Coordinates = { latitude: 29.7604, longitude: -95.3698 };

    it('should calculate distance between two coordinates successfully', (done) => {
      service.calculateDistance(origin, destination).subscribe({
        next: (result) => {
          expect(result.distanceMiles).toBeCloseTo(50, 0);
          expect(result.drivingTimeMinutes).toBe(60);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/route/matrix/json')
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body.origins.coordinates[0]).toEqual([origin.longitude, origin.latitude]);
      expect(req.request.body.destinations.coordinates[0]).toEqual([destination.longitude, destination.latitude]);
      
      req.flush(mockAzureDistanceResponse);
    });

    it('should convert meters to miles correctly', (done) => {
      const responseWith100Miles = {
        matrix: [[{
          response: {
            routeSummary: {
              lengthInMeters: 160934.4, // 100 miles
              travelTimeInSeconds: 7200
            }
          }
        }]]
      };

      service.calculateDistance(origin, destination).subscribe({
        next: (result) => {
          expect(result.distanceMiles).toBeCloseTo(100, 0);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/route/matrix/json')
      );
      req.flush(responseWith100Miles);
    });

    it('should convert seconds to minutes correctly', (done) => {
      const responseWith120Minutes = {
        matrix: [[{
          response: {
            routeSummary: {
              lengthInMeters: 80467.2,
              travelTimeInSeconds: 7200 // 120 minutes
            }
          }
        }]]
      };

      service.calculateDistance(origin, destination).subscribe({
        next: (result) => {
          expect(result.drivingTimeMinutes).toBe(120);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/route/matrix/json')
      );
      req.flush(responseWith120Minutes);
    });

    it('should retry on network error', (done) => {
      let attemptCount = 0;
      
      service.calculateDistance(origin, destination).subscribe({
        next: (result) => {
          expect(attemptCount).toBe(3);
          expect(result.distanceMiles).toBeCloseTo(50, 0);
          done();
        },
        error: done.fail
      });

      const req1 = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/route/matrix/json')
      );
      attemptCount++;
      req1.error(new ProgressEvent('Network error'));

      const req2 = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/route/matrix/json')
      );
      attemptCount++;
      req2.error(new ProgressEvent('Network error'));

      const req3 = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/route/matrix/json')
      );
      attemptCount++;
      req3.flush(mockAzureDistanceResponse);
    });

    it('should handle API error responses', (done) => {
      service.calculateDistance(origin, destination).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to calculate distance');
          done();
        }
      });

      // retry(2) means 3 total attempts
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne((request) => 
          request.url.includes('atlas.microsoft.com/route/matrix/json')
        );
        req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
      }
    });

    it('should handle zero distance correctly', (done) => {
      const sameLocation = {
        matrix: [[{
          response: {
            routeSummary: {
              lengthInMeters: 0,
              travelTimeInSeconds: 0
            }
          }
        }]]
      };

      service.calculateDistance(origin, origin).subscribe({
        next: (result) => {
          expect(result.distanceMiles).toBe(0);
          expect(result.drivingTimeMinutes).toBe(0);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/route/matrix/json')
      );
      req.flush(sameLocation);
    });
  });

  describe('calculateDistancesBatch', () => {
    const destination: Coordinates = { latitude: 29.7604, longitude: -95.3698 };

    it('should return empty array for empty origins', (done) => {
      service.calculateDistancesBatch([], destination).subscribe({
        next: (results) => {
          expect(results).toEqual([]);
          done();
        },
        error: done.fail
      });
    });

    it('should calculate distances for multiple origins', (done) => {
      const origins: Coordinates[] = [
        { latitude: 30.2672, longitude: -97.7431 },
        { latitude: 32.7767, longitude: -96.7970 },
        { latitude: 29.4241, longitude: -98.4936 }
      ];

      const batchResponse = {
        matrix: [
          [{ response: { routeSummary: { lengthInMeters: 80467.2, travelTimeInSeconds: 3600 } } }],
          [{ response: { routeSummary: { lengthInMeters: 160934.4, travelTimeInSeconds: 7200 } } }],
          [{ response: { routeSummary: { lengthInMeters: 40233.6, travelTimeInSeconds: 1800 } } }]
        ]
      };

      service.calculateDistancesBatch(origins, destination).subscribe({
        next: (results) => {
          expect(results.length).toBe(3);
          expect(results[0].distanceMiles).toBeCloseTo(50, 0);
          expect(results[1].distanceMiles).toBeCloseTo(100, 0);
          expect(results[2].distanceMiles).toBeCloseTo(25, 0);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/route/matrix/json')
      );
      expect(req.request.body.origins.coordinates.length).toBe(3);
      req.flush(batchResponse);
    });

    it('should split large batches into multiple requests', (done) => {
      // Create 150 origins to test batching (should split into 2 batches of 100 and 50)
      const origins: Coordinates[] = Array.from({ length: 150 }, (_, i) => ({
        latitude: 30 + (i * 0.01),
        longitude: -97 + (i * 0.01)
      }));

      const batch1Response = {
        matrix: Array.from({ length: 100 }, () => [{
          response: { routeSummary: { lengthInMeters: 80467.2, travelTimeInSeconds: 3600 } }
        }])
      };

      const batch2Response = {
        matrix: Array.from({ length: 50 }, () => [{
          response: { routeSummary: { lengthInMeters: 80467.2, travelTimeInSeconds: 3600 } }
        }])
      };

      service.calculateDistancesBatch(origins, destination).subscribe({
        next: (results) => {
          expect(results.length).toBe(150);
          results.forEach(result => {
            expect(result.distanceMiles).toBeCloseTo(50, 0);
            expect(result.drivingTimeMinutes).toBe(60);
          });
          done();
        },
        error: done.fail
      });

      // First batch (100 origins)
      const req1 = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/route/matrix/json') &&
        request.body.origins.coordinates.length === 100
      );
      req1.flush(batch1Response);

      // Second batch (50 origins)
      const req2 = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/route/matrix/json') &&
        request.body.origins.coordinates.length === 50
      );
      req2.flush(batch2Response);
    });

    it('should handle batch calculation errors', (done) => {
      const origins: Coordinates[] = [
        { latitude: 30.2672, longitude: -97.7431 },
        { latitude: 32.7767, longitude: -96.7970 }
      ];

      service.calculateDistancesBatch(origins, destination).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to calculate distances');
          done();
        }
      });

      // retry(2) means 3 total attempts
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne((request) => 
          request.url.includes('atlas.microsoft.com/route/matrix/json')
        );
        req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      }
    });

    it('should correctly map coordinates to longitude-latitude order for Azure Maps', (done) => {
      const origins: Coordinates[] = [
        { latitude: 30.2672, longitude: -97.7431 }
      ];

      const batchResponse = {
        matrix: [
          [{ response: { routeSummary: { lengthInMeters: 80467.2, travelTimeInSeconds: 3600 } } }]
        ]
      };

      service.calculateDistancesBatch(origins, destination).subscribe({
        next: () => done(),
        error: done.fail
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/route/matrix/json')
      );
      
      // Azure Maps expects [longitude, latitude] order
      expect(req.request.body.origins.coordinates[0]).toEqual([-97.7431, 30.2672]);
      expect(req.request.body.destinations.coordinates[0]).toEqual([destination.longitude, destination.latitude]);
      
      req.flush(batchResponse);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long addresses', (done) => {
      const longAddress: Address = {
        street: 'A'.repeat(200),
        city: 'B'.repeat(100),
        state: 'TX',
        postalCode: '78701'
      };

      service.geocodeAddress(longAddress).subscribe({
        next: () => done(),
        error: done.fail
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/search/address/json')
      );
      expect(req.request.params.get('query')).toBeTruthy();
      req.flush(mockAzureGeocodeResponse);
    });

    it('should handle coordinates at extreme latitudes', (done) => {
      const northPole: Coordinates = { latitude: 90, longitude: 0 };
      const southPole: Coordinates = { latitude: -90, longitude: 0 };

      service.calculateDistance(northPole, southPole).subscribe({
        next: (result) => {
          expect(result.distanceMiles).toBeGreaterThan(0);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/route/matrix/json')
      );
      req.flush(mockAzureDistanceResponse);
    });

    it('should handle coordinates at extreme longitudes', (done) => {
      const west: Coordinates = { latitude: 0, longitude: -180 };
      const east: Coordinates = { latitude: 0, longitude: 180 };

      service.calculateDistance(west, east).subscribe({
        next: (result) => {
          expect(result.distanceMiles).toBeGreaterThanOrEqual(0);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('atlas.microsoft.com/route/matrix/json')
      );
      req.flush(mockAzureDistanceResponse);
    });
  });
});
