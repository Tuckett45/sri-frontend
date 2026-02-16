import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter, switchMap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { Technician, CertificationStatus } from '../../../models/technician.model';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';

@Component({
  selector: 'app-technician-detail',
  templateUrl: './technician-detail.component.html',
  styleUrls: ['./technician-detail.component.scss']
})
export class TechnicianDetailComponent implements OnInit, OnDestroy {
  technician$: Observable<Technician | null | undefined>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  
  technicianId: string | null = null;
  
  // For calendar display
  selectedDate: Date = new Date();
  unavailableDates: Date[] = [];
  
  // Mock data for assignment history and performance (will be replaced with real data)
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
    private dialog: MatDialog
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
      });
    
    // Load technician data and populate unavailable dates
    this.technician$
      .pipe(
        takeUntil(this.destroy$),
        filter(tech => !!tech)
      )
      .subscribe(technician => {
        if (technician) {
          this.unavailableDates = technician.availability
            .filter(avail => !avail.isAvailable)
            .map(avail => new Date(avail.date));
          
          // TODO: Load assignment history and performance metrics
          // This would typically come from additional API calls or state
          this.loadAssignmentHistory(technician.id);
          this.loadPerformanceMetrics(technician.id);
        }
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadAssignmentHistory(technicianId: string): void {
    // TODO: Dispatch action to load assignment history
    // For now, using mock data
    this.assignmentHistory = [
      {
        jobId: 'JOB001',
        client: 'Acme Corp',
        siteName: 'Main Office',
        date: new Date('2024-01-15'),
        status: 'Completed'
      },
      {
        jobId: 'JOB002',
        client: 'Tech Solutions',
        siteName: 'Data Center',
        date: new Date('2024-01-20'),
        status: 'Completed'
      }
    ];
  }
  
  loadPerformanceMetrics(technicianId: string): void {
    // TODO: Dispatch action to load performance metrics
    // For now, using mock data
    this.performanceMetrics = {
      utilizationRate: 85,
      jobsCompleted: 42
    };
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
    return this.isDateUnavailable(date) ? 'unavailable-date' : '';
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
