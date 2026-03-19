import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TechnicianListComponent } from './technician-list.component';
import { Technician, TechnicianRole, EmploymentType, SkillLevel } from '../../../models/technician.model';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';

describe('TechnicianListComponent', () => {
  let component: TechnicianListComponent;
  let fixture: ComponentFixture<TechnicianListComponent>;
  let store: MockStore;

  const mockTechnicians: Technician[] = [
    {
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
      certifications: [],
      availability: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      technicianId: 'TECH002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '555-0200',
      role: TechnicianRole.Lead,
      employmentType: EmploymentType.W2,
      homeBase: 'Boston',
      region: 'Northeast',
      skills: [
        { id: 's3', name: 'OSHA10', category: 'Safety', level: SkillLevel.Beginner }
      ],
      certifications: [],
      availability: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const initialState = {
    technicians: {
      ids: ['1', '2'],
      entities: {
        '1': mockTechnicians[0],
        '2': mockTechnicians[1]
      },
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TechnicianListComponent ],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule,
        RouterTestingModule,
        MatTableModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatIconModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatTooltipModule,
        MatProgressSpinnerModule
      ],
      providers: [
        provideMockStore({ initialState })
      ]
    })
    .compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(TechnicianSelectors.selectFilteredTechnicians, mockTechnicians);
    store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, false);
    store.overrideSelector(TechnicianSelectors.selectTechniciansError, null);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TechnicianListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display technicians in table', () => {
    const compiled = fixture.nativeElement;
    const rows = compiled.querySelectorAll('tr.mat-row');
    expect(rows.length).toBe(2);
  });

  it('should dispatch loadTechnicians action on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should apply search filter with debounce', (done) => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.searchControl.setValue('John');
    
    setTimeout(() => {
      expect(dispatchSpy).toHaveBeenCalled();
      done();
    }, 350);
  });

  it('should get full name correctly', () => {
    const fullName = component.getFullName(mockTechnicians[0]);
    expect(fullName).toBe('John Doe');
  });

  it('should get skill names correctly', () => {
    const skillNames = component.getSkillNames(mockTechnicians[0]);
    expect(skillNames).toEqual(['Cat6', 'Fiber Splicing']);
  });

  it('should return correct status', () => {
    expect(component.getCurrentStatus(mockTechnicians[0])).toBe('Active');
    const inactiveTech = { ...mockTechnicians[0], isActive: false };
    expect(component.getCurrentStatus(inactiveTech)).toBe('Inactive');
  });

  it('should clear filters', () => {
    component.searchControl.setValue('test');
    component.roleControl.setValue(TechnicianRole.Installer);
    component.clearFilters();
    
    expect(component.searchControl.value).toBe('');
    expect(component.roleControl.value).toBe('');
  });

  it('should handle page change', () => {
    const event = { pageIndex: 1, pageSize: 25, length: 100 };
    component.onPageChange(event);
    
    expect(component.pageIndex).toBe(1);
    expect(component.pageSize).toBe(25);
  });

  it('should dispatch toggle status action', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.toggleTechnicianStatus(mockTechnicians[0]);
    
    expect(dispatchSpy).toHaveBeenCalled();
  });
});
