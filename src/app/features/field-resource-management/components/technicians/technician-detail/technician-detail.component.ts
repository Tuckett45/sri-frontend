import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, forkJoin, of } from 'rxjs';
import { takeUntil, filter, switchMap, take, catchError } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatCalendar } from '@angular/material/datepicker';
import { Technician, CertificationStatus, Skill, Certification, Availability } from '../../../models/technician.model';
import { TravelProfile } from '../../../models/travel.model';
import { TechnicianService } from '../../../services/technician.service';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';
import { selectTravelProfile } from '../../../state/travel/travel.selectors';

@Component({
  selector: 'app-technician-detail',
  templateUrl: './technician-detail.component.html',
  styleUrls: ['./technician-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TechnicianDetailComponent implements OnInit, OnDestroy {
  technician$: Observable<Technician | null | undefined>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  travelProfile$!: Observable<TravelProfile | null>;
  
  technicianId: string | null = null;
  
  @ViewChild(MatCalendar) calendar!: MatCalendar<Date>;
  
  // Tab management
  selectedTabIndex = 0;
  
  // For calendar display
  selectedDate: Date = new Date();
  unavailableDates: Date[] = [];
  
  // Fetched detail data
  technicianSkills: Skill[] = [];
  technicianCertifications: Certification[] = [];

  assignmentHistory: any[] = [];
  performanceMetrics = {
    utilizationRate: 0,
    jobsCompleted: 0
  };
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private dialog: MatDialog,
    private technicianService: TechnicianService,
    private cdr: ChangeDetectorRef
  ) {
    this.technician$ = this.store.select(TechnicianSelectors.selectSelectedTechnician);
    this.loading$ = this.store.select(TechnicianSelectors.selectTechniciansLoading);
    this.error$ = this.store.select(TechnicianSelectors.selectTechniciansError);
  }
  
  ngOnInit(): void {
    // Get technician ID from route params
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        filter(params => params['id'])
      )
      .subscribe(params => {
        this.technicianId = params['id'];
        this.store.dispatch(TechnicianActions.selectTechnician({ id: this.technicianId }));
        // Setup travel profile observable for the travel tab
        this.travelProfile$ = this.store.select(selectTravelProfile(this.technicianId!));
      });
    
    // Load technician data and populate details
    this.technician$
      .pipe(
        takeUntil(this.destroy$),
        filter(tech => !!tech)
      )
      .subscribe(technician => {
        if (technician) {
          // Use embedded data from the store entity if available
          if (technician.skills && technician.skills.length > 0) {
            this.technicianSkills = technician.skills;
          }
          if (technician.certifications && technician.certifications.length > 0) {
            this.technicianCertifications = technician.certifications.map(cert => ({
              ...cert,
              issueDate: new Date(cert.issueDate),
              expirationDate: new Date(cert.expirationDate)
            }));
          }
          if (technician.availability && technician.availability.length > 0) {
            this.unavailableDates = this.expandAvailabilityToDates(
              technician.availability.filter(a => !a.isAvailable)
            );
          }

          // Always fetch full details from API since list endpoint doesn't include skills/certs/availability
          this.loadTechnicianDetails(technician.id);

          this.loadAssignmentHistory(technician.id);
          this.loadPerformanceMetrics(technician.id);
          this.cdr.markForCheck();
          // Force calendar to re-evaluate dateClass
          if (this.calendar) {
            this.calendar.updateTodaysDate();
          }
        }
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private detailsLoadedForId: string | null = null;

  loadTechnicianDetails(technicianId: string): void {
    // Avoid re-fetching if already loaded for this technician
    if (this.detailsLoadedForId === technicianId) return;
    this.detailsLoadedForId = technicianId;

    const now = new Date();
    const dateRange = {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 6, 0)
    };

    // Only fetch what we don't already have from the store
    const skills$ = this.technicianSkills.length > 0
      ? of(this.technicianSkills)
      : this.technicianService.getTechnicianSkills(technicianId).pipe(
          catchError(err => { console.error('Failed to load skills:', err); return of([] as Skill[]); })
        );

    const certs$ = this.technicianCertifications.length > 0
      ? of(this.technicianCertifications)
      : this.technicianService.getTechnicianCertifications(technicianId).pipe(
          catchError(err => { console.error('Failed to load certifications:', err); return of([] as Certification[]); })
        );

    const availability$ = this.unavailableDates.length > 0
      ? of([] as Availability[])
      : this.technicianService.getTechnicianAvailability(technicianId, dateRange).pipe(
          catchError(err => { console.error('Failed to load availability:', err); return of([] as Availability[]); })
        );

    forkJoin({
      skills: skills$,
      certifications: certs$,
      availability: availability$
    }).pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ skills, certifications, availability }) => {
        if (skills.length > 0 && this.technicianSkills.length === 0) {
          this.technicianSkills = skills;
        }
        if (certifications.length > 0 && this.technicianCertifications.length === 0) {
          this.technicianCertifications = certifications.map(cert => ({
            ...cert,
            issueDate: new Date(cert.issueDate),
            expirationDate: new Date(cert.expirationDate)
          }));
        }
        if (availability.length > 0 && this.unavailableDates.length === 0) {
          this.unavailableDates = this.expandAvailabilityToDates(
            availability.filter(a => !a.isAvailable)
          );
        }

        this.cdr.markForCheck();
        // Force calendar to re-evaluate dateClass with new availability data
        if (this.calendar) {
          this.calendar.updateTodaysDate();
        }
      }
    });
  }

  loadAssignmentHistory(technicianId: string): void {
    // TODO: Dispatch action to load assignment history from API
    this.assignmentHistory = [];
  }
  
  loadPerformanceMetrics(technicianId: string): void {
    // TODO: Dispatch action to load performance metrics from API
    this.performanceMetrics = {
      utilizationRate: 0,
      jobsCompleted: 0
    };
  }

  /**
   * Expand availability records into individual dates.
   * Handles both single-date (date field) and date-range (startDate/endDate) formats.
   */
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
  
  getFullName(technician: Technician): string {
    return `${technician.firstName} ${technician.lastName}`;
  }
  
  getCertificationStatusClass(status: CertificationStatus): string {
    switch (status) {
      case CertificationStatus.Active:
        return 'status-active';
      case CertificationStatus.ExpiringSoon:
        return 'status-expiring';
      case CertificationStatus.Expired:
        return 'status-expired';
      default:
        return '';
    }
  }
  
  isDateUnavailable = (date: Date): boolean => {
    return this.unavailableDates.some(unavailDate => 
      unavailDate.getFullYear() === date.getFullYear() &&
      unavailDate.getMonth() === date.getMonth() &&
      unavailDate.getDate() === date.getDate()
    );
  }
  
  dateClass = (date: Date): string => {
    if (this.isDateUnavailable(date)) return 'unavailable-date';
    const day = date.getDay();
    if (day > 0 && day < 6) return 'available-work-date';
    return '';
  }

  onDateSelected(date: Date | null): void {
    if (!date) return;
    const dateIndex = this.unavailableDates.findIndex(d =>
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );

    if (dateIndex >= 0) {
      this.unavailableDates.splice(dateIndex, 1);
    } else {
      this.unavailableDates.push(date);
    }

    this.unavailableDates = [...this.unavailableDates];
    this.cdr.markForCheck();
    if (this.calendar) {
      this.calendar.updateTodaysDate();
    }
  }
  
  editTechnician(): void {
    if (this.technicianId) {
      this.router.navigate(['../', this.technicianId, 'edit'], { relativeTo: this.route });
    }
  }
  
  deleteTechnician(technician: Technician): void {
    // TODO: Show confirmation dialog
    const confirmDelete = confirm(`Are you sure you want to delete ${this.getFullName(technician)}?`);
    if (confirmDelete) {
      this.store.dispatch(TechnicianActions.deleteTechnician({ id: technician.id }));
      this.router.navigate(['../'], { relativeTo: this.route });
    }
  }
  
  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
  
  // Check if user has admin role (placeholder - will be replaced with actual auth check)
  isAdmin(): boolean {
    // TODO: Implement actual role check from auth service
    return true;
  }
}
