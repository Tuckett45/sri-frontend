import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { QuickAction, KpiItem } from '../../../../models/dashboard.models';
import { selectActiveJobsCount } from '../../../../state/jobs/job.selectors';
import { selectActiveTechnicians } from '../../../../state/technicians/technician.selectors';
import { selectActiveAssignments } from '../../../../state/assignments/assignment.selectors';
import { loadTechnicians } from '../../../../state/technicians/technician.actions';
import { loadAssignments } from '../../../../state/assignments/assignment.actions';
import { loadJobs } from '../../../../state/jobs/job.actions';
import { loadCrews } from '../../../../state/crews/crew.actions';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  quickActions: QuickAction[] = [
    { label: 'Create Job', icon: 'add', route: '/field-resource-management/jobs/new', color: 'orange', visible: true },
    { label: 'View All Jobs', icon: 'work', route: '/field-resource-management/jobs', color: 'primary', visible: true },
    { label: 'Manage Technicians', icon: 'engineering', route: '/field-resource-management/technicians', color: 'primary', visible: true },
    { label: 'Open Schedule', icon: 'calendar_today', route: '/field-resource-management/schedule', color: 'primary', visible: true },
    { label: 'View Map', icon: 'map', route: '/field-resource-management/map', color: 'primary', visible: true },
    { label: 'View Reports', icon: 'bar_chart', route: '/field-resource-management/reports', color: 'primary', visible: true },
    { label: 'Admin Panel', icon: 'admin_panel_settings', route: '/field-resource-management/admin', color: 'primary', visible: true }
  ];

  kpis$!: Observable<KpiItem[]>;
  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Dispatch load actions so dashboard data is fetched independently
    // of navigating to the individual feature pages
    this.store.dispatch(loadTechnicians({}));
    this.store.dispatch(loadAssignments({}));
    this.store.dispatch(loadJobs({}));
    this.store.dispatch(loadCrews({}));

    this.kpis$ = combineLatest([
      this.store.select(selectActiveJobsCount),
      this.store.select(selectActiveTechnicians),
      this.store.select(selectActiveAssignments)
    ]).pipe(
      takeUntil(this.destroy$),
      map(([activeJobsCount, activeTechnicians, activeAssignments]) => {
        const totalActive = activeTechnicians.length;
        const assignedTechIds = new Set(activeAssignments.map(a => a.technicianId));
        const assignedCount = activeTechnicians.filter(t => assignedTechIds.has(t.id)).length;
        const availableCount = totalActive - assignedCount;
        const utilization = totalActive > 0 ? Math.round((assignedCount / totalActive) * 100) : 0;

        return [
          { label: 'Active Jobs', value: activeJobsCount, icon: 'work', color: 'primary' as const },
          { label: 'Available Technicians', value: availableCount, icon: 'engineering', color: 'success' as const },
          { label: 'Utilization', value: `${utilization}%`, icon: 'trending_up', color: 'accent' as const }
        ];
      })
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onJobSelected(jobId: string): void {
    this.router.navigate(['/field-resource-management/jobs', jobId]);
  }

  onTechnicianSelected(technicianId: string): void {
    this.router.navigate(['/field-resource-management/technicians', technicianId]);
  }
}
