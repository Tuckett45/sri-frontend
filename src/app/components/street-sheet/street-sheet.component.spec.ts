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

    // Bootstrap as admin with dates set
    component.isAdmin = true;
    component.dashboardStartDate = new Date('2025-06-01');
    component.dashboardEndDate = new Date('2025-06-30');
    component.streetSheets = [];

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

  it('default dashboardStartDate is today at 00:00:00', () => {
    fixture.detectChanges(); // trigger ngOnInit

    const today = new Date();
    expect(component.dashboardStartDate.getFullYear()).toBe(today.getFullYear());
    expect(component.dashboardStartDate.getMonth()).toBe(today.getMonth());
    expect(component.dashboardStartDate.getDate()).toBe(today.getDate());
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
