import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

import { StreetSheetComponent } from './street-sheet.component';
import { StreetSheetService } from 'src/app/services/street-sheet.service';
import { MapMarkerService } from 'src/app/services/map-marker.service';
import { AuthService } from 'src/app/services/auth.service';
import { GeocodingService } from 'src/app/services/geocoding.service';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeAdmin() {
  return { id: 'admin-1', name: 'Admin User', role: 'Admin', market: 'RG', email: 'admin@test.com' } as any;
}

function makeCmStats(overrides: Partial<any> = {}) {
  return {
    submittedCount: 2,
    notSubmittedCount: 1,
    totalSheetCount: 7,
    submittedCms: [
      { id: 'cm-1', name: 'Alice', market: 'NV', sheetCount: 4, lastSubmitted: '2025-06-10T00:00:00Z' },
      { id: 'cm-2', name: 'Bob',   market: 'CO', sheetCount: 3, lastSubmitted: '2025-06-09T00:00:00Z' },
    ],
    notSubmittedCms: [
      { id: 'cm-3', name: 'Carol', market: 'AZ' },
    ],
    pms: ['PM-One', 'PM-Two'],
    ...overrides
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('StreetSheetComponent – dashboard metrics', () => {
  let component: StreetSheetComponent;
  let fixture: ComponentFixture<StreetSheetComponent>;

  let streetSheetServiceSpy: jasmine.SpyObj<StreetSheetService>;
  let mapMarkerServiceSpy: jasmine.SpyObj<MapMarkerService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    streetSheetServiceSpy = jasmine.createSpyObj('StreetSheetService', [
      'getStreetSheets',
      'getCmSubmissionStats',
    ]);
    mapMarkerServiceSpy = jasmine.createSpyObj('MapMarkerService', [
      'getMapMarkersForStreetSheet',
    ]);
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getUser',
      'getUserByRole',
    ]);

    // Default: return empty street sheets so ngOnInit doesn't block
    streetSheetServiceSpy.getStreetSheets.and.returnValue(of([]));
    authServiceSpy.getUser.and.returnValue(makeAdmin());
    authServiceSpy.getUserByRole.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [StreetSheetComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StreetSheetService,  useValue: streetSheetServiceSpy },
        { provide: MapMarkerService,    useValue: mapMarkerServiceSpy },
        { provide: AuthService,         useValue: authServiceSpy },
        { provide: GeocodingService,    useValue: {} },
        { provide: MatDialog,           useValue: {} },
        { provide: ToastrService,       useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StreetSheetComponent);
    component = fixture.componentInstance;
  });

  // ── totalSheetCount from API ───────────────────────────────────────────────

  it('sets dashboardMetrics.total to totalSheetCount from the API stats', fakeAsync(() => {
    const stats = makeCmStats({ totalSheetCount: 9 });
    streetSheetServiceSpy.getCmSubmissionStats.and.returnValue(of(stats));

    // Bootstrap as admin with dates set and provide sheets within the date range
    component.isAdmin = true;
    component.dashboardStartDate = new Date('2025-06-01');
    component.dashboardEndDate = new Date('2025-06-30');
    component.streetSheets = Array.from({ length: 9 }, (_, i) => ({
      id: `s${i}`, date: new Date(`2025-06-${10 + i}`), vendorName: 'V', pm: 'PM', state: 'NV',
      segmentId: '', streetAddress: '', city: '', deployment: '', equipment: '', additionalConcerns: '', marker: []
    } as any));

    component.applyDashboardFilters();
    tick();

    expect(component.dashboardMetrics.total).toBe(9);
  }));

  it('sets cmsWithEntries sheetCount from the API stats', fakeAsync(() => {
    const stats = makeCmStats();
    streetSheetServiceSpy.getCmSubmissionStats.and.returnValue(of(stats));

    component.isAdmin = true;
    component.dashboardStartDate = new Date('2025-06-01');
    component.dashboardEndDate = new Date('2025-06-30');
    component.streetSheets = [];

    component.applyDashboardFilters();
    tick();

    expect(component.cmsWithEntries.length).toBe(2);
    expect(component.cmsWithEntries[0].sheetCount).toBe(4);
    expect(component.cmsWithEntries[1].sheetCount).toBe(3);
  }));

  it('sets dashboardMetrics.withEntries and withoutEntries from the API', fakeAsync(() => {
    const stats = makeCmStats({ submittedCount: 3, notSubmittedCount: 2 });
    streetSheetServiceSpy.getCmSubmissionStats.and.returnValue(of(stats));

    component.isAdmin = true;
    component.dashboardStartDate = new Date('2025-06-01');
    component.dashboardEndDate = new Date('2025-06-30');
    component.streetSheets = [];

    component.applyDashboardFilters();
    tick();

    expect(component.dashboardMetrics.withEntries).toBe(3);
    expect(component.dashboardMetrics.withoutEntries).toBe(2);
  }));

  // ── fallback when API is absent ───────────────────────────────────────────

  it('falls back to dashboardStreetSheets.length for total when API errors', fakeAsync(() => {
    streetSheetServiceSpy.getCmSubmissionStats.and.returnValue(
      throwError(() => new Error('network error'))
    );

    component.isAdmin = true;
    component.dashboardStartDate = new Date('2025-06-01');
    component.dashboardEndDate = new Date('2025-06-30');
    // Seed some sheets so the fallback has a non-zero number
    component.streetSheets = [
      { id: 's1', date: new Date('2025-06-15') } as any,
      { id: 's2', date: new Date('2025-06-16') } as any,
    ];
    component.cmUsers = [];

    component.applyDashboardFilters();
    tick();

    // computeCmMetrics runs; total = dashboardStreetSheets.length (2 sheets)
    expect(component.dashboardMetrics.total).toBe(2);
  }));

  // ── default date range covers today ──────────────────────────────────────

  it('default dashboardStartDate is 10 days ago at 00:00:00', () => {
    fixture.detectChanges(); // trigger ngOnInit

    const today = new Date();
    const tenDaysAgo = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000);
    expect(component.dashboardStartDate.getFullYear()).toBe(tenDaysAgo.getFullYear());
    expect(component.dashboardStartDate.getMonth()).toBe(tenDaysAgo.getMonth());
    expect(component.dashboardStartDate.getDate()).toBe(tenDaysAgo.getDate());
    expect(component.dashboardStartDate.getHours()).toBe(0);
  });

  it('default dashboardEndDate is today at 23:59:59', () => {
    fixture.detectChanges();

    const today = new Date();
    expect(component.dashboardEndDate.getFullYear()).toBe(today.getFullYear());
    expect(component.dashboardEndDate.getMonth()).toBe(today.getMonth());
    expect(component.dashboardEndDate.getDate()).toBe(today.getDate());
    expect(component.dashboardEndDate.getHours()).toBe(23);
    expect(component.dashboardEndDate.getMinutes()).toBe(59);
  });
});

