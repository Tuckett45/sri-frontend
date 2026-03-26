import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../../services/auth.service';
import { QuickAction } from '../../../../models/dashboard.models';

@Component({
  selector: 'app-cm-dashboard',
  templateUrl: './cm-dashboard.component.html',
  styleUrls: ['./cm-dashboard.component.scss']
})
export class CmDashboardComponent implements OnInit {
  quickActions: QuickAction[] = [
    { label: 'Create New Job', icon: 'add', route: '/field-resource-management/jobs/new', color: 'orange', visible: true },
    { label: 'View All Jobs', icon: 'work', route: '/field-resource-management/jobs', color: 'primary', visible: true },
    { label: 'Open Schedule', icon: 'calendar_today', route: '/field-resource-management/schedule', color: 'primary', visible: true },
    { label: 'View Map', icon: 'map', route: '/field-resource-management/map', color: 'primary', visible: true },
    { label: 'My Timecard', icon: 'schedule', route: '/field-resource-management/timecard', color: 'primary', visible: true }
  ];

  marketFilter: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.marketFilter = user?.market ?? null;

    if (!this.marketFilter) {
      console.warn('CmDashboardComponent: CM user market is null or empty — showing all jobs unfiltered');
    }
  }

  onJobSelected(jobId: string): void {
    this.router.navigate(['/field-resource-management/jobs', jobId]);
  }
}
