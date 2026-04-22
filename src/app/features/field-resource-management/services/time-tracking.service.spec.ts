import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TimeTrackingService } from './time-tracking.service';
import { TimeEntry } from '../models/time-entry.model';
import { environment } from '../../../../environments/environments';

describe('TimeTrackingService', () => {
  let service: TimeTrackingService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/time-entries`;

  const mockTimeEntry: TimeEntry = {
    id: 'te-1',
    jobId: 'job-1',
    technicianId: 'tech-1',
    clockInTime: new Date('2026-01-15T08:00:00Z'),
    isManuallyAdjusted: false,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TimeTrackingService]
    });

    service = TestBed.inject(TimeTrackingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should clock in without location capture', () => {
    service.clockIn('job-1', 'tech-1', false).subscribe(entry => {
      expect(entry.jobId).toBe('job-1');
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.jobId).toBe('job-1');
    expect(req.request.body.technicianId).toBe('tech-1');
    req.flush(mockTimeEntry);
  });

  it('should clock out without location capture', () => {
    const clockedOutEntry = {
      ...mockTimeEntry,
      clockOutTime: new Date('2026-01-15T16:00:00Z'),
      totalHours: 8
    };

    service.clockOut('te-1', false).subscribe(entry => {
      expect(entry.clockOutTime).toBeTruthy();
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-out`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.timeEntryId).toBe('te-1');
    req.flush(clockedOutEntry);
  });

  it('should clock out with manual mileage', () => {
    const clockedOutEntry = {
      ...mockTimeEntry,
      clockOutTime: new Date('2026-01-15T16:00:00Z'),
      totalHours: 8,
      mileage: 25.5
    };

    service.clockOut('te-1', false, 25.5).subscribe(entry => {
      expect(entry.mileage).toBe(25.5);
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-out`);
    expect(req.request.body.mileage).toBe(25.5);
    req.flush(clockedOutEntry);
  });

  it('should get time entries with filters', () => {
    service.getTimeEntries({ technicianId: 'tech-1' }).subscribe(entries => {
      expect(entries).toEqual([mockTimeEntry]);
    });

    const req = httpMock.expectOne(r => r.url === apiUrl && r.params.get('technicianId') === 'tech-1');
    expect(req.request.method).toBe('GET');
    req.flush([mockTimeEntry]);
  });

  it('should get active time entry for a technician', () => {
    service.getActiveTimeEntry('tech-1').subscribe(entry => {
      expect(entry).toEqual(mockTimeEntry);
    });

    const req = httpMock.expectOne(r => r.url === `${apiUrl}/active` && r.params.get('technicianId') === 'tech-1');
    expect(req.request.method).toBe('GET');
    req.flush(mockTimeEntry);
  });

  it('should update a time entry', () => {
    const updated = { ...mockTimeEntry, mileage: 30 };

    service.updateTimeEntry('te-1', { mileage: 30 }).subscribe(entry => {
      expect(entry.mileage).toBe(30);
    });

    const req = httpMock.expectOne(`${apiUrl}/te-1`);
    expect(req.request.method).toBe('PUT');
    req.flush(updated);
  });

  it('should handle clock-in server error', () => {
    service.clockIn('job-1', 'tech-1', false).subscribe({
      error: (err) => {
        expect(err.message).toContain('Invalid request');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
  });

  it('should handle clock-out server error', () => {
    service.clockOut('te-1', false).subscribe({
      error: (err) => {
        expect(err.message).toContain('Server error');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-out`);
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should handle 409 conflict on clock-in', () => {
    service.clockIn('job-1', 'tech-1', false).subscribe({
      error: (err) => {
        expect(err.message).toContain('already clocked in');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    req.flush('Conflict', { status: 409, statusText: 'Conflict' });
  });

  it('should get time entries by job', () => {
    service.getTimeEntriesByJob('job-1').subscribe(entries => {
      expect(entries.length).toBe(1);
      expect(entries[0].jobId).toBe('job-1');
    });

    const req = httpMock.expectOne(`${apiUrl}/by-job/job-1`);
    expect(req.request.method).toBe('GET');
    req.flush([mockTimeEntry]);
  });

  it('should calculate labor hours for a job', () => {
    const summary = {
      jobId: 'job-1',
      totalHours: 16,
      totalMileage: 50,
      technicianCount: 2,
      estimatedHours: 20,
      variance: -4
    };

    service.calculateLaborHours('job-1').subscribe(result => {
      expect(result.totalHours).toBe(16);
      expect(result.technicianCount).toBe(2);
    });

    const req = httpMock.expectOne(`${apiUrl}/labor-summary/job-1`);
    expect(req.request.method).toBe('GET');
    req.flush(summary);
  });
});