// ── Bug Condition Exploration ─────────────────────────────────────────────────
// Validates: Requirements 1.1, 1.2, 2.1, 2.2
// These tests encode the EXPECTED (correct) behavior.
// On UNFIXED code they MUST FAIL — failure confirms the bug exists.

function makeSheet(id: string, date: Date): any {
  return {
    id,
    segmentId: `seg-${id}`,
    pm: 'PM-Test',
    vendorName: 'TestVendor',
    streetAddress: '123 Main St',
    city: 'TestCity',
    state: 'NV',
    deployment: 'Aerial',
    equipment: 'Fiber',
    date,
    additionalConcerns: '',
    marker: [],
  };
}

function generateSheetsSpanning10Days(): any[] {
  const sheets: any[] = [];
  const now = new Date();
  // Create 2 sheets per day for the last 10 days (20 sheets total)
  for (let daysAgo = 0; daysAgo <= 9; daysAgo++) {
    for (let j = 0; j < 2; j++) {
      const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      date.setHours(10 + j, 0, 0, 0); // 10am and 11am each day
      sheets.push(makeSheet(`sheet-${daysAgo}-${j}`, date));
    }
  }
  return sheets;
}

describe('StreetSheetComponent – bug condition exploration (default date range)', () => {
  let component: StreetSheetComponent;
  let fixture: ComponentFixture<StreetSheetComponent>;

  let streetSheetServiceSpy: jasmine.SpyObj<StreetSheetService>;
  let mapMarkerServiceSpy: jasmine.SpyObj<MapMarkerService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let geocodingServiceSpy: jasmine.SpyObj<any>;

  const mockSheets = generateSheetsSpanning10Days();

  beforeEach(async () => {
    streetSheetServiceSpy = jasmine.createSpyObj('StreetSheetService', [
      'getStreetSheets',
      'getCmSubmissionStats',
    ]);
    mapMarkerServiceSpy = jasmine.createSpyObj('MapMarkerService', [
      'getMapMarkersForStreetSheet',
    ]);
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getUser',
      'getUserByRole',
    ]);
    geocodingServiceSpy = jasmine.createSpyObj('GeocodingService', [
      'reverseGeocode',
    ]);

    // Return a single marker with valid lat/lng so getReversedAddress doesn't throw
    mapMarkerServiceSpy.getMapMarkersForStreetSheet.and.returnValue(
      of([{ latitude: 0, longitude: 0 }] as any)
    );
    // Mock reverseGeocode to return an observable that resolves
    geocodingServiceSpy.reverseGeocode.and.returnValue(of({ results: [] }));

    streetSheetServiceSpy.getStreetSheets.and.returnValue(of(mockSheets));
    streetSheetServiceSpy.getCmSubmissionStats.and.returnValue(of(makeCmStats()));
    authServiceSpy.getUser.and.returnValue(makeAdmin());
    authServiceSpy.getUserByRole.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [StreetSheetComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StreetSheetService,  useValue: streetSheetServiceSpy },
        { provide: MapMarkerService,    useValue: mapMarkerServiceSpy },
        { provide: AuthService,         useValue: authServiceSpy },
        { provide: GeocodingService,    useValue: geocodingServiceSpy },
        { provide: MatDialog,           useValue: {} },
        { provide: ToastrService,       useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StreetSheetComponent);
    component = fixture.componentInstance;
  });

  it('should set dashboardStartDate to 10 days ago on init (not today)', fakeAsync(() => {
    fixture.detectChanges(); // triggers ngOnInit
    tick();

    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // dashboardStartDate should be startOfDay(today - 10 days)
    expect(component.dashboardStartDate.getFullYear()).toBe(tenDaysAgo.getFullYear());
    expect(component.dashboardStartDate.getMonth()).toBe(tenDaysAgo.getMonth());
    expect(component.dashboardStartDate.getDate()).toBe(tenDaysAgo.getDate());
    expect(component.dashboardStartDate.getHours()).toBe(0);
    expect(component.dashboardStartDate.getMinutes()).toBe(0);
    expect(component.dashboardStartDate.getSeconds()).toBe(0);
  }));

  it('should set dashboardEndDate to end of today on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const now = new Date();

    expect(component.dashboardEndDate.getFullYear()).toBe(now.getFullYear());
    expect(component.dashboardEndDate.getMonth()).toBe(now.getMonth());
    expect(component.dashboardEndDate.getDate()).toBe(now.getDate());
    expect(component.dashboardEndDate.getHours()).toBe(23);
    expect(component.dashboardEndDate.getMinutes()).toBe(59);
  }));

  it('should display all 20 fetched sheets in dashboardStreetSheets (not just today)', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    // The service returns 20 sheets spanning 10 days.
    // With the correct default date range (10 days ago → today), all 20 should appear.
    // BUG: dashboardStartDate defaults to today, so only today's ~2 sheets pass the filter.
    expect(component.dashboardStreetSheets.length).toBe(mockSheets.length);
  }));

  it('clearDashboardFilters should reset dashboardStartDate to 10 days ago (not today)', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    // Manually widen the date range
    component.dashboardStartDate = new Date('2020-01-01');
    component.dashboardEndDate = new Date('2030-12-31');

    // Now reset
    component.clearDashboardFilters();
    tick();

    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // After reset, dashboardStartDate should be 10 days ago, not today
    expect(component.dashboardStartDate.getFullYear()).toBe(tenDaysAgo.getFullYear());
    expect(component.dashboardStartDate.getMonth()).toBe(tenDaysAgo.getMonth());
    expect(component.dashboardStartDate.getDate()).toBe(tenDaysAgo.getDate());
    expect(component.dashboardStartDate.getHours()).toBe(0);
  }));
});

