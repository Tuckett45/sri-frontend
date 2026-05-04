import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../../../../services/auth.service';
import { QuickAction } from '../../../../models/dashboard.models';
import { CreateJobFromQuoteDialogComponent } from '../../../quotes/create-job-from-quote-dialog/create-job-from-quote-dialog.component';
import { RfpIntakeFormComponent } from '../../../quotes/rfp-intake/rfp-intake-form.component';

@Component({
  selector: 'app-cm-dashboard',
  templateUrl: './cm-dashboard.component.html',
  styleUrls: ['./cm-dashboard.component.scss']
})
export class CmDashboardComponent implements OnInit {
  quickActions: QuickAction[] = [
    { label: 'Create Job', icon: 'work', action: 'createJob', color: 'orange', visible: true },
    { label: 'Create Quote', icon: 'request_quote', action: 'createQuote', color: 'green', visible: true },
    { label: 'View All Jobs', icon: 'work', route: '/field-resource-management/jobs', color: 'primary', visible: true },
    { label: 'Open Schedule', icon: 'calendar_today', route: '/field-resource-management/schedule', color: 'primary', visible: true },
    { label: 'View Map', icon: 'map', route: '/field-resource-management/map', color: 'primary', visible: true },
    { label: 'My Timecard', icon: 'schedule', route: '/field-resource-management/timecard', color: 'primary', visible: true }
  ];

  marketFilter: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog
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

  onQuickAction(actionName: string): void {
    if (actionName === 'createJob') {
      this.dialog.open(CreateJobFromQuoteDialogComponent, {
        width: '520px',
        maxHeight: '80vh'
      });
    } else if (actionName === 'createQuote') {
      this.dialog.open(RfpIntakeFormComponent, {
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        disableClose: false,
        autoFocus: false,
        panelClass: 'rfp-intake-dialog'
      });
    }
  }
}
