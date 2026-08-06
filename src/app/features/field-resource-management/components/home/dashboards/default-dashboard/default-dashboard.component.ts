import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { QuickAction } from '../../../../models/dashboard.models';
import { PtoRequestFormComponent } from '../../../pto/pto-request-form/pto-request-form.component';
import { OvertimeRequestFormComponent } from '../../../pto/overtime-request-form/overtime-request-form.component';

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
    { label: 'Request Time Off', icon: 'event_busy', route: '', color: 'accent', visible: true, action: 'openPtoDialog' },
    { label: 'Request Overtime', icon: 'more_time', route: '', color: 'accent', visible: true, action: 'openOvertimeDialog' },
    { label: 'Team Availability', icon: 'groups', route: '/field-resource-management/pto/timeline', color: 'primary', visible: true },
    { label: 'My Assignments', icon: 'assignment', route: '/field-resource-management/assignments', color: 'primary', visible: true }
  ];

  constructor(private dialog: MatDialog) {}

  onQuickAction(action: string): void {
    if (action === 'openPtoDialog') {
      this.dialog.open(PtoRequestFormComponent, {
        width: '800px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: 'pto-form-dialog',
        disableClose: false
      });
    } else if (action === 'openOvertimeDialog') {
      this.dialog.open(OvertimeRequestFormComponent, {
        width: '800px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: 'overtime-form-dialog',
        disableClose: false
      });
    }
  }
}
