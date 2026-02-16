import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UtilizationReportComponent } from './utilization-report.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TechnicianRole, EmploymentType } from '../../../models/technician.model';
import * as ReportingSelectors from '../../../state/reporting/reporting.selectors';
import * as ReportingActions from '../../../state/reporting/reporting.actions';

describe('UtilizationReportComponent', () => {
  let component: UtilizationReportComponent;
  let fixture: ComponentFixture<UtilizationReportComponent>;
  let store: MockStore;

  const mockUtilizationReport = {
    dateRange: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    },
    technicians: [
      {
        technician: {
          id: '1',
          technicianId: 'T001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0001',
          role: TechnicianRole.Installer,
          employmentType: EmploymentType.W2,
          homeBase: 'HQ',
          region: 'North',
          skills: [],
          certifications: [],
          availability: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        availableHours: 160,
        workedHours: 120,
        utilizationRate: 75,
        jobsCompleted: 10
      }
    ],
    averageUtilization: 75
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UtilizationReportComponent],
      imports: [
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        BrowserAnimationsModule
      ],
      providers: [
        provideMockStore({
          selectors: [
            { selector: ReportingSelectors.selectUtilizationReport, value: mockUtilizationReport },
            { selector: ReportingSelectors.selectReportingLoading, value: false },
            { selector: ReportingSelectors.selectReportingError, value: null }
          ]
        })
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(UtilizationReportComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set default date range on init', () => {
    fixture.detectChanges();
    expect(component.selectedDateRange).toBeTruthy();
    expect(component.selectedDateRange?.startDate).toBeDefined();
    expect(component.selectedDateRange?.endDate).toBeDefined();
  });

  it('should dispatch loadUtilization action on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    fixture.detectChanges();
    expect(dispatchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: '[Reporting] Load Utilization'
      })
    );
  });

  it('should update table data when report changes', () => {
    fixture.detectChanges();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.averageUtilization).toBe(75);
  });

  it('should update charts when report changes', () => {
    fixture.detectChanges();
    expect(component.utilizationChartLabels.length).toBeGreaterThan(0);
    expect(component.utilizationChartData.length).toBeGreaterThan(0);
  });

  it('should reload report when filters change', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    fixture.detectChanges();
    
    const newDateRange = {
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-28')
    };
    component.onDateRangeChange(newDateRange);
    
    expect(component.selectedDateRange).toEqual(newDateRange);
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should clear filters', () => {
    component.selectedTechnicianId = 'tech1';
    component.selectedRole = 'Installer';
    component.selectedRegion = 'North';
    
    component.clearFilters();
    
    expect(component.selectedTechnicianId).toBeNull();
    expect(component.selectedRole).toBeNull();
    expect(component.selectedRegion).toBeNull();
  });

  it('should return correct utilization status color', () => {
    expect(component.getUtilizationStatusColor(85)).toBe('primary');
    expect(component.getUtilizationStatusColor(65)).toBe('accent');
    expect(component.getUtilizationStatusColor(45)).toBe('warn');
  });
});
