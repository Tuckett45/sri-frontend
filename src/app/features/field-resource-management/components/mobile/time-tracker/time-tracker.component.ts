import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-time-tracker',
  templateUrl: './time-tracker.component.html',
  styleUrls: ['./time-tracker.component.scss']
})
export class TimeTrackerComponent implements OnInit, OnDestroy {
  @Input() jobId?: string;
  @Output() clockIn = new EventEmitter<{ jobId: string, timestamp: Date }>();
  @Output() clockOut = new EventEmitter<{ jobId: string, timestamp: Date, duration: number }>();

  isClockedIn = false;
  startTime?: Date;
  elapsedSeconds = 0;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleClock(): void {
    if (this.isClockedIn) {
      this.isClockedIn = false;
      const duration = this.elapsedSeconds;
      this.clockOut.emit({ jobId: this.jobId || '', timestamp: new Date(), duration });
      this.elapsedSeconds = 0;
    } else {
      this.isClockedIn = true;
      this.startTime = new Date();
      interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.elapsedSeconds++;
      });
      this.clockIn.emit({ jobId: this.jobId || '', timestamp: this.startTime });
    }
  }

  get formattedTime(): string {
    const h = Math.floor(this.elapsedSeconds / 3600);
    const m = Math.floor((this.elapsedSeconds % 3600) / 60);
    const s = this.elapsedSeconds % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }
}
