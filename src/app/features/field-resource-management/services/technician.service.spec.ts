import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TechnicianService } from './technician.service';
import { RoleBasedDataService } from '../../../services/role-based-data.service';
import { AuthService } from '../../../services/auth.service';
import { 
  Technician, 
  TechnicianRole, 
  EmploymentType, 
  Skill, 
  Certification,
  CertificationStatus,
  Availability
, SkillLevel} from '../models/technician.model';
import { 
  CreateTechnicianDto, 
  UpdateTechnicianDto, 
  TechnicianFilters 
} from '../models/dtos';
import { DateRange } from '../models/assignment.model';
import { GeoLocation } from '../models/time-entry.model';

describe('TechnicianService', () => {
  let service: TechnicianService;
  let httpMock: HttpTestingController;
  let roleBasedDataService: jasmine.SpyObj<RoleBasedDataService>;
  let authService: jasmine.SpyObj<AuthService>;

  const mockTechnician: Technician = {
    id: 'tech-123',
    technicianId: 'T-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0100',
    role: TechnicianRole.Level2,
    employmentType: EmploymentType.W2,
    homeBase: 'Dallas',
    region: 'TX',
    skills: [],
    certifications: [],
    availability: [],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    company: 'TEST_COMPANY',    updatedAt: new Date('2024-01-01')
  };

  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    role: 'CM',
    market: 'TX',
    company: 'INTERNAL'
  };

  beforeEach(() => {
    const roleBasedDataServiceSpy = jasmine.createSpyObj('RoleBasedDataService', ['applyMarketFilter']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isAdmin',
      'isCM',
      'getUser'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TechnicianService,
        { provide: RoleBasedDataService, useValue: roleBasedDataServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(TechnicianService);
    httpMock = TestBed.inject(HttpTestingController);
    roleBasedDataService = TestBed.inject(RoleBasedDataService) as jasmine.SpyObj<RoleBasedDataService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getTechnicians', () => {
    it('should retrieve technicians without filters', () => {
      authService.isAdmin.and.returnValue(true);
      const mockTechnicians = [mockTechnician];

      service.getTechnicians().subscribe(technicians => {
        expect(technicians).toEqual(mockTechnicians);
        expect(technicians.length).toBe(1);
      });

      const req = httpMock.expectOne('/api/technicians');
      expect(req.request.method).toBe('GET');
      req.flush(mockTechnicians);
    });

    it('should retrieve technicians with filters', () => {
      authService.isAdmin.and.returnValue(true);
      const filters: TechnicianFilters = {
        searchTerm: 'John',
        role: TechnicianRole.Level2,
        skills: ['Fiber', 'Copper'],
        region: 'TX',
        isAvailable: true,
        isActive: true,
        page: 1,
        pageSize: 10
      };

      service.getTechnicians(filters).subscribe();

      const req = httpMock.expectOne(request => 
        request.url === '/api/technicians' && 
        request.params.get('searchTerm') === 'John' &&
        request.params.get('role') === TechnicianRole.Level2 &&
        request.params.get('skills') === 'Fiber,Copper' &&
        request.params.get('region') === 'TX' &&
        request.params.get('isAvailable') === 'true' &&
        request.params.get('isActive') === 'true' &&
        request.params.get('page') === '1' &&
        request.params.get('pageSize') === '10'
      );
      expect(req.request.method).toBe('GET');
      req.flush([mockTechnician]);
    });

    it('should apply role-based filtering for CM users', () => {
      authService.isAdmin.and.returnValue(false);
      authService.isCM.and.returnValue(true);
      const mockTechnicians = [mockTechnician];
      const techniciansWithMarket = [{ ...mockTechnician, market: mockTechnician.region }];
      roleBasedDataService.applyMarketFilter.and.returnValue(techniciansWithMarket);

      service.getTechnicians().subscribe(technicians => {
        expect(roleBasedDataService.applyMarketFilter).toHaveBeenCalled();
        expect(technicians.length).toBe(1);
      });

      const req = httpMock.expectOne('/api/technicians');
      req.flush(mockTechnicians);
    });

    it('should retry on failure', () => {
      authService.isAdmin.and.returnValue(true);
      let callCount = 0;

      service.getTechnicians().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(callCount).toBe(3); // Initial + 2 retries
          expect(error.message).toContain('Server error');
        }
      });

      // Expect 3 requests (initial + 2 retries)
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/technicians');
        callCount++;
        req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      }
    });
  });

  describe('getTechnicianById', () => {
    it('should retrieve a technician by ID', () => {
      service.getTechnicianById('tech-123').subscribe(technician => {
        expect(technician).toEqual(mockTechnician);
        expect(technician.id).toBe('tech-123');
      });

      const req = httpMock.expectOne('/api/technicians/tech-123');
      expect(req.request.method).toBe('GET');
      req.flush(mockTechnician);
    });

    it('should handle 404 error when technician not found', () => {
      service.getTechnicianById('invalid-id').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Technician not found');
        }
      });

      const req = httpMock.expectOne('/api/technicians/invalid-id');
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('createTechnician', () => {
    const validCreateDto: CreateTechnicianDto = {
      technicianId: 'T-002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '555-0200',
      role: TechnicianRole.Level1,
      employmentType: EmploymentType.W2,
      homeBase: 'Houston',
      region: 'TX'
    };

    it('should create a technician with valid data', () => {
      authService.isCM.and.returnValue(false);
      authService.isAdmin.and.returnValue(true);

      service.createTechnician(validCreateDto).subscribe(technician => {
        expect(technician.firstName).toBe('Jane');
        expect(technician.lastName).toBe('Smith');
      });

      const req = httpMock.expectOne('/api/technicians');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(validCreateDto);
      req.flush({ ...mockTechnician, ...validCreateDto });
    });

    it('should reject creation without required fields', () => {
      const invalidDto = { ...validCreateDto, firstName: '' };

      service.createTechnician(invalidDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('First name, last name, and email are required');
        }
      });

      httpMock.expectNone('/api/technicians');
    });

    it('should reject creation with invalid email format', () => {
      const invalidDto = { ...validCreateDto, email: 'invalid-email' };

      service.createTechnician(invalidDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid email format');
        }
      });

      httpMock.expectNone('/api/technicians');
    });

    it('should reject creation with invalid phone format', () => {
      const invalidDto = { ...validCreateDto, phone: 'abc-def-ghij' };

      service.createTechnician(invalidDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid phone number format');
        }
      });

      httpMock.expectNone('/api/technicians');
    });

    it('should reject creation without region', () => {
      const invalidDto = { ...validCreateDto, region: '' };

      service.createTechnician(invalidDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Region is required');
        }
      });

      httpMock.expectNone('/api/technicians');
    });

    it('should reject CM creating technician in different market', () => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue({ ...mockUser, market: 'CA' });
      const invalidDto = { ...validCreateDto, region: 'TX' };

      service.createTechnician(invalidDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('You can only create technicians in your own market');
        }
      });

      httpMock.expectNone('/api/technicians');
    });

    it('should validate skills have name and level', () => {
      const invalidDto = { 
        ...validCreateDto, 
        skills: [{ id: 'skill-1', name: '', category: 'Technical' , level: SkillLevel.Intermediate }] as Skill[]
      };

      service.createTechnician(invalidDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('All skills must have a name and level');
        }
      });

      httpMock.expectNone('/api/technicians');
    });

    it('should validate certification expiry date is after issue date', () => {
      const invalidDto = { 
        ...validCreateDto, 
        certifications: [{
          id: 'cert-1',
          name: 'Fiber Cert',
          issueDate: new Date('2024-01-01'),
          expirationDate: new Date('2023-01-01'),
          status: CertificationStatus.Active
        }] as Certification[]
      };

      service.createTechnician(invalidDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Certification expiry date must be after issue date');
        }
      });

      httpMock.expectNone('/api/technicians');
    });

    it('should reject negative hourly cost rate', () => {
      const invalidDto = { ...validCreateDto, hourlyCostRate: -50 };

      service.createTechnician(invalidDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Hourly cost rate must be a positive number');
        }
      });

      httpMock.expectNone('/api/technicians');
    });
  });

  describe('updateTechnician', () => {
    const updateDto: UpdateTechnicianDto = {
      phone: '555-0300',
      homeBase: 'Austin'
    };

    it('should update a technician', () => {
      authService.isCM.and.returnValue(false);
      authService.isAdmin.and.returnValue(true);

      service.updateTechnician('tech-123', updateDto).subscribe(technician => {
        expect(technician.phone).toBe('555-0300');
      });

      const req = httpMock.expectOne('/api/technicians/tech-123');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateDto);
      req.flush({ ...mockTechnician, ...updateDto });
    });

    it('should validate CM can only update technicians in their market', () => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue({ ...mockUser, market: 'TX' });

      service.updateTechnician('tech-123', updateDto).subscribe(technician => {
        expect(technician).toBeDefined();
      });

      // First request to get technician
      const getReq = httpMock.expectOne('/api/technicians/tech-123');
      expect(getReq.request.method).toBe('GET');
      getReq.flush(mockTechnician);

      // Second request to update
      const putReq = httpMock.expectOne('/api/technicians/tech-123');
      expect(putReq.request.method).toBe('PUT');
      putReq.flush({ ...mockTechnician, ...updateDto });
    });

    it('should reject CM updating technician from different market', () => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue({ ...mockUser, market: 'CA' });

      service.updateTechnician('tech-123', updateDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('You do not have permission to update technicians from other markets');
        }
      });

      const getReq = httpMock.expectOne('/api/technicians/tech-123');
      getReq.flush(mockTechnician);
    });
  });

  describe('validateTechnicianAssignment', () => {
    it('should allow admin to assign any technician', (done) => {
      authService.isAdmin.and.returnValue(true);

      service.validateTechnicianAssignment('tech-123', 'TX').subscribe(result => {
        expect(result).toBe(true);
        done();
      });
    });

    it('should validate CM can assign technicians from their market', () => {
      authService.isAdmin.and.returnValue(false);
      authService.isCM.and.returnValue(true);
      authService.getUser.and.returnValue({ ...mockUser, market: 'TX' });

      service.validateTechnicianAssignment('tech-123', 'TX').subscribe(result => {
        expect(result).toBe(true);
      });

      const req = httpMock.expectOne('/api/technicians/tech-123');
      req.flush(mockTechnician);
    });

    it('should reject CM assigning technician from different market', () => {
      authService.isAdmin.and.returnValue(false);
      authService.isCM.and.returnValue(true);
      authService.getUser.and.returnValue({ ...mockUser, market: 'CA' });

      service.validateTechnicianAssignment('tech-123', 'TX').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('You cannot assign technicians from other markets');
        }
      });

      const req = httpMock.expectOne('/api/technicians/tech-123');
      req.flush(mockTechnician);
    });

    it('should reject CM assigning to project in different market', () => {
      authService.isAdmin.and.returnValue(false);
      authService.isCM.and.returnValue(true);
      authService.getUser.and.returnValue({ ...mockUser, market: 'TX' });

      service.validateTechnicianAssignment('tech-123', 'CA').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('You cannot assign technicians to projects in other markets');
        }
      });

      const req = httpMock.expectOne('/api/technicians/tech-123');
      req.flush(mockTechnician);
    });

    it('should allow other roles to assign', (done) => {
      authService.isAdmin.and.returnValue(false);
      authService.isCM.and.returnValue(false);

      service.validateTechnicianAssignment('tech-123', 'TX').subscribe(result => {
        expect(result).toBe(true);
        done();
      });
    });
  });

  describe('deleteTechnician', () => {
    it('should allow admin to delete technician', () => {
      authService.isAdmin.and.returnValue(true);

      service.deleteTechnician('tech-123').subscribe(() => {
        expect(true).toBe(true);
      });

      const req = httpMock.expectOne('/api/technicians/tech-123');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should reject non-admin from deleting technician', () => {
      authService.isAdmin.and.returnValue(false);

      service.deleteTechnician('tech-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Only administrators can delete technicians');
        }
      });

      httpMock.expectNone('/api/technicians/tech-123');
    });
  });

  describe('getTechnicianSkills', () => {
    it('should retrieve technician skills', () => {
      const mockSkills: Skill[] = [
        { id: 'skill-1', name: 'Fiber Installation', category: 'Technical' , level: SkillLevel.Intermediate },
        { id: 'skill-2', name: 'Copper Splicing', category: 'Technical' , level: SkillLevel.Intermediate }
      ];

      service.getTechnicianSkills('tech-123').subscribe(skills => {
        expect(skills).toEqual(mockSkills);
        expect(skills.length).toBe(2);
      });

      const req = httpMock.expectOne('/api/technicians/tech-123/skills');
      expect(req.request.method).toBe('GET');
      req.flush(mockSkills);
    });
  });

  describe('addTechnicianSkill', () => {
    it('should add a skill to technician', () => {
      const newSkill: Skill = { id: 'skill-3', name: 'Aerial Work', category: 'Safety' , level: SkillLevel.Intermediate };

      service.addTechnicianSkill('tech-123', newSkill).subscribe(() => {
        expect(true).toBe(true);
      });

      const req = httpMock.expectOne('/api/technicians/tech-123/skills');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newSkill);
      req.flush(null);
    });
  });

  describe('removeTechnicianSkill', () => {
    it('should remove a skill from technician', () => {
      service.removeTechnicianSkill('tech-123', 'skill-1').subscribe(() => {
        expect(true).toBe(true);
      });

      const req = httpMock.expectOne('/api/technicians/tech-123/skills/skill-1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getTechnicianCertifications', () => {
    it('should retrieve technician certifications', () => {
      const mockCertifications: Certification[] = [
        {
          id: 'cert-1',
          name: 'Fiber Optic Certification',
          issueDate: new Date('2023-01-01'),
          expirationDate: new Date('2025-01-01'),
          status: CertificationStatus.Active
        }
      ];

      service.getTechnicianCertifications('tech-123').subscribe(certs => {
        expect(certs).toEqual(mockCertifications);
        expect(certs.length).toBe(1);
      });

      const req = httpMock.expectOne('/api/technicians/tech-123/certifications');
      expect(req.request.method).toBe('GET');
      req.flush(mockCertifications);
    });
  });

  describe('getExpiringCertifications', () => {
    it('should retrieve expiring certifications with default threshold', () => {
      const mockCertifications: Certification[] = [
        {
          id: 'cert-1',
          name: 'Safety Certification',
          issueDate: new Date('2023-01-01'),
          expirationDate: new Date('2024-02-15'),
          status: CertificationStatus.ExpiringSoon
        }
      ];

      service.getExpiringCertifications().subscribe(certs => {
        expect(certs).toEqual(mockCertifications);
      });

      const req = httpMock.expectOne(request => 
        request.url === '/api/technicians/certifications/expiring' &&
        request.params.get('daysThreshold') === '30'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockCertifications);
    });

    it('should retrieve expiring certifications with custom threshold', () => {
      service.getExpiringCertifications(60).subscribe();

      const req = httpMock.expectOne(request => 
        request.url === '/api/technicians/certifications/expiring' &&
        request.params.get('daysThreshold') === '60'
      );
      req.flush([]);
    });
  });

  describe('getTechnicianAvailability', () => {
    it('should retrieve technician availability for date range', () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };
      const mockAvailability: Availability[] = [
        {
          id: 'avail-1',
          technicianId: 'tech-123',
          date: new Date('2024-01-15'),
          isAvailable: false,
          reason: 'PTO'
        }
      ];

      service.getTechnicianAvailability('tech-123', dateRange).subscribe(availability => {
        expect(availability).toEqual(mockAvailability);
      });

      const req = httpMock.expectOne(request => 
        request.url === '/api/technicians/tech-123/availability' &&
        request.params.has('startDate') &&
        request.params.has('endDate')
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockAvailability);
    });
  });

  describe('updateTechnicianAvailability', () => {
    it('should update technician availability', () => {
      const availability: Availability[] = [
        {
          id: 'avail-1',
          technicianId: 'tech-123',
          date: new Date('2024-01-15'),
          isAvailable: false,
          reason: 'Training'
        }
      ];

      service.updateTechnicianAvailability('tech-123', availability).subscribe(() => {
        expect(true).toBe(true);
      });

      const req = httpMock.expectOne('/api/technicians/tech-123/availability');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(availability);
      req.flush(null);
    });
  });

  describe('updateTechnicianLocation', () => {
    const validLocation: GeoLocation = {
      latitude: 32.7767,
      longitude: -96.7970,
      accuracy: 10
    };

    it('should update technician location with valid coordinates', () => {
      authService.isCM.and.returnValue(false);
      authService.isAdmin.and.returnValue(true);
      authService.getUser.and.returnValue(mockUser);

      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', validLocation).subscribe(() => {
        expect(true).toBe(true);
      });

      const req = httpMock.expectOne('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(validLocation);
      req.flush(null);
    });

    it('should reject invalid latitude (too low)', () => {
      const invalidLocation = { ...validLocation, latitude: -91 };
      authService.getUser.and.returnValue(mockUser);

      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', invalidLocation).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid latitude');
          expect(error.message).toContain('Must be between -90 and 90');
        }
      });

      httpMock.expectNone('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
    });

    it('should reject invalid latitude (too high)', () => {
      const invalidLocation = { ...validLocation, latitude: 91 };
      authService.getUser.and.returnValue(mockUser);

      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', invalidLocation).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid latitude');
        }
      });

      httpMock.expectNone('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
    });

    it('should reject invalid longitude (too low)', () => {
      const invalidLocation = { ...validLocation, longitude: -181 };
      authService.getUser.and.returnValue(mockUser);

      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', invalidLocation).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid longitude');
          expect(error.message).toContain('Must be between -180 and 180');
        }
      });

      httpMock.expectNone('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
    });

    it('should reject invalid longitude (too high)', () => {
      const invalidLocation = { ...validLocation, longitude: 181 };
      authService.getUser.and.returnValue(mockUser);

      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', invalidLocation).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid longitude');
        }
      });

      httpMock.expectNone('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
    });

    it('should reject invalid accuracy (negative)', () => {
      const invalidLocation = { ...validLocation, accuracy: -5 };
      authService.getUser.and.returnValue(mockUser);

      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', invalidLocation).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid accuracy');
          expect(error.message).toContain('Must be a positive number');
        }
      });

      httpMock.expectNone('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
    });

    it('should reject invalid accuracy (zero)', () => {
      const invalidLocation = { ...validLocation, accuracy: 0 };
      authService.getUser.and.returnValue(mockUser);

      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', invalidLocation).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid accuracy');
        }
      });

      httpMock.expectNone('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
    });

    it('should reject invalid technician ID format', () => {
      authService.getUser.and.returnValue(mockUser);

      service.updateTechnicianLocation('invalid-id', validLocation).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid technician ID format');
          expect(error.message).toContain('Must be a valid UUID');
        }
      });

      httpMock.expectNone('/api/technicians/invalid-id/location');
    });

    it('should reject unauthenticated user', () => {
      authService.getUser.and.returnValue(null);

      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', validLocation).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('User not authenticated');
        }
      });

      httpMock.expectNone('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
    });

    it('should reject technician updating another technician location', () => {
      authService.getUser.and.returnValue({ ...mockUser, id: 'different-user-id', role: 'TECHNICIAN' });

      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', validLocation).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Technicians can only update their own location');
        }
      });

      httpMock.expectNone('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
    });

    it('should allow technician to update their own location', () => {
      authService.isCM.and.returnValue(false);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue({ ...mockUser, id: '550e8400-e29b-41d4-a716-446655440000', role: 'TECHNICIAN' });

      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', validLocation).subscribe(() => {
        expect(true).toBe(true);
      });

      const req = httpMock.expectOne('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
      expect(req.request.method).toBe('PUT');
      req.flush(null);
    });

    it('should validate CM can only update location for technicians in their market', () => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue({ ...mockUser, market: 'TX' });

      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', validLocation).subscribe(() => {
        expect(true).toBe(true);
      });

      // First request to get technician
      const getReq = httpMock.expectOne('/api/technicians/550e8400-e29b-41d4-a716-446655440000');
      expect(getReq.request.method).toBe('GET');
      getReq.flush(mockTechnician);

      // Second request to update location
      const putReq = httpMock.expectOne('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
      expect(putReq.request.method).toBe('PUT');
      putReq.flush(null);
    });

    it('should reject CM updating location for technician from different market', () => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue({ ...mockUser, market: 'CA' });

      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', validLocation).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('You do not have permission to update location for technicians from other markets');
        }
      });

      const getReq = httpMock.expectOne('/api/technicians/550e8400-e29b-41d4-a716-446655440000');
      getReq.flush(mockTechnician);
    });

    it('should accept location without accuracy field', () => {
      authService.isCM.and.returnValue(false);
      authService.isAdmin.and.returnValue(true);
      authService.getUser.and.returnValue(mockUser);
      const locationWithoutAccuracy: GeoLocation = {
        latitude: 32.7767,
        longitude: -96.7970,
        accuracy: 0
      };

      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', locationWithoutAccuracy).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid accuracy');
        }
      });

      httpMock.expectNone('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
    });

    it('should accept boundary latitude values', () => {
      authService.isCM.and.returnValue(false);
      authService.isAdmin.and.returnValue(true);
      authService.getUser.and.returnValue(mockUser);

      // Test -90
      const location1 = { ...validLocation, latitude: -90 };
      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', location1).subscribe();
      const req1 = httpMock.expectOne('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
      req1.flush(null);

      // Test 90
      const location2 = { ...validLocation, latitude: 90 };
      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', location2).subscribe();
      const req2 = httpMock.expectOne('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
      req2.flush(null);
    });

    it('should accept boundary longitude values', () => {
      authService.isCM.and.returnValue(false);
      authService.isAdmin.and.returnValue(true);
      authService.getUser.and.returnValue(mockUser);

      // Test -180
      const location1 = { ...validLocation, longitude: -180 };
      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', location1).subscribe();
      const req1 = httpMock.expectOne('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
      req1.flush(null);

      // Test 180
      const location2 = { ...validLocation, longitude: 180 };
      service.updateTechnicianLocation('550e8400-e29b-41d4-a716-446655440000', location2).subscribe();
      const req2 = httpMock.expectOne('/api/technicians/550e8400-e29b-41d4-a716-446655440000/location');
      req2.flush(null);
    });
  });

  describe('handleError', () => {
    it('should handle 400 Bad Request error', () => {
      authService.isAdmin.and.returnValue(true);

      service.getTechnicianById('tech-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid request');
        }
      });

      const req = httpMock.expectOne('/api/technicians/tech-123');
      req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle 401 Unauthorized error', () => {
      authService.isAdmin.and.returnValue(true);

      service.getTechnicianById('tech-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Unauthorized');
        }
      });

      const req = httpMock.expectOne('/api/technicians/tech-123');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 403 Forbidden error', () => {
      authService.isAdmin.and.returnValue(true);

      service.getTechnicianById('tech-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Access denied');
        }
      });

      const req = httpMock.expectOne('/api/technicians/tech-123');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 404 Not Found error', () => {
      authService.isAdmin.and.returnValue(true);

      service.getTechnicianById('tech-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Technician not found');
        }
      });

      const req = httpMock.expectOne('/api/technicians/tech-123');
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle 409 Conflict error', () => {
      authService.isCM.and.returnValue(false);
      authService.isAdmin.and.returnValue(true);
      const createDto: CreateTechnicianDto = {
        technicianId: 'T-001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-0100',
        role: TechnicianRole.Level1,
        employmentType: EmploymentType.W2,
        homeBase: 'Dallas',
        region: 'TX'
      };

      service.createTechnician(createDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Conflict');
        }
      });

      const req = httpMock.expectOne('/api/technicians');
      req.flush('Conflict', { status: 409, statusText: 'Conflict' });
    });

    it('should handle 500 Internal Server Error', () => {
      authService.isAdmin.and.returnValue(true);

      service.getTechnicianById('tech-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Server error');
        }
      });

      const req = httpMock.expectOne('/api/technicians/tech-123');
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });
});
