import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { QuickAction } from '../../../../models/dashboard.models';

@Component({
  selector: 'app-technician-dashboard',
  templateUrl: './technician-dashboard.component.html',
  styleUrls: ['./technician-dashboard.component.scss']
})
export class TechnicianDashboardComponent {
  quickActions: QuickAction[] = [
    { label: 'My Timecard', icon: 'schedule', route: '/field-resource-management/timecard', color: 'primary', visible: true },
    { label: 'My Schedule', icon: 'calendar_today', route: '/field-resource-management/schedule', color: 'primary', visible: true },
    { label: 'My Assignments', icon: 'assignment', route: '/field-resource-management/mobile/daily', color: 'primary', visible: true },
    { label: 'Map View', icon: 'map', route: '/field-resource-management/map', color: 'primary', visible: true }
  ];

  constructor(private router: Router) {}

  onAssignmentSelected(assignmentId: string): void {
    this.router.navigate(['/field-resource-management/assignments', assignmentId]);
  }

  onViewAllAssignments(): void {
    this.router.navigate(['/field-resource-management/mobile/daily']);
  }

  onViewTimecard(): void {
    this.router.navigate(['/field-resource-management/timecard']);
  }

  onViewSchedule(): void {
    this.router.navigate(['/field-resource-management/schedule']);
  }
}
