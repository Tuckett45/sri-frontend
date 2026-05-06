import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-approval-queue',
  templateUrl: './approval-queue.component.html',
  styleUrls: ['./approval-queue.component.scss']
})
export class ApprovalQueueComponent implements OnInit, OnDestroy {
  selectedTab = 0;

  timecards: any[] = [
    { id: 'TC-001', technician: 'John Smith', period: 'Apr 28 - May 4', hours: 42.5, status: 'pending' },
    { id: 'TC-002', technician: 'Jane Doe', period: 'Apr 28 - May 4', hours: 38, status: 'pending' }
  ];

  expenses: any[] = [
    { id: 'EXP-001', technician: 'John Smith', period: 'Apr 30', amount: 124.50, description: 'Fuel', status: 'pending' }
  ];

  timeOffRequests: any[] = [
    { id: 'TO-001', technician: 'Jane Doe', startDate: 'May 15', endDate: 'May 17', days: 3, reason: 'Vacation', status: 'pending' }
  ];

  private destroy$ = new Subject<void>();

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  approve(item: any): void {
    item.status = 'approved';
  }

  reject(item: any): void {
    item.status = 'rejected';
  }
}
