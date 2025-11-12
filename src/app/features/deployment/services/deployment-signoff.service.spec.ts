import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DeploymentService } from './deployment.service';
import { SignOffType, SignOffStatus, SignOffRequest } from '../models/deployment.models';
import { local_environment } from '../../../../environments/environments';

describe('DeploymentService - Sign-Off Methods', () => {
  let service: DeploymentService;
  let httpMock: HttpTestingController;
  const baseUrl = `${local_environment.apiUrl}/deployments`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DeploymentService]
    });

    service = TestBed.inject(DeploymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding requests
  });

  describe('recordSignOff', () => {
    const deploymentId = 'deploy-123';
    const userId = 'user-123';
    
    const mockResponse: SignOffStatus = {
      deploymentId: 'deploy-123',
      deploymentName: 'Test Deployment',
      vendorSigned: true,
      vendorSignedBy: 'user-123',
      vendorSignerName: 'Test User',
      vendorSignedAt: '2024-01-01T00:00:00Z',
      deSigned: false,
      deSignedBy: undefined,
      deSignerName: undefined,
      deSignedAt: undefined,
      techSigned: false,
      techSignedBy: undefined,
      techSignerName: undefined,
      techSignedAt: undefined,
      isFullySignedOff: false,
      pendingSignOffFrom: 'Tech',
      completedSignOffs: ['Vendor'],
      pendingSignOffs: ['Tech', 'DE']
    };

    it('should record vendor sign-off', async () => {
      const promise = service.recordSignOff(deploymentId, SignOffType.Vendor, userId);

      const req = httpMock.expectOne(`${baseUrl}/${deploymentId}/signoff`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        deploymentId,
        userId,
        type: SignOffType.Vendor
      } as SignOffRequest);

      req.flush(mockResponse);

      const result = await promise;
      expect(result).toEqual(mockResponse);
      expect(result.vendorSigned).toBe(true);
      expect(result.vendorSignedBy).toBe(userId);
    });

    it('should record DE sign-off', async () => {
      const deResponse: SignOffStatus = {
        ...mockResponse,
        vendorSigned: true,
        techSigned: true,
        deSigned: true,
        deSignedBy: userId,
        deSignedAt: '2024-01-02T00:00:00Z',
        isFullySignedOff: true,
        pendingSignOffFrom: undefined,
        completedSignOffs: ['Vendor', 'Tech', 'DE'],
        pendingSignOffs: []
      };

      const promise = service.recordSignOff(deploymentId, SignOffType.DE, userId);

      const req = httpMock.expectOne(`${baseUrl}/${deploymentId}/signoff`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.type).toBe(SignOffType.DE);

      req.flush(deResponse);

      const result = await promise;
      expect(result.isFullySignedOff).toBe(true);
      expect(result.completedSignOffs).toEqual(['Vendor', 'Tech', 'DE']);
    });

    it('should record tech sign-off', async () => {
      const techResponse: SignOffStatus = {
        ...mockResponse,
        vendorSigned: true,
        techSigned: true,
        techSignedBy: userId,
        techSignedAt: '2024-01-02T00:00:00Z',
        pendingSignOffFrom: 'DE',
        completedSignOffs: ['Vendor', 'Tech'],
        pendingSignOffs: ['DE']
      };

      const promise = service.recordSignOff(deploymentId, SignOffType.Tech, userId);

      const req = httpMock.expectOne(`${baseUrl}/${deploymentId}/signoff`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.type).toBe(SignOffType.Tech);

      req.flush(techResponse);

      const result = await promise;
      expect(result.techSigned).toBe(true);
      expect(result.pendingSignOffFrom).toBe('DE');
    });

    it('should handle 400 Bad Request error', async () => {
      const promise = service.recordSignOff(deploymentId, SignOffType.Vendor, userId);

      const req = httpMock.expectOne(`${baseUrl}/${deploymentId}/signoff`);
      req.flush(
        { error: 'User is not an approved Vendor Representative' },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(promise).toBeRejected();
    });

    it('should handle 401 Unauthorized error', async () => {
      const promise = service.recordSignOff(deploymentId, SignOffType.DE, userId);

      const req = httpMock.expectOne(`${baseUrl}/${deploymentId}/signoff`);
      req.flush(
        { error: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' }
      );

      await expectAsync(promise).toBeRejected();
    });

    it('should handle 404 Not Found error', async () => {
      const promise = service.recordSignOff('nonexistent-id', SignOffType.Vendor, userId);

      const req = httpMock.expectOne(`${baseUrl}/nonexistent-id/signoff`);
      req.flush(
        { error: 'Deployment not found' },
        { status: 404, statusText: 'Not Found' }
      );

      await expectAsync(promise).toBeRejected();
    });

    it('should handle network error', async () => {
      const promise = service.recordSignOff(deploymentId, SignOffType.Vendor, userId);

      const req = httpMock.expectOne(`${baseUrl}/${deploymentId}/signoff`);
      req.error(new ProgressEvent('Network error'));

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('getSignOffStatus', () => {
    const deploymentId = 'deploy-123';

    const mockStatus: SignOffStatus = {
      deploymentId: 'deploy-123',
      deploymentName: 'Test Deployment',
      vendorSigned: true,
      vendorSignedBy: 'vendor-123',
      vendorSignerName: 'Vendor User',
      vendorSignedAt: '2024-01-01T00:00:00Z',
      deSigned: false,
      deSignedBy: undefined,
      deSignerName: undefined,
      deSignedAt: undefined,
      techSigned: true,
      techSignedBy: 'tech-123',
      techSignerName: 'Tech User',
      techSignedAt: '2024-01-02T00:00:00Z',
      isFullySignedOff: false,
      pendingSignOffFrom: 'DE',
      completedSignOffs: ['Vendor', 'Tech'],
      pendingSignOffs: ['DE']
    };

    it('should retrieve sign-off status', async () => {
      const promise = service.getSignOffStatus(deploymentId);

      const req = httpMock.expectOne(`${baseUrl}/${deploymentId}/signoffs`);
      expect(req.request.method).toBe('GET');

      req.flush(mockStatus);

      const result = await promise;
      expect(result).toEqual(mockStatus);
      expect(result.vendorSigned).toBe(true);
      expect(result.techSigned).toBe(true);
      expect(result.deSigned).toBe(false);
    });

    it('should retrieve fully signed off status', async () => {
      const fullySignedStatus: SignOffStatus = {
        ...mockStatus,
        deSigned: true,
        deSignedBy: 'de-123',
        deSignerName: 'DE User',
        deSignedAt: '2024-01-03T00:00:00Z',
        isFullySignedOff: true,
        pendingSignOffFrom: undefined,
        completedSignOffs: ['Vendor', 'Tech', 'DE'],
        pendingSignOffs: []
      };

      const promise = service.getSignOffStatus(deploymentId);

      const req = httpMock.expectOne(`${baseUrl}/${deploymentId}/signoffs`);
      req.flush(fullySignedStatus);

      const result = await promise;
      expect(result.isFullySignedOff).toBe(true);
      expect(result.completedSignOffs.length).toBe(3);
      expect(result.pendingSignOffs.length).toBe(0);
    });

    it('should retrieve status with no sign-offs', async () => {
      const noSignOffsStatus: SignOffStatus = {
        deploymentId: 'deploy-123',
        deploymentName: 'Test Deployment',
        vendorSigned: false,
        deSigned: false,
        techSigned: false,
        isFullySignedOff: false,
        pendingSignOffFrom: 'Vendor',
        completedSignOffs: [],
        pendingSignOffs: ['Vendor', 'Tech', 'DE']
      };

      const promise = service.getSignOffStatus(deploymentId);

      const req = httpMock.expectOne(`${baseUrl}/${deploymentId}/signoffs`);
      req.flush(noSignOffsStatus);

      const result = await promise;
      expect(result.isFullySignedOff).toBe(false);
      expect(result.completedSignOffs.length).toBe(0);
      expect(result.pendingSignOffs.length).toBe(3);
    });

    it('should handle 404 Not Found error', async () => {
      const promise = service.getSignOffStatus('nonexistent-id');

      const req = httpMock.expectOne(`${baseUrl}/nonexistent-id/signoffs`);
      req.flush(
        { error: 'Deployment not found' },
        { status: 404, statusText: 'Not Found' }
      );

      await expectAsync(promise).toBeRejected();
    });

    it('should handle network error', async () => {
      const promise = service.getSignOffStatus(deploymentId);

      const req = httpMock.expectOne(`${baseUrl}/${deploymentId}/signoffs`);
      req.error(new ProgressEvent('Network error'));

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle sequential sign-offs correctly', async () => {
      const deploymentId = 'deploy-123';

      // Step 1: Vendor signs off
      const vendorSignOffPromise = service.recordSignOff(deploymentId, SignOffType.Vendor, 'vendor-123');
      const vendorReq = httpMock.expectOne(`${baseUrl}/${deploymentId}/signoff`);
      vendorReq.flush({
        deploymentId,
        deploymentName: 'Test',
        vendorSigned: true,
        vendorSignedBy: 'vendor-123',
        techSigned: false,
        deSigned: false,
        isFullySignedOff: false,
        completedSignOffs: ['Vendor'],
        pendingSignOffs: ['Tech', 'DE']
      } as SignOffStatus);
      const vendorResult = await vendorSignOffPromise;
      expect(vendorResult.vendorSigned).toBe(true);

      // Step 2: Tech signs off
      const techSignOffPromise = service.recordSignOff(deploymentId, SignOffType.Tech, 'tech-123');
      const techReq = httpMock.expectOne(`${baseUrl}/${deploymentId}/signoff`);
      techReq.flush({
        deploymentId,
        deploymentName: 'Test',
        vendorSigned: true,
        vendorSignedBy: 'vendor-123',
        techSigned: true,
        techSignedBy: 'tech-123',
        deSigned: false,
        isFullySignedOff: false,
        completedSignOffs: ['Vendor', 'Tech'],
        pendingSignOffs: ['DE']
      } as SignOffStatus);
      const techResult = await techSignOffPromise;
      expect(techResult.techSigned).toBe(true);

      // Step 3: DE signs off (final)
      const deSignOffPromise = service.recordSignOff(deploymentId, SignOffType.DE, 'de-123');
      const deReq = httpMock.expectOne(`${baseUrl}/${deploymentId}/signoff`);
      deReq.flush({
        deploymentId,
        deploymentName: 'Test',
        vendorSigned: true,
        vendorSignedBy: 'vendor-123',
        techSigned: true,
        techSignedBy: 'tech-123',
        deSigned: true,
        deSignedBy: 'de-123',
        isFullySignedOff: true,
        completedSignOffs: ['Vendor', 'Tech', 'DE'],
        pendingSignOffs: []
      } as SignOffStatus);
      const deResult = await deSignOffPromise;
      expect(deResult.isFullySignedOff).toBe(true);
    });
  });
});

