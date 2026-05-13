/**
 * Unit tests for Crew Service
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CrewService } from './crew.service';
import { Crew, CrewStatus } from '../models/crew.model';
import { CreateCrewDto, UpdateCrewDto } from '../models/dtos/crew.dto';
import { CrewFilters } from '../models/dtos/filters.dto';
import { GeoLocation } from '../models/time-entry.model';

describe('CrewService', () => {
  let service: CrewService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api/crews';

  const mockCrew: Crew = {
    id: 'crew-123',
    name: 'Alpha Crew',
    leadTechnicianId: 'tech-456',
    memberIds: ['tech-456', 'tech-789'],
    market: 'DALLAS',
    company: 'ACME_CORP',
    status: CrewStatus.Available,
    currentLocation: {
      latitude: 32.7767,
      longitude: -96.7970,
      accuracy: 10
    },
    activeJobId: undefined,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CrewService]
    });

    service = TestBed.inject(CrewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCrews', () => {
    it('should retrieve all crews without filters', () => {
      const mockCrews: Crew[] = [mockCrew];

      service.getCrews().subscribe(crews => {
        expect(crews).toEqual(mockCrews);
        expect(crews.length).toBe(1);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockCrews);
    });

    it('should retrieve crews with status filter', () => {
      const filters: CrewFilters = { status: CrewStatus.Available };
      const mockCrews: Crew[] = [mockCrew];

      service.getCrews(filters).subscribe(crews => {
        expect(crews).toEqual(mockCrews);
      });

      const req = httpMock.expectOne(req => req.url === apiUrl && req.params.has('status'));
      expect(req.request.params.get('status')).toBe(CrewStatus.Available);
      req.flush(mockCrews);
    });

    it('should retrieve crews with market filter', () => {
      const filters: CrewFilters = { market: 'DALLAS' };

      service.getCrews(filters).subscribe();

      const req = httpMock.expectOne(req => req.url === apiUrl && req.params.has('market'));
      expect(req.request.params.get('market')).toBe('DALLAS');
      req.flush([mockCrew]);
    });

    it('should retrieve crews with company filter', () => {
      const filters: CrewFilters = { company: 'ACME_CORP' };

      service.getCrews(filters).subscribe();

      const req = httpMock.expectOne(req => req.url === apiUrl && req.params.has('company'));
      expect(req.request.params.get('company')).toBe('ACME_CORP');
      req.flush([mockCrew]);
    });

    it('should retrieve crews with search term', () => {
      const filters: CrewFilters = { searchTerm: 'Alpha' };

      service.getCrews(filters).subscribe();

      const req = httpMock.expectOne(req => req.url === apiUrl && req.params.has('searchTerm'));
      expect(req.request.params.get('searchTerm')).toBe('Alpha');
      req.flush([mockCrew]);
    });

    it('should retrieve crews with lead technician filter', () => {
      const filters: CrewFilters = { leadTechnicianId: 'tech-456' };

      service.getCrews(filters).subscribe();

      const req = httpMock.expectOne(req => req.url === apiUrl && req.params.has('leadTechnicianId'));
      expect(req.request.params.get('leadTechnicianId')).toBe('tech-456');
      req.flush([mockCrew]);
    });

    it('should retrieve crews with pagination', () => {
      const filters: CrewFilters = { page: 1, pageSize: 10 };

      service.getCrews(filters).subscribe();

      const req = httpMock.expectOne(req => 
        req.url === apiUrl && 
        req.params.has('page') && 
        req.params.has('pageSize')
      );
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('pageSize')).toBe('10');
      req.flush([mockCrew]);
    });

    it('should retrieve crews with multiple filters', () => {
      const filters: CrewFilters = {
        status: CrewStatus.Available,
        market: 'DALLAS',
        company: 'ACME_CORP',
        searchTerm: 'Alpha'
      };

      service.getCrews(filters).subscribe();

      const req = httpMock.expectOne(req => 
        req.url === apiUrl && 
        req.params.has('status') &&
        req.params.has('market') &&
        req.params.has('company') &&
        req.params.has('searchTerm')
      );
      req.flush([mockCrew]);
    });

    it('should retry on failure', () => {
      service.getCrews().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      // First attempt
      const req1 = httpMock.expectOne(apiUrl);
      req1.flush('Error', { status: 500, statusText: 'Server Error' });

      // First retry
      const req2 = httpMock.expectOne(apiUrl);
      req2.flush('Error', { status: 500, statusText: 'Server Error' });

      // Second retry
      const req3 = httpMock.expectOne(apiUrl);
      req3.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getCrewById', () => {
    it('should retrieve a crew by ID', () => {
      const crewId = 'crew-123';

      service.getCrewById(crewId).subscribe(crew => {
        expect(crew).toEqual(mockCrew);
        expect(crew.id).toBe(crewId);
      });

      const req = httpMock.expectOne(`${apiUrl}/${crewId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCrew);
    });

    it('should handle 404 error when crew not found', () => {
      const crewId = 'non-existent';

      service.getCrewById(crewId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Crew not found');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${crewId}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should retry on failure', () => {
      const crewId = 'crew-123';

      service.getCrewById(crewId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      // First attempt
      const req1 = httpMock.expectOne(`${apiUrl}/${crewId}`);
      req1.flush('Error', { status: 500, statusText: 'Server Error' });

      // First retry
      const req2 = httpMock.expectOne(`${apiUrl}/${crewId}`);
      req2.flush('Error', { status: 500, statusText: 'Server Error' });

      // Second retry
      const req3 = httpMock.expectOne(`${apiUrl}/${crewId}`);
      req3.flush('Error', { status: 500, statusText: 'Server Error' });
    });

    it('should handle 401 unauthorized error', () => {
      const crewId = 'crew-123';

      service.getCrewById(crewId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Unauthorized');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${crewId}`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 403 forbidden error', () => {
      const crewId = 'crew-123';

      service.getCrewById(crewId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Access denied');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${crewId}`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('createCrew', () => {
    it('should create a new crew', () => {
      const createDto: CreateCrewDto = {
        name: 'Alpha Crew',
        leadTechnicianId: 'tech-456',
        memberIds: ['tech-456', 'tech-789'],
        market: 'DALLAS',
        company: 'ACME_CORP'
      };

      service.createCrew(createDto).subscribe(crew => {
        expect(crew).toEqual(mockCrew);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush(mockCrew);
    });

    it('should handle 400 bad request error', () => {
      const createDto: CreateCrewDto = {
        name: '',
        leadTechnicianId: 'tech-456',
        memberIds: [],
        market: 'DALLAS',
        company: 'ACME_CORP'
      };

      service.createCrew(createDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid request');
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('updateCrew', () => {
    it('should update an existing crew', () => {
      const crewId = 'crew-123';
      const updateDto: UpdateCrewDto = {
        name: 'Updated Alpha Crew',
        status: CrewStatus.OnJob
      };

      const updatedCrew = { ...mockCrew, ...updateDto };

      service.updateCrew(crewId, updateDto).subscribe(crew => {
        expect(crew).toEqual(updatedCrew);
      });

      const req = httpMock.expectOne(`${apiUrl}/${crewId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateDto);
      req.flush(updatedCrew);
    });

    it('should handle 404 error when updating non-existent crew', () => {
      const crewId = 'non-existent';
      const updateDto: UpdateCrewDto = { name: 'Updated' };

      service.updateCrew(crewId, updateDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Crew not found');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${crewId}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('deleteCrew', () => {
    it('should delete a crew', () => {
      const crewId = 'crew-123';

      service.deleteCrew(crewId).subscribe(result => {
        expect(result).toBeUndefined();
      });

      const req = httpMock.expectOne(`${apiUrl}/${crewId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle 404 error when deleting non-existent crew', () => {
      const crewId = 'non-existent';

      service.deleteCrew(crewId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Crew not found');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${crewId}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('updateCrewLocation', () => {
    it('should update crew location', () => {
      const crewId = 'crew-123';
      const location: GeoLocation = {
        latitude: 33.0,
        longitude: -97.0,
        accuracy: 5
      };

      const updatedCrew = { ...mockCrew, currentLocation: location };

      service.updateCrewLocation(crewId, location).subscribe(crew => {
        expect(crew.currentLocation).toEqual(location);
      });

      const req = httpMock.expectOne(`${apiUrl}/${crewId}/location`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(location);
      req.flush(updatedCrew);
    });
  });

  describe('assignJobToCrew', () => {
    it('should assign a job to a crew', () => {
      const crewId = 'crew-123';
      const jobId = 'job-456';

      const updatedCrew = { ...mockCrew, activeJobId: jobId, status: CrewStatus.OnJob };

      service.assignJobToCrew(crewId, jobId).subscribe(crew => {
        expect(crew.activeJobId).toBe(jobId);
        expect(crew.status).toBe(CrewStatus.OnJob);
      });

      const req = httpMock.expectOne(`${apiUrl}/${crewId}/assign-job`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ jobId });
      req.flush(updatedCrew);
    });
  });

  describe('unassignJobFromCrew', () => {
    it('should unassign job from a crew', () => {
      const crewId = 'crew-123';

      const updatedCrew = { ...mockCrew, activeJobId: undefined, status: CrewStatus.Available };

      service.unassignJobFromCrew(crewId).subscribe(crew => {
        expect(crew.activeJobId).toBeUndefined();
        expect(crew.status).toBe(CrewStatus.Available);
      });

      const req = httpMock.expectOne(`${apiUrl}/${crewId}/unassign-job`);
      expect(req.request.method).toBe('POST');
      req.flush(updatedCrew);
    });
  });

  describe('addCrewMember', () => {
    it('should add a member to a crew', () => {
      const crewId = 'crew-123';
      const technicianId = 'tech-999';

      const updatedCrew = { 
        ...mockCrew, 
        memberIds: [...mockCrew.memberIds, technicianId] 
      };

      service.addCrewMember(crewId, technicianId).subscribe(crew => {
        expect(crew.memberIds).toContain(technicianId);
      });

      const req = httpMock.expectOne(`${apiUrl}/${crewId}/members`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ technicianId });
      req.flush(updatedCrew);
    });
  });

  describe('removeCrewMember', () => {
    it('should remove a member from a crew', () => {
      const crewId = 'crew-123';
      const technicianId = 'tech-789';

      const updatedCrew = { 
        ...mockCrew, 
        memberIds: mockCrew.memberIds.filter(id => id !== technicianId)
      };

      service.removeCrewMember(crewId, technicianId).subscribe(crew => {
        expect(crew.memberIds).not.toContain(technicianId);
      });

      const req = httpMock.expectOne(`${apiUrl}/${crewId}/members/${technicianId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(updatedCrew);
    });
  });

  describe('error handling', () => {
    it('should handle 409 conflict error', () => {
      const createDto: CreateCrewDto = {
        name: 'Alpha Crew',
        leadTechnicianId: 'tech-456',
        memberIds: ['tech-456'],
        market: 'DALLAS',
        company: 'ACME_CORP'
      };

      service.createCrew(createDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Conflict');
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush('Conflict', { status: 409, statusText: 'Conflict' });
    });

    it('should handle 500 server error', () => {
      service.getCrews().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Server error');
        }
      });

      const req1 = httpMock.expectOne(apiUrl);
      req1.flush('Server Error', { status: 500, statusText: 'Server Error' });

      const req2 = httpMock.expectOne(apiUrl);
      req2.flush('Server Error', { status: 500, statusText: 'Server Error' });

      const req3 = httpMock.expectOne(apiUrl);
      req3.flush('Server Error', { status: 500, statusText: 'Server Error' });
    });

    it('should handle client-side error', () => {
      service.getCrews().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req1 = httpMock.expectOne(apiUrl);
      req1.error(new ErrorEvent('Network error', {
        message: 'Network connection failed'
      }));

      const req2 = httpMock.expectOne(apiUrl);
      req2.error(new ErrorEvent('Network error', {
        message: 'Network connection failed'
      }));

      const req3 = httpMock.expectOne(apiUrl);
      req3.error(new ErrorEvent('Network error', {
        message: 'Network connection failed'
      }));
    });
  });
});
