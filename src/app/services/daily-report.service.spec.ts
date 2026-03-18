import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { DailyReportService } from './daily-report.service';
import { AuthService } from './auth.service';

const MOCK_API_URL = 'https://sri-api.azurewebsites.net/api';

describe('DailyReportService – getUserSubmissionStatus URL', () => {
  let service: DailyReportService;
  let http: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getUser',
      'getAccessToken',
    ]);
    authServiceSpy.getUser.and.returnValue({ id: 'user-1' } as any);
    authServiceSpy.getAccessToken.and.resolveTo('mock-token');

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

  function flush(url: string): void {
    const req = http.expectOne((r) => r.url === url);
    req.flush([]);
  }

  // ── market → "all" cases ──────────────────────────────────────────────────

  it('uses "all" in URL when market is undefined', (done) => {
    service.getUserSubmissionStatus(undefined, undefined).subscribe(() => done());
    flush(`${MOCK_API_URL}/dailyreport/admin/user-status/all`);
  });

  it('uses "all" in URL when market is null', (done) => {
    service.getUserSubmissionStatus(undefined, null as any).subscribe(() => done());
    flush(`${MOCK_API_URL}/dailyreport/admin/user-status/all`);
  });

  it('uses "all" in URL when market is empty string', (done) => {
    service.getUserSubmissionStatus(undefined, '').subscribe(() => done());
    flush(`${MOCK_API_URL}/dailyreport/admin/user-status/all`);
  });

  it('uses "all" in URL when market is "RG" (admin override)', (done) => {
    service.getUserSubmissionStatus(undefined, 'RG').subscribe(() => done());
    flush(`${MOCK_API_URL}/dailyreport/admin/user-status/all`);
  });

  it('uses "all" in URL when market is "rg" (case-insensitive)', (done) => {
    service.getUserSubmissionStatus(undefined, 'rg').subscribe(() => done());
    flush(`${MOCK_API_URL}/dailyreport/admin/user-status/all`);
  });

  // ── specific market codes pass through ────────────────────────────────────

  it('uses "NV" in URL when market is "NV"', (done) => {
    service.getUserSubmissionStatus(undefined, 'NV').subscribe(() => done());
    flush(`${MOCK_API_URL}/dailyreport/admin/user-status/NV`);
  });

  it('uses "CO" in URL when market is "CO"', (done) => {
    service.getUserSubmissionStatus(undefined, 'CO').subscribe(() => done());
    flush(`${MOCK_API_URL}/dailyreport/admin/user-status/CO`);
  });

  it('uses "AZ" in URL when market is "AZ"', (done) => {
    service.getUserSubmissionStatus(undefined, 'AZ').subscribe(() => done());
    flush(`${MOCK_API_URL}/dailyreport/admin/user-status/AZ`);
  });

  // ── date query param is appended correctly ────────────────────────────────

  it('appends date as query param when provided', (done) => {
    const date = new Date('2025-06-15T00:00:00.000Z');
    service.getUserSubmissionStatus(date, 'NV').subscribe(() => done());

    const req = http.expectOne(
      `${MOCK_API_URL}/dailyreport/admin/user-status/NV?date=${date.toISOString()}`
    );
    req.flush([]);
  });

  it('omits date query param when not provided', (done) => {
    service.getUserSubmissionStatus(undefined, 'NV').subscribe(() => done());

    // URL must not contain a "?" at all
    const req = http.expectOne(
      (r) =>
        r.url === `${MOCK_API_URL}/dailyreport/admin/user-status/NV` &&
        !r.urlWithParams.includes('date=')
    );
    req.flush([]);
  });
});
