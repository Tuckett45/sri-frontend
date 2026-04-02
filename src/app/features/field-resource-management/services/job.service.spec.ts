import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { JobService, StatusHistory } from './job.service';
import { 
  Job, 
  JobStatus, 
  JobType, 
  Priority, 
  JobNote, 
  Attachment,
  Address,
  ContactInfo
} from '../models/job.model';
import { 
  CreateJobDto, 
  UpdateJobDto, 
  JobFilters 
} from '../models/dtos';
import { Skill } from '../models/technician.model';

describe('JobService', () => {
  let service: JobService;
  let httpMock: HttpTestingController;

  const mockAddress: Address = {
    street: '123 Main St',
    city: 'Dallas',
    state: 'TX',
    zipCode: '75201',
    latitude: 32.7767,
    longitude: -96.7970
  };

  const mockContactInfo: ContactInfo = {
    name: 'John Customer',
    phone: '555-0100',
    email: 'john.customer@example.com'
  };

  const mockJob: Job = {
    id: 'job-123',
    jobId: 'J-001',
    client: 'Acme Corp',
    siteName: 'Downtown Office',
    siteAddress: mockAddress,
    jobType: JobType.Install,
    priority: Priority.Normal,
    status: JobStatus.NotStarted,
    scopeDescription: 'Install fiber optic cables',
    requiredSkills: [],
    requiredCrewSize: 2,
    estimatedLaborHours: 8,
    scheduledStartDate: new Date('2024-01-15T08:00:00'),
    scheduledEndDate: new Date('2024-01-15T17:00:00'),
    customerPOC: mockContactInfo,
    attachments: [],
    notes: [],
    market: 'DALLAS',
    company: 'ACME_CORP',
    createdBy: 'user-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        JobService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(JobService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getJobs', () => {
    it('should retrieve jobs without filters', () => {
      const mockJobs = [mockJob];

      service.getJobs().subscribe(jobs => {
        expect(jobs).toEqual(mockJobs);
        expect(jobs.length).toBe(1);
      });

      const req = httpMock.expectOne('/api/jobs');
      expect(req.request.method).toBe('GET');
      req.flush(mockJobs);
    });

    it('should retrieve jobs with all filters', () => {
      const filters: JobFilters = {
        searchTerm: 'fiber',
        status: JobStatus.NotStarted,
        priority: Priority.P1,
        jobType: JobType.Install,
        client: 'Acme Corp',
        technicianId: 'tech-123',
        region: 'TX',
        market: 'DALLAS',
        company: 'ACME_CORP',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        page: 1,
        pageSize: 10
      };

      service.getJobs(filters).subscribe();

      const req = httpMock.expectOne(request => 
        request.url === '/api/jobs' && 
        request.params.get('searchTerm') === 'fiber' &&
        request.params.get('status') === JobStatus.NotStarted &&
        request.params.get('priority') === Priority.P1 &&
        request.params.get('jobType') === JobType.Install &&
        request.params.get('client') === 'Acme Corp' &&
        request.params.get('technicianId') === 'tech-123' &&
        request.params.get('region') === 'TX' &&
        request.params.get('market') === 'DALLAS' &&
        request.params.get('company') === 'ACME_CORP' &&
        request.params.has('startDate') &&
        request.params.has('endDate') &&
        request.params.get('page') === '1' &&
        request.params.get('pageSize') === '10'
      );
      expect(req.request.method).toBe('GET');
      req.flush([mockJob]);
    });

    it('should retrieve jobs with dateRange filter', () => {
      const filters: JobFilters = {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        }
      };

      service.getJobs(filters).subscribe();

      const req = httpMock.expectOne(request => 
        request.url === '/api/jobs' && 
        request.params.has('startDate') &&
        request.params.has('endDate')
      );
      req.flush([mockJob]);
    });

    it('should retry on failure', () => {
      let callCount = 0;

      service.getJobs().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(callCount).toBe(3); // Initial + 2 retries
          expect(error.message).toContain('Server error');
        }
      });

      // Expect 3 requests (initial + 2 retries)
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs');
        callCount++;
        req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      }
    });
  });

  describe('getJobById', () => {
    it('should retrieve a job by ID', () => {
      service.getJobById('job-123').subscribe(job => {
        expect(job).toEqual(mockJob);
        expect(job.id).toBe('job-123');
      });

      const req = httpMock.expectOne('/api/jobs/job-123');
      expect(req.request.method).toBe('GET');
      req.flush(mockJob);
    });

    it('should handle 404 error when job not found', () => {
      service.getJobById('invalid-id').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Job not found');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/invalid-id');
      }        req.flush('Not found', { status: 404, statusText: 'Not Found' });
      }
    });

    it('should retry on failure', () => {
      let callCount = 0;

      service.getJobById('job-123').subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(callCount).toBe(3);
        }
      });

      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123');
        callCount++;
        req.flush('Error', { status: 500, statusText: 'Internal Server Error' });
      }
    });
  });

  describe('createJob', () => {
    const validCreateDto: CreateJobDto = {
      client: 'New Client',
      siteName: 'New Site',
      siteAddress: mockAddress,
      jobType: JobType.Install,
      priority: Priority.Normal,
      scopeDescription: 'Install new equipment',
      requiredSkills: [],
      requiredCrewSize: 2,
      estimatedLaborHours: 8,
      scheduledStartDate: new Date('2024-02-01T08:00:00'),
      scheduledEndDate: new Date('2024-02-01T17:00:00'),
      customerPOC: mockContactInfo,
      authorizationStatus: 'authorized',
      hasPurchaseOrders: false,
      standardBillRate: 75,
      overtimeBillRate: 112.5,
      perDiem: 50,
      invoicingProcess: 'weekly',
      projectDirector: 'Director',
      targetResources: 5,
      bizDevContact: 'BizDev',
      requestedHours: 160,
      overtimeRequired: false,
    };

    it('should create a job with valid data', () => {
      service.createJob(validCreateDto).subscribe(job => {
        expect(job.client).toBe('New Client');
        expect(job.siteName).toBe('New Site');
      });

      const req = httpMock.expectOne('/api/jobs');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(validCreateDto);
      req.flush({ ...mockJob, ...validCreateDto });
    });

    it('should handle 400 error for invalid data', () => {
      service.createJob(validCreateDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid request');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs');
      }        req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
      }
    });

    it('should handle 409 conflict error', () => {
      service.createJob(validCreateDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Conflict');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs');
      }        req.flush('Conflict', { status: 409, statusText: 'Conflict' });
      }
    });
  });

  describe('updateJob', () => {
    const updateDto: UpdateJobDto = {
      status: JobStatus.OnSite,
      actualStartDate: new Date('2024-01-15T08:30:00')
    };

    it('should update a job', () => {
      service.updateJob('job-123', updateDto).subscribe(job => {
        expect(job.status).toBe(JobStatus.OnSite);
      });

      const req = httpMock.expectOne('/api/jobs/job-123');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateDto);
      req.flush({ ...mockJob, ...updateDto });
    });

    it('should handle 404 error when job not found', () => {
      service.updateJob('invalid-id', updateDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Job not found');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/invalid-id');
      }        req.flush('Not found', { status: 404, statusText: 'Not Found' });
      }
    });
  });

  describe('deleteJob', () => {
    it('should delete a single job', () => {
      service.deleteJob('job-123').subscribe(() => {
        expect(true).toBe(true);
      });

      const req = httpMock.expectOne('/api/jobs/job-123');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle 404 error when job not found', () => {
      service.deleteJob('invalid-id').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Job not found');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/invalid-id');
      }        req.flush('Not found', { status: 404, statusText: 'Not Found' });
      }
    });
  });

  describe('deleteJobs', () => {
    it('should delete multiple jobs', () => {
      const jobIds = ['job-123', 'job-456', 'job-789'];

      service.deleteJobs(jobIds).subscribe(() => {
        expect(true).toBe(true);
      });

      const req = httpMock.expectOne('/api/jobs');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toEqual({ ids: jobIds });
      req.flush(null);
    });

    it('should handle empty array', () => {
      service.deleteJobs([]).subscribe(() => {
        expect(true).toBe(true);
      });

      const req = httpMock.expectOne('/api/jobs');
      expect(req.request.body).toEqual({ ids: [] });
      req.flush(null);
    });
  });

  describe('getJobsByTechnician', () => {
    it('should retrieve jobs for a technician without date range', () => {
      const mockJobs = [mockJob];

      service.getJobsByTechnician('tech-123').subscribe(jobs => {
        expect(jobs).toEqual(mockJobs);
      });

      const req = httpMock.expectOne(request => 
        request.url === '/api/jobs/by-technician' &&
        request.params.get('technicianId') === 'tech-123'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockJobs);
    });

    it('should retrieve jobs for a technician with date range', () => {
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      service.getJobsByTechnician('tech-123', dateRange).subscribe();

      const req = httpMock.expectOne(request => 
        request.url === '/api/jobs/by-technician' &&
        request.params.get('technicianId') === 'tech-123' &&
        request.params.has('startDate') &&
        request.params.has('endDate')
      );
      req.flush([mockJob]);
    });

    it('should retry on failure', () => {
      let callCount = 0;

      service.getJobsByTechnician('tech-123').subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(callCount).toBe(3);
        }
      });

      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne(request => 
          request.url === '/api/jobs/by-technician'
        );
        callCount++;
        req.flush('Error', { status: 500, statusText: 'Internal Server Error' });
      }
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status without reason', () => {
      service.updateJobStatus('job-123', JobStatus.OnSite).subscribe(job => {
        expect(job.status).toBe(JobStatus.OnSite);
      });

      const req = httpMock.expectOne('/api/jobs/job-123/status');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: JobStatus.OnSite, reason: undefined });
      req.flush({ ...mockJob, status: JobStatus.OnSite });
    });

    it('should update job status with reason', () => {
      const reason = 'Equipment malfunction';

      service.updateJobStatus('job-123', JobStatus.Issue, reason).subscribe(job => {
        expect(job.status).toBe(JobStatus.Issue);
      });

      const req = httpMock.expectOne('/api/jobs/job-123/status');
      expect(req.request.body).toEqual({ status: JobStatus.Issue, reason });
      req.flush({ ...mockJob, status: JobStatus.Issue });
    });

    it('should handle 404 error when job not found', () => {
      service.updateJobStatus('invalid-id', JobStatus.Completed).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Job not found');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/invalid-id/status');
      }        req.flush('Not found', { status: 404, statusText: 'Not Found' });
      }
    });
  });

  describe('getJobStatusHistory', () => {
    it('should retrieve job status history', () => {
      const mockHistory: StatusHistory[] = [
        {
          id: 'history-1',
          jobId: 'job-123',
          status: JobStatus.NotStarted,
          changedBy: 'user-123',
          changedAt: new Date('2024-01-01T08:00:00')
        },
        {
          id: 'history-2',
          jobId: 'job-123',
          status: JobStatus.EnRoute,
          changedBy: 'tech-456',
          changedAt: new Date('2024-01-15T07:30:00')
        }
      ];

      service.getJobStatusHistory('job-123').subscribe(history => {
        expect(history).toEqual(mockHistory);
        expect(history.length).toBe(2);
      });

      const req = httpMock.expectOne('/api/jobs/job-123/status-history');
      expect(req.request.method).toBe('GET');
      req.flush(mockHistory);
    });

    it('should retry on failure', () => {
      let callCount = 0;

      service.getJobStatusHistory('job-123').subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(callCount).toBe(3);
        }
      });

      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123/status-history');
        callCount++;
        req.flush('Error', { status: 500, statusText: 'Internal Server Error' });
      }
    });
  });

  describe('addJobNote', () => {
    it('should add a note to a job', () => {
      const noteText = 'Customer requested additional work';
      const mockNote: JobNote = {
        id: 'note-123',
        jobId: 'job-123',
        text: noteText,
        author: 'user-123',
        createdAt: new Date()
      };

      service.addJobNote('job-123', noteText).subscribe(note => {
        expect(note).toEqual(mockNote);
        expect(note.text).toBe(noteText);
      });

      const req = httpMock.expectOne('/api/jobs/job-123/notes');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ text: noteText });
      req.flush(mockNote);
    });

    it('should handle 404 error when job not found', () => {
      service.addJobNote('invalid-id', 'Note text').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Job not found');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/invalid-id/notes');
      }        req.flush('Not found', { status: 404, statusText: 'Not Found' });
      }
    });
  });

  describe('getJobNotes', () => {
    it('should retrieve all notes for a job', () => {
      const mockNotes: JobNote[] = [
        {
          id: 'note-1',
          jobId: 'job-123',
          text: 'First note',
          author: 'user-123',
          createdAt: new Date('2024-01-01')
        },
        {
          id: 'note-2',
          jobId: 'job-123',
          text: 'Second note',
          author: 'user-456',
          createdAt: new Date('2024-01-02')
        }
      ];

      service.getJobNotes('job-123').subscribe(notes => {
        expect(notes).toEqual(mockNotes);
        expect(notes.length).toBe(2);
      });

      const req = httpMock.expectOne('/api/jobs/job-123/notes');
      expect(req.request.method).toBe('GET');
      req.flush(mockNotes);
    });

    it('should retry on failure', () => {
      let callCount = 0;

      service.getJobNotes('job-123').subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(callCount).toBe(3);
        }
      });

      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123/notes');
        callCount++;
        req.flush('Error', { status: 500, statusText: 'Internal Server Error' });
      }
    });
  });

  describe('uploadJobAttachment', () => {
    it('should upload an attachment with progress tracking', () => {
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const mockAttachment: Attachment = {
        id: 'attach-123',
        fileName: 'test.jpg',
        fileSize: 1024,
        fileType: 'image/jpeg',
        blobUrl: 'https://example.com/test.jpg',
        uploadedBy: 'user-123',
        uploadedAt: new Date()
      };

      service.uploadJobAttachment('job-123', mockFile).subscribe(event => {
        // Test will receive HTTP events
      });

      const req = httpMock.expectOne('/api/jobs/job-123/attachments');
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockAttachment);
    });

    it('should handle 413 error for file too large', () => {
      const mockFile = new File(['content'], 'large.jpg', { type: 'image/jpeg' });

      service.uploadJobAttachment('job-123', mockFile).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('File too large');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123/attachments');
      }        req.flush('File too large', { status: 413, statusText: 'Payload Too Large' });
      }
    });

    it('should handle 415 error for unsupported file type', () => {
      const mockFile = new File(['content'], 'test.exe', { type: 'application/exe' });

      service.uploadJobAttachment('job-123', mockFile).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Unsupported file type');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123/attachments');
      }        req.flush('Unsupported', { status: 415, statusText: 'Unsupported Media Type' });
      }
    });
  });

  describe('getJobAttachments', () => {
    it('should retrieve all attachments for a job', () => {
      const mockAttachments: Attachment[] = [
        {
          id: 'attach-1',
          fileName: 'photo1.jpg',
          fileSize: 2048,
          fileType: 'image/jpeg',
          blobUrl: 'https://example.com/photo1.jpg',
          uploadedBy: 'user-123',
          uploadedAt: new Date('2024-01-01')
        },
        {
          id: 'attach-2',
          fileName: 'photo2.jpg',
          fileSize: 3072,
          fileType: 'image/jpeg',
          blobUrl: 'https://example.com/photo2.jpg',
          uploadedBy: 'user-456',
          uploadedAt: new Date('2024-01-02')
        }
      ];

      service.getJobAttachments('job-123').subscribe(attachments => {
        expect(attachments).toEqual(mockAttachments);
        expect(attachments.length).toBe(2);
      });

      const req = httpMock.expectOne('/api/jobs/job-123/attachments');
      expect(req.request.method).toBe('GET');
      req.flush(mockAttachments);
    });

    it('should retry on failure', () => {
      let callCount = 0;

      service.getJobAttachments('job-123').subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(callCount).toBe(3);
        }
      });

      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123/attachments');
        callCount++;
        req.flush('Error', { status: 500, statusText: 'Internal Server Error' });
      }
    });
  });

  describe('createJobFromTemplate', () => {
    it('should create a job from a template', () => {
      const templateId = 'template-123';

      service.createJobFromTemplate(templateId).subscribe(job => {
        expect(job).toEqual(mockJob);
      });

      const req = httpMock.expectOne(`/api/jobs/from-template/${templateId}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockJob);
    });

    it('should handle 404 error when template not found', () => {
      service.createJobFromTemplate('invalid-template').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Job not found');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/from-template/invalid-template');
      }        req.flush('Not found', { status: 404, statusText: 'Not Found' });
      }
    });
  });

  describe('handleError', () => {
    it('should handle 400 Bad Request error', () => {
      service.getJobById('job-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid request');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123');
      }        req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
      }
    });

    it('should handle 401 Unauthorized error', () => {
      service.getJobById('job-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Unauthorized');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123');
      }        req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      }
    });

    it('should handle 403 Forbidden error', () => {
      service.getJobById('job-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Access denied');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123');
      }        req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      }
    });

    it('should handle 404 Not Found error', () => {
      service.getJobById('job-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Job not found');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123');
      }        req.flush('Not found', { status: 404, statusText: 'Not Found' });
      }
    });

    it('should handle 409 Conflict error', () => {
      const createDto: CreateJobDto = {
        client: 'Test Client',
        siteName: 'Test Site',
        siteAddress: mockAddress,
        jobType: JobType.Install,
        priority: Priority.Normal,
        scopeDescription: 'Test',
        requiredSkills: [],
        requiredCrewSize: 1,
        estimatedLaborHours: 4,
        scheduledStartDate: new Date(),
        scheduledEndDate: new Date(),
        authorizationStatus: 'pending',
        hasPurchaseOrders: false,
        standardBillRate: 50,
        overtimeBillRate: 75,
        perDiem: 0,
        invoicingProcess: 'monthly',
        projectDirector: 'Director',
        targetResources: 1,
        bizDevContact: 'Contact',
        requestedHours: 40,
        overtimeRequired: false,
      };

      service.createJob(createDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Conflict');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs');
      }        req.flush('Conflict', { status: 409, statusText: 'Conflict' });
      }
    });

    it('should handle 413 Payload Too Large error', () => {
      const mockFile = new File(['content'], 'large.jpg', { type: 'image/jpeg' });

      service.uploadJobAttachment('job-123', mockFile).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('File too large');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123/attachments');
      }        req.flush('Too large', { status: 413, statusText: 'Payload Too Large' });
      }
    });

    it('should handle 415 Unsupported Media Type error', () => {
      const mockFile = new File(['content'], 'test.exe', { type: 'application/exe' });

      service.uploadJobAttachment('job-123', mockFile).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Unsupported file type');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123/attachments');
      }        req.flush('Unsupported', { status: 415, statusText: 'Unsupported Media Type' });
      }
    });

    it('should handle 500 Internal Server Error', () => {
      service.getJobById('job-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Server error');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123');
      }        req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      }
    });

    it('should handle client-side errors', () => {
      service.getJobById('job-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Error');
        }
      });

      // Flush the initial request plus all retries
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/jobs/job-123');
      requests.forEach(req => req.error(new ProgressEvent('error', { loaded: 0, total: 0 })));
    });
  });
});
