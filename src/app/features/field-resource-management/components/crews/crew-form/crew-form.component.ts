import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Observable, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { takeUntil, filter, take, startWith, map } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { Crew, CrewStatus } from '../../../models/crew.model';
import { Technician } from '../../../models/technician.model';
import { CreateCrewDto, UpdateCrewDto } from '../../../models/dtos/crew.dto';
import * as CrewActions from '../../../state/crews/crew.actions';
import * as CrewSelectors from '../../../state/crews/crew.selectors';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import { AuthService } from '../../../../../services/auth.service';

/**
 * Crew Form Component
 * 
 * Create and edit crew records with lead technician and member management.
 * 
 * Features:
 * - Reactive form with comprehensive validation
 * - Lead technician selector
 * - Crew member management
 * - Market and company assignment
 * - Status management
 * - Create and edit modes
 * - Integration with NgRx store
 * 
 * Validation Rules:
 * - Name: Required, 3-100 characters
 * - Lead Technician: Required
 * - Market: Required
 * - Company: Required
 * - Status: Required, valid CrewStatus enum value
 * - Members: Cannot include lead technician
 * 
 * Requirements: 1.3.1-1.3.4, 6.2.1-6.2.5
 */
@Component({
  selector: 'frm-crew-form',
  templateUrl: './crew-form.component.html',
  styleUrls: ['./crew-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CrewFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  crewForm!: FormGroup;
  isEditMode = false;
  isLoading$ = this.store.select(CrewSelectors.selectCrewsLoading);
  error$ = this.store.select(CrewSelectors.selectCrewsError);
  crewId: string | null = null;
  
  // Enum references for template
  CrewStatus = CrewStatus;
  statusOptions = Object.values(CrewStatus);
  
  // Available technicians for selection
  availableTechnicians: Technician[] = [];
  private availableTechnicians$ = new BehaviorSubject<Technician[]>([]);
  selectedMemberIds: string[] = [];
  
  // Autocomplete search controls
  leadTechSearch = new FormControl('');
  memberSearch = new FormControl('');
  filteredLeadTechnicians$!: Observable<Technician[]>;
  filteredMemberTechnicians$!: Observable<Technician[]>;
  private leadTechSearchTrigger$ = new BehaviorSubject<string>('');
  private memberSearchTrigger$ = new BehaviorSubject<string>('');
  
  // Role-based fields
  isAdmin = false;
  availableMarkets: string[] = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  constructor(
    private fb: FormBuilder,
    @Optional() private route: ActivatedRoute,
    @Optional() private router: Router,
    private store: Store,
    private actions$: Actions,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    @Optional() public dialogRef: MatDialogRef<CrewFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: { crewId?: string }
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadTechnicians();
    
    // Check if opened as dialog with crew ID
    if (this.dialogData?.crewId) {
      this.isEditMode = true;
      this.crewId = this.dialogData.crewId;
      this.loadCrew(this.crewId);
      return;
    }
    
    // Check if edit mode or create mode via route
    if (this.route) {
      this.route.params
        .pipe(takeUntil(this.destroy$))
        .subscribe(params => {
          const id = params['id'];
          if (id && id !== 'new') {
            this.isEditMode = true;
            this.crewId = id;
            this.loadCrew(id);
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the form with validators
   */
  private initializeForm(): void {
    this.isAdmin = this.authService.isAdmin();
    const currentUser = this.authService.getUser();
    const userMarket = currentUser?.market || '';
    const userCompany = currentUser?.company || '';

    this.crewForm = this.fb.group({
      name: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      leadTechnicianId: ['', Validators.required],
      memberIds: [[], this.noLeadInMembersValidator()],
      market: [this.isAdmin ? '' : userMarket, Validators.required],
      company: [userCompany || 'Internal'],
      status: [CrewStatus.Available, [Validators.required, this.validCrewStatusValidator()]]
    });

    // Disable market field for non-admin users
    if (!this.isAdmin) {
      this.crewForm.get('market')?.disable();
    }

    // Re-validate memberIds when lead technician changes
    this.crewForm.get('leadTechnicianId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.crewForm.get('memberIds')?.updateValueAndValidity();
      });
  }

  /**
   * Load available technicians from store, filtered by crew market
   */
  private loadTechnicians(): void {
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));

    // Create a market stream that emits the current market value reactively
    const market$ = this.crewForm.get('market')!.valueChanges.pipe(
      startWith(this.crewForm.get('market')!.value)
    );

    // Combine technicians from store with current market to filter
    combineLatest([
      this.store.select(TechnicianSelectors.selectAllTechnicians),
      market$
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(([technicians, market]) => {
        this.availableTechnicians = [...technicians].sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        );
        this.availableTechnicians$.next(this.availableTechnicians);

        // Update or clear lead technician display based on filtered list
        const leadId = this.crewForm.get('leadTechnicianId')?.value;
        if (leadId) {
          const leadTech = this.availableTechnicians.find(t => t.id === leadId);
          if (leadTech) {
            // Update display text in case it wasn't set yet (race condition on edit)
            this.leadTechSearch.setValue(`${leadTech.firstName} ${leadTech.lastName}`, { emitEvent: false });
          } else {
            this.crewForm.patchValue({ leadTechnicianId: '' });
            this.leadTechSearch.setValue('');
          }
        }
        const validMemberIds = this.selectedMemberIds.filter(id =>
          this.availableTechnicians.find(t => t.id === id)
        );
        if (validMemberIds.length !== this.selectedMemberIds.length) {
          this.selectedMemberIds = validMemberIds;
          this.crewForm.patchValue({ memberIds: validMemberIds });
        }
      });

    // Setup filtered observables for autocomplete
    // Use combineLatest with availableTechnicians$ so the list updates when technicians change
    // leadTechSearchTrigger$ emits on both valueChanges and focus events
    this.leadTechSearch.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(value => this.leadTechSearchTrigger$.next(value || ''));

    this.memberSearch.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(value => this.memberSearchTrigger$.next(value || ''));

    this.filteredLeadTechnicians$ = combineLatest([
      this.leadTechSearchTrigger$,
      this.availableTechnicians$
    ]).pipe(
      map(([value, technicians]) => this.filterTechnicians(value || '', technicians))
    );

    this.filteredMemberTechnicians$ = combineLatest([
      this.memberSearchTrigger$,
      this.availableTechnicians$
    ]).pipe(
      map(([value, technicians]) => {
        const leadTechnicianId = this.crewForm.get('leadTechnicianId')?.value;
        const members = technicians.filter(tech => tech.id !== leadTechnicianId);
        return this.filterTechnicians(value || '', members);
      })
    );
  }

  /**
   * Filter technicians by search text (name, id, or role)
   */
  private filterTechnicians(searchText: string, technicians: Technician[]): Technician[] {
    if (!searchText) return technicians;
    const term = searchText.toLowerCase();
    return technicians.filter(t =>
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(term) ||
      t.id.toLowerCase().includes(term) ||
      t.role.toLowerCase().includes(term)
    );
  }

  /**
   * Load crew for editing
   */
  private loadCrew(id: string): void {
    this.store.dispatch(CrewActions.selectCrew({ id }));
    
    this.store.select(CrewSelectors.selectSelectedCrew)
      .pipe(
        takeUntil(this.destroy$),
        filter(crew => !!crew)
      )
      .subscribe(crew => {
        if (crew) {
          this.populateForm(crew);
        }
      });
  }

  /**
   * Populate form with crew data
   */
  private populateForm(crew: Crew): void {
    this.selectedMemberIds = [...(crew.memberIds ?? [])];
    
    this.crewForm.patchValue({
      name: crew.name,
      leadTechnicianId: crew.leadTechnicianId,
      memberIds: crew.memberIds,
      market: crew.market,
      company: crew.company,
      status: crew.status
    });

    // Set lead technician search display value
    const leadTech = this.availableTechnicians.find(t => t.id === crew.leadTechnicianId);
    if (leadTech) {
      this.leadTechSearch.setValue(`${leadTech.firstName} ${leadTech.lastName}`, { emitEvent: false });
    }
  }


  /**
   * Handle lead technician search field focus — triggers dropdown to show
   */
  onLeadTechFocus(): void {
    this.leadTechSearchTrigger$.next(this.leadTechSearch.value || '');
  }

  /**
   * Handle member search field focus — triggers dropdown to show
   */
  onMemberSearchFocus(): void {
    this.memberSearchTrigger$.next(this.memberSearch.value || '');
  }

  /**
   * Handle lead technician selection change
   */
  onLeadTechnicianChange(technicianId: string): void {
    // If lead technician is in members list, remove them
    if (this.selectedMemberIds.includes(technicianId)) {
      this.selectedMemberIds = this.selectedMemberIds.filter(id => id !== technicianId);
      this.crewForm.patchValue({ memberIds: this.selectedMemberIds });
    }
  }

  /**
   * Handle lead technician selected from autocomplete
   */
  onLeadTechnicianSelected(event: any): void {
    const technicianId = event.option.value;
    this.crewForm.patchValue({ leadTechnicianId: technicianId });
    this.onLeadTechnicianChange(technicianId);
    // Update the display text
    const tech = this.availableTechnicians.find(t => t.id === technicianId);
    this.leadTechSearch.setValue(tech ? `${tech.firstName} ${tech.lastName}` : '', { emitEvent: false });
  }

  /**
   * Handle member technician selected from autocomplete
   */
  onMemberTechnicianSelected(event: any): void {
    const technicianId = event.option.value;
    const leadTechnicianId = this.crewForm.get('leadTechnicianId')?.value;
    
    // Don't add if it's the lead or already selected
    if (technicianId === leadTechnicianId || this.selectedMemberIds.includes(technicianId)) {
      this.memberSearch.setValue('');
      return;
    }
    
    this.selectedMemberIds = [...this.selectedMemberIds, technicianId];
    this.crewForm.patchValue({ memberIds: this.selectedMemberIds });
    this.memberSearch.setValue('');
  }

  /**
   * Display function for lead technician autocomplete
   */
  displayLeadTechnician = (technicianId: string): string => {
    if (!technicianId) return '';
    const tech = this.availableTechnicians.find(t => t.id === technicianId);
    return tech ? `${tech.firstName} ${tech.lastName}` : '';
  }

  /**
   * Handle crew member selection change
   */
  onMemberSelectionChange(technicianIds: string[]): void {
    const leadTechnicianId = this.crewForm.get('leadTechnicianId')?.value;
    
    // Ensure lead technician is not in members list
    this.selectedMemberIds = technicianIds.filter(id => id !== leadTechnicianId);
    this.crewForm.patchValue({ memberIds: this.selectedMemberIds });
  }

  /**
   * Get available technicians for member selection (excluding lead)
   */
  get availableMemberTechnicians(): Technician[] {
    const leadTechnicianId = this.crewForm.get('leadTechnicianId')?.value;
    return this.availableTechnicians
      .filter(tech => tech.id !== leadTechnicianId)
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }

  /**
   * Get technician display name
   */
  getTechnicianDisplayName(technicianId: string): string {
    const technician = this.availableTechnicians.find(t => t.id === technicianId);
    return technician ? `${technician.firstName} ${technician.lastName}` : '';
  }

  /**
   * Get technician by ID
   */
  getTechnicianById(technicianId: string): Technician | undefined {
    return this.availableTechnicians.find(t => t.id === technicianId);
  }

  /**
   * Remove a specific member from the crew
   */
  removeMember(technicianId: string): void {
    this.selectedMemberIds = this.selectedMemberIds.filter(id => id !== technicianId);
    this.crewForm.patchValue({ memberIds: this.selectedMemberIds });
  }

  /**
   * Clear all crew members
   */
  clearAllMembers(): void {
    this.selectedMemberIds = [];
    this.crewForm.patchValue({ memberIds: [] });
  }

  /**
   * Submit form
   */
  onSubmit(): void {
    if (this.crewForm.invalid) {
      this.markFormGroupTouched(this.crewForm);
      this.snackBar.open('Please fix form errors before submitting', 'Close', { duration: 3000 });
      return;
    }

    const formValue = this.crewForm.getRawValue(); // getRawValue to include disabled fields

    if (this.isEditMode && this.crewId) {
      this.updateCrew(formValue);
    } else {
      this.createCrew(formValue);
    }
  }


  /**
   * Create new crew
   */
  private createCrew(formValue: any): void {
    const createDto: CreateCrewDto = {
      name: formValue.name,
      leadTechnicianId: formValue.leadTechnicianId,
      memberIds: formValue.memberIds || [],
      market: formValue.market,
      company: formValue.company,
      status: formValue.status
    };

    this.store.dispatch(CrewActions.createCrew({ crew: createDto }));
    
    // Subscribe to success action
    this.actions$.pipe(
      ofType(CrewActions.createCrewSuccess),
      takeUntil(this.destroy$),
      take(1)
    ).subscribe(() => {
      this.snackBar.open('Crew created successfully', 'Close', { duration: 3000 });
      if (this.dialogRef) {
        this.dialogRef.close({ success: true });
      } else {
        this.router.navigate(['/field-resource-management/crews']);
      }
    });
    
    // Subscribe to failure action
    this.actions$.pipe(
      ofType(CrewActions.createCrewFailure),
      takeUntil(this.destroy$),
      take(1)
    ).subscribe(({ error }) => {
      this.snackBar.open(`Failed to create crew: ${error}`, 'Close', { duration: 5000 });
    });
  }

  /**
   * Update existing crew
   */
  private updateCrew(formValue: any): void {
    if (!this.crewId) return;

    const updateDto: UpdateCrewDto = {
      name: formValue.name,
      leadTechnicianId: formValue.leadTechnicianId,
      memberIds: formValue.memberIds || [],
      market: formValue.market,
      company: formValue.company,
      status: formValue.status
    };

    this.store.dispatch(CrewActions.updateCrew({ id: this.crewId, crew: updateDto }));
    
    // Subscribe to success action
    this.actions$.pipe(
      ofType(CrewActions.updateCrewSuccess),
      takeUntil(this.destroy$),
      take(1)
    ).subscribe(() => {
      this.snackBar.open('Crew updated successfully', 'Close', { duration: 3000 });
      this.router.navigate(['/field-resource-management/crews', this.crewId]);
    });
    
    // Subscribe to failure action
    this.actions$.pipe(
      ofType(CrewActions.updateCrewFailure),
      takeUntil(this.destroy$),
      take(1)
    ).subscribe(({ error }) => {
      this.snackBar.open(`Failed to update crew: ${error}`, 'Close', { duration: 5000 });
    });
  }

  /**
   * Cancel and go back
   */
  onCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
      return;
    }
    if (this.isEditMode && this.crewId) {
      this.router.navigate(['/field-resource-management/crews', this.crewId]);
    } else {
      this.router.navigate(['/field-resource-management/crews']);
    }
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }


  /**
   * Get form control for template access
   */
  getControl(path: string) {
    return this.crewForm.get(path);
  }

  /**
   * Check if field has error
   */
  hasError(path: string, errorType: string): boolean {
    const control = this.crewForm.get(path);
    return !!(control && control.hasError(errorType) && (control.dirty || control.touched));
  }

  /**
   * Get error message for field
   */
  getErrorMessage(path: string): string {
    const control = this.crewForm.get(path);
    if (!control || !control.errors) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('minlength')) {
      const minLength = control.errors['minlength'].requiredLength;
      return `Minimum length is ${minLength} characters`;
    }
    if (control.hasError('maxlength')) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Maximum length is ${maxLength} characters`;
    }
    if (control.hasError('leadInMembers')) {
      return 'Lead technician cannot be included in crew members';
    }
    if (control.hasError('invalidStatus')) {
      return 'Please select a valid crew status';
    }

    return 'Invalid value';
  }

  /**
   * Format technician skills for display (first 2 skills)
   */
  formatTechnicianSkills(tech: Technician): string {
    return '';
  }

  /**
   * Custom validator: Ensure memberIds doesn't include lead technician
   */
  private noLeadInMembersValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;
      
      const leadTechnicianId = control.parent.get('leadTechnicianId')?.value;
      const memberIds = control.value as string[];
      
      if (!leadTechnicianId || !memberIds || memberIds.length === 0) {
        return null;
      }
      
      if (memberIds.includes(leadTechnicianId)) {
        return { leadInMembers: true };
      }
      
      return null;
    };
  }

  /**
   * Custom validator: Ensure status is a valid CrewStatus enum value
   */
  private validCrewStatusValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const validStatuses = Object.values(CrewStatus);
      if (!validStatuses.includes(control.value)) {
        return { invalidStatus: true };
      }
      
      return null;
    };
  }

  /**
   * Get form title
   */
  get formTitle(): string {
    return this.isEditMode ? 'Edit Crew' : 'Create New Crew';
  }

  /**
   * Get submit button text
   */
  get submitButtonText(): string {
    return this.isEditMode ? 'Update Crew' : 'Create Crew';
  }
}
