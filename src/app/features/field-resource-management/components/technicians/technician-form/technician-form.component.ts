import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter, skip, take } from 'rxjs/operators';
import { Technician, TechnicianRole, Skill, SkillLevel, Certification } from '../../../models/technician.model';
import { CreateTechnicianDto, UpdateTechnicianDto } from '../../../models/dtos/technician.dto';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';

@Component({
  selector: 'app-technician-form',
  templateUrl: './technician-form.component.html',
  styleUrls: ['./technician-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TechnicianFormComponent implements OnInit, OnDestroy {
  technicianForm!: FormGroup;
  isEditMode = false;
  technicianId: string | null = null;
  serverError$!: Observable<string | null>;
  submitting = false;

  // Available options
  roles = Object.values(TechnicianRole);

  // Available skills for selection
  availableSkills: Skill[] = [
    { id: 's1', name: 'Cat6', category: 'Cabling', level: SkillLevel.Intermediate },
    { id: 's2', name: 'Fiber Splicing', category: 'Fiber', level: SkillLevel.Intermediate },
    { id: 's3', name: 'OSHA10', category: 'Safety', level: SkillLevel.Intermediate },
    { id: 's4', name: 'Ladder Safety', category: 'Safety', level: SkillLevel.Intermediate },
    { id: 's5', name: 'Confined Space', category: 'Safety', level: SkillLevel.Intermediate }
  ];

  // Calendar selection for availability
  selectedUnavailableDates: Date[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private store: Store
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.serverError$ = this.store.select(TechnicianSelectors.selectTechniciansError);

    // Check if we're in edit mode
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        filter(params => params['id'])
      )
      .subscribe(params => {
        this.isEditMode = true;
        this.technicianId = params['id'];
        if (this.technicianId) {
          this.loadTechnician(this.technicianId);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForm(): void {
    this.technicianForm = this.fb.group({
      basicInfo: this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, this.phoneValidator]],
        role: ['', Validators.required],
        region: ['', Validators.required],
        isAvailable: [true]
      }),
      skills: this.fb.group({
        selectedSkills: [[]]
      }),
      certifications: this.fb.array([]),
      availability: this.fb.group({
        unavailableDates: [[]]
      })
    });
  }

  loadTechnician(id: string): void {
    this.store.select(TechnicianSelectors.selectTechnicianById(id))
      .pipe(
        takeUntil(this.destroy$),
        filter(tech => !!tech)
      )
      .subscribe(technician => {
        if (technician) {
          this.populateForm(technician);
        }
      });
  }

  populateForm(technician: Technician): void {
    this.basicInfoGroup.patchValue({
      firstName: technician.firstName,
      lastName: technician.lastName,
      email: technician.email,
      phone: technician.phone,
      role: technician.role,
      region: technician.region
    });
  }

  get basicInfoGroup(): FormGroup {
    return this.technicianForm.get('basicInfo') as FormGroup;
  }

  get skillsGroup(): FormGroup {
    return this.technicianForm.get('skills') as FormGroup;
  }

  get certificationsArray(): FormArray {
    return this.technicianForm.get('certifications') as FormArray;
  }

  get availabilityGroup(): FormGroup {
    return this.technicianForm.get('availability') as FormGroup;
  }

  createCertificationGroup(cert?: Certification): FormGroup {
    return this.fb.group({
      id: [cert?.id || null],
      name: [cert?.name || '', Validators.required],
      issueDate: [cert?.issueDate || null, Validators.required],
      expirationDate: [cert?.expirationDate || null, Validators.required]
    });
  }

  addCertification(cert?: Certification): void {
    this.certificationsArray.push(this.createCertificationGroup(cert));
  }

  removeCertification(index: number): void {
    this.certificationsArray.removeAt(index);
  }

  onDateSelected(date: Date | null): void {
    if (!date) return;
    const dateIndex = this.selectedUnavailableDates.findIndex(d =>
      d.getTime() === date.getTime()
    );

    if (dateIndex >= 0) {
      this.selectedUnavailableDates.splice(dateIndex, 1);
    } else {
      this.selectedUnavailableDates.push(date);
    }

    this.availabilityGroup.patchValue({
      unavailableDates: this.selectedUnavailableDates
    });
  }

  dateClass = (date: Date): string => {
    const isSelected = this.selectedUnavailableDates.some(d =>
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
    return isSelected ? 'selected-unavailable-date' : '';
  }

  phoneValidator(control: AbstractControl): { [key: string]: any } | null {
    const phoneRegex = /^[\d\s\-\(\)]+$/;
    if (control.value && !phoneRegex.test(control.value)) {
      return { invalidPhone: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.technicianForm.invalid) {
      this.markFormGroupTouched(this.technicianForm);
      return;
    }

    const formValue = this.technicianForm.value;

    if (this.isEditMode && this.technicianId) {
      this.updateTechnician(formValue);
    } else {
      this.createTechnician(formValue);
    }
  }

  createTechnician(formValue: any): void {
    const dto: CreateTechnicianDto = {
      firstName: formValue.basicInfo.firstName,
      lastName: formValue.basicInfo.lastName,
      email: formValue.basicInfo.email,
      phone: formValue.basicInfo.phone,
      role: formValue.basicInfo.role,
      region: formValue.basicInfo.region
    };

    this.submitting = true;
    this.store.dispatch(TechnicianActions.createTechnician({ technician: dto }));

    // Watch loading state: when loading goes from true back to false, check for errors
    this.store.select(TechnicianSelectors.selectTechniciansLoading).pipe(
      skip(1), // skip current value
      filter(loading => !loading), // wait for loading to become false
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.submitting = false;
      // Check if there's an error
      this.store.select(TechnicianSelectors.selectTechniciansError).pipe(
        take(1)
      ).subscribe(error => {
        if (!error) {
          this.router.navigate(['../'], { relativeTo: this.route });
        }
        // If error exists, form data is retained and error is displayed via serverError$
      });
    });
  }

  updateTechnician(formValue: any): void {
    const dto: UpdateTechnicianDto = {
      firstName: formValue.basicInfo.firstName,
      lastName: formValue.basicInfo.lastName,
      email: formValue.basicInfo.email,
      phone: formValue.basicInfo.phone,
      role: formValue.basicInfo.role,
      region: formValue.basicInfo.region
    };

    this.submitting = true;
    this.store.dispatch(TechnicianActions.updateTechnician({
      id: this.technicianId!,
      technician: dto
    }));

    // Watch loading state: when loading goes from true back to false, check for errors
    this.store.select(TechnicianSelectors.selectTechniciansLoading).pipe(
      skip(1),
      filter(loading => !loading),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.submitting = false;
      this.store.select(TechnicianSelectors.selectTechniciansError).pipe(
        take(1)
      ).subscribe(error => {
        if (!error) {
          this.router.navigate(['../../', this.technicianId], { relativeTo: this.route });
        }
      });
    });
  }

  onCancel(): void {
    if (this.isEditMode && this.technicianId) {
      this.router.navigate(['../../', this.technicianId], { relativeTo: this.route });
    } else {
      this.router.navigate(['../'], { relativeTo: this.route });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getErrorMessage(controlName: string, groupName?: string): string {
    const control = groupName
      ? this.technicianForm.get(groupName)?.get(controlName)
      : this.technicianForm.get(controlName);

    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('invalidPhone')) {
      return 'Please enter a valid phone number';
    }
    return '';
  }
}
