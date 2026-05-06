import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-job-card',
  templateUrl: './job-card.component.html',
  styleUrls: ['./job-card.component.scss']
})
export class JobCardComponent implements OnInit, OnDestroy {
  @Input() job: any;
  @Output() clockIn = new EventEmitter<void>();
  @Output() viewDetails = new EventEmitter<void>();

  showTracker = false;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTracker(): void {
    this.showTracker = !this.showTracker;
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      scheduled: 'primary',
      'in-progress': 'accent',
      completed: '',
      cancelled: 'warn'
    };
    return map[status] || '';
  }
}
