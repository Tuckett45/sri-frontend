import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

import { TechnicianFormComponent } from './technician-form.component';
import { Technician, TechnicianRole, EmploymentType, SkillLevel } from '../../../models/technician.model';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';

describe('TechnicianFormComponent', () => {
  let component: TechnicianFormComponent;
  let fixture: ComponentFixture<TechnicianFormComponent>;
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
      { id: 's1', name: 'Cat6', category: 'Cabling', level: SkillLevel.Intermediate }
    ],
    certifications: [],
    availability: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const initialState = {
    technicians: {
      ids: ['1'],
      entities: {
        '1': mockTechnician
      },
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TechnicianFormComponent ],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatStepperModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatChipsModule
      ],
      providers: [
        provideMockStore({ initialState }),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({})
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
    store.overrideSelector(TechnicianSelectors.selectTechnicianById('1'), mockTechnician);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TechnicianFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.technicianForm).toBeDefined();
    expect(component.basicInfoGroup.get('firstName')?.value).toBe('');
  });

  it('should validate required fields', () => {
    const firstNameControl = component.basicInfoGroup.get('firstName');
    expect(firstNameControl?.valid).toBeFalsy();
    
    firstNameControl?.setValue('John');
    expect(firstNameControl?.valid).toBeTruthy();
  });

  it('should validate email format', () => {
    const emailControl = component.basicInfoGroup.get('email');
    
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTruthy();
    
    emailControl?.setValue('valid@example.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('should validate phone format', () => {
    const phoneControl = component.basicInfoGroup.get('phone');
    
    phoneControl?.setValue('abc');
    expect(phoneControl?.hasError('invalidPhone')).toBeTruthy();
    
    phoneControl?.setValue('555-0100');
    expect(phoneControl?.hasError('invalidPhone')).toBeFalsy();
  });

  it('should add certification', () => {
    const initialLength = component.certificationsArray.length;
    component.addCertification();
    expect(component.certificationsArray.length).toBe(initialLength + 1);
  });

  it('should remove certification', () => {
    component.addCertification();
    const length = component.certificationsArray.length;
    component.removeCertification(0);
    expect(component.certificationsArray.length).toBe(length - 1);
  });

  it('should toggle unavailable dates', () => {
    const testDate = new Date('2024-02-15');
    
    component.onDateSelected(testDate);
    expect(component.selectedUnavailableDates.length).toBe(1);
    
    component.onDateSelected(testDate);
    expect(component.selectedUnavailableDates.length).toBe(0);
  });

  it('should populate form in edit mode', () => {
    component.populateForm(mockTechnician);
    
    expect(component.basicInfoGroup.get('firstName')?.value).toBe('John');
    expect(component.basicInfoGroup.get('lastName')?.value).toBe('Doe');
    expect(component.basicInfoGroup.get('email')?.value).toBe('john.doe@example.com');
  });

  it('should dispatch create action on submit in create mode', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    // Fill required fields
    component.basicInfoGroup.patchValue({
      technicianId: 'TECH002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '555-0200',
      role: TechnicianRole.Lead,
      employmentType: EmploymentType.W2,
      homeBase: 'Boston',
      region: 'Northeast'
    });
    
    component.onSubmit();
    
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should dispatch update action on submit in edit mode', () => {
    component.isEditMode = true;
    component.technicianId = '1';
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.basicInfoGroup.patchValue({
      technicianId: 'TECH001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-0100',
      role: TechnicianRole.Installer,
      employmentType: EmploymentType.W2,
      homeBase: 'New York',
      region: 'Northeast'
    });
    
    component.onSubmit();
    
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should not submit invalid form', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.onSubmit();
    
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should navigate on cancel', () => {
    component.onCancel();
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should return correct error messages', () => {
    const firstNameControl = component.basicInfoGroup.get('firstName');
    firstNameControl?.markAsTouched();
    
    const errorMessage = component.getErrorMessage('firstName', 'basicInfo');
    expect(errorMessage).toBe('This field is required');
  });
});
