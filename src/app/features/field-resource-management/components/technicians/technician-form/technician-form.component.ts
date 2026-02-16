import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { Technician, TechnicianRole, EmploymentType, Skill, Certification } from '../../../models/technician.model';
import { CreateTechnicianDto, UpdateTechnicianDto } from '../../../models/dtos/technician.dto';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';

@Component({
  selector: 'app-technician-form',
  templateUrl: './technician-form.component.html',
  styleUrls: ['./technician-form.component.scss']
})
export class TechnicianFormComponent implements OnInit, OnDestroy {
  technicianForm!: FormGroup;
  isEditMode = false;
  technicianId: string | null = null;
  
  // Available options
  roles = Object.values(TechnicianRole);
  employmentTypes = Object.values(EmploymentType);
  
  // Available skills (will be populated from store or API)
  availableSkills: Skill[] = [
    { id: 's1', name: 'Cat6', category: 'Cabling' },
    { id: 's2', name: 'Fiber Splicing', category: 'Fiber' },
    { id: 's3', name: 'OSHA10', category: 'Safety' },
    { id: 's4', name: 'Ladder Safety', category: 'Safety' },
    { id: 's5', name: 'Confined Space', category: 'Safety' }
  ];
  
  // Calendar selection
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
      // Step 1: Basic Info
      basicInfo: this.fb.group({
        technicianId: ['', Validators.required],
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, this.phoneValidator]],
        role: ['', Validators.required],
        employmentType: ['', Validators.required],
        homeBase: ['', Validators.required],
        region: ['', Validators.required],
        hourlyCostRate: [null]
      }),
      
      // Step 2: Skills
      skills: this.fb.group({
        selectedSkills: [[]]
      }),
      
      // Step 3: Certifications
      certifications: this.fb.array([]),
      
      // Step 4: Availability
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
    // Populate basic info
    this.basicInfoGroup.patchValue({
      technicianId: technician.technicianId,
      firstName: technician.firstName,
      lastName: technician.lastName,
      email: technician.email,
      phone: technician.phone,
      role: technician.role,
      employmentType: technician.employmentType,
      homeBase: technician.homeBase,
      region: technician.region,
      hourlyCostRate: technician.hourlyCostRate
    });
    
    // Populate skills
    this.skillsGroup.patchValue({
      selectedSkills: technician.skills
    });
    
    // Populate certifications
    technician.certifications.forEach(cert => {
      this.addCertification(cert);
    });
    
    // Populate availability
    const unavailableDates = technician.availability
      .filter(avail => !avail.isAvailable)
      .map(avail => new Date(avail.date));
    
    this.selectedUnavailableDates = unavailableDates;
    this.availabilityGroup.patchValue({
      unavailableDates: unavailableDates
    });
  }
  
  // Form group getters
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
  
  // Certification management
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
  
  // Date selection for availability
  onDateSelected(date: Date | null): void {
    if (!date) return;
    const dateIndex = this.selectedUnavailableDates.findIndex(d => 
      d.getTime() === date.getTime()
    );
    
    if (dateIndex >= 0) {
      // Date already selected, remove it
      this.selectedUnavailableDates.splice(dateIndex, 1);
    } else {
      // Add new date
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
  
  // Validators
  phoneValidator(control: AbstractControl): { [key: string]: any } | null {
    const phoneRegex = /^[\d\s\-\(\)]+$/;
    if (control.value && !phoneRegex.test(control.value)) {
      return { invalidPhone: true };
    }
    return null;
  }
  
  // Form submission
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
      ...formValue.basicInfo,
      skills: formValue.skills.selectedSkills,
      certifications: formValue.certifications,
      availability: this.selectedUnavailableDates.map(date => ({
        id: '',
        technicianId: '',
        date: date,
        isAvailable: false,
        reason: 'PTO'
      }))
    };
    
    this.store.dispatch(TechnicianActions.createTechnician({ technician: dto }));
    
    // Navigate back to list after a short delay (to allow action to complete)
    setTimeout(() => {
      this.router.navigate(['../'], { relativeTo: this.route });
    }, 500);
  }
  
  updateTechnician(formValue: any): void {
    const dto: UpdateTechnicianDto = {
      ...formValue.basicInfo,
      skills: formValue.skills.selectedSkills,
      certifications: formValue.certifications,
      availability: this.selectedUnavailableDates.map(date => ({
        id: '',
        technicianId: this.technicianId!,
        date: date,
        isAvailable: false,
        reason: 'PTO'
      }))
    };
    
    this.store.dispatch(TechnicianActions.updateTechnician({ 
      id: this.technicianId!, 
      technician: dto 
    }));
    
    // Navigate back to detail view
    setTimeout(() => {
      this.router.navigate(['../../', this.technicianId], { relativeTo: this.route });
    }, 500);
  }
  
  onCancel(): void {
    if (this.isEditMode && this.technicianId) {
      this.router.navigate(['../../', this.technicianId], { relativeTo: this.route });
    } else {
      this.router.navigate(['../'], { relativeTo: this.route });
    }
  }
  
  // Helper method to mark all controls as touched
  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  // Error message helpers
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
