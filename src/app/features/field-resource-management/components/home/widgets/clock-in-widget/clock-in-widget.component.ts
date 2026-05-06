import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-clock-in-widget',
  templateUrl: './clock-in-widget.component.html',
  styleUrls: ['./clock-in-widget.component.scss']
})
export class ClockInWidgetComponent implements OnInit, OnDestroy {
  isClockedIn = false;
  clockInTime: Date | null = null;
  currentTime = new Date();
  elapsedTime = '';

  private timer: any;

  ngOnInit(): void {
    this.timer = setInterval(() => {
      this.currentTime = new Date();
      if (this.isClockedIn && this.clockInTime) {
        this.elapsedTime = this.getElapsed();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  clockIn(): void {
    this.isClockedIn = true;
    this.clockInTime = new Date();
    this.elapsedTime = '0:00:00';
  }

  clockOut(): void {
    this.isClockedIn = false;
    this.clockInTime = null;
    this.elapsedTime = '';
  }

  private getElapsed(): string {
    if (!this.clockInTime) return '';
    const diff = Math.floor((new Date().getTime() - this.clockInTime.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
