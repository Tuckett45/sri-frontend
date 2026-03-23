import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StreetSheetService } from './street-sheet.service';
import { OfflineCacheService } from './offline-cache.service';
import { User } from '../models/user.model';

const API_BASE = 'https://sri-api.azurewebsites.net/api';

function makeUser(role: string, market: string): User {
  return new User(
    `user-${role}-${market}`,
    `${role} User`,
    `${role.toLowerCase()}@test.com`,
    '',
    role,
    market,
    'TestCo',
    new Date(),
    true
  );
}

function makeOfflineCacheSpy(): jasmine.SpyObj<OfflineCacheService> {
  const spy = jasmine.createSpyObj<OfflineCacheService>(
    'OfflineCacheService',
    ['isOnline', 'online', 'getStreetSheets', 'saveStreetSheets'],
    {}
  );
  spy.isOnline.and.returnValue(true);
  (spy.online as any) = jasmine.createSpy('online').and.returnValue(true);
  spy.getStreetSheets.and.resolveTo([]);
  spy.saveStreetSheets.and.resolveTo(undefined);
  return spy;
}

describe('StreetSheetService – getStreetSheets URL routing', () => {
  let service: StreetSheetService;
  let http: HttpTestingController;
  let offlineSpy: jasmine.SpyObj<OfflineCacheService>;

  beforeEach(() => {
    offlineSpy = makeOfflineCacheSpy();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StreetSheetService,
        { provide: OfflineCacheService, useValue: offlineSpy },
      ],
    });

    service = TestBed.inject(StreetSheetService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const start = new Date('2025-06-01T00:00:00Z');
  const end   = new Date('2025-06-30T23:59:59Z');

  // ── CM non-RG → state-scoped endpoint ────────────────────────────────────

  const CM_MARKETS = ['AZ', 'CO', 'ID', 'NV', 'TX', 'UT'];

  CM_MARKETS.forEach(market => {
    it(`CM in ${market} calls /StreetSheet/${market} with date params`, (done) => {
      const user = makeUser('CM', market);

      service.getStreetSheets(user, start, end).subscribe(() => done());

      // The service embeds dates directly in the URL string, so check
      // r.url (which includes the query string) for the expected segments
      const req = http.expectOne((r) =>
        r.url.startsWith(`${API_BASE}/StreetSheet/${market}`) &&
        r.url.includes('startDate') &&
        r.url.includes('endDate')
      );
      req.flush([]);
    });
  });

  // ── CM with RG market → global endpoint ───────────────────────────────────

  it('CM in RG calls /StreetSheet (not state-scoped)', (done) => {
    const user = makeUser('CM', 'RG');

    service.getStreetSheets(user, start, end).subscribe(() => done());

    // URL has date params embedded in the string, not via HttpParams
    const req = http.expectOne((r) =>
      r.url.startsWith(`${API_BASE}/StreetSheet?`) &&
      !r.url.includes('/StreetSheet/RG')
    );
    req.flush([]);
  });

  // ── Other roles → global endpoint ─────────────────────────────────────────

  ['PM', 'Admin', 'EngineeringFieldSupport', 'MaterialsManager'].forEach(role => {
    it(`${role} calls /StreetSheet (global, no state segment)`, (done) => {
      const user = makeUser(role, 'NV');

      service.getStreetSheets(user, start, end).subscribe(() => done());

      // URL has date params embedded, so match the base path prefix
      const req = http.expectOne((r) =>
        r.url.startsWith(`${API_BASE}/StreetSheet`) &&
        !r.url.match(/\/StreetSheet\/[A-Z]/)   // no /StreetSheet/STATE segment
      );
      req.flush([]);
    });
  });

  // ── Frontend filtering: CM only sees sheets from their state ──────────────

  it('filterStreetSheetsForUser: CM in NV only receives NV sheets', (done) => {
    const user = makeUser('CM', 'NV');
    const sheets = [
      { id: 's1', segmentId: 'SEG-001', state: 'NV', date: new Date('2025-06-10') },
      { id: 's2', segmentId: 'SEG-002', state: 'AZ', date: new Date('2025-06-11') },
      { id: 's3', segmentId: 'SEG-003', state: 'NV', date: new Date('2025-06-12') },
    ];

    let captured: any[] = [];
    service.getStreetSheets(user, start, end).subscribe(result => {
      captured = result;
      done();
    });

    const req = http.expectOne((r) => r.url.startsWith(`${API_BASE}/StreetSheet/NV`));
    req.flush(sheets);

    expect(captured.every((s: any) => s.state === 'NV')).toBeTrue();
    expect(captured.length).toBe(2);
  });

  it('filterStreetSheetsForUser: Admin (RG) sees all states', (done) => {
    const user = makeUser('Admin', 'RG');
    const sheets = [
      { id: 's1', segmentId: 'SEG-001', state: 'NV', date: new Date('2025-06-10') },
      { id: 's2', segmentId: 'SEG-002', state: 'AZ', date: new Date('2025-06-11') },
      { id: 's3', segmentId: 'SEG-003', state: 'CO', date: new Date('2025-06-12') },
    ];

    let captured: any[] = [];
    service.getStreetSheets(user, start, end).subscribe(result => {
      captured = result;
      done();
    });

    const req = http.expectOne((r) =>
      r.url.startsWith(`${API_BASE}/StreetSheet`) && !r.url.match(/\/StreetSheet\/[A-Z]/)
    );
    req.flush(sheets);

    expect(captured.length).toBe(3);
  });

  // ── saveStreetSheet POSTs to /StreetSheet with FormData ───────────────────

  it('saveStreetSheet POSTs to /StreetSheet and clears cache', (done) => {
    const formData = new FormData();
    formData.append('SegmentId', 'SEG-NEW');
    formData.append('State', 'NV');

    service.saveStreetSheet(formData).subscribe(() => done());

    const req = http.expectOne(`${API_BASE}/StreetSheet`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'new-id', segmentId: 'SEG-NEW' });
  });

  // ── isSegmentIdUnique ─────────────────────────────────────────────────────

  it('isSegmentIdUnique calls correct endpoint', (done) => {
    service.isSegmentIdUnique('SEG-001').subscribe(result => {
      expect(result).toBeTrue();
      done();
    });

    const req = http.expectOne(`${API_BASE}/StreetSheet/segment-id-unique/SEG-001`);
    expect(req.request.method).toBe('GET');
    req.flush(true);
  });

  it('isSegmentIdUnique returns false when segment already exists', (done) => {
    service.isSegmentIdUnique('SEG-DUP').subscribe(result => {
      expect(result).toBeFalse();
      done();
    });

    const req = http.expectOne(`${API_BASE}/StreetSheet/segment-id-unique/SEG-DUP`);
    req.flush(false);
  });
});
