import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ExceptionService } from './exception.service';
import { AtlasErrorHandlerService } from './atlas-error-handler.service';
import {
  ExceptionDto,
  ExceptionStatus,
  CreateExceptionRequest,
  ExceptionValidationResult,
  ApproveExceptionRequest,
  DenyExceptionRequest
} from '../models/exception.model';
import { PagedResult } from '../models/common.model';

describe('ExceptionService', () => {
  let service: ExceptionService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<AtlasErrorHandlerService>;

  const mockException: ExceptionDto = {
    id: 'exc-123',
    exceptionType: 'MISSING_DOCUMENTATION',
    status: ExceptionStatus.PENDING,
    requestedBy: 'user-456',
    requestedAt: new Date('2024-01-15T10:00:00Z'),
    expiresAt: new Date('2024-02-15T10:00:00Z'),
    justification: 'Documentation will be completed post-deployment'
  };

  beforeEach(() => {
    const errorHandlerSpy = jasmine.createSpyObj('AtlasErrorHandlerService', ['handleError']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ExceptionService,
        { provide: AtlasErrorHandlerService, useValue: errorHandlerSpy }
      ]
    });

    service = TestBed.inject(ExceptionService);
    httpMock = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(AtlasErrorHandlerService) as jasmine.SpyObj<AtlasErrorHandlerService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('createException', () => {
    it('should create a new exception request', (done) => {
      const deploymentId = 'dep-123';
      const request: CreateExceptionRequest = {
        exceptionType: 'MISSING_DOCUMENTATION',
        justification: 'Documentation will be completed post-deployment',
        requestedBy: 'user-456',
        supportingEvidence: ['ticket-789']
      };

      service.createException(deploymentId, request).subscribe(exception => {
        expect(exception).toEqual(mockException);
        expect(exception.id).toBe('exc-123');
        expect(exception.status).toBe(ExceptionStatus.PENDING);
        done();
      });

      const req = httpMock.expectOne(`/v1/exceptions/deployments/${deploymentId}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockException);
    });
  });

  describe('getExceptions', () => {
    it('should get paginated exceptions for a deployment', (done) => {
      const deploymentId = 'dep-123';
      const mockPagedResult: PagedResult<ExceptionDto> = {
        items: [mockException],
        pagination: {
          currentPage: 1,
          pageSize: 50,
          totalCount: 1,
          totalPages: 1
        }
      };

      service.getExceptions(deploymentId, 1, 50).subscribe(result => {
        expect(result.items.length).toBe(1);
        expect(result.items[0]).toEqual(mockException);
        expect(result.pagination.currentPage).toBe(1);
        expect(result.pagination.totalCount).toBe(1);
        done();
      });

      const req = httpMock.expectOne(`/v1/exceptions/deployments/${deploymentId}?page=1&pageSize=50`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPagedResult);
    });

    it('should use default pagination parameters', (done) => {
      const deploymentId = 'dep-123';
      const mockPagedResult: PagedResult<ExceptionDto> = {
        items: [],
        pagination: {
          currentPage: 1,
          pageSize: 50,
          totalCount: 0,
          totalPages: 0
        }
      };

      service.getExceptions(deploymentId).subscribe(result => {
        expect(result.items.length).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`/v1/exceptions/deployments/${deploymentId}?page=1&pageSize=50`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPagedResult);
    });
  });

  describe('getException', () => {
    it('should get a specific exception by ID', (done) => {
      const exceptionId = 'exc-123';

      service.getException(exceptionId).subscribe(exception => {
        expect(exception).toEqual(mockException);
        expect(exception.id).toBe(exceptionId);
        expect(exception.exceptionType).toBe('MISSING_DOCUMENTATION');
        done();
      });

      const req = httpMock.expectOne(`/v1/exceptions/${exceptionId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockException);
    });
  });

  describe('getActiveExceptions', () => {
    it('should get active exceptions for a deployment', (done) => {
      const deploymentId = 'dep-123';
      const activeException: ExceptionDto = {
        ...mockException,
        status: ExceptionStatus.APPROVED
      };
      const mockActiveExceptions = [activeException];

      service.getActiveExceptions(deploymentId).subscribe(exceptions => {
        expect(exceptions.length).toBe(1);
        expect(exceptions[0].status).toBe(ExceptionStatus.APPROVED);
        expect(exceptions[0].id).toBe('exc-123');
        done();
      });

      const req = httpMock.expectOne(`/v1/exceptions/deployments/${deploymentId}/active`);
      expect(req.request.method).toBe('GET');
      req.flush(mockActiveExceptions);
    });

    it('should return empty array when no active exceptions exist', (done) => {
      const deploymentId = 'dep-123';

      service.getActiveExceptions(deploymentId).subscribe(exceptions => {
        expect(exceptions.length).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`/v1/exceptions/deployments/${deploymentId}/active`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('validateException', () => {
    it('should validate an exception request successfully', (done) => {
      const deploymentId = 'dep-123';
      const request: CreateExceptionRequest = {
        exceptionType: 'MISSING_DOCUMENTATION',
        justification: 'Documentation will be completed post-deployment',
        requestedBy: 'user-456'
      };
      const mockValidationResult: ExceptionValidationResult = {
        isApproved: true,
        message: 'Exception request is valid',
        validationErrors: [],
        validatedAt: new Date('2024-01-15T10:00:00Z')
      };

      service.validateException(deploymentId, request).subscribe(result => {
        expect(result.isApproved).toBe(true);
        expect(result.message).toBe('Exception request is valid');
        expect(result.validationErrors?.length).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`/v1/exceptions/deployments/${deploymentId}/validate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockValidationResult);
    });

    it('should return validation errors when exception is invalid', (done) => {
      const deploymentId = 'dep-123';
      const request: CreateExceptionRequest = {
        exceptionType: 'MISSING_DOCUMENTATION',
        justification: '',
        requestedBy: 'user-456'
      };
      const mockValidationResult: ExceptionValidationResult = {
        isApproved: false,
        message: 'Validation failed',
        validationErrors: ['Justification is required', 'Supporting evidence is missing'],
        alternativePaths: ['Complete documentation before deployment'],
        validatedAt: new Date('2024-01-15T10:00:00Z')
      };

      service.validateException(deploymentId, request).subscribe(result => {
        expect(result.isApproved).toBe(false);
        expect(result.validationErrors?.length).toBe(2);
        expect(result.alternativePaths?.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne(`/v1/exceptions/deployments/${deploymentId}/validate`);
      expect(req.request.method).toBe('POST');
      req.flush(mockValidationResult);
    });
  });

  describe('approveException', () => {
    it('should approve an exception request', (done) => {
      const exceptionId = 'exc-123';
      const request: ApproveExceptionRequest = {
        approverId: 'user-789',
        additionalRequirements: ['Complete documentation within 30 days']
      };
      const approvedException: ExceptionDto = {
        ...mockException,
        status: ExceptionStatus.APPROVED
      };

      service.approveException(exceptionId, request).subscribe(exception => {
        expect(exception.status).toBe(ExceptionStatus.APPROVED);
        expect(exception.id).toBe(exceptionId);
        done();
      });

      const req = httpMock.expectOne(`/v1/exceptions/${exceptionId}/approve`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(approvedException);
    });
  });

  describe('denyException', () => {
    it('should deny an exception request', (done) => {
      const exceptionId = 'exc-123';
      const request: DenyExceptionRequest = {
        approverId: 'user-789',
        denialReason: 'Insufficient justification provided'
      };
      const deniedException: ExceptionDto = {
        ...mockException,
        status: ExceptionStatus.DENIED
      };

      service.denyException(exceptionId, request).subscribe(exception => {
        expect(exception.status).toBe(ExceptionStatus.DENIED);
        expect(exception.id).toBe(exceptionId);
        done();
      });

      const req = httpMock.expectOne(`/v1/exceptions/${exceptionId}/deny`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(deniedException);
    });
  });
});
