import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PreliminaryPunchListService } from './preliminary-punch-list.service';
import { OfflineCacheService } from './offline-cache.service';
import { User } from '../models/user.model';

const API_BASE = 'https://sri-api.azurewebsites.net/api';

function makeUser(
  role: string,
  market: string,
  company = 'TestCo'
): User {
  return new User(
    `user-${role}-${market}`,
    `${role} User`,
    `${role.toLowerCase()}@test.com`,
    '',
    role,
    market,
    company,
    new Date(),
    true
  );
}

function makeOfflineCacheSpy(): jasmine.SpyObj<OfflineCacheService> {
  const spy = jasmine.createSpyObj<OfflineCacheService>(
    'OfflineCacheService',
    ['isOnline', 'online', 'getPunchLists', 'savePunchLists', 'getStreetSheets', 'saveStreetSheets'],
    {}
  );
  spy.isOnline.and.returnValue(true);
  // Return a signal-like function for the online() signal
  (spy.online as any) = jasmine.createSpy('online').and.returnValue(true);
  spy.getPunchLists.and.resolveTo([]);
  return spy;
}

describe('PreliminaryPunchListService – URL routing by role and market', () => {
  let service: PreliminaryPunchListService;
  let http: HttpTestingController;
  let offlineSpy: jasmine.SpyObj<OfflineCacheService>;

  beforeEach(() => {
    offlineSpy = makeOfflineCacheSpy();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PreliminaryPunchListService,
        { provide: OfflineCacheService, useValue: offlineSpy },
      ],
    });

    service = TestBed.inject(PreliminaryPunchListService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ── CM non-RG markets → cm-unresolved ────────────────────────────────────

  const CM_MARKETS = ['AZ', 'CO', 'ID', 'NV', 'TX', 'UT'];

  CM_MARKETS.forEach(market => {
    it(`CM in ${market} hits /PunchList/cm-unresolved with state=${market}`, (done) => {
      const user = makeUser('CM', market);

      service.getUnresolvedPunchLists(user, 0, 25).subscribe(() => done());

      const req = http.expectOne((r) =>
        r.url === `${API_BASE}/PunchList/cm-unresolved` &&
        r.params.get('state') === market
      );
      req.flush({ total: 0, page: 0, pageSize: 25, items: [] });
    });

    it(`CM in ${market} hits /PunchList/cm-resolved with state=${market}`, (done) => {
      const user = makeUser('CM', market);

      service.getResolvedPunchLists(user, 0, 25).subscribe(() => done());

      const req = http.expectOne((r) =>
        r.url === `${API_BASE}/PunchList/cm-resolved` &&
        r.params.get('state') === market
      );
      req.flush({ total: 0, page: 0, pageSize: 25, items: [] });
    });
  });

  // ── CM with RG market → falls back to unresolved/resolved ─────────────────

  it('CM in RG hits /PunchList/unresolved (no state param)', (done) => {
    const user = makeUser('CM', 'RG');

    service.getUnresolvedPunchLists(user, 0, 25).subscribe(() => done());

    const req = http.expectOne((r) =>
      r.url === `${API_BASE}/PunchList/unresolved`
    );
    expect(req.request.params.has('state')).toBeFalse();
    req.flush({ total: 0, page: 0, pageSize: 25, items: [] });
  });

  it('CM in RG hits /PunchList/resolved (no state param)', (done) => {
    const user = makeUser('CM', 'RG');

    service.getResolvedPunchLists(user, 0, 25).subscribe(() => done());

    const req = http.expectOne((r) =>
      r.url === `${API_BASE}/PunchList/resolved`
    );
    expect(req.request.params.has('state')).toBeFalse();
    req.flush({ total: 0, page: 0, pageSize: 25, items: [] });
  });

  // ── PM non-RG → pm-unresolved with state + company ────────────────────────

  it('PM in NV hits /PunchList/pm-unresolved with state and company', (done) => {
    const user = makeUser('PM', 'NV', 'AcmeCorp');

    service.getUnresolvedPunchLists(user, 0, 25).subscribe(() => done());

    const req = http.expectOne((r) =>
      r.url === `${API_BASE}/PunchList/pm-unresolved` &&
      r.params.get('state') === 'NV' &&
      r.params.get('company') === 'AcmeCorp'
    );
    req.flush({ total: 0, page: 0, pageSize: 25, items: [] });
  });

  it('PM in NV hits /PunchList/pm-resolved with state and company', (done) => {
    const user = makeUser('PM', 'NV', 'AcmeCorp');

    service.getResolvedPunchLists(user, 0, 25).subscribe(() => done());

    const req = http.expectOne((r) =>
      r.url === `${API_BASE}/PunchList/pm-resolved` &&
      r.params.get('state') === 'NV' &&
      r.params.get('company') === 'AcmeCorp'
    );
    req.flush({ total: 0, page: 0, pageSize: 25, items: [] });
  });

  // ── PM with RG market → falls back ────────────────────────────────────────

  it('PM in RG hits /PunchList/unresolved (regional)', (done) => {
    const user = makeUser('PM', 'RG', 'SRI');

    service.getUnresolvedPunchLists(user, 0, 25).subscribe(() => done());

    const req = http.expectOne((r) =>
      r.url === `${API_BASE}/PunchList/unresolved`
    );
    req.flush({ total: 0, page: 0, pageSize: 25, items: [] });
  });

  // ── Other roles (Admin, EngineeringFieldSupport, MaterialsManager) ─────────

  ['Admin', 'EngineeringFieldSupport', 'MaterialsManager'].forEach(role => {
    it(`${role} hits /PunchList/unresolved`, (done) => {
      const user = makeUser(role, 'RG');

      service.getUnresolvedPunchLists(user, 0, 25).subscribe(() => done());

      const req = http.expectOne((r) =>
        r.url === `${API_BASE}/PunchList/unresolved`
      );
      req.flush({ total: 0, page: 0, pageSize: 25, items: [] });
    });
  });

  // ── searchPunchLists builds correct params ─────────────────────────────────

  it('searchPunchLists sends correct resolved, pageNumber, and pageSize', (done) => {
    service.searchPunchLists({
      resolved: 'unresolved',
      page: 2,
      pageSize: 10,
    }).subscribe(() => done());

    const req = http.expectOne((r) =>
      r.url === `${API_BASE}/PunchList/search` &&
      r.params.get('resolved') === 'unresolved' &&
      r.params.get('pageNumber') === '2' &&
      r.params.get('pageSize') === '10'
    );
    req.flush({ total: 0, page: 2, pageSize: 10, items: [] });
  });

  it('searchPunchLists includes statesCsv when states array provided', (done) => {
    service.searchPunchLists({
      resolved: 'unresolved',
      page: 0,
      pageSize: 25,
      states: ['NV', 'AZ', 'CO'],
    }).subscribe(() => done());

    const req = http.expectOne((r) =>
      r.url === `${API_BASE}/PunchList/search` &&
      r.params.get('statesCsv') === 'NV,AZ,CO'
    );
    req.flush({ total: 0, page: 0, pageSize: 25, items: [] });
  });

  it('searchPunchLists includes dateReportedStart when provided', (done) => {
    const start = new Date('2025-01-01T00:00:00Z');

    service.searchPunchLists({
      resolved: 'resolved',
      page: 0,
      pageSize: 25,
      dateReportedStart: start,
    }).subscribe(() => done());

    const req = http.expectOne((r) =>
      r.url === `${API_BASE}/PunchList/search` &&
      r.params.has('dateReportedStart')
    );
    req.flush({ total: 0, page: 0, pageSize: 25, items: [] });
  });

  // ── getFacets ─────────────────────────────────────────────────────────────

  it('getFacets sends resolved param', (done) => {
    service.getFacets('unresolved').subscribe(() => done());

    const req = http.expectOne((r) =>
      r.url === `${API_BASE}/PunchList/facets` &&
      r.params.get('resolved') === 'unresolved'
    );
    req.flush({ segmentIds: [], vendors: [], states: [] });
  });

  // ── cache key building ────────────────────────────────────────────────────

  it('same user+url triggers only one HTTP request (shareReplay cache)', (done) => {
    const user = makeUser('CM', 'NV');

    let count = 0;
    const check = () => { if (++count === 2) done(); };

    // Subscribe twice; cache should ensure only one HTTP call is made
    service.getUnresolvedPunchLists(user, 0, 25).subscribe(() => check());
    service.getUnresolvedPunchLists(user, 0, 25).subscribe(() => check());

    // Exactly ONE request should exist
    const req = http.expectOne((r) =>
      r.url === `${API_BASE}/PunchList/cm-unresolved`
    );
    req.flush({ total: 0, page: 0, pageSize: 25, items: [] });
  });

  // ── addEntry – partial failure handling ─────────────────────────────────

  describe('addEntry – partial failure handling', () => {
    it('should skip POST and do PUT when entry already exists (GET returns 200)', (done) => {
      const punchList = {
        id: 'test-id-1',
        segmentId: 'SEG001',
        vendorName: 'TestVendor',
        streetAddress: '123 Test St',
        city: 'TestCity',
        state: 'AZ',
        issues: [],
        additionalConcerns: '',
        dateReported: new Date(),
        pmResolved: false,
        cmResolved: false,
        issueImages: ['data:image/jpeg;base64,abc123'],
        resolutionImages: []
      } as any;

      service.addEntry(punchList).subscribe({
        next: () => done(),
        error: () => fail('Should not error')
      });

      // GET check returns 200 (entry exists)
      const getReq = http.expectOne(`${API_BASE}/PunchList/test-id-1`);
      expect(getReq.request.method).toBe('GET');
      getReq.flush(punchList);

      // Should go straight to PUT (no POST)
      const putReq = http.expectOne(`${API_BASE}/PunchList/test-id-1`);
      expect(putReq.request.method).toBe('PUT');
      putReq.flush({});
    });

    it('should do POST then PUT when entry does not exist (GET returns 404)', (done) => {
      const punchList = {
        id: 'test-id-2',
        segmentId: 'SEG002',
        vendorName: 'TestVendor',
        streetAddress: '456 Test St',
        city: 'TestCity',
        state: 'CO',
        issues: [],
        additionalConcerns: '',
        dateReported: new Date(),
        pmResolved: false,
        cmResolved: false,
        issueImages: ['data:image/jpeg;base64,xyz789'],
        resolutionImages: []
      } as any;

      service.addEntry(punchList).subscribe({
        next: () => done(),
        error: () => fail('Should not error')
      });

      // GET check returns 404 (entry does not exist)
      const getReq = http.expectOne(`${API_BASE}/PunchList/test-id-2`);
      expect(getReq.request.method).toBe('GET');
      getReq.flush(null, { status: 404, statusText: 'Not Found' });

      // Should POST without images
      const postReq = http.expectOne(`${API_BASE}/PunchList`);
      expect(postReq.request.method).toBe('POST');
      expect(postReq.request.body.issueImages).toEqual([]);
      postReq.flush({});

      // Then PUT with images
      const putReq = http.expectOne(`${API_BASE}/PunchList/test-id-2`);
      expect(putReq.request.method).toBe('PUT');
      expect(putReq.request.body.issueImages).toEqual(['data:image/jpeg;base64,xyz789']);
      putReq.flush({});
    });

    it('should skip POST on retry when id is in pendingImageUploadIds', (done) => {
      const punchList = {
        id: 'test-id-3',
        segmentId: 'SEG003',
        vendorName: 'TestVendor',
        streetAddress: '789 Test St',
        city: 'TestCity',
        state: 'NV',
        issues: [],
        additionalConcerns: '',
        dateReported: new Date(),
        pmResolved: false,
        cmResolved: false,
        issueImages: ['data:image/jpeg;base64,def456'],
        resolutionImages: []
      } as any;

      // First call - simulate POST success, PUT failure
      service.addEntry(punchList).subscribe({
        next: () => fail('Should have failed'),
        error: () => {
          // Second call - should skip POST entirely
          service.addEntry(punchList).subscribe({
            next: () => done(),
            error: () => fail('Second call should succeed')
          });

          // Should go straight to PUT (no GET, no POST)
          const putReq = http.expectOne(`${API_BASE}/PunchList/test-id-3`);
          expect(putReq.request.method).toBe('PUT');
          putReq.flush({});
        }
      });

      // First call: GET returns 404
      const getReq = http.expectOne(`${API_BASE}/PunchList/test-id-3`);
      getReq.flush(null, { status: 404, statusText: 'Not Found' });

      // First call: POST succeeds
      const postReq = http.expectOne(`${API_BASE}/PunchList`);
      postReq.flush({});

      // First call: PUT fails
      const putReq = http.expectOne(`${API_BASE}/PunchList/test-id-3`);
      putReq.flush(null, { status: 0, statusText: 'Network Error' });
    });
  });
});
