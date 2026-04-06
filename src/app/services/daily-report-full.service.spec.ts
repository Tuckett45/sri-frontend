import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { DailyReportService } from './daily-report.service';
import { AuthService } from './auth.service';
import {
  DailyReport,
  DailyReportSubmissionStatus,
  UserSubmissionStatus,
} from '../models/daily-report.model';

const MOCK_API_URL = 'https://sri-api.azurewebsites.net/api';

describe('DailyReportService – full coverage', () => {
  let service: DailyReportService;
  let http: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const MOCK_TOKEN = 'mock-token';
  const MOCK_USER_ID = 'user-1';

  /** A minimal valid DailyReport object */
  function makeReport(overrides: Partial<DailyReport> = {}): DailyReport {
    return {
      userId: MOCK_USER_ID,
      segmentId: 'SEG-001',
      currentLocation: 'Site A',
      descriptionOfWork: 'Grading',
      forwardProductionCompleted: 'Yes',
      safetyConcerns: 'None',
      incidentDelayConcerns: 'None',
      nextStepsAndFollowUp: 'Continue tomorrow',
      ...overrides,
    };
  }

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getUser',
      'getAccessToken',
    ]);
    authServiceSpy.getUser.and.returnValue({ id: MOCK_USER_ID } as any);
    authServiceSpy.getAccessToken.and.resolveTo(MOCK_TOKEN);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DailyReportService,
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(DailyReportService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ─── helpers ──────────────────────────────────────────────────────────────

  function flushGet<T>(expectedUrl: string, body: T): void {
    const req = http.expectOne((r) => r.urlWithParams === expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush(body);
  }

  function flushPost<T>(expectedUrl: string, body: T): void {
    const req = http.expectOne((r) => r.url === expectedUrl);
    expect(req.request.method).toBe('POST');
    req.flush(body);
  }

  function flushPut<T>(expectedUrl: string, body: T): void {
    const req = http.expectOne((r) => r.url === expectedUrl);
    expect(req.request.method).toBe('PUT');
    req.flush(body);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // getMyDailyReport
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getMyDailyReport', () => {
    it('hits the /my endpoint with no date by default', (done) => {
      service.getMyDailyReport().subscribe(() => done());
      flushGet(`${MOCK_API_URL}/dailyreport/my`, makeReport());
    });

    it('appends date query param when date is provided', (done) => {
      const date = new Date('2025-06-15T00:00:00.000Z');
      service.getMyDailyReport(date).subscribe(() => done());
      flushGet(
        `${MOCK_API_URL}/dailyreport/my?date=${date.toISOString()}`,
        makeReport()
      );
    });

    it('converts submittedDate string to Date object', (done) => {
      const rawDate = '2025-06-15T08:00:00.000Z';
      service.getMyDailyReport().subscribe((report) => {
        expect(report?.submittedDate).toEqual(new Date(rawDate));
        done();
      });
      http
        .expectOne((r) => r.url === `${MOCK_API_URL}/dailyreport/my`)
        .flush({ ...makeReport(), submittedDate: rawDate });
    });

    it('converts validatedDate string to Date object', (done) => {
      const rawDate = '2025-06-16T09:00:00.000Z';
      service.getMyDailyReport().subscribe((report) => {
        expect(report?.validatedDate).toEqual(new Date(rawDate));
        done();
      });
      http
        .expectOne((r) => r.url === `${MOCK_API_URL}/dailyreport/my`)
        .flush({ ...makeReport(), validatedDate: rawDate });
    });

    it('returns null on 404', (done) => {
      service.getMyDailyReport().subscribe((report) => {
        expect(report).toBeNull();
        done();
      });
      http
        .expectOne((r) => r.url === `${MOCK_API_URL}/dailyreport/my`)
        .flush('Not found', { status: 404, statusText: 'Not Found' });
    });

    it('sends Authorization header with Bearer token', (done) => {
      service.getMyDailyReport().subscribe(() => done());
      const req = http.expectOne((r) => r.url === `${MOCK_API_URL}/dailyreport/my`);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${MOCK_TOKEN}`);
      req.flush(makeReport());
    });

    it('sends X-User-Id header', (done) => {
      service.getMyDailyReport().subscribe(() => done());
      const req = http.expectOne((r) => r.url === `${MOCK_API_URL}/dailyreport/my`);
      expect(req.request.headers.get('X-User-Id')).toBe(MOCK_USER_ID);
      req.flush(makeReport());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // submitDailyReport
  // ═══════════════════════════════════════════════════════════════════════════

  describe('submitDailyReport', () => {
    it('POSTs to the base dailyreport URL', (done) => {
      service.submitDailyReport(makeReport()).subscribe(() => done());
      flushPost(`${MOCK_API_URL}/dailyreport`, { message: 'ok', reportId: 1 });
    });

    it('sends the report body as JSON', (done) => {
      const report = makeReport({ segmentId: 'SEG-XYZ' });
      service.submitDailyReport(report).subscribe(() => done());
      const req = http.expectOne((r) => r.url === `${MOCK_API_URL}/dailyreport`);
      expect(req.request.body.segmentId).toBe('SEG-XYZ');
      req.flush({ message: 'ok', reportId: 1 });
    });

    it('returns message and reportId from server response', (done) => {
      service.submitDailyReport(makeReport()).subscribe((resp) => {
        expect(resp.message).toBe('Daily report submitted successfully');
        expect(resp.reportId).toBe(42);
        done();
      });
      flushPost(`${MOCK_API_URL}/dailyreport`, {
        message: 'Daily report submitted successfully',
        reportId: 42,
      });
    });

    it('sends Authorization header', (done) => {
      service.submitDailyReport(makeReport()).subscribe(() => done());
      const req = http.expectOne((r) => r.url === `${MOCK_API_URL}/dailyreport`);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${MOCK_TOKEN}`);
      req.flush({ message: 'ok', reportId: 1 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getSubmissionStatus
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getSubmissionStatus', () => {
    it('hits the /submission-status endpoint', (done) => {
      service.getSubmissionStatus().subscribe(() => done());
      flushGet(`${MOCK_API_URL}/dailyreport/submission-status`, {
        hasSubmittedToday: true,
      });
    });

    it('converts lastSubmissionDate string to Date', (done) => {
      const rawDate = '2025-06-15T09:00:00.000Z';
      service.getSubmissionStatus().subscribe((status) => {
        expect(status.lastSubmissionDate).toEqual(new Date(rawDate));
        done();
      });
      http
        .expectOne(
          (r) => r.url === `${MOCK_API_URL}/dailyreport/submission-status`
        )
        .flush({ hasSubmittedToday: true, lastSubmissionDate: rawDate });
    });

    it('preserves hasSubmittedToday = false', (done) => {
      service.getSubmissionStatus().subscribe((status) => {
        expect(status.hasSubmittedToday).toBeFalse();
        done();
      });
      flushGet(`${MOCK_API_URL}/dailyreport/submission-status`, {
        hasSubmittedToday: false,
      });
    });

    it('leaves lastSubmissionDate undefined when absent', (done) => {
      service.getSubmissionStatus().subscribe((status) => {
        expect(status.lastSubmissionDate).toBeUndefined();
        done();
      });
      flushGet(`${MOCK_API_URL}/dailyreport/submission-status`, {
        hasSubmittedToday: false,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getAllReports
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getAllReports', () => {
    it('hits the /admin endpoint with no dates', (done) => {
      service.getAllReports().subscribe(() => done());
      flushGet(`${MOCK_API_URL}/dailyreport/admin`, []);
    });

    it('appends startDate when provided', (done) => {
      const start = new Date('2025-01-01T00:00:00.000Z');
      service.getAllReports(start).subscribe(() => done());
      flushGet(
        `${MOCK_API_URL}/dailyreport/admin?startDate=${start.toISOString()}`,
        []
      );
    });

    it('appends endDate when provided', (done) => {
      const end = new Date('2025-01-31T00:00:00.000Z');
      service.getAllReports(undefined, end).subscribe(() => done());
      flushGet(
        `${MOCK_API_URL}/dailyreport/admin?endDate=${end.toISOString()}`,
        []
      );
    });

    it('appends both startDate and endDate when both provided', (done) => {
      const start = new Date('2025-01-01T00:00:00.000Z');
      const end = new Date('2025-01-31T00:00:00.000Z');
      service.getAllReports(start, end).subscribe(() => done());
      flushGet(
        `${MOCK_API_URL}/dailyreport/admin?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
        []
      );
    });

    it('converts submittedDate strings to Date objects in each report', (done) => {
      const rawDate = '2025-06-15T08:00:00.000Z';
      service.getAllReports().subscribe((reports) => {
        expect(reports[0].submittedDate).toEqual(new Date(rawDate));
        done();
      });
      http
        .expectOne((r) => r.url === `${MOCK_API_URL}/dailyreport/admin`)
        .flush([{ ...makeReport(), submittedDate: rawDate }]);
    });

    it('returns an empty array when server returns []', (done) => {
      service.getAllReports().subscribe((reports) => {
        expect(reports).toEqual([]);
        done();
      });
      flushGet(`${MOCK_API_URL}/dailyreport/admin`, []);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getReportsByDate
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getReportsByDate', () => {
    it('hits the /admin/by-date endpoint with no date', (done) => {
      service.getReportsByDate().subscribe(() => done());
      flushGet(`${MOCK_API_URL}/dailyreport/admin/by-date`, []);
    });

    it('appends date query param when provided', (done) => {
      const date = new Date('2025-06-15T00:00:00.000Z');
      service.getReportsByDate(date).subscribe(() => done());
      flushGet(
        `${MOCK_API_URL}/dailyreport/admin/by-date?date=${date.toISOString()}`,
        []
      );
    });

    it('converts submittedDate in each returned report', (done) => {
      const rawDate = '2025-06-15T08:00:00.000Z';
      service.getReportsByDate().subscribe((reports) => {
        expect(reports[0].submittedDate).toEqual(new Date(rawDate));
        done();
      });
      http
        .expectOne((r) => r.url === `${MOCK_API_URL}/dailyreport/admin/by-date`)
        .flush([{ ...makeReport(), submittedDate: rawDate }]);
    });

    it('converts validatedDate in each returned report', (done) => {
      const rawDate = '2025-06-16T09:00:00.000Z';
      service.getReportsByDate().subscribe((reports) => {
        expect(reports[0].validatedDate).toEqual(new Date(rawDate));
        done();
      });
      http
        .expectOne((r) => r.url === `${MOCK_API_URL}/dailyreport/admin/by-date`)
        .flush([{ ...makeReport(), validatedDate: rawDate }]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getReportById
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getReportById', () => {
    it('hits the /{id} endpoint', (done) => {
      service.getReportById(5).subscribe(() => done());
      flushGet(`${MOCK_API_URL}/dailyreport/5`, makeReport());
    });

    it('uses the correct numeric ID in the URL', (done) => {
      service.getReportById(42).subscribe(() => done());
      flushGet(`${MOCK_API_URL}/dailyreport/42`, makeReport());
    });

    it('converts submittedDate to Date object', (done) => {
      const rawDate = '2025-06-15T08:00:00.000Z';
      service.getReportById(1).subscribe((report) => {
        expect(report.submittedDate).toEqual(new Date(rawDate));
        done();
      });
      http
        .expectOne((r) => r.url === `${MOCK_API_URL}/dailyreport/1`)
        .flush({ ...makeReport(), submittedDate: rawDate });
    });

    it('converts validatedDate to Date object', (done) => {
      const rawDate = '2025-06-16T09:00:00.000Z';
      service.getReportById(1).subscribe((report) => {
        expect(report.validatedDate).toEqual(new Date(rawDate));
        done();
      });
      http
        .expectOne((r) => r.url === `${MOCK_API_URL}/dailyreport/1`)
        .flush({ ...makeReport(), validatedDate: rawDate });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // validateReport
  // ═══════════════════════════════════════════════════════════════════════════

  describe('validateReport', () => {
    it('PUTs to the /{id}/validate endpoint', (done) => {
      service.validateReport(3).subscribe(() => done());
      flushPut(`${MOCK_API_URL}/dailyreport/3/validate`, {
        message: 'Report validated successfully',
      });
    });

    it('uses the correct numeric ID in the URL', (done) => {
      service.validateReport(99).subscribe(() => done());
      const req = http.expectOne(
        (r) => r.url === `${MOCK_API_URL}/dailyreport/99/validate`
      );
      expect(req.request.method).toBe('PUT');
      req.flush({ message: 'Report validated successfully' });
    });

    it('returns message from server response', (done) => {
      service.validateReport(1).subscribe((resp) => {
        expect(resp.message).toBe('Report validated successfully');
        done();
      });
      flushPut(`${MOCK_API_URL}/dailyreport/1/validate`, {
        message: 'Report validated successfully',
      });
    });

    it('sends Authorization header', (done) => {
      service.validateReport(1).subscribe(() => done());
      const req = http.expectOne(
        (r) => r.url === `${MOCK_API_URL}/dailyreport/1/validate`
      );
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${MOCK_TOKEN}`
      );
      req.flush({ message: 'ok' });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getLookupOptions
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getLookupOptions', () => {
    it('hits the /lookups/{fieldName} endpoint', (done) => {
      service.getLookupOptions('segmentId').subscribe(() => done());
      flushGet(`${MOCK_API_URL}/dailyreport/lookups/segmentId`, []);
    });

    it('uses the correct fieldName in the URL', (done) => {
      service.getLookupOptions('currentLocation').subscribe(() => done());
      flushGet(`${MOCK_API_URL}/dailyreport/lookups/currentLocation`, []);
    });

    it('returns the array of options from server', (done) => {
      const options = ['Option A', 'Option B', 'Other'];
      service.getLookupOptions('segmentId').subscribe((result) => {
        expect(result).toEqual(options);
        done();
      });
      flushGet(`${MOCK_API_URL}/dailyreport/lookups/segmentId`, options);
    });

    it('returns empty array when server returns []', (done) => {
      service.getLookupOptions('unknownField').subscribe((result) => {
        expect(result).toEqual([]);
        done();
      });
      flushGet(`${MOCK_API_URL}/dailyreport/lookups/unknownField`, []);
    });

    it('sends Authorization header', (done) => {
      service.getLookupOptions('segmentId').subscribe(() => done());
      const req = http.expectOne(
        (r) => r.url === `${MOCK_API_URL}/dailyreport/lookups/segmentId`
      );
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${MOCK_TOKEN}`
      );
      req.flush([]);
    });

    it('sends X-User-Id header', (done) => {
      service.getLookupOptions('segmentId').subscribe(() => done());
      const req = http.expectOne(
        (r) => r.url === `${MOCK_API_URL}/dailyreport/lookups/segmentId`
      );
      expect(req.request.headers.get('X-User-Id')).toBe(MOCK_USER_ID);
      req.flush([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getUserSubmissionStatus – date transform for lastSubmissionDate
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getUserSubmissionStatus – date transforms', () => {
    it('converts lastSubmissionDate string to Date object', (done) => {
      const rawDate = '2025-06-15T09:00:00.000Z';
      service.getUserSubmissionStatus(undefined, 'NV').subscribe((statuses) => {
        expect(statuses[0].lastSubmissionDate).toEqual(new Date(rawDate));
        done();
      });
      http
        .expectOne(
          (r) =>
            r.url === `${MOCK_API_URL}/dailyreport/admin/user-status/NV`
        )
        .flush([
          {
            userId: 'u1',
            userName: 'Alice',
            userEmail: 'alice@example.com',
            hasSubmittedToday: true,
            lastSubmissionDate: rawDate,
          },
        ]);
    });

    it('leaves lastSubmissionDate undefined when absent', (done) => {
      service.getUserSubmissionStatus(undefined, 'NV').subscribe((statuses) => {
        expect(statuses[0].lastSubmissionDate).toBeUndefined();
        done();
      });
      http
        .expectOne(
          (r) =>
            r.url === `${MOCK_API_URL}/dailyreport/admin/user-status/NV`
        )
        .flush([
          {
            userId: 'u1',
            userName: 'Alice',
            userEmail: 'alice@example.com',
            hasSubmittedToday: false,
          },
        ]);
    });
  });
});
