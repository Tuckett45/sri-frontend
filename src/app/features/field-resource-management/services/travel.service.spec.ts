import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { TravelService } from './travel.service';
import { GeocodingService } from './geocoding.service';
import { CacheService } from './cache.service';
import { 
  TravelProfile, 
  Address, 
  Coordinates, 
  GeocodingStatus,
  TechnicianDistance,
  PerDiemConfig 
} from '../models/travel.model';
import { Technician, TechnicianRole, EmploymentType } from '../models/technician.model';
import { Job, JobType, Priority, JobStatus } from '../models/job.model';
import { of, throwError } from 'rxjs';
import { selectJobById } from '../state/jobs/job.selectors';
import { selectAllTechnicians } from '../state/technicians/technician.selectors';

describe('TravelService', () => {
  let service: TravelService;
  let httpMock: HttpTestingController;
  let geocodingService: jasmine.SpyObj<GeocodingService>;
  let store: MockStore;
  
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
  
  const mockTravelProfile: TravelProfile = {
    technicianId: 'tech-1',
    willingToTravel: true,
    homeAddress: mockAddress,
    homeCoordinates: mockCoordinates,
    geocodingStatus: GeocodingStatus.Success,
    geocodingError: null,
    lastGeocodedAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };
  
  const mockJob: Job = {
    id: 'job-1',
    jobId: 'JOB-001',
    client: 'Test Client',
    siteName: 'Test Site',
    siteAddress: {
      street: '456 Oak Ave',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75201',
      latitude: 32.7767,
      longitude: -96.7970
    },
    jobType: JobType.Install,
    priority: Priority.Normal,
    status: JobStatus.NotStarted,
    scopeDescription: 'Test job',
    requiredSkills: [],
    requiredCrewSize: 2,
    estimatedLaborHours: 8,
    scheduledStartDate: new Date(),
    scheduledEndDate: new Date(),
    attachments: [],
    notes: [],
    market: 'DALLAS',
    company: 'TEST_COMPANY',
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const mockTechnicians: Technician[] = [
    {
      id: 'tech-1',
      technicianId: 'TECH-001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-0001',
      role: TechnicianRole.Lead,
      employmentType: EmploymentType.W2,
      homeBase: 'Austin',
      region: 'Central',
      skills: [],
      certifications: [],
      availability: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'tech-2',
      technicianId: 'TECH-002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '555-0002',
      role: TechnicianRole.Installer,
      employmentType: EmploymentType.W2,
      homeBase: 'Houston',
      region: 'Southeast',
      skills: [],
      certifications: [],
      availability: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'tech-3',
      technicianId: 'TECH-003',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob@example.com',
      phone: '555-0003',
      role: TechnicianRole.Installer,
      employmentType: EmploymentType.Contractor1099,
      homeBase: 'Dallas',
      region: 'North',
      skills: [],
      certifications: [],
      availability: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    const geocodingServiceSpy = jasmine.createSpyObj('GeocodingService', [
      'geocodeAddress',
      'calculateDistance',
      'calculateDistancesBatch'
    ]);
    
    TestBed.configureTestingModule({
      providers: [
        TravelService,
        CacheService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore(),
        { provide: GeocodingService, useValue: geocodingServiceSpy }
      ]
    });
    
    service = TestBed.inject(TravelService);
    httpMock = TestBed.inject(HttpTestingController);
    geocodingService = TestBed.inject(GeocodingService) as jasmine.SpyObj<GeocodingService>;
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getTravelProfile', () => {
    it('should get travel profile for technician', (done) => {
      service.getTravelProfile('tech-1').subscribe({
        next: (profile) => {
          expect(profile).toEqual(mockTravelProfile);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne('/api/travel/profiles/tech-1');
      expect(req.request.method).toBe('GET');
      req.flush(mockTravelProfile);
    });

    it('should handle 404 error when profile not found', (done) => {
      service.getTravelProfile('non-existent').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Travel profile not found');
          done();
        }
      });

      const req = httpMock.expectOne('/api/travel/profiles/non-existent');
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle 403 error for insufficient permissions', (done) => {
      service.getTravelProfile('tech-1').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Insufficient permissions');
          done();
        }
      });

      const req = httpMock.expectOne('/api/travel/profiles/tech-1');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should handle network errors', (done) => {
      service.getTravelProfile('tech-1').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('error');
          done();
        }
      });

      const req = httpMock.expectOne('/api/travel/profiles/tech-1');
      req.error(new ProgressEvent('Network error'));
    });
  });

  describe('updateTravelFlag', () => {
    it('should update travel flag to willing', (done) => {
      const updatedProfile = { ...mockTravelProfile, willingToTravel: true };
      
      service.updateTravelFlag('tech-1', true).subscribe({
        next: (profile) => {
          expect(profile.willingToTravel).toBe(true);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne('/api/travel/profiles/tech-1/flag');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ willingToTravel: true });
      req.flush(updatedProfile);
    });

    it('should update travel flag to not willing', (done) => {
      const updatedProfile = { ...mockTravelProfile, willingToTravel: false };
      
      service.updateTravelFlag('tech-1', false).subscribe({
        next: (profile) => {
          expect(profile.willingToTravel).toBe(false);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne('/api/travel/profiles/tech-1/flag');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ willingToTravel: false });
      req.flush(updatedProfile);
    });

    it('should handle 400 error for invalid data', (done) => {
      service.updateTravelFlag('tech-1', true).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Invalid travel data');
          done();
        }
      });

      const req = httpMock.expectOne('/api/travel/profiles/tech-1/flag');
      req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('updateHomeAddress', () => {
    it('should update home address and trigger successful geocoding', (done) => {
      const addressUpdateResponse = { ...mockTravelProfile, homeAddress: mockAddress };
      const coordinatesUpdateResponse = { 
        ...mockTravelProfile, 
        homeCoordinates: mockCoordinates,
        geocodingStatus: GeocodingStatus.Success
      };
      
      geocodingService.geocodeAddress.and.returnValue(of(mockCoordinates));
      
      service.updateHomeAddress('tech-1', mockAddress).subscribe({
        next: (profile) => {
          expect(profile.homeCoordinates).toEqual(mockCoordinates);
          expect(profile.geocodingStatus).toBe(GeocodingStatus.Success);
          expect(geocodingService.geocodeAddress).toHaveBeenCalledWith(mockAddress);
          done();
        },
        error: done.fail
      });

      // First request: update address
      const req1 = httpMock.expectOne('/api/travel/profiles/tech-1/address');
      expect(req1.request.method).toBe('PATCH');
      expect(req1.request.body).toEqual({ homeAddress: mockAddress });
      req1.flush(addressUpdateResponse);

      // Second request: update coordinates after geocoding
      const req2 = httpMock.expectOne('/api/travel/profiles/tech-1/coordinates');
      expect(req2.request.method).toBe('PATCH');
      expect(req2.request.body.homeCoordinates).toEqual(mockCoordinates);
      expect(req2.request.body.geocodingStatus).toBe(GeocodingStatus.Success);
      req2.flush(coordinatesUpdateResponse);
    });

    it('should handle geocoding failure and update status', (done) => {
      const addressUpdateResponse = { ...mockTravelProfile, homeAddress: mockAddress };
      const geocodingError = new Error('Failed to geocode address');
      const errorUpdateResponse = { 
        ...mockTravelProfile,
        geocodingStatus: GeocodingStatus.Failed,
        geocodingError: 'Failed to geocode address'
      };
      
      geocodingService.geocodeAddress.and.returnValue(throwError(() => geocodingError));
      
      service.updateHomeAddress('tech-1', mockAddress).subscribe({
        next: (profile) => {
          expect(profile.geocodingStatus).toBe(GeocodingStatus.Failed);
          expect(profile.geocodingError).toBe('Failed to geocode address');
          done();
        },
        error: done.fail
      });

      // First request: update address
      const req1 = httpMock.expectOne('/api/travel/profiles/tech-1/address');
      req1.flush(addressUpdateResponse);

      // Second request: update geocoding status with error
      const req2 = httpMock.expectOne('/api/travel/profiles/tech-1/geocoding-status');
      expect(req2.request.method).toBe('PATCH');
      expect(req2.request.body.geocodingStatus).toBe(GeocodingStatus.Failed);
      expect(req2.request.body.geocodingError).toBe('Failed to geocode address');
      req2.flush(errorUpdateResponse);
    });

    it('should handle address update failure', (done) => {
      service.updateHomeAddress('tech-1', mockAddress).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Invalid travel data');
          done();
        }
      });

      const req = httpMock.expectOne('/api/travel/profiles/tech-1/address');
      req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
    });

    it('should validate address has all required fields', (done) => {
      const validAddress: Address = {
        street: '789 Elm St',
        city: 'Houston',
        state: 'TX',
        postalCode: '77001'
      };
      
      const addressUpdateResponse = { ...mockTravelProfile, homeAddress: validAddress };
      geocodingService.geocodeAddress.and.returnValue(of(mockCoordinates));
      
      service.updateHomeAddress('tech-1', validAddress).subscribe({
        next: () => {
          expect(geocodingService.geocodeAddress).toHaveBeenCalledWith(validAddress);
          done();
        },
        error: done.fail
      });

      const req1 = httpMock.expectOne('/api/travel/profiles/tech-1/address');
      req1.flush(addressUpdateResponse);

      const req2 = httpMock.expectOne('/api/travel/profiles/tech-1/coordinates');
      req2.flush(mockTravelProfile);
    });
  });

  describe('calculateDistancesToJob', () => {
    it('should calculate distances for all technicians with geocoded addresses', (done) => {
      const travelProfiles: TravelProfile[] = [
        {
          technicianId: 'tech-1',
          willingToTravel: true,
          homeAddress: mockAddress,
          homeCoordinates: { latitude: 30.2672, longitude: -97.7431 },
          geocodingStatus: GeocodingStatus.Success,
          geocodingError: null,
          lastGeocodedAt: new Date(),
          updatedAt: new Date()
        },
        {
          technicianId: 'tech-2',
          willingToTravel: false,
          homeAddress: mockAddress,
          homeCoordinates: { latitude: 29.7604, longitude: -95.3698 },
          geocodingStatus: GeocodingStatus.Success,
          geocodingError: null,
          lastGeocodedAt: new Date(),
          updatedAt: new Date()
        },
        {
          technicianId: 'tech-3',
          willingToTravel: true,
          homeAddress: mockAddress,
          homeCoordinates: null,
          geocodingStatus: GeocodingStatus.NotGeocoded,
          geocodingError: null,
          lastGeocodedAt: null,
          updatedAt: new Date()
        }
      ];
      
      store.overrideSelector(selectJobById('job-1'), mockJob);
      store.overrideSelector(selectAllTechnicians, mockTechnicians);
      
      const mockDistances = [
        { distanceMiles: 50, drivingTimeMinutes: 60 },
        { distanceMiles: 100, drivingTimeMinutes: 120 }
      ];
      
      geocodingService.calculateDistancesBatch.and.returnValue(of(mockDistances));
      
      service.calculateDistancesToJob('job-1').subscribe({
        next: (results) => {
          expect(results.length).toBe(2); // Only tech-1 and tech-2 have geocoded addresses
          
          expect(results[0].technicianId).toBe('tech-1');
          expect(results[0].technicianName).toBe('John Doe');
          expect(results[0].willingToTravel).toBe(true);
          expect(results[0].distanceMiles).toBe(50);
          expect(results[0].drivingTimeMinutes).toBe(60);
          expect(results[0].perDiemEligible).toBe(true);
          
          expect(results[1].technicianId).toBe('tech-2');
          expect(results[1].technicianName).toBe('Jane Smith');
          expect(results[1].willingToTravel).toBe(false);
          expect(results[1].distanceMiles).toBe(100);
          expect(results[1].drivingTimeMinutes).toBe(120);
          expect(results[1].perDiemEligible).toBe(true);
          
          expect(geocodingService.calculateDistancesBatch).toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
      
      // Mock the getTravelProfile calls
      const req1 = httpMock.expectOne('/api/travel/profiles/tech-1');
      req1.flush(travelProfiles[0]);
      
      const req2 = httpMock.expectOne('/api/travel/profiles/tech-2');
      req2.flush(travelProfiles[1]);
      
      const req3 = httpMock.expectOne('/api/travel/profiles/tech-3');
      req3.flush(travelProfiles[2]);
    });

    it('should return empty array when no technicians have geocoded addresses', (done) => {
      const travelProfilesWithoutCoords: TravelProfile[] = mockTechnicians.map(t => ({
        technicianId: t.id,
        willingToTravel: true,
        homeAddress: mockAddress,
        homeCoordinates: null,
        geocodingStatus: GeocodingStatus.NotGeocoded,
        geocodingError: null,
        lastGeocodedAt: null,
        updatedAt: new Date()
      }));
      
      store.overrideSelector(selectJobById('job-1'), mockJob);
      store.overrideSelector(selectAllTechnicians, mockTechnicians);
      
      service.calculateDistancesToJob('job-1').subscribe({
        next: (results) => {
          expect(results).toEqual([]);
          expect(geocodingService.calculateDistancesBatch).not.toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
      
      // Mock the getTravelProfile calls
      mockTechnicians.forEach((tech, index) => {
        const req = httpMock.expectOne(`/api/travel/profiles/${tech.id}`);
        req.flush(travelProfilesWithoutCoords[index]);
      });
    });

    it('should handle job without location coordinates', (done) => {
      const jobWithoutCoords: Job = {
        ...mockJob,
        siteAddress: {
          ...mockJob.siteAddress,
          latitude: undefined,
          longitude: undefined
        }
      };
      
      store.overrideSelector(selectJobById('job-1'), jobWithoutCoords);
      
      service.calculateDistancesToJob('job-1').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Job location not available');
          done();
        }
      });
    });

    it('should handle job not found', (done) => {
      store.overrideSelector(selectJobById('non-existent'), undefined);
      
      service.calculateDistancesToJob('non-existent').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Job location not available');
          done();
        }
      });
    });

    it('should mark per diem eligible for distances >= 50 miles', (done) => {
      const travelProfiles: TravelProfile[] = [
        {
          technicianId: 'tech-1',
          willingToTravel: true,
          homeAddress: mockAddress,
          homeCoordinates: { latitude: 30.2672, longitude: -97.7431 },
          geocodingStatus: GeocodingStatus.Success,
          geocodingError: null,
          lastGeocodedAt: new Date(),
          updatedAt: new Date()
        },
        {
          technicianId: 'tech-2',
          willingToTravel: false,
          homeAddress: mockAddress,
          homeCoordinates: { latitude: 29.7604, longitude: -95.3698 },
          geocodingStatus: GeocodingStatus.Success,
          geocodingError: null,
          lastGeocodedAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      store.overrideSelector(selectJobById('job-1'), mockJob);
      store.overrideSelector(selectAllTechnicians, mockTechnicians.slice(0, 2));
      
      const mockDistances = [
        { distanceMiles: 49.9, drivingTimeMinutes: 59 },
        { distanceMiles: 50.0, drivingTimeMinutes: 60 }
      ];
      
      geocodingService.calculateDistancesBatch.and.returnValue(of(mockDistances));
      
      service.calculateDistancesToJob('job-1').subscribe({
        next: (results) => {
          expect(results[0].perDiemEligible).toBe(false); // 49.9 miles
          expect(results[1].perDiemEligible).toBe(true);  // 50.0 miles
          done();
        },
        error: done.fail
      });
      
      const req1 = httpMock.expectOne('/api/travel/profiles/tech-1');
      req1.flush(travelProfiles[0]);
      
      const req2 = httpMock.expectOne('/api/travel/profiles/tech-2');
      req2.flush(travelProfiles[1]);
    });

    it('should handle geocoding service errors', (done) => {
      const travelProfiles: TravelProfile[] = [
        {
          technicianId: 'tech-1',
          willingToTravel: true,
          homeAddress: mockAddress,
          homeCoordinates: { latitude: 30.2672, longitude: -97.7431 },
          geocodingStatus: GeocodingStatus.Success,
          geocodingError: null,
          lastGeocodedAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      store.overrideSelector(selectJobById('job-1'), mockJob);
      store.overrideSelector(selectAllTechnicians, [mockTechnicians[0]]);
      
      geocodingService.calculateDistancesBatch.and.returnValue(
        throwError(() => new Error('Geocoding service error'))
      );
      
      service.calculateDistancesToJob('job-1').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('error');
          done();
        }
      });
      
      const req = httpMock.expectOne('/api/travel/profiles/tech-1');
      req.flush(travelProfiles[0]);
    });

    it('should handle travel profile fetch errors gracefully', (done) => {
      store.overrideSelector(selectJobById('job-1'), mockJob);
      store.overrideSelector(selectAllTechnicians, mockTechnicians);
      
      service.calculateDistancesToJob('job-1').subscribe({
        next: (results) => {
          // Should return empty array since all profile fetches failed
          expect(results).toEqual([]);
          done();
        },
        error: done.fail
      });
      
      // All profile requests fail
      mockTechnicians.forEach(tech => {
        const req = httpMock.expectOne(`/api/travel/profiles/${tech.id}`);
        req.flush('Not found', { status: 404, statusText: 'Not Found' });
      });
    });
  });

  describe('calculatePerDiem', () => {
    const config: PerDiemConfig = {
      minimumDistanceMiles: 50,
      ratePerMile: 0.655,
      flatRateAmount: null
    };

    it('should return 0 for distances below minimum', () => {
      expect(service.calculatePerDiem(49, config)).toBe(0);
      expect(service.calculatePerDiem(0, config)).toBe(0);
      expect(service.calculatePerDiem(25, config)).toBe(0);
    });

    it('should calculate per diem using rate per mile', () => {
      expect(service.calculatePerDiem(50, config)).toBeCloseTo(32.75, 2);
      expect(service.calculatePerDiem(100, config)).toBeCloseTo(65.5, 2);
      expect(service.calculatePerDiem(150, config)).toBeCloseTo(98.25, 2);
    });

    it('should use flat rate when configured', () => {
      const flatRateConfig: PerDiemConfig = {
        minimumDistanceMiles: 50,
        ratePerMile: 0.655,
        flatRateAmount: 75
      };
      
      expect(service.calculatePerDiem(50, flatRateConfig)).toBe(75);
      expect(service.calculatePerDiem(100, flatRateConfig)).toBe(75);
      expect(service.calculatePerDiem(200, flatRateConfig)).toBe(75);
    });

    it('should return 0 for flat rate when below minimum distance', () => {
      const flatRateConfig: PerDiemConfig = {
        minimumDistanceMiles: 50,
        ratePerMile: 0.655,
        flatRateAmount: 75
      };
      
      expect(service.calculatePerDiem(49, flatRateConfig)).toBe(0);
    });

    it('should handle edge case at exactly minimum distance', () => {
      expect(service.calculatePerDiem(50, config)).toBeCloseTo(32.75, 2);
    });

    it('should handle very large distances', () => {
      const result = service.calculatePerDiem(1000, config);
      expect(result).toBeCloseTo(655, 2);
    });

    it('should handle different minimum distance thresholds', () => {
      const config100: PerDiemConfig = {
        minimumDistanceMiles: 100,
        ratePerMile: 0.655,
        flatRateAmount: null
      };
      
      expect(service.calculatePerDiem(99, config100)).toBe(0);
      expect(service.calculatePerDiem(100, config100)).toBeCloseTo(65.5, 2);
    });

    it('should handle different rate per mile values', () => {
      const customRateConfig: PerDiemConfig = {
        minimumDistanceMiles: 50,
        ratePerMile: 1.0,
        flatRateAmount: null
      };
      
      expect(service.calculatePerDiem(50, customRateConfig)).toBe(50);
      expect(service.calculatePerDiem(100, customRateConfig)).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors with appropriate messages', (done) => {
      service.getTravelProfile('tech-1').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Server error');
          done();
        }
      });

      const req = httpMock.expectOne('/api/travel/profiles/tech-1');
      req.flush('Internal server error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle multiple concurrent requests', (done) => {
      let completedRequests = 0;
      const checkDone = () => {
        completedRequests++;
        if (completedRequests === 2) {
          done();
        }
      };

      service.getTravelProfile('tech-1').subscribe({
        next: (profile) => {
          expect(profile.technicianId).toBe('tech-1');
          checkDone();
        },
        error: done.fail
      });

      service.getTravelProfile('tech-2').subscribe({
        next: (profile) => {
          expect(profile.technicianId).toBe('tech-2');
          checkDone();
        },
        error: done.fail
      });

      const req1 = httpMock.expectOne('/api/travel/profiles/tech-1');
      const req2 = httpMock.expectOne('/api/travel/profiles/tech-2');
      
      req1.flush({ ...mockTravelProfile, technicianId: 'tech-1' });
      req2.flush({ ...mockTravelProfile, technicianId: 'tech-2' });
    });
  });
});
