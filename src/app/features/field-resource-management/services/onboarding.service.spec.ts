import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OnboardingService } from './onboarding.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environments';
import {
  Candidate,
  CandidateFilters,
  CreateCandidatePayload,
  UpdateCandidatePayload,
  OnboardingServiceError,
} from '../models/onboarding.models';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/onboarding`;

  const mockUser = {
    id: 'user-1',
    name: 'HR User',
    role: 'HR',
  };

  const mockCandidate: Candidate = {
    candidateId: 'c-1',
    techName: 'John Doe',
    techEmail: 'john@example.com',
    techPhone: '5551234567',
    vestSize: 'L',
    drugTestComplete: false,
    oshaCertified: false,
    scissorLiftCertified: false,
    biisciCertified: false,
    workSite: 'Dallas HQ',
    startDate: '2025-08-01',
    offerStatus: 'pre_offer',
    createdBy: 'user-1',
    createdAt: '2025-07-01T00:00:00.000Z',
    updatedBy: 'user-1',
    updatedAt: '2025-07-01T00:00:00.000Z',
  };

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getUser']);
    authSpy.getUser.and.returnValue(mockUser);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        OnboardingService,
        { provide: AuthService, useValue: authSpy },
      ],
    });

    service = TestBed.inject(OnboardingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ---------------------------------------------------------------------------
  // getCandidates
  // ---------------------------------------------------------------------------

  describe('getCandidates', () => {
    it('should GET candidates without params when no filters provided', () => {
      service.getCandidates().subscribe((candidates) => {
        expect(candidates).toEqual([mockCandidate]);
      });

      const req = httpMock.expectOne(`${baseUrl}/candidates`);
      expect(req.request.method).toBe('GET');
      req.flush([mockCandidate]);
    });

    it('should pass offerStatus as query param', () => {
      const filters: CandidateFilters = { offerStatus: 'offer' };
      service.getCandidates(filters).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/candidates`);
      expect(req.request.params.get('offerStatus')).toBe('offer');
      req.flush([]);
    });

    it('should pass search as query param', () => {
      const filters: CandidateFilters = { search: 'john' };
      service.getCandidates(filters).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/candidates`);
      expect(req.request.params.get('search')).toBe('john');
      req.flush([]);
    });

    it('should pass incompleteCerts as query param', () => {
      const filters: CandidateFilters = { incompleteCerts: true };
      service.getCandidates(filters).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/candidates`);
      expect(req.request.params.get('incompleteCerts')).toBe('true');
      req.flush([]);
    });

    it('should map HTTP errors to OnboardingServiceError', () => {
      service.getCandidates().subscribe({
        error: (err: OnboardingServiceError) => {
          expect(err.statusCode).toBe(500);
          expect(err.operation).toBe('getCandidates');
          expect(err.message).toBe('Server failure');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/candidates`);
      req.flush({ message: 'Server failure' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  // ---------------------------------------------------------------------------
  // getCandidateById
  // ---------------------------------------------------------------------------

  describe('getCandidateById', () => {
    it('should GET a single candidate by id', () => {
      service.getCandidateById('c-1').subscribe((candidate) => {
        expect(candidate).toEqual(mockCandidate);
      });

      const req = httpMock.expectOne(`${baseUrl}/candidates/c-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCandidate);
    });

    it('should map HTTP errors to OnboardingServiceError', () => {
      service.getCandidateById('c-999').subscribe({
        error: (err: OnboardingServiceError) => {
          expect(err.statusCode).toBe(404);
          expect(err.operation).toBe('getCandidateById');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/candidates/c-999`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  // ---------------------------------------------------------------------------
  // createCandidate
  // ---------------------------------------------------------------------------

  describe('createCandidate', () => {
    const payload: CreateCandidatePayload = {
      techName: 'Jane Smith',
      techEmail: 'jane@example.com',
      techPhone: '5559876543',
      vestSize: 'M',
      workSite: 'Austin Office',
      startDate: '2025-09-01',
      offerStatus: 'pre_offer',
    };

    it('should POST with audit metadata attached', () => {
      service.createCandidate(payload).subscribe((candidate) => {
        expect(candidate).toEqual(mockCandidate);
      });

      const req = httpMock.expectOne(`${baseUrl}/candidates`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.techName).toBe('Jane Smith');
      expect(req.request.body.userId).toBe('user-1');
      expect(req.request.body.userName).toBe('HR User');
      expect(req.request.body.userRole).toBe('HR');
      expect(req.request.body.timestamp).toBeTruthy();
      req.flush(mockCandidate);
    });

    it('should map HTTP errors to OnboardingServiceError', () => {
      service.createCandidate(payload).subscribe({
        error: (err: OnboardingServiceError) => {
          expect(err.statusCode).toBe(400);
          expect(err.operation).toBe('createCandidate');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/candidates`);
      req.flush({ message: 'Bad request' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  // ---------------------------------------------------------------------------
  // updateCandidate
  // ---------------------------------------------------------------------------

  describe('updateCandidate', () => {
    const payload: UpdateCandidatePayload = {
      offerStatus: 'offer',
      drugTestComplete: true,
    };

    it('should PUT with audit metadata attached', () => {
      service.updateCandidate('c-1', payload).subscribe((candidate) => {
        expect(candidate).toEqual(mockCandidate);
      });

      const req = httpMock.expectOne(`${baseUrl}/candidates/c-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.offerStatus).toBe('offer');
      expect(req.request.body.drugTestComplete).toBe(true);
      expect(req.request.body.userId).toBe('user-1');
      expect(req.request.body.userName).toBe('HR User');
      expect(req.request.body.userRole).toBe('HR');
      expect(req.request.body.timestamp).toBeTruthy();
      req.flush(mockCandidate);
    });

    it('should map HTTP errors to OnboardingServiceError', () => {
      service.updateCandidate('c-1', payload).subscribe({
        error: (err: OnboardingServiceError) => {
          expect(err.statusCode).toBe(422);
          expect(err.operation).toBe('updateCandidate');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/candidates/c-1`);
      req.flush({ message: 'Unprocessable' }, { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  // ---------------------------------------------------------------------------
  // deleteCandidateById
  // ---------------------------------------------------------------------------

  describe('deleteCandidateById', () => {
    it('should DELETE a candidate by id', () => {
      service.deleteCandidateById('c-1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/candidates/c-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should map HTTP errors to OnboardingServiceError', () => {
      service.deleteCandidateById('c-1').subscribe({
        error: (err: OnboardingServiceError) => {
          expect(err.statusCode).toBe(403);
          expect(err.operation).toBe('deleteCandidateById');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/candidates/c-1`);
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  // ---------------------------------------------------------------------------
  // Error mapping edge cases
  // ---------------------------------------------------------------------------

  describe('error mapping', () => {
    it('should use fallback message when error has no structured message', () => {
      service.getCandidates().subscribe({
        error: (err: OnboardingServiceError) => {
          expect(err.statusCode).toBe(0);
          expect(err.operation).toBe('getCandidates');
          expect(typeof err.message).toBe('string');
          expect(err.message.length).toBeGreaterThan(0);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/candidates`);
      req.error(new ProgressEvent('error'));
    });
  });
});
