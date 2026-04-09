import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TechnicianFormComponent } from './technician-form.component';
import { Technician, TechnicianRole, EmploymentType, SkillLevel } from '../../../models/technician.model';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';

describe('TechnicianFormComponent', () => {
  let component: TechnicianFormComponent;
  let fixture: ComponentFixture<TechnicianFormComponent>;
  let store: MockStore;
  let router: Router;

  const mockTechnician: Technician = {
    id: '1', technicianId: 'TECH001',
    firstName: 'John', lastName: 'Doe',
    email: 'john.doe@example.com', phone: '555-0100',
    role: TechnicianRole.Installer, employmentType: EmploymentType.W2,
    homeBase: 'New York', region: 'Northeast',
    skills: [{ id: 's1', name: 'Cat6', category: 'Cabling', level: SkillLevel.Intermediate }],
    certifications: [], availability: [],
    isActive: true, canTravel: false,
    createdAt: new Date(), updatedAt: new Date()
  };

  const initialState = {
    technicians: {
      ids: ['1'], entities: { '1': mockTechnician },
      selectedId: null, loading: false, error: null, filters: {}
    }
  };


  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TechnicianFormComponent],
      imports: [
        ReactiveFormsModule, NoopAnimationsModule, MatStepperModule,
        MatFormFieldModule, MatInputModule, MatSelectModule,
        MatDatepickerModule, MatNativeDateModule, MatButtonModule,
        MatIconModule, MatCardModule, MatChipsModule,
        MatCheckboxModule, MatTooltipModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideMockStore({ initialState }),
        { provide: ActivatedRoute, useValue: { params: of({}) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } }
      ]
    }).compileComponents();
    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    store.overrideSelector(TechnicianSelectors.selectTechnicianById('1'), mockTechnician);
    store.overrideSelector(TechnicianSelectors.selectTechniciansError, null);
    store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, false);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TechnicianFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillValidForm(): void {
    component.basicInfoGroup.patchValue({
      technicianId: 'TECH002', firstName: 'Jane', lastName: 'Smith',
      email: 'jane@example.com', phone: '555-0200',
      role: TechnicianRole.Lead, employmentType: EmploymentType.W2,
      homeBase: 'Boston', region: 'Northeast'
    });
  }

  it('should create', () => { expect(component).toBeTruthy(); });

  it('should initialize form with empty values', () => {
    expect(component.technicianForm).toBeDefined();
    expect(component.basicInfoGroup.get('firstName')?.value).toBe('');
  });

  // Req 8.1: all fields present
  it('should have all required form fields per Requirement 8.1', () => {
    const bi = component.basicInfoGroup;
    expect(bi.get('firstName')).toBeTruthy();
    expect(bi.get('lastName')).toBeTruthy();
    expect(bi.get('email')).toBeTruthy();
    expect(bi.get('phone')).toBeTruthy();
    expect(bi.get('role')).toBeTruthy();
    expect(bi.get('employmentType')).toBeTruthy();
    expect(bi.get('homeBase')).toBeTruthy();
    expect(bi.get('region')).toBeTruthy();
    expect(component.skillsGroup.get('selectedSkills')).toBeTruthy();
    expect(component.certificationsArray).toBeTruthy();
  });

  // Req 8.2: required field validation
  it('should validate firstName as required', () => {
    const c = component.basicInfoGroup.get('firstName');
    expect(c?.valid).toBeFalsy(); c?.setValue('John'); expect(c?.valid).toBeTruthy();
  });
  it('should validate lastName as required', () => {
    const c = component.basicInfoGroup.get('lastName');
    expect(c?.valid).toBeFalsy(); c?.setValue('Doe'); expect(c?.valid).toBeTruthy();
  });
  it('should validate email as required', () => {
    const c = component.basicInfoGroup.get('email');
    expect(c?.hasError('required')).toBeTruthy();
    c?.setValue('test@example.com'); expect(c?.hasError('required')).toBeFalsy();
  });
  it('should validate region as required', () => {
    const c = component.basicInfoGroup.get('region');
    expect(c?.hasError('required')).toBeTruthy();
    c?.setValue('Northeast'); expect(c?.hasError('required')).toBeFalsy();
  });
  it('should validate email format', () => {
    const c = component.basicInfoGroup.get('email');
    c?.setValue('invalid-email'); expect(c?.hasError('email')).toBeTruthy();
    c?.setValue('valid@example.com'); expect(c?.hasError('email')).toBeFalsy();
  });
  it('should not submit when required fields are empty', () => {
    const spy = spyOn(store, 'dispatch'); component.onSubmit(); expect(spy).not.toHaveBeenCalled();
  });

  // Req 8.6: phone format validation
  it('should validate phone format - reject non-numeric characters', () => {
    const c = component.basicInfoGroup.get('phone');
    c?.setValue('abc'); expect(c?.hasError('invalidPhone')).toBeTruthy();
    c?.setValue('555-0100'); expect(c?.hasError('invalidPhone')).toBeFalsy();
  });
  it('should accept valid phone formats', () => {
    const c = component.basicInfoGroup.get('phone');
    c?.setValue('(555) 123-4567'); expect(c?.hasError('invalidPhone')).toBeFalsy();
    c?.setValue('555 123 4567'); expect(c?.hasError('invalidPhone')).toBeFalsy();
  });

  // Req 8.3: create/update via NgRx
  it('should dispatch createTechnician action on submit in create mode', () => {
    const spy = spyOn(store, 'dispatch'); fillValidForm(); component.onSubmit();
    expect(spy).toHaveBeenCalled();
    expect(spy.calls.mostRecent().args[0].type).toBe(TechnicianActions.createTechnician.type);
  });
  it('should dispatch updateTechnician action on submit in edit mode', () => {
    component.isEditMode = true; component.technicianId = '1';
    const spy = spyOn(store, 'dispatch');
    component.basicInfoGroup.patchValue({
      technicianId: 'TECH001', firstName: 'John', lastName: 'Doe',
      email: 'john@example.com', phone: '555-0100',
      role: TechnicianRole.Installer, employmentType: EmploymentType.W2,
      homeBase: 'New York', region: 'Northeast'
    });
    component.onSubmit(); expect(spy).toHaveBeenCalled();
    expect(spy.calls.mostRecent().args[0].type).toBe(TechnicianActions.updateTechnician.type);
  });
  it('should navigate after successful create', () => {
    fillValidForm(); component.onSubmit();
    // Simulate loading: true (dispatch triggered) then false (complete, no error)
    store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, true);
    store.refreshState();
    store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, false);
    store.overrideSelector(TechnicianSelectors.selectTechniciansError, null);
    store.refreshState();
    expect(router.navigate).toHaveBeenCalled();
  });
  it('should navigate after successful update', () => {
    component.isEditMode = true; component.technicianId = '1';
    component.basicInfoGroup.patchValue({
      technicianId: 'TECH001', firstName: 'John', lastName: 'Doe',
      email: 'john@example.com', phone: '555-0100',
      role: TechnicianRole.Installer, employmentType: EmploymentType.W2,
      homeBase: 'New York', region: 'Northeast'
    });
    component.onSubmit();
    store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, true);
    store.refreshState();
    store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, false);
    store.overrideSelector(TechnicianSelectors.selectTechniciansError, null);
    store.refreshState();
    expect(router.navigate).toHaveBeenCalled();
  });


  // Req 8.4: error handling retains form data
  it('should retain form data on create failure and not navigate', () => {
    fillValidForm(); component.onSubmit();
    store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, false);
    store.overrideSelector(TechnicianSelectors.selectTechniciansError, 'Server error');
    store.refreshState();
    expect(component.basicInfoGroup.get('firstName')?.value).toBe('Jane');
    expect(component.basicInfoGroup.get('lastName')?.value).toBe('Smith');
    expect(component.basicInfoGroup.get('email')?.value).toBe('jane@example.com');
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('should retain form data on update failure and not navigate', () => {
    component.isEditMode = true; component.technicianId = '1';
    component.basicInfoGroup.patchValue({
      technicianId: 'TECH001', firstName: 'John', lastName: 'Updated',
      email: 'john@example.com', phone: '555-0100',
      role: TechnicianRole.Installer, employmentType: EmploymentType.W2,
      homeBase: 'New York', region: 'Northeast'
    });
    component.onSubmit();
    store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, false);
    store.overrideSelector(TechnicianSelectors.selectTechniciansError, 'Server error');
    store.refreshState();
    expect(component.basicInfoGroup.get('lastName')?.value).toBe('Updated');
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('should expose server error from store via serverError$', () => {
    store.overrideSelector(TechnicianSelectors.selectTechniciansError, 'Failed to create technician');
    store.refreshState(); fixture.detectChanges();
    let errorValue: string | null = null;
    component.serverError$.subscribe(err => errorValue = err);
    expect(errorValue).toBe('Failed to create technician' as any);
  });
  it('should set submitting flag during create submission', () => {
    expect(component.submitting).toBeFalse();
    fillValidForm(); component.onSubmit();
    expect(component.submitting).toBeTrue();
    // Simulate loading true → false to trigger the subscription
    store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, true);
    store.refreshState();
    store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, false);
    store.overrideSelector(TechnicianSelectors.selectTechniciansError, 'Server error');
    store.refreshState();
    expect(component.submitting).toBeFalse();
  });

  // Req 8.5: edit mode pre-populates form
  it('should populate all basic info fields in edit mode', () => {
    component.populateForm(mockTechnician);
    expect(component.basicInfoGroup.get('firstName')?.value).toBe('John');
    expect(component.basicInfoGroup.get('lastName')?.value).toBe('Doe');
    expect(component.basicInfoGroup.get('email')?.value).toBe('john.doe@example.com');
    expect(component.basicInfoGroup.get('phone')?.value).toBe('555-0100');
    expect(component.basicInfoGroup.get('role')?.value).toBe(TechnicianRole.Installer);
    expect(component.basicInfoGroup.get('employmentType')?.value).toBe(EmploymentType.W2);
    expect(component.basicInfoGroup.get('homeBase')?.value).toBe('New York');
    expect(component.basicInfoGroup.get('region')?.value).toBe('Northeast');
  });
  it('should populate skills in edit mode', () => {
    component.populateForm(mockTechnician);
    const skills = component.skillsGroup.get('selectedSkills')?.value;
    expect(skills.length).toBe(1); expect(skills[0].name).toBe('Cat6');
  });
  it('should display edit mode header when editing', () => {
    component.isEditMode = true;
    fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.form-header h2').textContent).toContain('Edit Technician');
  });
  it('should display create mode header when creating', () => {
    component.isEditMode = false;
    fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.form-header h2').textContent).toContain('Add New Technician');
  });

  // Certification and availability
  it('should add certification', () => {
    const len = component.certificationsArray.length;
    component.addCertification(); expect(component.certificationsArray.length).toBe(len + 1);
  });
  it('should remove certification', () => {
    component.addCertification(); const len = component.certificationsArray.length;
    component.removeCertification(0); expect(component.certificationsArray.length).toBe(len - 1);
  });
  it('should toggle unavailable dates', () => {
    const d = new Date('2024-02-15');
    component.onDateSelected(d); expect(component.selectedUnavailableDates.length).toBe(1);
    component.onDateSelected(d); expect(component.selectedUnavailableDates.length).toBe(0);
  });

  // Navigation and error messages
  it('should navigate on cancel', () => { component.onCancel(); expect(router.navigate).toHaveBeenCalled(); });
  it('should return correct error messages', () => {
    component.basicInfoGroup.get('firstName')?.markAsTouched();
    expect(component.getErrorMessage('firstName', 'basicInfo')).toBe('This field is required');
  });
  it('should return email error message for invalid email', () => {
    const c = component.basicInfoGroup.get('email');
    c?.setValue('bad-email'); c?.markAsTouched();
    expect(component.getErrorMessage('email', 'basicInfo')).toBe('Please enter a valid email address');
  });
  it('should return phone error message for invalid phone', () => {
    const c = component.basicInfoGroup.get('phone');
    c?.setValue('abc!@#'); c?.markAsTouched();
    expect(component.getErrorMessage('phone', 'basicInfo')).toBe('Please enter a valid phone number');
  });
});