// ── Preservation Property Tests ───────────────────────────────────────────────
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
// These tests capture EXISTING behavior that must be preserved after the fix.
// All tests MUST PASS on the current UNFIXED code.

describe('StreetSheetComponent – preservation (custom filters & existing behavior)', () => {
  let component: StreetSheetComponent;
  let fixture: ComponentFixture<StreetSheetComponent>;

  let streetSheetServiceSpy: jasmine.SpyObj<StreetSheetService>;
  let mapMarkerServiceSpy: jasmine.SpyObj<MapMarkerService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  // Build sheets with specific attributes for filter testing
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  function makeFilterSheet(id: string, date: Date, overrides: Record<string, any> = {}): any {
    return {
      id,
      segmentId: `seg-${id}`,
      pm: overrides['pm'] || 'PM-Default',
      vendorName: overrides['vendorName'] || 'VendorDefault',
      streetAddress: '123 Main St',
      city: 'TestCity',
      state: overrides['state'] || 'NV',
      deployment: 'Aerial',
      equipment: 'Fiber',
      date,
      additionalConcerns: '',
      createdBy: overrides['createdBy'] || 'user-default',
      marker: overrides['marker'] || [],
    };
  }

  const testSheets = [
    makeFilterSheet('s1', fiveDaysAgo, { vendorName: 'Acme', pm: 'PM-Alpha', state: 'NV', createdBy: 'cm-1' }),
    makeFilterSheet('s2', fiveDaysAgo, { vendorName: 'Acme', pm: 'PM-Beta',  state: 'CO', createdBy: 'cm-2' }),
    makeFilterSheet('s3', threeDaysAgo, { vendorName: 'Beta', pm: 'PM-Alpha', state: 'NV', createdBy: 'cm-1' }),
    makeFilterSheet('s4', threeDaysAgo, { vendorName: 'Beta', pm: 'PM-Beta',  state: 'AZ', createdBy: 'cm-3' }),
    makeFilterSheet('s5', twoDaysAgo,   { vendorName: 'Acme', pm: 'PM-Alpha', state: 'CO', createdBy: 'cm-2' }),
    makeFilterSheet('s6', sevenDaysAgo, { vendorName: 'Gamma', pm: 'PM-Gamma', state: 'TX', createdBy: 'cm-4' }),
  ];

  beforeEach(async () => {
    streetSheetServiceSpy = jasmine.createSpyObj('StreetSheetService', [
      'getStreetSheets',
      'getCmSubmissionStats',
    ]);
    mapMarkerServiceSpy = jasmine.createSpyObj('MapMarkerService', [
      'getMapMarkersForStreetSheet',
    ]);
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getUser',
      'getUserByRole',
    ]);

    streetSheetServiceSpy.getStreetSheets.and.returnValue(of([]));
    streetSheetServiceSpy.getCmSubmissionStats.and.returnValue(of(makeCmStats()));
    authServiceSpy.getUser.and.returnValue(makeAdmin());
    authServiceSpy.getUserByRole.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [StreetSheetComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StreetSheetService,  useValue: streetSheetServiceSpy },
        { provide: MapMarkerService,    useValue: mapMarkerServiceSpy },
        { provide: AuthService,         useValue: authServiceSpy },
        { provide: GeocodingService,    useValue: {} },
        { provide: MatDialog,           useValue: {} },
        { provide: ToastrService,       useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StreetSheetComponent);
    component = fixture.componentInstance;

    // Set up component state for filter testing (bypass ngOnInit data loading)
    component.isAdmin = true;
    component.streetSheets = testSheets;
    component.cmUsers = [
      { id: 'cm-1', name: 'Alice', market: 'NV', email: 'alice@test.com' } as any,
      { id: 'cm-2', name: 'Bob',   market: 'CO', email: 'bob@test.com' } as any,
      { id: 'cm-3', name: 'Carol', market: 'AZ', email: 'carol@test.com' } as any,
      { id: 'cm-4', name: 'Dave',  market: 'TX', email: 'dave@test.com' } as any,
    ];
  });

  // ── 1. Custom date range filtering ─────────────────────────────────────────
  // Validates: Requirements 3.1

  it('custom date range filters sheets to only those within the range', fakeAsync(() => {
    // Set custom range: 5 days ago to 2 days ago (should include s1, s2, s3, s4, s5)
    const startDate = new Date(fiveDaysAgo);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(twoDaysAgo);
    endDate.setHours(23, 59, 59, 999);

    component.dashboardStartDate = startDate;
    component.dashboardEndDate = endDate;
    component.applyDashboardFilters();
    tick();

    // s6 is 7 days ago, outside the range
    expect(component.dashboardStreetSheets.length).toBe(5);
    const ids = component.dashboardStreetSheets.map(s => s.id);
    expect(ids).toContain('s1');
    expect(ids).toContain('s2');
    expect(ids).toContain('s3');
    expect(ids).toContain('s4');
    expect(ids).toContain('s5');
    expect(ids).not.toContain('s6');
  }));

  // ── 2. Vendor filter ───────────────────────────────────────────────────────
  // Validates: Requirements 3.2

  it('vendor filter returns only sheets matching that vendor', fakeAsync(() => {
    // Wide date range to include all sheets
    component.dashboardStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    component.dashboardStartDate.setHours(0, 0, 0, 0);
    component.dashboardEndDate = new Date(now);
    component.dashboardEndDate.setHours(23, 59, 59, 999);

    component.dashboardVendorFilter = 'Acme';
    component.applyDashboardFilters();
    tick();

    // s1, s2, s5 are Acme
    expect(component.dashboardStreetSheets.length).toBe(3);
    component.dashboardStreetSheets.forEach(s => {
      expect(s.vendorName.toLowerCase()).toBe('acme');
    });
  }));

  // ── 3. PM filter ───────────────────────────────────────────────────────────
  // Validates: Requirements 3.2

  it('PM filter returns only sheets matching that PM', fakeAsync(() => {
    component.dashboardStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    component.dashboardStartDate.setHours(0, 0, 0, 0);
    component.dashboardEndDate = new Date(now);
    component.dashboardEndDate.setHours(23, 59, 59, 999);

    component.dashboardPmFilter = 'PM-Beta';
    component.applyDashboardFilters();
    tick();

    // s2, s4 are PM-Beta
    expect(component.dashboardStreetSheets.length).toBe(2);
    component.dashboardStreetSheets.forEach(s => {
      expect((s.pm || '').toLowerCase()).toBe('pm-beta');
    });
  }));

  // ── 4. Market filter ───────────────────────────────────────────────────────
  // Validates: Requirements 3.2

  it('market filter returns only sheets matching that market (state)', fakeAsync(() => {
    component.dashboardStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    component.dashboardStartDate.setHours(0, 0, 0, 0);
    component.dashboardEndDate = new Date(now);
    component.dashboardEndDate.setHours(23, 59, 59, 999);

    component.dashboardMarketFilter = 'NV';
    component.applyDashboardFilters();
    tick();

    // s1, s3 are NV
    expect(component.dashboardStreetSheets.length).toBe(2);
    component.dashboardStreetSheets.forEach(s => {
      expect(s.state.toLowerCase()).toBe('nv');
    });
  }));

  // ── 5. CM filter ───────────────────────────────────────────────────────────
  // Validates: Requirements 3.2

  it('CM filter returns only sheets created by that CM', fakeAsync(() => {
    component.dashboardStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    component.dashboardStartDate.setHours(0, 0, 0, 0);
    component.dashboardEndDate = new Date(now);
    component.dashboardEndDate.setHours(23, 59, 59, 999);

    component.dashboardCmFilter = 'cm-1';
    component.applyDashboardFilters();
    tick();

    // s1, s3 are created by cm-1 (Alice)
    expect(component.dashboardStreetSheets.length).toBe(2);
    component.dashboardStreetSheets.forEach(s => {
      expect(s.createdBy).toBe('cm-1');
    });
  }));

  // ── 6. selectStreetSheet() calls map methods ───────────────────────────────
  // Validates: Requirements 3.4

  it('selectStreetSheet() calls centerMapOnStreetSheet() and openStreetSheetPopup()', () => {
    const mockMapComponent = jasmine.createSpyObj('StreetSheetMapComponent', [
      'centerMapOnStreetSheet',
      'openStreetSheetPopup',
    ]);
    (component as any).streetSheetMapComponent = mockMapComponent;

    const sheet = testSheets[0];
    component.selectStreetSheet(sheet);

    expect(mockMapComponent.centerMapOnStreetSheet).toHaveBeenCalledWith(sheet);
    expect(mockMapComponent.openStreetSheetPopup).toHaveBeenCalledWith(sheet);
  });

  // ── 7. CM summary table pagination ─────────────────────────────────────────
  // Validates: Requirements 3.5

  it('pagedSubmitted returns the correct page of cmsWithEntries', () => {
    // Create 8 entries so we get 2 pages with pageSize 5
    component.cmsWithEntries = Array.from({ length: 8 }, (_, i) => ({
      user: { id: `cm-${i}`, name: `CM ${i}`, market: 'NV' },
      sheetCount: i + 1,
    })) as any[];
    component.submittedPageSize = 5;

    component.submittedPageIndex = 0;
    expect(component.pagedSubmitted.length).toBe(5);

    component.submittedPageIndex = 1;
    expect(component.pagedSubmitted.length).toBe(3);
  });

  it('pagedMissing returns the correct page of cmsWithoutEntries', () => {
    // Create 7 entries so we get 2 pages with pageSize 5
    component.cmsWithoutEntries = Array.from({ length: 7 }, (_, i) => ({
      user: { id: `cm-${i}`, name: `CM ${i}`, market: 'NV' },
      sheetCount: 0,
    })) as any[];
    component.missingPageSize = 5;

    component.missingPageIndex = 0;
    expect(component.pagedMissing.length).toBe(5);

    component.missingPageIndex = 1;
    expect(component.pagedMissing.length).toBe(2);
  });

  // ── 8. clearDashboardFilters() resets dropdown filters ─────────────────────
  // Validates: Requirements 3.3

  it('clearDashboardFilters() resets all dropdown filters to empty strings', fakeAsync(() => {
    component.dashboardStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    component.dashboardEndDate = new Date(now);

    // Set some filters
    component.dashboardVendorFilter = 'Acme';
    component.dashboardPmFilter = 'PM-Alpha';
    component.dashboardMarketFilter = 'NV';
    component.dashboardCmFilter = 'cm-1';

    component.clearDashboardFilters();
    tick();

    expect(component.dashboardVendorFilter).toBe('');
    expect(component.dashboardPmFilter).toBe('');
    expect(component.dashboardMarketFilter).toBe('');
    expect(component.dashboardCmFilter).toBe('');
  }));
});
