import { Component, Inject, Optional } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { catchError, of } from 'rxjs';
import {
  Technician,
  TechnicianRole,
  Skill,
  SkillLevel,
  Certification,
  Availability,
  ScreeningStatus
} from '../../../models/technician.model';
import { CreateTechnicianDto, UpdateTechnicianDto } from '../../../models/dtos/technician.dto';
import { GeocodingService } from 'src/app/services/geocoding.service';
import { StateAbbreviation } from 'src/app/models/state-abbreviation.enum';

/**
 * Data passed to the technician modal. When `technician` is present the modal
 * operates in edit mode; otherwise it creates a new technician.
 */
export interface AddTechnicianModalData {
  technician?: Technician;
  skills?: Skill[];
  certifications?: Certification[];
  availability?: Availability[];
}

/**
 * Result emitted when the modal is submitted. Mirrors the structure returned by
 * the Onboarding Candidate modal so the same data carries over to a Technician.
 */
export interface AddTechnicianModalResult {
  basicInfo: any;
  coreQualifications: any;
  badgesAccess: any;
  trainingCerts: any;
  equipmentKits: any;
  skills: Skill[];
  certifications: any[];
  unavailableDates: Date[];
}

@Component({
  selector: 'app-add-technician-modal',
  templateUrl: './add-technician-modal.component.html',
  styleUrls: ['./add-technician-modal.component.scss']
})
export class AddTechnicianModalComponent {
  vestSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
  roles = Object.values(TechnicianRole);

  // Available skills for selection (mirrors the routed technician form)
  availableSkills: Skill[] = [
    { id: 's1', name: 'Cat6', category: 'Cabling', level: SkillLevel.Intermediate },
    { id: 's2', name: 'Fiber Splicing', category: 'Fiber', level: SkillLevel.Intermediate },
    { id: 's3', name: 'OSHA10', category: 'Safety', level: SkillLevel.Intermediate },
    { id: 's4', name: 'Ladder Safety', category: 'Safety', level: SkillLevel.Intermediate },
    { id: 's5', name: 'Confined Space', category: 'Safety', level: SkillLevel.Intermediate }
  ];

  isEditMode = false;
  submitting = false;

  // Address autocomplete
  filteredAddresses: any[] = [];
  isAddressLoading = false;

  // Availability calendar selection
  selectedUnavailableDates: Date[] = [];

