import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TimeTrackingService } from './time-tracking.service';
import { TimeEntry } from '../models/time-entry.model';
import { TimeCategory, PayType, SyncStatus } from '../../../models/time-payroll.enum';
import { local_environment } from '../../../../environments/environments';

describe('TimeTrackingService', () => {
  let service: TimeTrackingService;
  let httpMock: HttpTestingController;
  const apiUrl = `${local_environment.apiUrl}/time-entries`;

  const mockRawResponse: any = {
    id: 'te-1',
    jobId: 'job-1',
    technicianId: 'tech-1',
    clockInTime: '2026-01-15T08:00:00Z',
    isManuallyAdjusted: false,
    isLocked: false,
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-01-15T08:00:00Z',
    timeCategory: 'OnSite',
    payType: 'Regular',
    syncStatus: 'Synced'
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

  // ─── Clock In Tests ────────────────────────────────────────────────

  it('should clock in without location', () => {
    service.clockIn('job-1', 'tech-1').subscribe(entry => {
      expect(entry.jobId).toBe('job-1');
      expect(entry.technicianId).toBe('tech-1');
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.jobId).toBe('job-1');
    expect(req.request.body.technicianId).toBe('tech-1');
    expect(req.request.body.timeCategory).toBe(TimeCategory.OnSite);
    req.flush(mockRawResponse);
  });

  it('should clock in with default timeCategory of OnSite', () => {
    service.clockIn('job-1', 'tech-1').subscribe(entry => {
      expect(entry.timeCategory).toBe(TimeCategory.OnSite);
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    expect(req.request.body.timeCategory).toBe(TimeCategory.OnSite);
    req.flush(mockRawResponse);
  });

  it('should clock in with explicit timeCategory DriveTime', () => {
    service.clockIn('job-1', 'tech-1', undefined, TimeCategory.DriveTime).subscribe(entry => {
      expect(entry.jobId).toBe('job-1');
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    expect(req.request.body.timeCategory).toBe(TimeCategory.DriveTime);
    req.flush({ ...mockRawResponse, timeCategory: 'DriveTime' });
  });

  it('should clock in with location and timeCategory', () => {
    const location = { latitude: 40.7128, longitude: -74.006, accuracy: 10 };

    service.clockIn('job-1', 'tech-1', location, TimeCategory.OnSite).subscribe(entry => {
      expect(entry.jobId).toBe('job-1');
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    expect(req.request.body.clockInLocation.latitude).toBe(40.7128);
    expect(req.request.body.clockInLocation.longitude).toBe(-74.006);
    expect(req.request.body.timeCategory).toBe(TimeCategory.OnSite);
    req.flush(mockRawResponse);
  });

  // ─── Clock Out Tests ───────────────────────────────────────────────

  it('should clock out without location', () => {
    const clockedOutResponse = {
      ...mockRawResponse,
      clockOutTime: '2026-01-15T16:00:00Z',
      totalHours: 8
    };

    service.clockOut('te-1').subscribe(entry => {
      expect(entry.clockOutTime).toBeTruthy();
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-out`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.timeEntryId).toBe('te-1');
    req.flush(clockedOutResponse);
  });

  it('should clock out with mileage', () => {
    const clockedOutResponse = {
      ...mockRawResponse,
      clockOutTime: '2026-01-15T16:00:00Z',
      totalHours: 8,
      mileage: 25.5
    };

    service.clockOut('te-1', undefined, 25.5).subscribe(entry => {
      expect(entry.mileage).toBe(25.5);
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-out`);
    expect(req.request.body.mileage).toBe(25.5);
    req.flush(clockedOutResponse);
  });

  // ─── Get Time Entries Tests ────────────────────────────────────────

  it('should get time entries with filters', () => {
    service.getTimeEntries({ technicianId: 'tech-1' }).subscribe(entries => {
      expect(entries.length).toBe(1);
      expect(entries[0].jobId).toBe('job-1');
    });

    const req = httpMock.expectOne(r => r.url === apiUrl && r.params.get('technicianId') === 'tech-1');
    expect(req.request.method).toBe('GET');
    req.flush([mockRawResponse]);
  });

  it('should get active time entry for a technician', () => {
    service.getActiveTimeEntry('tech-1').subscribe(entry => {
      expect(entry).toBeTruthy();
      expect(entry!.jobId).toBe('job-1');
    });

    const req = httpMock.expectOne(r => r.url === `${apiUrl}/active` && r.params.get('technicianId') === 'tech-1');
    expect(req.request.method).toBe('GET');
    req.flush(mockRawResponse);
  });

  // ─── Update Time Entry Tests ───────────────────────────────────────

  it('should update a time entry with mileage', () => {
    const updatedResponse = { ...mockRawResponse, mileage: 30 };

    service.updateTimeEntry('te-1', { mileage: 30 }).subscribe(entry => {
      expect(entry.mileage).toBe(30);
    });

    const req = httpMock.expectOne(`${apiUrl}/te-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.mileage).toBe(30);
    req.flush(updatedResponse);
  });

  it('should include timeCategory in update payload', () => {
    const updatedResponse = { ...mockRawResponse, timeCategory: 'DriveTime' };

    service.updateTimeEntry('te-1', { timeCategory: TimeCategory.DriveTime }).subscribe(entry => {
      expect(entry.timeCategory).toBe(TimeCategory.DriveTime);
    });

    const req = httpMock.expectOne(`${apiUrl}/te-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.timeCategory).toBe(TimeCategory.DriveTime);
    req.flush(updatedResponse);
  });

  it('should not include timeCategory in update payload when not provided', () => {
    service.updateTimeEntry('te-1', { mileage: 10 }).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/te-1`);
    expect(req.request.body.timeCategory).toBeUndefined();
    req.flush(mockRawResponse);
  });

  // ─── mapResponse Tests ─────────────────────────────────────────────

  it('should map timeCategory from API response', () => {
    service.clockIn('job-1', 'tech-1').subscribe(entry => {
      expect(entry.timeCategory).toBe(TimeCategory.DriveTime);
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    req.flush({ ...mockRawResponse, timeCategory: 'DriveTime' });
  });

  it('should map payType from API response', () => {
    service.clockIn('job-1', 'tech-1').subscribe(entry => {
      expect(entry.payType).toBe(PayType.Holiday);
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    req.flush({ ...mockRawResponse, payType: 'Holiday' });
  });

  it('should map syncStatus from API response', () => {
    service.clockIn('job-1', 'tech-1').subscribe(entry => {
      expect(entry.syncStatus).toBe(SyncStatus.Pending);
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    req.flush({ ...mockRawResponse, syncStatus: 'Pending' });
  });

  it('should default timeCategory to OnSite when not in response', () => {
    const responseWithoutCategory = { ...mockRawResponse };
    delete responseWithoutCategory.timeCategory;

    service.clockIn('job-1', 'tech-1').subscribe(entry => {
      expect(entry.timeCategory).toBe(TimeCategory.OnSite);
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    req.flush(responseWithoutCategory);
  });

  it('should default payType to Regular when not in response', () => {
    const responseWithoutPayType = { ...mockRawResponse };
    delete responseWithoutPayType.payType;

    service.clockIn('job-1', 'tech-1').subscribe(entry => {
      expect(entry.payType).toBe(PayType.Regular);
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    req.flush(responseWithoutPayType);
  });

  it('should default syncStatus to Synced when not in response', () => {
    const responseWithoutSync = { ...mockRawResponse };
    delete responseWithoutSync.syncStatus;

    service.clockIn('job-1', 'tech-1').subscribe(entry => {
      expect(entry.syncStatus).toBe(SyncStatus.Synced);
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    req.flush(responseWithoutSync);
  });

  it('should map PascalCase fields from .NET backend', () => {
    const pascalResponse = {
      Id: 'te-2',
      JobId: 'job-2',
      TechnicianId: 'tech-2',
      ClockInTime: '2026-01-15T08:00:00Z',
      IsManuallyAdjusted: false,
      CreatedAt: '2026-01-15T08:00:00Z',
      UpdatedAt: '2026-01-15T08:00:00Z',
      TimeCategory: 'DriveTime',
      PayType: 'Overtime',
      SyncStatus: 'Failed'
    };

    service.clockIn('job-2', 'tech-2').subscribe(entry => {
      expect(entry.id).toBe('te-2');
      expect(entry.timeCategory).toBe(TimeCategory.DriveTime);
      expect(entry.payType).toBe(PayType.Overtime);
      expect(entry.syncStatus).toBe(SyncStatus.Failed);
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    req.flush(pascalResponse);
  });

  // ─── Error Handling Tests ──────────────────────────────────────────

  it('should handle clock-in 400 error', () => {
    service.clockIn('job-1', 'tech-1').subscribe({
      error: (err) => {
        expect(err.message).toContain('Invalid time entry data');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
  });

  it('should handle clock-out 500 error', () => {
    service.clockOut('te-1').subscribe({
      error: (err) => {
        expect(err.message).toContain('Server error');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-out`);
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should handle 409 conflict on clock-in', () => {
    service.clockIn('job-1', 'tech-1').subscribe({
      error: (err) => {
        expect(err.message).toContain('conflict');
      }
    });

    const req = httpMock.expectOne(`${apiUrl}/clock-in`);
    req.flush('Conflict', { status: 409, statusText: 'Conflict' });
  });
});
