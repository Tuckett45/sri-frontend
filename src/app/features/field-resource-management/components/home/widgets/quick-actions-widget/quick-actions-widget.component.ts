import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface QuickAction {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-quick-actions-widget',
  templateUrl: './quick-actions-widget.component.html',
  styleUrls: ['./quick-actions-widget.component.scss']
})
export class QuickActionsWidgetComponent implements OnInit {
  quickActions: QuickAction[] = [
    { label: 'New Job', icon: 'add_circle', route: '/field-resource-management/jobs/new' },
    { label: 'Add Technician', icon: 'person_add', route: '/field-resource-management/technicians/new' },
    { label: 'Schedule', icon: 'calendar_today', route: '/field-resource-management/schedule' },
    { label: 'Reports', icon: 'bar_chart', route: '/field-resource-management/reports' }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {}

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
