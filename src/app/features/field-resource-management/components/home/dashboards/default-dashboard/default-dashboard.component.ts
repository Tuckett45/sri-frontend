import { Component } from '@angular/core';
import { QuickAction } from '../../../../models/dashboard.models';

@Component({
  selector: 'app-default-dashboard',
  templateUrl: './default-dashboard.component.html',
  styleUrls: ['./default-dashboard.component.scss']
})
export class DefaultDashboardComponent {
  quickActions: QuickAction[] = [
    { label: 'View Jobs', icon: 'work', route: '/field-resource-management/jobs', color: 'primary', visible: true },
    { label: 'View Schedule', icon: 'calendar_today', route: '/field-resource-management/schedule', color: 'primary', visible: true },
    { label: 'View Map', icon: 'map', route: '/field-resource-management/map', color: 'primary', visible: true },
    { label: 'Onboarding', icon: 'person_add', route: '/field-resource-management/onboarding', color: 'accent', visible: true },
    { label: 'Request Time Off', icon: 'event_busy', route: '/field-resource-management/pto/new', color: 'accent', visible: true },
    { label: 'Request Overtime', icon: 'more_time', route: '/field-resource-management/pto/overtime/new', color: 'accent', visible: true },
    { label: 'Team Availability', icon: 'groups', route: '/field-resource-management/pto/timeline', color: 'primary', visible: true }
  ];
}