  basicInfoForm: FormGroup;
  coreQualificationsForm: FormGroup;
  badgesAccessForm: FormGroup;
  trainingCertsForm: FormGroup;
  equipmentKitsForm: FormGroup;
  skillsForm: FormGroup;
  certsFormGroup: FormGroup;
  certificationsArray: FormArray;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddTechnicianModalComponent>,
    private geocodingService: GeocodingService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: AddTechnicianModalData | null
  ) {
    const technician = data?.technician;
    this.isEditMode = !!technician;

    this.basicInfoForm = this.fb.group({
      firstName: [technician?.firstName || '', Validators.required],
      middleName: [technician?.middleName || ''],
      lastName: [technician?.lastName || '', Validators.required],
      email: [technician?.email || '', [Validators.required, Validators.email]],
      phone: [technician?.phone || '', [Validators.required, this.phoneValidator]],
      role: [technician?.role || '', Validators.required],
      region: [technician?.region || '', Validators.required],
      vestSize: [technician?.vestSize || 'L'],
      homeAddress: [technician?.homeAddress || ''],
      workSite: [technician?.workSite || ''],
      homeState: [technician?.homeState || ''],
      referredBy: [technician?.referredBy || ''],
      facebookProfileUrl: [technician?.facebookProfileUrl || ''],
      startDate: [this.parseStartDate(technician?.startDate)],
      isAvailable: [technician?.isAvailable ?? true]
    });

    this.coreQualificationsForm = this.fb.group({
      fiberExperience: [this.toBool(technician?.fiberExperience)],
      oshaCertification: [this.toBool(technician?.oshaCertified)],
      liftCertification: [this.toBool(technician?.liftCertification) || this.toBool(technician?.scissorLiftCertified)],
      travelAvailability: [this.toBool(technician?.travelAvailability) || this.toBool(technician?.willingToTravel)],
      shiftAvailability: [this.toBool(technician?.shiftAvailability)],
      backgroundCheckComplete: [this.screeningToBool(technician?.backgroundCheckStatus)],
      drugScreenComplete: [this.screeningToBool(technician?.drugScreenStatus)],
      militaryBackground: [this.toBool(technician?.militaryBackground) || this.toBool(technician?.isVeteran)]
    });

    this.badgesAccessForm = this.fb.group({
      attBadge: [this.toBool(technician?.attBadge)],
      lumenBadge: [this.toBool(technician?.lumenBadge) || this.toBool(technician?.comcastBadge)],
      attSupplierTraining: [this.toBool(technician?.attSupplierTraining)],
      cienaBasicTraining: [this.toBool(technician?.cienaBasicTraining)],
      googleRedBadge: [this.toBool(technician?.googleRedBadge)],
      googleLdap: [this.toBool(technician?.googleLdap)],
      metaGreenListing: [this.toBool(technician?.metaGreenListing)],
      metaBadge: [this.toBool(technician?.metaBadge)],
      workedAtMetaSite: [this.toBool(technician?.workedAtMetaSite)]
    });

    this.trainingCertsForm = this.fb.group({
      obsTraining: [this.toBool(technician?.obsTraining)],
      scissorLift: [this.toBool(technician?.scissorLiftCertified)],
      osha10: [this.toBool(technician?.osha10)],
      osha30: [this.toBool(technician?.osha30)],
      techHandTools: [this.toBool(technician?.techHandTools)],
      amaMetaTraining: [this.toBool(technician?.amaMetaTraining)],
      iesNeoTraining: [this.toBool(technician?.iesNeoTraining)]
    });

    this.equipmentKitsForm = this.fb.group({
      ciKitAssigned: [this.toBool(technician?.ciKitAssigned)],
      fiberKitAssigned: [this.toBool(technician?.fiberKitAssigned)],
      labelingKitAssigned: [this.toBool(technician?.labelingKitAssigned)],
      powerKitAssigned: [this.toBool(technician?.powerKitAssigned)],
      testingEquipmentAssigned: [this.toBool(technician?.testingEqptAssigned)]
    });

    this.skillsForm = this.fb.group({
      selectedSkills: [this.mapExistingSkills(data?.skills)]
    });

    this.certificationsArray = this.fb.array([]);
    this.certsFormGroup = this.fb.group({ certifications: this.certificationsArray });
    (data?.certifications || []).forEach(cert => this.addCertification(cert));

    this.selectedUnavailableDates = this.expandAvailabilityToDates(
      (data?.availability || []).filter(a => !a.isAvailable)
    );

    // Auto-populate homeState from homeAddress when the user hasn't manually set it
    this.basicInfoForm.get('homeAddress')?.valueChanges.subscribe((address: string) => {
      const homeStateCtrl = this.basicInfoForm.get('homeState');
      if (homeStateCtrl && !homeStateCtrl.value) {
        const extracted = this.extractStateFromAddress(address);
        if (extracted) {
          homeStateCtrl.setValue(extracted, { emitEvent: false });
        }
      }
    });
  }

  // --- Certifications FormArray helpers ---

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

  // --- Availability calendar ---

  onDateSelected(date: Date | null): void {
    if (!date) return;
    const dateIndex = this.selectedUnavailableDates.findIndex(d =>
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );

    if (dateIndex >= 0) {
      this.selectedUnavailableDates.splice(dateIndex, 1);
    } else {
      this.selectedUnavailableDates.push(date);
    }
    this.selectedUnavailableDates = [...this.selectedUnavailableDates];
  }

  dateClass = (date: Date): string => {
    const isUnavailable = this.selectedUnavailableDates.some(d =>
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
    if (isUnavailable) return 'selected-unavailable-date';
    const day = date.getDay();
    if (day > 0 && day < 6) return 'available-work-date';
    return '';
  }

  private expandAvailabilityToDates(records: Availability[]): Date[] {
    const dates: Date[] = [];
    for (const record of records) {
      if (record.startDate && record.endDate) {
        const start = new Date(record.startDate);
        const end = new Date(record.endDate);
        const current = new Date(start);
        while (current <= end) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
      } else if (record.date) {
        dates.push(new Date(record.date));
      }
    }
    return dates;
  }

  compareSkills = (a: Skill, b: Skill): boolean => {
    if (!a || !b) return a === b;
    return a.id === b.id || a.name === b.name;
  }

  private mapExistingSkills(skills?: Skill[]): Skill[] {
    if (!skills?.length) return [];
    return skills.map(s => this.availableSkills.find(a => a.name === s.name) || s);
  }

  // --- Address autocomplete ---

  onAddressInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    if (query && query.length > 5) {
      this.isAddressLoading = true;
      this.geocodingService.geocodeAddress(query).pipe(
        catchError(() => {
          this.isAddressLoading = false;
          return of({ results: [] });
        })
      ).subscribe((response: any) => {
        this.filteredAddresses = (response.results || []).map((result: any) => {
          const address = result.address_components || [];
          const streetNumber = address.find((c: any) => c.types.includes('street_number'))?.long_name || '';
          const route = address.find((c: any) => c.types.includes('route'))?.long_name || '';
          const streetAddress = `${streetNumber} ${route}`.trim();

          const city = address.find((c: any) => c.types.includes('locality'))?.long_name || '';
          const state = address.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name || '';
          const abbreviatedState = StateAbbreviation[state as keyof typeof StateAbbreviation] || state || '';
          const zip = address.find((c: any) => c.types.includes('postal_code'))?.long_name || '';

          const formattedAddress = [streetAddress, city, abbreviatedState, zip].filter(Boolean).join(', ');

          return { formattedAddress, streetAddress, city, state: abbreviatedState, zip, original: result };
        });
        this.isAddressLoading = false;
      });
    } else {
      this.filteredAddresses = [];
    }
  }

  selectAddress(suggestion: any): void {
    this.basicInfoForm.patchValue({
      homeAddress: suggestion.formattedAddress,
      homeState: suggestion.state
    });
    this.filteredAddresses = [];
  }

  private extractStateFromAddress(address: string): string {
    if (!address) return '';
    const match = address.match(/,\s*([A-Z]{2})[\s.]*(\d{5})?[.\s]*$/);
    return match ? match[1] : '';
  }

  // --- Value coercion helpers ---

  private toBool(value: any): boolean {
    if (value === true) return true;
    if (value === false) return false;
    if (typeof value === 'string') {
      const v = value.toLowerCase();
      if (v === 'true') return true;
      // Non-empty, non-"none"/"false" strings (e.g. fiberExperience enum) count as truthy
      return v !== '' && v !== 'false' && v !== 'none';
    }
    if (Array.isArray(value)) return value.length > 0;
    return false;
  }

  private screeningToBool(status: any): boolean {
    return status === 'pass';
  }

  private parseStartDate(dateStr: string | undefined): Date | string {
    if (!dateStr) return '';
    const dateOnlyMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      return new Date(+dateOnlyMatch[1], +dateOnlyMatch[2] - 1, +dateOnlyMatch[3]);
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? '' : parsed;
  }

  phoneValidator(control: AbstractControl): { [key: string]: any } | null {
    const phoneRegex = /^[\d\s\-\(\)]+$/;
    if (control.value && !phoneRegex.test(control.value)) {
      return { invalidPhone: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.submitting) return;

    if (this.basicInfoForm.invalid) {
      this.basicInfoForm.markAllAsTouched();
      return;
    }
    if (this.certificationsArray.invalid) {
      this.certificationsArray.markAllAsTouched();
      return;
    }

    this.submitting = true;

    const startDateValue = this.basicInfoForm.get('startDate')?.value;
    const startDate = startDateValue instanceof Date
      ? startDateValue.toISOString().split('T')[0]
      : (startDateValue || undefined);

    const result: AddTechnicianModalResult = {
      basicInfo: { ...this.basicInfoForm.value, startDate },
      coreQualifications: this.coreQualificationsForm.value,
      badgesAccess: this.badgesAccessForm.value,
      trainingCerts: this.trainingCertsForm.value,
      equipmentKits: this.equipmentKitsForm.value,
      skills: this.skillsForm.value.selectedSkills || [],
      certifications: this.certificationsArray.value || [],
      unavailableDates: this.selectedUnavailableDates
    };

    this.dialogRef.close(result);
  }

  /**
   * Maps the modal result into a Create/Update Technician DTO. Shared by the
   * technician-list and technician-detail callers so all captured onboarding
   * fields are persisted consistently.
   *
   * @param result   The value emitted when the modal is submitted
   * @param technicianId When provided, availability records are stamped with this id
   */
  static toDto(
    result: AddTechnicianModalResult,
    technicianId?: string
  ): CreateTechnicianDto & UpdateTechnicianDto {
    const basic = result.basicInfo;
    const core = result.coreQualifications;
    const badges = result.badgesAccess;
    const training = result.trainingCerts;
    const kits = result.equipmentKits;

    const toScreening = (complete: boolean): ScreeningStatus =>
      complete ? 'pass' : 'not_started';

    return {
      firstName: basic.firstName,
      lastName: basic.lastName,
      middleName: basic.middleName || undefined,
      email: basic.email,
      phone: basic.phone,
      role: basic.role,
      region: basic.region,
      isAvailable: basic.isAvailable ?? true,

      // Personal / logistics
      vestSize: basic.vestSize || undefined,
      homeAddress: basic.homeAddress || undefined,
      homeState: basic.homeState || undefined,
      workSite: basic.workSite || undefined,
      startDate: basic.startDate || undefined,
      referredBy: basic.referredBy || undefined,
      facebookProfileUrl: basic.facebookProfileUrl || undefined,

      // Core qualifications
      fiberExperience: !!core.fiberExperience,
      oshaCertified: !!core.oshaCertification,
      liftCertification: !!core.liftCertification,
      travelAvailability: !!core.travelAvailability,
      willingToTravel: !!core.travelAvailability,
      shiftAvailability: !!core.shiftAvailability,
      militaryBackground: !!core.militaryBackground,
      isVeteran: !!core.militaryBackground,
      backgroundCheckStatus: toScreening(!!core.backgroundCheckComplete),
      drugScreenStatus: toScreening(!!core.drugScreenComplete),

      // Badges & access
      attBadge: !!badges.attBadge,
      lumenBadge: !!badges.lumenBadge,
      comcastBadge: !!badges.lumenBadge,
      attSupplierTraining: !!badges.attSupplierTraining,
      cienaBasicTraining: !!badges.cienaBasicTraining,
      googleRedBadge: !!badges.googleRedBadge,
      googleLdap: !!badges.googleLdap,
      metaGreenListing: !!badges.metaGreenListing,
      metaBadge: !!badges.metaBadge,
      workedAtMetaSite: !!badges.workedAtMetaSite,

      // Training & certs
      obsTraining: !!training.obsTraining,
      scissorLiftCertified: !!training.scissorLift,
      osha10: !!training.osha10,
      osha30: !!training.osha30,
      techHandTools: !!training.techHandTools,
      amaMetaTraining: !!training.amaMetaTraining,
      iesNeoTraining: !!training.iesNeoTraining,

      // Equipment kits
      ciKitAssigned: !!kits.ciKitAssigned,
      fiberKitAssigned: !!kits.fiberKitAssigned,
      labelingKitAssigned: !!kits.labelingKitAssigned,
      powerKitAssigned: !!kits.powerKitAssigned,
      testingEqptAssigned: !!kits.testingEquipmentAssigned,

      // Technician-specific
      skills: result.skills || [],
      certifications: (result.certifications || []).map((cert: any) => ({
        name: cert.name,
        issueDate: cert.issueDate,
        expirationDate: cert.expirationDate
      })),
      availability: (result.unavailableDates || []).map(date => ({
        technicianId: technicianId || '',
        date,
        isAvailable: false,
        reason: 'PTO'
      }))
    };
  }
}
