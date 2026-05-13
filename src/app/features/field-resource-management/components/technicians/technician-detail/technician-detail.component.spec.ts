import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { TechnicianDetailComponent } from './technician-detail.component';
import { Technician, TechnicianRole, EmploymentType, CertificationStatus, SkillLevel } from '../../../models/technician.model';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';

describe('TechnicianDetailComponent', () => {
  let component: TechnicianDetailComponent;
  let fixture: ComponentFixture<TechnicianDetailComponent>;
  let store: MockStore;
  let router: Router;

  const mockTechnician: Technician = {
    id: '1',
    technicianId: 'TECH001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0100',
    role: TechnicianRole.Installer,
    employmentType: EmploymentType.W2,
    homeBase: 'New York',
    region: 'Northeast',
    skills: [
      { id: 's1', name: 'Cat6', category: 'Cabling', level: SkillLevel.Intermediate },
      { id: 's2', name: 'Fiber Splicing', category: 'Fiber', level: SkillLevel.Advanced }
    ],
    certifications: [
      {
        id: 'c1',
        name: 'OSHA10',
        issueDate: new Date('2023-01-01'),
        expirationDate: new Date('2025-01-01'),
        status: CertificationStatus.Active
      }
    ],
    availability: [
      {
        id: 'a1',
        technicianId: '1',
        date: new Date('2024-02-15'),
        isAvailable: false,
        reason: 'PTO'
      }
    ],
    isActive: true,
    canTravel: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const initialState = {
    technicians: {
      ids: ['1'],
      entities: {
        '1': mockTechnician
      },
      selectedId: '1',
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TechnicianDetailComponent ],
      imports: [
        NoopAnimationsModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatTableModule,
        MatChipsModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatTabsModule,
        MatTooltipModule,
        MatMenuModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideMockStore({ initialState }),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '1' })
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate')
          }
        }
      ]
    })
    .compileComponents();

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    store.overrideSelector(TechnicianSelectors.selectSelectedTechnician, mockTechnician);
    store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, false);
    store.overrideSelector(TechnicianSelectors.selectTechniciansError, null);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TechnicianDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display technician details', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('John Doe');
    expect(compiled.textContent).toContain('TECH001');
  });

  it('should get full name correctly', () => {
    const fullName = component.getFullName(mockTechnician);
    expect(fullName).toBe('John Doe');
  });

  it('should return correct certification status class', () => {
    expect(component.getCertificationStatusClass(CertificationStatus.Active)).toBe('status-active');
    expect(component.getCertificationStatusClass(CertificationStatus.ExpiringSoon)).toBe('status-expiring');
    expect(component.getCertificationStatusClass(CertificationStatus.Expired)).toBe('status-expired');
  });

  it('should identify unavailable dates', () => {
    component.unavailableDates = [new Date('2024-02-15')];
    const isUnavailable = component.isDateUnavailable(new Date('2024-02-15'));
    expect(isUnavailable).toBe(true);
  });

  it('should navigate back', () => {
    component.goBack();
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should navigate to edit', () => {
    component.technicianId = '1';
    component.editTechnician();
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should dispatch delete action on confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.deleteTechnician(mockTechnician);
    
    expect(dispatchSpy).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should not delete if not confirmed', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.deleteTechnician(mockTechnician);
    
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should load assignment history', () => {
    component.loadAssignmentHistory('1');
    expect(component.assignmentHistory.length).toBeGreaterThan(0);
  });

  it('should load performance metrics', () => {
    component.loadPerformanceMetrics('1');
    expect(component.performanceMetrics.utilizationRate).toBeGreaterThan(0);
  });
});
