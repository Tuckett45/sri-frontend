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
    { label: 'View Map', icon: 'map', route: '/field-resource-management/map', color: 'primary', visible: true }
  ];
}
