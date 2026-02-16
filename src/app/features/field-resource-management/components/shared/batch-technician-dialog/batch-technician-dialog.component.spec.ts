import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { BatchTechnicianDialogComponent } from './batch-technician-dialog.component';
import { Technician, TechnicianRole, EmploymentType } from '../../../models/technician.model';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';

describe('BatchTechnicianDialogComponent', () => {
  let component: BatchTechnicianDialogComponent;
  let fixture: ComponentFixture<BatchTechnicianDialogComponent>;
  let store: MockStore;
  let dialogRef: jasmine.SpyObj<MatDialogRef<BatchTechnicianDialogComponent>>;

  const mockTechnicians: Technician[] = [
    {
      id: '1',
      technicianId: 'TECH001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-0001',
      role: TechnicianRole.Installer,
      employmentType: EmploymentType.W2,
      homeBase: 'Office A',
      region: 'North',
      skills: [{ id: 's1', name: 'Cat6', category: 'Cabling' }],
      certifications: [],
      availability: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(async () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [BatchTechnicianDialogComponent],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        provideMockStore({
          selectors: [
            { selector: TechnicianSelectors.selectAllTechnicians, value: mockTechnicians },
            { selector: TechnicianSelectors.selectTechniciansLoading, value: false }
          ]
        }),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { selectedCount: 3 } }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<BatchTechnicianDialogComponent>>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BatchTechnicianDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with null technicianId', () => {
    expect(component.form.get('technicianId')?.value).toBeNull();
  });

  it('should require technicianId field', () => {
    const technicianIdControl = component.form.get('technicianId');
    expect(technicianIdControl?.hasError('required')).toBe(true);
    
    technicianIdControl?.setValue('1');
    expect(technicianIdControl?.hasError('required')).toBe(false);
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('should close dialog with result on confirm when form is valid', () => {
    component.form.patchValue({
      technicianId: '1'
    });

    component.onConfirm();
    expect(dialogRef.close).toHaveBeenCalledWith({
      technicianId: '1'
    });
  });

  it('should not close dialog on confirm when form is invalid', () => {
    component.form.patchValue({
      technicianId: null
    });

    component.onConfirm();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should format technician display name correctly', () => {
    const displayName = component.getTechnicianDisplayName(mockTechnicians[0]);
    expect(displayName).toBe('John Doe (Installer)');
  });

  it('should format technician skills correctly', () => {
    const skills = component.getTechnicianSkills(mockTechnicians[0]);
    expect(skills).toBe('Cat6');
  });

  it('should return "No skills listed" when technician has no skills', () => {
    const technicianWithoutSkills = { ...mockTechnicians[0], skills: [] };
    const skills = component.getTechnicianSkills(technicianWithoutSkills);
    expect(skills).toBe('No skills listed');
  });
});
