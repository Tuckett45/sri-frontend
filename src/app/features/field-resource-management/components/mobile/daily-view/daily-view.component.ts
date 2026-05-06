import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-daily-view',
  templateUrl: './daily-view.component.html',
  styleUrls: ['./daily-view.component.scss']
})
export class DailyViewComponent implements OnInit, OnDestroy {
  today = new Date();
  jobs: any[] = [
    { id: 'JOB-001', customer: 'Acme Corp', location: '123 Main St', status: 'scheduled' },
    { id: 'JOB-002', customer: 'Beta Inc', location: '456 Oak Ave', status: 'in-progress' }
  ];
  private destroy$ = new Subject<void>();

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClockIn(event: void, jobId: string): void {
    console.log('Clocked in for job', jobId);
  }

  onViewDetails(jobId: string): void {
    console.log('View details for job', jobId);
  }
}
